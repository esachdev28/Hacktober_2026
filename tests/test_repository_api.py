"""Integration tests for Public GitHub Repository API endpoints."""
import pytest
from unittest.mock import patch
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_repository_intake_rejects_malicious_urls():
    """Verify endpoint rejects URLs with credentials or non-GitHub hosts."""
    res_cred = client.post("/api/repository/intake", json={
        "repo_url": "https://user:pass@github.com/owner/project"
    })
    assert res_cred.status_code == 400
    assert "embedded" in res_cred.json()["detail"].lower()

    res_host = client.post("/api/repository/intake", json={
        "repo_url": "https://gitlab.com/owner/project"
    })
    assert res_host.status_code == 400
    assert "not supported" in res_host.json()["detail"].lower()


def test_repository_intake_mocked_success(tmp_path):
    """Verify successful repository intake returns project inspection metadata."""
    # Create fake repository structure in temp dir
    fake_repo = tmp_path / "mock_project"
    fake_repo.mkdir()
    (fake_repo / "pyproject.toml").write_text('[project]\nname = "mock"\n')
    (fake_repo / "tests").mkdir()
    (fake_repo / "tests" / "test_ok.py").write_text("def test(): pass\n")

    with patch("app.services.git_service.GitService.clone_repository", return_value=(fake_repo, "main", "c0ffee1234")):
        res = client.post("/api/repository/intake", json={
            "repo_url": "https://github.com/mock-org/mock-project"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["owner"] == "mock-org"
        assert data["name"] == "mock-project"
        assert data["primary_language"] == "Python"
        assert data["base_commit_sha"] == "c0ffee1234"
        assert data["default_branch"] == "main"
        assert data["capabilities"]["can_run_tests"] is True
        exp_id = data["experiment_id"]

        # Prohibit main branch
        res_main = client.post("/api/repository/publish-branch", json={
            "experiment_id": exp_id,
            "github_token": "ghp_mock",
            "branch_name": "main",
        })
        assert res_main.status_code == 200
        assert res_main.json()["status"] == "FORBIDDEN_BRANCH"

        # Require token
        res_no_token = client.post("/api/repository/publish-branch", json={
            "experiment_id": exp_id,
            "github_token": "",
            "branch_name": f"chaospatch/repair-{exp_id}",
        })
        assert res_no_token.status_code == 200
        assert res_no_token.json()["status"] == "PUBLISH_AUTH_REQUIRED"

        # Export patch endpoint
        res_export = client.get(f"/api/repository/export-patch/{exp_id}")
        assert res_export.status_code == 200
        assert res_export.headers["content-type"].startswith("text/x-diff")
        assert "CHAOSPATCH Verified Repair Patch" in res_export.text

