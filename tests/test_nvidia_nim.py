"""Unit tests for NvidiaNIMProvider strictly targeting z-ai/glm-5.3-flash."""
import pytest
from unittest.mock import MagicMock, patch
from openai import (
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    APITimeoutError,
)
from app.providers import get_inference_provider
from app.providers.nvidia_nim import NvidiaNIMProvider
from app.core.config import settings


@pytest.fixture
def mock_openai_response():
    """Create a mock OpenAI chat completion response."""
    def _create_response(content: str):
        mock_choice = MagicMock()
        mock_choice.message.content = content
        mock_choice.message.reasoning_content = None
        mock_choice.message.model_dump.return_value = {"content": content}
        mock_resp = MagicMock()
        mock_resp.choices = [mock_choice]
        return mock_resp
    return _create_response


def test_nvidia_nim_strict_single_model_initialization():
    """Verify provider initializes strictly with z-ai/glm-5.3-flash as sole model."""
    with patch.object(settings, "nvidia_api_key", "nvapi-test-key"), \
         patch.object(settings, "nvidia_model", "z-ai/glm-5.3-flash"), \
         patch.object(settings, "nvidia_base_url", "https://integrate.api.nvidia.com/v1"), \
         patch.object(settings, "nvidia_timeout_seconds", 60.0):
        provider = NvidiaNIMProvider()
        assert provider.model_id == "z-ai/glm-5.3-flash"
        assert provider.base_url == "https://integrate.api.nvidia.com/v1"
        assert provider.timeout == 60.0
        assert provider.api_key == "nvapi-test-key"


def test_factory_returns_only_nvidia_nim_sole_provider():
    """Verify provider factory returns NvidiaNIMProvider and never any legacy or fallback provider."""
    provider = get_inference_provider()
    assert isinstance(provider, NvidiaNIMProvider)
    assert provider.model_id == "z-ai/glm-5.3-flash"


def test_nvidia_nim_successful_diagnosis_parsing(mock_openai_response):
    """Verify provider parses structured JSON from z-ai/glm-5.3-flash and extracts unified diff."""
    json_payload = (
        "{\n"
        '  "title": "Fix ZeroDivisionError in calculation",\n'
        '  "root_cause": "Division by zero when total items is empty",\n'
        '  "confidence": 0.96,\n'
        '  "cited_evidence_ids": ["EVID-001"],\n'
        '  "explanation": "Add defensive check before dividing",\n'
        '  "risk_summary": "Low risk",\n'
        '  "proposed_patch_diff": "--- a/calc.py\\n+++ b/calc.py\\n@@ -1,3 +1,4 @@\\n+if total == 0: return 0\\n return x / total"\n'
        "}"
    )

    with patch.object(settings, "nvidia_api_key", "nvapi-test-key"):
        provider = NvidiaNIMProvider()
        with patch.object(provider.client.chat.completions, "create", return_value=mock_openai_response(json_payload)):
            result = provider.generate_diagnosis_and_patch(
                scenario_id="scenario_001",
                evidence_text="ZeroDivisionError trace",
                source_context="def calc(): return x / total",
            )
            assert result.is_ai_generated is True
            assert "ZeroDivisionError" in result.title
            assert result.confidence == 0.96
            assert "calc.py" in result.proposed_patch_diff
            assert result.provider == "nvidia-nim:z-ai/glm-5.3-flash"


def test_nvidia_nim_strips_markdown_code_fences(mock_openai_response):
    """Verify provider extracts JSON wrapped inside markdown code fences."""
    fenced_payload = (
        "Here is the diagnosis:\n"
        "```json\n"
        "{\n"
        '  "title": "Fenced JSON Test",\n'
        '  "root_cause": "Configuration missing",\n'
        '  "confidence": 0.88,\n'
        '  "proposed_patch_diff": "--- a/x.py\\n+++ b/x.py\\n@@ -1 +1 @@\\n-old\\n+new"\n'
        "}\n"
        "```\n"
        "Hope this helps!"
    )

    with patch.object(settings, "nvidia_api_key", "nvapi-test-key"):
        provider = NvidiaNIMProvider()
        with patch.object(provider.client.chat.completions, "create", return_value=mock_openai_response(fenced_payload)):
            result = provider.generate_diagnosis_and_patch("scen", "evid", "src")
            assert result.title == "Fenced JSON Test"
            assert result.confidence == 0.88
            assert "--- a/x.py" in result.proposed_patch_diff


def test_nvidia_nim_rejects_placeholder_diff(mock_openai_response):
    """Verify provider rejects dummy placeholder diff stubs."""
    stub_payload = (
        "{\n"
        '  "title": "Stub Diff",\n'
        '  "root_cause": "Bug",\n'
        '  "confidence": 0.5,\n'
        '  "proposed_patch_diff": "# Proposed candidate patch diff"\n'
        "}"
    )

    with patch.object(settings, "nvidia_api_key", "nvapi-test-key"):
        provider = NvidiaNIMProvider()
        with patch.object(provider.client.chat.completions, "create", return_value=mock_openai_response(stub_payload)):
            result = provider.generate_diagnosis_and_patch("scen", "evid", "src")
            assert result.proposed_patch_diff == ""


def test_nvidia_nim_authentication_error():
    """Verify 401/403 raises explicit MODEL_UNAVAILABLE message without useless retries."""
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    auth_err = AuthenticationError("Unauthorized", response=mock_resp, body=None)

    with patch.object(settings, "nvidia_api_key", "nvapi-invalid-key"):
        provider = NvidiaNIMProvider()
        with patch.object(provider.client.chat.completions, "create", side_effect=auth_err):
            with pytest.raises(RuntimeError) as exc_info:
                provider.generate_diagnosis_and_patch("scen", "evid", "src")
            assert "model_unavailable" in str(exc_info.value).lower()
            assert "authentication failed" in str(exc_info.value).lower()


def test_nvidia_nim_model_not_found_error():
    """Verify 404 NotFoundError raises clear MODEL_UNAVAILABLE identifying model."""
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    nf_err = NotFoundError("Model not found", response=mock_resp, body=None)

    with patch.object(settings, "nvidia_api_key", "nvapi-test-key"):
        provider = NvidiaNIMProvider()
        with patch.object(provider.client.chat.completions, "create", side_effect=nf_err):
            with pytest.raises(RuntimeError) as exc_info:
                provider.generate_diagnosis_and_patch("scen", "evid", "src")
            assert "model_unavailable" in str(exc_info.value).lower()
            assert "was not found" in str(exc_info.value).lower()


def test_nvidia_nim_timeout_error():
    """Verify timeout error returns explicit MODEL_TIMEOUT message."""
    to_err = APITimeoutError(request=MagicMock())

    with patch.object(settings, "nvidia_api_key", "nvapi-test-key"):
        provider = NvidiaNIMProvider()
        with patch.object(provider.client.chat.completions, "create", side_effect=to_err):
            with pytest.raises(RuntimeError) as exc_info:
                provider.generate_diagnosis_and_patch("scen", "evid", "src")
            assert "model_timeout" in str(exc_info.value).lower()
            assert "timed out" in str(exc_info.value).lower()


def test_nvidia_nim_empty_response_handling(mock_openai_response):
    """Verify empty response raises informative MODEL_FAILED RuntimeError."""
    with patch.object(settings, "nvidia_api_key", "nvapi-test-key"):
        provider = NvidiaNIMProvider()
        with patch.object(provider.client.chat.completions, "create", return_value=mock_openai_response("")):
            with pytest.raises(RuntimeError) as exc_info:
                provider.generate_diagnosis_and_patch("scen", "evid", "src")
            assert "model_failed" in str(exc_info.value).lower()
            assert "empty response" in str(exc_info.value).lower()


def test_nvidia_nim_health_check_success(mock_openai_response):
    """Verify health check returns connected=True on valid response."""
    with patch.object(settings, "nvidia_api_key", "nvapi-test-key"):
        provider = NvidiaNIMProvider()
        with patch.object(provider.client.chat.completions, "create", return_value=mock_openai_response("pong")):
            res = provider.health_check()
            assert res["connected"] is True
            assert res["model"] == "z-ai/glm-5.3-flash"
            assert "connected" in res["message"].lower()


def test_nvidia_nim_health_check_missing_key():
    """Verify health check handles missing API key cleanly."""
    with patch.object(settings, "nvidia_api_key", None):
        provider = NvidiaNIMProvider()
        res = provider.health_check()
        assert res["connected"] is False
        assert "not configured" in res["error"].lower()
