#!/usr/bin/env python3
"""Live smoke test for NVIDIA NIM inference integration.

Reads configuration from .env and verifies genuine connectivity and
response generation against the NVIDIA integrate API.
"""
import sys
import os
import time
import json
from pathlib import Path

# Add backend directory to sys.path so config can be imported
backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.providers.nvidia_nim import NvidiaNIMProvider


def mask_key(key: str) -> str:
    """Mask key for display so secrets are never printed."""
    if not key or len(key) < 12:
        return "[REDACTED]"
    return f"{key[:6]}...{key[-4:]}"


def main():
    print("=" * 60)
    print("CHAOSPATCH — NVIDIA NIM Live Smoke Test")
    print("=" * 60)

    api_key = settings.nvidia_api_key
    model_id = settings.effective_nvidia_model
    base_url = settings.nvidia_base_url
    timeout = settings.nvidia_timeout_seconds

    print(f"Target Base URL : {base_url}")
    print(f"Configured Model: {model_id}")
    print(f"Read Timeout    : {timeout}s")
    print(f"Credentials     : {'Configured (' + mask_key(api_key) + ')' if api_key else 'MISSING'}")
    print("-" * 60)

    if not api_key:
        print("ERROR: NVIDIA_API_KEY is not set in backend environment or .env file.")
        sys.exit(1)

    provider = NvidiaNIMProvider()

    # Step 1: Health Check (Ping)
    print("\n[Step 1/2] Testing API connectivity via health check...")
    start_t = time.time()
    try:
        health = provider.health_check()
        duration = time.time() - start_t
        print(f"Health Check Result: {'SUCCESS' if health.get('connected') else 'FAILED'} ({duration:.2f}s)")
        print(f"Details: {json.dumps(health, indent=2)}")
    except Exception as e:
        print(f"Health Check Failed: {e}")

    # Step 2: Live AI Diagnosis & Patch Generation
    print("\n[Step 2/2] Testing structured diagnosis & patch generation...")
    scenario_id = "smoke_test_001"
    evidence_text = (
        "EVID-001-001 (CRITICAL): Traceback (most recent call last):\n"
        '  File "service.py", line 42, in get_rate\n'
        "ZeroDivisionError: division by zero"
    )
    source_context = (
        "def get_rate(total, count):\n"
        "    # Missing guard for count == 0\n"
        "    return total / count\n"
    )

    start_diag = time.time()
    try:
        result = provider.generate_diagnosis_and_patch(
            scenario_id=scenario_id,
            evidence_text=evidence_text,
            source_context=source_context,
        )
        diag_duration = time.time() - start_diag
        print(f"\nLive Inference SUCCESS ({diag_duration:.2f}s)!")
        print(f"Provider Label      : {result.provider}")
        print(f"Incident Title      : {result.title}")
        print(f"Root Cause          : {result.root_cause}")
        print(f"Confidence Score    : {result.confidence * 100:.1f}%")
        print(f"AI-Generated Flag   : {result.is_ai_generated}")
        print(f"Proposed Patch Diff :\n{result.proposed_patch_diff or '[Empty diff]'}")
        print("\nSmoke test completed successfully!")
        sys.exit(0)
    except Exception as err:
        diag_duration = time.time() - start_diag
        print(f"\nLive Inference FAILED ({diag_duration:.2f}s): {err}")
        print("\nNote: Upstream models on NVIDIA's public cluster may experience intermittent")
        print("gateway timeouts or queueing under high load. Check model status at build.nvidia.com.")
        sys.exit(1)


if __name__ == "__main__":
    main()
