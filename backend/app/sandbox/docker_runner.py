"""Docker execution runner for untrusted external repositories.

Security Policy:
1. Untrusted repository tests run strictly in disposable containers.
2. Memory limit: 1GB, CPU limit: 1.5 cores, PIDs limit: 64.
3. Network: disabled (--network none) during test execution to prevent data exfiltration.
4. Mounts: ONLY the disposable workspace directory mounted into /workspace.
5. NO Docker socket mount, NO ~/.ssh mount, NO host credentials mounted.
6. Execution timeout enforced.
"""
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.adapters.base import ExecutionResult


class DockerUnavailableError(Exception):
    """Raised when Docker daemon is not available to run untrusted code safely."""
    pass


class DockerExecutionRunner:
    """Executes commands inside disposable Docker containers with strict security constraints."""

    MEMORY_LIMIT = "1g"
    CPUS_LIMIT = "1.5"
    PIDS_LIMIT = "64"

    @classmethod
    def is_docker_available(cls) -> bool:
        """Check if Docker command and daemon are responding."""
        if not shutil.which("docker"):
            return False
        try:
            res = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return res.returncode == 0
        except Exception:
            return False

    @classmethod
    def run_in_container(
        cls,
        workspace_dir: Path,
        command: str,
        image: str = "python:3.11-slim",
        network_enabled: bool = False,
        timeout_seconds: int = 60,
    ) -> ExecutionResult:
        """Execute a trusted command inside an isolated container mounted to workspace_dir."""
        if not cls.is_docker_available():
            raise DockerUnavailableError(
                "DOCKER_UNAVAILABLE: Untrusted external repository execution requires Docker. "
                "The Docker daemon is not reachable on this host. For security, CHAOSPATCH refuses "
                "to execute arbitrary repository scripts directly on the host machine."
            )

        workspace_abs = str(workspace_dir.resolve())

        # Construct restricted docker run invocation
        docker_cmd = [
            "docker", "run",
            "--rm",
            "--memory", cls.MEMORY_LIMIT,
            "--cpus", cls.CPUS_LIMIT,
            "--pids-limit", cls.PIDS_LIMIT,
            "-v", f"{workspace_abs}:/workspace",
            "-w", "/workspace",
        ]

        if not network_enabled:
            docker_cmd.extend(["--network", "none"])

        # Minimal sanitized environment for the container
        docker_cmd.extend([
            "-e", "CI=true",
            "-e", "PYTHONUNBUFFERED=1",
            image,
            "sh", "-c", command,
        ])

        start_time = time.time()
        try:
            proc = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            duration_ms = int((time.time() - start_time) * 1000)
            return ExecutionResult(
                exit_code=proc.returncode,
                stdout=proc.stdout,
                stderr=proc.stderr,
                duration_ms=duration_ms,
                command=command,
            )
        except subprocess.TimeoutExpired:
            duration_ms = int((time.time() - start_time) * 1000)
            return ExecutionResult(
                exit_code=124,
                stdout="",
                stderr=f"Container execution timed out after {timeout_seconds} seconds",
                duration_ms=duration_ms,
                command=command,
            )
        except Exception as err:
            duration_ms = int((time.time() - start_time) * 1000)
            return ExecutionResult(
                exit_code=1,
                stdout="",
                stderr=f"Container execution failure: {str(err)}",
                duration_ms=duration_ms,
                command=command,
            )
