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
} from 'lucide-react';
import { api } from '../api/client';
import {
  ProjectInspectionResult,
  RepoBaselineResponse,
  RepoDiagnosisPatchResponse,
  RepoPatchVerifyResponse,
  RepoPublishResponse,
} from '../types';

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
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 rounded bg-accent-chaos/10 border border-accent-chaos/30 text-accent-chaos">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Universal Public GitHub Repository Mode
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Repository-Agnostic AI Reliability, Docker Isolation & Verified Repair Engine
            </p>
          </div>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed max-w-4xl">
          Submit any public GitHub repository URL. CHAOSPATCH detects project technology manifests, executes
          safe bounded baseline checks inside disposable Docker sandboxes (<span className="font-mono text-accent-cyan">--network none</span>),
          collects sanitized evidence, requests structured AI repair hypotheses, and independently verifies
          patches before offering export or authorized branch publishing.
        </p>
      </div>

      {/* Repository Intake Bar */}
      <div className="bg-canvas-subtle border border-canvas-border rounded-lg p-5">
        <form onSubmit={handleInspect} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-text-secondary mb-1.5">
              PUBLIC GITHUB REPOSITORY HTTPS URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full bg-canvas border border-canvas-border rounded pl-9 pr-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-chaos"
                />
              </div>
              <button
                type="submit"
                disabled={isInspecting || !repoUrl.trim()}
                className="px-4 py-2 bg-accent-chaos hover:bg-accent-chaos/90 disabled:opacity-50 text-canvas font-mono font-bold text-xs rounded transition flex items-center space-x-2"
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
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-text-muted text-[11px]">Quick Samples:</span>
            {quickSamples.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => setRepoUrl(sample.url)}
                className="px-2 py-0.5 rounded bg-canvas border border-canvas-border text-text-secondary hover:text-text-primary hover:border-text-muted text-[11px] transition"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {/* Advanced Intake Options */}
          <div className="pt-2 border-t border-canvas-border grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1">
                PROJECT ROOT SUBDIRECTORY (FOR MONOREPOS)
              </label>
              <input
                type="text"
                value={projectRoot}
                onChange={(e) => setProjectRoot(e.target.value)}
                placeholder="/"
                className="w-full bg-canvas border border-canvas-border rounded px-2.5 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-chaos"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1">
                TARGET BRANCH OR COMMIT (OPTIONAL)
              </label>
              <input
                type="text"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                placeholder="Default Branch"
                className="w-full bg-canvas border border-canvas-border rounded px-2.5 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-chaos"
              />
            </div>
          </div>
        </form>

        {intakeError && (
          <div className="mt-4 p-3 rounded bg-accent-crimson/10 border border-accent-crimson/30 text-accent-crimson text-xs font-mono flex items-center space-x-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{intakeError}</span>
          </div>
        )}
      </div>

      {/* Card 1: Project & Technology Stack Inspection */}
      {inspectionResult && (
        <div className="bg-canvas-subtle border border-canvas-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-accent-cyan/15 text-accent-cyan flex items-center justify-center text-xs font-mono font-bold">
                1
              </span>
              <h2 className="text-sm font-bold font-mono text-text-primary">
                PROJECT DETECTION & ADAPTER CAPABILITIES
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                {inspectionResult.primary_language}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-canvas border border-canvas-border text-text-secondary">
                Branch: {inspectionResult.default_branch}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-canvas border border-canvas-border text-text-secondary">
                Commit: {inspectionResult.base_commit_sha.slice(0, 8)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-canvas p-3 rounded border border-canvas-border">
              <div className="text-text-muted text-[11px] mb-1">TARGET REPOSITORY</div>
              <div className="font-bold text-text-primary truncate">
                {inspectionResult.owner}/{inspectionResult.name}
              </div>
              <div className="text-[10px] text-text-muted mt-1 truncate">
                {inspectionResult.repo_url}
              </div>
            </div>

            <div className="bg-canvas p-3 rounded border border-canvas-border">
              <div className="text-text-muted text-[11px] mb-1">DETECTED MANIFESTS & FRAMEWORKS</div>
              <div className="font-bold text-text-primary truncate">
                {inspectionResult.manifest_files.join(', ') || 'Standard Layout'}
              </div>
              <div className="text-[10px] text-text-muted mt-1">
                Test Runner: {inspectionResult.test_framework || 'Auto-Detected'}
              </div>
            </div>

            <div className="bg-canvas p-3 rounded border border-canvas-border">
              <div className="text-text-muted text-[11px] mb-1">SANDBOX EXECUTION ADAPTER</div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse" />
                <span className="font-bold text-accent-amber">
                  {inspectionResult.capabilities.isolation_mode}
                </span>
              </div>
              <div className="text-[10px] text-text-muted mt-1">
                {inspectionResult.capabilities.notes || 'Full container isolation enabled.'}
              </div>
            </div>
          </div>

          {/* Action to trigger baseline checks */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleRunBaseline}
              disabled={isRunningBaseline}
              className="px-4 py-2 bg-accent-cyan hover:bg-accent-cyan/90 disabled:opacity-50 text-canvas font-mono font-bold text-xs rounded transition flex items-center space-x-2"
            >
              {isRunningBaseline ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Docker Baseline Tests...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Run Isolated Baseline Checks</span>
                </>
              )}
            </button>
          </div>

          {baselineError && (
            <div className="p-3 rounded bg-accent-crimson/10 border border-accent-crimson/30 text-accent-crimson text-xs font-mono flex items-center space-x-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{baselineError}</span>
            </div>
          )}
        </div>
      )}

      {/* Card 2: Baseline Checks & Sanitized Evidence */}
      {baselineResult && (
        <div className="bg-canvas-subtle border border-canvas-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-accent-amber/15 text-accent-amber flex items-center justify-center text-xs font-mono font-bold">
                2
              </span>
              <h2 className="text-sm font-bold font-mono text-text-primary">
                BASELINE EVIDENCE & REPRODUCIBILITY STATUS
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                  baselineResult.baseline_status === 'FAILURE_REPRODUCED'
                    ? 'bg-accent-crimson/15 text-accent-crimson border border-accent-crimson/30'
                    : baselineResult.baseline_status === 'BASELINE_PASSED'
                    ? 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30'
                    : 'bg-canvas border border-canvas-border text-text-muted'
                }`}
              >
                {baselineResult.baseline_status}
              </span>
              <span className="text-xs font-mono text-text-muted">
                {baselineResult.duration_ms}ms | Exit {baselineResult.exit_code}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>CONTAINER TEST EXECUTION OUTPUT (BOUNDED & SANITIZED)</span>
              <span>{baselineResult.evidence_count} evidence items recorded</span>
            </div>
            <pre className="p-3 rounded bg-canvas border border-canvas-border text-[11px] font-mono text-text-secondary overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
              {baselineResult.output_excerpt || 'No output recorded'}
            </pre>
          </div>

          {/* Action to trigger AI diagnosis */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleDiagnoseAndPatch}
              disabled={isDiagnosing}
              className="px-4 py-2 bg-accent-chaos hover:bg-accent-chaos/90 disabled:opacity-50 text-canvas font-mono font-bold text-xs rounded transition flex items-center space-x-2"
            >
              {isDiagnosing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Requesting AI Diagnosis (NVIDIA NIM)...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Generate AI Diagnosis & Patch</span>
                </>
              )}
            </button>
          </div>

          {diagnosisError && (
            <div className="p-3 rounded bg-accent-crimson/10 border border-accent-crimson/30 text-accent-crimson text-xs font-mono flex items-center space-x-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{diagnosisError}</span>
            </div>
          )}
        </div>
      )}

      {/* Card 3: AI Diagnosis & Proposed Patch Review */}
      {diagnosisResult && (
        <div className="bg-canvas-subtle border border-canvas-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-accent-chaos/15 text-accent-chaos flex items-center justify-center text-xs font-mono font-bold">
                3
              </span>
              <h2 className="text-sm font-bold font-mono text-text-primary">
                PROPOSED REPAIR PATCH & SAFETY ANALYSIS
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-canvas border border-canvas-border text-text-secondary">
                Confidence: {Math.round(diagnosisResult.confidence * 100)}%
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent-chaos/15 text-accent-chaos border border-accent-chaos/30">
                {diagnosisResult.provider}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="bg-canvas p-3 rounded border border-canvas-border space-y-1">
              <div className="font-bold text-text-primary">{diagnosisResult.title}</div>
              <div className="text-text-secondary">{diagnosisResult.root_cause}</div>
              <div className="text-text-muted text-[11px] pt-1">{diagnosisResult.explanation}</div>
            </div>

            {/* Unified Diff Viewer */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>VALIDATED UNIFIED DIFF</span>
                <span className="text-accent-amber">{diagnosisResult.risk_summary}</span>
              </div>
              <pre className="p-3 rounded bg-[#0a0c10] border border-canvas-border text-[11px] font-mono text-text-primary overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed">
                {diagnosisResult.proposed_patch_diff.split('\n').map((line, idx) => {
                  let colorClass = 'text-text-secondary';
                  if (line.startsWith('+') && !line.startsWith('+++')) colorClass = 'text-accent-amber font-semibold';
                  if (line.startsWith('-') && !line.startsWith('---')) colorClass = 'text-accent-crimson font-semibold';
                  if (line.startsWith('@@')) colorClass = 'text-accent-cyan';
                  return (
                    <div key={idx} className={colorClass}>
                      {line}
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* Explicit Authorization Switch */}
            <div className="p-3 rounded bg-canvas border border-canvas-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-accent-amber" />
                <div>
                  <div className="font-bold text-text-primary">
                    Authorize Patch Application in Disposable Sandbox
                  </div>
                  <div className="text-[10px] text-text-muted">
                    No changes will touch your repository until independently verified and authorized.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={patchAuthorized}
                onChange={(e) => setPatchAuthorized(e.target.checked)}
                className="w-4 h-4 accent-accent-chaos rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Action to verify patch */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleVerifyPatch}
              disabled={isVerifying || !patchAuthorized}
              className="px-4 py-2 bg-accent-amber hover:bg-accent-amber/90 disabled:opacity-50 text-canvas font-mono font-bold text-xs rounded transition flex items-center space-x-2"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying in Docker Container...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Run Independent Verification in Sandbox</span>
                </>
              )}
            </button>
          </div>

          {verifyError && (
            <div className="p-3 rounded bg-accent-crimson/10 border border-accent-crimson/30 text-accent-crimson text-xs font-mono flex items-center space-x-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}
        </div>
      )}

      {/* Card 4: Independent Verification Outcome */}
      {verifyResult && (
        <div className="bg-canvas-subtle border border-canvas-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-accent-amber/15 text-accent-amber flex items-center justify-center text-xs font-mono font-bold">
                4
              </span>
              <h2 className="text-sm font-bold font-mono text-text-primary">
                INDEPENDENT VERIFICATION ENGINE VERDICT
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center space-x-1.5 ${
                  verifyResult.verification_status === 'VERIFIED'
                    ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/40'
                    : 'bg-accent-crimson/20 text-accent-crimson border border-accent-crimson/40'
                }`}
              >
                {verifyResult.verification_status === 'VERIFIED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>{verifyResult.verification_status}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-canvas p-2.5 rounded border border-canvas-border">
              <div className="text-text-muted text-[10px]">TARGET FAILURE RESOLVED</div>
              <div className="font-bold text-text-primary mt-0.5">
                {verifyResult.target_failure_resolved ? 'YES (Reproduction Passed)' : 'NO (Persisting)'}
              </div>
            </div>
            <div className="bg-canvas p-2.5 rounded border border-canvas-border">
              <div className="text-text-muted text-[10px]">REGRESSIONS DETECTED</div>
              <div className="font-bold text-text-primary mt-0.5">
                {verifyResult.regressions_detected ? 'YES (Regression Found)' : 'NONE (Clean)'}
              </div>
            </div>
            <div className="bg-canvas p-2.5 rounded border border-canvas-border">
              <div className="text-text-muted text-[10px]">SANDBOX TEST TIME</div>
              <div className="font-bold text-text-primary mt-0.5">{verifyResult.duration_ms}ms</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-mono text-text-muted">RE-TEST TERMINAL OUTPUT</div>
            <pre className="p-3 rounded bg-canvas border border-canvas-border text-[11px] font-mono text-text-secondary overflow-x-auto max-h-40 whitespace-pre-wrap leading-relaxed">
              {verifyResult.test_output_excerpt || 'All checks executed.'}
            </pre>
          </div>

          {/* Export & Publishing Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-canvas-border">
            <a
              href={api.getPatchExportUrl(verifyResult.experiment_id)}
              download={`chaospatch-repair-${verifyResult.experiment_id}.patch`}
              className="px-4 py-2 bg-canvas hover:bg-canvas-hover border border-canvas-border text-text-primary font-mono text-xs rounded transition flex items-center space-x-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Verified .patch</span>
            </a>

            <button
              onClick={() => setShowPublishModal(true)}
              className="px-4 py-2 bg-accent-amber hover:bg-accent-amber/90 text-canvas font-mono font-bold text-xs rounded transition flex items-center space-x-2"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Publish Dedicated Repair Branch</span>
            </button>
          </div>

          {publishResult && (
            <div className="p-3 rounded bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-xs font-mono space-y-1">
              <div className="flex items-center space-x-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Repair branch successfully published!</span>
              </div>
              <div className="text-text-secondary text-[11px]">
                Branch: <span className="font-bold">{publishResult.published_branch}</span> (Commit: {publishResult.commit_sha?.slice(0, 8)})
              </div>
              {publishResult.remote_branch_url && (
                <div>
                  <a
                    href={publishResult.remote_branch_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-cyan hover:underline inline-flex items-center space-x-1"
                  >
                    <span>View Branch on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Publish Modal with Strict Safety Policy */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas-subtle border border-canvas-border rounded-lg max-w-lg w-full p-6 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <div className="flex items-center space-x-2 text-accent-amber">
                <Lock className="w-4 h-4" />
                <h3 className="text-sm font-bold">AUTHORIZED REPAIR BRANCH PUBLISHING</h3>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-text-secondary space-y-2">
              <p>
                Publish verified changes to an isolated branch on{' '}
                <span className="text-text-primary font-bold">{inspectionResult?.owner}/{inspectionResult?.name}</span>.
              </p>
              <div className="p-2.5 rounded bg-canvas border border-canvas-border text-[11px] text-text-muted space-y-1">
                <div className="text-accent-amber font-semibold">Strict Guardrails Enforced:</div>
                <div>• Never pushes to default branch (<span className="text-accent-crimson">main/master prohibited</span>)</div>
                <div>• Force-pushes (<span className="text-accent-crimson">--force</span>) are blocked</div>
                <div>• Does not merge or open pull requests automatically</div>
                <div>• Token is used in memory only and never stored in database or git remotes</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-text-muted text-[11px] mb-1">
                  GITHUB PERSONAL ACCESS TOKEN (PAT with 'repo' scope)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-canvas border border-canvas-border rounded px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-amber"
                />
              </div>

              <div>
                <label className="block text-text-muted text-[11px] mb-1">
                  DEDICATED REPAIR BRANCH NAME
                </label>
                <input
                  type="text"
                  value={customBranch}
                  onChange={(e) => setCustomBranch(e.target.value)}
                  className="w-full bg-canvas border border-canvas-border rounded px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-amber"
                />
              </div>

              <div>
                <label className="block text-text-muted text-[11px] mb-1">
                  COMMIT MESSAGE
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="fix(repair): verified patch applied by CHAOSPATCH"
                  className="w-full bg-canvas border border-canvas-border rounded px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-amber"
                />
              </div>
            </div>

            {publishError && (
              <div className="p-2.5 rounded bg-accent-crimson/10 border border-accent-crimson/30 text-accent-crimson text-xs">
                {publishError}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-canvas-border">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-3 py-1.5 rounded bg-canvas border border-canvas-border text-text-secondary hover:text-text-primary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishBranch}
                disabled={isPublishing || !githubToken.trim()}
                className="px-4 py-1.5 rounded bg-accent-amber hover:bg-accent-amber/90 disabled:opacity-50 text-canvas font-bold text-xs flex items-center space-x-1.5"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Pushing Branch...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Confirm & Publish</span>
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
