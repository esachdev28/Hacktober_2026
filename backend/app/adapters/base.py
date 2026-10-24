"""Modular Project Adapter Interface for Language & Stack Detection."""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pathlib import Path
from pydantic import BaseModel


class AdapterCapability(BaseModel):
    language: str
    can_detect: bool = True
    can_prepare_deps: bool = True
    can_run_tests: bool = True
    isolation_mode: str = "DOCKER"
    notes: Optional[str] = None


class InspectionReport(BaseModel):
    language: str
    frameworks: List[str]
    manifest_files: List[str]
    test_framework: Optional[str] = None
    test_command: Optional[str] = None
    dependencies_command: Optional[str] = None
    capabilities: AdapterCapability


class ExecutionResult(BaseModel):
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    command: str

    @property
    def passed(self) -> bool:
        return self.exit_code == 0


class ProjectAdapter(ABC):
    """Abstract interface for language and framework project adapters."""

    language_name: str

    @abstractmethod
    def detect_project(self, project_path: Path) -> bool:
        """Return True if this adapter recognizes the repository or subpath."""
        pass

    @abstractmethod
    def inspect_project(self, project_path: Path) -> InspectionReport:
        """Inspect manifests, dependency tools, test frameworks, and command lines."""
        pass

    @abstractmethod
    def select_baseline_checks(self, project_path: Path) -> List[str]:
        """Return list of candidate test/verification commands."""
        pass

    @abstractmethod
    def get_docker_image(self) -> str:
        """Return standard secure base Docker image for executing this stack."""
        pass
