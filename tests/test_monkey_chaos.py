"""Automated Test Suite for Monkey Chaos Engine and API Endpoints."""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.experiments import Experiment
from app.services.monkey_engine import MonkeyChaosEngine
from app.sandbox.workspace import DisposableWorkspace

client = TestClient(app)


def test_monkey_vector_catalog():
    """Confirms /api/monkey/vectors returns all 3 vectors and 4 intensities."""
    response = client.get("/api/monkey/vectors")
    assert response.status_code == 200
    data = response.json()

    assert "vectors" in data
    assert "intensities" in data

    # Verify 4 supported intensities
    expected_intensities = {"LOW", "MODERATE", "AGGRESSIVE", "CHAOS_BARRAGE"}
    assert set(data["intensities"]) == expected_intensities

    # Verify all 3 monkey vectors are cataloged
    vector_ids = {v["id"] for v in data["vectors"]}
    expected_vectors = {
        "monkey_config_drop",
        "monkey_network_stall",
        "monkey_payload_scramble",
    }
    assert vector_ids == expected_vectors

    # Verify metadata fields on vectors
    for vec in data["vectors"]:
        assert vec["name"]
        assert vec["target_layer"]
        assert vec["failure_mechanism"]
        assert vec["risk_level"] in ("LOW", "MEDIUM", "HIGH")
        assert vec["default_weight"] > 0


def test_attack_plan_intensity_distribution():
    """Tests selection logic for LOW, AGGRESSIVE, and CHAOS_BARRAGE."""
    allowed = ["monkey_config_drop", "monkey_network_stall", "monkey_payload_scramble"]

    # 1. LOW: Must select exactly 1 vector
    plan_low = MonkeyChaosEngine.select_attack_plan(intensity="LOW", allowed_vectors=allowed)
    assert len(plan_low) == 1
    assert plan_low[0] in allowed

    # 2. MODERATE: Must select 1 vector
    plan_mod = MonkeyChaosEngine.select_attack_plan(intensity="MODERATE", allowed_vectors=allowed)
    assert len(plan_mod) == 1
    assert plan_mod[0] in allowed

    # 3. AGGRESSIVE: Must select 2 distinct vectors
    plan_agg = MonkeyChaosEngine.select_attack_plan(intensity="AGGRESSIVE", allowed_vectors=allowed)
    assert len(plan_agg) == 2
    assert len(set(plan_agg)) == 2
    assert set(plan_agg).issubset(set(allowed))

    # 4. CHAOS_BARRAGE: Must select all 3 vectors
    plan_barrage = MonkeyChaosEngine.select_attack_plan(intensity="CHAOS_BARRAGE", allowed_vectors=allowed)
    assert len(plan_barrage) == 3
    assert set(plan_barrage) == set(allowed)

    # 5. Filter respect: If subset provided, only pick from subset
    subset = ["monkey_config_drop"]
    plan_subset = MonkeyChaosEngine.select_attack_plan(intensity="AGGRESSIVE", allowed_vectors=subset)
    assert plan_subset == ["monkey_config_drop"]


def test_monkey_strike_isolated_execution(tmp_path):
    """Executes an attack inside a disposable sandbox and verifies safety invariants."""
    exp_id = 9988
    workspace = DisposableWorkspace(experiment_id=exp_id)
    workspace.setup()

    try:
        # Snapshot canonical root file content before strike
        root_config_path = Path("demo_app/config.py")
        assert root_config_path.exists(), "Canonical root demo_app/config.py must exist"
        root_content_before = root_config_path.read_text(encoding="utf-8")

        # Execute monkey strike targeting config drop
        strike_result = MonkeyChaosEngine.execute_monkey_strike(
            workspace=workspace,
            vector_ids=["monkey_config_drop"],
            jitter_ms=0,
        )

        # 1. Target files are modified in the isolated sandbox
        sandbox_config_path = workspace.workspace_dir / "demo_app" / "config.py"
        assert sandbox_config_path.exists()
        sandbox_content = sandbox_config_path.read_text(encoding="utf-8")
        assert sandbox_content != root_content_before
        assert 'os.environ["PAYMENT_GATEWAY_URL"]' in sandbox_content or "os.environ" in sandbox_content

        # 2. Invariant: No files in canonical root demo_app/ are touched
        root_content_after = root_config_path.read_text(encoding="utf-8")
        assert root_content_after == root_content_before

        # 3. Reproduction test command matches the injected vector
        assert "test_config_resilience_missing_env" in strike_result["reproduction_command"]
        assert strike_result["applied_vectors"] == ["monkey_config_drop"]
        assert "demo_app/config.py" in strike_result["affected_files"]
        assert "strike_id" in strike_result

    finally:
        workspace.cleanup()


def test_monkey_api_launch_endpoint(monkeypatch):
    """POST to /api/monkey/launch, verifying DB persistence, 200 status, and initialization."""
    started_experiments = []

    def fake_start_experiment(experiment_id: int, auto_approve_patch: bool = False):
        started_experiments.append((experiment_id, auto_approve_patch))
        return None

    monkeypatch.setattr(
        "app.api.routes.monkey.ExperimentOrchestrator.start_experiment",
        fake_start_experiment,
    )

    payload = {
        "target_environment": "DOCKER_SANDBOX",
        "target_path": "demo_app",
        "attack_vectors": ["monkey_network_stall"],
        "intensity": "LOW",
        "auto_repair": True,
        "jitter_ms": 50,
        "max_duration_seconds": 120,
    }

    response = client.post("/api/monkey/launch", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "experiment_id" in data
    assert data["status"] == "LAUNCHED"
    assert data["planned_vectors"] == ["monkey_network_stall"]
    assert data["intensity"] == "LOW"
    assert "timestamp" in data

    exp_id = data["experiment_id"]
    assert len(started_experiments) == 1
    assert started_experiments[0] == (exp_id, True)

    # Verify persistence in SQLite database
    db = SessionLocal()
    try:
        exp = db.query(Experiment).filter(Experiment.id == exp_id).first()
        assert exp is not None
        assert exp.scenario_type.startswith("monkey:LOW:monkey_network_stall")
        assert exp.target_environment == "DOCKER_SANDBOX"

        # Verify status endpoint works for this experiment
        status_res = client.get(f"/api/monkey/experiments/{exp_id}/status")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["experiment_id"] == exp_id
        assert status_data["active_vector"] == "monkey_network_stall"
        assert isinstance(status_data["logs"], list)
        assert len(status_data["logs"]) >= 1  # Contains launch event
    finally:
        db.close()
