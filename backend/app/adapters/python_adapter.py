"""Python project adapter."""
import re
from pathlib import Path
from typing import List, Optional
from app.adapters.base import ProjectAdapter, InspectionReport, AdapterCapability


class PythonAdapter(ProjectAdapter):
    """Adapter for Python repositories (pytest, unittest, poetry, pip, etc.)."""

    language_name = "Python"

    PYTHON_MANIFESTS = [
        "pyproject.toml",
        "requirements.txt",
        "setup.py",
        "setup.cfg",
        "Pipfile",
        "tox.ini",
        "pytest.ini",
    ]

    def detect_project(self, project_path: Path) -> bool:
        if not project_path.exists() or not project_path.is_dir():
            return False

        # Look for Python manifests
        for manifest in self.PYTHON_MANIFESTS:
            if (project_path / manifest).exists():
                return True

        # Check for any .py files
        if any(project_path.glob("*.py")) or any(project_path.glob("src/**/*.py")):
            return True

        return False

    def inspect_project(self, project_path: Path) -> InspectionReport:
        found_manifests = [m for m in self.PYTHON_MANIFESTS if (project_path / m).exists()]
        frameworks = []
        test_framework = "pytest"
        test_command = "pytest -v"
        dep_cmd = "pip install -r requirements.txt"

        # Check for pytest.ini or pyproject.toml contents
        pyproject_file = project_path / "pyproject.toml"
        if pyproject_file.exists():
            content = pyproject_file.read_text(encoding="utf-8", errors="ignore")
            if "poetry" in content.lower():
                frameworks.append("Poetry")
                dep_cmd = "poetry install"
                test_command = "poetry run pytest"
            if "flit" in content.lower():
                frameworks.append("Flit")
            if "hatch" in content.lower():
                frameworks.append("Hatch")

        if (project_path / "Pipfile").exists():
            frameworks.append("Pipenv")
            dep_cmd = "pipenv install"
            test_command = "pipenv run pytest"

        if (project_path / "tox.ini").exists():
            frameworks.append("Tox")

        # Test framework detection
        has_pytest = (
            (project_path / "pytest.ini").exists() or
            (project_path / "tests").exists() or
            any(project_path.glob("test_*.py")) or
            any(project_path.glob("tests/**/test_*.py"))
        )
        if has_pytest:
            test_framework = "pytest"
        else:
            test_framework = "unittest"
            test_command = "python -m unittest discover -v"

        return InspectionReport(
            language="Python",
            frameworks=frameworks,
            manifest_files=found_manifests,
            test_framework=test_framework,
            test_command=test_command,
            dependencies_command=dep_cmd,
            capabilities=AdapterCapability(
                language="Python",
                can_detect=True,
                can_prepare_deps=True,
                can_run_tests=True,
                isolation_mode="DOCKER",
                notes="Fully supported with pytest and unittest isolation.",
            ),
        )

    def select_baseline_checks(self, project_path: Path) -> List[str]:
        report = self.inspect_project(project_path)
        return [report.test_command] if report.test_command else ["pytest -v"]

    def get_docker_image(self) -> str:
        return "python:3.11-slim"
