"""Docker execution runner for untrusted external repositories.

Security Policy:
1. Untrusted repository tests run strictly in disposable containers.
2. Memory limit: 1GB, CPU limit: 1.5 cores, PIDs limit: 64.
3. Network: disabled (--network none) during test execution to prevent data exfiltration.
4. Mounts: ONLY the disposable workspace directory mounted into /workspace.
5. NO Docker socket mount, NO ~/.ssh mount, NO host credentials mounted.
6. Execution timeout enforced.
7. DOCKER_HOST environment variable is respected to allow socket override
   (e.g. a dedicated sidecar or remote Docker daemon accessible to the API host).
"""
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.adapters.base import ExecutionResult


DOCKER_UNAVAILABLE_RENDER_HINT = (
    " On Render's free/standard tier, Docker is not available inside the API container. "
    "To enable live sandbox execution on Render, configure a dedicated Docker-in-Docker "
    "sidecar service and set DOCKER_HOST to its TCP address, or run the backend on a "
    "Docker-capable machine (local dev with Docker Desktop, a self-hosted VPS, or a "
    "Render Private Service with privileged access)."
)


class DockerUnavailableError(Exception):
    """Raised when Docker daemon is not available to run untrusted code safely."""
    pass


class DockerAvailabilityDiagnosis:
    """Structured diagnosis result for Docker daemon reachability."""

    def __init__(
        self,
        available: bool,
        docker_binary: Optional[str],
        docker_host: Optional[str],
        error: Optional[str],
        returncode: Optional[int],
    ):
        self.available = available
        self.docker_binary = docker_binary
        self.docker_host = docker_host
        self.error = error
        self.returncode = returncode

    def to_dict(self) -> Dict[str, Any]:
        return {
            "available": self.available,
            "docker_binary": self.docker_binary,
            "docker_host": self.docker_host or "default (unix socket)",
            "error": self.error,
        }


class DockerExecutionRunner:
    """Executes commands inside disposable Docker containers with strict security constraints."""

    MEMORY_LIMIT = "1g"
    CPUS_LIMIT = "1.5"
    PIDS_LIMIT = "64"

    @classmethod
    def diagnose(cls) -> DockerAvailabilityDiagnosis:
        """Return a detailed Docker availability diagnosis.

        Respects DOCKER_HOST environment variable so callers can point the runner
        at a remote or sidecar Docker daemon without exposing the host socket.
        """
        binary = shutil.which("docker")
        docker_host = os.environ.get("DOCKER_HOST")

        if not binary:
            return DockerAvailabilityDiagnosis(
                available=False,
                docker_binary=None,
                docker_host=docker_host,
                error="'docker' binary not found in PATH. Install Docker Desktop or Docker Engine.",
                returncode=None,
            )

        env = os.environ.copy()
        # If DOCKER_HOST is set, subprocess inherits it automatically via env.
        try:
            res = subprocess.run(
                [binary, "info"],
                capture_output=True,
                text=True,
                timeout=5,
                env=env,
            )
            if res.returncode == 0:
                return DockerAvailabilityDiagnosis(
                    available=True,
                    docker_binary=binary,
                    docker_host=docker_host,
                    error=None,
                    returncode=0,
                )
            # Returncode non-zero: daemon not running or socket unreachable
            stderr_snippet = (res.stderr or res.stdout or "")[:400].strip()
            return DockerAvailabilityDiagnosis(
                available=False,
                docker_binary=binary,
                docker_host=docker_host,
                error=f"'docker info' exited {res.returncode}: {stderr_snippet}",
                returncode=res.returncode,
            )
        except subprocess.TimeoutExpired:
            return DockerAvailabilityDiagnosis(
                available=False,
                docker_binary=binary,
                docker_host=docker_host,
                error="'docker info' timed out after 5 seconds. Daemon may be unresponsive.",
                returncode=None,
            )
        except Exception as exc:
            return DockerAvailabilityDiagnosis(
                available=False,
                docker_binary=binary,
                docker_host=docker_host,
                error=f"Unexpected error probing Docker: {exc}",
                returncode=None,
            )

    @classmethod
    def is_docker_available(cls) -> bool:
        """Return True if Docker daemon is reachable (respects DOCKER_HOST)."""
        return cls.diagnose().available

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
        diag = cls.diagnose()
        if not diag.available:
            raise DockerUnavailableError(
                "DOCKER_UNAVAILABLE: Untrusted external repository execution requires Docker. "
                f"The Docker daemon is not reachable on this host. "
                f"Reason: {diag.error} "
                "For security, CHAOSPATCH refuses to execute arbitrary repository scripts "
                "directly on the host machine."
                + DOCKER_UNAVAILABLE_RENDER_HINT
            )

        workspace_abs = str(workspace_dir.resolve())

        # Construct restricted docker run invocation
        docker_cmd = [
            diag.docker_binary or "docker", "run",
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
