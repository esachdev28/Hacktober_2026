"""Project language detection and monorepo scanner."""
from pathlib import Path
from typing import List, Optional, Tuple
from app.adapters.base import ProjectAdapter, InspectionReport, AdapterCapability
from app.adapters.python_adapter import PythonAdapter
from app.adapters.node_adapter import NodeAdapter
from app.adapters.compiled_adapters import GoAdapter, RustAdapter, JavaAdapter


class UnsupportedAdapter(ProjectAdapter):
    """Fallback adapter for unknown or unsupported languages."""

    language_name = "Unsupported"

    def detect_project(self, project_path: Path) -> bool:
        return True

    def inspect_project(self, project_path: Path) -> InspectionReport:
        return InspectionReport(
            language="Unknown / Unsupported",
            frameworks=[],
            manifest_files=[],
            test_framework=None,
            test_command=None,
            dependencies_command=None,
            capabilities=AdapterCapability(
                language="Unknown",
                can_detect=True,
                can_prepare_deps=False,
                can_run_tests=False,
                isolation_mode="NONE",
                notes="UNSUPPORTED_TEST_ENVIRONMENT: No safe trusted adapter available for this stack. CHAOSPATCH will not execute arbitrary guessed commands.",
            ),
        )

    def select_baseline_checks(self, project_path: Path) -> List[str]:
        return []

    def get_docker_image(self) -> str:
        return "alpine:latest"


# Adapter Registry in priority order
ADAPTER_REGISTRY: List[ProjectAdapter] = [
    PythonAdapter(),
    NodeAdapter(),
    GoAdapter(),
    RustAdapter(),
    JavaAdapter(),
]


class ProjectDetector:
    """Detects languages, frameworks, monorepos, and selects matching adapter."""

    @classmethod
    def detect_monorepo_roots(cls, root_path: Path) -> List[str]:
        """Scan top-level and first-depth subdirectories for distinct project roots."""
        roots = []
        # Check root itself
        for adapter in ADAPTER_REGISTRY:
            if adapter.detect_project(root_path):
                roots.append("/")
                break

        # Check immediate subdirectories (up to depth 2)
        try:
            for sub in root_path.iterdir():
                if sub.is_dir() and not sub.name.startswith(".") and sub.name not in ("node_modules", "vendor", "dist", "build"):
                    for adapter in ADAPTER_REGISTRY:
                        if adapter.detect_project(sub):
                            roots.append(f"/{sub.name}")
                            break
        except Exception:
            pass

        return list(dict.fromkeys(roots)) or ["/"]

    @classmethod
    def get_adapter_for_path(cls, path: Path) -> ProjectAdapter:
        """Find the first adapter that detects the given path, or fallback to UnsupportedAdapter."""
        for adapter in ADAPTER_REGISTRY:
            if adapter.detect_project(path):
                return adapter
        return UnsupportedAdapter()

    @classmethod
    def inspect(cls, repo_path: Path, sub_path: str = "/") -> Tuple[ProjectAdapter, InspectionReport, List[str]]:
        """Inspect a repository and return matching adapter, report, and monorepo roots."""
        clean_sub = sub_path.strip("/")
        target_dir = (repo_path / clean_sub) if clean_sub else repo_path

        monorepo_roots = cls.detect_monorepo_roots(repo_path)
        adapter = cls.get_adapter_for_path(target_dir)
        report = adapter.inspect_project(target_dir)

        return adapter, report, monorepo_roots
