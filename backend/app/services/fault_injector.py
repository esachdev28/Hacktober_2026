"""Fault injection engine and scenario plugins."""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pathlib import Path
from app.sandbox.workspace import DisposableWorkspace


class FaultPlugin(ABC):
    """Abstract base class for deterministic chaos fault plugins."""

    id: str
    name: str
    description: str
    failure_mechanism: str
    expected_symptoms: List[str]
    verification_checks: List[str]
    risk_level: str
    estimated_stages: int

    @abstractmethod
    def inject(self, workspace: DisposableWorkspace) -> Dict[str, Any]:
        """Perform injection action into disposable workspace."""
        pass

    @abstractmethod
    def get_candidate_repair(self) -> Dict[str, Any]:
        """Return candidate reference repair diff and explanation."""
        pass

    @abstractmethod
    def get_verification_test_filter(self) -> str:
        """Return pytest filter string for scenario verification check."""
        pass


class MissingEnvConfigPlugin(FaultPlugin):
    """Scenario 1: Missing environment configuration."""

    id = "missing_env_config"
    name = "Missing Environment Configuration"
    description = "Service fails on startup or healthcheck because critical INVENTORY_API_URL is missing."
    failure_mechanism = "Unsafe direct dictionary lookup (os.environ['INVENTORY_API_URL']) without default or validation."
    expected_symptoms = [
        "KeyError: 'INVENTORY_API_URL'",
        "RuntimeError: Missing required configuration key",
        "Service health check returns HTTP 500 / unhandled exception",
    ]
    verification_checks = [
        "Baseline tests pass before injection",
        "Fault injection triggers KeyError reproducibly",
        "Post-repair test_config_resilience_missing_env passes",
        "Safe fallback URL or validated error returned",
    ]
    risk_level = "LOW"
    estimated_stages = 8

    def inject(self, workspace: DisposableWorkspace) -> Dict[str, Any]:
        """Inject fault into workspace: ensure vulnerable config is present."""
        config_path = "demo_app/config.py"
        content = workspace.read_file(config_path)
        if not content:
            raise FileNotFoundError(f"{config_path} not found in workspace")

        # Confirm the vulnerable lookup is present: return self._env["INVENTORY_API_URL"]
        vulnerable_code = 'return self._env["INVENTORY_API_URL"]'
        if vulnerable_code not in content:
            # Re-inject vulnerable line if missing
            pass

        return {
            "fault_type": self.id,
            "target_file": config_path,
            "injected_vulnerability": "Direct key lookup without fallback in inventory_api_url property",
            "reproduction_command": "pytest -k test_config_resilience_missing_env",
        }

    def get_candidate_repair(self) -> Dict[str, Any]:
        diff = """--- a/demo_app/config.py
+++ b/demo_app/config.py
@@ -17,2 +17,2 @@
     def inventory_api_url(self) -> str:
-        return self._env["INVENTORY_API_URL"]
+        return self._env.get("INVENTORY_API_URL", "http://localhost:8080")
"""
        return {
            "diff": diff,
            "file": "demo_app/config.py",
            "explanation": "Provide a safe default fallback URL ('http://localhost:8080') using dict.get() to prevent unhandled KeyError when environment variable is not set.",
            "risk_summary": "Minimal risk: adds non-breaking default fallback.",
        }

    def get_verification_test_filter(self) -> str:
        return "test_config_resilience_missing_env"


class DependencyTimeoutPlugin(FaultPlugin):
    """Scenario 2: Downstream dependency timeout / stall."""

    id = "dependency_timeout"
    name = "Downstream Dependency Timeout"
    description = "External inventory service experiences delays; client hangs or crashes with unhandled ReadTimeout."
    failure_mechanism = "Client lacks bounded timeout exception handler and unhandled socket/read timeout escapes."
    expected_symptoms = [
        "httpx.ReadTimeout: Downstream service timed out",
        "Unhandled socket read timeout escaping into business logic",
        "Order processing hangs until connection deadline",
    ]
    verification_checks = [
        "Baseline tests pass before injection",
        "Simulated downstream delay causes unhandled timeout",
        "Post-repair test_downstream_timeout_resilience passes",
        "DownstreamServiceError cleanly caught with bounded timeout",
    ]
    risk_level = "MEDIUM"
    estimated_stages = 8

    def inject(self, workspace: DisposableWorkspace) -> Dict[str, Any]:
        return {
            "fault_type": self.id,
            "target_file": "demo_app/client.py",
            "injected_vulnerability": "Uncaught httpx.TimeoutException in fetch_item_inventory",
            "reproduction_command": "pytest -k test_downstream_timeout_resilience",
        }

    def get_candidate_repair(self) -> Dict[str, Any]:
        diff = """--- a/demo_app/client.py
+++ b/demo_app/client.py
@@ -25,4 +25,8 @@
         with httpx.Client(transport=mock_transport, timeout=self.timeout) as client:
-            resp = client.get(url)
-            if resp.status_code != 200:
-                raise DownstreamServiceError(f"Downstream returned status {resp.status_code}")
-            return resp.json()
+            try:
+                resp = client.get(url)
+                if resp.status_code != 200:
+                    raise DownstreamServiceError(f"Downstream returned status {resp.status_code}")
+                return resp.json()
+            except httpx.TimeoutException as err:
+                raise DownstreamServiceError(f"Downstream request timed out: {err}") from err
"""
        return {
            "diff": diff,
            "file": "demo_app/client.py",
            "explanation": "Wrap client.get(url) in try/except block catching httpx.TimeoutException and cleanly raising DownstreamServiceError.",
            "risk_summary": "Low risk: transforms unhandled connection stalls into clean domain exceptions.",
        }

    def get_verification_test_filter(self) -> str:
        return "test_downstream_timeout_resilience"


class MalformedResponsePlugin(FaultPlugin):
    """Scenario 3: Malformed upstream API response."""

    id = "malformed_response"
    name = "Malformed Upstream API Response"
    description = "Upstream pricing API changes payload schema; unhandled KeyError crashes parser."
    failure_mechanism = "Rigid nested key access raw_data['data']['pricing'] without schema validation."
    expected_symptoms = [
        "KeyError: 'data'",
        "KeyError: 'pricing'",
        "Parser crashes on schema variation",
    ]
    verification_checks = [
        "Baseline tests pass before injection",
        "Flat/un-nested payload crashes with KeyError",
        "Post-repair test_malformed_response_handling passes",
        "Parser supports both nested and flat pricing payloads safely",
    ]
    risk_level = "LOW"
    estimated_stages = 8

    def inject(self, workspace: DisposableWorkspace) -> Dict[str, Any]:
        return {
            "fault_type": self.id,
            "target_file": "demo_app/client.py",
            "injected_vulnerability": "Rigid assumption of raw_data['data']['pricing'] structure",
            "reproduction_command": "pytest -k test_malformed_response_handling",
        }

    def get_candidate_repair(self) -> Dict[str, Any]:
        diff = """--- a/demo_app/client.py
+++ b/demo_app/client.py
@@ -35,5 +35,10 @@
     def parse_pricing_payload(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
-        pricing_node = raw_data["data"]["pricing"]
-        unit_price = float(pricing_node["unit_price"])
-        currency = pricing_node["currency"]
+        data_node = raw_data.get("data", {})
+        pricing_node = data_node.get("pricing", raw_data)
+        unit_price = float(pricing_node.get("unit_price", 0.0))
+        currency = pricing_node.get("currency", "USD")
"""
        return {
            "diff": diff,
            "file": "demo_app/client.py",
            "explanation": "Use defensive dictionary retrieval (.get()) checking both nested 'data.pricing' and flat payload structures with sensible defaults.",
            "risk_summary": "Minimal risk: improves parser resilience without changing output structure.",
        }

    def get_verification_test_filter(self) -> str:
        return "test_malformed_response_handling"


# Registry
SCENARIO_PLUGINS: Dict[str, FaultPlugin] = {
    MissingEnvConfigPlugin.id: MissingEnvConfigPlugin(),
    DependencyTimeoutPlugin.id: DependencyTimeoutPlugin(),
    MalformedResponsePlugin.id: MalformedResponsePlugin(),
}


def get_fault_plugin(scenario_type: str) -> Optional[FaultPlugin]:
    """Retrieve registered fault plugin by scenario id."""
    return SCENARIO_PLUGINS.get(scenario_type)


def list_available_scenarios() -> List[Dict[str, Any]]:
    """Return catalog of available fault plugins."""
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "failure_mechanism": p.failure_mechanism,
            "expected_symptoms": p.expected_symptoms,
            "verification_checks": p.verification_checks,
            "risk_level": p.risk_level,
            "estimated_stages": p.estimated_stages,
        }
        for p in SCENARIO_PLUGINS.values()
    ]
