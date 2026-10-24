import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { VerificationRun } from '../types';

interface VerificationCardProps {
  verifications: VerificationRun[];
}

export const VerificationCard: React.FC<VerificationCardProps> = ({ verifications }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!verifications || verifications.length === 0) {
    return (
      <div className="rounded-lg border border-canvas-border bg-canvas-card p-6 text-center text-text-muted text-xs font-mono">
        Verification checks pending. Tests will run automatically post-patch application.
      </div>
    );
  }

  const allPassed = verifications.every((v) => v.status === 'PASSED');

  return (
    <div className="rounded-lg border border-canvas-border bg-canvas-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-canvas-surface border-b border-canvas-border">
        <div className="flex items-center space-x-2">
          <ShieldCheck className={`w-4 h-4 ${allPassed ? 'text-accent-success' : 'text-accent-failure'}`} />
          <span className="text-xs font-mono font-semibold text-text-primary">
            Independent Verification Engine Breakdown
          </span>
        </div>
        <span
          className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
            allPassed
              ? 'bg-accent-success/20 text-accent-success border-accent-success/40'
              : 'bg-accent-failure/20 text-accent-failure border-accent-failure/40'
          }`}
        >
          {allPassed ? 'ALL CHECKS PASSED' : 'VERIFICATION FAILED'}
        </span>
      </div>

      {/* Verification Items List */}
      <div className="divide-y divide-canvas-border">
        {verifications.map((v) => {
          const isPassed = v.status === 'PASSED';
          const isExpanded = expandedId === v.id;

          return (
            <div key={v.id} className="p-3 hover:bg-canvas-hover/30 transition">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
              >
                <div className="flex items-center space-x-2.5">
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-accent-success shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-accent-failure shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-mono font-medium text-text-primary">{v.check_name}</div>
                    <div className="text-[11px] font-mono text-text-muted mt-0.5">
                      Expected: <span className="text-text-secondary">{v.expected_result}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono">
                  <div className="flex items-center space-x-1 text-text-muted">
                    <Clock className="w-3 h-3" />
                    <span>{v.duration_ms || 0}ms</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isPassed ? 'text-accent-success bg-accent-success/10' : 'text-accent-failure bg-accent-failure/10'
                    }`}
                  >
                    {v.status}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                  )}
                </div>
              </div>

              {/* Output Accordion */}
              {isExpanded && v.output && (
                <div className="mt-3 p-2.5 rounded bg-[#070A10] border border-canvas-border font-mono text-[11px] text-text-secondary whitespace-pre-wrap overflow-x-auto max-h-48">
                  {v.output}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
