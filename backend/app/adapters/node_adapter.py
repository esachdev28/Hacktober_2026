"""Node.js / TypeScript project adapter."""
import json
from pathlib import Path
from typing import List
from app.adapters.base import ProjectAdapter, InspectionReport, AdapterCapability


class NodeAdapter(ProjectAdapter):
    """Adapter for JavaScript/TypeScript repositories (npm, yarn, pnpm, jest, vitest)."""

    language_name = "JavaScript/TypeScript"

    MANIFESTS = ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "tsconfig.json"]

    def detect_project(self, project_path: Path) -> bool:
        return (project_path / "package.json").exists()

    def inspect_project(self, project_path: Path) -> InspectionReport:
        pkg_json_file = project_path / "package.json"
        frameworks = []
        test_framework = "npm test"
        test_command = "npm test"
        dep_cmd = "npm install"

        if (project_path / "yarn.lock").exists():
            dep_cmd = "yarn install"
            test_command = "yarn test"
            frameworks.append("Yarn")
        elif (project_path / "pnpm-lock.yaml").exists():
            dep_cmd = "pnpm install"
            test_command = "pnpm test"
            frameworks.append("pnpm")

        if (project_path / "tsconfig.json").exists():
            frameworks.append("TypeScript")

        if pkg_json_file.exists():
            try:
                data = json.loads(pkg_json_file.read_text(encoding="utf-8"))
                dev_deps = data.get("devDependencies", {})
                deps = data.get("dependencies", {})
                all_deps = {**deps, **dev_deps}

                if "jest" in all_deps:
                    test_framework = "Jest"
                elif "vitest" in all_deps:
                    test_framework = "Vitest"
                elif "mocha" in all_deps:
                    test_framework = "Mocha"

                scripts = data.get("scripts", {})
                if "test" in scripts:
                    test_command = "npm test"
            except Exception:
                pass

        manifests = [m for m in self.MANIFESTS if (project_path / m).exists()]

        return InspectionReport(
            language="JavaScript/TypeScript",
            frameworks=frameworks,
            manifest_files=manifests,
            test_framework=test_framework,
            test_command=test_command,
            dependencies_command=dep_cmd,
            capabilities=AdapterCapability(
                language="JavaScript/TypeScript",
                can_detect=True,
                can_prepare_deps=True,
                can_run_tests=True,
                isolation_mode="DOCKER",
                notes="Supported for npm/yarn test suites.",
            ),
        )

    def select_baseline_checks(self, project_path: Path) -> List[str]:
        return ["npm test"]

    def get_docker_image(self) -> str:
        return "node:20-slim"
