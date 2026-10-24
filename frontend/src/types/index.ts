export type ExperimentStatus =
  | 'CREATED'
  | 'BASELINING'
  | 'INJECTING'
  | 'OBSERVING'
  | 'DIAGNOSING'
  | 'PATCH_REVIEW'
  | 'APPLYING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'PATCH_REJECTED'
  | 'VERIFICATION_FAILED'
  | 'AI_UNAVAILABLE';

export interface Experiment {
  id: number;
  scenario_type: string;
  status: ExperimentStatus;
  target_environment: string;
  repo_url?: string | null;
  repo_owner?: string | null;
  repo_name?: string | null;
  default_branch?: string | null;
  base_commit_sha?: string | null;
  detected_language?: string | null;
  detected_framework?: string | null;
  project_root?: string | null;
  publish_status?: string | null;
  published_branch?: string | null;
  published_commit_sha?: string | null;
  published_branch_url?: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  baseline_passed: boolean | null;
  final_verified: boolean | null;
  failure_reason: string | null;
  created_at: string;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
  failure_mechanism: string;
  expected_symptoms: string[];
  verification_checks: string[];
  risk_level: string;
  estimated_stages: number;
}

export interface Incident {
  id: number;
  experiment_id: number;
  title: string;
  description: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  root_cause: string | null;
  confidence: number | null;
  created_at: string;
}

export interface EvidenceItem {
  id: number;
  experiment_id: number;
  incident_id?: number | null;
  evidence_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  content: string;
  metadata_json?: Record<string, any> | null;
  created_at: string;
}

export interface RepairAttempt {
  id: number;
  experiment_id: number;
  attempt_number: number;
  diagnosis: string | null;
  patch_diff: string | null;
  patch_status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'FAILED';
  validation_status: string | null;
  verification_status: string | null;
  risk_summary: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface VerificationRun {
  id: number;
  experiment_id: number;
  repair_attempt_id?: number | null;
  check_name: string;
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED';
  expected_result: string | null;
  actual_result: string | null;
  duration_ms: number | null;
  output: string | null;
  created_at: string;
}

export interface ExperimentEvent {
  id: number;
  experiment_id: number;
  event_type: string;
  message: string;
  metadata_json?: Record<string, any> | null;
  created_at: string;
}

export interface DashboardSummary {
  total_experiments: number;
  successful_recoveries: number;
  failed_recoveries: number;
  verification_rate: number | null;
  avg_recovery_time_ms: number | null;
  recent_experiments: Experiment[];
  scenario_distribution: Record<string, number>;
}

export interface SystemSettings {
  model_id: string;
  provider: string;
  inference_endpoint: string;
  has_credentials: boolean;
  max_repair_attempts: number;
  experiment_timeout_seconds: number;
  model_temperature: number;
  model_max_tokens: number;
  database_status: string;
  backend_version: string;
  environment: string;
}

export interface InferenceTestResult {
  success: boolean;
  message: string;
  latency_ms?: number | null;
  model_id?: string | null;
  error?: string | null;
}

export interface ExperimentReport {
  experiment: Experiment;
  incident?: Incident | null;
  evidence: EvidenceItem[];
  repair_attempts: RepairAttempt[];
  verification_runs: VerificationRun[];
  events: ExperimentEvent[];
  summary: Record<string, any>;
}

export interface DetectedProjectCapability {
  language: string;
  can_inspect: boolean;
  can_prepare_deps: boolean;
  can_run_tests: boolean;
  isolation_mode: string;
  notes?: string | null;
}

export interface ProjectInspectionResult {
  experiment_id: number;
  repo_url: string;
  owner: string;
  name: string;
  canonical_id: string;
  default_branch: string;
  base_commit_sha: string;
  is_public: boolean;
  detected_languages: string[];
  primary_language: string;
  detected_frameworks: string[];
  manifest_files: string[];
  test_framework?: string | null;
  test_command?: string | null;
  possible_project_roots: string[];
  is_monorepo: boolean;
  capabilities: DetectedProjectCapability;
  status: string;
}

export interface RepoBaselineResponse {
  experiment_id: number;
  baseline_status:
    | 'FAILURE_REPRODUCED'
    | 'BASELINE_PASSED'
    | 'UNSUPPORTED_TEST_ENVIRONMENT'
    | 'DOCKER_UNAVAILABLE';
  exit_code: number;
  test_command: string;
  duration_ms: number;
  output_excerpt: string;
  evidence_count: number;
  failing_tests: string[];
  message: string;
}

export interface RepoDiagnosisPatchResponse {
  experiment_id: number;
  repair_id: number;
  title: string;
  root_cause: string;
  confidence: number;
  proposed_patch_diff: string;
  explanation: string;
  risk_summary: string;
  is_ai_generated: boolean;
  provider: string;
}

export interface RepoPatchVerifyResponse {
  experiment_id: number;
  verification_status: 'VERIFIED' | 'FAILED' | 'REJECTED' | 'INCONCLUSIVE';
  patch_valid: boolean;
  target_failure_resolved: boolean;
  regressions_detected: boolean;
  exit_code: number;
  duration_ms: number;
  test_output_excerpt: string;
  diff_hash?: string | null;
  summary?: string;
}

export interface RepoPublishResponse {
  experiment_id: number;
  status: 'PUBLISHED' | 'FORBIDDEN_BRANCH' | 'PUBLISH_AUTH_REQUIRED' | 'PUSH_FAILED' | 'BASE_COMMIT_MISMATCH';
  published_branch?: string | null;
  commit_sha?: string | null;
  remote_branch_url?: string | null;
  message?: string;
}

