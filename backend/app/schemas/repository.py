"""Pydantic schemas for Universal Public GitHub Repository Mode.

All response schemas are the single source of truth for the API contract.
Frontend TypeScript types and backend orchestrator return dicts MUST match exactly.
"""
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────
# Request schemas
# ─────────────────────────────────────────────────────────────────────

class RepoIntakeRequest(BaseModel):
    repo_url: str = Field(..., description="Public GitHub repository HTTPS URL")
    project_root: Optional[str] = Field(default="/", description="Sub-path for monorepos")
    target_branch: Optional[str] = Field(default=None, description="Optional branch or commit SHA")


class RepoBaselineRequest(BaseModel):
    experiment_id: int
    test_filter: Optional[str] = None


class RepoPatchVerifyRequest(BaseModel):
    experiment_id: int
    patch_diff: Optional[str] = Field(default=None, description="Unified diff to apply; uses latest repair if omitted")


class RepoPublishRequest(BaseModel):
    experiment_id: int
    github_token: str = Field(..., description="GitHub PAT with repo/push scope")
    branch_name: Optional[str] = Field(default=None, description="Dedicated repair branch name")
    commit_message: Optional[str] = Field(default=None, description="Commit message for repair branch")


# ─────────────────────────────────────────────────────────────────────
# Response schemas — these define the exact API contract
# ─────────────────────────────────────────────────────────────────────

class DetectedProjectCapability(BaseModel):
    language: str = "Unknown"
    can_detect: bool = True
    can_prepare_deps: bool = False
    can_run_tests: bool = False
    isolation_mode: str = "DOCKER"
    notes: Optional[str] = None


class ProjectInspectionResult(BaseModel):
    experiment_id: int
    repo_url: str
    owner: str
    name: str
    canonical_id: str
    default_branch: str
    base_commit_sha: str
    is_public: bool = True
    detected_languages: List[str]
    primary_language: str
    detected_frameworks: List[str]
    manifest_files: List[str]
    test_framework: Optional[str] = None
    test_command: Optional[str] = None
    possible_project_roots: List[str] = ["/"]
    is_monorepo: bool = False
    capabilities: DetectedProjectCapability
    status: str = "INSPECTED"


class RepoBaselineResponse(BaseModel):
    """Baseline execution result.

    baseline_status values:
      FAILURE_REPRODUCED          — tests ran and failed (failure confirmed)
      BASELINE_PASSED             — tests ran and passed (no pre-existing failure)
      UNSUPPORTED_TEST_ENVIRONMENT— stack not supported; tests never ran
      DOCKER_UNAVAILABLE          — Docker daemon not reachable; tests never ran

    output_excerpt combines sanitized stdout + stderr in one field for the UI.
    evidence_count is the total Evidence rows recorded for this experiment.
    """
    experiment_id: int
    baseline_status: Literal[
        "FAILURE_REPRODUCED",
        "BASELINE_PASSED",
        "UNSUPPORTED_TEST_ENVIRONMENT",
        "DOCKER_UNAVAILABLE",
    ]
    exit_code: int
    test_command: str
    duration_ms: int
    output_excerpt: str          # combined stdout + stderr, sanitized
    evidence_count: int
    failing_tests: List[str] = []
    message: str


class RepoPatchVerifyResponse(BaseModel):
    """Post-patch independent verification result.

    verification_status values:
      VERIFIED     — tests ran and passed after patch was applied
      FAILED       — tests ran and failed after patch was applied
      REJECTED     — patch was empty, placeholder, or failed safety validation
      INCONCLUSIVE — Docker unavailable; tests did not execute; no verdict possible
    """
    experiment_id: int
    verification_status: Literal["VERIFIED", "FAILED", "REJECTED", "INCONCLUSIVE"]
    patch_valid: bool
    target_failure_resolved: bool
    regressions_detected: bool
    exit_code: int
    duration_ms: int
    test_output_excerpt: str     # sanitized terminal output from independent re-test
    diff_hash: Optional[str] = None
    summary: str = ""


class RepoPublishResponse(BaseModel):
    experiment_id: int
    status: Literal[
        "PUBLISHED",
        "PUBLISH_AUTH_REQUIRED",
        "FORBIDDEN_BRANCH",
        "BASE_COMMIT_MISMATCH",
        "PUSH_FAILED",
    ]
    published_branch: Optional[str] = None
    commit_sha: Optional[str] = None
    remote_branch_url: Optional[str] = None
    message: str = ""


class PatchExportResponse(BaseModel):
    experiment_id: int
    filename: str
    base_commit: str
    patch_diff: str
