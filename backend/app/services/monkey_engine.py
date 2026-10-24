"""Autonomous Monkey Chaos Engine for stochastic, multi-vector fault injection."""
import json
import random
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

from app.sandbox.workspace import DisposableWorkspace
from app.sandbox.filesystem_policy import FilesystemSecurityPolicy
from app.services.fault_injector import (
    MissingEnvConfigPlugin,
    DependencyTimeoutPlugin,
    MalformedResponsePlugin,
    FaultPlugin,
)
from app.schemas.monkey import MonkeyVectorInfo


class MonkeyChaosEngine:
    """Orchestrates autonomous, stochastic fault injection across multiple architectural layers."""

    # Vector Registry
    VECTOR_CATALOG: Dict[str, Dict[str, Any]] = {
        "monkey_config_drop": {
            "info": MonkeyVectorInfo(
                id="monkey_config_drop",
                name="Configuration Drop Strike",
                target_layer="Configuration & Environment",
                failure_mechanism="Unsafe direct environment dictionary lookup without fallback or validation",
                risk_level="LOW",
                default_weight=1.0,
            ),
            "plugin_class": MissingEnvConfigPlugin,
            "target_file": "demo_app/config.py",
        },
        "monkey_network_stall": {
            "info": MonkeyVectorInfo(
                id="monkey_network_stall",
                name="Network Latency & Stall Strike",
                target_layer="I/O Transport & Network",
                failure_mechanism="Downstream service latency causing unhandled socket and read timeouts",
                risk_level="MEDIUM",
                default_weight=1.0,
            ),
            "plugin_class": DependencyTimeoutPlugin,
            "target_file": "demo_app/client.py",
        },
        "monkey_payload_scramble": {
            "info": MonkeyVectorInfo(
                id="monkey_payload_scramble",
                name="Payload Schema Drift Strike",
                target_layer="Data Serialization & API",
                failure_mechanism="Upstream API schema variation inducing unhandled KeyError in response parser",
                risk_level="LOW",
                default_weight=1.0,
            ),
            "plugin_class": MalformedResponsePlugin,
            "target_file": "demo_app/client.py",
        },
    }

    INTENSITIES: List[str] = ["LOW", "MODERATE", "AGGRESSIVE", "CHAOS_BARRAGE"]

    @classmethod
    def get_available_vectors(cls) -> List[MonkeyVectorInfo]:
        """Return metadata catalog for all supported monkey vectors."""
        return [entry["info"] for entry in cls.VECTOR_CATALOG.values()]

    @classmethod
    def get_vector_info(cls, vector_id: str) -> Optional[MonkeyVectorInfo]:
        """Retrieve info for a specific vector id."""
        entry = cls.VECTOR_CATALOG.get(vector_id)
        return entry["info"] if entry else None

    @classmethod
    def get_plugin_instance(cls, vector_id: str) -> Optional[FaultPlugin]:
        """Instantiate the underlying FaultPlugin for a monkey vector."""
        entry = cls.VECTOR_CATALOG.get(vector_id)
        if not entry:
            return None
        return entry["plugin_class"]()

    @classmethod
    def select_attack_plan(
        cls,
        intensity: str = "MODERATE",
        allowed_vectors: Optional[List[str]] = None,
    ) -> List[str]:
        """Plan which vectors to strike with based on configured intensity.

        - LOW: 1 vector chosen at random.
        - MODERATE: 1 vector chosen at random (executed with jitter).
        - AGGRESSIVE: 2 distinct vectors in combination.
        - CHAOS_BARRAGE: All available vectors in cascading succession.
        """
        all_vector_ids = list(cls.VECTOR_CATALOG.keys())
        if allowed_vectors:
            valid_allowed = [v for v in allowed_vectors if v in cls.VECTOR_CATALOG]
            pool = valid_allowed if valid_allowed else all_vector_ids
        else:
            pool = all_vector_ids

        norm_intensity = (intensity or "MODERATE").upper()

        if norm_intensity == "LOW":
            return [random.choice(pool)]
        elif norm_intensity == "MODERATE":
            return [random.choice(pool)]
        elif norm_intensity == "AGGRESSIVE":
            sample_size = min(2, len(pool))
            return random.sample(pool, sample_size)
        elif norm_intensity == "CHAOS_BARRAGE":
            return list(pool)
        else:
            return [random.choice(pool)]

    @classmethod
    def execute_monkey_strike(
        cls,
        workspace: DisposableWorkspace,
        vector_ids: List[str],
        jitter_ms: int = 0,
    ) -> Dict[str, Any]:
        """Execute selected monkey attack vectors inside an isolated DisposableWorkspace.

        Guarantees:
        - Workspace filesystem isolation is strictly enforced.
        - Canonical root demo_app/ is never modified.
        - Structured metadata with reproduction test commands is returned.
        """
        strike_id = f"STRIKE-{uuid.uuid4().hex[:8].upper()}"
        start_time = datetime.utcnow()

        # Apply optional randomized jitter before striking
        if jitter_ms > 0:
            delay = min(jitter_ms, 5000) / 1000.0
            time.sleep(delay)

        applied_vectors = []
        affected_files = set()
        reproduction_filters = []
        injection_details = []
        candidate_repairs = []

        policy = getattr(workspace, "policy", None) or FilesystemSecurityPolicy(
            workspace_root=workspace.workspace_dir
        )

        for vid in vector_ids:
            entry = cls.VECTOR_CATALOG.get(vid)
            if not entry:
                continue

            plugin: FaultPlugin = entry["plugin_class"]()
            target_file = entry["target_file"]

            # Security check before injection
            if not policy.is_path_allowed(target_file):
                raise PermissionError(f"Security policy blocked strike on {target_file}")

            # Inject the fault into isolated sandbox workspace
            data = plugin.inject(workspace)
            existing = workspace.read_file(target_file)
            if existing and f"# MONKEY_STRIKE_ACTIVE:{vid}" not in existing:
                workspace.write_file(target_file, existing.rstrip() + f"\n# MONKEY_STRIKE_ACTIVE:{vid}\n")

            applied_vectors.append(vid)
            affected_files.add(target_file)
            reproduction_filters.append(plugin.get_verification_test_filter())
            injection_details.append({
                "vector_id": vid,
                "name": entry["info"].name,
                "target_file": target_file,
                "data": data,
            })
            candidate_repairs.append(plugin.get_candidate_repair())

        # Construct combined reproduction filter
        combined_filter = " or ".join(reproduction_filters) if reproduction_filters else "test_service"

        # Combine candidate diffs if multiple vectors were injected
        combined_diff = "\n".join([r["diff"].strip() for r in candidate_repairs if "diff" in r])
        combined_explanation = " | ".join([r["explanation"] for r in candidate_repairs if "explanation" in r])
        combined_risk = " | ".join([r["risk_summary"] for r in candidate_repairs if "risk_summary" in r])

        return {
            "strike_id": strike_id,
            "applied_vectors": applied_vectors,
            "affected_files": sorted(list(affected_files)),
            "reproduction_filter": combined_filter,
            "reproduction_command": f"pytest -k '{combined_filter}'",
            "jitter_ms": jitter_ms,
            "timestamp": start_time.isoformat(),
            "details": injection_details,
            "candidate_repair": {
                "diff": combined_diff,
                "explanation": combined_explanation,
                "risk_summary": combined_risk,
            },
        }
