# CHAOSPATCH — Developer Quickstart

> **"Inject failure. Let AI recover."**  
> This guide is aimed at new developers and hackathon judges who want to understand, run, and evaluate CHAOSPATCH quickly.

---

## 1. What Is CHAOSPATCH?

CHAOSPATCH is an autonomous AI-powered chaos engineering workbench.
It deliberately injects controlled failure modes into a sandboxed target application, observes the symptoms, asks an AI model to diagnose the root cause and propose a minimal code repair, then **independently verifies** whether the application actually recovered — without trusting the model's own claims.

**Core design principles:**
- **No Hallucinated Victory:** A model's assertion that it fixed something is never accepted. An independent deterministic test suite decides.
- **Docker-first isolation:** All untrusted code runs in disposable containers with `--network none`, `--memory 1g`, and non-root execution.
- **Universal GitHub Mode:** Point CHAOSPATCH at any public `https://github.com/owner/repo` URL; it detects the language stack, clones it, runs baselines, synthesises a repair, and verifies the fix — all in Docker.
- **Safety-validated patches:** Every patch is AST-checked, path-traversal-guarded, and scanned for dangerous primitives (`eval`, `exec`, `os.system`) before any file is touched.

---

## 2. Repository Layout

```
Hacktober_2026/
├── backend/              # FastAPI + SQLAlchemy Python backend (Port 8000)
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point & router registration
│   │   ├── core/config.py    # Settings (pydantic-settings); provider selection
│   │   ├── adapters/         # Language detection: Python, Node, Go, Rust, Java
│   │   ├── providers/        # AI inference: NVIDIA NIM (primary) / HF Qwen (fallback)
│   │   ├── services/         # Orchestrator, fault injector, patch validator,
│   │   │                     # verification engine, git service, evidence collector
│   │   ├── sandbox/          # Workspace cloning, Docker runner, filesystem policy
│   │   └── api/              # FastAPI routers (health, experiments, repository, …)
│   └── requirements.txt
├── frontend/             # React 18 + TypeScript + Vite frontend (Port 5173)
│   └── src/
├── demo_app/             # Built-in target microservice with 3 injected failure modes
├── tests/                # 9 pytest test modules (38 tests total)
├── docs/                 # Extended architecture, API, and security docs
├── pytest.ini            # pythonpath = backend . ; asyncio_mode = auto
└── .env.example          # Environment variable template — copy to backend/.env
```

### Key Backend Modules

| Module | Purpose |
|---|---|
| `services/experiment_orchestrator.py` | 8-stage state machine; pushes real-time SSE events |
| `services/fault_injector.py` | Three deterministic chaos plugins |
| `services/patch_validator.py` | AST syntax check, path-traversal guard, forbidden-pattern filter |
| `services/verification_engine.py` | Independent deterministic test runner (ignores model's self-assessment) |
| `services/git_service.py` | Safe clone, URL validation, guarded branch publisher |
| `services/repository_orchestrator.py` | Universal GitHub Mode pipeline |
| `providers/nvidia_nim.py` | NVIDIA NIM MiniMax M3.1-Flash client (primary) |
| `providers/huggingface_qwen.py` | HF Qwen2.5-Coder-32B client (fallback) |
| `sandbox/docker_runner.py` | Container execution with strict resource bounds |
| `sandbox/filesystem_policy.py` | Allowlist, path-traversal rejection, credential protection |
| `adapters/detector.py` | Multi-language project detection; falls back to `UnsupportedAdapter` |

---

## 3. Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| Python | 3.9+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | bundled with Node 18+ |
| Docker | any recent stable | Required **only** for Universal GitHub Mode and Docker isolation; the built-in `demo_app` scenarios run without it |
| AI API key | — | At least one of the two providers below must be configured; see §6 |

> **Docker note:** If Docker is unavailable, CHAOSPATCH halts with `DOCKER_UNAVAILABLE` rather than running untrusted code on your host. The three built-in `demo_app` scenarios can still run without Docker via the standard experiment flow.

---

## 4. Environment Setup

```bash
# 1. Clone (already done if you're reading this in the repo)
git clone https://github.com/esachdev28/Hacktober_2026.git
cd Hacktober_2026

# 2. Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Configure the backend environment
cp .env.example backend/.env
# Open backend/.env and fill in at least ONE of:
#   NVIDIA_API_KEY=nvapi-...    (free key at https://build.nvidia.com)
#   HF_TOKEN=hf_...             (free token at https://huggingface.co/settings/tokens)
# Leave INFERENCE_PROVIDER=auto to let the app pick automatically.

# 5. Install frontend dependencies
cd frontend && npm install && cd ..
```

### Minimal `backend/.env` to get started

```dotenv
# Option A — NVIDIA NIM (preferred)
NVIDIA_API_KEY=nvapi-<your-key-here>
NVIDIA_MODEL_ID=minimaxai/minimax-m3.1-flash

# Option B — Hugging Face
# HF_TOKEN=hf_<your-token-here>

INFERENCE_PROVIDER=auto
DATABASE_URL=sqlite:///./chaospatch.db
CORS_ORIGINS=http://localhost:5173
```

> **Never commit `backend/.env` to Git.** It is listed in `.gitignore`.

---

## 5. Running the Application (Two Terminals)

### Terminal 1 — Backend (FastAPI, Port 8000)

```bash
# From the project root
source .venv/bin/activate
PYTHONPATH=backend:. uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Expected output:
```
INFO:     CHAOSPATCH backend ready for chaos experiments.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Terminal 2 — Frontend (Vite Dev Server, Port 5173)

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in ...
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser to access the SRE Workspace UI.

---

## 6. Accessing the API Documentation

CHAOSPATCH exposes **interactive Swagger UI** automatically via FastAPI:

| URL | Description |
|---|---|
| `http://127.0.0.1:8000/docs` | Swagger UI — browse and invoke all endpoints |
| `http://127.0.0.1:8000/redoc` | ReDoc — alternate read-only reference |
| `http://127.0.0.1:8000/api/health` | Quick health check (no auth required) |

For the full endpoint reference see [`docs/API.md`](API.md).

---

## 7. Running the Tests

The test suite requires no AI credentials and no Docker daemon — all external calls are mocked.

```bash
# From the project root, with the venv active
source .venv/bin/activate
pytest tests/ -v
```

`pytest.ini` already sets `PYTHONPATH=backend .` and `asyncio_mode=auto`, so no extra flags are needed.

### What the 9 test modules cover

| File | Tests |
|---|---|
| `test_state_machine.py` | 8-stage experiment state transitions |
| `test_patch_validator.py` | AST syntax, path-traversal, forbidden-pattern guards |
| `test_evidence_sanitization.py` | Secret/token redaction in telemetry |
| `test_api_endpoints.py` | Core FastAPI endpoint smoke tests |
| `test_git_service.py` | URL validation, clone safety, branch publishing safeguards |
| `test_docker_runner.py` | Container isolation policy enforcement |
| `test_project_adapters.py` | Language detection (Python, Node, Go, Rust, Java) |
| `test_repository_api.py` | Universal GitHub Mode API pipeline |
| `test_scenarios_deterministic.py` | All 3 built-in failure scenario end-to-end flows |

---

## 8. Built-in Failure Scenarios

These run against `demo_app/` without requiring Docker or an AI key when you approve the pre-built repair.

| Scenario ID | Failure Injected | Verification Test |
|---|---|---|
| `missing_env_config` | `os.environ['INVENTORY_API_URL']` raises `KeyError` | `test_config_resilience_missing_env` |
| `dependency_timeout` | Unhandled `httpx.ReadTimeout` from downstream | `test_downstream_timeout_resilience` |
| `malformed_response` | Rigid `raw_data['data']['pricing']` path crashes on flat payloads | `test_malformed_response_handling` |

---

## 9. Known Limitations

### AI Inference Provider

| Situation | Behaviour |
|---|---|
| Neither `NVIDIA_API_KEY` nor `HF_TOKEN` is set | `active_provider` resolves to `"none"`; provider factory returns `HuggingFaceQwenProvider` which will raise an error on first inference call. The app starts, but experiment runs will fail at the diagnosis step. |
| `INFERENCE_PROVIDER=auto` with both keys set | NVIDIA NIM is preferred. |
| Invalid key format (not `nvapi-…` / `hf_…`) | Treated as "not set"; the other provider is tried. |

*Source: `backend/app/core/config.py` — `active_provider` property and `backend/app/providers/__init__.py`.*

### Docker

- Universal GitHub Mode (`POST /api/repository/*`) **requires Docker** running on the host. If the daemon is not available, the request fails fast with `DOCKER_UNAVAILABLE` — no host-side code execution occurs.
- The three built-in `demo_app` scenarios do **not** require Docker for the sandbox verification step (they use a local subprocess with the existing virtual environment).

### Database

- SQLite is used by default (`chaospatch.db` created automatically on first run in the working directory from which `uvicorn` is launched). No migrations are needed for a fresh install — `init_db()` runs automatically on startup.
- For concurrent production use, SQLite may become a bottleneck; this is expected for a hackathon prototype.

### Patch Branch Publishing

- Requires a GitHub Personal Access Token with `repo` write scope supplied by the user at publish time.
- Pushing to `main`/`master` or using `--force` is hard-blocked in `git_service.py` — this cannot be overridden via config.

### No Frontend Test Suite

- The frontend (React 18 + Vite) has no automated test configuration as of this commit. Manual browser testing is required.

---

## 10. Further Reading

| Document | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | Full component diagram and module descriptions |
| [`docs/API.md`](API.md) | Complete REST + SSE endpoint reference |
| [`docs/SECURITY.md`](SECURITY.md) | Isolation, secret management, and Docker policies |
| [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md) | Step-by-step walkthrough for a live demo |
| [`docs/IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) | Original design decisions and roadmap |
