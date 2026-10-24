"""CHAOSPATCH Backend Configuration."""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # Application
    app_env: str = "development"
    app_debug: bool = True
    database_url: str = "sqlite:///./chaospatch.db"
    cors_origins: str = "http://localhost:5173"

    # Hugging Face Inference
    hf_token: Optional[str] = None
    hf_model_id: str = "Qwen/Qwen3-Coder-30B-A3B-Instruct"
    hf_inference_endpoint: str = "https://router.huggingface.co/v1"
    hf_provider: str = "featherless-ai"

    # Experiment Limits
    max_repair_attempts: int = 3
    experiment_timeout_seconds: int = 300
    max_patch_size_bytes: int = 10000
    max_changed_files: int = 5
    model_temperature: float = 0.3
    model_max_tokens: int = 4096

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def has_inference_credentials(self) -> bool:
        return bool(self.hf_token)

    @property
    def cors_origin_list(self):
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
