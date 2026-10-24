import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  title?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = diff.split('\n');

  return (
    <div className="rounded-lg border border-canvas-border bg-canvas-card overflow-hidden">
      {/* Diff Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-canvas-surface border-b border-canvas-border">
        <div className="flex items-center space-x-2 text-xs font-mono text-text-secondary">
          <FileCode className="w-4 h-4 text-accent-chaos" />
          <span>{title || 'Proposed Unified Diff Patch'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 text-xs font-mono text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-canvas-hover transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-accent-success" />
              <span className="text-accent-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Diff</span>
            </>
          )}
        </button>
      </div>

      {/* Code Display */}
      <div className="p-3 font-mono text-xs overflow-x-auto max-h-96">
        {lines.map((line, idx) => {
          let lineStyle = 'text-text-secondary';
          let prefixStyle = 'text-text-muted';

          if (line.startsWith('+++') || line.startsWith('---')) {
            lineStyle = 'text-text-primary font-bold bg-canvas-surface/50';
          } else if (line.startsWith('@@')) {
            lineStyle = 'text-accent-chaos/80 bg-accent-chaos/5 font-semibold';
          } else if (line.startsWith('+')) {
            lineStyle = 'text-emerald-400 bg-emerald-500/10 border-l-2 border-emerald-500';
            prefixStyle = 'text-emerald-400 font-bold';
          } else if (line.startsWith('-')) {
            lineStyle = 'text-rose-400 bg-rose-500/10 border-l-2 border-rose-500';
            prefixStyle = 'text-rose-400 font-bold';
          }

          return (
            <div key={idx} className={`px-2 py-0.5 whitespace-pre font-mono ${lineStyle}`}>
              {line || ' '}
            </div>
          );
        })}
      </div>
    </div>
  );
};
