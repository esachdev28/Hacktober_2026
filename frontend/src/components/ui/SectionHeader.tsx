import React from 'react';

interface SectionHeaderProps {
  badge?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div>
        {badge && (
          <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-accent-chaos mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-chaos" />
            <span>{badge}</span>
          </div>
        )}
        <h2 className="text-base sm:text-lg font-mono font-bold text-text-primary tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-text-muted font-mono mt-0.5 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
