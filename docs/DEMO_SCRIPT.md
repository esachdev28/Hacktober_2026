# CHAOSPATCH Hackathon Demo Script (6 Acts)

## Story Arc: "Inject failure. Let AI recover."

### Act 1: The Healthy Baseline
1. Open the dashboard at `http://localhost:5173`.
2. Point out the technical dark-mode theme, live status indicators (`SANDBOX ISOLATED`, `DB: HEALTHY`, `MODEL: QWEN-30B`).
3. Point out that the metrics reflect real SQLite database records, not fake static cards.
4. Explain that baseline tests confirm the demo service is healthy before chaos injection.

### Act 2: Inject Controlled Failure
1. Click **New Experiment** in the sidebar.
2. Review the 3 deterministic failure scenarios:
   - Scenario 1: *Missing Environment Configuration*
   - Scenario 2: *Downstream Dependency Timeout*
   - Scenario 3: *Malformed Upstream API Response*
3. Click **Configure & Inject** on Scenario 1.
4. Show the Safety Confirmation Modal confirming sandbox isolation (`workspaces/exp_...`).
5. Click **Launch Experiment**.

### Act 3: Live Investigation & Evidence Collection
1. The view navigates to the **Live Workspace**.
2. Watch the 8-stage pipeline progression tracker:
   `BASELINE -> INJECTION -> OBSERVATION -> DIAGNOSIS -> PATCH REVIEW -> REPAIR -> VERIFICATION -> REPORT`
3. Observe live events streaming into the terminal in real-time.
4. Point out the evidence package items with stable IDs (`EVID-xxx`), including stack traces and reproduction test failures.

### Act 4: Review and Safety Validation
1. Show the **AI Root-Cause Diagnosis** panel.
2. Inspect the **Candidate Patch Diff Viewer** with syntax highlighting showing the addition of fallback default configuration.
3. Highlight the Safety Validation badge (`PASSED - Risk: LOW`).
4. Explain that if manual review is active, the operator can click **Approve** or **Reject**.

### Act 5: Prove Recovery (Independent Verification)
1. Point to the **Independent Verification Engine Breakdown** card.
2. Emphasize the core hackathon principle:
   *"The AI proposes the repair. The verification engine decides whether it worked."*
3. Expand the check to reveal actual pytest exit code 0 output.
4. Show that baseline regression checks also passed, proving no regression was introduced.

### Act 6: Incident Post-Mortem & Export
1. Click **View Full Post-Mortem**.
2. Review the complete incident report (Title, Root Cause, Evidence Table, Applied Diff, Timestamps).
3. Demonstrate clicking **Copy Markdown** and **Download JSON** for SRE incident archives.
4. Conclude with: *"Visible failure becomes verified recovery, backed by inspectable evidence."*
