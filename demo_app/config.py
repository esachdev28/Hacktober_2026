"""Target Demo Application for CHAOSPATCH: Configuration module."""
import os
from typing import Optional


class AppConfig:
    """Application configuration with environment fallbacks."""

    def __init__(self, env_dict: Optional[dict] = None):
        self._env = env_dict if env_dict is not None else os.environ

    @property
    def service_name(self) -> str:
        return self._env.get("SERVICE_NAME", "order-processing-service")

    @property
    def inventory_api_url(self) -> str:
        # Fault scenario 1 targets this configuration
        # In vulnerable/broken state: raises KeyError if INVENTORY_API_URL is missing
        return self._env["INVENTORY_API_URL"]

    @property
    def downstream_timeout_seconds(self) -> float:
        return float(self._env.get("DOWNSTREAM_TIMEOUT_SECONDS", 10.0))

    @property
    def max_retries(self) -> int:
        return int(self._env.get("MAX_RETRIES", 2))
