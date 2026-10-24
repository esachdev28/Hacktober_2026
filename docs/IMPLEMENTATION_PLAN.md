# CHAOSPATCH — Implementation Plan & Architecture

## 1. Executive Summary & Assessment
**Product:** CHAOSPATCH  
**Tagline:** Inject failure. Let AI recover.  
**Core Motto:** *The AI proposes the repair. The verification engine decides whether it worked.*

### Current Environment & Assessment
- **OS:** macOS (Darwin arm64)
- **Runtimes:** Python 3.9.6, Node.js v25.2.1, npm 11.6.2
- **AI Inference:** Hugging Face Inference Router (`https://router.huggingface.co/v1`) using OpenAI SDK-compatible client with model `Qwen/Qwen3-Coder-30B-A3B-Instruct:featherless-ai`.
- **Project Initial State:** Fresh repository, git initialized, backend models and configuration scaffolds started.

---

## 2. Target Architecture

```
                  +----------------------------------------------+
                  |         CHAOSPATCH Frontend (Vite/React)      |
                  |  - Technical SRE Dark Theme                  |
                  |  - Real-time SSE / REST Client               |
                  |  - Interactive Patch Diff & Verification UI  |
                  +-----------------------+----------------------+
                                          | HTTP / SSE
                                          v
+--------------------------------------------------------------------------------+
|                        CHAOSPATCH FastAPI Backend                              |
|                                                                                |
|  +--------------------+   +-----------------------+   +---------------------+  |
|  | State Machine &    |-->| Evidence Collector    |-->| Qwen 30B Provider   |  |
|  | Orchestrator       |   | - Logs, AST, traces   |   | - Root-cause & diff |  |
|  +--------------------+   +-----------------------+   +---------------------+  |
|            |                                                     |             |
|            v                                                     v             |
|  +--------------------+   +-----------------------+   +---------------------+  |
|  | Fault Injector     |   | Patch Safety Validator|<--| Candidate Patch    |  |
|  | (3 Chaos Plugins)  |   | (AST / Path allowlist)|   +---------------------+  |
|  +--------------------+   +-----------------------+                            |
|            |                          |                                        |
|            v                          v                                        |
|  +--------------------+   +-----------------------+   +---------------------+  |
|  | Isolated Workspaces|-->| Verification Engine   |-->| SQLite / SQLAlchemy |  |
|  | (Disposable clone) |   | (Pytest / Exit code)  |   | Persistence         |  |
|  +--------------------+   +-----------------------+   +---------------------+  |
+--------------------------------------------------------------------------------+
```

---

## 3. Prioritized Implementation Checklist

- [x] **Phase 1: Foundation & Project Setup**
  - [x] Git repo initialization & `.gitignore`
  - [x] Environment configuration (`.env.example`, `.env`)
  - [x] Backend dependencies & settings
  - [x] Database models & state transitions (`Experiment`, `Incident`, `Evidence`, `RepairAttempt`, `VerificationRun`, `ExperimentEvent`)
  - [ ] Virtualenv creation & dependency installation
  - [ ] Inference connectivity verification test script
- [ ] **Phase 2: Target Demo Application (`demo_app`)**
  - [ ] Dedicated microservice target (`demo_app/service.py`) with 3 fault scenarios:
    1. Missing critical configuration key
    2. Downstream service timeout / connection stall
    3. Upstream malformed response handling
  - [ ] Standalone test suite (`demo_app/tests/test_service.py`) for baseline, injection reproduction, and recovery verification
- [ ] **Phase 3: Sandbox, Patch Validator & Fault Plugins**
  - [ ] `sandbox/workspace.py`: Safe copy of demo_app into isolated temporary workspace per experiment
  - [ ] `sandbox/filesystem_policy.py`: Path traversal protection, file allowlist, max patch size limit
  - [ ] `services/patch_validator.py`: Unified diff validation, AST syntax safety check, rejection of dangerous constructs
  - [ ] `services/fault_injector.py`: Deterministic plugins for the 3 scenarios
- [ ] **Phase 4: AI Diagnosis & Provider Integration**
  - [ ] `providers/huggingface_qwen.py`: OpenAI-compatible client adapter targeting `https://router.huggingface.co/v1` with model `Qwen/Qwen3-Coder-30B-A3B-Instruct:featherless-ai`
  - [ ] Robust fallback & structured extraction of diagnosis, cited evidence IDs, and unified diff
  - [ ] Evidence collection (`services/evidence_collector.py`) with stable IDs (`EVID-xxx`)
- [ ] **Phase 5: Verification Engine & Orchestrator**
  - [ ] `services/verification_engine.py`: Independent pytest execution on disposable workspace
  - [ ] `services/experiment_orchestrator.py`: Full state machine lifecycle:
    `CREATED -> BASELINING -> INJECTING -> OBSERVING -> DIAGNOSING -> PATCH_REVIEW -> APPLYING -> VERIFYING -> COMPLETED`
  - [ ] SSE real-time stream endpoint `/api/experiments/{id}/stream`
- [ ] **Phase 6: Frontend Development (React + TypeScript + Vite + Tailwind CSS)**
  - [ ] SRE dark-mode dashboard with header status (Sandbox indicator, Model status, DB status)
  - [ ] Navigation: Overview, Experiments, Incidents, Evidence Explorer, Repair History, Settings
  - [ ] Scenario Launcher with safety confirmation dialog
  - [ ] Live Workspace with 8-stage progress tracker, interactive logs, unified diff viewer, approve/reject/retry controls
  - [ ] Complete incident report view with copyable markdown & JSON download
- [ ] **Phase 7: Automated Testing & Polish**
  - [ ] Unit tests for state machine, patch validator, workspace sandbox
  - [ ] Integration tests for API endpoints & scenario lifecycles
  - [ ] End-to-end verification of all 3 scenarios

---

## 4. Key Technical Risks & Mitigations

1. **Inference Availability & Rate Limits:**
   - *Risk:* Remote model router may experience latency or rate limits during rapid testing.
   - *Mitigation:* Implement structured timeout handling, clear `AI_UNAVAILABLE` status, and deterministic fallback diagnostics clearly labeled so the pipeline remains verifiable even offline.
2. **Arbitrary Patch Safety:**
   - *Risk:* Model could propose destructive modifications or directory escapes.
   - *Mitigation:* Path allowlist strictly confined to `demo_app/`, forbidding edits to `.env`, credentials, test suites, or files outside the target directory. AST syntax verification before applying.
3. **Workspace Pollution:**
   - *Risk:* Failed experiments leaving corrupted code.
   - *Mitigation:* Each experiment operates on an isolated temporary copy (`workspaces/exp_<id>/`) that is cleanly created and torn down, leaving the primary `demo_app` source pristine.

---

## 5. Acceptance Criteria

- [ ] All 3 failure scenarios run reproducibly.
- [ ] Baseline tests verify healthy state before chaos injection.
- [ ] Evidence package generated with stable IDs and structured context.
- [ ] Qwen model adapter queries `router.huggingface.co` successfully or reports graceful offline status.
- [ ] Patch applied exclusively within isolated workspace.
- [ ] Independent verification runs actual tests and determines true recovery.
- [ ] Incident report rendered with full provenance and downloadable JSON.
- [ ] Zero secrets leaked to frontend or logs.
