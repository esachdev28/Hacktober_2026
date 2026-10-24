"""Scenario catalog endpoints."""
from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas import ScenarioInfo
from app.services.fault_injector import list_available_scenarios, get_fault_plugin

router = APIRouter(tags=["Scenarios"])


@router.get("/scenarios", response_model=List[ScenarioInfo])
def get_scenarios():
    """List all registered fault injection scenarios."""
    return list_available_scenarios()


@router.get("/scenarios/{scenario_id}", response_model=ScenarioInfo)
def get_scenario_by_id(scenario_id: str):
    """Retrieve detailed information about a specific scenario."""
    plugin = get_fault_plugin(scenario_id)
    if not plugin:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    return {
        "id": plugin.id,
        "name": plugin.name,
        "description": plugin.description,
        "failure_mechanism": plugin.failure_mechanism,
        "expected_symptoms": plugin.expected_symptoms,
        "verification_checks": plugin.verification_checks,
        "risk_level": plugin.risk_level,
        "estimated_stages": plugin.estimated_stages,
    }
