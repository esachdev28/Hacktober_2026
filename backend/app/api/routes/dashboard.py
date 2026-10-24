"""Dashboard analytics and metrics endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.experiments import Experiment, ExperimentStatus
from app.schemas import DashboardSummary, ExperimentResponse

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Compute real dashboard statistics from persisted experiment runs."""
    total = db.query(Experiment).count()
    successful = db.query(Experiment).filter(Experiment.final_verified == True).count()
    failed = db.query(Experiment).filter(Experiment.final_verified == False).count()

    verification_rate = None
    if (successful + failed) > 0:
        verification_rate = round((successful / (successful + failed)) * 100, 1)

    # Average recovery time for verified recoveries
    avg_duration = db.query(func.avg(Experiment.duration_ms)).filter(
        Experiment.final_verified == True,
        Experiment.duration_ms.isnot(None)
    ).scalar()

    # Scenario distribution
    distribution = {}
    scenario_counts = db.query(
        Experiment.scenario_type, func.count(Experiment.id)
    ).group_by(Experiment.scenario_type).all()
    for scen, count in scenario_counts:
        distribution[scen] = count

    # Recent experiments
    recent = db.query(Experiment).order_by(Experiment.created_at.desc()).limit(8).all()

    return DashboardSummary(
        total_experiments=total,
        successful_recoveries=successful,
        failed_recoveries=failed,
        verification_rate=verification_rate,
        avg_recovery_time_ms=round(avg_duration, 1) if avg_duration else None,
        recent_experiments=recent,
        scenario_distribution=distribution,
    )
