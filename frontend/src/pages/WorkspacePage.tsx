import React, { useState, useEffect } from 'react';
import {
  Play,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  Shield,
  Cpu,
  Clock,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import {
  Experiment,
  ExperimentEvent,
  Incident,
  EvidenceItem,
  RepairAttempt,
  VerificationRun,
  ExperimentReport,
} from '../types';
import { StageTracker } from '../components/StageTracker';
import { LogTerminal } from '../components/LogTerminal';
import { DiffViewer } from '../components/DiffViewer';
import { VerificationCard } from '../components/VerificationCard';
import { ReportView } from '../components/ReportView';

interface WorkspacePageProps {
  experimentId: number | null;
  onNavigateLauncher: () => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ experimentId, onNavigateLauncher }) => {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [events, setEvents] = useState<ExperimentEvent[]>([]);
  const [repairs, setRepairs] = useState<RepairAttempt[]>([]);
  const [verifications, setVerifications] = useState<VerificationRun[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [report, setReport] = useState<ExperimentReport | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [acting, setActing] = useState(false);

  // Poll / fetch data
  const loadExperimentData = async (id: number) => {
    try {
      const exp = await api.getExperiment(id);
      setExperiment(exp);

      const evs = await api.getExperimentEvents(id);
      setEvents(evs);

      const reps = await api.getExperimentRepairs(id);
      setRepairs(reps);

      const vers = await api.getExperimentVerification(id);
      setVerifications(vers);

      const evid = await api.getExperimentEvidence(id);
      setEvidence(evid);

      if (exp.status === 'COMPLETED' || exp.status === 'VERIFICATION_FAILED') {
        const rep = await api.getExperimentReport(id);
        setReport(rep);
        if (rep.incident) setIncident(rep.incident);
      }
    } catch (err) {
      console.error('Error fetching experiment details', err);
    }
  };

  useEffect(() => {
    if (!experimentId) return;

    loadExperimentData(experimentId);

    // Subscribe to SSE
    const unsubscribe = api.subscribeToExperiment(
      experimentId,
      (newEvent) => {
        setEvents((prev) => [...prev, newEvent]);
        // Trigger refresh of state data on key events
        if (
          newEvent.event_type.startsWith('STAGE_') ||
          newEvent.event_type === 'PATCH_PROPOSED' ||
          newEvent.event_type === 'REPORT_READY'
        ) {
          loadExperimentData(experimentId);
        }
      },
      (err) => console.warn('SSE connection notice', err)
    );

    // Periodic safety poll
    const interval = setInterval(() => loadExperimentData(experimentId), 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [experimentId]);

  if (!experimentId || !experiment) {
    return (
      <div className="rounded-xl border border-canvas-border bg-canvas-card p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-accent-chaos/10 border border-accent-chaos/30 flex items-center justify-center mx-auto text-accent-chaos">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-base font-mono font-bold text-text-primary">No Active Workspace Selected</h2>
        <p className="text-xs font-mono text-text-muted max-w-md mx-auto">
          Launch a new chaos injection experiment to observe the autonomous repair & verification cycle in a disposable
          sandbox.
        </p>
        <button
          onClick={onNavigateLauncher}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded bg-accent-chaos text-canvas font-mono text-xs font-bold hover:bg-amber-400 transition"
        >
          <Play className="w-4 h-4" />
          <span>Launch Scenario</span>
        </button>
      </div>
    );
  }

  const latestRepair = repairs[repairs.length - 1];
  const isAwaitingReview = experiment.status === 'PATCH_REVIEW' && latestRepair;
  const isCompleted = experiment.status === 'COMPLETED';
  const isTerminal = [
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'VERIFICATION_FAILED',
    'PATCH_REJECTED',
    'AI_UNAVAILABLE',
  ].includes(experiment.status);

  const handleApprovePatch = async () => {
    if (!latestRepair) return;
    setActing(true);
    try {
      await api.approveRepair(experiment.id, latestRepair.id);
      loadExperimentData(experiment.id);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActing(false);
    }
  };

  const handleRejectPatch = async () => {
    if (!latestRepair) return;
    setActing(true);
    try {
      await api.rejectRepair(experiment.id, latestRepair.id);
      loadExperimentData(experiment.id);
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this experiment and clean up the sandbox?')) return;
    try {
      await api.cancelExperiment(experiment.id);
      loadExperimentData(experiment.id);
    } catch (err: any) {
      alert(`Cancel error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-canvas-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-mono font-bold text-accent-chaos">#EXP-{experiment.id}</span>
            <span className="text-base font-mono font-bold text-text-primary">
              — {experiment.scenario_type}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono text-text-muted mt-1">
            <span>Target: {experiment.target_environment}</span>
            <span>•</span>
            <span>Created: {new Date(experiment.created_at).toLocaleTimeString()}</span>
            {experiment.duration_ms && (
              <>
                <span>•</span>
                <span className="flex items-center space-x-1 text-text-secondary">
                  <Clock className="w-3 h-3 text-accent-chaos" />
                  <span>{experiment.duration_ms} ms</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {!isTerminal && (
            <button
              onClick={handleCancel}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-canvas-card border border-canvas-border hover:border-accent-failure/50 text-accent-failure text-xs font-mono transition"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Experiment</span>
            </button>
          )}

          {(isCompleted || report) && (
            <button
              onClick={() => setShowFullReport(!showFullReport)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded bg-canvas-card border border-canvas-border hover:border-accent-chaos text-xs font-mono text-text-primary transition"
            >
              <FileText className="w-3.5 h-3.5 text-accent-chaos" />
              <span>{showFullReport ? 'Hide Incident Report' : 'View Full Post-Mortem'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stage Tracker Pipeline */}
      <StageTracker currentStatus={experiment.status} finalVerified={experiment.final_verified} />

      {/* If Full Report view requested */}
      {showFullReport && report && (
        <div className="border border-canvas-border rounded-xl p-6 bg-canvas-card/60">
          <ReportView report={report} />
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Diagnostics, Proposed Patch & Review */}
        <div className="space-y-6">
          {/* AI Diagnosis Card */}
          <div className="rounded-lg border border-canvas-border bg-canvas-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-accent-purple">
                <Cpu className="w-4 h-4" />
                <span>AI Root-Cause Diagnosis (Qwen-30B)</span>
              </div>
              {latestRepair && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canvas-surface border border-canvas-border text-text-muted">
                  Attempt #{latestRepair.attempt_number}
                </span>
              )}
            </div>

            {latestRepair?.diagnosis ? (
              <div className="space-y-3">
                <div className="text-xs font-mono text-text-secondary bg-canvas-surface/80 p-3 rounded border border-canvas-border leading-relaxed">
                  {latestRepair.diagnosis}
                </div>
                {latestRepair.risk_summary && (
                  <div className="text-[11px] font-mono text-text-muted">
                    <span className="font-bold text-text-secondary">Risk Analysis:</span>{' '}
                    {latestRepair.risk_summary}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs font-mono text-text-muted py-6 text-center flex items-center justify-center space-x-2">
                {experiment.status === 'DIAGNOSING' ? (
                  <>
                    <Loader2 className="w-4 h-4 text-accent-purple animate-spin" />
                    <span>Analyzing evidence & synthesizing patch...</span>
                  </>
                ) : (
                  <span>Diagnosis pending fault observation stage.</span>
                )}
              </div>
            )}
          </div>

          {/* Patch Review Panel */}
          {latestRepair?.patch_diff && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-text-primary flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-accent-chaos" />
                  <span>Candidate Patch & Safety Validation</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    latestRepair.validation_status === 'PASSED'
                      ? 'bg-accent-success/20 text-accent-success'
                      : 'bg-accent-failure/20 text-accent-failure'
                  }`}
                >
                  Validation: {latestRepair.validation_status || 'CHECKING'}
                </span>
              </div>

              {/* Unified Diff */}
              <DiffViewer diff={latestRepair.patch_diff} title="Synthesized Candidate Patch" />

              {/* Review CTAs if in PATCH_REVIEW state */}
              {isAwaitingReview && (
                <div className="p-4 rounded-lg border border-accent-chaos/40 bg-accent-chaos/5 space-y-3">
                  <div className="text-xs font-mono text-text-primary font-bold">
                    Operator Review Required:
                  </div>
                  <div className="text-xs font-mono text-text-secondary">
                    Review the candidate patch above. If approved, CHAOSPATCH will apply it to the isolated
                    workspace and trigger independent verification tests.
                  </div>
                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      onClick={handleApprovePatch}
                      disabled={acting}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded bg-accent-success hover:bg-emerald-400 text-canvas font-mono text-xs font-bold transition shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>APPROVE & VERIFY REPAIR</span>
                    </button>
                    <button
                      onClick={handleRejectPatch}
                      disabled={acting}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded bg-canvas-card border border-canvas-border hover:border-accent-failure text-accent-failure font-mono text-xs font-bold transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>REJECT PATCH</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Results Panel */}
          <VerificationCard verifications={verifications} />
        </div>

        {/* Right Column: Terminal Logs & Evidence Feed */}
        <div className="space-y-6">
          <LogTerminal events={events} title={`Live Log & Event Stream (#EXP-${experiment.id})`} />

          {/* Evidence Package Accordion */}
          <div className="rounded-lg border border-canvas-border bg-canvas-card overflow-hidden">
            <div className="px-4 py-3 bg-canvas-surface border-b border-canvas-border flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-text-primary">
                Collected Evidence Package ({evidence.length})
              </span>
              <span className="text-[10px] font-mono text-text-muted">Stable Provenance</span>
            </div>

            <div className="divide-y divide-canvas-border max-h-72 overflow-y-auto font-mono text-xs">
              {evidence.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-xs">
                  Collecting evidence from reproduction tests...
                </div>
              ) : (
                evidence.map((item) => (
                  <div key={item.id} className="p-3 hover:bg-canvas-hover/20 transition space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-accent-chaos">{item.id}</span>
                      <span className="text-text-muted uppercase text-[10px]">{item.evidence_type}</span>
                    </div>
                    <div className="text-text-muted text-[11px] truncate">Source: {item.source}</div>
                    <div className="p-2 rounded bg-[#070A10] border border-canvas-border text-[11px] text-text-secondary whitespace-pre-wrap max-h-20 overflow-y-auto">
                      {item.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
