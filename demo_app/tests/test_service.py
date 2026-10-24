"""Automated tests for demo_app OrderProcessingService."""
import pytest
import httpx
from demo_app.config import AppConfig
from demo_app.client import DownstreamClient, DownstreamServiceError
from demo_app.service import OrderProcessingService


# --- Standard Baseline Fixtures ---

@pytest.fixture
def valid_env():
    return {
        "INVENTORY_API_URL": "http://inventory.internal:8080",
        "DOWNSTREAM_TIMEOUT_SECONDS": "2.0",
        "MAX_RETRIES": "1",
    }


@pytest.fixture
def mock_valid_response():
    def handler(request: httpx.Request):
        return httpx.Response(
            200,
            json={
                "data": {
                    "item_id": "SKU-100",
                    "pricing": {
                        "unit_price": 49.99,
                        "currency": "USD"
                    }
                }
            }
        )
    return httpx.MockTransport(handler)


# --- Baseline Test Suite ---

def test_baseline_health_check(valid_env):
    """Test 1: Health check succeeds when configuration is valid."""
    config = AppConfig(env_dict=valid_env)
    service = OrderProcessingService(config=config)
    health = service.health_check()
    assert health["status"] == "healthy"
    assert health["inventory_url"] == "http://inventory.internal:8080"


def test_baseline_order_processing(valid_env, mock_valid_response):
    """Test 2: Normal order processing succeeds with valid downstream response."""
    config = AppConfig(env_dict=valid_env)
    service = OrderProcessingService(config=config)
    result = service.process_order("ORD-1", "SKU-100", mock_transport=mock_valid_response)
    assert result["status"] == "CONFIRMED"
    assert result["unit_price"] == 49.99
    assert result["currency"] == "USD"


# --- Scenario 1 Verification Check: Missing Env Config Resilience ---

def test_config_resilience_missing_env():
    """Scenario 1 Check: Application must gracefully handle missing INVENTORY_API_URL.
    
    A resilient application will provide a safe default (e.g. 'http://localhost:8080' or fallback)
    or cleanly validate configuration instead of crashing with unhandled KeyError.
    """
    empty_env = {}
    config = AppConfig(env_dict=empty_env)
    service = OrderProcessingService(config=config)
    
    # In vulnerable code: raises KeyError
    # In repaired code: returns healthy or provides safe default URL
    health = service.health_check()
    assert health["status"] in ("healthy", "degraded")
    assert "inventory_url" in health
    assert health["inventory_url"] is not None


# --- Scenario 2 Verification Check: Downstream Timeout & Error Resilience ---

def test_downstream_timeout_resilience(valid_env):
    """Scenario 2 Check: Application must handle downstream timeout/stall gracefully.
    
    A resilient client enforces a bounded timeout and catches httpx.TimeoutException
    raising a clean DownstreamServiceError or returning a fallback.
    """
    def slow_handler(request: httpx.Request):
        import time
        # Simulate delay exceeding bounded threshold or timeout
        raise httpx.ReadTimeout("Downstream service timed out after 2.0s")

    slow_transport = httpx.MockTransport(slow_handler)
    client = DownstreamClient(base_url="http://inventory.internal", timeout=1.0)
    
    # Must cleanly raise DownstreamServiceError rather than unhandled raw socket/read timeout
    with pytest.raises(DownstreamServiceError):
        client.fetch_item_inventory("SKU-SLOW", mock_transport=slow_transport)


# --- Scenario 3 Verification Check: Malformed Upstream Response Resilience ---

def test_malformed_response_handling(valid_env):
    """Scenario 3 Check: Application must defensively parse upstream payloads.
    
    Upstream payload missing 'data' or nested 'pricing' should be caught and
    handled safely with default/zero pricing or DownstreamServiceError,
    never crashing with unhandled KeyError.
    """
    client = DownstreamClient(base_url="http://inventory.internal")
    
    # Malformed upstream response without nested data envelope
    malformed_payload = {
        "status": "ok",
        "unit_price": "29.99",
        "currency": "EUR"
    }
    
    # Should safely parse or handle the alternate/flat format
    parsed = client.parse_pricing_payload(malformed_payload)
    assert parsed["unit_price"] == 29.99
    assert parsed["currency"] == "EUR"
