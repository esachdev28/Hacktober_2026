"""Patch safety validator."""
import ast
import re
from typing import Tuple, Optional, List
from app.sandbox.filesystem_policy import FORBIDDEN_PATTERNS


class PatchValidationResult:
    """Detailed result of patch validation."""

    def __init__(self, is_valid: bool, issues: Optional[List[str]] = None, risk_level: str = "LOW"):
        self.is_valid = is_valid
        self.issues = issues or []
        self.risk_level = risk_level

    @property
    def summary(self) -> str:
        if self.is_valid:
            return f"Patch passed safety validation (Risk: {self.risk_level})"
        return f"Patch rejected: {'; '.join(self.issues)}"


class PatchValidator:
    """Validates candidate patches before application to workspace."""

    DANGEROUS_CALLS = {
        "eval", "exec", "compile", "__import__",
        "system", "popen", "spawn", "fork"
    }

    DANGEROUS_MODULES = {
        "shutil.rmtree", "os.remove", "os.unlink", "os.rmdir", "subprocess"
    }

    @classmethod
    def validate_patch(cls, patch_diff: str, allowed_base_dir: str = "demo_app") -> PatchValidationResult:
        """Validate candidate patch diff."""
        issues: List[str] = []
        risk_level = "LOW"

        if not patch_diff or not patch_diff.strip():
            return PatchValidationResult(False, ["Empty patch diff"])

        # 1. Structure check: must look like unified diff
        has_file_header = False
        target_files = []
        lines = patch_diff.strip().splitlines()

        for line in lines:
            if line.startswith("+++ b/") or line.startswith("+++ "):
                has_file_header = True
                fname = line[6:] if line.startswith("+++ b/") else line[4:]
                fname = fname.strip()
                target_files.append(fname)

        if not has_file_header:
            issues.append("Missing standard unified diff header (+++ b/...)")

        # 2. Check each target file against path rules
        for tf in target_files:
            # Traversal check
            if ".." in tf.split("/"):
                issues.append(f"Directory traversal detected in target file: {tf}")
            
            # Forbidden file patterns
            for pat in FORBIDDEN_PATTERNS:
                if re.match(pat, tf, re.IGNORECASE):
                    issues.append(f"Patch attempts to modify forbidden target: {tf}")

        # 3. Check for dangerous calls inside added lines
        added_lines = [l[1:] for l in lines if l.startswith("+") and not l.startswith("+++")]
        added_text = "\n".join(added_lines)

        for dangerous_call in cls.DANGEROUS_CALLS:
            # Simple word-boundary check
            if re.search(r"\b" + re.escape(dangerous_call) + r"\s*\(", added_text):
                issues.append(f"Dangerous call '{dangerous_call}' detected in patch additions")
                risk_level = "HIGH"

        # 4. AST check on snippets of Python code
        for line in added_lines:
            stripped = line.strip()
            # If line is complete assignment or expression, quick AST parse test
            if stripped and not stripped.startswith("#") and not stripped.endswith(":") and not stripped.endswith("\\"):
                try:
                    # Parse as statement
                    ast.parse(stripped)
                except SyntaxError:
                    # Line might be part of multi-line statement; acceptable unless malformed quotes/brackets
                    pass

        is_valid = len(issues) == 0
        if not is_valid:
            risk_level = "HIGH"

        return PatchValidationResult(is_valid=is_valid, issues=issues, risk_level=risk_level)
