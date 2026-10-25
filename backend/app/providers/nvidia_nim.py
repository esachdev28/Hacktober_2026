"""NVIDIA NIM sole inference provider for z-ai/glm-5.3-flash using OpenAI-compatible API."""
import json
import re
import time
import logging
from typing import Dict, Any, Optional
from openai import (
    OpenAI,
    APIStatusError,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    APITimeoutError,
)
from app.core.config import settings
from app.providers.base import BaseInferenceProvider, ModelDiagnosisResult

logger = logging.getLogger("chaospatch.provider.nvidia")

# Default NVIDIA NIM OpenAI-compatible base URL
NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"

# Sole configured model: z-ai/glm-5.3-flash
NVIDIA_DEFAULT_MODEL = "z-ai/glm-5.3-flash"

# Retry configuration for overloaded/429 responses
MAX_RETRIES = 3
RETRY_BASE_DELAY_S = 2.0  # seconds; doubles each attempt


class NvidiaNIMProvider(BaseInferenceProvider):
    """Sole inference provider: z-ai/glm-5.3-flash via NVIDIA NIM."""

    def __init__(self):
        self.api_key = settings.nvidia_api_key
        self.model_id = settings.effective_nvidia_model or NVIDIA_DEFAULT_MODEL
        self.base_url = settings.nvidia_base_url or NVIDIA_NIM_BASE_URL
        self.timeout = settings.nvidia_timeout_seconds
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            if not self.api_key:
                raise ValueError("NVIDIA_API_KEY is not configured in the backend environment.")
            self._client = OpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=self.timeout,
                max_retries=0,  # manual bounded retries
            )
        return self._client

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _is_retryable(self, err: Exception) -> bool:
        """Return True if the error is transient (overloaded, rate-limited, 5xx)."""
        if isinstance(err, (AuthenticationError, NotFoundError)):
            return False
        if isinstance(err, RateLimitError):
            return True
        if isinstance(err, APIStatusError):
            return err.status_code in (429, 500, 502, 503, 529)
        msg = str(err).lower()
        return "overloaded" in msg or "rate limit" in msg or "529" in msg or "429" in msg

    def _call_with_retry(self, **kwargs) -> Any:
        """Call chat.completions.create with bounded exponential-backoff retry on transient errors."""
        last_err: Optional[Exception] = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                return self.client.chat.completions.create(**kwargs)
            except AuthenticationError as auth_err:
                logger.error("NVIDIA NIM authentication failed. Check NVIDIA_API_KEY.")
                raise RuntimeError(
                    "MODEL_UNAVAILABLE: NVIDIA NIM authentication failed: Invalid or expired NVIDIA_API_KEY."
                ) from auth_err
            except NotFoundError as nf_err:
                logger.error(f"NVIDIA NIM model '{self.model_id}' not found.")
                raise RuntimeError(
                    f"MODEL_UNAVAILABLE: NVIDIA NIM model '{self.model_id}' was not found at {self.base_url}."
                ) from nf_err
            except APITimeoutError as to_err:
                logger.error(f"NVIDIA NIM timeout for model '{self.model_id}' after {self.timeout}s.")
                raise RuntimeError(
                    f"MODEL_TIMEOUT: NVIDIA NIM inference timed out after {self.timeout}s for model '{self.model_id}'."
                ) from to_err
            except Exception as err:
                last_err = err
                if self._is_retryable(err) and attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY_S * (2 ** (attempt - 1))
                    logger.warning(
                        f"NVIDIA NIM transient error for {self.model_id} (attempt {attempt}/{MAX_RETRIES}), "
                        f"retrying in {delay:.1f}s: {err}"
                    )
                    time.sleep(delay)
                else:
                    if isinstance(err, RateLimitError):
                        raise RuntimeError(
                            f"MODEL_UNAVAILABLE: NVIDIA NIM rate limit exceeded (429) for model '{self.model_id}'."
                        ) from err
                    raise

        raise last_err  # type: ignore[misc]

    def _extract_content(self, message) -> str:
        """Extract text from a chat message, supporting standard and reasoning outputs."""
        content = getattr(message, "content", None) or ""
        if isinstance(content, str) and content.strip():
            return content
        try:
            raw = message.model_dump() if hasattr(message, "model_dump") else vars(message)
            reasoning = raw.get("reasoning_content", "") or ""
            if isinstance(reasoning, str) and reasoning.strip():
                return reasoning
            return content or ""
        except Exception:
            return content or ""

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract and parse JSON from LLM response (handles markdown fences and partial text)."""
        text_clean = text.strip()
        try:
            return json.loads(text_clean)
        except json.JSONDecodeError:
            pass

        # Look for markdown json code fence
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Look for outermost matching braces
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass

        raise ValueError(f"Could not parse valid JSON from model response: {text[:300]}...")

    def _validate_patch(self, patch_diff: str) -> str:
        """Validate proposed unified patch format before returning it."""
        if not patch_diff or not patch_diff.strip():
            return ""
        clean = patch_diff.strip()
        # Reject stub / placeholder diffs
        if clean.startswith("#") and len(clean) < 80:
            logger.warning("Rejected stub or placeholder diff from model.")
            return ""
        # Check for unified diff headers
        has_diff_headers = ("--- " in clean and "+++ " in clean) or "@@" in clean
        if not has_diff_headers:
            logger.warning("Model output does not contain unified diff headers (--- / +++ / @@).")
            return ""
        return clean

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def health_check(self) -> Dict[str, Any]:
        """Verify connectivity to NVIDIA NIM inference API for z-ai/glm-5.3-flash."""
        if not self.api_key:
            return {
                "connected": False,
                "error": "NVIDIA_API_KEY not configured in backend environment",
                "latency_ms": None,
                "model": self.model_id,
                "provider": f"nvidia-nim:{self.model_id}",
            }
        start = time.time()
        try:
            resp = self._call_with_retry(
                model=self.model_id,
                messages=[
                    {"role": "system", "content": "You are a health check assistant."},
                    {"role": "user", "content": "Reply with pong only."},
                ],
                max_tokens=16,
                temperature=0.0,
                top_p=1,
                stream=False,
            )
            latency_ms = int((time.time() - start) * 1000)
            content = self._extract_content(resp.choices[0].message)
            return {
                "connected": bool(content),
                "latency_ms": latency_ms,
                "model": self.model_id,
                "provider": f"nvidia-nim:{self.model_id}",
                "message": f"Connected to NVIDIA NIM ({self.model_id}).",
            }
        except Exception as err:
            latency_ms = int((time.time() - start) * 1000)
            logger.warning(f"NVIDIA NIM health check failed for {self.model_id}: {err}")
            return {
                "connected": False,
                "error": str(err),
                "latency_ms": latency_ms,
                "model": self.model_id,
                "provider": f"nvidia-nim:{self.model_id}",
            }

    def generate_diagnosis_and_patch(
        self,
        scenario_id: str,
        evidence_text: str,
        source_context: str,
    ) -> ModelDiagnosisResult:
        """Query NVIDIA NIM model (z-ai/glm-5.3-flash) to diagnose the failure and produce unified diff."""
        if not self.api_key:
            raise RuntimeError("MODEL_UNAVAILABLE: NVIDIA_API_KEY is missing from environment.")

        system_instructions = (
            "You are CHAOSPATCH, an expert SRE and AI reliability engineer.\n"
            "Analyze the provided failure evidence and source code.\n"
            "Diagnose the root cause, cite evidence IDs (e.g. EVID-xxx), and propose a minimal unified diff patch.\n"
            "CRITICAL: Output your response strictly as valid JSON matching this schema:\n"
            "{\n"
            '  "title": "Brief title of the incident",\n'
            '  "root_cause": "Detailed explanation of why the failure occurred",\n'
            '  "confidence": 0.95,\n'
            '  "cited_evidence_ids": ["EVID-001-001"],\n'
            '  "explanation": "Why this patch resolves the issue safely",\n'
            '  "risk_summary": "Potential regressions or risk assessment",\n'
            '  "proposed_patch_diff": "--- a/file.py\\n+++ b/file.py\\n@@ -1,3 +1,3 @@\\n-old\\n+new"\n'
            "}\n"
            "Do NOT include markdown fences around the JSON. Output ONLY the JSON object."
        )

        user_content = (
            f"=== INCIDENT CONTEXT ===\n"
            f"Scenario: {scenario_id}\n\n"
            f"{evidence_text}\n\n"
            f"=== TARGET SOURCE EXCERPTS ===\n"
            f"{source_context}\n"
            f"=== END OF SOURCE EXCERPTS ===\n\n"
            "Provide the JSON diagnosis and patch now."
        )

        try:
            response = self._call_with_retry(
                model=self.model_id,
                messages=[
                    {"role": "system", "content": system_instructions},
                    {"role": "user", "content": user_content},
                ],
                temperature=settings.model_temperature,
                top_p=1,
                max_tokens=settings.model_max_tokens,
                stream=False,
            )
            raw_text = self._extract_content(response.choices[0].message)
            if not raw_text.strip():
                raise RuntimeError(
                    f"MODEL_FAILED: NVIDIA NIM returned an empty response for model '{self.model_id}'."
                )
            parsed_data = self._extract_json(raw_text)

            candidate_diff = self._validate_patch(parsed_data.get("proposed_patch_diff", ""))

            return ModelDiagnosisResult(
                title=parsed_data.get("title", f"Failure Diagnosis for {scenario_id}"),
                root_cause=parsed_data.get("root_cause", "Unspecified root cause"),
                confidence=float(parsed_data.get("confidence", 0.85)),
                cited_evidence_ids=parsed_data.get("cited_evidence_ids", []),
                proposed_patch_diff=candidate_diff,
                explanation=parsed_data.get("explanation", ""),
                risk_summary=parsed_data.get("risk_summary", "Low risk"),
                is_ai_generated=True,
                provider=f"nvidia-nim:{self.model_id}",
                raw_response=raw_text,
            )
        except RuntimeError:
            raise
        except Exception as err:
            logger.error(f"NVIDIA NIM inference error for model '{self.model_id}': {err}")
            raise RuntimeError(f"MODEL_FAILED: AI Inference failed (NVIDIA NIM - {self.model_id}): {str(err)}") from err
