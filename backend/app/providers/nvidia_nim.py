"""NVIDIA NIM inference provider using the OpenAI-compatible API."""
import json
import re
import time
import logging
from typing import Dict, Any, Optional
from openai import OpenAI, APIStatusError
from app.core.config import settings
from app.providers.base import BaseInferenceProvider, ModelDiagnosisResult

logger = logging.getLogger("chaospatch.provider.nvidia")

# NVIDIA NIM OpenAI-compatible base URL
NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"

# Default model — only minimax-m3.1-flash is confirmed accessible on this account
NVIDIA_DEFAULT_MODEL = "minimaxai/minimax-m3.1-flash"

# Retry configuration for overloaded/429 responses
MAX_RETRIES = 3
RETRY_BASE_DELAY_S = 2.0  # seconds; doubles each attempt


class NvidiaNIMProvider(BaseInferenceProvider):
    """MiniMax M3.1-Flash via NVIDIA NIM OpenAI-compatible inference API."""

    def __init__(self):
        self.api_key = settings.nvidia_api_key
        self.model_id = settings.nvidia_model_id or NVIDIA_DEFAULT_MODEL
        self.base_url = NVIDIA_NIM_BASE_URL
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            if not self.api_key:
                raise ValueError("NVIDIA_API_KEY is not configured in the backend environment.")
            self._client = OpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=90.0,
                max_retries=0,  # we handle retries manually
            )
        return self._client

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _is_retryable(self, err: Exception) -> bool:
        """Return True if the error is transient (overloaded, rate-limited)."""
        if isinstance(err, APIStatusError):
            return err.status_code in (429, 500, 502, 503, 529)
        msg = str(err).lower()
        return "overloaded" in msg or "rate limit" in msg or "529" in msg

    def _call_with_retry(self, **kwargs) -> Any:
        """Call chat.completions.create with exponential-backoff retry on transient errors."""
        last_err: Optional[Exception] = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                return self.client.chat.completions.create(**kwargs)
            except Exception as err:
                last_err = err
                if self._is_retryable(err) and attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY_S * (2 ** (attempt - 1))
                    logger.warning(
                        f"NVIDIA NIM transient error (attempt {attempt}/{MAX_RETRIES}), "
                        f"retrying in {delay:.1f}s: {err}"
                    )
                    time.sleep(delay)
                else:
                    raise
        raise last_err  # type: ignore[misc]

    def _extract_content(self, message) -> str:
        """Extract text from a chat message, supporting reasoning models.

        MiniMax M3.1-Flash stores its visible reply in 'content' and its
        chain-of-thought in 'reasoning_content'. We prefer 'content' when
        non-empty, then fall back to 'reasoning_content'.
        """
        content = getattr(message, "content", None) or ""
        if content.strip():
            return content
        try:
            raw = message.model_dump() if hasattr(message, "model_dump") else vars(message)
            reasoning = raw.get("reasoning_content", "") or ""
            if reasoning.strip():
                logger.debug("Using reasoning_content as the primary model output.")
            return reasoning
        except Exception:
            return content

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract and parse JSON from LLM response (handles fences and partial wrapping)."""
        text_clean = text.strip()
        try:
            return json.loads(text_clean)
        except json.JSONDecodeError:
            pass

        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass

        raise ValueError(f"Could not parse valid JSON from model response: {text[:300]}...")

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def health_check(self) -> Dict[str, Any]:
        """Verify connectivity to NVIDIA NIM inference API."""
        if not self.api_key:
            return {
                "connected": False,
                "error": "NVIDIA_API_KEY not configured in backend environment",
                "latency_ms": None,
                "model": self.model_id,
            }
        start = time.time()
        try:
            resp = self._call_with_retry(
                model=self.model_id,
                messages=[{"role": "user", "content": "Reply with the word pong only."}],
                max_tokens=64,
                temperature=0.0,
            )
            latency_ms = int((time.time() - start) * 1000)
            content = self._extract_content(resp.choices[0].message)
            return {
                "connected": bool(content),
                "latency_ms": latency_ms,
                "model": self.model_id,
                "message": f"Connected to NVIDIA NIM ({self.model_id}).",
            }
        except Exception as err:
            latency_ms = int((time.time() - start) * 1000)
            logger.warning(f"NVIDIA NIM health check failed: {err}")
            return {
                "connected": False,
                "error": str(err),
                "latency_ms": latency_ms,
                "model": self.model_id,
            }

    def generate_diagnosis_and_patch(
        self,
        scenario_id: str,
        evidence_text: str,
        source_context: str,
    ) -> ModelDiagnosisResult:
        """Query NVIDIA NIM model to diagnose the failure and produce a minimal unified diff."""
        if not self.api_key:
            raise RuntimeError("Cannot invoke AI inference: NVIDIA_API_KEY is missing.")

        system_prompt = (
            "You are CHAOSPATCH, an expert SRE and AI reliability engineer.\n"
            "Analyze the provided failure evidence and source code.\n"
            "Diagnose the root cause, cite evidence IDs (e.g. EVID-xxx), and propose a minimal unified diff patch.\n"
            "CRITICAL: Output your response strictly as valid JSON matching this schema:\n"
            "{\n"
            '  "title": "Brief title of the incident",\n'
            '  "root_cause": "Detailed explanation of why the failure occurred",\n'
            '  "confidence": 0.95,\n'
            '  "cited_evidence_ids": ["EVID-001-001", "EVID-001-002"],\n'
            '  "explanation": "Why this patch resolves the issue safely",\n'
            '  "risk_summary": "Potential regressions or risk assessment",\n'
            '  "proposed_patch_diff": "--- a/file.py\\n+++ b/file.py\\n@@ ... @@\\n-old\\n+new"\n'
            "}\n"
            "Do NOT include markdown fences around the JSON. Output ONLY the JSON object."
        )

        user_content = (
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
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=settings.model_temperature,
                max_tokens=settings.model_max_tokens,
            )
            raw_text = self._extract_content(response.choices[0].message)
            if not raw_text.strip():
                raise RuntimeError(
                    "NVIDIA NIM returned an empty response — model exhausted its token budget "
                    "or the response was filtered. Try increasing MODEL_MAX_TOKENS."
                )
            parsed_data = self._extract_json(raw_text)

            return ModelDiagnosisResult(
                title=parsed_data.get("title", f"Failure Diagnosis for {scenario_id}"),
                root_cause=parsed_data.get("root_cause", "Unspecified root cause"),
                confidence=float(parsed_data.get("confidence", 0.85)),
                cited_evidence_ids=parsed_data.get("cited_evidence_ids", []),
                proposed_patch_diff=parsed_data.get("proposed_patch_diff", ""),
                explanation=parsed_data.get("explanation", ""),
                risk_summary=parsed_data.get("risk_summary", "Low risk"),
                is_ai_generated=True,
                provider="nvidia-nim-minimax",
                raw_response=raw_text,
            )
        except RuntimeError:
            raise
        except Exception as err:
            logger.error(f"NVIDIA NIM inference error: {err}")
            raise RuntimeError(f"AI Inference failed (NVIDIA NIM): {str(err)}") from err
