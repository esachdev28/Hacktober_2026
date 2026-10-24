"""Unit tests for CHAOSPATCH experiment state machine."""
import pytest
from app.models.experiments import (
    ExperimentStatus,
    VALID_TRANSITIONS,
    validate_transition,
    is_terminal_status,
)


def test_valid_forward_transitions():
    """Verify standard happy-path progression transitions."""
    assert validate_transition(ExperimentStatus.CREATED, ExperimentStatus.BASELINING)
    assert validate_transition(ExperimentStatus.BASELINING, ExperimentStatus.INJECTING)
    assert validate_transition(ExperimentStatus.INJECTING, ExperimentStatus.OBSERVING)
    assert validate_transition(ExperimentStatus.OBSERVING, ExperimentStatus.DIAGNOSING)
    assert validate_transition(ExperimentStatus.DIAGNOSING, ExperimentStatus.PATCH_REVIEW)
    assert validate_transition(ExperimentStatus.PATCH_REVIEW, ExperimentStatus.APPLYING)
    assert validate_transition(ExperimentStatus.APPLYING, ExperimentStatus.VERIFYING)
    assert validate_transition(ExperimentStatus.VERIFYING, ExperimentStatus.COMPLETED)


def test_invalid_transitions_rejected():
    """Verify that jumping backwards or skipping states is rejected."""
    # Cannot jump straight from CREATED to COMPLETED
    assert not validate_transition(ExperimentStatus.CREATED, ExperimentStatus.COMPLETED)
    # Cannot jump backwards from COMPLETED
    assert not validate_transition(ExperimentStatus.COMPLETED, ExperimentStatus.BASELINING)
    # Cannot jump from INJECTING directly to VERIFYING
    assert not validate_transition(ExperimentStatus.INJECTING, ExperimentStatus.VERIFYING)


def test_terminal_states():
    """Verify that terminal states cannot transition to any other state."""
    terminal_states = [
        ExperimentStatus.COMPLETED,
        ExperimentStatus.FAILED,
        ExperimentStatus.CANCELLED,
        ExperimentStatus.TIMED_OUT,
        ExperimentStatus.PATCH_REJECTED,
        ExperimentStatus.VERIFICATION_FAILED,
        ExperimentStatus.AI_UNAVAILABLE,
    ]
    for state in terminal_states:
        assert is_terminal_status(state)
        # Attempting any transition out should return False
        assert not validate_transition(state, ExperimentStatus.BASELINING)
        assert not validate_transition(state, ExperimentStatus.COMPLETED)


def test_cancellation_allowed_from_active_states():
    """Verify that cancellation is allowed from in-flight states."""
    active_states = [
        ExperimentStatus.CREATED,
        ExperimentStatus.BASELINING,
        ExperimentStatus.INJECTING,
        ExperimentStatus.OBSERVING,
        ExperimentStatus.DIAGNOSING,
        ExperimentStatus.PATCH_REVIEW,
        ExperimentStatus.APPLYING,
    ]
    for state in active_states:
        assert validate_transition(state, ExperimentStatus.CANCELLED)
