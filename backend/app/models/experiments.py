"""SQLAlchemy models for CHAOSPATCH."""
import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    ForeignKey, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from app.db.database import Base


class ExperimentStatus(str, enum.Enum):
    CREATED = "CREATED"
    BASELINING = "BASELINING"
    INJECTING = "INJECTING"
    OBSERVING = "OBSERVING"
    DIAGNOSING = "DIAGNOSING"
    PATCH_REVIEW = "PATCH_REVIEW"
    APPLYING = "APPLYING"
    VERIFYING = "VERIFYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMED_OUT = "TIMED_OUT"
    PATCH_REJECTED = "PATCH_REJECTED"
    VERIFICATION_FAILED = "VERIFICATION_FAILED"
    AI_UNAVAILABLE = "AI_UNAVAILABLE"


class ScenarioType(str, enum.Enum):
    MISSING_ENV_CONFIG = "missing_env_config"
    DEPENDENCY_TIMEOUT = "dependency_timeout"
    MALFORMED_RESPONSE = "malformed_response"


class EvidenceType(str, enum.Enum):
    LOG = "log"
    STACK_TRACE = "stack_trace"
    TEST_RESULT = "test_result"
    CONFIG_METADATA = "config_metadata"
    SOURCE_SNIPPET = "source_snippet"
    HEALTH_CHECK = "health_check"
    FAULT_INJECTION = "fault_injection"
    HTTP_RESPONSE = "http_response"
    PATCH_VALIDATION = "patch_validation"
    VERIFICATION_RESULT = "verification_result"


class PatchStatus(str, enum.Enum):
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    APPLIED = "APPLIED"
    FAILED = "FAILED"


class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    ERROR = "ERROR"
    SKIPPED = "SKIPPED"


class Severity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


# Valid state transitions
VALID_TRANSITIONS = {
    ExperimentStatus.CREATED: {ExperimentStatus.BASELINING, ExperimentStatus.CANCELLED},
    ExperimentStatus.BASELINING: {ExperimentStatus.INJECTING, ExperimentStatus.FAILED, ExperimentStatus.CANCELLED},
    ExperimentStatus.INJECTING: {ExperimentStatus.OBSERVING, ExperimentStatus.FAILED, ExperimentStatus.CANCELLED},
    ExperimentStatus.OBSERVING: {ExperimentStatus.DIAGNOSING, ExperimentStatus.FAILED, ExperimentStatus.CANCELLED, ExperimentStatus.TIMED_OUT},
    ExperimentStatus.DIAGNOSING: {ExperimentStatus.PATCH_REVIEW, ExperimentStatus.FAILED, ExperimentStatus.AI_UNAVAILABLE, ExperimentStatus.CANCELLED, ExperimentStatus.TIMED_OUT},
    ExperimentStatus.PATCH_REVIEW: {ExperimentStatus.APPLYING, ExperimentStatus.PATCH_REJECTED, ExperimentStatus.CANCELLED},
    ExperimentStatus.APPLYING: {ExperimentStatus.VERIFYING, ExperimentStatus.FAILED, ExperimentStatus.CANCELLED},
    ExperimentStatus.VERIFYING: {ExperimentStatus.COMPLETED, ExperimentStatus.VERIFICATION_FAILED, ExperimentStatus.FAILED, ExperimentStatus.TIMED_OUT},
    # Terminal states - no transitions out
    ExperimentStatus.COMPLETED: set(),
    ExperimentStatus.FAILED: set(),
    ExperimentStatus.CANCELLED: set(),
    ExperimentStatus.TIMED_OUT: set(),
    ExperimentStatus.PATCH_REJECTED: set(),
    ExperimentStatus.VERIFICATION_FAILED: set(),
    ExperimentStatus.AI_UNAVAILABLE: set(),
}


def is_terminal_status(status: ExperimentStatus) -> bool:
    """Check if a status is terminal (no further transitions)."""
    return len(VALID_TRANSITIONS.get(status, set())) == 0


def validate_transition(current: ExperimentStatus, target: ExperimentStatus) -> bool:
    """Validate a state transition."""
    return target in VALID_TRANSITIONS.get(current, set())


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_type = Column(String(150), nullable=False)
    status = Column(String(30), default=ExperimentStatus.CREATED.value, nullable=False)
    target_environment = Column(String(20), default="SANDBOX", nullable=False)
    
    # Public GitHub Repository Mode Fields
    repo_url = Column(String(255), nullable=True)
    repo_owner = Column(String(100), nullable=True)
    repo_name = Column(String(100), nullable=True)
    default_branch = Column(String(100), nullable=True)
    base_commit_sha = Column(String(40), nullable=True)
    detected_language = Column(String(50), nullable=True)
    detected_framework = Column(String(50), nullable=True)
    project_root = Column(String(255), default="/", nullable=True)
    publish_status = Column(String(30), nullable=True)
    published_branch = Column(String(100), nullable=True)
    published_commit_sha = Column(String(40), nullable=True)
    published_branch_url = Column(String(255), nullable=True)

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    baseline_passed = Column(Boolean, nullable=True)
    final_verified = Column(Boolean, nullable=True)
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    incidents = relationship("Incident", back_populates="experiment", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="experiment", cascade="all, delete-orphan")
    repair_attempts = relationship("RepairAttempt", back_populates="experiment", cascade="all, delete-orphan")
    verification_runs = relationship("VerificationRun", back_populates="experiment", cascade="all, delete-orphan")
    events = relationship("ExperimentEvent", back_populates="experiment", cascade="all, delete-orphan", order_by="ExperimentEvent.created_at")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default=Severity.ERROR.value)
    root_cause = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    experiment = relationship("Experiment", back_populates="incidents")
    evidence_items = relationship("Evidence", back_populates="incident")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    evidence_type = Column(String(30), nullable=False)
    severity = Column(String(20), default=Severity.INFO.value)
    source = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    experiment = relationship("Experiment", back_populates="evidence_items")
    incident = relationship("Incident", back_populates="evidence_items")


class RepairAttempt(Base):
    __tablename__ = "repair_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    attempt_number = Column(Integer, nullable=False)
    diagnosis = Column(Text, nullable=True)
    patch_diff = Column(Text, nullable=True)
    patch_status = Column(String(20), default=PatchStatus.PROPOSED.value)
    validation_status = Column(String(20), nullable=True)
    verification_status = Column(String(20), nullable=True)
    risk_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    experiment = relationship("Experiment", back_populates="repair_attempts")
    verification_runs = relationship("VerificationRun", back_populates="repair_attempt")


class VerificationRun(Base):
    __tablename__ = "verification_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    repair_attempt_id = Column(Integer, ForeignKey("repair_attempts.id"), nullable=True)
    check_name = Column(String(100), nullable=False)
    status = Column(String(20), default=VerificationStatus.PENDING.value)
    expected_result = Column(Text, nullable=True)
    actual_result = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    output = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    experiment = relationship("Experiment", back_populates="verification_runs")
    repair_attempt = relationship("RepairAttempt", back_populates="verification_runs")


class ExperimentEvent(Base):
    __tablename__ = "experiment_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    experiment = relationship("Experiment", back_populates="events")
