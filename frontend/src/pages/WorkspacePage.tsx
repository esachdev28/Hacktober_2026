import React, { useState, useEffect } from 'react';
import {
  Play,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Shield,
  Cpu,
  Clock,
  Sparkles,
  Loader2,
  Layers,
  Terminal,
  FileSearch,
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
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { EmptyState } from '../components/ui/EmptyState';

interface WorkspacePageProps {
  experimentId: number | null;
  onNavigateLauncher: () => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  experimentId,
  onNavigateLauncher,
}) => {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [events, setEvents] = useState<ExperimentEvent[]>([]);
  const [repairs, setRepairs] = useState<RepairAttempt[]>([]);
  const [verifications, setVerifications] = useState<VerificationRun[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
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
      <EmptyState
        icon={Terminal}
        title="No Active Workspace Selected"
        description="Select an ongoing experiment from the Overview, or launch a new chaos injection scenario to observe autonomous recovery."
        action={
          <button
            onClick={onNavigateLauncher}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-accent-chaos text-canvas font-mono text-xs font-bold hover:bg-amber-400 transition cursor-pointer shadow-glow-amber"
          >
            <Play className="w-4 h-4" />
            <span>Launch Scenario</span>
          </button>
        }
      />
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
    <div className="space-y-6 font-mono">
      {/* Top Workbench Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-canvas-border bg-canvas-card">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-3">
            <span className="text-base sm:text-lg font-bold text-accent-chaos">
              #EXP-{experiment.id}
            </span>
            <span className="text-base sm:text-lg font-bold text-text-primary">
              — {experiment.scenario_type}
            </span>
            <StatusIndicator status={experiment.status} size="sm" />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span>Target: <code className="text-text-secondary">{experiment.target_environment}</code></span>
            <span>•</span>
            <span>Started: {new Date(experiment.created_at).toLocaleTimeString()}</span>
            {experiment.duration_ms && (
              <>
                <span>•</span>
                <span className="flex items-center space-x-1 text-text-secondary">
                  <Clock className="w-3.5 h-3.5 text-accent-chaos" />
                  <span>{experiment.duration_ms} ms</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {!isTerminal && (
            <button
              onClick={handleCancel}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-canvas-surface border border-accent-failure/40 text-accent-failure hover:bg-accent-failure/10 text-xs transition cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Experiment</span>
            </button>
          )}

          {(isCompleted || report) && (
            <button
              onClick={() => setShowFullReport(!showFullReport)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-canvas-surface border border-canvas-border hover:border-accent-chaos text-xs text-text-primary transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-accent-chaos" />
              <span>{showFullReport ? 'Hide Post-Mortem' : 'View Post-Mortem'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stage Tracker Pipeline */}
      <StageTracker currentStatus={experiment.status} finalVerified={experiment.final_verified} />

      {/* Post-Mortem Report Dropdown if toggled */}
      {showFullReport && report && (
        <div className="border border-canvas-border rounded-xl p-6 bg-canvas-card/80 shadow-2xl">
          <ReportView report={report} />
        </div>
      )}

      {/* Two Column Command Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Diagnostics, Proposed Patch & Review */}
        <div className="space-y-6">
          {/* AI Hypothesis Card */}
          <div className="rounded-xl border border-canvas-border bg-canvas-card p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-accent-purple">
                <Cpu className="w-4 h-4" />
                <span>AI Root-Cause Diagnosis</span>
              </div>
              {latestRepair && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-canvas-surface border border-canvas-border text-text-muted">
                  Attempt #{latestRepair.attempt_number}
                </span>
              )}
            </div>

            {latestRepair?.diagnosis ? (
              <div className="space-y-3">
                <div className="text-xs text-text-secondary bg-[#070A10] p-3.5 rounded-lg border border-canvas-border leading-relaxed">
                  {latestRepair.diagnosis}
                </div>
                {latestRepair.risk_summary && (
                  <div className="text-[11px] text-text-muted flex items-start space-x-1.5">
                    <span className="font-bold text-text-secondary shrink-0">Risk Assessment:</span>
                    <span>{latestRepair.risk_summary}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-text-muted py-8 text-center flex items-center justify-center space-x-2">
                {experiment.status === 'DIAGNOSING' ? (
                  <>
                    <Loader2 className="w-4 h-4 text-accent-purple animate-spin" />
                    <span>Analyzing evidence & synthesizing candidate patch...</span>
                  </>
                ) : (
                  <span>Diagnosis pending fault observation stage.</span>
                )}
              </div>
            )}
          </div>

          {/* Unified Diff & Review Panel */}
          {latestRepair?.patch_diff && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-text-primary flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-accent-chaos" />
                  <span>Synthesized Candidate Patch</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                    latestRepair.validation_status === 'PASSED'
                      ? 'bg-accent-success/15 text-accent-success border-accent-success/30'
                      : 'bg-accent-failure/15 text-accent-failure border-accent-failure/30'
                  }`}
                >
                  Validation: {latestRepair.validation_status || 'CHECKING'}
                </span>
              </div>

              <DiffViewer diff={latestRepair.patch_diff} title="Unified Diff Patch" />

              {/* Operator Action Callout if in PATCH_REVIEW */}
              {isAwaitingReview && (
                <div className="p-4 rounded-xl border border-accent-chaos/40 bg-accent-chaos/5 space-y-3">
                  <div className="text-xs text-text-primary font-bold">
                    Operator Review Required:
                  </div>
                  <div className="text-xs text-text-secondary">
                    Review the synthesized diff above. If approved, CHAOSPATCH will apply it to the isolated
                    disposable workspace and trigger independent verification checks.
                  </div>
                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      onClick={handleApprovePatch}
                      disabled={acting}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-accent-success hover:bg-emerald-400 text-canvas text-xs font-bold transition shadow cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>APPROVE & VERIFY REPAIR</span>
                    </button>
                    <button
                      onClick={handleRejectPatch}
                      disabled={acting}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-canvas-card border border-canvas-border hover:border-accent-failure text-accent-failure text-xs font-bold transition cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>REJECT PATCH</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Results Scorecard */}
          <VerificationCard verifications={verifications} />
        </div>

        {/* Right Column: Terminal Logs & Evidence Feed */}
        <div className="space-y-6">
          <LogTerminal events={events} title={`Live Log Stream (#EXP-${experiment.id})`} />

          {/* Evidence Package Accordion */}
          <div className="rounded-xl border border-canvas-border bg-canvas-card overflow-hidden">
            <div className="px-5 py-3.5 bg-canvas-surface/80 border-b border-canvas-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSearch className="w-4 h-4 text-accent-chaos" />
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Evidence Package ({evidence.length})
                </span>
              </div>
              <span className="text-[10px] text-text-muted">Stable Provenance</span>
            </div>

            <div className="divide-y divide-canvas-border max-h-80 overflow-y-auto text-xs">
              {evidence.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-xs">
                  Awaiting evidence from reproduction checks...
                </div>
              ) : (
                evidence.map((item) => (
                  <div key={item.id} className="p-3.5 hover:bg-canvas-hover/20 transition space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-accent-chaos">#{item.id}</span>
                      <span className="text-text-muted uppercase text-[10px]">{item.evidence_type}</span>
                    </div>
                    <div className="text-text-muted text-[11px] truncate">Source: {item.source}</div>
                    <div className="p-2.5 rounded bg-[#070A10] border border-canvas-border text-[11px] text-text-secondary whitespace-pre-wrap max-h-24 overflow-y-auto">
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
