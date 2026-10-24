"""Evidence collector with stable identifiers and secret sanitization."""
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.models.experiments import Evidence, EvidenceType, Severity


SECRET_PATTERNS = [
    (r"(?i)(bearer\s+)[a-zA-Z0-9_\-\.]{15,}", r"\1[REDACTED_TOKEN]"),
    (r"(?i)(hf_[a-zA-Z0-9]{20,})", r"hf_[REDACTED]"),
    (r"(?i)(api[_\-]?key['\":\s=]+)['\"][a-zA-Z0-9_\-\.]{10,}['\"]", r"\1'[REDACTED]'"),
    (r"(?i)(password['\":\s=]+)['\"][^'\"]+['\"]", r"\1'[REDACTED]'"),
    (r"(?i)(secret['\":\s=]+)['\"][^'\"]+['\"]", r"\1'[REDACTED]'"),
]


def sanitize_secrets(text: str) -> str:
    """Sanitize secrets, tokens and passwords from evidence content."""
    if not text:
        return text
    sanitized = text
    for pattern, replacement in SECRET_PATTERNS:
        sanitized = re.sub(pattern, replacement, sanitized)
    return sanitized


class EvidencePackage:
    """In-memory collection of evidence items for an experiment."""

    def __init__(self, experiment_id: int):
        self.experiment_id = experiment_id
        self._items: List[Dict[str, Any]] = []
        self._counter = 1

    def add_item(
        self,
        evidence_type: EvidenceType,
        source: str,
        content: str,
        severity: Severity = Severity.INFO,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Record an evidence entry with a stable identifier."""
        stable_id = f"EVID-{self.experiment_id:03d}-{self._counter:03d}"
        self._counter += 1

        sanitized_content = sanitize_secrets(content)
        entry = {
            "id_label": stable_id,
            "experiment_id": self.experiment_id,
            "evidence_type": evidence_type.value,
            "source": source,
            "severity": severity.value,
            "content": sanitized_content,
            "metadata_json": metadata or {},
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        self._items.append(entry)
        return entry

    def get_items(self) -> List[Dict[str, Any]]:
        return list(self._items)

    def to_llm_context(self) -> str:
        """Format bounded evidence package for model prompt context."""
        lines = [f"=== EVIDENCE PACKAGE (Experiment #{self.experiment_id}) ==="]
        for item in self._items:
            lines.append(f"\n[{item['id_label']}] TYPE: {item['evidence_type'].upper()} | SOURCE: {item['source']} | SEVERITY: {item['severity'].upper()}")
            # Truncate very long content to keep context bounded
            content = item['content']
            if len(content) > 1500:
                content = content[:1500] + "\n... [TRUNCATED FOR LENGTH]"
            lines.append(content)
        lines.append("\n=== END OF EVIDENCE PACKAGE ===")
        return "\n".join(lines)
