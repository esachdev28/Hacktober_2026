"""Filesystem policy and security rules for sandbox execution."""
import os
import re
from pathlib import Path
from typing import Set, Tuple, Optional


# Protected files and directory patterns that must NEVER be modified by any patch
FORBIDDEN_PATTERNS = [
    r".*\.env.*",
    r".*\.git/.*",
    r".*secret.*",
    r".*credential.*",
    r".*token.*",
    r".*password.*",
    r".*\.pem$",
    r".*\.key$",
    r".*tests/.*",       # Tests cannot be modified by the AI to make them pass!
    r".*requirements.*",
    r".*package.*\.json",
    r".*\.sh$",
    r".*\.bash$",
    r".*\.zsh$",
]

# Only files under demo_app (or target directory) are eligible for patching
ALLOWED_SOURCE_EXTENSIONS = {".py", ".json", ".yaml", ".yml", ".txt", ".md"}


class FilesystemSecurityPolicy:
    """Enforces strict sandbox filesystem isolation and patch boundaries."""

    def __init__(
        self,
        workspace_root: Path,
        max_patch_size_bytes: int = 10000,
        max_changed_files: int = 5,
    ):
        self.workspace_root = workspace_root.resolve()
        self.max_patch_size_bytes = max_patch_size_bytes
        self.max_changed_files = max_changed_files

    def is_safe_relative_path(self, relative_path: str) -> Tuple[bool, Optional[str]]:
        """Verify that a path is safe, doesn't escape workspace, and is permitted."""
        clean_path = os.path.normpath(relative_path).lstrip("/").lstrip("\\")

        # 1. Reject path traversal
        if ".." in clean_path.split(os.sep):
            return False, f"Directory traversal rejected: {relative_path}"

        # 2. Check forbidden patterns
        for pattern in FORBIDDEN_PATTERNS:
            if re.match(pattern, clean_path, re.IGNORECASE):
                return False, f"Modification of protected file forbidden: {clean_path}"

        # 3. Check allowed extension
        ext = os.path.splitext(clean_path)[1].lower()
        if ext not in ALLOWED_SOURCE_EXTENSIONS:
            return False, f"File extension '{ext}' not in allowed source extensions"

        # 4. Resolve absolute and check within workspace root
        target_abs = (self.workspace_root / clean_path).resolve()
        try:
            target_abs.relative_to(self.workspace_root)
        except ValueError:
            return False, f"Target path escapes workspace root: {relative_path}"

        # 5. Must not be a symlink pointing outside
        if target_abs.is_symlink():
            real_target = target_abs.resolve()
            try:
                real_target.relative_to(self.workspace_root)
            except ValueError:
                return False, f"Symlink escape detected: {relative_path}"

        return True, None

    def is_path_allowed(self, relative_path: str) -> bool:
        """Convenience method returning True if relative_path is permitted and safe."""
        safe, _ = self.is_safe_relative_path(relative_path)
        return safe

    def validate_patch_size(self, patch_diff: str) -> Tuple[bool, Optional[str]]:
        """Validate patch size and bounds."""
        size_bytes = len(patch_diff.encode("utf-8"))
        if size_bytes > self.max_patch_size_bytes:
            return False, f"Patch size ({size_bytes} bytes) exceeds limit ({self.max_patch_size_bytes} bytes)"
        return True, None
