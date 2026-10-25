"""Health and readiness endpoints."""
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.schemas import HealthResponse, ReadyResponse
from app.providers import get_inference_provider
from app.core.config import settings
from app.sandbox.docker_runner import DockerExecutionRunner

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)):
    """Basic health check indicating process is running.

    docker_available reflects whether the Docker daemon is reachable from
    this host process. It is False on Render free/standard tier (no Docker
    daemon inside the shared container). Set DOCKER_HOST to point at a
    remote or sidecar daemon to enable sandbox execution in production.
    """
    db_status = "unhealthy"
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    inf_status = "configured" if settings.has_inference_credentials else "not_configured"

    diag = DockerExecutionRunner.diagnose()

    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        version="0.1.0",
        database=db_status,
        inference=inf_status,
        docker_available=diag.available,
        docker_host=diag.docker_host,
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

    checks["inference_configured"] = settings.has_inference_credentials
    checks["docker_available"] = DockerExecutionRunner.is_docker_available()

    all_ready = checks.get("database", False)
    return ReadyResponse(ready=all_ready, checks=checks)
