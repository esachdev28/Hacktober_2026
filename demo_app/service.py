"""Target Demo Application: Main Service Orchestrator."""
import logging
from typing import Dict, Any, Optional
from demo_app.config import AppConfig
from demo_app.client import DownstreamClient, DownstreamServiceError

logger = logging.getLogger("demo_app")


class OrderProcessingService:
    """Core order processing service for demo application.
    
    This service depends on AppConfig and DownstreamClient.
    It demonstrates 3 realistic production failure modes:
    1. Config resolution failure (Missing env var without safe fallback)
    2. Downstream dependency timeout/stall
    3. Upstream API response malformed/schema drift
    """

    def __init__(self, config: Optional[AppConfig] = None):
        self.config = config or AppConfig()
        self._client: Optional[DownstreamClient] = None

    @property
    def client(self) -> DownstreamClient:
        if self._client is None:
            # Note: config.inventory_api_url will raise KeyError if not configured
            base_url = self.config.inventory_api_url
            self._client = DownstreamClient(
                base_url=base_url,
                timeout=self.config.downstream_timeout_seconds,
                max_retries=self.config.max_retries,
            )
        return self._client

    def health_check(self) -> Dict[str, Any]:
        """Perform a basic service readiness and health check."""
        try:
            # Validates configuration access
            url = self.config.inventory_api_url
            return {
                "status": "healthy",
                "service": self.config.service_name,
                "inventory_url": url,
            }
        except KeyError as err:
            logger.error(f"Health check failed: Missing required configuration {err}")
            raise RuntimeError(f"Missing required configuration key: {err}") from err

    def process_order(self, order_id: str, item_id: str, mock_transport=None) -> Dict[str, Any]:
        """Process an order by checking inventory and parsing pricing."""
        # 1. Check configuration
        inventory_url = self.config.inventory_api_url
        
        # 2. Fetch inventory (vulnerable to downstream timeout)
        inventory = self.client.fetch_item_inventory(item_id, mock_transport=mock_transport)
        
        # 3. Parse pricing (vulnerable to malformed payload)
        pricing = self.client.parse_pricing_payload(inventory)
        
        return {
            "order_id": order_id,
            "item_id": item_id,
            "status": "CONFIRMED",
            "unit_price": pricing["unit_price"],
            "currency": pricing["currency"],
        }
