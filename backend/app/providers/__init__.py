# Providers module
from app.providers.base import BaseInferenceProvider, ModelDiagnosisResult
from app.providers.huggingface_qwen import HuggingFaceQwenProvider
from app.providers.nvidia_nim import NvidiaNIMProvider


def get_inference_provider() -> BaseInferenceProvider:
    """Factory: return the active inference provider based on configuration."""
    from app.core.config import settings
    provider = settings.active_provider
    if provider == "nvidia":
        return NvidiaNIMProvider()
    if provider == "huggingface":
        return HuggingFaceQwenProvider()
    # No credentials configured — return HF provider (will raise on call)
    return HuggingFaceQwenProvider()


__all__ = [
    "BaseInferenceProvider",
    "ModelDiagnosisResult",
    "HuggingFaceQwenProvider",
    "NvidiaNIMProvider",
    "get_inference_provider",
]
