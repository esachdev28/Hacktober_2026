"""Integration tests for FastAPI endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify / root returns branding."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["product"] == "CHAOSPATCH"


def test_health_and_readiness_endpoints():
    """Verify /api/health and /api/ready."""
    h_res = client.get("/api/health")
    assert h_res.status_code == 200
    assert h_res.json()["status"] in ("healthy", "degraded")

    r_res = client.get("/api/ready")
    assert r_res.status_code == 200
    assert "ready" in r_res.json()


def test_scenarios_catalog():
    """Verify scenario catalog lists all 3 fault plugins."""
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) == 3
    ids = {s["id"] for s in scenarios}
    assert "missing_env_config" in ids
    assert "dependency_timeout" in ids
    assert "malformed_response" in ids


def test_dashboard_summary():
    """Verify /api/dashboard/summary returns real metrics structure."""
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_experiments" in data
    assert "successful_recoveries" in data
    assert "scenario_distribution" in data


def test_experiment_creation_and_retrieval():
    """Verify creating and retrieving an experiment."""
    create_res = client.post("/api/experiments", json={
        "scenario_type": "missing_env_config",
        "target_environment": "SANDBOX",
    })
    assert create_res.status_code == 201
    exp = create_res.json()
    assert exp["status"] == "CREATED"
    exp_id = exp["id"]

    get_res = client.get(f"/api/experiments/{exp_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == exp_id


def test_settings_endpoint_no_secrets():
    """Verify /api/settings exposes configuration without leaking token."""
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "model_id" in data
    # Token must NOT be present in settings response!
    assert "hf_token" not in data
    assert "token" not in data
    assert "has_credentials" in data
