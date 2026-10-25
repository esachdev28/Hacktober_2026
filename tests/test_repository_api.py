"""Comprehensive regression tests for the Public GitHub Mode API contract.

Test matrix:
  1. Security — URL injection rejects embedded credentials, non-GitHub hosts, SSH, SSRF
  2. Intake contract — successful clone returns all required response fields
  3. Baseline output — output_excerpt captures stdout+stderr; evidence_count reported correctly
  4. Docker unavailability — baseline returns DOCKER_UNAVAILABLE; verify returns INCONCLUSIVE
  5. Empty/placeholder diff — verify-patch returns REJECTED without touching filesystem
  6. AI success — diagnosis returns real non-empty diff with is_ai_generated=True
  7. Auth failure — inference error returns REFERENCE_FALLBACK with empty diff
  8. Verified only when exit_code==0 — never fabricate recovery
  9. Response contract — Pydantic model validation confirms field names match exactly
 10. Publish guardrails — main/master forbidden; empty token rejected

Tests mock at the exact seam that exercises the route+schema contract without requiring
Docker, real git, or a live inference API.
"""
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.adapters.base import ExecutionResult, InspectionReport, AdapterCapability
from app.sandbox.docker_runner import DockerUnavailableError

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# Shared test helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_execution_result(exit_code: int, stdout: str = "", stderr: str = "") -> ExecutionResult:
    return ExecutionResult(
        exit_code=exit_code, stdout=stdout, stderr=stderr,
        duration_ms=1234, command="pytest -v",
    )


def _make_inspection_report(can_run_tests: bool = True) -> InspectionReport:
    return InspectionReport(
        language="Python", frameworks=["pytest"],
        manifest_files=["pyproject.toml"],
        test_framework="pytest", test_command="pytest -v",
        capabilities=AdapterCapability(
            language="Python", can_detect=True, can_prepare_deps=True,
            can_run_tests=can_run_tests, isolation_mode="DOCKER",
        ),
    )


def _mock_adapter(can_run_tests: bool = True) -> MagicMock:
    adapter = MagicMock()
    adapter.get_docker_image.return_value = "python:3.11-slim"
    adapter.inspect_project.return_value = _make_inspection_report(can_run_tests)
    return adapter


def _intake(repo_url: str = "https://github.com/test-org/test-repo", tmp_path: Path = None) -> int:
    """Create an experiment via intake with a mocked clone."""
    fake_repo = (tmp_path or Path("/tmp")) / "fake_repo"
    fake_repo.mkdir(parents=True, exist_ok=True)
    (fake_repo / "pyproject.toml").write_text('[project]\nname="t"\n')

    with patch("app.services.git_service.GitService.clone_repository",
               return_value=(fake_repo, "main", "deadcafe01")):
        res = client.post("/api/repository/intake", json={"repo_url": repo_url})
    assert res.status_code == 200, f"intake failed: {res.text}"
    return res.json()["experiment_id"]


# ─────────────────────────────────────────────────────────────────────────────
# 1. Security: URL validation
# ─────────────────────────────────────────────────────────────────────────────

class TestUrlSecurity:
    def test_rejects_embedded_credentials(self):
        res = client.post("/api/repository/intake", json={
            "repo_url": "https://user:pass@github.com/owner/repo"})
        assert res.status_code == 400
        assert "embedded" in res.json()["detail"].lower()

    def test_rejects_non_github_host(self):
        res = client.post("/api/repository/intake", json={
            "repo_url": "https://gitlab.com/owner/repo"})
        assert res.status_code == 400
        assert "not supported" in res.json()["detail"].lower()

    def test_rejects_ssh_url(self):
        res = client.post("/api/repository/intake", json={
            "repo_url": "git@github.com:owner/repo.git"})
        assert res.status_code == 400

    def test_rejects_localhost_ssrf(self):
        res = client.post("/api/repository/intake", json={
            "repo_url": "https://localhost/owner/repo"})
        assert res.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# 2. Intake contract
# ─────────────────────────────────────────────────────────────────────────────

class TestIntakeContract:
    def test_intake_returns_contract_fields(self, tmp_path):
        fake_repo = tmp_path / "fake"
        fake_repo.mkdir()
        (fake_repo / "pyproject.toml").write_text('[project]\nname="mock"\n')
        (fake_repo / "tests").mkdir()
        (fake_repo / "tests" / "test_ok.py").write_text("def test(): pass\n")

        with patch("app.services.git_service.GitService.clone_repository",
                   return_value=(fake_repo, "main", "abc1234567")):
            res = client.post("/api/repository/intake", json={
                "repo_url": "https://github.com/mock-org/mock-project"})

        assert res.status_code == 200, res.text
        data = res.json()
        for key in ("experiment_id", "owner", "name", "default_branch",
                    "base_commit_sha", "primary_language", "capabilities", "status"):
            assert key in data, f"Missing field: {key}"
        assert data["owner"] == "mock-org"
        assert data["name"] == "mock-project"
        assert data["base_commit_sha"] == "abc1234567"
        assert data["capabilities"]["can_run_tests"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 3 & 4. Baseline: output_excerpt and evidence_count
#         Tests mock RepositoryOrchestrator.run_baseline_checks so they test the
#         route contract and schema validation — not filesystem/Docker dependencies.
# ─────────────────────────────────────────────────────────────────────────────

class TestBaselineOutputCapture:

    BASELINE_PASSED = {
        "experiment_id": 1,
        "baseline_status": "BASELINE_PASSED",
        "exit_code": 0,
        "test_command": "pytest -v",
        "duration_ms": 1234,
        "output_excerpt": "PASSED test_foo\nPASSED test_bar\n2 passed in 0.1s",
        "evidence_count": 2,
        "failing_tests": [],
        "message": "Baseline checks passed cleanly.",
    }

    BASELINE_FAILED = {
        "experiment_id": 1,
        "baseline_status": "FAILURE_REPRODUCED",
        "exit_code": 1,
        "test_command": "pytest -v",
        "duration_ms": 1234,
        "output_excerpt": "--- STDERR ---\nERROR: ModuleNotFoundError: No module named 'myapp'",
        "evidence_count": 1,
        "failing_tests": [],
        "message": "Baseline test failure reproduced (exit code 1).",
    }

    BASELINE_NO_OUTPUT = {
        "experiment_id": 1,
        "baseline_status": "FAILURE_REPRODUCED",
        "exit_code": 1,
        "test_command": "pytest -v",
        "duration_ms": 1234,
        "output_excerpt": "[No output captured. Exit code: 1]\nTest command: pytest -v",
        "evidence_count": 1,
        "failing_tests": [],
        "message": "Baseline test failure reproduced (exit code 1).",
    }

    BASELINE_DOCKER_UNAVAILABLE = {
        "experiment_id": 1,
        "baseline_status": "DOCKER_UNAVAILABLE",
        "exit_code": 1,
        "test_command": "pytest -v",
        "duration_ms": 0,
        "output_excerpt": "Docker daemon not reachable",
        "evidence_count": 0,
        "failing_tests": [],
        "message": "Docker daemon not reachable",
    }

    BASELINE_NO_TEST_COMMAND = {
        "experiment_id": 1,
        "baseline_status": "NO_TEST_COMMAND",
        "exit_code": -1,
        "test_command": "NONE",
        "duration_ms": 0,
        "output_excerpt": "No test or validation script found for JavaScript/TypeScript project (No test script).",
        "evidence_count": 0,
        "failing_tests": [],
        "message": "No test or validation script found for JavaScript/TypeScript project (No test script).",
    }

    BASELINE_MISSING_TEST_SCRIPT = {
        "experiment_id": 1,
        "baseline_status": "MISSING_TEST_SCRIPT",
        "exit_code": 1,
        "test_command": "npm test",
        "duration_ms": 350,
        "output_excerpt": "npm error Missing script: \"test\"",
        "evidence_count": 1,
        "failing_tests": [],
        "message": "Test script is missing in package configuration (exit code 1).",
    }

    BASELINE_MISSING_TEST_RUNNER = {
        "experiment_id": 1,
        "baseline_status": "MISSING_TEST_RUNNER",
        "exit_code": 127,
        "test_command": "pytest -v",
        "duration_ms": 400,
        "output_excerpt": "sh: 1: pytest: not found",
        "evidence_count": 1,
        "failing_tests": [],
        "message": "Test runner executable not found in sandbox (exit code 127).",
    }

    BASELINE_SETUP_FAILED = {
        "experiment_id": 1,
        "baseline_status": "SETUP_FAILED",
        "exit_code": 1,
        "test_command": "npm install",
        "duration_ms": 1500,
        "output_excerpt": "npm ERR! code ERESOLVE",
        "evidence_count": 1,
        "failing_tests": [],
        "message": "Sandbox dependency setup failed (exit code 1).",
    }

    def _run(self, exp_id: int, mock_return: dict):
        """Call run-baseline with orchestrator mocked at its class method."""
        result = dict(mock_return)
        result["experiment_id"] = exp_id
        with patch("app.services.repository_orchestrator.RepositoryOrchestrator.run_baseline_checks",
                   return_value=result):
            return client.post("/api/repository/run-baseline", json={"experiment_id": exp_id})

    def test_output_excerpt_populated_from_stdout(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/baseline-repo", tmp_path)
        res = self._run(exp_id, self.BASELINE_PASSED)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["baseline_status"] == "BASELINE_PASSED"
        assert data["exit_code"] == 0
        assert data["duration_ms"] == 1234
        assert "PASSED" in data["output_excerpt"]
        assert data["evidence_count"] >= 1

    def test_output_excerpt_populated_from_stderr_when_no_stdout(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/baseline-stderr", tmp_path)
        res = self._run(exp_id, self.BASELINE_FAILED)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["baseline_status"] == "FAILURE_REPRODUCED"
        assert data["exit_code"] == 1
        # Must show actual error, not "No output recorded"
        assert data["output_excerpt"] != ""
        assert "ModuleNotFoundError" in data["output_excerpt"] or "STDERR" in data["output_excerpt"]

    def test_fallback_message_when_no_output_at_all(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/baseline-noout", tmp_path)
        res = self._run(exp_id, self.BASELINE_NO_OUTPUT)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["output_excerpt"], "output_excerpt must never be empty"
        assert "No output" in data["output_excerpt"] or "Exit code" in data["output_excerpt"]

    def test_docker_unavailable_returns_docker_unavailable_status(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/baseline-docker", tmp_path)
        res = self._run(exp_id, self.BASELINE_DOCKER_UNAVAILABLE)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["baseline_status"] == "DOCKER_UNAVAILABLE"
        assert data["exit_code"] == 1
        assert data["output_excerpt"] != ""
        assert data["evidence_count"] == 0

    def test_no_test_command_returns_valid_baseline_response(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/baseline-no-cmd", tmp_path)
        res = self._run(exp_id, self.BASELINE_NO_TEST_COMMAND)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["baseline_status"] == "NO_TEST_COMMAND"
        assert data["exit_code"] == -1
        assert "No test or validation script found" in data["output_excerpt"]

    def test_missing_test_script_returns_valid_baseline_response(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/baseline-missing-script", tmp_path)
        res = self._run(exp_id, self.BASELINE_MISSING_TEST_SCRIPT)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["baseline_status"] == "MISSING_TEST_SCRIPT"
        assert data["exit_code"] == 1
        assert "Missing script" in data["output_excerpt"]

    def test_missing_test_runner_returns_valid_baseline_response(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/baseline-missing-runner", tmp_path)
        res = self._run(exp_id, self.BASELINE_MISSING_TEST_RUNNER)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["baseline_status"] == "MISSING_TEST_RUNNER"
        assert data["exit_code"] == 127
        assert "pytest: not found" in data["output_excerpt"]

    def test_setup_failed_returns_valid_baseline_response(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/baseline-setup-fail", tmp_path)
        res = self._run(exp_id, self.BASELINE_SETUP_FAILED)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["baseline_status"] == "SETUP_FAILED"
        assert data["exit_code"] == 1
        assert "ERESOLVE" in data["output_excerpt"]

    def test_nonexistent_experiment_returns_404(self):
        res = client.post("/api/repository/run-baseline", json={"experiment_id": 999999})
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# 5. Empty / placeholder diff rejection
# ─────────────────────────────────────────────────────────────────────────────

class TestPatchRejection:

    def test_rejects_empty_diff(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/patch-empty", tmp_path)
        res = client.post("/api/repository/verify-patch", json={
            "experiment_id": exp_id, "patch_diff": ""})
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["verification_status"] == "REJECTED"
        assert data["patch_valid"] is False

    def test_rejects_placeholder_diff(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/patch-placeholder", tmp_path)
        res = client.post("/api/repository/verify-patch", json={
            "experiment_id": exp_id,
            "patch_diff": "# Proposed candidate patch diff",
        })
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["verification_status"] == "REJECTED"
        assert data["patch_valid"] is False


# ─────────────────────────────────────────────────────────────────────────────
# 6 & 7. AI diagnosis
# ─────────────────────────────────────────────────────────────────────────────

class TestProviderSuccess:

    def test_diagnosis_returns_real_diff_when_provider_succeeds(self, tmp_path):
        from app.providers.base import ModelDiagnosisResult
        exp_id = _intake("https://github.com/test-org/ai-repo", tmp_path)

        fake_diagnosis = ModelDiagnosisResult(
            title="KeyError in config loader",
            root_cause="DATABASE_URL accessed with os.environ[] which raises on missing key",
            confidence=0.93,
            cited_evidence_ids=[],
            proposed_patch_diff=(
                "--- a/app/config.py\n+++ b/app/config.py\n"
                "@@ -1,3 +1,3 @@\n import os\n"
                "-DB = os.environ['DATABASE_URL']\n"
                "+DB = os.environ.get('DATABASE_URL', 'sqlite:///./default.db')\n"
            ),
            explanation="Using .get() prevents KeyError on missing env var",
            risk_summary="Low risk",
            is_ai_generated=True,
            provider="nvidia-nim-minimax",
            raw_response="{}",
        )

        from app.core.config import settings as _settings

        with patch("app.api.routes.repository.get_inference_provider") as mock_factory:
            mock_provider = MagicMock()
            mock_provider.generate_diagnosis_and_patch.return_value = fake_diagnosis
            mock_factory.return_value = mock_provider

            res = client.post(f"/api/repository/diagnose-and-patch?experiment_id={exp_id}")

        assert res.status_code == 200, res.text
        data = res.json()
        assert data["is_ai_generated"] is True
        diff = data["proposed_patch_diff"]
        assert diff.strip(), "proposed_patch_diff must not be empty"
        assert not (diff.strip().startswith("#") and len(diff.strip()) < 80), \
            "diff must not be a short placeholder comment"
        assert any(marker in diff for marker in ("---", "@@", "+")), \
            "diff must look like a unified diff"


    def test_diagnosis_returns_model_error_on_auth_failure(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/fallback-repo", tmp_path)

        with patch("app.api.routes.repository.get_inference_provider") as mock_factory:
            mock_provider = MagicMock()
            mock_provider.generate_diagnosis_and_patch.side_effect = RuntimeError(
                "MODEL_UNAVAILABLE: NVIDIA NIM authentication failed"
            )
            mock_factory.return_value = mock_provider

            res = client.post(f"/api/repository/diagnose-and-patch?experiment_id={exp_id}")

        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "MODEL_UNAVAILABLE"
        assert data["is_ai_generated"] is False
        assert not data.get("proposed_patch_diff", "").strip(), \
            "Model error must return empty diff — never a fabricated one"


# ─────────────────────────────────────────────────────────────────────────────
# 8. Verification INCONCLUSIVE + VERIFIED only on exit_code==0
#    Tests mock RepositoryOrchestrator.apply_and_verify_patch to test route contract.
# ─────────────────────────────────────────────────────────────────────────────

class TestVerificationInconclusive:

    VALID_DIFF = (
        "--- a/app.py\n+++ b/app.py\n"
        "@@ -1,2 +1,2 @@\n"
        "-URL = os.environ['DB']\n"
        "+URL = os.environ.get('DB', 'sqlite:///./d.db')\n"
    )

    def test_returns_inconclusive_when_docker_unavailable(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/inconclusive-repo", tmp_path)
        mock_result = {
            "experiment_id": exp_id,
            "verification_status": "INCONCLUSIVE",
            "patch_valid": True,
            "target_failure_resolved": False,
            "regressions_detected": False,
            "exit_code": -1,
            "duration_ms": 12,
            "test_output_excerpt": (
                "INCONCLUSIVE: Docker daemon is unavailable — post-patch tests did not execute. "
                "Docker error: Docker daemon not running"
            ),
            "summary": "Verification INCONCLUSIVE: no independent tests ran.",
        }
        with patch(
            "app.services.repository_orchestrator.RepositoryOrchestrator.apply_and_verify_patch",
            return_value=mock_result,
        ):
            res = client.post("/api/repository/verify-patch", json={
                "experiment_id": exp_id, "patch_diff": self.VALID_DIFF})

        assert res.status_code == 200, res.text
        data = res.json()
        assert data["verification_status"] == "INCONCLUSIVE"
        assert data["target_failure_resolved"] is False
        assert "INCONCLUSIVE" in data["test_output_excerpt"] or "Docker" in data["test_output_excerpt"]

    def test_verified_only_when_tests_actually_pass(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/verified-repo", tmp_path)
        mock_result = {
            "experiment_id": exp_id,
            "verification_status": "VERIFIED",
            "patch_valid": True,
            "target_failure_resolved": True,
            "regressions_detected": False,
            "exit_code": 0,
            "duration_ms": 1234,
            "test_output_excerpt": "1 passed in 0.1s",
            "summary": "Independent verification PASSED.",
        }
        with patch(
            "app.services.repository_orchestrator.RepositoryOrchestrator.apply_and_verify_patch",
            return_value=mock_result,
        ):
            res = client.post("/api/repository/verify-patch", json={
                "experiment_id": exp_id, "patch_diff": self.VALID_DIFF})

        assert res.status_code == 200, res.text
        data = res.json()
        assert data["verification_status"] == "VERIFIED"
        assert data["target_failure_resolved"] is True
        assert data["exit_code"] == 0
        assert "passed" in data["test_output_excerpt"].lower()

    def test_failed_when_tests_fail(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/failed-repo", tmp_path)
        mock_result = {
            "experiment_id": exp_id,
            "verification_status": "FAILED",
            "patch_valid": True,
            "target_failure_resolved": False,
            "regressions_detected": False,
            "exit_code": 1,
            "duration_ms": 999,
            "test_output_excerpt": "1 failed: AssertionError",
            "summary": "Verification FAILED.",
        }
        with patch(
            "app.services.repository_orchestrator.RepositoryOrchestrator.apply_and_verify_patch",
            return_value=mock_result,
        ):
            res = client.post("/api/repository/verify-patch", json={
                "experiment_id": exp_id, "patch_diff": self.VALID_DIFF})

        assert res.status_code == 200, res.text
        data = res.json()
        assert data["verification_status"] == "FAILED"
        assert data["target_failure_resolved"] is False
        assert data["exit_code"] == 1


# ─────────────────────────────────────────────────────────────────────────────
# 9. Response contract: Pydantic model validates every field
# ─────────────────────────────────────────────────────────────────────────────

class TestResponseContract:

    def test_baseline_response_pydantic_validation(self, tmp_path):
        from app.schemas.repository import RepoBaselineResponse
        exp_id = _intake("https://github.com/test-org/schema-baseline", tmp_path)

        mock_result = {
            "experiment_id": exp_id,
            "baseline_status": "FAILURE_REPRODUCED",
            "exit_code": 1,
            "test_command": "pytest -v",
            "duration_ms": 5678,
            "output_excerpt": "FAILED test_thing - AssertionError\n--- STDERR ---\nTraceback...",
            "evidence_count": 3,
            "failing_tests": [],
            "message": "Failure reproduced.",
        }
        with patch("app.services.repository_orchestrator.RepositoryOrchestrator.run_baseline_checks",
                   return_value=mock_result):
            res = client.post("/api/repository/run-baseline", json={"experiment_id": exp_id})

        assert res.status_code == 200, res.text
        data = res.json()
        # Pydantic raises ValidationError if contract is broken
        parsed = RepoBaselineResponse(**data)
        assert parsed.baseline_status == "FAILURE_REPRODUCED"
        assert parsed.exit_code == 1
        assert parsed.output_excerpt  # non-empty
        assert parsed.evidence_count == 3
        assert isinstance(parsed.failing_tests, list)

    def test_verify_response_pydantic_validation(self, tmp_path):
        from app.schemas.repository import RepoPatchVerifyResponse
        exp_id = _intake("https://github.com/test-org/schema-verify", tmp_path)

        # Empty diff → REJECTED (inline, no orchestrator needed)
        res = client.post("/api/repository/verify-patch", json={
            "experiment_id": exp_id, "patch_diff": ""})
        assert res.status_code == 200, res.text
        data = res.json()
        parsed = RepoPatchVerifyResponse(**data)
        assert parsed.verification_status == "REJECTED"
        assert parsed.patch_valid is False
        assert parsed.target_failure_resolved is False

    def test_publish_branch_guardrails(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/pub-repo", tmp_path)

        # Forbidden branch
        res_main = client.post("/api/repository/publish-branch", json={
            "experiment_id": exp_id, "github_token": "ghp_mock", "branch_name": "main"})
        assert res_main.status_code == 200
        assert res_main.json()["status"] == "FORBIDDEN_BRANCH"

        # No token
        res_no_tok = client.post("/api/repository/publish-branch", json={
            "experiment_id": exp_id, "github_token": "",
            "branch_name": f"chaospatch/repair-{exp_id}"})
        assert res_no_tok.status_code == 200
        assert res_no_tok.json()["status"] == "PUBLISH_AUTH_REQUIRED"

    def test_export_patch_returns_text_diff(self, tmp_path):
        exp_id = _intake("https://github.com/test-org/export-repo", tmp_path)
        res = client.get(f"/api/repository/export-patch/{exp_id}")
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/x-diff")
        assert "CHAOSPATCH" in res.text

    def test_baseline_response_contract_fields_and_defensive_compatibility(self, tmp_path):
        """Regression test ensuring baseline returns all fields required by StatusIndicator and TerminalPanel."""
        from app.schemas.repository import RepoBaselineResponse
        exp_id = _intake("https://github.com/test-org/baseline-contract-repo", tmp_path)

        with patch("app.services.repository_orchestrator.RepositoryOrchestrator.run_baseline_checks") as mock_run:
            mock_run.return_value = {
                "experiment_id": exp_id,
                "baseline_status": "FAILURE_REPRODUCED",
                "exit_code": 1,
                "test_command": "pytest -v",
                "duration_ms": 1200,
                "output_excerpt": "FAILED tests/test_core.py::test_fail - AssertionError",
                "evidence_count": 2,
                "failing_tests": ["test_fail"],
                "message": "Failure reproduced",
            }
            res = client.post("/api/repository/run-baseline", json={"experiment_id": exp_id})
            assert res.status_code == 200, res.text
            data = res.json()
            assert "baseline_status" in data
            assert data["baseline_status"] == "FAILURE_REPRODUCED"
            assert "output_excerpt" in data
            assert data["output_excerpt"] != ""
            assert "evidence_count" in data
            assert isinstance(data["evidence_count"], int)
            # Must satisfy Pydantic schema strictly
            validated = RepoBaselineResponse(**data)
            assert validated.baseline_status == "FAILURE_REPRODUCED"

