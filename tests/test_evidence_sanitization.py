"""Unit tests for evidence sanitization and secret redaction."""
import pytest
from app.services.evidence_collector import sanitize_secrets, EvidencePackage
from app.models.experiments import EvidenceType, Severity


def test_sanitize_hf_token():
    """Verify Hugging Face API tokens are redacted."""
    raw = "Request failed with Authorization: Bearer hf_abc1234567890abcdef123456"
    sanitized = sanitize_secrets(raw)
    assert "hf_abc1234567890abcdef123456" not in sanitized
    assert "REDACTED" in sanitized


def test_sanitize_passwords_and_keys():
    """Verify passwords and API keys are redacted."""
    raw = 'Connecting with password="superSecretPassword123" and api_key="sk-live998877665544"'
    sanitized = sanitize_secrets(raw)
    assert "superSecretPassword123" not in sanitized
    assert "sk-live998877665544" not in sanitized


def test_evidence_package_stable_ids():
    """Verify evidence items receive unique, stable EVID identifiers."""
    pkg = EvidencePackage(experiment_id=42)
    e1 = pkg.add_item(EvidenceType.LOG, "logger", "Server starting")
    e2 = pkg.add_item(EvidenceType.STACK_TRACE, "trace", "Exception raised at line 10")

    assert e1["id_label"] == "EVID-042-001"
    assert e2["id_label"] == "EVID-042-002"
    assert e1["id_label"] != e2["id_label"]
