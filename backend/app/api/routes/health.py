"""Health and readiness endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.schemas import HealthResponse, ReadyResponse
from app.providers.huggingface_qwen import HuggingFaceQwenProvider

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)):
    """Basic health check indicating process is running."""
    db_status = "unhealthy"
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    provider = HuggingFaceQwenProvider()
    inf_status = "configured" if provider.token else "not_configured"

    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        version="0.1.0",
        database=db_status,
        inference=inf_status,
    )


@router.get("/ready", response_model=ReadyResponse)
def get_readiness(db: Session = Depends(get_db)):
    """Readiness probe checking database connectivity."""
    checks = {}
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        checks["database"] = False

    provider = HuggingFaceQwenProvider()
    checks["inference_configured"] = bool(provider.token)

    all_ready = checks.get("database", False)
    return ReadyResponse(ready=all_ready, checks=checks)
