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
5. **`backend/app/adapters/` (Universal Language & Project Detection)**:
   - `base.py`: Abstract `ProjectAdapter` defining inspection, dependency preparation, baseline and verification test command selection.
   - `python_adapter.py`: Detects `pyproject.toml`, `requirements.txt`, `setup.py`, `Pipfile`, `tox.ini`, and selects standard pytest/unittest commands.
   - `node_adapter.py`: Detects `package.json`, Jest, Vitest, and Mocha runners.
   - `compiled_adapters.py`: Detects Go (`go.mod`), Rust (`Cargo.toml`), and Java (`pom.xml`, `build.gradle`).
   - `detector.py`: Scans roots, detects monorepos, and routes to appropriate adapter or falls back safely to `UnsupportedAdapter` (`UNSUPPORTED_TEST_ENVIRONMENT`).
6. **`backend/app/sandbox/docker_runner.py` (Container Isolation Engine)**:
   - Executes untrusted repository tests only inside disposable Docker containers.
   - Strict security bounds: `--network none` (network disabled during testing), `--memory 1g`, `--cpus 1.5`, `--pids-limit 64`, unprivileged non-root execution.
   - Rejects Docker socket mounts, home-directory mounts, SSH keys, or credential leaks.
7. **`backend/app/services/git_service.py` (Dynamic Repository & Branch Publishing Engine)**:
   - Dynamic URL parser & validator (rejects credentials, invalid hosts, unsafe schemes, directory traversal).
   - Safe cloning into configured `workspaces/repos/` root.
   - Guarded branch publisher: publishes verified patches to dedicated branches (`chaospatch/repair-<exp-id>`). Strictly prohibits default branches (`main`/`master`), forbids force pushes (`--force`), and never opens automated pull requests or merges.

