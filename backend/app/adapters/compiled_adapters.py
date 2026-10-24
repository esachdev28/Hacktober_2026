"""Go, Rust, and Java project adapters with lightweight detection."""
from pathlib import Path
from typing import List
from app.adapters.base import ProjectAdapter, InspectionReport, AdapterCapability


class GoAdapter(ProjectAdapter):
    """Adapter for Go repositories."""

    language_name = "Go"

    def detect_project(self, project_path: Path) -> bool:
        return (project_path / "go.mod").exists() or any(project_path.glob("*.go"))

    def inspect_project(self, project_path: Path) -> InspectionReport:
        manifests = []
        if (project_path / "go.mod").exists():
            manifests.append("go.mod")
        if (project_path / "go.sum").exists():
            manifests.append("go.sum")

        return InspectionReport(
            language="Go",
            frameworks=["Go Modules"],
            manifest_files=manifests,
            test_framework="go test",
            test_command="go test -v ./...",
            dependencies_command="go mod download",
            capabilities=AdapterCapability(
                language="Go",
                can_detect=True,
                can_prepare_deps=True,
                can_run_tests=True,
                isolation_mode="DOCKER",
                notes="Supported for standard Go packages.",
            ),
        )

    def select_baseline_checks(self, project_path: Path) -> List[str]:
        return ["go test -v ./..."]

    def get_docker_image(self) -> str:
        return "golang:1.22-alpine"


class RustAdapter(ProjectAdapter):
    """Adapter for Rust repositories."""

    language_name = "Rust"

    def detect_project(self, project_path: Path) -> bool:
        return (project_path / "Cargo.toml").exists()

    def inspect_project(self, project_path: Path) -> InspectionReport:
        manifests = []
        if (project_path / "Cargo.toml").exists():
            manifests.append("Cargo.toml")
        if (project_path / "Cargo.lock").exists():
            manifests.append("Cargo.lock")

        return InspectionReport(
            language="Rust",
            frameworks=["Cargo"],
            manifest_files=manifests,
            test_framework="cargo test",
            test_command="cargo test",
            dependencies_command="cargo fetch",
            capabilities=AdapterCapability(
                language="Rust",
                can_detect=True,
                can_prepare_deps=True,
                can_run_tests=True,
                isolation_mode="DOCKER",
                notes="Supported for Cargo workspaces.",
            ),
        )

    def select_baseline_checks(self, project_path: Path) -> List[str]:
        return ["cargo test"]

    def get_docker_image(self) -> str:
        return "rust:1.76-slim"


class JavaAdapter(ProjectAdapter):
    """Adapter for Java repositories (Maven, Gradle)."""

    language_name = "Java"

    def detect_project(self, project_path: Path) -> bool:
        return (
            (project_path / "pom.xml").exists() or
            (project_path / "build.gradle").exists() or
            (project_path / "build.gradle.kts").exists()
        )

    def inspect_project(self, project_path: Path) -> InspectionReport:
        manifests = []
        frameworks = []
        test_cmd = "mvn test"
        dep_cmd = "mvn dependency:resolve"

        if (project_path / "pom.xml").exists():
            manifests.append("pom.xml")
            frameworks.append("Maven")
            test_cmd = "mvn test"
        elif (project_path / "build.gradle").exists() or (project_path / "build.gradle.kts").exists():
            manifests.append("build.gradle")
            frameworks.append("Gradle")
            test_cmd = "./gradlew test"
            dep_cmd = "./gradlew dependencies"

        return InspectionReport(
            language="Java",
            frameworks=frameworks,
            manifest_files=manifests,
            test_framework="JUnit",
            test_command=test_cmd,
            dependencies_command=dep_cmd,
            capabilities=AdapterCapability(
                language="Java",
                can_detect=True,
                can_prepare_deps=True,
                can_run_tests=True,
                isolation_mode="DOCKER",
                notes="Supported for Maven/Gradle projects.",
            ),
        )

    def select_baseline_checks(self, project_path: Path) -> List[str]:
        report = self.inspect_project(project_path)
        return [report.test_command] if report.test_command else ["mvn test"]

    def get_docker_image(self) -> str:
        return "maven:3.9-eclipse-temurin-17"
