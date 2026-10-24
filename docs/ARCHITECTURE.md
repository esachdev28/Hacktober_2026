# CHAOSPATCH Architecture

## System Overview
CHAOSPATCH is an autonomous AI reliability engineering workbench that:
1. Injects controlled chaos faults into isolated disposable workspaces.
2. Observes and packages structured evidence artifacts (`EVID-xxx`).
3. Diagnoses root causes and synthesizes candidate patches via Hugging Face Qwen-30B.
4. Validates patch syntax, safety, and security bounds via AST and filesystem policies.
5. Applies approved patches exclusively within isolated worktrees/directories.
6. Independently verifies recovery using deterministic pytest suites.
7. Produces immutable post-mortem incident reports.

## High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                 CHAOSPATCH UI                                   |
|                React 18 + TypeScript + Vite + Tailwind CSS (SRE Dark)           |
|                                                                                 |
|  [Overview Metrics]   [Scenario Launcher]   [Live Workspace]   [Evidence Explorer]
+---------------------------------------+-----------------------------------------+
                                        | REST API & Server-Sent Events (SSE)
                                        v
+---------------------------------------------------------------------------------+
|                              FastAPI Backend (Port 8000)                        |
|                                                                                 |
|  +--------------------+   +-----------------------+   +----------------------+  |
|  | State Machine &    |-->| Evidence Collector    |-->| Hugging Face Qwen30B |  |
|  | Orchestrator       |   | - Stable IDs          |   | Router Provider      |  |
|  +--------------------+   | - Secret Sanitizer    |   +----------------------+  |
|            |              +-----------------------+              |              |
|            v                          |                          v              |
|  +--------------------+               v               +----------------------+  |
|  | Fault Injector     |   +-----------------------+   | Candidate Patch Diff |  |
|  | (3 Chaos Plugins)  |   | Patch Safety Validator|   +----------------------+  |
|  +--------------------+   | - AST Syntax Check    |<-------------+              |
|            |              | - Path Traversal Guard|                             |
|            v              +-----------------------+                             |
|  +------------------------------------+                                         |
|  | Disposable Workspace (Sandboxed)   |                                         |
|  | - Pristine demo_app clone          |                                         |
|  | - Isolated per experiment          |                                         |
|  +-----------------+------------------+                                         |
|                    |                                                            |
|                    v                                                            |
|  +------------------------------------+                                         |
|  | Independent Verification Engine    |                                         |
|  | - Exit code & assertion evaluation |                                         |
|  | - Baseline regression suite        |                                         |
|  +-----------------+------------------+                                         |
|                    |                                                            |
|                    v                                                            |
|  +------------------------------------+                                         |
|  | SQLite Persistence (SQLAlchemy)    |                                         |
|  | Experiments, Incidents, Evidence   |                                         |
|  +------------------------------------+                                         |
+---------------------------------------------------------------------------------+
```

## Key Modules
1. **`demo_app/`**: Realistic target microservice demonstrating 3 common failure modes:
   - Config failure (`KeyError` when required environment configuration is missing)
   - Downstream stall (`httpx.ReadTimeout` when downstream dependency delays)
   - Malformed upstream API response (rigid schema lookup failure)
2. **`backend/app/sandbox/`**:
   - `workspace.py`: Clones `demo_app` into isolated `workspaces/exp_<id>` per run.
   - `filesystem_policy.py`: Enforces file allowlist, path traversal rejection, and forbids modifications to `.env`, credentials, or test files.
3. **`backend/app/services/`**:
   - `fault_injector.py`: Deterministic chaos plugins.
   - `patch_validator.py`: Verifies unified diff structure, AST syntax, and detects dangerous calls (`eval`, `exec`, `os.system`).
   - `verification_engine.py`: Runs trusted tests independently from model assertions.
   - `experiment_orchestrator.py`: Coordinates the 8-stage state machine and pushes real-time events.
4. **`backend/app/providers/`**:
   - `huggingface_qwen.py`: OpenAI-compatible client connecting to `https://router.huggingface.co/v1` targeting model `Qwen/Qwen3-Coder-30B-A3B-Instruct:featherless-ai`.
