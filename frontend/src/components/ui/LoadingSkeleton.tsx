import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = 'h-4 w-full',
  count = 1,
}) => {
  return (
    <div className="space-y-2.5 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`animate-pulse rounded bg-canvas-surface/80 border border-canvas-border/40 ${className}`}
        />
      ))}
    </div>
  );
};

export const BentoCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas-card p-5 animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-3 w-24 bg-canvas-surface rounded" />
        <div className="h-8 w-8 bg-canvas-surface rounded-lg" />
      </div>
      <div className="h-8 w-32 bg-canvas-surface rounded" />
      <div className="h-3 w-40 bg-canvas-surface rounded pt-1" />
    </div>
  );
};
