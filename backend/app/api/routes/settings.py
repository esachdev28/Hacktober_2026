"""Settings and AI inference connectivity test endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.db.database import get_db
from app.schemas import SettingsResponse, InferenceTestResponse
from app.providers import get_inference_provider

router = APIRouter(tags=["Settings"])


@router.get("/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Retrieve non-sensitive system settings and environment configuration."""
    db_status = "operational"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "offline"

    active = settings.active_provider
    if active == "nvidia":
        model_id = settings.effective_nvidia_model
        provider_name = "nvidia-nim"
        endpoint = settings.nvidia_base_url
    else:
        model_id = settings.hf_model_id
        provider_name = settings.hf_provider
        endpoint = settings.hf_inference_endpoint

    return SettingsResponse(
        model_id=model_id,
        provider=provider_name,
        inference_endpoint=endpoint,
        has_credentials=settings.has_inference_credentials,
        max_repair_attempts=settings.max_repair_attempts,
        experiment_timeout_seconds=settings.experiment_timeout_seconds,
        model_temperature=settings.model_temperature,
        model_max_tokens=settings.model_max_tokens,
        database_status=db_status,
        backend_version="0.1.0",
        environment=settings.app_env,
    )


@router.post("/settings/inference-test", response_model=InferenceTestResponse)
@router.post("/settings/test-inference", response_model=InferenceTestResponse)
def test_inference_connectivity():
    """Live connectivity test against the active AI inference provider."""
    provider = get_inference_provider()
    res = provider.health_check()
    active = settings.active_provider

    provider_label = "NVIDIA NIM" if active == "nvidia" else "Hugging Face Qwen"

    if res.get("connected"):
        return InferenceTestResponse(
            success=True,
            message=f"Successfully connected to {provider_label} inference API.",
            latency_ms=res.get("latency_ms"),
            model_id=res.get("model"),
        )
    else:
        return InferenceTestResponse(
            success=False,
            message=f"Failed to connect to {provider_label} inference API.",
            error=res.get("error"),
            latency_ms=res.get("latency_ms"),
            model_id=res.get("model"),
        )
