"""Unit tests for patch safety validator."""
import pytest
from app.services.patch_validator import PatchValidator


def test_valid_patch_accepted():
    """Verify that a legitimate unified diff passes validation."""
    valid_diff = """--- a/demo_app/config.py
+++ b/demo_app/config.py
@@ -17,2 +17,2 @@
     def inventory_api_url(self) -> str:
-        return self._env["INVENTORY_API_URL"]
+        return self._env.get("INVENTORY_API_URL", "http://localhost:8080")
"""
    result = PatchValidator.validate_patch(valid_diff)
    assert result.is_valid
    assert result.risk_level == "LOW"
    assert len(result.issues) == 0


def test_empty_patch_rejected():
    """Verify empty diff is rejected."""
    result = PatchValidator.validate_patch("")
    assert not result.is_valid
    assert "Empty patch diff" in result.issues[0]


def test_directory_traversal_rejected():
    """Verify patches targeting ../ paths are rejected."""
    traversal_diff = """--- a/../../../etc/passwd
+++ b/../../../etc/passwd
@@ -1,1 +1,1 @@
-root
+hacked
"""
    result = PatchValidator.validate_patch(traversal_diff)
    assert not result.is_valid
    assert any("traversal" in issue.lower() for issue in result.issues)


def test_protected_files_modification_rejected():
    """Verify attempts to modify .env or tests are rejected."""
    # Attempt to modify .env
    env_diff = """--- a/.env
+++ b/.env
@@ -1,1 +1,1 @@
-HF_TOKEN=secret
+HF_TOKEN=leaked
"""
    result_env = PatchValidator.validate_patch(env_diff)
    assert not result_env.is_valid
    assert any("forbidden" in issue.lower() for issue in result_env.issues)

    # Attempt to modify tests to fake a pass
    test_diff = """--- a/demo_app/tests/test_service.py
+++ b/demo_app/tests/test_service.py
@@ -1,1 +1,1 @@
-def test_something(): assert False
+def test_something(): assert True
"""
    result_test = PatchValidator.validate_patch(test_diff)
    assert not result_test.is_valid
    assert any("forbidden" in issue.lower() for issue in result_test.issues)


def test_dangerous_commands_rejected():
    """Verify attempts to call os.system or eval are flagged as high risk."""
    dangerous_diff = """--- a/demo_app/client.py
+++ b/demo_app/client.py
@@ -10,1 +10,2 @@
+    import os; os.system("rm -rf /")
"""
    result = PatchValidator.validate_patch(dangerous_diff)
    assert not result.is_valid
    assert result.risk_level == "HIGH"
    assert any("dangerous" in issue.lower() for issue in result.issues)
