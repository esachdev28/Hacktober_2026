"""Comprehensive tests for DockerExecutionRunner: availability probing, unavailable daemon,
DOCKER_HOST override, diagnosis structure, and execution failure paths."""
import os
import subprocess
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.sandbox.docker_runner import (
    DockerExecutionRunner,
    DockerUnavailableError,
    DockerAvailabilityDiagnosis,
    DOCKER_UNAVAILABLE_RENDER_HINT,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_completed(returncode: int, stdout: str = "", stderr: str = "") -> MagicMock:
    m = MagicMock()
    m.returncode = returncode
    m.stdout = stdout
    m.stderr = stderr
    return m


# ---------------------------------------------------------------------------
# DockerAvailabilityDiagnosis
# ---------------------------------------------------------------------------

class TestDockerAvailabilityDiagnosis:
    def test_to_dict_available(self):
        diag = DockerAvailabilityDiagnosis(
            available=True,
            docker_binary="/usr/bin/docker",
            docker_host=None,
            error=None,
            returncode=0,
        )
        d = diag.to_dict()
        assert d["available"] is True
        assert d["error"] is None
        assert "default (unix socket)" in d["docker_host"]

    def test_to_dict_unavailable_with_docker_host(self):
        diag = DockerAvailabilityDiagnosis(
            available=False,
            docker_binary="/usr/bin/docker",
            docker_host="tcp://sidecar:2375",
            error="connection refused",
            returncode=1,
        )
        d = diag.to_dict()
        assert d["available"] is False
        assert d["docker_host"] == "tcp://sidecar:2375"
        assert "refused" in d["error"]

    def test_to_dict_no_binary(self):
        diag = DockerAvailabilityDiagnosis(
            available=False,
            docker_binary=None,
            docker_host=None,
            error="not found in PATH",
            returncode=None,
        )
        d = diag.to_dict()
        assert d["docker_binary"] is None


# ---------------------------------------------------------------------------
# diagnose() — binary missing
# ---------------------------------------------------------------------------

class TestDiagnoseNoBinary:
    def test_no_docker_binary_returns_unavailable(self):
        with patch("shutil.which", return_value=None):
            diag = DockerExecutionRunner.diagnose()
        assert diag.available is False
        assert diag.docker_binary is None
        assert diag.error is not None
        assert "PATH" in diag.error

    def test_is_docker_available_false_when_no_binary(self):
        with patch("shutil.which", return_value=None):
            result = DockerExecutionRunner.is_docker_available()
        assert result is False


# ---------------------------------------------------------------------------
# diagnose() — binary present, daemon unreachable
# ---------------------------------------------------------------------------

class TestDiagnoseDaemonUnreachable:
    def test_docker_info_non_zero_returns_unavailable(self):
        with patch("shutil.which", return_value="/usr/bin/docker"), \
             patch("subprocess.run", return_value=_mock_completed(
                 returncode=1,
                 stderr="Cannot connect to the Docker daemon at unix:///var/run/docker.sock"
             )):
            diag = DockerExecutionRunner.diagnose()
        assert diag.available is False
        assert diag.returncode == 1
        assert "unix://" in diag.error or "connect" in diag.error

    def test_docker_info_timeout_returns_unavailable(self):
        with patch("shutil.which", return_value="/usr/bin/docker"), \
             patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd="docker", timeout=5)):
            diag = DockerExecutionRunner.diagnose()
        assert diag.available is False
        assert "timed out" in diag.error.lower()

    def test_docker_info_unexpected_exception_returns_unavailable(self):
        with patch("shutil.which", return_value="/usr/bin/docker"), \
             patch("subprocess.run", side_effect=OSError("permission denied")):
            diag = DockerExecutionRunner.diagnose()
        assert diag.available is False
        assert "permission denied" in diag.error.lower()


# ---------------------------------------------------------------------------
# diagnose() — DOCKER_HOST env var respected
# ---------------------------------------------------------------------------

class TestDiagnoseDockerHostEnv:
    def test_docker_host_env_passed_to_subprocess(self):
        """When DOCKER_HOST is set, diagnose() must still run docker info (via subprocess env)."""
        with patch("shutil.which", return_value="/usr/bin/docker"), \
             patch.dict(os.environ, {"DOCKER_HOST": "tcp://remote:2375"}), \
             patch("subprocess.run", return_value=_mock_completed(returncode=0)) as mock_run:
            diag = DockerExecutionRunner.diagnose()
        assert diag.available is True
        assert diag.docker_host == "tcp://remote:2375"
        # subprocess.run should have been called with the env that contains DOCKER_HOST
        call_env = mock_run.call_args.kwargs.get("env") or mock_run.call_args[1].get("env")
        assert call_env is not None
        assert call_env.get("DOCKER_HOST") == "tcp://remote:2375"

    def test_docker_host_env_unavailable_sidecar(self):
        """A configured DOCKER_HOST that is unreachable still returns available=False."""
        with patch("shutil.which", return_value="/usr/bin/docker"), \
             patch.dict(os.environ, {"DOCKER_HOST": "tcp://sidecar:2375"}), \
             patch("subprocess.run", return_value=_mock_completed(
                 returncode=1, stderr="connection refused"
             )):
            diag = DockerExecutionRunner.diagnose()
        assert diag.available is False
        assert diag.docker_host == "tcp://sidecar:2375"


# ---------------------------------------------------------------------------
# diagnose() — daemon available
# ---------------------------------------------------------------------------

class TestDiagnoseDaemonAvailable:
    def test_docker_info_zero_returns_available(self):
        with patch("shutil.which", return_value="/usr/bin/docker"), \
             patch("subprocess.run", return_value=_mock_completed(returncode=0, stdout="Server: Docker")):
            diag = DockerExecutionRunner.diagnose()
        assert diag.available is True
        assert diag.docker_binary == "/usr/bin/docker"
        assert diag.error is None

    def test_is_docker_available_true_when_daemon_ok(self):
        with patch("shutil.which", return_value="/usr/bin/docker"), \
             patch("subprocess.run", return_value=_mock_completed(returncode=0)):
            result = DockerExecutionRunner.is_docker_available()
        assert result is True


# ---------------------------------------------------------------------------
# run_in_container() — refuses when Docker unavailable
# ---------------------------------------------------------------------------

class TestRunInContainerUnavailable:
    def test_raises_docker_unavailable_error(self):
        with patch.object(DockerExecutionRunner, "diagnose") as mock_diag:
            mock_diag.return_value = DockerAvailabilityDiagnosis(
                available=False,
                docker_binary=None,
                docker_host=None,
                error="no binary",
                returncode=None,
            )
            with pytest.raises(DockerUnavailableError) as exc_info:
                DockerExecutionRunner.run_in_container(
                    workspace_dir=Path("/tmp"),
                    command="pytest",
                )
        assert "DOCKER_UNAVAILABLE" in str(exc_info.value)
        assert "refuses to execute arbitrary repository scripts directly on the host" in str(exc_info.value)

    def test_error_message_includes_render_hint(self):
        """The error message must include the Render-specific hint so operators know what to do."""
        with patch.object(DockerExecutionRunner, "diagnose") as mock_diag:
            mock_diag.return_value = DockerAvailabilityDiagnosis(
                available=False,
                docker_binary="/usr/bin/docker",
                docker_host=None,
                error="daemon not reachable",
                returncode=1,
            )
            with pytest.raises(DockerUnavailableError) as exc_info:
                DockerExecutionRunner.run_in_container(
                    workspace_dir=Path("/tmp"),
                    command="pytest",
                )
        assert "Render" in str(exc_info.value) or "DOCKER_HOST" in str(exc_info.value)

    def test_never_falls_back_to_host_execution(self):
        """If Docker is unavailable, no subprocess.run for the actual command must occur."""
        with patch.object(DockerExecutionRunner, "diagnose") as mock_diag, \
             patch("subprocess.run") as mock_sub:
            mock_diag.return_value = DockerAvailabilityDiagnosis(
                available=False,
                docker_binary=None,
                docker_host=None,
                error="no binary",
                returncode=None,
            )
            with pytest.raises(DockerUnavailableError):
                DockerExecutionRunner.run_in_container(
                    workspace_dir=Path("/tmp"),
                    command="rm -rf /",
                )
            # subprocess.run must NOT have been called with rm -rf
            for call in mock_sub.call_args_list:
                args = call[0][0] if call[0] else []
                assert "rm" not in args, "Host execution must never occur when Docker is unavailable"


# ---------------------------------------------------------------------------
# run_in_container() — security flags when Docker available
# ---------------------------------------------------------------------------

class TestRunInContainerSecurityFlags:
    def setup_method(self):
        self._diag_available = DockerAvailabilityDiagnosis(
            available=True,
            docker_binary="docker",
            docker_host=None,
            error=None,
            returncode=0,
        )

    def test_network_none_when_network_disabled(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", return_value=_mock_completed(0, "ok")) as mock_sub:
            DockerExecutionRunner.run_in_container(
                workspace_dir=Path("/tmp"),
                command="pytest -v",
                network_enabled=False,
            )
        args = mock_sub.call_args[0][0]
        assert "--network" in args
        assert "none" in args

    def test_memory_limit_enforced(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", return_value=_mock_completed(0, "ok")) as mock_sub:
            DockerExecutionRunner.run_in_container(workspace_dir=Path("/tmp"), command="echo x")
        args = mock_sub.call_args[0][0]
        assert "--memory" in args
        assert DockerExecutionRunner.MEMORY_LIMIT in args

    def test_pids_limit_enforced(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", return_value=_mock_completed(0, "ok")) as mock_sub:
            DockerExecutionRunner.run_in_container(workspace_dir=Path("/tmp"), command="echo x")
        args = mock_sub.call_args[0][0]
        assert "--pids-limit" in args
        assert DockerExecutionRunner.PIDS_LIMIT in args

    def test_cpus_limit_enforced(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", return_value=_mock_completed(0, "ok")) as mock_sub:
            DockerExecutionRunner.run_in_container(workspace_dir=Path("/tmp"), command="echo x")
        args = mock_sub.call_args[0][0]
        assert "--cpus" in args
        assert DockerExecutionRunner.CPUS_LIMIT in args

    def test_no_docker_socket_mount(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", return_value=_mock_completed(0, "ok")) as mock_sub:
            DockerExecutionRunner.run_in_container(workspace_dir=Path("/tmp"), command="echo x")
        args = mock_sub.call_args[0][0]
        cmd_str = " ".join(str(a) for a in args)
        assert "docker.sock" not in cmd_str, "Docker socket must never be mounted into the container"

    def test_network_enabled_does_not_add_none(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", return_value=_mock_completed(0, "ok")) as mock_sub:
            DockerExecutionRunner.run_in_container(
                workspace_dir=Path("/tmp"),
                command="pip install -r requirements.txt",
                network_enabled=True,
            )
        args = mock_sub.call_args[0][0]
        idx = args.index("--network") if "--network" in args else None
        if idx is not None:
            assert args[idx + 1] != "none", "network_enabled=True must not set --network none"


# ---------------------------------------------------------------------------
# run_in_container() — execution failure paths
# ---------------------------------------------------------------------------

class TestRunInContainerExecutionFailures:
    def setup_method(self):
        self._diag_available = DockerAvailabilityDiagnosis(
            available=True,
            docker_binary="docker",
            docker_host=None,
            error=None,
            returncode=0,
        )

    def test_timeout_returns_exit_code_124(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd="docker", timeout=10)):
            result = DockerExecutionRunner.run_in_container(
                workspace_dir=Path("/tmp"),
                command="sleep 9999",
                timeout_seconds=10,
            )
        assert result.exit_code == 124
        assert "timed out" in result.stderr.lower()
        assert result.duration_ms >= 0

    def test_nonzero_exit_reflects_container_failure(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", return_value=_mock_completed(
                 returncode=1, stderr="ModuleNotFoundError: No module named 'pytest'"
             )):
            result = DockerExecutionRunner.run_in_container(
                workspace_dir=Path("/tmp"),
                command="pytest -v",
            )
        assert result.exit_code == 1
        assert result.passed is False

    def test_zero_exit_passes(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", return_value=_mock_completed(
                 returncode=0, stdout="2 passed"
             )):
            result = DockerExecutionRunner.run_in_container(
                workspace_dir=Path("/tmp"),
                command="pytest -v",
            )
        assert result.exit_code == 0
        assert result.passed is True
        assert "passed" in result.stdout

    def test_os_error_returns_exit_code_1(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", side_effect=OSError("broken pipe")):
            result = DockerExecutionRunner.run_in_container(
                workspace_dir=Path("/tmp"),
                command="pytest -v",
            )
        assert result.exit_code == 1
        assert "broken pipe" in result.stderr.lower()

    def test_execution_result_has_command_field(self):
        with patch.object(DockerExecutionRunner, "diagnose", return_value=self._diag_available), \
             patch("subprocess.run", return_value=_mock_completed(0, "ok")):
            result = DockerExecutionRunner.run_in_container(
                workspace_dir=Path("/tmp"),
                command="echo hello",
            )
        assert result.command == "echo hello"


# ---------------------------------------------------------------------------
# Integration: real Docker availability check (skipped if Docker absent)
# ---------------------------------------------------------------------------

class TestRealDockerAvailability:
    def test_diagnose_returns_diagnosis_object(self):
        """diagnose() always returns a DockerAvailabilityDiagnosis regardless of daemon state."""
        diag = DockerExecutionRunner.diagnose()
        assert isinstance(diag, DockerAvailabilityDiagnosis)
        assert isinstance(diag.available, bool)

    @pytest.mark.skipif(
        not DockerExecutionRunner.is_docker_available(),
        reason="Docker daemon not available in this environment (expected on Render/CI)"
    )
    def test_container_echo_when_docker_available(self, tmp_path):
        """When Docker is available, run a trivial container command and verify output."""
        result = DockerExecutionRunner.run_in_container(
            workspace_dir=tmp_path,
            command="echo CHAOSPATCH_SANDBOX_OK",
            image="python:3.11-slim",
            network_enabled=False,
            timeout_seconds=30,
        )
        assert result.exit_code == 0
        assert "CHAOSPATCH_SANDBOX_OK" in result.stdout
        assert result.passed is True

    def test_is_docker_available_returns_bool(self):
        result = DockerExecutionRunner.is_docker_available()
        assert isinstance(result, bool)
