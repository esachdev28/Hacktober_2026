"""Unit tests for Git and GitHub public repository service."""
import pytest
from pathlib import Path
from app.services.git_service import GitService, GitSecurityError


def test_valid_github_urls_accepted():
    """Verify standard public GitHub URLs are accepted and canonicalized."""
    urls = [
        ("https://github.com/psf/requests", "https://github.com/psf/requests", "psf", "requests"),
        ("https://github.com/pallets/flask.git", "https://github.com/pallets/flask", "pallets", "flask"),
        ("https://www.github.com/tiangolo/fastapi/", "https://github.com/tiangolo/fastapi", "tiangolo", "fastapi"),
        ("https://github.com/my-org/project_123", "https://github.com/my-org/project_123", "my-org", "project_123"),
    ]
    for raw, expected_canonical, expected_owner, expected_repo in urls:
        canonical, owner, repo = GitService.parse_and_validate_github_url(raw)
        assert canonical == expected_canonical
        assert owner == expected_owner
        assert repo == expected_repo


def test_reject_unsupported_hosts():
    """Verify non-github domains are rejected."""
    unsupported = [
        "https://gitlab.com/owner/project",
        "https://bitbucket.org/owner/project",
        "https://evil-github.com/owner/project",
        "https://github.com.attacker.com/owner/project",
    ]
    for url in unsupported:
        with pytest.raises(GitSecurityError) as exc_info:
            GitService.parse_and_validate_github_url(url)
        assert "not supported" in str(exc_info.value).lower()


def test_reject_embedded_credentials():
    """Verify credentials embedded in URLs are strictly rejected."""
    credentials_urls = [
        "https://user:password@github.com/owner/project",
        "https://ghp_token123@github.com/owner/project",
    ]
    for url in credentials_urls:
        with pytest.raises(GitSecurityError) as exc_info:
            GitService.parse_and_validate_github_url(url)
        assert "embedded" in str(exc_info.value).lower()


def test_reject_unsafe_schemes_and_traversal():
    """Verify non-HTTPS schemes and directory traversal are rejected."""
    unsafe = [
        "file:///etc/passwd",
        "ssh://git@github.com:owner/project",
        "https://github.com/../etc/passwd",
        "https://github.com/owner/../../secret",
    ]
    for url in unsafe:
        with pytest.raises(GitSecurityError):
            GitService.parse_and_validate_github_url(url)


def test_publish_branch_prohibits_default_branch():
    """Verify branch publishing strictly refuses to push to main, master or default branches."""
    forbidden_branches = ["main", "master", "develop", "main-branch", "MASTER"]
    tmp_path = Path("/tmp")
    
    for b in forbidden_branches:
        res = GitService.publish_repair_branch(
            repo_dir=tmp_path,
            repo_url="https://github.com/test-owner/test-repo",
            base_commit_sha="abc1234",
            experiment_id=99,
            github_token="ghp_mock_token",
            patch_diff="--- a/file.py\n+++ b/file.py\n",
            branch_name=b,
        )
        assert res["status"] == "FORBIDDEN_BRANCH"
        assert "strictly prohibited" in res["message"]


def test_publish_branch_requires_token():
    """Verify publishing fails gracefully with PUBLISH_AUTH_REQUIRED when token is empty."""
    res = GitService.publish_repair_branch(
        repo_dir=Path("/tmp"),
        repo_url="https://github.com/test-owner/test-repo",
        base_commit_sha="abc1234",
        experiment_id=99,
        github_token="",
        patch_diff="",
    )
    assert res["status"] == "PUBLISH_AUTH_REQUIRED"
    assert "token is required" in res["message"].lower()


def test_generate_export_patch():
    """Verify patch export produces valid unified patch format with metadata header."""
    patch_text = GitService.generate_export_patch(
        experiment_id=42,
        base_commit="f1e2d3c4",
        patch_diff="--- a/src/app.py\n+++ b/src/app.py\n@@ -1 +1 @@\n-old\n+new",
        summary="Fix null pointer exception",
    )
    assert "# CHAOSPATCH Verified Repair Patch" in patch_text
    assert "# Experiment ID: #42" in patch_text
    assert "# Base Commit: f1e2d3c4" in patch_text
    assert "+++ b/src/app.py" in patch_text
