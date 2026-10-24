"""Hugging Face Qwen3 Coder inference provider using OpenAI-compatible router."""
import json
import re
import time
import logging
from typing import Dict, Any, List, Optional
from openai import OpenAI, APIError, APITimeoutError
from app.core.config import settings
from app.providers.base import BaseInferenceProvider, ModelDiagnosisResult

logger = logging.getLogger("chaospatch.provider")


class HuggingFaceQwenProvider(BaseInferenceProvider):
    """Qwen3-Coder provider via Hugging Face router."""

    def __init__(self):
        self.endpoint = settings.hf_inference_endpoint
        self.token = settings.hf_token
        self.model_id = settings.hf_model_id
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            if not self.token:
                raise ValueError("HF_TOKEN is not configured on the backend.")
            self._client = OpenAI(
                base_url=self.endpoint,
                api_key=self.token,
                timeout=30.0,
            )
        return self._client

    def health_check(self) -> Dict[str, Any]:
        """Verify connectivity to Hugging Face router."""
        if not self.token:
            return {
                "connected": False,
                "error": "HF_TOKEN not configured in backend environment",
                "latency_ms": None,
                "model": self.model_id,
            }

        start = time.time()
        try:
            # Send minimal test prompt
            resp = self.client.chat.completions.create(
                model=self.model_id,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5,
                temperature=0.0,
            )
            latency_ms = int((time.time() - start) * 1000)
            return {
                "connected": True,
                "latency_ms": latency_ms,
                "model": self.model_id,
                "message": "Connected successfully to Hugging Face Qwen inference router.",
            }
        except Exception as err:
            latency_ms = int((time.time() - start) * 1000)
            logger.warning(f"Inference health check failed: {err}")
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
        """Query Qwen3 model to diagnose the failure and produce minimal unified diff."""
        if not self.token:
            raise RuntimeError("Cannot invoke AI inference: HF_TOKEN is missing.")

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
            '  "proposed_patch_diff": "--- a/demo_app/file.py\\n+++ b/demo_app/file.py\\n@@ ... @@\\n-old\\n+new"\n'
            "}\n"
            "Do NOT include markdown fences around the JSON if possible, or use standard ```json."
        )

        user_content = (
            f"Scenario: {scenario_id}\n\n"
            f"{evidence_text}\n\n"
            f"=== TARGET SOURCE EXCERPTS ===\n"
            f"{source_context}\n"
            f"=== END OF SOURCE EXCERPTS ===\n\n"
            "Provide the JSON diagnosis and patch now."
        )

        start_time = time.time()
        try:
            response = self.client.chat.completions.create(
                model=self.model_id,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=settings.model_temperature,
                max_tokens=settings.model_max_tokens,
            )
            raw_text = response.choices[0].message.content or ""
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
                provider="qwen-huggingface",
                raw_response=raw_text,
            )
        except Exception as err:
            logger.error(f"Inference error calling Qwen model: {err}")
            raise RuntimeError(f"AI Inference failed: {str(err)}") from err

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract and parse JSON object from LLM response."""
        # 1. Try direct parse
        text_clean = text.strip()
        try:
            return json.loads(text_clean)
        except json.JSONDecodeError:
            pass

        # 2. Try extracting from ```json ... ``` code fence
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # 3. Find outermost braces { ... }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass

        raise ValueError(f"Could not parse valid JSON from model response: {text[:200]}...")
