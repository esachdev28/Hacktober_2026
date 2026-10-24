"""Deterministic end-to-end tests for all 3 fault injection scenarios."""
import pytest
from pathlib import Path
from app.sandbox.workspace import DisposableWorkspace
from app.services.fault_injector import get_fault_plugin
from app.services.verification_engine import VerificationEngine


@pytest.fixture
def workspace_exp_1():
    ws = DisposableWorkspace(experiment_id=101)
    ws.setup()
    yield ws
    ws.cleanup()


@pytest.fixture
def workspace_exp_2():
    ws = DisposableWorkspace(experiment_id=102)
    ws.setup()
    yield ws
    ws.cleanup()


@pytest.fixture
def workspace_exp_3():
    ws = DisposableWorkspace(experiment_id=103)
    ws.setup()
    yield ws
    ws.cleanup()


def test_scenario_1_missing_env_config(workspace_exp_1):
    """Scenario 1: Missing Environment Configuration Lifecycle.
    
    1. Baseline health passes.
    2. Fault reproduces before repair.
    3. Patch applies in disposable sandbox.
    4. Independent post-repair test passes.
    """
    plugin = get_fault_plugin("missing_env_config")
    assert plugin is not None

    # Step 1: Baseline health check passes
    baseline = VerificationEngine.run_baseline_verification(workspace_exp_1)
    assert baseline.passed, f"Baseline failed: {baseline.output}"

    # Step 2: Fault reproduces (fails without repair)
    repro = VerificationEngine.verify_fault_reproduction(workspace_exp_1, plugin.get_verification_test_filter())
    assert repro.passed, "Fault reproduction check expected failure before patch"

    # Step 3: Apply reference candidate patch
    candidate = plugin.get_candidate_repair()
    applied, msg = workspace_exp_1.apply_patch_diff(candidate["diff"])
    assert applied, f"Failed to apply patch: {msg}"

    # Step 4: Verification engine independently confirms recovery
    suite = VerificationEngine.run_post_repair_verification(workspace_exp_1, plugin.get_verification_test_filter())
    assert suite.all_passed, f"Post-repair verification failed: {[c.actual for c in suite.checks]}"


def test_scenario_2_dependency_timeout(workspace_exp_2):
    """Scenario 2: Downstream Dependency Timeout Lifecycle."""
    plugin = get_fault_plugin("dependency_timeout")
    assert plugin is not None

    baseline = VerificationEngine.run_baseline_verification(workspace_exp_2)
    assert baseline.passed

    repro = VerificationEngine.verify_fault_reproduction(workspace_exp_2, plugin.get_verification_test_filter())
    assert repro.passed

    candidate = plugin.get_candidate_repair()
    applied, msg = workspace_exp_2.apply_patch_diff(candidate["diff"])
    assert applied, f"Failed to apply patch: {msg}"

    suite = VerificationEngine.run_post_repair_verification(workspace_exp_2, plugin.get_verification_test_filter())
    assert suite.all_passed, f"Post-repair verification failed: {[c.actual for c in suite.checks]}"


def test_scenario_3_malformed_response(workspace_exp_3):
    """Scenario 3: Malformed Upstream API Response Lifecycle."""
    plugin = get_fault_plugin("malformed_response")
    assert plugin is not None

    baseline = VerificationEngine.run_baseline_verification(workspace_exp_3)
    assert baseline.passed

    repro = VerificationEngine.verify_fault_reproduction(workspace_exp_3, plugin.get_verification_test_filter())
    assert repro.passed

    candidate = plugin.get_candidate_repair()
    applied, msg = workspace_exp_3.apply_patch_diff(candidate["diff"])
    assert applied, f"Failed to apply patch: {msg}"

    suite = VerificationEngine.run_post_repair_verification(workspace_exp_3, plugin.get_verification_test_filter())
    assert suite.all_passed, f"Post-repair verification failed: {[c.actual for c in suite.checks]}"
