"""Pydantic schemas for Monkey Chaos autonomous fault injection."""
from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class MonkeyVectorInfo(BaseModel):
    """Catalog metadata for a single monkey fault vector."""
    id: str = Field(..., description="Unique vector identifier")
    name: str = Field(..., description="Human-readable vector name")
    target_layer: str = Field(..., description="Target architectural layer (Configuration, Network, API)")
    failure_mechanism: str = Field(..., description="How the fault induces failure")
    risk_level: str = Field(..., description="Operational risk (LOW, MEDIUM, HIGH)")
    default_weight: float = Field(1.0, description="Selection weight for stochastic strikes")


class MonkeyConfig(BaseModel):
    """Configuration payload for launching an autonomous Monkey strike."""
    target_environment: Literal["DOCKER_SANDBOX", "LOCAL_PROCESS"] = Field(
        default="DOCKER_SANDBOX",
        description="Target sandbox environment for isolated execution"
    )
    target_path: str = Field(
        default="demo_app",
        description="Workspace subpath targeted for injection"
    )
    attack_vectors: List[str] = Field(
        default_factory=lambda: ["monkey_config_drop", "monkey_network_stall", "monkey_payload_scramble"],
        description="Subset of allowed attack vectors"
    )
    intensity: Literal["LOW", "MODERATE", "AGGRESSIVE", "CHAOS_BARRAGE"] = Field(
        default="MODERATE",
        description="Strike intensity controlling vector count and cascading behavior"
    )
    auto_repair: bool = Field(
        default=True,
        description="Whether to automatically approve and verify AI-generated repair patch"
    )
    jitter_ms: int = Field(
        default=0,
        ge=0,
        le=5000,
        description="Optional randomized pre-injection latency jitter in milliseconds"
    )
    max_duration_seconds: int = Field(
        default=180,
        ge=10,
        le=600,
        description="Maximum experiment runtime before timeout"
    )


class MonkeyLaunchResponse(BaseModel):
    """Response returned upon launching a Monkey Chaos strike."""
    experiment_id: int
    status: str = "LAUNCHED"
    planned_vectors: List[str]
    intensity: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    message: str


class MonkeyStatusResponse(BaseModel):
    """Real-time execution status of an active or completed Monkey strike."""
    experiment_id: int
    state: str
    active_vector: Optional[str] = None
    logs: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)


class MonkeyVectorsCatalogResponse(BaseModel):
    """Response containing available monkey vectors and intensities."""
    vectors: List[MonkeyVectorInfo]
    intensities: List[str] = ["LOW", "MODERATE", "AGGRESSIVE", "CHAOS_BARRAGE"]
