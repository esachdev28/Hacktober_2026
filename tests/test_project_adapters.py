"""Unit tests for modular project language adapters and monorepo detection."""
import tempfile
from pathlib import Path
from app.adapters.python_adapter import PythonAdapter
from app.adapters.node_adapter import NodeAdapter
from app.adapters.compiled_adapters import GoAdapter, RustAdapter, JavaAdapter
from app.adapters.detector import ProjectDetector, UnsupportedAdapter


def test_python_adapter_detection():
    """Verify PythonAdapter detects requirements.txt, pyproject.toml, pytest."""
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)
        (p / "requirements.txt").write_text("pytest\nrequests\n")
        (p / "tests").mkdir()
        (p / "tests" / "test_main.py").write_text("def test_ok(): pass\n")

        adapter = PythonAdapter()
        assert adapter.detect_project(p)
        report = adapter.inspect_project(p)
        assert report.language == "Python"
        assert "requirements.txt" in report.manifest_files
        assert report.test_framework == "pytest"
        assert report.capabilities.can_run_tests is True


def test_node_adapter_detection():
    """Verify NodeAdapter detects package.json and jest/vitest."""
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)
        (p / "package.json").write_text('{"name": "test-pkg", "scripts": {"test": "jest"}, "devDependencies": {"jest": "^29.0"}}')

        adapter = NodeAdapter()
        assert adapter.detect_project(p)
        report = adapter.inspect_project(p)
        assert report.language == "JavaScript/TypeScript"
        assert report.test_framework == "Jest"
        assert report.test_command == "npm test"


def test_compiled_adapters_detection():
    """Verify Go, Rust, and Java detection."""
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)

        # Go
        (p / "go.mod").write_text("module example.com/test\n")
        go_adapter = GoAdapter()
        assert go_adapter.detect_project(p)
        assert go_adapter.inspect_project(p).language == "Go"
        (p / "go.mod").unlink()

        # Rust
        (p / "Cargo.toml").write_text('[package]\nname = "test"\n')
        rust_adapter = RustAdapter()
        assert rust_adapter.detect_project(p)
        assert rust_adapter.inspect_project(p).language == "Rust"
        (p / "Cargo.toml").unlink()

        # Java
        (p / "pom.xml").write_text('<project></project>\n')
        java_adapter = JavaAdapter()
        assert java_adapter.detect_project(p)
        assert java_adapter.inspect_project(p).language == "Java"


def test_unsupported_adapter_safe_fallback():
    """Verify unknown language triggers UnsupportedAdapter with UNSUPPORTED_TEST_ENVIRONMENT."""
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)
        (p / "random_script.xyz").write_text("echo hello\n")

        adapter, report, roots = ProjectDetector.inspect(p)
        assert isinstance(adapter, UnsupportedAdapter)
        assert report.capabilities.can_run_tests is False
        assert "UNSUPPORTED_TEST_ENVIRONMENT" in (report.capabilities.notes or "")


def test_monorepo_detection():
    """Verify ProjectDetector identifies multiple distinct project roots."""
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)
        backend_dir = p / "backend"
        backend_dir.mkdir()
        (backend_dir / "requirements.txt").write_text("fastapi\n")

        frontend_dir = p / "frontend"
        frontend_dir.mkdir()
        (frontend_dir / "package.json").write_text('{"name": "ui"}')

        roots = ProjectDetector.detect_monorepo_roots(p)
        assert "/backend" in roots
        assert "/frontend" in roots
        assert len(roots) >= 2
