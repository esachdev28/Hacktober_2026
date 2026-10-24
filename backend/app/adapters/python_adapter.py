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
        has_explicit_pytest = (
            (project_path / "pytest.ini").exists() or
            (project_path / "setup.cfg").exists() and "pytest" in (project_path / "setup.cfg").read_text(errors="ignore") or
            (project_path / "requirements.txt").exists() and "pytest" in (project_path / "requirements.txt").read_text(errors="ignore")
        )
        has_tests_dir = (project_path / "tests").exists() or any(project_path.glob("test_*.py"))

        if has_explicit_pytest or has_tests_dir:
            test_framework = "pytest"
            test_command = "if [ -f .chaospatch_env/bin/pytest ]; then .chaospatch_env/bin/pytest -v; else pytest -v; fi"
        else:
            test_framework = "unittest"
            test_command = "if [ -f .chaospatch_env/bin/python ]; then .chaospatch_env/bin/python -m unittest discover -v; else python -m unittest discover -v; fi"

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
                notes="Fully supported with pytest and unittest isolation in disposable virtualenv.",
            ),
        )

    def select_baseline_checks(self, project_path: Path) -> List[str]:
        report = self.inspect_project(project_path)
        return [report.test_command] if report.test_command else ["python -m unittest discover -v"]

    def get_docker_image(self) -> str:
        return "python:3.11-slim"

    def get_setup_command(self, project_path: Path) -> Optional[str]:
        """Return shell command to create isolated virtualenv and install dependencies in container."""
        has_reqs = (project_path / "requirements.txt").exists()
        has_setup = (project_path / "setup.py").exists()
        has_pyproject = (project_path / "pyproject.toml").exists()
        report = self.inspect_project(project_path)

        # Build resilient setup command for the disposable sandbox
        setup_parts = [
            "if [ ! -d .chaospatch_env ]; then",
            "python -m venv .chaospatch_env &&",
            ".chaospatch_env/bin/pip install --quiet --upgrade pip setuptools wheel &&",
        ]

        if has_reqs:
            setup_parts.append(".chaospatch_env/bin/pip install --quiet -r requirements.txt &&")
        if has_setup:
            setup_parts.append(".chaospatch_env/bin/pip install --quiet -e . &&")
        if has_pyproject:
            setup_parts.append(".chaospatch_env/bin/pip install --quiet -e . &&")

        if report.test_framework == "pytest":
            setup_parts.append(".chaospatch_env/bin/pip install --quiet pytest &&")

        setup_parts.append("true; fi")
        return " ".join(setup_parts)
