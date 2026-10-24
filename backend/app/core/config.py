"""CHAOSPATCH Backend Configuration."""
import os
from typing import Optional, List as TypingList
from pydantic_settings import BaseSettings
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current directory, backend directory, and workspace root
for candidate in [Path(".env"), Path("backend/.env"), Path(__file__).resolve().parents[2] / ".env"]:
    if candidate.exists():
        load_dotenv(dotenv_path=candidate, override=True)
        break


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # Application
    app_env: str = "development"
    app_debug: bool = True
    database_url: str = "sqlite:///./chaospatch.db"
    cors_origins: str = "http://localhost:5173"

    # Hugging Face Inference (legacy — use if hf_token starts with "hf_")
    hf_token: Optional[str] = None
    hf_model_id: str = "Qwen/Qwen2.5-Coder-32B-Instruct"
    hf_inference_endpoint: str = "https://router.huggingface.co/v1"
    hf_provider: str = "featherless-ai"

    # NVIDIA NIM Inference
    nvidia_api_key: Optional[str] = None
    nvidia_model: Optional[str] = None
    nvidia_model_id: str = "google/gemma-4-31b-it"
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_timeout_seconds: float = 60.0

    # Active provider: "auto" | "huggingface" | "nvidia"
    # "auto" picks NVIDIA NIM if nvidia_api_key is set, else falls back to HF.
    inference_provider: str = "auto"

    # Experiment Limits
    max_repair_attempts: int = 3
    experiment_timeout_seconds: int = 300
    max_patch_size_bytes: int = 10000
    max_changed_files: int = 5
    model_temperature: float = 0.3
    model_max_tokens: int = 2048

    class Config:
        env_file = ".env"
        case_sensitive = False
        protected_namespaces = ()

    @property
    def effective_hf_token(self) -> Optional[str]:
        """Return hf_token only if it is a real HF token (starts with hf_)."""
        if self.hf_token and self.hf_token.startswith("hf_"):
            return self.hf_token
        return None

    @property
    def effective_nvidia_model(self) -> str:
        """Return the configured NVIDIA model ID (prefers nvidia_model, then nvidia_model_id)."""
        return (self.nvidia_model or self.nvidia_model_id or "google/gemma-4-31b-it").strip()

    @property
    def has_nvidia_credentials(self) -> bool:
        return bool(self.nvidia_api_key and self.nvidia_api_key.startswith("nvapi-"))

    @property
    def has_hf_credentials(self) -> bool:
        return bool(self.effective_hf_token)

    @property
    def has_inference_credentials(self) -> bool:
        return self.has_nvidia_credentials or self.has_hf_credentials

    @property
    def active_provider(self) -> str:
        """Resolve which provider will be used."""
        if self.inference_provider == "nvidia":
            return "nvidia"
        if self.inference_provider == "huggingface":
            return "huggingface"
        # auto
        if self.has_nvidia_credentials:
            return "nvidia"
        if self.has_hf_credentials:
            return "huggingface"
        return "none"

    @property
    def cors_origin_list(self):
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
