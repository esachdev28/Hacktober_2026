"""Report generator for CHAOSPATCH incident post-mortems."""
import json
from typing import Dict, Any, List
from datetime import datetime


class ReportGenerator:
    """Generates structured incident reports and downloadable post-mortems."""

    @classmethod
    def generate_markdown(cls, report_data: Dict[str, Any]) -> str:
        """Format post-mortem report as readable Markdown."""
        exp = report_data.get("experiment", {})
        incident = report_data.get("incident") or {}
        repairs = report_data.get("repair_attempts", [])
        verifications = report_data.get("verification_runs", [])
        evidence = report_data.get("evidence", [])

        status_emoji = "✅ VERIFIED RECOVERY" if exp.get("final_verified") else "❌ RECOVERY FAILED / UNVERIFIED"

        md = [
            f"# CHAOSPATCH Incident Report: EXP-{exp.get('id', 'N/A')}",
            f"**Scenario:** {exp.get('scenario_type')}  ",
            f"**Status:** {exp.get('status')} ({status_emoji})  ",
            f"**Target Environment:** {exp.get('target_environment', 'SANDBOX')}  ",
            f"**Duration:** {exp.get('duration_ms', 0)} ms  ",
            f"**Date:** {exp.get('created_at', datetime.utcnow().isoformat())}  ",
            "",
            "---",
            "",
            "## 1. Incident Overview",
            f"**Title:** {incident.get('title', 'Controlled Chaos Fault')}",
            f"**Severity:** {incident.get('severity', 'ERROR').upper()}  ",
            f"**Root Cause:** {incident.get('root_cause', 'Under investigation')}  ",
            f"**Confidence:** {int((incident.get('confidence') or 0.0) * 100)}%  ",
            "",
            "## 2. Evidence Artifacts",
            f"Collected {len(evidence)} evidence artifacts during investigation.",
            "",
            "| ID | Type | Source | Severity | Content Snippet |",
            "|---|---|---|---|---|",
        ]

        for item in evidence:
            snippet = item.get("content", "").replace("\n", " ")[:60]
            md.append(f"| {item.get('id', '')} | {item.get('evidence_type')} | {item.get('source')} | {item.get('severity')} | `{snippet}...` |")

        md.extend([
            "",
            "## 3. Repair Attempts & Patches",
        ])

        if not repairs:
            md.append("*No repair attempts recorded.*")
        else:
            for rep in repairs:
                md.extend([
                    f"### Attempt #{rep.get('attempt_number', 1)}",
                    f"- **Status:** {rep.get('patch_status')}",
                    f"- **Safety Validation:** {rep.get('validation_status')}",
                    f"- **Verification Outcome:** {rep.get('verification_status')}",
                    f"- **Risk Assessment:** {rep.get('risk_summary', 'None reported')}",
                    "",
                    "```diff",
                    rep.get("patch_diff", "# No diff available"),
                    "```",
                    "",
                ])

        md.extend([
            "## 4. Independent Verification Breakdown",
            "Non-negotiable rule: Verification results are computed independently from AI statements.",
            "",
            "| Check Name | Status | Expected | Actual | Duration |",
            "|---|---|---|---|---|",
        ])

        for v in verifications:
            v_status = "PASS" if v.get("status") == "PASSED" else "FAIL"
            md.append(f"| {v.get('check_name')} | **{v_status}** | {v.get('expected_result', '')} | {v.get('actual_result', '')} | {v.get('duration_ms', 0)}ms |")

        md.extend([
            "",
            "## 5. Final Assessment",
            f"- **Baseline Passed:** {exp.get('baseline_passed')}",
            f"- **Final Recovery Verified:** {exp.get('final_verified')}",
            f"- **Failure Reason (if any):** {exp.get('failure_reason') or 'None'}",
            "",
            "---",
            "*Report generated deterministically by CHAOSPATCH Verification Engine.*",
        ])

        return "\n".join(md)
