# 🏆 CHAOSPATCH — 2nd Rank Winner | Hacktoberfest 2026

> **Inject failure. Let AI recover.**  
> *The AI proposes the repair. The verification engine decides whether it worked.*

---

### 🎖️ Hackathon Achievement & Project Links

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  🎉 2ND RANK WINNER — HACKTOBERFEST HACKATHON 2026                          │
  │  Project: CHAOSPATCH | Category: AI & Developer Reliability Engineering     │
  └─────────────────────────────────────────────────────────────────────────────┘
```

- 📊 **Presentation (PPT/PDF):** [https://drive.google.com/file/d/18pfnY0cQLda5LT9PmuLLsnBDcT4qRjzX/view?usp=sharing](https://drive.google.com/file/d/18pfnY0cQLda5LT9PmuLLsnBDcT4qRjzX/view?usp=sharing)
- 🌐 **Live Deployed App:** [https://hacktober-2026.vercel.app/](https://hacktober-2026.vercel.app/)
- ⚙️ **Live Backend API:** [https://hacktober-2026.onrender.com/api/health](https://hacktober-2026.onrender.com/api/health)
- 💻 **GitHub Repository:** [https://github.com/esachdev28/Hacktober_2026](https://github.com/esachdev28/Hacktober_2026)
- 🤖 **Open-Source AI Model:** `glm-5.3-flash` (via NVIDIA NIM)
- 🧪 **Automated Tests:** 108 Passed, 1 Skipped (109 total test cases)

---

## 1. Overview & Problem Statement

Modern engineering teams lose hundreds of developer-hours reproducing software regressions, sifting through verbose telemetry logs, synthesizing fixes, and hoping the remedy doesn't break production. 

While LLMs can generate plausible-looking patches, **plausible is not proven**. If an AI declares a fix succeeded, modern reliability engineering demands deterministic proof.

**CHAOSPATCH** is an autonomous AI-powered reliability engineering workbench built for modern Site Reliability Engineering (SRE) teams. It operates on a single non-negotiable principle:

> **No Hallucinated Victory:** A model-generated statement that a fix succeeded is never sufficient. The verification engine independently executes real tests in isolated sandboxes and inspects actual process exit codes (`exit code 0`).

---

## 2. Key Capabilities & Operational Modes

CHAOSPATCH features two operational modes sharing a unified 8-stage verification pipeline:

```
+-----------------------------------------------------------------------------------+
|                                 CHAOSPATCH MODES                                  |
+-----------------------------------------+-----------------------------------------+
| Mode 1: Controlled Microservice Chaos   | Mode 2: Universal Public GitHub Mode    |
| (Target: Sandboxed demo_app)            | (Target: Real-world Open-Source Repos)  |
+-----------------------------------------+-----------------------------------------+
| * 3 Canonical deterministic failure     | * Shallow clone any public GitHub repo  |
|   scenarios (Env, Timeout, Schema)      | * Universal multi-stack auto-detection  |
| * Reproducible fault injection plugins  |   (Python, Node, Go, Rust, Java)        |
| * Pytest suite verification             | * Air-gapped Docker execution sandbox   |
| * Step-by-step state machine with SSE   | * Guarded operator branch publishing    |
+-----------------------------------------+-----------------------------------------+
```

### Core Invariants & Security Guarantees
- **Strict Docker Isolation:** Tests execute inside air-gapped containers enforcing `--network none`, `--memory 1g`, `--cpus 1.5`, `--pids-limit 64`, and unprivileged non-root execution.
- **AST Patch Validation:** AST syntax checking, path traversal guards, and forbidden pattern filters (`eval`, `exec`, `os.system`) reject hazardous patches before application.
- **Guarded Git Branch Publishing:** Verified patches are published exclusively to dedicated operator branches (`chaospatch/repair-<id>`). Direct pushes to `main`/`master`, force-pushes (`--force`), and automated PR merges are strictly blocked.
- **Secret Sanitization:** Telemetry sanitizers actively redact API keys, Bearer tokens, GitHub PATs, and credentials before recording evidence.

---

## 3. The 8-Stage Reliability State Machine

Every chaos experiment transitions through an immutable 8-stage state machine streamed live via Server-Sent Events (SSE):

```
BASELINE ➔ INJECTION ➔ OBSERVATION ➔ DIAGNOSIS ➔ PATCH REVIEW ➔ REPAIR ➔ VERIFICATION ➔ REPORT
```

1. **`BASELINE`**: Verifies the target repository or service is healthy before touching code.
2. **`INJECTION`**: Triggers a controlled, reproducible failure mode into a disposable workspace.
3. **`OBSERVATION`**: Captures process exit codes, stack traces, and structured evidence artifacts (`EVID-xxx`).
4. **`DIAGNOSIS`**: Blind investigator prompts the AI (`glm-5.3-flash`) to diagnose root cause without disclosing injected fault parameters.
5. **`PATCH REVIEW`**: Synthesizes a unified diff (`git diff`) and evaluates safety risk (Low/Medium/High).
6. **`REPAIR`**: Applies the validated patch exclusively within the isolated workspace.
7. **`VERIFICATION`**: Independent verification engine re-runs deterministic tests in an air-gapped Docker sandbox.
8. **`REPORT`**: Emits an immutable incident post-mortem with root cause analysis, evidence timeline, and patch diff.

---

## 4. Predefined Failure Scenarios

1. **Missing Environment Configuration (`missing_env_config`):**
   - *Failure Mechanism:* Unsafe direct dictionary lookup (`os.environ['INVENTORY_API_URL']`) crashes the service on startup or healthcheck.
   - *Repair:* Add safe fallback default via `dict.get()`.
   - *Verification:* `test_config_resilience_missing_env` asserts HTTP/health resolution.

2. **Downstream Dependency Timeout (`dependency_timeout`):**
   - *Failure Mechanism:* Downstream inventory service delays; client lacks bounded timeout exception handler and hangs.
   - *Repair:* Wrap client call in defensive `try/except httpx.TimeoutException` block raising clean `DownstreamServiceError`.
   - *Verification:* `test_downstream_timeout_resilience` confirms clean error handling.

3. **Malformed Upstream API Response (`malformed_response`):**
   - *Failure Mechanism:* Parser rigidly expects nested `raw_data['data']['pricing']` payload, crashing on schema evolution.
   - *Repair:* Implement defensive parsing supporting both nested and flat schemas with default values.
   - *Verification:* `test_malformed_response_handling` confirms safe parsing of varied payloads.

---

## 5. Technology Stack

### Backend
- **Framework:** Python 3.9+ / FastAPI / Uvicorn
- **Persistence:** SQLite + SQLAlchemy 2.x
- **Inference Router:** NVIDIA NIM targeting open-source model `z-ai/glm-5.3-flash` (with Hugging Face Qwen-30B fallback)
- **Container Sandbox:** Docker (`--network none`, resource quotas)
- **Testing:** Pytest / Pytest-asyncio (109 test cases)

### Frontend
- **Framework:** React 18 / TypeScript / Vite
- **Styling:** Tailwind CSS (Technical SRE Dark-Mode Theme)
- **Animations:** GSAP cinematic scroll-fracture reveal & Framer Motion
- **Icons:** Lucide React
- **Live Streaming:** Native Server-Sent Events (SSE)

---

## 6. Quick Start Guide

### Prerequisites
- Python 3.9+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/esachdev28/Hacktober_2026.git
cd Hacktober_2026

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example backend/.env
# Edit backend/.env to configure NVIDIA_API_KEY / HF_TOKEN
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

### 3. Running Locally

**Start FastAPI Backend (Port 8000):**
```bash
# From project root:
source .venv/bin/activate
PYTHONPATH=backend:. uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*API documentation available at `http://127.0.0.1:8000/docs`*

**Start Vite Frontend (Port 5173):**
```bash
# In another terminal:
cd frontend
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 7. Automated Test Suite

Run the complete 109-test automated suite (state machine, patch safety validator, evidence secret sanitizer, API endpoints, git service safeguards, Docker isolation runner, language adapters, repository mode endpoints, and all 3 deterministic scenarios):

```bash
source .venv/bin/activate
PYTHONPATH=backend:. pytest tests/ -v
```

**Test Results:** `108 passed, 1 skipped` *(Docker daemon integration test correctly auto-skips when running without a local Docker daemon)*.

---

## 8. Documentation Index

- [Architecture Details](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Security Specifications](docs/SECURITY.md)
- [Demo Presentation Script](docs/DEMO_SCRIPT.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [System Process Workflow](PROCESS.md)
