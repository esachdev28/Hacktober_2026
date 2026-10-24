# CHAOSPATCH Security & Isolation Architecture

## 1. Zero-Trust AI Execution
Model-generated code is treated as completely untrusted input.
- **No Direct Shell Execution:** The system will never execute arbitrary shell commands proposed by an LLM.
- **Fixed Whitelist Commands:** Verification is executed solely via predetermined test suites using isolated `pytest` subprocess invocations.
- **AST Syntax & Dangerous Pattern Checks:** Patches are scanned for banned primitives (`os.system`, `subprocess`, `eval`, `exec`, `__import__`) before ever touching a file.

## 2. Filesystem Policy & Workspace Sandboxing
- **Disposable Clones:** Experiments operate exclusively inside temporary directories (`workspaces/exp_<id>/`). The canonical `demo_app` source tree remains completely unmodified.
- **Path Traversal Guard:** Any patch referencing relative traversal (`..`) or absolute paths is rejected immediately.
- **Protected File Patterns:**
  - `.env*`, `.git/*`
  - Any file matching `secret`, `credential`, `token`, `password`, `.pem`, `.key`
  - Automated test files (`tests/*`) — preventing AI from altering test assertions to fake a pass
  - Dependency manifests (`requirements.txt`, `package.json`)
- **Resource Bounds:**
  - Maximum patch size: 10,000 bytes
  - Maximum changed files: 5 files
  - Timeout: 300 seconds

## 3. Secret Management & Telemetry Sanitization
- Tokens (`HF_TOKEN`, API keys, passwords, bearer tokens) are stored exclusively in backend environment files (`backend/.env`).
- Tokens are **never** returned in API responses or sent to the browser bundle.
- Telemetry sanitizer actively redacts API keys and bearer strings before recording evidence items.

## 4. Verification Engine Independence
The verification engine executes independently from model assertions:
- A model statement claiming a fix worked is given zero evidential weight.
- Recovery is verified solely by exit codes and assertion checks from independent pytest suites.
- If an assertion fails, status is honestly marked `VERIFICATION_FAILED`.
