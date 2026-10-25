"""Pydantic schemas for API request/response validation."""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# === Experiment Schemas ===

class ExperimentCreate(BaseModel):
    scenario_type: str = Field(..., description="One of: missing_env_config, dependency_timeout, malformed_response")
    target_environment: str = Field(default="SANDBOX")


class ExperimentResponse(BaseModel):
    id: int
    scenario_type: str
    status: str
    target_environment: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    baseline_passed: Optional[bool] = None
    final_verified: Optional[bool] = None
    failure_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExperimentListResponse(BaseModel):
    experiments: List[ExperimentResponse]
    total: int


# === Incident Schemas ===

class IncidentResponse(BaseModel):
    id: int
    experiment_id: int
    title: str
    description: Optional[str] = None
    severity: str
    root_cause: Optional[str] = None
    confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# === Evidence Schemas ===

class EvidenceResponse(BaseModel):
    id: int
    experiment_id: int
    incident_id: Optional[int] = None
    evidence_type: str
    severity: str
    source: str
    content: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# === Repair Schemas ===

class RepairAttemptResponse(BaseModel):
    id: int
    experiment_id: int
    attempt_number: int
    diagnosis: Optional[str] = None
    patch_diff: Optional[str] = None
    patch_status: str
    validation_status: Optional[str] = None
    verification_status: Optional[str] = None
    risk_summary: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# === Verification Schemas ===

class VerificationRunResponse(BaseModel):
    id: int
    experiment_id: int
    repair_attempt_id: Optional[int] = None
    check_name: str
    status: str
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    duration_ms: Optional[int] = None
    output: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# === Event Schemas ===

class ExperimentEventResponse(BaseModel):
    id: int
    experiment_id: int
    event_type: str
    message: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# === Scenario Schemas ===

class ScenarioInfo(BaseModel):
    id: str
    name: str
    description: str
    failure_mechanism: str
    expected_symptoms: List[str]
    verification_checks: List[str]
    risk_level: str
    estimated_stages: int


# === Dashboard Schemas ===

class DashboardSummary(BaseModel):
    total_experiments: int = 0
    successful_recoveries: int = 0
    failed_recoveries: int = 0
    verification_rate: Optional[float] = None
    avg_recovery_time_ms: Optional[float] = None
    recent_experiments: List[ExperimentResponse] = []
    scenario_distribution: Dict[str, int] = {}


# === Settings Schemas ===

class SettingsResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_id: str
    provider: str
    inference_endpoint: str
    has_credentials: bool
    max_repair_attempts: int
    experiment_timeout_seconds: int
    model_temperature: float
    model_max_tokens: int
    database_status: str
    backend_version: str = "0.1.0"
    environment: str


class InferenceTestResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    success: bool
    message: str
    latency_ms: Optional[int] = None
    model_id: Optional[str] = None
    error: Optional[str] = None


# === Report Schemas ===

class ExperimentReport(BaseModel):
    experiment: ExperimentResponse
    incident: Optional[IncidentResponse] = None
    evidence: List[EvidenceResponse] = []
    repair_attempts: List[RepairAttemptResponse] = []
    verification_runs: List[VerificationRunResponse] = []
    events: List[ExperimentEventResponse] = []
    summary: Dict[str, Any] = {}


# === Health Schemas ===

class HealthResponse(BaseModel):
    status: str
    version: str = "0.1.0"
    database: str = "unknown"
    inference: str = "unknown"
    # Docker sandbox availability — False on Render free tier (no daemon)
    docker_available: bool = False
    docker_host: Optional[str] = None  # active DOCKER_HOST override, if any


class ReadyResponse(BaseModel):
    ready: bool
    checks: Dict[str, bool] = {}


# === Monkey Chaos Schemas ===
from app.schemas.monkey import (
    MonkeyVectorInfo,
    MonkeyConfig,
    MonkeyLaunchResponse,
    MonkeyStatusResponse,
    MonkeyVectorsCatalogResponse,
)

