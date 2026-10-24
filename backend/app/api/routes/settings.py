"""Settings and AI inference connectivity test endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.db.database import get_db
from app.schemas import SettingsResponse, InferenceTestResponse
from app.providers.huggingface_qwen import HuggingFaceQwenProvider

router = APIRouter(tags=["Settings"])


@router.get("/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Retrieve non-sensitive system settings and environment configuration."""
    db_status = "operational"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "offline"

    provider = HuggingFaceQwenProvider()

    return SettingsResponse(
        model_id=settings.hf_model_id,
        provider=settings.hf_provider,
        inference_endpoint=settings.hf_inference_endpoint,
        has_credentials=bool(settings.hf_token),
        max_repair_attempts=settings.max_repair_attempts,
        experiment_timeout_seconds=settings.experiment_timeout_seconds,
        model_temperature=settings.model_temperature,
        model_max_tokens=settings.model_max_tokens,
        database_status=db_status,
        backend_version="0.1.0",
        environment=settings.app_env,
    )


@router.post("/settings/inference-test", response_model=InferenceTestResponse)
def test_inference_connectivity():
    """Live connectivity test against Hugging Face Qwen inference router."""
    provider = HuggingFaceQwenProvider()
    res = provider.health_check()

    if res.get("connected"):
        return InferenceTestResponse(
            success=True,
            message="Successfully reached Hugging Face Qwen router.",
            latency_ms=res.get("latency_ms"),
            model_id=res.get("model"),
        )
    else:
        return InferenceTestResponse(
            success=False,
            message="Failed to connect to Hugging Face Qwen router.",
            error=res.get("error"),
            latency_ms=res.get("latency_ms"),
            model_id=res.get("model"),
        )
