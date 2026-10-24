# CHAOSPATCH API Specification

Base URL: `http://localhost:8000/api`

Interactive Swagger Docs: `http://localhost:8000/docs`

## Endpoints

### 1. Health & Readiness
- `GET /api/health`
  - Returns overall process health, SQLite status, and inference readiness.
- `GET /api/ready`
  - Readiness probe verifying database connectivity.

### 2. Dashboard
- `GET /api/dashboard/summary`
  - Computes aggregated metrics: total experiments, verified recoveries, verification pass rate, average recovery time, scenario distribution, and recent runs.

### 3. Scenario Catalog
- `GET /api/scenarios`
  - Returns available fault plugins with expected symptoms and verification checks.
- `GET /api/scenarios/{scenario_id}`
  - Returns metadata for a specific scenario.

### 4. Experiments
- `POST /api/experiments`
  - Creates a new experiment (`scenario_type`, `target_environment`). Status initialized to `CREATED`.
- `GET /api/experiments`
  - Paginated list of experiments.
- `GET /api/experiments/{id}`
  - Details for an experiment.
- `POST /api/experiments/{id}/start?auto_approve={bool}`
  - Initiates the 8-stage state machine in the background.
- `POST /api/experiments/{id}/cancel`
  - Cancels running experiment and tears down disposable sandbox.
- `GET /api/experiments/{id}/events`
  - Ordered timeline of experiment events.
- `GET /api/experiments/{id}/stream`
  - Server-Sent Events (SSE) live event stream.
- `GET /api/experiments/{id}/evidence`
  - Inspectable evidence package artifacts with stable `EVID-xxx` identifiers.
- `GET /api/experiments/{id}/repairs`
  - Proposed patches, validation statuses, and diffs.
- `POST /api/experiments/{id}/repairs/{repair_id}/approve`
  - Approves candidate patch and triggers application & verification.
- `POST /api/experiments/{id}/repairs/{repair_id}/reject`
  - Rejects candidate patch and transitions status to `PATCH_REJECTED`.
- `GET /api/experiments/{id}/verification`
  - Detailed breakdown of independent verification checks.
- `GET /api/experiments/{id}/report`
  - Consolidated incident post-mortem report (JSON).
- `GET /api/experiments/{id}/report/markdown`
  - Formatted Markdown report.

### 5. Incidents
- `GET /api/incidents`
  - All diagnosed incidents across runs.
- `GET /api/incidents/{id}`
  - Single incident details.

### 6. Settings & Model Health
- `GET /api/settings`
  - Non-sensitive system configuration, model identifiers, limits, and runtime flags.
- `POST /api/settings/inference-test`
  - Live round-trip latency and connectivity test against Hugging Face Qwen router.
