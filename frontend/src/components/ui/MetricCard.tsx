import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  caption?: string;
  icon: LucideIcon;
  variant?: 'amber' | 'emerald' | 'cyan' | 'purple' | 'slate';
  trend?: {
    text: string;
    positive?: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  caption,
  icon: Icon,
  variant = 'amber',
  trend,
  className = '',
  onClick,
}) => {
  const variantStyles = {
    amber: {
      border: 'border-canvas-border hover:border-accent-chaos/40',
      iconBg: 'bg-accent-chaos/10 text-accent-chaos border-accent-chaos/20',
      valColor: 'text-text-primary',
    },
    emerald: {
      border: 'border-canvas-border hover:border-accent-success/40',
      iconBg: 'bg-accent-success/10 text-accent-success border-accent-success/20',
      valColor: 'text-accent-success',
    },
    cyan: {
      border: 'border-canvas-border hover:border-accent-info/40',
      iconBg: 'bg-accent-info/10 text-accent-info border-accent-info/20',
      valColor: 'text-text-primary',
    },
    purple: {
      border: 'border-canvas-border hover:border-accent-purple/40',
      iconBg: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
      valColor: 'text-text-primary',
    },
    slate: {
      border: 'border-canvas-border hover:border-text-muted/40',
      iconBg: 'bg-canvas-surface text-text-muted border-canvas-border',
      valColor: 'text-text-primary',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`bento-card rounded-xl p-5 flex flex-col justify-between transition-all duration-200 ${variantStyles.border} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <div className={`p-2 rounded-lg border ${variantStyles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${variantStyles.valColor}`}>
          {value}
        </div>
        
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-canvas-border/50 text-xs font-mono">
          {caption && <span className="text-[11px] text-text-muted">{caption}</span>}
          {trend && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                trend.positive
                  ? 'bg-accent-success/15 text-accent-success'
                  : 'bg-canvas-surface text-text-muted'
              }`}
            >
              {trend.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
