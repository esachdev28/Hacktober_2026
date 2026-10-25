import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, ShieldCheck, Clock, Hash } from 'lucide-react';
import { RepoPatchVerifyResponse } from '../../types';

interface VerificationVerdictProps {
  result: RepoPatchVerifyResponse;
  className?: string;
}

export const VerificationVerdict: React.FC<VerificationVerdictProps> = ({ result, className = '' }) => {
  const status =
    result?.verification_status ||
    (result as any)?.verification_outcome ||
    (result as any)?.status ||
    'INCONCLUSIVE';

  const isVerified = status === 'VERIFIED';
  const isFailed = status === 'FAILED';
  const isRejected = status === 'REJECTED';
  const isInconclusive = status === 'INCONCLUSIVE';

  const config = {
    VERIFIED: {
      border: 'border-[#C7F36B]/40 bg-[#202A16]',
      icon: CheckCircle2,
      iconColor: 'text-[#C7F36B]',
      badge: 'bg-[#202A16] text-[#C7F36B] border-[#C7F36B]/30',
      headline: 'RECOVERY VERIFIED INDEPENDENTLY',
      subline: 'The proposed patch successfully resolved the target failure in the isolated test harness with zero regressions.',
    },
    FAILED: {
      border: 'border-[#FF6B55]/40 bg-[#321D19]',
      icon: XCircle,
      iconColor: 'text-[#FF6B55]',
      badge: 'bg-[#321D19] text-[#FF6B55] border-[#FF6B55]/30',
      headline: 'VERIFICATION CHECKS FAILED',
      subline: 'The applied patch executed, but tests still failed or regressions were detected in the sandbox workspace.',
    },
    REJECTED: {
      border: 'border-[#FF6B55]/40 bg-[#321D19]',
      icon: AlertTriangle,
      iconColor: 'text-[#FF6B55]',
      badge: 'bg-[#321D19] text-[#FF6B55] border-[#FF6B55]/30',
      headline: 'PATCH REJECTED BY SAFETY VALIDATOR',
      subline: 'The candidate patch was rejected (invalid unified diff, missing headers, or unauthorized modifications).',
    },
    INCONCLUSIVE: {
      border: 'border-[#FFC66D]/40 bg-[#302718]',
      icon: HelpCircle,
      iconColor: 'text-[#FFC66D]',
      badge: 'bg-[#302718] text-[#FFC66D] border-[#FFC66D]/30',
      headline: 'VERIFICATION INCONCLUSIVE',
      subline: 'Post-patch verification could not complete conclusively (Docker sandbox unavailable, test timeout, or harness execution error).',
    },
  }[status] || {
    border: 'border-border bg-surface',
    icon: HelpCircle,
    iconColor: 'text-foreground-muted',
    badge: 'bg-surface text-foreground-muted border-border',
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
        <div className="p-3 rounded-lg bg-[#111310] border border-[#363B30] text-[11px] text-[#B0B2A7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {result.summary && <span>{result.summary}</span>}
          {result.diff_hash && (
            <span className="text-[#85897D] shrink-0 flex items-center space-x-1">
              <Hash className="w-3 h-3 text-[#C7F36B]" />
              <span>SHA-256: <code className="text-[#C7F36B]">{result.diff_hash.substring(0, 12)}</code></span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
