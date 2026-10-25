# CHAOSPATCH

PPT LINK - https://drive.google.com/file/d/18pfnY0cQLda5LT9PmuLLsnBDcT4qRjzX/view?usp=sharing
OPEN SOURCE AI MODEL USED - glm-5-3-flash




> **Inject failure. Let AI recover.**  
> *The AI proposes the repair. The verification engine decides whether it worked.*

---

## 1. Overview
CHAOSPATCH is an autonomous AI-powered reliability engineering workbench built for modern SRE teams. It deliberately introduces controlled failure modes into isolated test applications, collects structured evidence artifacts, leverages Qwen-30B to diagnose root causes and propose minimal code repairs, applies validated patches in disposable workspaces, and independently verifies whether the application has truly recovered.

### Key Value Proposition
- **Universal Public GitHub Mode:** Input any public GitHub repository URL (`https://github.com/owner/project`). CHAOSPATCH inspects project manifests, detects technology stacks (Python, Node, Go, Rust, Java), establishes bounded baselines, synthesizes repairs, and validates fixes in Docker containers.
- **No Hallucinated Victory:** A model-generated statement that a fix succeeded is never sufficient. The verification engine independently runs deterministic tests and inspects real process exit codes.
- **Strict Sandbox & Docker Isolation:** Experiments run in disposable sandboxes (`workspaces/repos/` and `workspaces/exp_<id>/`) with container isolation enforcing `--network none`, `--memory 1g`, and non-root execution.
- **Safety Validated Patches:** AST syntax checking, path traversal guards, and forbidden pattern filters reject hazardous patches before application.
- **Guarded Branch Publishing:** For repositories where the user holds write permissions, publish verified patches to dedicated branches (`chaospatch/repair-<id>`). Pushing to default branches (`main`/`master`), force-pushes, and automatic pull requests are strictly blocked.
- **Real-time SRE Workspace:** Interactive 8-stage state machine with live Server-Sent Events (SSE), diff viewer, and evidence explorer.

---

## 2. Architecture & Technologies

### Backend
- **Framework:** Python 3.9+ / FastAPI / Uvicorn
- **Persistence:** SQLite + SQLAlchemy 2.x
- **Inference:** Hugging Face Inference Router (`https://router.huggingface.co/v1`) using model `Qwen/Qwen3-Coder-30B-A3B-Instruct:featherless-ai`
- **Testing:** Pytest / Pytest-asyncio

### Frontend
- **Framework:** React 18 / TypeScript / Vite
- **Styling:** Tailwind CSS (Technical SRE Dark-Mode Theme)
- **Icons:** Lucide React
- **Live Stream:** Native Server-Sent Events (SSE)

---

## 3. Quick Start Guide

### Prerequisites
- Python 3.9+ installed
- Node.js 18+ and npm installed

### 1. Backend Setup
```bash
# From project root:
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies:
pip install -r backend/requirements.txt

# Configure environment:
cp .env.example backend/.env
# Edit backend/.env to configure HF_TOKEN and settings
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

### 3. Launching Application Services

**Start FastAPI Backend (Port 8000):**
```bash
# From project root:
source .venv/bin/activate
PYTHONPATH=backend:. uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*API Swagger Documentation available at `http://127.0.0.1:8000/docs`*

**Start Vite Frontend (Port 5173):**
```bash
# In another terminal:
cd frontend
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 4. Running Automated Tests
 
Run the complete 38-test automated suite (state machine, patch safety validator, evidence secret sanitizer, API endpoints, git service safeguards, Docker isolation runner, language adapters, repository mode endpoints, and all 3 deterministic scenarios):
```bash
source .venv/bin/activate
PYTHONPATH=backend:. pytest tests/ -v
```

---

## 5. Predefined Failure Scenarios

1. **Missing Environment Configuration (`missing_env_config`):**
   - *Failure Mechanism:* Unsafe direct dictionary lookup (`os.environ['INVENTORY_API_URL']`) crashes the service on health check or startup.
   - *Repair:* Add safe fallback default via `dict.get()`.
   - *Verification:* `test_config_resilience_missing_env` runs and asserts HTTP/health resolution.

2. **Downstream Dependency Timeout (`dependency_timeout`):**
   - *Failure Mechanism:* External inventory client lacks bounded timeout exception handler; delays cause unhandled socket/read timeouts.
   - *Repair:* Wrap client call in defensive `try/except httpx.TimeoutException` block raising clean `DownstreamServiceError`.
   - *Verification:* `test_downstream_timeout_resilience` confirms clean error handling.

3. **Malformed Upstream API Response (`malformed_response`):**
   - *Failure Mechanism:* Parser rigidly expects `raw_data['data']['pricing']` structure, crashing on flat payloads.
   - *Repair:* Implement defensive parsing supporting both nested and flat schemas with default values.
   - *Verification:* `test_malformed_response_handling` confirms safe parsing of varied payloads.

---

## 6. Security Guarantees & Safeguards
- **Zero Token Exposure:** Tokens (`HF_TOKEN`) reside exclusively in backend environment files. They are never sent to browser bundles or logged.
- **Redaction Filter:** Telemetry sanitizer actively strips Bearer tokens, passwords, and API keys before recording evidence.
- **Path Traversal Shield:** Rejects patches targeting `..` or forbidden paths (`.env`, `tests/`, `.git/`).
- **Disposable Copies:** Cleaned up automatically upon experiment completion or cancellation.

---

## 7. Documentation Index
- [Architecture Details](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Security Specifications](docs/SECURITY.md)
- [Demo Presentation Script](docs/DEMO_SCRIPT.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
