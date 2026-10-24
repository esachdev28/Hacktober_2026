"""Experiment management and SSE streaming endpoints."""
import asyncio
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.experiments import (
    Experiment, Incident, Evidence, RepairAttempt,
    VerificationRun, ExperimentEvent, ExperimentStatus,
    PatchStatus, Severity
)
from app.schemas import (
    ExperimentCreate, ExperimentResponse, ExperimentListResponse,
    ExperimentEventResponse, EvidenceResponse, RepairAttemptResponse,
    VerificationRunResponse, ExperimentReport, IncidentResponse
)
from app.services.experiment_orchestrator import ExperimentOrchestrator
from app.services.report_generator import ReportGenerator

router = APIRouter(tags=["Experiments"])


@router.post("/experiments", response_model=ExperimentResponse, status_code=201)
def create_experiment(payload: ExperimentCreate, db: Session = Depends(get_db)):
    """Create a new experiment in CREATED state."""
    exp = Experiment(
        scenario_type=payload.scenario_type,
        target_environment=payload.target_environment,
        status=ExperimentStatus.CREATED.value,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


@router.get("/experiments", response_model=ExperimentListResponse)
def list_experiments(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List experiments ordered by creation time descending."""
    query = db.query(Experiment).order_by(Experiment.created_at.desc())
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return {"experiments": items, "total": total}


@router.get("/experiments/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    """Get single experiment by ID."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.post("/experiments/{experiment_id}/start")
async def start_experiment(
    experiment_id: int,
    auto_approve: bool = Query(False, description="Auto-approve validated repair patch"),
    db: Session = Depends(get_db),
):
    """Trigger execution of the experiment state machine."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if exp.status not in (ExperimentStatus.CREATED.value, ExperimentStatus.FAILED.value):
        raise HTTPException(status_code=400, detail=f"Cannot start experiment with status '{exp.status}'")

    ExperimentOrchestrator.start_experiment(experiment_id, auto_approve_patch=auto_approve)
    return {"message": "Experiment execution initiated", "experiment_id": experiment_id}


@router.post("/experiments/{experiment_id}/cancel")
async def cancel_experiment(experiment_id: int, db: Session = Depends(get_db)):
    """Cancel running experiment and tear down disposable workspace."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    await ExperimentOrchestrator.cancel_experiment(experiment_id)
    return {"message": "Experiment cancellation requested", "experiment_id": experiment_id}


@router.get("/experiments/{experiment_id}/events", response_model=List[ExperimentEventResponse])
def get_experiment_events(experiment_id: int, db: Session = Depends(get_db)):
    """Retrieve all ordered timeline events for an experiment."""
    return db.query(ExperimentEvent).filter(
        ExperimentEvent.experiment_id == experiment_id
    ).order_by(ExperimentEvent.created_at.asc()).all()


@router.get("/experiments/{experiment_id}/stream")
async def stream_experiment_events(experiment_id: int):
    """Server-Sent Events (SSE) stream for live experiment progression."""
    queue = asyncio.Queue()
    ExperimentOrchestrator.register_queue(experiment_id, queue)

    async def event_generator():
        try:
            # Yield initial keepalive / connection notice
            yield f"event: connected\ndata: {json.dumps({'experiment_id': experiment_id})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"event: {event['event_type']}\ndata: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Ping keepalive comment
                    yield ": keepalive\n\n"
        finally:
            ExperimentOrchestrator.unregister_queue(experiment_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.get("/experiments/{experiment_id}/evidence", response_model=List[EvidenceResponse])
def get_experiment_evidence(experiment_id: int, db: Session = Depends(get_db)):
    """Retrieve evidence items collected during this experiment."""
    return db.query(Evidence).filter(
        Evidence.experiment_id == experiment_id
    ).order_by(Evidence.created_at.asc()).all()


@router.get("/experiments/{experiment_id}/repairs", response_model=List[RepairAttemptResponse])
def get_experiment_repairs(experiment_id: int, db: Session = Depends(get_db)):
    """Retrieve all repair attempts and proposed patches."""
    return db.query(RepairAttempt).filter(
        RepairAttempt.experiment_id == experiment_id
    ).order_by(RepairAttempt.attempt_number.asc()).all()


@router.post("/experiments/{experiment_id}/repairs/{repair_id}/approve")
async def approve_repair(experiment_id: int, repair_id: int, db: Session = Depends(get_db)):
    """Approve candidate patch and proceed to apply & verify."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    repair = db.query(RepairAttempt).filter(RepairAttempt.id == repair_id).first()

    if not exp or not repair:
        raise HTTPException(status_code=404, detail="Experiment or repair attempt not found")

    if exp.status != ExperimentStatus.PATCH_REVIEW.value:
        raise HTTPException(status_code=400, detail=f"Cannot approve patch when status is '{exp.status}'")

    asyncio.create_task(ExperimentOrchestrator.apply_approved_repair(experiment_id, repair_id))
    return {"message": "Repair approved. Applying patch and running verification suite.", "repair_id": repair_id}


@router.post("/experiments/{experiment_id}/repairs/{repair_id}/reject")
async def reject_repair(experiment_id: int, repair_id: int, db: Session = Depends(get_db)):
    """Reject proposed patch."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    repair = db.query(RepairAttempt).filter(RepairAttempt.id == repair_id).first()

    if not exp or not repair:
        raise HTTPException(status_code=404, detail="Experiment or repair attempt not found")

    repair.patch_status = PatchStatus.REJECTED.value
    exp.status = ExperimentStatus.PATCH_REJECTED.value
    db.commit()

    await ExperimentOrchestrator.broadcast_event(
        experiment_id, "PATCH_REJECTED",
        "Operator rejected candidate patch.",
        db=db,
    )
    return {"message": "Repair patch rejected.", "repair_id": repair_id}


@router.get("/experiments/{experiment_id}/verification", response_model=List[VerificationRunResponse])
def get_experiment_verification(experiment_id: int, db: Session = Depends(get_db)):
    """Get independent verification checks and outcomes."""
    return db.query(VerificationRun).filter(
        VerificationRun.experiment_id == experiment_id
    ).order_by(VerificationRun.created_at.asc()).all()


@router.get("/experiments/{experiment_id}/report", response_model=ExperimentReport)
def get_experiment_report(experiment_id: int, db: Session = Depends(get_db)):
    """Get complete consolidated incident report."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    incident = db.query(Incident).filter(Incident.experiment_id == experiment_id).first()
    evidence = db.query(Evidence).filter(Evidence.experiment_id == experiment_id).all()
    repairs = db.query(RepairAttempt).filter(RepairAttempt.experiment_id == experiment_id).all()
    verifications = db.query(VerificationRun).filter(VerificationRun.experiment_id == experiment_id).all()
    events = db.query(ExperimentEvent).filter(ExperimentEvent.experiment_id == experiment_id).all()

    summary = {
        "status": exp.status,
        "final_verified": exp.final_verified,
        "total_checks": len(verifications),
        "passed_checks": sum(1 for v in verifications if v.status == "PASSED"),
    }

    return ExperimentReport(
        experiment=exp,
        incident=incident,
        evidence=evidence,
        repair_attempts=repairs,
        verification_runs=verifications,
        events=events,
        summary=summary,
    )


@router.get("/experiments/{experiment_id}/report/markdown")
def get_experiment_report_markdown(experiment_id: int, db: Session = Depends(get_db)):
    """Download or view report as formatted Markdown."""
    report_dict = get_experiment_report(experiment_id, db).model_dump()
    md = ReportGenerator.generate_markdown(report_dict)
    return {"markdown": md}
