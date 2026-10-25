"""Orchestrator for Universal Public GitHub Repository Mode."""
import os
import time
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.experiments import (
    Experiment, Incident, Evidence, RepairAttempt,
    VerificationRun, ExperimentEvent, ExperimentStatus,
    PatchStatus, VerificationStatus, EvidenceType, Severity
)
from app.db.database import SessionLocal
from app.services.git_service import GitService, GitSecurityError
from app.adapters.detector import ProjectDetector, UnsupportedAdapter
from app.adapters.base import InspectionReport, ExecutionResult
from app.sandbox.docker_runner import DockerExecutionRunner, DockerUnavailableError
from app.sandbox.workspace import DisposableWorkspace
from app.sandbox.filesystem_policy import FilesystemSecurityPolicy
from app.services.patch_validator import PatchValidator
from app.services.evidence_collector import EvidencePackage, sanitize_secrets
from app.providers import get_inference_provider
from app.providers.base import ModelDiagnosisResult

logger = logging.getLogger("chaospatch.repo_orchestrator")


class RepositoryOrchestrator:
    """Manages the lifecycle of public GitHub repository intake, inspection, baseline, and repair."""

    @classmethod
    def get_repos_base_dir(cls) -> Path:
        """Configured CHAOSPATCH repository workspace root."""
        project_root = Path(__file__).resolve().parents[3]
        repos_dir = project_root / "workspaces" / "repos"
        repos_dir.mkdir(parents=True, exist_ok=True)
        return repos_dir

    @classmethod
    def intake_repository(
        cls,
        repo_url: str,
        project_root: str = "/",
        target_branch: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Clone public repository, record baseline commit SHA, and inspect project stack."""
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            canonical_url, owner, repo_name = GitService.parse_and_validate_github_url(repo_url)
            repos_base = cls.get_repos_base_dir()

            # Create Experiment record in DB
            exp = Experiment(
                scenario_type="public_github_repo",
                status=ExperimentStatus.CREATED.value,
                target_environment="DOCKER_SANDBOX",
                repo_url=canonical_url,
                repo_owner=owner,
                repo_name=repo_name,
                project_root=project_root,
                started_at=datetime.utcnow(),
            )
            db.add(exp)
            db.commit()
            db.refresh(exp)

            # Clone repository
            clone_dir, detected_branch, head_sha = GitService.clone_repository(
                repo_url=canonical_url,
                dest_base_dir=repos_base,
                branch=target_branch,
            )

            exp.default_branch = detected_branch
            exp.base_commit_sha = head_sha
            db.commit()

            # Inspect technology stack via modular adapters
            target_subpath = (clone_dir / project_root.strip("/")).resolve()
            adapter, report, monorepo_roots = ProjectDetector.inspect(clone_dir, project_root)

            exp.detected_language = report.language
            exp.detected_framework = ", ".join(report.frameworks) if report.frameworks else report.test_framework
            db.commit()

            # Record discovery event
            event = ExperimentEvent(
                experiment_id=exp.id,
                event_type="REPO_INTAKE_SUCCESS",
                message=f"Cloned {canonical_url} (branch: {detected_branch}, commit: {head_sha[:8]}). Stack: {report.language}",
                metadata_json={
                    "clone_dir": str(clone_dir),
                    "manifests": report.manifest_files,
                    "monorepo_roots": monorepo_roots,
                    "capabilities": report.capabilities.model_dump(),
                },
            )
            db.add(event)
            db.commit()

            return {
                "experiment_id": exp.id,
                "repo_url": canonical_url,
                "owner": owner,
                "name": repo_name,
                "default_branch": detected_branch,
                "base_commit_sha": head_sha,
                "detected_languages": [report.language],
                "primary_language": report.language,
                "detected_frameworks": report.frameworks,
                "manifest_files": report.manifest_files,
                "test_framework": report.test_framework,
                "test_command": report.test_command,
                "possible_project_roots": monorepo_roots,
                "is_monorepo": len(monorepo_roots) > 1,
                "capabilities": report.capabilities.model_dump(),
                "status": "INSPECTED",
            }
        finally:
            if should_close:
                db.close()

    @classmethod
    def run_baseline_checks(
        cls,
        experiment_id: int,
        test_filter: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Run trusted baseline checks inside isolated Docker container."""
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
            if not exp:
                raise ValueError(f"Experiment {experiment_id} not found")

            repos_base = cls.get_repos_base_dir()
            matching_dirs = list(repos_base.glob(f"{exp.repo_owner}_{exp.repo_name}_*"))
            if not matching_dirs:
                raise FileNotFoundError(f"Cloned repository directory not found for {exp.repo_owner}/{exp.repo_name}")
            repo_dir = matching_dirs[0]

            adapter, report, _ = ProjectDetector.inspect(repo_dir, exp.project_root or "/")
            
            # Check if language is supported
            if isinstance(adapter, UnsupportedAdapter):
                status_str = "UNSUPPORTED_TEST_ENVIRONMENT"
                msg = f"No supported test adapter for {report.language}. Untrusted code will not be executed."
                return {
                    "experiment_id": experiment_id,
                    "baseline_status": status_str,
                    "exit_code": -1,
                    "test_command": "NONE",
                    "duration_ms": 0,
                    "output_excerpt": msg,
                    "evidence_count": 0,
                    "failing_tests": [],
                    "message": msg,
                }

            # Check if an executable test or validation command exists
            test_cmd = report.test_command
            if not test_cmd or test_cmd.strip() == "NONE" or not report.capabilities.can_run_tests:
                status_str = "NO_TEST_COMMAND"
                msg = f"No test or validation script found for {report.language} project ({report.capabilities.notes or 'No test script'})."
                return {
                    "experiment_id": experiment_id,
                    "baseline_status": status_str,
                    "exit_code": -1,
                    "test_command": "NONE",
                    "duration_ms": 0,
                    "output_excerpt": msg,
                    "evidence_count": 0,
                    "failing_tests": [],
                    "message": msg,
                }

            if test_filter:
                test_cmd = f"{test_cmd} {test_filter}"

            # Execute in disposable container
            image = adapter.get_docker_image()
            target_sub = (repo_dir / (exp.project_root or "/").strip("/")).resolve()

            # 1. Run sandbox dependency preparation if needed (with network enabled for package downloads)
            setup_cmd = adapter.get_setup_command(target_sub)
            if setup_cmd:
                try:
                    setup_res = DockerExecutionRunner.run_in_container(
                        workspace_dir=target_sub,
                        command=setup_cmd,
                        image=image,
                        network_enabled=True,
                        timeout_seconds=120,
                    )
                    if not setup_res.passed:
                        msg = f"Sandbox dependency setup failed (exit code {setup_res.exit_code}):\n{(setup_res.stderr or setup_res.stdout)[:1500]}"
                        return {
                            "experiment_id": experiment_id,
                            "baseline_status": "SETUP_FAILED",
                            "exit_code": setup_res.exit_code,
                            "test_command": setup_cmd,
                            "duration_ms": setup_res.duration_ms,
                            "output_excerpt": msg,
                            "evidence_count": 0,
                            "failing_tests": [],
                            "message": msg,
                        }
                except DockerUnavailableError as docker_err:
                    docker_msg = str(docker_err)
                    return {
                        "experiment_id": experiment_id,
                        "baseline_status": "DOCKER_UNAVAILABLE",
                        "exit_code": 1,
                        "test_command": test_cmd,
                        "duration_ms": 0,
                        "output_excerpt": docker_msg,
                        "evidence_count": 0,
                        "failing_tests": [],
                        "message": docker_msg,
                    }

            # 2. Execute isolated baseline tests (strictly air-gapped --network none)
            try:
                exec_result = DockerExecutionRunner.run_in_container(
                    workspace_dir=target_sub,
                    command=test_cmd,
                    image=image,
                    network_enabled=False,
                    timeout_seconds=60,
                )
            except DockerUnavailableError as docker_err:
                docker_msg = str(docker_err)
                return {
                    "experiment_id": experiment_id,
                    "baseline_status": "DOCKER_UNAVAILABLE",
                    "exit_code": 1,
                    "test_command": test_cmd,
                    "duration_ms": 0,
                    "output_excerpt": docker_msg,
                    "evidence_count": 0,
                    "failing_tests": [],
                    "message": docker_msg,
                }

            # Evaluate baseline result honestly
            if exec_result.passed:
                status_str = "BASELINE_PASSED"
                msg = "Baseline checks passed cleanly. No reproducible failure observed."
                exp.baseline_passed = True
            else:
                combined_lower = f"{(exec_result.stderr or '').lower()}\n{(exec_result.stdout or '').lower()}"
                if "missing script" in combined_lower:
                    status_str = "MISSING_TEST_SCRIPT"
                    msg = f"Test script is missing in package configuration (exit code {exec_result.exit_code})."
                    exp.baseline_passed = False
                elif "not found" in combined_lower and ("sh: 1:" in combined_lower or "command not found" in combined_lower):
                    status_str = "MISSING_TEST_RUNNER"
                    msg = f"Test runner executable not found in sandbox (exit code {exec_result.exit_code})."
                    exp.baseline_passed = False
                else:
                    status_str = "FAILURE_REPRODUCED"
                    msg = f"Baseline test failure reproduced (exit code {exec_result.exit_code})."
                    exp.baseline_passed = False

            db.commit()

            # Record baseline evidence
            sanitized_stdout = sanitize_secrets(exec_result.stdout)
            sanitized_stderr = sanitize_secrets(exec_result.stderr)

            db_evid = Evidence(
                experiment_id=exp.id,
                evidence_type=EvidenceType.TEST_RESULT.value,
                severity=Severity.INFO.value if exec_result.passed else Severity.ERROR.value,
                source=f"baseline_check:{test_cmd}",
                content=f"Exit Code: {exec_result.exit_code}\nSTDOUT:\n{sanitized_stdout[:2000]}\nSTDERR:\n{sanitized_stderr[:2000]}",
                metadata_json={"command": test_cmd, "duration_ms": exec_result.duration_ms},
            )
            db.add(db_evid)
            db.commit()

            # Count evidence recorded for this experiment
            evidence_count = db.query(Evidence).filter(Evidence.experiment_id == exp.id).count()

            # Unified output for the frontend (stdout + stderr, sanitized and bounded)
            combined_output = ""
            if sanitized_stdout.strip():
                combined_output += sanitized_stdout[:1500]
            if sanitized_stderr.strip():
                combined_output += ("\n--- STDERR ---\n" if combined_output else "") + sanitized_stderr[:500]
            if not combined_output.strip():
                combined_output = f"[No output captured. Exit code: {exec_result.exit_code}]\nTest command: {test_cmd}"

            return {
                "experiment_id": experiment_id,
                "baseline_status": status_str,
                "exit_code": exec_result.exit_code,
                "test_command": test_cmd,
                "duration_ms": exec_result.duration_ms,
                "output_excerpt": combined_output[:2000],
                "evidence_count": evidence_count,
                "failing_tests": [],
                "message": msg,
            }
        finally:
            if should_close:
                db.close()

    @classmethod
    def apply_and_verify_patch(
        cls,
        experiment_id: int,
        patch_diff: str,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Validate patch safety, apply to isolated worktree, and independently re-test in Docker."""
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
            if not exp:
                raise ValueError(f"Experiment {experiment_id} not found")

            # 1. Reject empty / placeholder diffs immediately
            stripped_diff = (patch_diff or "").strip()
            if not stripped_diff or (stripped_diff.startswith("#") and len(stripped_diff) < 100):
                return {
                    "experiment_id": experiment_id,
                    "verification_status": "REJECTED",
                    "patch_valid": False,
                    "target_failure_resolved": False,
                    "regressions_detected": False,
                    "exit_code": -1,
                    "duration_ms": 0,
                    "test_output_excerpt": "Rejected: diff is empty or a placeholder comment — no patch to verify.",
                    "summary": "Patch diff was empty or a placeholder; cannot verify.",
                }

            # 2. Patch Safety Validation
            val_result = PatchValidator.validate_patch(patch_diff)
            if not val_result.is_valid:
                return {
                    "experiment_id": experiment_id,
                    "verification_status": "REJECTED",
                    "patch_valid": False,
                    "target_failure_resolved": False,
                    "regressions_detected": False,
                    "exit_code": -1,
                    "duration_ms": 0,
                    "test_output_excerpt": f"Safety validation failed: {'; '.join(val_result.issues)}",
                    "summary": f"Patch safety validation rejected: {'; '.join(val_result.issues)}",
                }

            repos_base = cls.get_repos_base_dir()
            matching_dirs = list(repos_base.glob(f"{exp.repo_owner}_{exp.repo_name}_*"))
            if not matching_dirs:
                raise FileNotFoundError(f"Repository not found for {exp.repo_owner}/{exp.repo_name}")
            repo_dir = matching_dirs[0]

            # 3. Apply patch diff to workspace files
            ws = DisposableWorkspace(experiment_id, base_dir=repos_base)
            ws.workspace_dir = repo_dir
            ws.policy = FilesystemSecurityPolicy(workspace_root=repo_dir)

            applied, apply_msg = ws.apply_patch_diff(patch_diff)
            if not applied:
                return {
                    "experiment_id": experiment_id,
                    "verification_status": "FAILED",
                    "patch_valid": True,
                    "target_failure_resolved": False,
                    "regressions_detected": False,
                    "exit_code": -1,
                    "duration_ms": 0,
                    "test_output_excerpt": f"Patch apply failed: {apply_msg}",
                    "summary": f"Failed to apply patch to workspace: {apply_msg}",
                }

            # 4. Independent Verification — MUST derive verdict from actual execution
            adapter, report, _ = ProjectDetector.inspect(repo_dir, exp.project_root or "/")
            test_cmd = report.test_command or "pytest -v"
            image = adapter.get_docker_image()
            target_sub = (repo_dir / (exp.project_root or "/").strip("/")).resolve()

            start_t = time.time()
            try:
                exec_res = DockerExecutionRunner.run_in_container(
                    workspace_dir=target_sub,
                    command=test_cmd,
                    image=image,
                    network_enabled=False,
                    timeout_seconds=60,
                )
                duration_ms = int((time.time() - start_t) * 1000)
            except DockerUnavailableError as docker_err:
                duration_ms = int((time.time() - start_t) * 1000)
                exp.status = ExperimentStatus.VERIFICATION_FAILED.value
                db.commit()
                # INCONCLUSIVE — tests did not execute, never claim success
                return {
                    "experiment_id": experiment_id,
                    "verification_status": "INCONCLUSIVE",
                    "patch_valid": True,
                    "target_failure_resolved": False,
                    "regressions_detected": False,
                    "exit_code": -1,
                    "duration_ms": duration_ms,
                    "test_output_excerpt": (
                        "INCONCLUSIVE: Docker daemon is unavailable — post-patch tests did not execute. "
                        f"Docker error: {docker_err}"
                    ),
                    "summary": "Verification is INCONCLUSIVE: no independent tests ran (Docker unavailable).",
                }

            import hashlib
            diff_hash = hashlib.sha256(patch_diff.encode("utf-8")).hexdigest()[:12]

            tests_passed = exec_res.passed
            verification_status = "VERIFIED" if tests_passed else "FAILED"
            exp.final_verified = tests_passed
            exp.status = (
                ExperimentStatus.COMPLETED.value if tests_passed
                else ExperimentStatus.VERIFICATION_FAILED.value
            )
            db.commit()

            # Sanitize and assemble terminal output for the UI
            test_stdout = sanitize_secrets(exec_res.stdout or "")
            test_stderr = sanitize_secrets(exec_res.stderr or "")
            terminal_output = test_stdout[:1200]
            if test_stderr.strip():
                terminal_output += "\n--- STDERR ---\n" + test_stderr[:300]
            if not terminal_output.strip():
                terminal_output = f"[No terminal output captured] Exit code: {exec_res.exit_code}"

            # Record VerificationRun in DB
            v_run = VerificationRun(
                experiment_id=exp.id,
                check_name=f"Post-Patch Test Suite ({test_cmd})",
                status=VerificationStatus.PASSED.value if tests_passed else VerificationStatus.FAILED.value,
                expected_result="Test suite exits with code 0",
                actual_result=f"Exited with code {exec_res.exit_code}",
                duration_ms=duration_ms,
                output=terminal_output,
            )
            db.add(v_run)
            db.commit()

            return {
                "experiment_id": experiment_id,
                "verification_status": verification_status,
                "patch_valid": True,
                "target_failure_resolved": tests_passed,
                "regressions_detected": False,
                "exit_code": exec_res.exit_code,
                "duration_ms": duration_ms,
                "test_output_excerpt": terminal_output[:2000],
                "diff_hash": diff_hash,
                "summary": (
                    "Independent verification PASSED in isolated Docker container."
                    if tests_passed
                    else f"Verification FAILED: tests exited with code {exec_res.exit_code} after applying patch."
                ),
            }
        finally:
            if should_close:
                db.close()

