"""Unit tests for DockerExecutionRunner security boundaries."""
import pytest
from unittest.mock import patch
from pathlib import Path
from app.sandbox.docker_runner import DockerExecutionRunner, DockerUnavailableError


def test_docker_availability_detection():
    """Verify Docker availability detection runs cleanly."""
    is_avail = DockerExecutionRunner.is_docker_available()
    assert isinstance(is_avail, bool)


def test_docker_unavailable_raises_explicit_security_error():
    """Verify runner refuses to execute on host if Docker is unavailable."""
    with patch.object(DockerExecutionRunner, "is_docker_available", return_value=False):
        with pytest.raises(DockerUnavailableError) as exc_info:
            DockerExecutionRunner.run_in_container(
                workspace_dir=Path("/tmp"),
                command="pytest",
            )
        assert "DOCKER_UNAVAILABLE" in str(exc_info.value)
        assert "refuses to execute arbitrary repository scripts directly on the host" in str(exc_info.value)


def test_docker_security_arguments():
    """Verify constructed docker run command includes memory, CPU, PID and network none limits."""
    with patch.object(DockerExecutionRunner, "is_docker_available", return_value=True):
        with patch("subprocess.run") as mock_subproc:
            mock_subproc.return_value.returncode = 0
            mock_subproc.return_value.stdout = "OK"
            mock_subproc.return_value.stderr = ""

            res = DockerExecutionRunner.run_in_container(
                workspace_dir=Path("/tmp"),
                command="pytest -v",
                image="python:3.11-slim",
                network_enabled=False,
            )

            # Assert subprocess.run arguments
            call_args = mock_subproc.call_args[0][0]
            assert "docker" in call_args
            assert "run" in call_args
            assert "--network" in call_args
            assert "none" in call_args
            assert "--memory" in call_args
            assert "1g" in call_args
            assert "--pids-limit" in call_args
            assert "64" in call_args
            assert "--cpus" in call_args
            assert "1.5" in call_args
