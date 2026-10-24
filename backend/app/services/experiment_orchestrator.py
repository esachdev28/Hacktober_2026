"""Experiment Lifecycle Orchestrator for CHAOSPATCH.

Coordinates:
BASELINE -> INJECTING -> OBSERVING -> DIAGNOSING -> PATCH_REVIEW -> APPLYING -> VERIFYING -> COMPLETED
"""
import asyncio
import time
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session

from app.models.experiments import (
    Experiment, Incident, Evidence, RepairAttempt,
    VerificationRun, ExperimentEvent,
    ExperimentStatus, PatchStatus, VerificationStatus,
    EvidenceType, Severity, validate_transition
)
from app.db.database import SessionLocal
from app.sandbox.workspace import DisposableWorkspace
from app.services.fault_injector import get_fault_plugin
from app.services.evidence_collector import EvidencePackage
from app.services.patch_validator import PatchValidator
from app.services.verification_engine import VerificationEngine
from app.services.monkey_engine import MonkeyChaosEngine
from app.providers import get_inference_provider
from app.providers.base import ModelDiagnosisResult

logger = logging.getLogger("chaospatch.orchestrator")


class ExperimentOrchestrator:
    """Manages the lifecycle and state transitions of experiments."""

    # Event subscribers for SSE streaming: experiment_id -> set of asyncio.Queue
    _event_queues: Dict[int, Set[asyncio.Queue]] = {}
    _active_tasks: Dict[int, asyncio.Task] = {}

    @classmethod
    def register_queue(cls, experiment_id: int, queue: asyncio.Queue):
        if experiment_id not in cls._event_queues:
            cls._event_queues[experiment_id] = set()
        cls._event_queues[experiment_id].add(queue)

    @classmethod
    def unregister_queue(cls, experiment_id: int, queue: asyncio.Queue):
        if experiment_id in cls._event_queues:
            cls._event_queues[experiment_id].discard(queue)
            if not cls._event_queues[experiment_id]:
                del cls._event_queues[experiment_id]

    @classmethod
    async def broadcast_event(
        cls,
        experiment_id: int,
        event_type: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None,
    ):
        """Persist event to database and push to all active SSE queues."""
        event_data = {
            "experiment_id": experiment_id,
            "event_type": event_type,
            "message": message,
            "metadata_json": metadata or {},
            "created_at": datetime.utcnow().isoformat() + "Z",
        }

        # Persist event
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True
        try:
            db_event = ExperimentEvent(
                experiment_id=experiment_id,
                event_type=event_type,
                message=message,
                metadata_json=metadata or {},
            )
            db.add(db_event)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to persist event: {e}")
        finally:
            if should_close:
                db.close()

        # Broadcast to queues
        if experiment_id in cls._event_queues:
            for q in list(cls._event_queues[experiment_id]):
                try:
                    await q.put(event_data)
                except Exception:
                    pass

    @classmethod
    def start_experiment(cls, experiment_id: int, auto_approve_patch: bool = False):
        """Spawn background async task to run experiment."""
        try:
            loop = asyncio.get_running_loop()
            task = loop.create_task(cls._run_lifecycle(experiment_id, auto_approve_patch))
            cls._active_tasks[experiment_id] = task
            return task
        except RuntimeError:
            import threading
            def _runner():
                asyncio.run(cls._run_lifecycle(experiment_id, auto_approve_patch))
            t = threading.Thread(target=_runner, daemon=True)
            t.start()
            return None

    @classmethod
    async def cancel_experiment(cls, experiment_id: int):
        """Cancel running experiment and clean up workspace."""
        if experiment_id in cls._active_tasks:
            task = cls._active_tasks[experiment_id]
            task.cancel()
            del cls._active_tasks[experiment_id]

        db = SessionLocal()
        try:
            exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
            if exp and exp.status not in (ExperimentStatus.COMPLETED.value, ExperimentStatus.CANCELLED.value):
                exp.status = ExperimentStatus.CANCELLED.value
                exp.completed_at = datetime.utcnow()
                db.commit()
                await cls.broadcast_event(
                    experiment_id, "EXPERIMENT_CANCELLED",
                    "Experiment cancelled by user request",
                    db=db
                )
        finally:
            db.close()

        # Clean workspace
        try:
            ws = DisposableWorkspace(experiment_id)
            ws.cleanup()
        except Exception:
            pass

    @classmethod
    async def _transition_status(cls, db: Session, exp: Experiment, new_status: ExperimentStatus, message: str):
        """Safely transition experiment status with event logging."""
        current = ExperimentStatus(exp.status)
        if not validate_transition(current, new_status):
            logger.warning(f"Unusual transition from {current} to {new_status}")

        exp.status = new_status.value
        db.commit()
        await cls.broadcast_event(exp.id, f"STAGE_{new_status.value}", message, db=db)

    @classmethod
    async def _run_lifecycle(cls, experiment_id: int, auto_approve_patch: bool):
        """Complete 8-stage state machine execution."""
        db = SessionLocal()
        start_time = time.time()
        workspace = DisposableWorkspace(experiment_id)
        evidence_pkg = EvidencePackage(experiment_id)

        try:
            exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
            if not exp:
                return

            exp.started_at = datetime.utcnow()
            db.commit()

            is_monkey = exp.scenario_type.startswith("monkey:")
            plugin = None
            monkey_vectors: List[str] = []
            monkey_intensity = "MODERATE"

            if is_monkey:
                parts = exp.scenario_type.split(":")
                if len(parts) > 1 and parts[1]:
                    monkey_intensity = parts[1]
                if len(parts) > 2 and parts[2]:
                    monkey_vectors = [v for v in parts[2].split("+") if v]
                if not monkey_vectors:
                    monkey_vectors = MonkeyChaosEngine.select_attack_plan(monkey_intensity)
            else:
                plugin = get_fault_plugin(exp.scenario_type)
                if not plugin:
                    exp.status = ExperimentStatus.FAILED.value
                    exp.failure_reason = f"Unknown scenario: {exp.scenario_type}"
                    db.commit()
                    return

            # STAGE 1: BASELINING
            await cls._transition_status(db, exp, ExperimentStatus.BASELINING, "Cloning demo application into isolated disposable sandbox...")
            workspace.setup()

            await cls.broadcast_event(exp.id, "LOG", "Executing baseline health check and test suite...", db=db)
            baseline_result = VerificationEngine.run_baseline_verification(workspace)
            evidence_pkg.add_item(
                EvidenceType.HEALTH_CHECK,
                "baseline_verifier",
                baseline_result.output,
                Severity.INFO if baseline_result.passed else Severity.ERROR,
            )

            if not baseline_result.passed:
                exp.baseline_passed = False
                exp.failure_reason = "Application failed baseline health verification before fault injection."
                await cls._transition_status(db, exp, ExperimentStatus.FAILED, exp.failure_reason)
                return

            exp.baseline_passed = True
            db.commit()
            await cls.broadcast_event(exp.id, "LOG", "✅ Baseline tests passed. System is verified healthy.", db=db)

            # STAGE 2: INJECTING
            if is_monkey:
                await cls._transition_status(
                    db, exp, ExperimentStatus.INJECTING,
                    f"Unleashing autonomous Monkey Chaos strike ({monkey_intensity}: {', '.join(monkey_vectors)})..."
                )
                strike_data = MonkeyChaosEngine.execute_monkey_strike(workspace, monkey_vectors, jitter_ms=0)
                evidence_pkg.add_item(
                    EvidenceType.FAULT_INJECTION,
                    "monkey_chaos_engine",
                    f"EVID-MONKEY-{strike_data['strike_id']}\n" + json.dumps(strike_data, indent=2),
                    Severity.WARNING,
                )
                await cls.broadcast_event(
                    exp.id,
                    "MONKEY_STRIKE_APPLIED",
                    f"Monkey strike {strike_data['strike_id']} applied. Vectors: {', '.join(strike_data['applied_vectors'])}; Files: {', '.join(strike_data['affected_files'])}",
                    metadata=strike_data,
                    db=db,
                )
                reproduction_filter = strike_data["reproduction_filter"]
                incident_title = f"Incident: Monkey Chaos ({monkey_intensity}) in {exp.target_environment}"
                incident_desc = f"Autonomous strike triggered vectors: {', '.join(strike_data['applied_vectors'])}"
                incident_root = f"Injected faults across: {', '.join(strike_data['affected_files'])}"
                candidate_fallback = strike_data["candidate_repair"]
            else:
                await cls._transition_status(db, exp, ExperimentStatus.INJECTING, f"Injecting controlled chaos fault: {plugin.name}...")
                inject_data = plugin.inject(workspace)
                evidence_pkg.add_item(
                    EvidenceType.FAULT_INJECTION,
                    "fault_injector",
                    json.dumps(inject_data, indent=2),
                    Severity.WARNING,
                )
                await cls.broadcast_event(exp.id, "FAULT_INJECTED", f"Injected fault: {inject_data.get('injected_vulnerability')}", metadata=inject_data, db=db)
                reproduction_filter = plugin.get_verification_test_filter()
                incident_title = f"Incident: {plugin.name} in {exp.target_environment}"
                incident_desc = plugin.description
                incident_root = plugin.failure_mechanism
                candidate_fallback = plugin.get_candidate_repair()

            # STAGE 3: OBSERVING
            await cls._transition_status(db, exp, ExperimentStatus.OBSERVING, "Observing symptoms, capturing logs, and collecting failure evidence...")
            repro_result = VerificationEngine.verify_fault_reproduction(workspace, reproduction_filter)
            
            evidence_pkg.add_item(
                EvidenceType.TEST_RESULT,
                "pytest_reproduction",
                repro_result.output,
                Severity.ERROR,
            )

            # Save evidence to DB
            for item in evidence_pkg.get_items():
                db_evid = Evidence(
                    experiment_id=exp.id,
                    evidence_type=item["evidence_type"],
                    severity=item["severity"],
                    source=item["source"],
                    content=item["content"],
                    metadata_json=item["metadata_json"],
                )
                db.add(db_evid)
            db.commit()

            # Record Incident
            incident = Incident(
                experiment_id=exp.id,
                title=incident_title,
                description=incident_desc,
                severity=Severity.ERROR.value,
                root_cause=incident_root,
                confidence=0.90,
            )
            db.add(incident)
            db.commit()

            # STAGE 4: DIAGNOSING
            await cls._transition_status(db, exp, ExperimentStatus.DIAGNOSING, "AI model analyzing evidence package and synthesizing minimal patch...")
            
            # Read relevant source snippet
            if is_monkey:
                config_src = workspace.read_file("demo_app/config.py") or ""
                client_src = workspace.read_file("demo_app/client.py") or ""
                source_content = f"# demo_app/config.py\n{config_src}\n\n# demo_app/client.py\n{client_src}"
            else:
                target_source_path = "demo_app/config.py" if exp.scenario_type == "missing_env_config" else "demo_app/client.py"
                source_content = workspace.read_file(target_source_path) or ""

            # Attempt AI inference via configured provider (NVIDIA NIM or HF)
            provider = get_inference_provider()
            diagnosis_res: Optional[ModelDiagnosisResult] = None
            ai_error = None

            try:
                evidence_text = evidence_pkg.to_llm_context()
                diagnosis_res = provider.generate_diagnosis_and_patch(
                    scenario_id=exp.scenario_type,
                    evidence_text=evidence_text,
                    source_context=source_content,
                )
                await cls.broadcast_event(exp.id, "AI_DIAGNOSIS_SUCCESS", "AI model returned structured diagnosis and proposed patch.", db=db)
            except Exception as e:
                ai_error = str(e)
                logger.warning(f"Inference failed or unavailable: {ai_error}")
                await cls.broadcast_event(exp.id, "AI_UNAVAILABLE", f"Inference note: {ai_error}. Utilizing verified baseline candidate repair.", db=db)
                
                # Deterministic reference fallback (clearly labeled as non-AI)
                candidate = candidate_fallback
                diagnosis_res = ModelDiagnosisResult(
                    title=f"Diagnosis: {incident_title}",
                    root_cause=incident_root,
                    confidence=0.95,
                    cited_evidence_ids=["EVID-001-002"],
                    proposed_patch_diff=candidate.get("diff", ""),
                    explanation=candidate.get("explanation", "Autonomous reference repair applied."),
                    risk_summary=candidate.get("risk_summary", "Autonomous repair evaluated for stability."),
                    is_ai_generated=False,
                    provider="deterministic-reference-plugin",
                )

            # Update Incident with AI diagnosis
            incident.root_cause = diagnosis_res.root_cause
            incident.confidence = diagnosis_res.confidence
            db.commit()

            # Validate proposed patch for safety
            validation = PatchValidator.validate_patch(diagnosis_res.proposed_patch_diff)
            validation_status = "PASSED" if validation.is_valid else "REJECTED"

            # Create RepairAttempt
            repair = RepairAttempt(
                experiment_id=exp.id,
                attempt_number=1,
                diagnosis=diagnosis_res.explanation,
                patch_diff=diagnosis_res.proposed_patch_diff,
                patch_status=PatchStatus.PROPOSED.value,
                validation_status=validation_status,
                risk_summary=diagnosis_res.risk_summary,
            )
            db.add(repair)
            db.commit()

            # Record patch validation evidence
            val_evid = Evidence(
                experiment_id=exp.id,
                incident_id=incident.id,
                evidence_type=EvidenceType.PATCH_VALIDATION.value,
                severity=Severity.INFO.value if validation.is_valid else Severity.CRITICAL.value,
                source="patch_validator",
                content=validation.summary,
                metadata_json={"issues": validation.issues, "risk_level": validation.risk_level},
            )
            db.add(val_evid)
            db.commit()

            if not validation.is_valid:
                repair.patch_status = PatchStatus.REJECTED.value
                db.commit()
                await cls._transition_status(db, exp, ExperimentStatus.PATCH_REJECTED, f"Patch failed safety validation: {validation.summary}")
                return

            # STAGE 5: PATCH REVIEW
            await cls._transition_status(db, exp, ExperimentStatus.PATCH_REVIEW, "Proposed patch validated. Awaiting operator review...")
            await cls.broadcast_event(exp.id, "PATCH_PROPOSED", "Candidate patch ready for approval", metadata={"repair_id": repair.id}, db=db)

            # If auto-approve is True or interactive approval
            if auto_approve_patch:
                await cls.apply_approved_repair(exp.id, repair.id, db=db)

        except asyncio.CancelledError:
            logger.info(f"Experiment {experiment_id} cancelled.")
        except Exception as err:
            logger.exception(f"Unexpected error in experiment {experiment_id}: {err}")
            exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
            if exp:
                exp.status = ExperimentStatus.FAILED.value
                exp.failure_reason = str(err)
                db.commit()
                await cls.broadcast_event(exp.id, "EXPERIMENT_ERROR", str(err), db=db)
        finally:
            db.close()

    @classmethod
    async def apply_approved_repair(cls, experiment_id: int, repair_id: int, db: Optional[Session] = None):
        """Apply approved repair, run verification checks, and finalize experiment."""
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True

        workspace = DisposableWorkspace(experiment_id)

        try:
            exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
            repair = db.query(RepairAttempt).filter(RepairAttempt.id == repair_id).first()
            if not exp or not repair:
                return

            is_monkey = exp.scenario_type.startswith("monkey:")
            verification_filter = None
            if is_monkey:
                parts = exp.scenario_type.split(":")
                vectors = parts[2].split("+") if len(parts) > 2 else []
                filters = []
                for vid in vectors:
                    plug = MonkeyChaosEngine.get_plugin_instance(vid)
                    if plug:
                        f = plug.get_verification_test_filter()
                        if f:
                            filters.append(f)
                verification_filter = " or ".join(filters) if filters else None
            else:
                plugin = get_fault_plugin(exp.scenario_type)
                if not plugin:
                    return
                verification_filter = plugin.get_verification_test_filter()

            # STAGE 6: APPLYING
            await cls._transition_status(db, exp, ExperimentStatus.APPLYING, "Applying approved patch to isolated workspace...")
            repair.patch_status = PatchStatus.APPROVED.value
            db.commit()

            apply_success, apply_msg = workspace.apply_patch_diff(repair.patch_diff)
            if not apply_success:
                repair.patch_status = PatchStatus.FAILED.value
                exp.failure_reason = f"Patch application failed: {apply_msg}"
                await cls._transition_status(db, exp, ExperimentStatus.FAILED, exp.failure_reason)
                return

            repair.patch_status = PatchStatus.APPLIED.value
            db.commit()
            await cls.broadcast_event(exp.id, "PATCH_APPLIED", "Patch applied cleanly to workspace", db=db)

            # STAGE 7: VERIFYING
            await cls._transition_status(db, exp, ExperimentStatus.VERIFYING, "Executing independent verification suite...")
            
            verification_suite = VerificationEngine.run_post_repair_verification(
                workspace,
                verification_filter
            )

            # Record verification runs in database
            for v_check in verification_suite.checks:
                v_run = VerificationRun(
                    experiment_id=exp.id,
                    repair_attempt_id=repair.id,
                    check_name=v_check.name,
                    status=v_check.status.value,
                    expected_result=v_check.expected,
                    actual_result=v_check.actual,
                    duration_ms=v_check.duration_ms,
                    output=v_check.output,
                )
                db.add(v_run)

                # Also add as evidence
                db_evid = Evidence(
                    experiment_id=exp.id,
                    evidence_type=EvidenceType.VERIFICATION_RESULT.value,
                    severity=Severity.INFO.value if v_check.passed else Severity.ERROR.value,
                    source=f"verifier:{v_check.name}",
                    content=f"Status: {v_check.status.value}\nExpected: {v_check.expected}\nActual: {v_check.actual}\n{v_check.output}",
                )
                db.add(db_evid)

            db.commit()

            # STAGE 8: EVALUATE FINAL OUTCOME
            if verification_suite.all_passed:
                repair.verification_status = VerificationStatus.PASSED.value
                exp.final_verified = True
                await cls._transition_status(db, exp, ExperimentStatus.COMPLETED, "✅ Independent verification PASSED! Application fully recovered.")
            else:
                repair.verification_status = VerificationStatus.FAILED.value
                exp.final_verified = False
                exp.failure_reason = "Post-repair verification suite failed."
                await cls._transition_status(db, exp, ExperimentStatus.VERIFICATION_FAILED, "❌ Independent verification FAILED. Patch did not restore health.")

            exp.completed_at = datetime.utcnow()
            if exp.started_at:
                exp.duration_ms = int((exp.completed_at - exp.started_at).total_seconds() * 1000)
            repair.completed_at = exp.completed_at
            db.commit()

            await cls.broadcast_event(exp.id, "REPORT_READY", "Final incident post-mortem report ready.", db=db)

        finally:
            if should_close:
                db.close()
