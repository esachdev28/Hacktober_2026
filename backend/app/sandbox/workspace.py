"""Disposable Workspace Manager for CHAOSPATCH experiments."""
import os
import shutil
import subprocess
import difflib
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from app.sandbox.filesystem_policy import FilesystemSecurityPolicy
from app.core.config import settings


class WorkspaceExecutionResult:
    """Result of running a command inside the isolated workspace."""

    def __init__(self, exit_code: int, stdout: str, stderr: str, duration_ms: int):
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.duration_ms = duration_ms

    @property
    def passed(self) -> bool:
        return self.exit_code == 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "duration_ms": self.duration_ms,
            "passed": self.passed,
        }


class DisposableWorkspace:
    """Manages an isolated workspace directory cloned from demo_app for an experiment."""

    def __init__(self, experiment_id: int, base_dir: Optional[Path] = None):
        self.experiment_id = experiment_id
        project_root = Path(__file__).resolve().parents[3]
        self.source_dir = project_root / "demo_app"
        self.workspaces_base = base_dir or (project_root / "workspaces")
        self.workspace_dir = self.workspaces_base / f"exp_{experiment_id}"
        self.policy = FilesystemSecurityPolicy(
            workspace_root=self.workspace_dir,
            max_patch_size_bytes=settings.max_patch_size_bytes,
            max_changed_files=settings.max_changed_files,
        )

    def setup(self) -> Path:
        """Create an isolated clone of the demo application."""
        if self.workspace_dir.exists():
            shutil.rmtree(self.workspace_dir, ignore_errors=True)

        self.workspaces_base.mkdir(parents=True, exist_ok=True)
        # Copy demo_app to workspace_dir/demo_app
        target_demo = self.workspace_dir / "demo_app"
        shutil.copytree(self.source_dir, target_demo)
        return self.workspace_dir

    def cleanup(self) -> None:
        """Safely destroy disposable workspace."""
        if self.workspace_dir.exists():
            shutil.rmtree(self.workspace_dir, ignore_errors=True)

    def read_file(self, relative_path: str) -> Optional[str]:
        """Read content of a file within the workspace safely."""
        is_safe, error = self.policy.is_safe_relative_path(relative_path)
        if not is_safe:
            raise PermissionError(error)

        file_path = self.workspace_dir / relative_path
        if not file_path.exists():
            return None
        return file_path.read_text(encoding="utf-8")

    def write_file(self, relative_path: str, content: str) -> None:
        """Write content to a file within the workspace safely."""
        is_safe, error = self.policy.is_safe_relative_path(relative_path)
        if not is_safe:
            raise PermissionError(error)

        file_path = self.workspace_dir / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")

    def apply_patch_diff(self, patch_diff: str) -> Tuple[bool, str]:
        """Apply unified diff into workspace files with strict safety checks."""
        # 1. Check size limit
        is_valid_size, size_err = self.policy.validate_patch_size(patch_diff)
        if not is_valid_size:
            return False, size_err or "Patch exceeds size limit"

        # 2. Parse diff chunks
        lines = patch_diff.strip().splitlines()
        current_file = None
        hunks = []
        file_changes: Dict[str, List[str]] = {}

        for line in lines:
            if line.startswith("--- a/") or line.startswith("--- "):
                pass
            elif line.startswith("+++ b/") or line.startswith("+++ "):
                target_filename = line[6:] if line.startswith("+++ b/") else line[4:]
                # Normalize filename
                target_filename = target_filename.strip()
                if target_filename.startswith("demo_app/"):
                    current_file = target_filename
                else:
                    current_file = f"demo_app/{target_filename}"
                file_changes[current_file] = []
            elif current_file and (line.startswith("+") or line.startswith("-") or line.startswith(" ") or line.startswith("@@")):
                file_changes[current_file].append(line)

        if not file_changes:
            return False, "No valid unified diff file headers found (e.g. +++ b/demo_app/...)"

        if len(file_changes) > self.policy.max_changed_files:
            return False, f"Patch alters {len(file_changes)} files, exceeding limit of {self.policy.max_changed_files}"

        # 3. Validate each target file path
        for rel_path in file_changes.keys():
            is_safe, err = self.policy.is_safe_relative_path(rel_path)
            if not is_safe:
                return False, f"Security rejection for {rel_path}: {err}"

        # 4. Apply changes using patch tool or python diff reconstruction
        for rel_path, diff_lines in file_changes.items():
            file_path = self.workspace_dir / rel_path
            if not file_path.exists():
                return False, f"Target file does not exist in workspace: {rel_path}"

            original_content = file_path.read_text(encoding="utf-8")
            
            # Simple unified patch apply
            patched_content = self._apply_hunks(original_content, diff_lines)
            if patched_content is None:
                return False, f"Failed to apply patch hunk cleanly to {rel_path}"

            file_path.write_text(patched_content, encoding="utf-8")

        return True, "Patch applied cleanly to workspace"

    def _apply_hunks(self, original_text: str, diff_lines: List[str]) -> Optional[str]:
        """Apply unified diff lines to text."""
        orig_lines = original_text.splitlines()
        result_lines = []
        i = 0
        hunk_target_removals = []
        hunk_target_additions = []

        in_hunk = False
        # Collect additions and replacements
        for line in diff_lines:
            if line.startswith("@@"):
                in_hunk = True
                continue
            if not in_hunk:
                continue

            if line.startswith("-"):
                # line to remove
                pass
            elif line.startswith("+"):
                # line to add
                pass

        # Use patch command if available, otherwise apply replacement directly
        try:
            import tempfile
            with tempfile.NamedTemporaryFile("w", delete=False) as f:
                patch_file = f.name
                # Reconstruct full patch
                diff_text = "\n".join(diff_lines)
                f.write(f"--- a/file\n+++ b/file\n" + diff_text + "\n")

            cmd = ["patch", "-u", "-s", "-i", patch_file]
            # Try patch utility
            p = subprocess.run(
                ["patch", "--version"],
                capture_output=True,
                text=True
            )
            if p.returncode == 0:
                with tempfile.NamedTemporaryFile("w", delete=False) as tf:
                    tf.write(original_text)
                    temp_orig = tf.name

                res = subprocess.run(
                    ["patch", "-u", temp_orig, patch_file],
                    capture_output=True,
                    text=True
                )
                if res.returncode == 0:
                    with open(temp_orig, "r") as tf:
                        content = tf.read()
                    os.unlink(patch_file)
                    os.unlink(temp_orig)
                    return content
                os.unlink(temp_orig)
            os.unlink(patch_file)
        except Exception:
            pass

        # Fallback Python patcher for simple unified diff replacements:
        # Match removed lines and replace with added lines
        removals = [l[1:] for l in diff_lines if l.startswith("-") and not l.startswith("---")]
        additions = [l[1:] for l in diff_lines if l.startswith("+") and not l.startswith("+++")]
        
        orig_joined = "\n".join(orig_lines)
        rem_joined = "\n".join(removals)
        add_joined = "\n".join(additions)

        if rem_joined in orig_joined:
            return orig_joined.replace(rem_joined, add_joined, 1)
        
        # If single line replacement
        if len(removals) == 1 and len(additions) == 1:
            if removals[0] in orig_joined:
                return orig_joined.replace(removals[0], additions[0], 1)

        return None

    def run_tests(self, test_filter: Optional[str] = None, timeout_seconds: int = 30) -> WorkspaceExecutionResult:
        """Run pytest inside the isolated workspace using Python in venv."""
        project_root = Path(__file__).resolve().parents[3]
        venv_python = project_root / ".venv" / "bin" / "python3"
        python_exec = str(venv_python) if venv_python.exists() else "python3"

        cmd = [python_exec, "-m", "pytest", "demo_app/tests/test_service.py", "-v"]
        if test_filter:
            cmd.extend(["-k", test_filter])

        env = os.environ.copy()
        env["PYTHONPATH"] = str(self.workspace_dir)

        import time
        start_time = time.time()
        try:
            proc = subprocess.run(
                cmd,
                cwd=str(self.workspace_dir),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                env=env,
            )
            duration_ms = int((time.time() - start_time) * 1000)
            return WorkspaceExecutionResult(
                exit_code=proc.returncode,
                stdout=proc.stdout,
                stderr=proc.stderr,
                duration_ms=duration_ms,
            )
        except subprocess.TimeoutExpired:
            duration_ms = int((time.time() - start_time) * 1000)
            return WorkspaceExecutionResult(
                exit_code=124,
                stdout="",
                stderr=f"Test execution timed out after {timeout_seconds} seconds",
                duration_ms=duration_ms,
            )
        except Exception as err:
            duration_ms = int((time.time() - start_time) * 1000)
            return WorkspaceExecutionResult(
                exit_code=1,
                stdout="",
                stderr=f"Failed to execute tests: {str(err)}",
                duration_ms=duration_ms,
            )
