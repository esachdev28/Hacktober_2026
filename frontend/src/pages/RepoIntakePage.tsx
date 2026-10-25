import React, { useState } from 'react';
import {
  GitBranch,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Terminal,
  Cpu,
  FileCode,
  Download,
  UploadCloud,
  Lock,
  Layers,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Clock,
  Sparkles,
  Play,
  FileText,
  AlertCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import {
  ProjectInspectionResult,
  RepoBaselineResponse,
  RepoDiagnosisPatchResponse,
  RepoPatchVerifyResponse,
  RepoPublishResponse,
} from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { TerminalPanel } from '../components/ui/TerminalPanel';
import { DiffViewer } from '../components/DiffViewer';
import { VerificationVerdict } from '../components/ui/VerificationVerdict';
import { StatusIndicator } from '../components/ui/StatusIndicator';

interface RepoIntakePageProps {
  onSelectExperiment?: (id: number) => void;
}

export const RepoIntakePage: React.FC<RepoIntakePageProps> = ({ onSelectExperiment }) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/pallets/flask');
  const [projectRoot, setProjectRoot] = useState('/');
  const [targetBranch, setTargetBranch] = useState('');

  // Intake & Inspection state
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<ProjectInspectionResult | null>(null);
  const [intakeError, setIntakeError] = useState<string | null>(null);

  // Baseline state
  const [isRunningBaseline, setIsRunningBaseline] = useState(false);
  const [baselineResult, setBaselineResult] = useState<RepoBaselineResponse | null>(null);
  const [baselineError, setBaselineError] = useState<string | null>(null);

  // Diagnosis & Patch state
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<RepoDiagnosisPatchResponse | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [patchAuthorized, setPatchAuthorized] = useState(false);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<RepoPatchVerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Publishing state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [customBranch, setCustomBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<RepoPublishResponse | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const quickSamples = [
    { label: 'pallets/flask (Python)', url: 'https://github.com/pallets/flask' },
    { label: 'psf/requests (Python)', url: 'https://github.com/psf/requests' },
    { label: 'expressjs/express (Node)', url: 'https://github.com/expressjs/express' },
    { label: 'gin-gonic/gin (Go)', url: 'https://github.com/gin-gonic/gin' },
  ];

  // 1. Submit & Inspect Repo
  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsInspecting(true);
    setIntakeError(null);
    setInspectionResult(null);
    setBaselineResult(null);
    setDiagnosisResult(null);
    setVerifyResult(null);
    setPublishResult(null);
    setPatchAuthorized(false);

    try {
      const res = await api.intakeRepo(repoUrl.trim(), projectRoot, targetBranch || undefined);
      setInspectionResult(res);
      setCustomBranch(`chaospatch/repair-${res.experiment_id}`);
    } catch (err: any) {
      setIntakeError(err.message || 'Failed to inspect repository');
    } finally {
      setIsInspecting(false);
    }
  };

  // 2. Run Baseline Checks
  const handleRunBaseline = async () => {
    if (!inspectionResult) return;
    setIsRunningBaseline(true);
    setBaselineError(null);

    try {
      const res = await api.runRepoBaseline(inspectionResult.experiment_id);
      setBaselineResult(res);
    } catch (err: any) {
      setBaselineError(err.message || 'Failed to run baseline checks');
    } finally {
      setIsRunningBaseline(false);
    }
  };

  // 3. Request AI Diagnosis & Patch
  const handleDiagnoseAndPatch = async () => {
    if (!inspectionResult) return;
    setIsDiagnosing(true);
    setDiagnosisError(null);

    try {
      const res = await api.diagnoseAndPatchRepo(inspectionResult.experiment_id);
      setDiagnosisResult(res);
      setCommitMessage(`fix(repair): ${res.title}`);
    } catch (err: any) {
      setDiagnosisError(err.message || 'Diagnosis and patch generation failed');
    } finally {
      setIsDiagnosing(false);
    }
  };

  // 4. Verify Patch in Docker Sandbox
  const handleVerifyPatch = async () => {
    if (!inspectionResult) return;
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await api.verifyRepoPatch(
        inspectionResult.experiment_id,
        diagnosisResult?.proposed_patch_diff
      );
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyError(err.message || 'Verification execution failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // 5. Publish Dedicated Repair Branch
  const handlePublishBranch = async () => {
    if (!inspectionResult) return;
    if (!githubToken.trim()) {
      setPublishError('GitHub Personal Access Token is required to authorize branch publishing');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      const res = await api.publishRepoBranch(
        inspectionResult.experiment_id,
        githubToken.trim(),
        customBranch.trim() || undefined,
        commitMessage.trim() || undefined
      );
      setPublishResult(res);
      if (res.status === 'PUBLISHED') {
        setShowPublishModal(false);
      } else {
        setPublishError(res.message || `Publishing ended with status: ${res.status}`);
      }
    } catch (err: any) {
      setPublishError(err.message || 'Branch publish failed');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-8 font-mono pb-16">
      {/* Signature Header Banner */}
      <div className="rounded-2xl border border-canvas-border bg-gradient-to-r from-canvas-card via-[#111828] to-[#0A0E1A] p-6 sm:p-8 shadow-glow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-accent-chaos/10 border border-accent-chaos/30 text-accent-chaos text-xs font-bold uppercase tracking-wider">
              <GitBranch className="w-4 h-4" />
              <span>Universal Public GitHub Mode</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
              Sequential Repository Repair Workbench
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
              Inspect public repositories, execute safe bounded baseline checks inside disposable Docker sandboxes
              (<code className="text-accent-chaos">--network none</code>), collect sanitized evidence, synthesize
              AI repair patches, and independently test recovery before export or branch publishing.
            </p>
          </div>

          {inspectionResult && (
            <div className="p-3 rounded-xl bg-[#111310] border border-canvas-border shrink-0 text-right">
              <div className="text-[10px] text-text-muted uppercase">ACTIVE EXPERIMENT</div>
              <div className="text-sm font-bold text-accent-chaos">#EXP-{inspectionResult.experiment_id}</div>
              <div className="text-[10px] text-text-muted truncate max-w-[140px]">
                {inspectionResult.owner}/{inspectionResult.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1 — Repository Intake Bar */}
      <section className="rounded-xl border border-canvas-border bg-canvas-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center space-x-2 border-b border-canvas-border pb-3">
          <span className="w-6 h-6 rounded-full bg-accent-chaos/10 border border-accent-chaos/30 text-accent-chaos text-xs font-bold flex items-center justify-center">
            1
          </span>
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Repository Intake & Cloning
          </h2>
        </div>

        <form onSubmit={handleInspect} className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 uppercase font-medium">
              Public GitHub HTTPS URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full bg-[#070A10] border border-canvas-border rounded-lg pl-10 pr-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent-chaos transition"
                />
              </div>

              <button
                type="submit"
                disabled={isInspecting || !repoUrl.trim()}
                className="px-6 py-2.5 bg-accent-chaos hover:bg-amber-400 disabled:opacity-50 text-canvas font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-glow-amber hover:shadow-[0_0_22px_rgba(255,159,10,0.45)] btn-magnetic active:scale-[0.98] shrink-0"
              >
                {isInspecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cloning & Inspecting...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Inspect Repository</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Samples */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-text-muted text-[11px]">Quick Samples:</span>
            {quickSamples.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => setRepoUrl(sample.url)}
                className="px-2.5 py-1 rounded-md bg-[#070A10] border border-canvas-border text-text-secondary hover:text-text-primary hover:border-accent-chaos/40 text-[11px] transition cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {/* Subdirectory & Branch inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] text-text-muted mb-1">
                Project Root Subdirectory (for monorepos)
              </label>
              <input
                type="text"
                value={projectRoot}
                onChange={(e) => setProjectRoot(e.target.value)}
                placeholder="/"
                className="w-full bg-[#070A10] border border-canvas-border rounded-md px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-chaos"
              />
            </div>

            <div>
              <label className="block text-[11px] text-text-muted mb-1">
                Optional Target Branch or Commit SHA
              </label>
              <input
                type="text"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                placeholder="main (defaults to repository default)"
                className="w-full bg-[#070A10] border border-canvas-border rounded-md px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-chaos"
              />
            </div>
          </div>

          {intakeError && (
            <div className="p-3.5 rounded-lg bg-accent-failure/10 border border-accent-failure/30 text-accent-failure text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{intakeError}</span>
            </div>
          )}
        </form>
      </section>

      {/* SECTION 2 — Project Inspection Results */}
      {inspectionResult && (
        <section className="rounded-xl border border-canvas-border bg-canvas-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-accent-chaos/10 border border-accent-chaos/30 text-accent-chaos text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Project Manifest & Capability Inspection
              </h2>
            </div>
            <span className="text-[10px] text-text-muted">
              Canonical: <code className="text-text-secondary">{inspectionResult.canonical_id}</code>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#070A10] border border-canvas-border">
              <div className="text-[10px] text-text-muted uppercase">Language / Stack</div>
              <div className="font-bold text-accent-chaos mt-1 truncate">
                {inspectionResult.primary_language || 'Unknown'}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5 truncate">
                {inspectionResult.detected_frameworks?.join(', ') || 'No framework detected'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#070A10] border border-canvas-border">
              <div className="text-[10px] text-text-muted uppercase">Target Branch</div>
              <div className="font-bold text-text-primary mt-1 truncate">
                {inspectionResult.default_branch || 'HEAD'}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5 truncate">
                SHA: <code className="text-text-secondary">{inspectionResult.base_commit_sha?.substring(0, 7) || 'N/A'}</code>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#070A10] border border-canvas-border">
              <div className="text-[10px] text-text-muted uppercase">Detected Runner</div>
              <div className="font-bold text-text-primary mt-1 truncate">
                {inspectionResult.test_framework || 'Auto-detected'}
              </div>
              <div className="text-[10px] text-accent-cyan mt-0.5 truncate font-mono">
                {inspectionResult.test_command || 'default test suite'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#070A10] border border-canvas-border">
              <div className="text-[10px] text-text-muted uppercase">Sandbox Adapter</div>
              <div className="font-bold text-accent-success mt-1 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{inspectionResult.capabilities?.isolation_mode || 'DOCKER'}</span>
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">
                {inspectionResult.capabilities?.can_run_tests ? 'Test execution supported' : 'Manual runner'}
              </div>
            </div>
          </div>

          {/* Manifest files badge row */}
          {inspectionResult.manifest_files && inspectionResult.manifest_files.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-[10px] text-text-muted uppercase font-bold">Manifest Files:</span>
              {inspectionResult.manifest_files.map((file) => (
                <span
                  key={file}
                  className="px-2 py-0.5 rounded bg-canvas-surface border border-canvas-border text-[11px] text-text-secondary"
                >
                  {file}
                </span>
              ))}
            </div>
          )}

          {/* Action to proceed to baseline */}
          {!baselineResult && (
            <div className="pt-3 border-t border-canvas-border flex justify-end">
              <button
                onClick={handleRunBaseline}
                disabled={isRunningBaseline}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-accent-chaos hover:bg-amber-400 disabled:opacity-50 text-canvas font-bold text-xs transition-all cursor-pointer shadow-glow-amber hover:shadow-[0_0_22px_rgba(255,159,10,0.45)] btn-magnetic active:scale-[0.98]"
              >
                {isRunningBaseline ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Docker Sandbox Baseline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Baseline Checks</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* SECTION 3 — Baseline Evidence & Terminal Output */}
      {(baselineResult || isRunningBaseline || baselineError) && (
        <section className="rounded-xl border border-canvas-border bg-canvas-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-accent-chaos/10 border border-accent-chaos/30 text-accent-chaos text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Baseline Evidence & Sandbox Execution
              </h2>
            </div>

            {baselineResult && (
              <StatusIndicator status={baselineResult.baseline_status || (baselineResult as any).status} size="sm" />
            )}
          </div>

          {isRunningBaseline ? (
            <div className="p-8 rounded-xl bg-[#070A10] border border-canvas-border text-center space-y-3">
              <Loader2 className="w-6 h-6 text-accent-chaos animate-spin mx-auto" />
              <div className="text-xs text-text-secondary">
                Spinning up isolated Docker container, resolving dependencies, and capturing baseline stdout/stderr...
              </div>
            </div>
          ) : baselineError ? (
            <div className="p-4 rounded-xl bg-accent-failure/10 border border-accent-failure/30 text-accent-failure text-xs space-y-1">
              <div className="font-bold">Baseline Execution Error:</div>
              <div>{baselineError}</div>
            </div>
          ) : baselineResult ? (() => {
            const bStatus = baselineResult.baseline_status || (baselineResult as any).status || 'UNKNOWN';
            const bOutput = baselineResult.output_excerpt || 
              (baselineResult as any).stdout_excerpt || 
              (baselineResult as any).stderr_excerpt || 
              baselineResult.message || 
              '';
            const bExit = baselineResult.exit_code ?? 0;
            const bDuration = baselineResult.duration_ms ?? 0;
            const bEvidence = baselineResult.evidence_count ?? (baselineResult as any).evidence_items_count ?? 0;
            const bCommand = baselineResult.test_command || 'pytest';

            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#070A10] border border-canvas-border text-xs">
                  <div>
                    <span className="text-text-muted">Baseline Verdict: </span>
                    <span className="font-bold text-text-primary">{bStatus}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Exit Code: </span>
                    <code className="text-text-primary font-bold">{bExit}</code>
                  </div>
                  <div>
                    <span className="text-text-muted">Duration: </span>
                    <span className="text-text-primary font-bold">{bDuration} ms</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Evidence Items: </span>
                    <span className="text-accent-chaos font-bold">{bEvidence} captured</span>
                  </div>
                </div>

                {/* Terminal Panel with Actual Captured Stdout / Stderr */}
                <TerminalPanel
                  title="Baseline Test Runner Output (Docker Sandbox)"
                  command={bCommand}
                  output={bOutput}
                  exitCode={bExit}
                  durationMs={bDuration}
                  statusLabel={bStatus}
                />

              {/* Failing Tests Pills */}
              {baselineResult.failing_tests && baselineResult.failing_tests.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-text-muted uppercase font-bold">
                    Identified Failing Test Assertions:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {baselineResult.failing_tests.map((test, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-accent-failure/10 border border-accent-failure/30 text-accent-failure text-[11px]"
                      >
                        {test}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Proceed to AI Diagnosis action */}
              {!diagnosisResult && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleDiagnoseAndPatch}
                    disabled={isDiagnosing}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-accent-purple hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/20 hover:shadow-[0_0_22px_rgba(168,85,247,0.45)] btn-magnetic active:scale-[0.98]"
                  >
                    {isDiagnosing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Synthesizing AI Diagnosis & Patch...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Request AI Diagnosis & Patch</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            );
          })() : null}
        </section>
      )}

      {/* SECTION 4 — AI Diagnosis & Proposed Patch */}
      {(diagnosisResult || isDiagnosing || diagnosisError) && (
        <section className="rounded-xl border border-canvas-border bg-canvas-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                AI Root-Cause Diagnosis & Proposed Unified Patch
              </h2>
            </div>

            {isDiagnosing ? (
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-info-surface text-info border border-info/30 flex items-center space-x-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                MODEL RUNNING
              </span>
            ) : (diagnosisError || diagnosisResult?.status === 'MODEL_FAILED' || diagnosisResult?.status === 'MODEL_TIMEOUT' || diagnosisResult?.status === 'MODEL_UNAVAILABLE') ? (
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-danger-surface text-danger border border-danger/30">
                MODEL FAILED
              </span>
            ) : diagnosisResult?.proposed_patch_diff?.trim() ? (
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-[#202A16] text-primary border border-primary/30">
                PATCH READY
              </span>
            ) : diagnosisResult ? (
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-[#202A16] text-primary border border-primary/30">
                DIAGNOSIS READY
              </span>
            ) : null}
          </div>

          {isDiagnosing ? (
            <div className="p-8 rounded-xl bg-surface border border-canvas-border text-center space-y-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
              <div className="text-xs text-text-secondary">
                Querying GLM-5.3-Flash via NVIDIA NIM, analyzing captured stack traces, and formatting candidate unified diff...
              </div>
            </div>
          ) : diagnosisError ? (
            <div className="p-4 rounded-xl bg-danger-surface border border-danger/30 text-danger text-xs space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <span>Inference Failure:</span>
              </div>
              <div>{diagnosisError}</div>
            </div>
          ) : diagnosisResult ? (
            <div className="space-y-4">
              {/* Hypothesis & Confidence Banner */}
              <div className="p-4 rounded-xl bg-surface border border-canvas-border space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-text-primary text-xs sm:text-sm">
                    {diagnosisResult.title}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-text-muted text-[11px]">Confidence:</span>
                    <span className="font-bold text-accent-chaos text-xs">
                      {Math.round((diagnosisResult.confidence || 0) * 100)}%
                    </span>
                    <span className="text-text-muted text-[10px]">({diagnosisResult.provider})</span>
                  </div>
                </div>

                <div className="text-xs text-text-secondary leading-relaxed pt-1">
                  <span className="text-text-muted font-bold mr-1">Root Cause Hypothesis:</span>
                  {diagnosisResult.root_cause}
                </div>

                {diagnosisResult.risk_summary && (
                  <div className="text-[11px] text-text-muted border-t border-canvas-border/40 pt-2 flex items-start space-x-1.5">
                    <span className="text-text-secondary font-bold shrink-0">Risk Summary:</span>
                    <span>{diagnosisResult.risk_summary}</span>
                  </div>
                )}
              </div>

              {/* Unified Diff Viewer */}
              <DiffViewer
                diff={diagnosisResult.proposed_patch_diff}
                title="Proposed Candidate Patch (Unified Diff)"
              />

              {/* SECTION 5 — Patch Authorization */}
              <div className="rounded-xl border border-canvas-border bg-surface-elevated/40 p-4 sm:p-5 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-text-primary uppercase tracking-wider">
                  <Lock className="w-4 h-4 text-accent-chaos" />
                  <span>5. Operator Safety Authorization</span>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  The synthesized patch will be applied strictly inside the disposable sandbox workspace (
                  <code className="text-text-primary">workspaces/exp_{inspectionResult?.experiment_id}</code>).
                  The original source repository remains completely untouched.
                </p>

                <div className="flex items-start space-x-3 pt-1">
                  <input
                    type="checkbox"
                    id="authCheck"
                    checked={patchAuthorized}
                    onChange={(e) => setPatchAuthorized(e.target.checked)}
                    disabled={!diagnosisResult.proposed_patch_diff?.trim()}
                    className="mt-0.5 rounded border-canvas-border bg-surface text-primary focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <label htmlFor="authCheck" className={`text-xs select-none ${!diagnosisResult.proposed_patch_diff?.trim() ? 'text-text-muted cursor-not-allowed' : 'text-text-primary cursor-pointer'}`}>
                    <span className="font-bold">Authorize Sandbox Patch Application & Verification</span>
                    <span className="block text-[11px] text-text-muted mt-0.5">
                      {diagnosisResult.proposed_patch_diff?.trim()
                        ? 'Grant permission to apply this diff to the isolated container and execute independent verification checks.'
                        : 'Cannot authorize: No executable patch diff available from model inference.'}
                    </span>
                  </label>
                </div>

                {/* Verification Trigger Button */}
                {!verifyResult && (
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {!diagnosisResult.proposed_patch_diff?.trim() && (
                      <span className="text-[11px] text-danger font-medium">
                        ⚠ Verification requires an executable patch diff.
                      </span>
                    )}
                    <div className="sm:ml-auto">
                      <button
                        onClick={handleVerifyPatch}
                        disabled={!patchAuthorized || isVerifying || !diagnosisResult.proposed_patch_diff?.trim()}
                        className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-[#D8FF8A] disabled:opacity-30 disabled:cursor-not-allowed text-[#171A12] font-bold text-xs transition-all cursor-pointer shadow-[0_0_20px_rgba(199,243,107,0.25)] active:scale-[0.98]"
                      >
                        {isVerifying ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Executing Independent Sandbox Tests...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Apply Patch & Verify Recovery</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* SECTION 6 — Independent Verification Verdict */}
      {(verifyResult || isVerifying || verifyError) && (
        <section className="rounded-xl border border-canvas-border bg-canvas-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center">
                6
              </span>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Independent Verification Verdict
              </h2>
            </div>

            {verifyResult && (
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                verifyResult.verification_status === 'VERIFIED'
                  ? 'bg-[#202A16] text-primary border-primary/30'
                  : verifyResult.verification_status === 'INCONCLUSIVE'
                  ? 'bg-warning-surface text-warning border-warning/30'
                  : 'bg-danger-surface text-danger border-danger/30'
              }`}>
                {verifyResult.verification_status === 'VERIFIED'
                  ? 'VERIFICATION PASSED'
                  : verifyResult.verification_status === 'INCONCLUSIVE'
                  ? 'VERIFICATION INCONCLUSIVE'
                  : 'VERIFICATION FAILED'}
              </span>
            )}
          </div>

          {isVerifying ? (
            <div className="p-8 rounded-xl bg-[#070A10] border border-canvas-border text-center space-y-3">
              <Loader2 className="w-6 h-6 text-accent-success animate-spin mx-auto" />
              <div className="text-xs text-text-secondary">
                Applying patch in container, executing regression suite, and deriving independent verdict...
              </div>
            </div>
          ) : verifyError ? (
            <div className="p-4 rounded-xl bg-accent-failure/10 border border-accent-failure/30 text-accent-failure text-xs">
              <div className="font-bold">Verification Harness Error:</div>
              <div>{verifyError}</div>
            </div>
          ) : verifyResult ? (
            <div className="space-y-4">
              {/* Verdict Card Component */}
              <VerificationVerdict result={verifyResult} />

              {/* Terminal Panel for Post-Patch Test Run Output */}
              {verifyResult.test_output_excerpt && (
                <TerminalPanel
                  title="Post-Patch Verification Test Output (Clean Sandbox Run)"
                  output={verifyResult.test_output_excerpt}
                  exitCode={verifyResult.exit_code}
                  durationMs={verifyResult.duration_ms}
                  statusLabel={verifyResult.verification_status}
                />
              )}

              {/* SECTION 7 — Export and Publish Actions */}
              <div className="p-5 rounded-xl border border-canvas-border bg-[#070A10] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-text-primary">
                    <Download className="w-4 h-4 text-accent-chaos" />
                    <span>7. Export Unified Diff & Guarded Branch Publishing</span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Download the validated <code className="text-accent-chaos">.patch</code> file or publish directly to a dedicated repair branch.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <a
                    href={api.getPatchExportUrl(inspectionResult!.experiment_id)}
                    download={`chaospatch-repair-${inspectionResult!.experiment_id}.patch`}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-canvas-card border border-canvas-border hover:border-accent-chaos text-xs text-text-primary transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-accent-chaos" />
                    <span>Export .patch</span>
                  </a>

                  <button
                    onClick={() => setShowPublishModal(true)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-accent-chaos hover:bg-amber-400 text-canvas font-bold text-xs transition-all cursor-pointer shadow-glow-amber hover:shadow-[0_0_20px_rgba(255,159,10,0.4)] btn-magnetic active:scale-[0.98]"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Publish Dedicated Branch</span>
                  </button>
                </div>
              </div>

              {/* Publishing Status Callout if already published */}
              {publishResult && (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    publishResult.status === 'PUBLISHED'
                      ? 'bg-accent-success/10 border-accent-success/30 text-accent-success'
                      : 'bg-accent-failure/10 border-accent-failure/30 text-accent-failure'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Published to branch: {publishResult.published_branch}</span>
                    </div>
                    {publishResult.commit_sha && (
                      <div className="text-[11px] text-text-secondary">
                        Commit: <code className="text-text-primary">{publishResult.commit_sha}</code>
                      </div>
                    )}
                  </div>

                  {publishResult.remote_branch_url && (
                    <a
                      href={publishResult.remote_branch_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded bg-canvas-surface border border-canvas-border hover:border-accent-success text-text-primary text-[11px] flex items-center space-x-1"
                    >
                      <span>Open on GitHub</span>
                      <ExternalLink className="w-3 h-3 text-accent-success" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      {/* Guarded Branch Publishing Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl border border-canvas-border bg-[#0D1220] max-w-lg w-full p-6 space-y-5 shadow-2xl font-mono text-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-lg bg-accent-chaos/10 border border-accent-chaos/30 text-accent-chaos">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">
                    Publish Guarded Repair Branch
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Target: {inspectionResult?.owner}/{inspectionResult?.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPublishModal(false)}
                className="text-text-muted hover:text-text-primary transition"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070A10] border border-canvas-border text-[11px] space-y-1.5 text-text-secondary">
              <div className="font-bold text-text-primary flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-accent-chaos" />
                <span>Protected Branch Safety Rule</span>
              </div>
              <div>
                CHAOSPATCH never pushes to default branches (<code className="text-rose-400">main</code>, <code className="text-rose-400">master</code>).
                All repairs are isolated into a dedicated <code className="text-accent-chaos">chaospatch/repair-...</code> branch.
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] text-text-muted mb-1">
                  GitHub Personal Access Token (PAT with repo push permissions)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#070A10] border border-canvas-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-chaos font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-text-muted mb-1">
                  Dedicated Repair Branch Name
                </label>
                <input
                  type="text"
                  value={customBranch}
                  onChange={(e) => setCustomBranch(e.target.value)}
                  className="w-full bg-[#070A10] border border-canvas-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-chaos font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-text-muted mb-1">
                  Commit Message
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-[#070A10] border border-canvas-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-chaos font-mono"
                />
              </div>
            </div>

            {publishError && (
              <div className="p-3 rounded-lg bg-accent-failure/10 border border-accent-failure/30 text-accent-failure text-[11px]">
                {publishError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-lg text-text-muted hover:text-text-primary transition"
                disabled={isPublishing}
              >
                Cancel
              </button>
              <button
                onClick={handlePublishBranch}
                disabled={isPublishing || !githubToken.trim()}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-accent-chaos hover:bg-amber-400 disabled:opacity-40 text-canvas font-bold transition shadow-glow-amber cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Pushing Branch...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Authorize & Push Branch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
