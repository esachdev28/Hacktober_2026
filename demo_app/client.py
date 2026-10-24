"""Target Demo Application: Downstream Client."""
import time
from typing import Dict, Any, Optional
import httpx


class DownstreamServiceError(Exception):
    """Raised when downstream call fails."""
    pass


class DownstreamClient:
    """Client for external inventory and pricing service."""

    def __init__(self, base_url: str, timeout: float = 10.0, max_retries: int = 1):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

    def fetch_item_inventory(self, item_id: str, mock_transport: Optional[httpx.BaseTransport] = None) -> Dict[str, Any]:
        """Fetch item inventory from downstream.
        
        Vulnerabilities:
        - Downstream timeout: Without a short bounded timeout or fallback handler,
          it can hang or raise unhandled httpx.TimeoutException / ReadTimeout.
        """
        url = f"{self.base_url}/inventory/{item_id}"
        
        # In vulnerable code: no defensive timeout catch or fallback handling
        with httpx.Client(transport=mock_transport, timeout=self.timeout) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                raise DownstreamServiceError(f"Downstream returned status {resp.status_code}")
            return resp.json()

    def parse_pricing_payload(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse pricing information from upstream API.
        
        Vulnerability: Assumes exact nested structure `{"data": {"pricing": {"unit_price": ...}}}`
        without validating missing keys or alternate structures, crashing with KeyError.
        """
        # Vulnerable parsing code:
        pricing_node = raw_data["data"]["pricing"]
        unit_price = float(pricing_node["unit_price"])
        currency = pricing_node["currency"]
        
        return {
            "unit_price": unit_price,
            "currency": currency,
            "available": True,
        }
