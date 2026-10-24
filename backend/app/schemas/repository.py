"""Pydantic schemas for Universal Public GitHub Repository Mode."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, HttpUrl


class RepoIntakeRequest(BaseModel):
    repo_url: str = Field(..., description="Public GitHub repository URL (e.g. https://github.com/owner/project)")
    project_root: Optional[str] = Field(default="/", description="Sub-path for monorepos")
    target_branch: Optional[str] = Field(default=None, description="Optional branch or commit SHA override")


class DetectedProjectCapability(BaseModel):
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


class RepoBaselineRequest(BaseModel):
    experiment_id: int
    test_filter: Optional[str] = None


class RepoBaselineResponse(BaseModel):
    experiment_id: int
    status: str  # FAILURE_REPRODUCED | BASELINE_PASSED | INCONCLUSIVE | UNSUPPORTED_TEST_ENVIRONMENT
    exit_code: int
    test_command: str
    duration_ms: int
    stdout_excerpt: str
    stderr_excerpt: str
    failing_tests: List[str] = []
    message: str


class RepoPatchVerifyRequest(BaseModel):
    experiment_id: int
    patch_diff: Optional[str] = None


class RepoPatchVerifyResponse(BaseModel):
    experiment_id: int
    verification_outcome: str  # VERIFIED | PARTIALLY_VERIFIED | FAILED | REJECTED | INCONCLUSIVE
    safety_validation_passed: bool
    validation_issues: List[str] = []
    baseline_failure_passed: bool
    regressions_detected: bool = False
    duration_ms: int
    diff_hash: str
    summary: str


class RepoPublishRequest(BaseModel):
    experiment_id: int
    github_token: str = Field(..., description="GitHub Personal Access Token with repo/push scope")
    branch_name: Optional[str] = Field(default=None, description="Custom branch name (defaults to chaospatch/repair-<exp_id>)")
    commit_message: Optional[str] = Field(default=None, description="Commit message for repair branch")


class RepoPublishResponse(BaseModel):
    experiment_id: int
    status: str  # PUBLISHED | PUBLISH_AUTH_REQUIRED | INSUFFICIENT_PERMISSIONS | PUSH_FAILED | ABORTED_BASE_DRIFT
    published_branch: Optional[str] = None
    commit_sha: Optional[str] = None
    remote_branch_url: Optional[str] = None
    message: str


class PatchExportResponse(BaseModel):
    experiment_id: int
    filename: str
    base_commit: str
    patch_diff: str
