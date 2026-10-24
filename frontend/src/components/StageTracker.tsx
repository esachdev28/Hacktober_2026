import React from 'react';
import { Check, AlertCircle, Clock, Loader2, XCircle } from 'lucide-react';
import { ExperimentStatus } from '../types';

interface StageTrackerProps {
  currentStatus: ExperimentStatus;
  finalVerified?: boolean | null;
}

interface StageDef {
  key: string;
  label: string;
  statuses: ExperimentStatus[];
}

const STAGES: StageDef[] = [
  { key: 'baseline', label: '1. BASELINE', statuses: ['BASELINING'] },
  { key: 'injection', label: '2. INJECTION', statuses: ['INJECTING'] },
  { key: 'observation', label: '3. OBSERVATION', statuses: ['OBSERVING'] },
  { key: 'diagnosis', label: '4. DIAGNOSIS', statuses: ['DIAGNOSING'] },
  { key: 'review', label: '5. PATCH REVIEW', statuses: ['PATCH_REVIEW'] },
  { key: 'applying', label: '6. REPAIR', statuses: ['APPLYING'] },
  { key: 'verifying', label: '7. VERIFICATION', statuses: ['VERIFYING'] },
  { key: 'report', label: '8. REPORT', statuses: ['COMPLETED', 'VERIFICATION_FAILED'] },
];

const ORDERED_STATUS_FLOW: ExperimentStatus[] = [
  'CREATED',
  'BASELINING',
  'INJECTING',
  'OBSERVING',
  'DIAGNOSING',
  'PATCH_REVIEW',
  'APPLYING',
  'VERIFYING',
  'COMPLETED',
];

export const StageTracker: React.FC<StageTrackerProps> = ({ currentStatus, finalVerified }) => {
  const currentIndex = ORDERED_STATUS_FLOW.indexOf(currentStatus);
  const isFailed = currentStatus === 'FAILED' || currentStatus === 'VERIFICATION_FAILED';
  const isRejected = currentStatus === 'PATCH_REJECTED';
  const isCancelled = currentStatus === 'CANCELLED';

  const getStageState = (stageIndex: number) => {
    if (isCancelled) return 'cancelled';
    if (currentStatus === 'COMPLETED') return 'completed';
    if (currentStatus === 'VERIFICATION_FAILED' && stageIndex === 7) return 'failed';

    const stageStatus = STAGES[stageIndex].statuses[0];
    const targetFlowIndex = ORDERED_STATUS_FLOW.indexOf(stageStatus);

    if (currentIndex > targetFlowIndex) return 'completed';
    if (currentIndex === targetFlowIndex) {
      if (isFailed) return 'failed';
      if (isRejected && stageIndex === 4) return 'rejected';
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="w-full bg-canvas-card border border-canvas-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
          State Machine Progression
        </span>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-text-muted">Lifecycle Status:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold ${
              currentStatus === 'COMPLETED' && finalVerified
                ? 'bg-accent-success/20 text-accent-success border border-accent-success/40'
                : currentStatus === 'VERIFICATION_FAILED' || currentStatus === 'FAILED'
                ? 'bg-accent-failure/20 text-accent-failure border border-accent-failure/40'
                : currentStatus === 'PATCH_REVIEW'
                ? 'bg-accent-chaos/20 text-accent-chaos border border-accent-chaos/40 animate-pulse'
                : 'bg-canvas-surface text-text-secondary border border-canvas-border'
            }`}
          >
            {currentStatus}
          </span>
        </div>
      </div>

      {/* Pipeline Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {STAGES.map((stage, idx) => {
          const state = getStageState(idx);

          let borderClass = 'border-canvas-border';
          let bgClass = 'bg-canvas-surface/40 text-text-muted';
          let icon = <Clock className="w-3.5 h-3.5 text-text-muted" />;

          if (state === 'completed') {
            borderClass = 'border-accent-success/40';
            bgClass = 'bg-accent-success/10 text-accent-success';
            icon = <Check className="w-3.5 h-3.5 text-accent-success" />;
          } else if (state === 'active') {
            borderClass = 'border-accent-chaos shadow-lg shadow-accent-chaos/10';
            bgClass = 'bg-accent-chaos/15 text-accent-chaos font-semibold animate-pulse';
            icon = <Loader2 className="w-3.5 h-3.5 text-accent-chaos animate-spin" />;
          } else if (state === 'failed') {
            borderClass = 'border-accent-failure/60';
            bgClass = 'bg-accent-failure/10 text-accent-failure';
            icon = <XCircle className="w-3.5 h-3.5 text-accent-failure" />;
          } else if (state === 'rejected') {
            borderClass = 'border-accent-failure/40';
            bgClass = 'bg-accent-failure/10 text-accent-failure';
            icon = <AlertCircle className="w-3.5 h-3.5 text-accent-failure" />;
          }

          return (
            <div
              key={stage.key}
              className={`flex items-center space-x-2 px-2.5 py-2 rounded border text-xs font-mono transition-all ${borderClass} ${bgClass}`}
            >
              <div className="shrink-0">{icon}</div>
              <div className="truncate">{stage.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
