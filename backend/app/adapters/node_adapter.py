"""Node.js / TypeScript project adapter with smart script discovery and validation."""
import json
from pathlib import Path
from typing import List, Optional
from app.adapters.base import ProjectAdapter, InspectionReport, AdapterCapability


class NodeAdapter(ProjectAdapter):
    """Adapter for JavaScript/TypeScript repositories (npm, yarn, pnpm, jest, vitest, mocha)."""

    language_name = "JavaScript/TypeScript"

    MANIFESTS = ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "tsconfig.json"]

    def detect_project(self, project_path: Path) -> bool:
        return (project_path / "package.json").exists()

    def inspect_project(self, project_path: Path) -> InspectionReport:
        pkg_json_file = project_path / "package.json"
        frameworks: List[str] = []
        manifests = [m for m in self.MANIFESTS if (project_path / m).exists()]

        # Package manager detection
        pm = "npm"
        if (project_path / "yarn.lock").exists():
            pm = "yarn"
            frameworks.append("Yarn")
        elif (project_path / "pnpm-lock.yaml").exists():
            pm = "pnpm"
            frameworks.append("pnpm")

        if (project_path / "tsconfig.json").exists():
            frameworks.append("TypeScript")

        scripts: dict = {}
        all_deps: dict = {}

        if pkg_json_file.exists():
            try:
                data = json.loads(pkg_json_file.read_text(encoding="utf-8"))
                dev_deps = data.get("devDependencies", {}) or {}
                deps = data.get("dependencies", {}) or {}
                all_deps = {**deps, **dev_deps}
                scripts = data.get("scripts", {}) or {}
            except Exception:
                pass

        # Framework detection from deps
        if "jest" in all_deps:
            frameworks.append("Jest")
        elif "vitest" in all_deps:
            frameworks.append("Vitest")
        elif "mocha" in all_deps:
            frameworks.append("Mocha")
        elif "playwright" in all_deps:
            frameworks.append("Playwright")
        elif "cypress" in all_deps:
            frameworks.append("Cypress")

        # 1. Discover existing test script
        test_script_name: Optional[str] = None
        for candidate in ["test", "test:unit", "test:ci", "test:all", "test:run", "test:spec", "test:coverage"]:
            if candidate in scripts:
                test_script_name = candidate
                break

        # Fallback to any script containing "test" (excluding watch-only scripts)
        if not test_script_name:
            for s in scripts:
                if "test" in s.lower() and "watch" not in s.lower():
                    test_script_name = s
                    break

        test_framework: Optional[str] = None
        test_command: Optional[str] = None

        if test_script_name:
            # Format appropriate test command based on package manager
            if pm == "yarn":
                test_command = "yarn test" if test_script_name == "test" else f"yarn run {test_script_name}"
            elif pm == "pnpm":
                test_command = "pnpm test" if test_script_name == "test" else f"pnpm run {test_script_name}"
            else:
                test_command = "npm test" if test_script_name == "test" else f"npm run {test_script_name}"

            detected_fw = next((f for f in ["Vitest", "Jest", "Mocha", "Playwright", "Cypress"] if f in frameworks), None)
            test_framework = detected_fw or f"npm ({test_script_name})"
        else:
            # 2. If no test script exists, check for supported validation commands (type-check, lint, build)
            validation_script: Optional[str] = None
            validation_type: Optional[str] = None

            # Priority 1: Type-checking
            for candidate in ["typecheck", "type-check", "check-types", "tsc"]:
                if candidate in scripts:
                    validation_script = candidate
                    validation_type = "TypeScript Type-Check"
                    break

            # Priority 2: Linting
            if not validation_script:
                for candidate in ["lint", "lint:check", "check"]:
                    if candidate in scripts:
                        validation_script = candidate
                        validation_type = "Linter Validation"
                        break

            # Priority 3: Build verification
            if not validation_script and "build" in scripts:
                validation_script = "build"
                validation_type = "Build Verification"

            if validation_script:
                if pm == "yarn":
                    test_command = f"yarn run {validation_script}"
                elif pm == "pnpm":
                    test_command = f"pnpm run {validation_script}"
                else:
                    test_command = f"npm run {validation_script}"
                # Explicitly do NOT label validation scripts as tests
                test_framework = validation_type

        can_run = bool(test_command)
        notes = (
            f"Configured with {test_command}."
            if can_run
            else "No test or validation script found in package.json."
        )

        dep_cmd = f"{pm} install"

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
                can_run_tests=can_run,
                isolation_mode="DOCKER",
                notes=notes,
            ),
        )

    def select_baseline_checks(self, project_path: Path) -> List[str]:
        report = self.inspect_project(project_path)
        return [report.test_command] if report.test_command else []

    def get_docker_image(self) -> str:
        return "node:20-slim"

    def get_setup_command(self, project_path: Path) -> Optional[str]:
        """Return setup command to install dependencies in sandbox."""
        if (project_path / "package-lock.json").exists():
            return "npm ci --prefer-offline || npm install"
        if (project_path / "yarn.lock").exists():
            return "yarn install --frozen-lockfile || yarn install"
        if (project_path / "pnpm-lock.yaml").exists():
            return "pnpm install"
        if (project_path / "package.json").exists():
            return "npm install"
        return None
