import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, ShieldCheck, Clock, Hash } from 'lucide-react';
import { RepoPatchVerifyResponse } from '../../types';

interface VerificationVerdictProps {
  result: RepoPatchVerifyResponse;
  className?: string;
}

export const VerificationVerdict: React.FC<VerificationVerdictProps> = ({ result, className = '' }) => {
  const status = result.verification_status;

  const isVerified = status === 'VERIFIED';
  const isFailed = status === 'FAILED';
  const isRejected = status === 'REJECTED';
  const isInconclusive = status === 'INCONCLUSIVE';

  const config = {
    VERIFIED: {
      border: 'border-accent-success/40 bg-accent-success/5',
      icon: CheckCircle2,
      iconColor: 'text-accent-success',
      badge: 'bg-accent-success/20 text-accent-success border-accent-success/30',
      headline: 'RECOVERY VERIFIED INDEPENDENTLY',
      subline: 'The proposed patch successfully resolved the target failure in the isolated test harness with zero regressions.',
    },
    FAILED: {
      border: 'border-accent-failure/40 bg-accent-failure/5',
      icon: XCircle,
      iconColor: 'text-accent-failure',
      badge: 'bg-accent-failure/20 text-accent-failure border-accent-failure/30',
      headline: 'VERIFICATION CHECKS FAILED',
      subline: 'The applied patch executed, but tests still failed or regressions were detected in the sandbox workspace.',
    },
    REJECTED: {
      border: 'border-rose-400/40 bg-rose-500/5',
      icon: AlertTriangle,
      iconColor: 'text-rose-400',
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      headline: 'PATCH REJECTED BY SAFETY VALIDATOR',
      subline: 'The candidate patch was rejected (invalid unified diff, missing headers, or unauthorized modifications).',
    },
    INCONCLUSIVE: {
      border: 'border-amber-500/40 bg-amber-500/5',
      icon: HelpCircle,
      iconColor: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      headline: 'VERIFICATION INCONCLUSIVE',
      subline: 'Post-patch verification could not complete conclusively (Docker sandbox unavailable, test timeout, or harness execution error).',
    },
  }[status] || {
    border: 'border-canvas-border bg-canvas-card',
    icon: HelpCircle,
    iconColor: 'text-text-muted',
    badge: 'bg-canvas-surface text-text-muted border-canvas-border',
    headline: `STATUS: ${status}`,
    subline: result.summary || 'Verification run concluded.',
  };

  const Icon = config.icon;

  return (
    <div className={`rounded-xl border p-5 font-mono space-y-4 ${config.border} ${className}`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-canvas-surface border border-canvas-border shrink-0 ${config.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm sm:text-base text-text-primary tracking-tight">
                {config.headline}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 max-w-xl">
              {config.subline}
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border shrink-0 ${config.badge}`}>
          {status}
        </span>
      </div>

      {/* Grid of Verified Assertions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
        {/* Target Failure Resolved */}
        <div className="p-3 rounded-lg bg-canvas-surface/80 border border-canvas-border">
          <div className="text-[10px] text-text-muted uppercase">Target Failure</div>
          <div className="font-bold mt-1 flex items-center space-x-1.5">
            {result.target_failure_resolved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
                <span className="text-accent-success">RESOLVED</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-accent-failure" />
                <span className="text-accent-failure">PERSISTENT</span>
              </>
            )}
          </div>
        </div>

        {/* Regressions */}
        <div className="p-3 rounded-lg bg-canvas-surface/80 border border-canvas-border">
          <div className="text-[10px] text-text-muted uppercase">Regressions</div>
          <div className="font-bold mt-1 flex items-center space-x-1.5">
            {result.regressions_detected ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-accent-failure" />
                <span className="text-accent-failure">DETECTED</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-accent-success" />
                <span className="text-accent-success">NONE (CLEAN)</span>
              </>
            )}
          </div>
        </div>

        {/* Patch Validity */}
        <div className="p-3 rounded-lg bg-canvas-surface/80 border border-canvas-border">
          <div className="text-[10px] text-text-muted uppercase">Diff Validity</div>
          <div className="font-bold mt-1 flex items-center space-x-1.5">
            {result.patch_valid ? (
              <span className="text-accent-success">SYNTAX VALID</span>
            ) : (
              <span className="text-accent-failure">MALFORMED</span>
            )}
          </div>
        </div>

        {/* Post-patch test duration */}
        <div className="p-3 rounded-lg bg-canvas-surface/80 border border-canvas-border">
          <div className="text-[10px] text-text-muted uppercase">Test Duration</div>
          <div className="font-bold mt-1 flex items-center space-x-1.5 text-text-primary">
            <Clock className="w-3.5 h-3.5 text-accent-chaos" />
            <span>{result.duration_ms} ms</span>
          </div>
        </div>
      </div>

      {/* Summary Narrative or Diff Hash */}
      {(result.summary || result.diff_hash) && (
        <div className="p-3 rounded-lg bg-[#070A10] border border-canvas-border text-[11px] text-text-secondary flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {result.summary && <span>{result.summary}</span>}
          {result.diff_hash && (
            <span className="text-text-muted shrink-0 flex items-center space-x-1">
              <Hash className="w-3 h-3 text-accent-chaos" />
              <span>SHA-256: <code className="text-accent-chaos">{result.diff_hash.substring(0, 12)}</code></span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
