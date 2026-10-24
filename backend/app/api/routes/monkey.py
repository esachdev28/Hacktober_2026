"""REST API routes for Monkey Chaos autonomous fault injection."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.experiments import (
    Experiment,
    Incident,
    Evidence,
    ExperimentEvent,
    ExperimentStatus,
)
from app.schemas.monkey import (
    MonkeyConfig,
    MonkeyLaunchResponse,
    MonkeyStatusResponse,
    MonkeyVectorsCatalogResponse,
)
from app.services.monkey_engine import MonkeyChaosEngine
from app.services.experiment_orchestrator import ExperimentOrchestrator

router = APIRouter(prefix="/monkey", tags=["Monkey Chaos"])


@router.get("/vectors", response_model=MonkeyVectorsCatalogResponse)
def get_monkey_vectors():
    """Retrieve catalog of available autonomous monkey attack vectors and intensities."""
    return MonkeyVectorsCatalogResponse(
        vectors=MonkeyChaosEngine.get_available_vectors(),
        intensities=MonkeyChaosEngine.INTENSITIES,
    )


@router.post("/launch", response_model=MonkeyLaunchResponse, status_code=200)
async def launch_monkey_chaos(payload: MonkeyConfig, db: Session = Depends(get_db)):
    """Configure, plan, and unleash an autonomous Monkey Chaos strike in an isolated sandbox."""
    # 1. Plan attack vectors based on configured intensity
    planned_vectors = MonkeyChaosEngine.select_attack_plan(
        intensity=payload.intensity,
        allowed_vectors=payload.attack_vectors,
    )

    if not planned_vectors:
        raise HTTPException(
            status_code=400,
            detail="No valid attack vectors selected or available for strike."
        )

    # 2. Formulate scenario identifier
    vectors_str = "+".join(planned_vectors)
    scenario_type = f"monkey:{payload.intensity}:{vectors_str}"

    # 3. Create Experiment record in SQLite
    exp = Experiment(
        scenario_type=scenario_type,
        target_environment=payload.target_environment,
        status=ExperimentStatus.CREATED.value,
        started_at=datetime.utcnow(),
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    # 4. Record initial launch event
    event = ExperimentEvent(
        experiment_id=exp.id,
        event_type="MONKEY_STRIKE_LAUNCHED",
        message=f"Autonomous Monkey Chaos initiated with {payload.intensity} intensity. Planned vectors: {', '.join(planned_vectors)}",
        metadata_json={
            "intensity": payload.intensity,
            "planned_vectors": planned_vectors,
            "jitter_ms": payload.jitter_ms,
            "auto_repair": payload.auto_repair,
            "target_path": payload.target_path,
        },
    )
    db.add(event)
    db.commit()

    # 5. Spawn background orchestrator task
    ExperimentOrchestrator.start_experiment(
        experiment_id=exp.id,
        auto_approve_patch=payload.auto_repair,
    )

    return MonkeyLaunchResponse(
        experiment_id=exp.id,
        status="LAUNCHED",
        planned_vectors=planned_vectors,
        intensity=payload.intensity,
        timestamp=datetime.utcnow().isoformat(),
        message=f"Monkey Chaos strike launched successfully with {payload.intensity} intensity across {len(planned_vectors)} vector(s).",
    )


@router.get("/experiments/{experiment_id}/status", response_model=MonkeyStatusResponse)
def get_monkey_strike_status(experiment_id: int, db: Session = Depends(get_db)):
    """Retrieve real-time state, active vector, logs, and evidence for a monkey experiment."""
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Monkey experiment not found")

    # Parse active vector(s) from scenario_type
    active_vector = None
    if exp.scenario_type.startswith("monkey:"):
        parts = exp.scenario_type.split(":")
        if len(parts) >= 3:
            active_vector = parts[2]

    # Gather recent event log messages
    events = (
        db.query(ExperimentEvent)
        .filter(ExperimentEvent.experiment_id == experiment_id)
        .order_by(ExperimentEvent.created_at.asc())
        .all()
    )
    logs = [e.message for e in events]

    # Gather collected evidence IDs
    evidence_rows = (
        db.query(Evidence)
        .filter(Evidence.experiment_id == experiment_id)
        .all()
    )
    evidence_ids = [f"EVID-{e.id:03d}" for e in evidence_rows]

    return MonkeyStatusResponse(
        experiment_id=exp.id,
        state=exp.status,
        active_vector=active_vector,
        logs=logs,
        evidence_ids=evidence_ids,
    )
