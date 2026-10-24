"""Independent verification engine for CHAOSPATCH experiments.

NON-NEGOTIABLE PRINCIPLE:
THE AI PROPOSES THE REPAIR. THE VERIFICATION ENGINE DECIDES WHETHER IT WORKED.
A model-generated statement that a fix succeeded is never sufficient evidence of success.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.sandbox.workspace import DisposableWorkspace, WorkspaceExecutionResult
from app.models.experiments import VerificationStatus


class VerificationCheckResult:
    """Individual verification check result."""

    def __init__(
        self,
        name: str,
        status: VerificationStatus,
        expected: str,
        actual: str,
        output: str = "",
        duration_ms: int = 0,
    ):
        self.name = name
        self.status = status
        self.expected = expected
        self.actual = actual
        self.output = output
        self.duration_ms = duration_ms

    @property
    def passed(self) -> bool:
        return self.status == VerificationStatus.PASSED

    def to_dict(self) -> Dict[str, Any]:
        return {
            "check_name": self.name,
            "status": self.status.value,
            "expected_result": self.expected,
            "actual_result": self.actual,
            "output": self.output,
            "duration_ms": self.duration_ms,
        }


class VerificationSuiteReport:
    """Consolidated verification suite outcome."""

    def __init__(self, checks: List[VerificationCheckResult]):
        self.checks = checks

    @property
    def all_passed(self) -> bool:
        return len(self.checks) > 0 and all(c.passed for c in self.checks)

    @property
    def final_status(self) -> VerificationStatus:
        if self.all_passed:
            return VerificationStatus.PASSED
        return VerificationStatus.FAILED

    def to_list(self) -> List[Dict[str, Any]]:
        return [c.to_dict() for c in self.checks]


class VerificationEngine:
    """Executes trusted, independent verification suite in isolated workspace."""

    @classmethod
    def run_baseline_verification(cls, workspace: DisposableWorkspace) -> VerificationCheckResult:
        """Run baseline health check and baseline tests."""
        res = workspace.run_tests(test_filter="baseline", timeout_seconds=20)
        status = VerificationStatus.PASSED if res.passed else VerificationStatus.FAILED
        return VerificationCheckResult(
            name="Baseline Application Health & Tests",
            status=status,
            expected="Baseline tests exit with code 0 (passed)",
            actual=f"Process exited with code {res.exit_code}",
            output=res.stdout + ("\n" + res.stderr if res.stderr else ""),
            duration_ms=res.duration_ms,
        )

    @classmethod
    def verify_fault_reproduction(
        cls,
        workspace: DisposableWorkspace,
        scenario_filter: str,
    ) -> VerificationCheckResult:
        """Confirm that the intended fault reproduces (test fails before repair)."""
        res = workspace.run_tests(test_filter=scenario_filter, timeout_seconds=20)
        # Expected to fail before patch!
        reproduced = (res.exit_code != 0)
        status = VerificationStatus.PASSED if reproduced else VerificationStatus.FAILED
        return VerificationCheckResult(
            name="Fault Reproduction Check",
            status=status,
            expected="Scenario test fails before patch (exit code != 0)",
            actual=f"Process exited with code {res.exit_code} (Reproduced failure: {reproduced})",
            output=res.stdout + ("\n" + res.stderr if res.stderr else ""),
            duration_ms=res.duration_ms,
        )

    @classmethod
    def run_post_repair_verification(
        cls,
        workspace: DisposableWorkspace,
        scenario_filter: str,
    ) -> VerificationSuiteReport:
        """Execute independent post-repair tests and regression checks."""
        checks: List[VerificationCheckResult] = []

        # Check 1: Scenario specific verification test
        scenario_res = workspace.run_tests(test_filter=scenario_filter, timeout_seconds=25)
        scenario_passed = scenario_res.passed
        checks.append(
            VerificationCheckResult(
                name="Post-Repair Scenario Verification Test",
                status=VerificationStatus.PASSED if scenario_passed else VerificationStatus.FAILED,
                expected=f"Pytest '{scenario_filter}' passes with exit code 0",
                actual=f"Exit code {scenario_res.exit_code}",
                output=scenario_res.stdout + ("\n" + scenario_res.stderr if scenario_res.stderr else ""),
                duration_ms=scenario_res.duration_ms,
            )
        )

        # Check 2: Regression test against baseline
        baseline_res = workspace.run_tests(test_filter="baseline", timeout_seconds=25)
        baseline_passed = baseline_res.passed
        checks.append(
            VerificationCheckResult(
                name="Baseline Regression Test",
                status=VerificationStatus.PASSED if baseline_passed else VerificationStatus.FAILED,
                expected="Baseline tests continue to pass without regressions (exit code 0)",
                actual=f"Exit code {baseline_res.exit_code}",
                output=baseline_res.stdout + ("\n" + baseline_res.stderr if baseline_res.stderr else ""),
                duration_ms=baseline_res.duration_ms,
            )
        )

        return VerificationSuiteReport(checks=checks)
