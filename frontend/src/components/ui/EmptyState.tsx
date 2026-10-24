import React from 'react';
import { LucideIcon, Layers } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Layers,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-canvas-border bg-canvas-card/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-canvas-surface border border-canvas-border flex items-center justify-center text-text-muted shadow-inner">
        <Icon className="w-6 h-6 text-accent-chaos/80" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="font-mono font-bold text-sm text-text-primary">{title}</h3>
        <p className="text-xs font-mono text-text-muted leading-relaxed">{description}</p>
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
