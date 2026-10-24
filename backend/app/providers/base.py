"""Abstract base class for AI inference providers."""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class ModelDiagnosisResult(BaseModel):
    """Validated structured output from AI diagnosis and patch proposal."""
    title: str
    root_cause: str
    confidence: float
    cited_evidence_ids: List[str]
    proposed_patch_diff: str
    explanation: str
    risk_summary: str
    is_ai_generated: bool = True
    provider: str = "qwen-huggingface"
    raw_response: Optional[str] = None


class BaseInferenceProvider(ABC):
    """Abstract interface for AI inference models."""

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Test model and provider connectivity."""
        pass

    @abstractmethod
    def generate_diagnosis_and_patch(
        self,
        scenario_id: str,
        evidence_text: str,
        source_context: str,
    ) -> ModelDiagnosisResult:
        """Analyze evidence package and propose root cause and unified diff patch."""
        pass
