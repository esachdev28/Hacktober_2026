"""API endpoints for Universal Public GitHub Repository Mode."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Dict, Any
from pathlib import Path

from app.db.database import get_db
from app.models.experiments import Experiment, ExperimentEvent, ExperimentStatus, RepairAttempt, PatchStatus
from app.schemas.repository import (
    RepoIntakeRequest,
    ProjectInspectionResult,
    RepoBaselineRequest,
    RepoBaselineResponse,
    RepoPatchVerifyRequest,
    RepoPatchVerifyResponse,
    RepoPublishRequest,
    RepoPublishResponse,
    PatchExportResponse,
)
from app.services.repository_orchestrator import RepositoryOrchestrator
from app.services.git_service import GitService, GitSecurityError
from app.providers import get_inference_provider
from app.providers.base import ModelDiagnosisResult

router = APIRouter(prefix="/repository", tags=["Public GitHub Repository Mode"])


@router.post("/intake", response_model=ProjectInspectionResult)
def intake_repository(payload: RepoIntakeRequest, db: Session = Depends(get_db)):
    """Intake public GitHub repository: validate URL, clone safely, and inspect technology stack."""
    try:
        result = RepositoryOrchestrator.intake_repository(
            repo_url=payload.repo_url,
            project_root=payload.project_root or "/",
            target_branch=payload.target_branch,
            db=db,
        )
        return {
            **result,
            "canonical_id": f"{result['owner']}/{result['name']}",
            "is_public": True,
        }
    except GitSecurityError as sec_err:
        raise HTTPException(status_code=400, detail=str(sec_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to intake repository: {str(err)}")


@router.post("/run-baseline", response_model=RepoBaselineResponse)
def run_baseline(payload: RepoBaselineRequest, db: Session = Depends(get_db)):
    """Run baseline tests inside isolated Docker execution environment."""
    try:
        result = RepositoryOrchestrator.run_baseline_checks(
            experiment_id=payload.experiment_id,
            test_filter=payload.test_filter,
            db=db,
        )
        return result
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/diagnose-and-patch")
def diagnose_and_patch(experiment_id: int, db: Session = Depends(get_db)):
    """Request AI root-cause diagnosis and candidate patch for the public repository failure."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    # Retrieve evidence collected for this repository run
    from app.models.experiments import Evidence
    evidence_items = db.query(Evidence).filter(Evidence.experiment_id == experiment_id).all()
    evidence_text = "\n".join([f"[{e.evidence_type.upper()}] {e.source}:\n{e.content}" for e in evidence_items])

    provider = get_inference_provider()
    from app.core.config import settings
    if not settings.has_inference_credentials:
        return {
            "experiment_id": experiment_id,
            "repair_id": None,
            "status": "AI_UNAVAILABLE",
            "title": "AI inference not configured",
            "root_cause": "No AI inference credentials are configured. Set NVIDIA_API_KEY or HF_TOKEN in .env.",
            "confidence": 0.0,
            "proposed_patch_diff": "",
            "explanation": "",
            "risk_summary": "N/A",
            "is_ai_generated": False,
            "provider": "none",
        }

    try:
        diagnosis = provider.generate_diagnosis_and_patch(
            scenario_id=f"public_repo_{exp.repo_name}",
            evidence_text=evidence_text or "Baseline test failure",
            source_context=f"Repository: {exp.repo_url} (Stack: {exp.detected_language})",
        )
        # Reject placeholder / empty diffs
        diff = diagnosis.proposed_patch_diff or ""
        if not diff.strip() or diff.strip().startswith("#") and len(diff.strip()) < 80:
            raise RuntimeError(f"AI returned an empty or placeholder diff: '{diff[:80]}'")
    except Exception as err:
        return {
            "experiment_id": experiment_id,
            "repair_id": None,
            "status": "REFERENCE_FALLBACK",
            "title": f"Diagnostic for {exp.repo_name}",
            "root_cause": f"AI inference failed: {str(err)}",
            "confidence": 0.0,
            "proposed_patch_diff": "",
            "explanation": "Inference unavailable. Review baseline logs and apply a manual patch.",
            "risk_summary": "Manual review required.",
            "is_ai_generated": False,
            "provider": "reference-fallback",
        }

    # Persist RepairAttempt
    repair = RepairAttempt(
        experiment_id=exp.id,
        attempt_number=1,
        diagnosis=diagnosis.explanation,
        patch_diff=diagnosis.proposed_patch_diff,
        patch_status=PatchStatus.PROPOSED.value,
        validation_status="PENDING",
        risk_summary=diagnosis.risk_summary,
    )
    db.add(repair)
    db.commit()

    return {
        "experiment_id": experiment_id,
        "repair_id": repair.id,
        "title": diagnosis.title,
        "root_cause": diagnosis.root_cause,
        "confidence": diagnosis.confidence,
        "proposed_patch_diff": diagnosis.proposed_patch_diff,
        "explanation": diagnosis.explanation,
        "risk_summary": diagnosis.risk_summary,
        "is_ai_generated": diagnosis.is_ai_generated,
        "provider": diagnosis.provider,
    }


@router.post("/verify-patch", response_model=RepoPatchVerifyResponse)
def verify_patch(payload: RepoPatchVerifyRequest, db: Session = Depends(get_db)):
    """Validate patch safety and independently re-test in isolated container."""
    try:
        exp = db.query(Experiment).filter(Experiment.id == payload.experiment_id).first()
        if not exp:
            raise HTTPException(status_code=404, detail="Experiment not found")

        patch_diff = payload.patch_diff
        if not patch_diff:
            # Check if there is a saved repair to use; if not, return REJECTED via orchestrator
            latest_repair = db.query(RepairAttempt).filter(
                RepairAttempt.experiment_id == payload.experiment_id
            ).order_by(RepairAttempt.attempt_number.desc()).first()
            if latest_repair and latest_repair.patch_diff:
                patch_diff = latest_repair.patch_diff
            else:
                # No diff available — return REJECTED contract response (not an error)
                return {
                    "experiment_id": payload.experiment_id,
                    "verification_status": "REJECTED",
                    "patch_valid": False,
                    "target_failure_resolved": False,
                    "regressions_detected": False,
                    "exit_code": -1,
                    "duration_ms": 0,
                    "test_output_excerpt": "No patch diff provided and no saved repair attempt found for this experiment.",
                    "summary": "Cannot verify: no patch diff is available.",
                }

        result = RepositoryOrchestrator.apply_and_verify_patch(
            experiment_id=payload.experiment_id,
            patch_diff=patch_diff,
            db=db,
        )
        return result
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/publish-branch", response_model=RepoPublishResponse)
def publish_repair_branch(payload: RepoPublishRequest, db: Session = Depends(get_db)):
    """Publish verified patch to dedicated repair branch (requires write permissions)."""
    exp = db.query(Experiment).filter(Experiment.id == payload.experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if not exp.repo_url:
        raise HTTPException(status_code=400, detail="Experiment does not have an associated GitHub repository")

    # Get latest verified patch
    latest_repair = db.query(RepairAttempt).filter(
        RepairAttempt.experiment_id == payload.experiment_id
    ).order_by(RepairAttempt.attempt_number.desc()).first()
    
    patch_diff = latest_repair.patch_diff if latest_repair else ""

    repo_dir = None
    event = db.query(ExperimentEvent).filter(
        ExperimentEvent.experiment_id == payload.experiment_id,
        ExperimentEvent.event_type == "REPO_INTAKE_SUCCESS"
    ).first()
    if event and event.metadata_json and "clone_dir" in event.metadata_json:
        candidate = Path(event.metadata_json["clone_dir"])
        if candidate.exists():
            repo_dir = candidate

    if not repo_dir:
        repos_base = RepositoryOrchestrator.get_repos_base_dir()
        matching_dirs = list(repos_base.glob(f"{exp.repo_owner}_{exp.repo_name}_*"))
        if matching_dirs:
            repo_dir = matching_dirs[0]

    if not repo_dir:
        raise HTTPException(status_code=404, detail="Repository clone directory not found")


    result = GitService.publish_repair_branch(
        repo_dir=repo_dir,
        repo_url=exp.repo_url,
        base_commit_sha=exp.base_commit_sha or "",
        experiment_id=exp.id,
        github_token=payload.github_token,
        patch_diff=patch_diff,
        branch_name=payload.branch_name,
        commit_message=payload.commit_message,
    )

    if result.get("status") == "PUBLISHED":
        exp.publish_status = "PUBLISHED"
        exp.published_branch = result.get("published_branch")
        exp.published_commit_sha = result.get("commit_sha")
        exp.published_branch_url = result.get("remote_branch_url")
        db.commit()

    return {
        "experiment_id": payload.experiment_id,
        "status": result.get("status", "PUSH_FAILED"),
        "published_branch": result.get("published_branch"),
        "commit_sha": result.get("commit_sha"),
        "remote_branch_url": result.get("remote_branch_url"),
        "message": result.get("message", ""),
    }


@router.get("/export-patch/{experiment_id}")
def export_patch(experiment_id: int, db: Session = Depends(get_db)):
    """Export verified patch as standard downloadable .patch file."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    latest_repair = db.query(RepairAttempt).filter(
        RepairAttempt.experiment_id == experiment_id
    ).order_by(RepairAttempt.attempt_number.desc()).first()

    diff_content = latest_repair.patch_diff if latest_repair else "# No diff available"
    patch_text = GitService.generate_export_patch(
        experiment_id=exp.id,
        base_commit=exp.base_commit_sha or "HEAD",
        patch_diff=diff_content,
        summary=f"Automated repair for {exp.repo_owner}/{exp.repo_name}",
    )

    filename = f"chaospatch-repair-exp-{exp.id}.patch"
    return Response(
        content=patch_text,
        media_type="text/x-diff",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
