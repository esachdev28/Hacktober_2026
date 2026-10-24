import React from 'react';

export type SystemHealthState = 'healthy' | 'degraded' | 'offline' | 'checking' | 'ready' | 'not_configured';

interface StatusIndicatorProps {
  status?: string | null;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  pulse = false,
  className = '',
}) => {
  const safeStatus = (status && typeof status === 'string' ? status : 'UNKNOWN').trim();
  const norm = safeStatus.toUpperCase();

  let colorClasses = 'bg-canvas-surface text-text-muted border-canvas-border';
  let dotColor = 'bg-text-muted';

  if (
    norm === 'HEALTHY' ||
    norm === 'READY' ||
    norm === 'VERIFIED' ||
    norm === 'COMPLETED' ||
    norm === 'PASSED' ||
    norm === 'PUBLISHED'
  ) {
    colorClasses = 'bg-accent-success/15 text-accent-success border-accent-success/30';
    dotColor = 'bg-accent-success';
  } else if (
    norm === 'FAILURE_REPRODUCED' ||
    norm === 'INJECTING' ||
    norm === 'DIAGNOSING' ||
    norm === 'APPLYING' ||
    norm === 'VERIFYING' ||
    norm === 'OBSERVING' ||
    norm === 'BASELINING' ||
    norm === 'PATCH_REVIEW'
  ) {
    colorClasses = 'bg-accent-chaos/15 text-accent-chaos border-accent-chaos/30';
    dotColor = 'bg-accent-chaos';
  } else if (
    norm === 'FAILED' ||
    norm === 'VERIFICATION_FAILED' ||
    norm === 'OFFLINE' ||
    norm === 'REJECTED' ||
    norm === 'PATCH_REJECTED' ||
    norm === 'PUSH_FAILED'
  ) {
    colorClasses = 'bg-accent-failure/15 text-accent-failure border-accent-failure/30';
    dotColor = 'bg-accent-failure';
  } else if (
    norm === 'INCONCLUSIVE' ||
    norm === 'DOCKER_UNAVAILABLE' ||
    norm === 'UNSUPPORTED_TEST_ENVIRONMENT' ||
    norm === 'NO_TEST_COMMAND' ||
    norm === 'MISSING_TEST_SCRIPT' ||
    norm === 'MISSING_TEST_RUNNER' ||
    norm === 'SETUP_FAILED' ||
    norm === 'AI_UNAVAILABLE' ||
    norm === 'TIMED_OUT' ||
    norm === 'CANCELLED'
  ) {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    dotColor = 'bg-amber-400';
  } else if (norm === 'CHECKING' || norm === 'CREATED') {
    colorClasses = 'bg-accent-info/10 text-accent-info border-accent-info/30';
    dotColor = 'bg-accent-info';
  }

  const displayText = label || safeStatus;
  const isPulsing = pulse || ['INJECTING', 'BASELINING', 'DIAGNOSING', 'APPLYING', 'VERIFYING', 'CHECKING'].includes(norm);

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-mono uppercase font-bold border rounded-md ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${colorClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${isPulsing ? 'animate-pulse' : ''}`} />
      <span>{displayText}</span>
    </span>
  );
};
