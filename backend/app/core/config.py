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

    # NVIDIA NIM Sole Inference Provider: z-ai/glm-5.3-flash
    nvidia_api_key: Optional[str] = None
    nvidia_model: Optional[str] = "z-ai/glm-5.3-flash"
    nvidia_model_id: str = "z-ai/glm-5.3-flash"
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_timeout_seconds: float = 60.0

    # Strict single-provider lockdown
    inference_provider: str = "nvidia"

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
    def effective_nvidia_model(self) -> str:
        """Return the configured NVIDIA model ID (strictly z-ai/glm-5.3-flash)."""
        return (self.nvidia_model or self.nvidia_model_id or "z-ai/glm-5.3-flash").strip()

    @property
    def has_nvidia_credentials(self) -> bool:
        return bool(self.nvidia_api_key and self.nvidia_api_key.startswith("nvapi-"))

    @property
    def has_inference_credentials(self) -> bool:
        return self.has_nvidia_credentials

    @property
    def active_provider(self) -> str:
        """Resolve active provider: strictly NVIDIA NIM or none if unconfigured."""
        if self.has_nvidia_credentials:
            return "nvidia"
        return "none"

    @property
    def cors_origin_list(self):
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
