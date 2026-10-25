"""Inference provider module — Strict single-provider lockdown (NVIDIA NIM)."""
from app.providers.base import BaseInferenceProvider, ModelDiagnosisResult
from app.providers.nvidia_nim import NvidiaNIMProvider


def get_inference_provider() -> BaseInferenceProvider:
    """Factory: strictly return the sole configured provider (NvidiaNIMProvider)."""
    return NvidiaNIMProvider()


__all__ = [
    "BaseInferenceProvider",
    "ModelDiagnosisResult",
    "NvidiaNIMProvider",
    "get_inference_provider",
]
