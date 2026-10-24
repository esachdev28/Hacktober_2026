import React, { useState } from 'react';
import { Copy, Check, FileCode, AlertCircle } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  title?: string;
  className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  title = 'Unified Candidate Patch Diff',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = diff ? diff.split('\n') : [];
  const isPlaceholderOrEmpty = !diff.trim() || diff.includes('# Proposed candidate patch diff');

  return (
    <div className={`rounded-xl border border-canvas-border bg-[#080C14] overflow-hidden flex flex-col font-mono text-xs ${className}`}>
      {/* Diff Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-surface/80 border-b border-canvas-border">
        <div className="flex items-center space-x-2 text-xs text-text-secondary truncate">
          <FileCode className="w-4 h-4 text-accent-chaos shrink-0" />
          <span className="font-semibold text-text-primary text-[11px] truncate">{title}</span>
          <span className="text-[10px] text-text-muted">({lines.length} lines)</span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded bg-canvas-card border border-canvas-border hover:border-canvas-hover transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-accent-success" />
                <span className="text-accent-success text-[10px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[10px]">Copy Patch</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning if placeholder */}
      {isPlaceholderOrEmpty && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[11px] flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Notice: Patch contains no executable changes or is a reference stub.</span>
        </div>
      )}

      {/* Code Display */}
      <div className="p-3 bg-[#05070B] overflow-x-auto max-h-96 text-xs leading-relaxed select-text">
        {lines.map((line, idx) => {
          let lineBg = '';
          let lineTextColor = 'text-text-secondary';
          let borderAccent = '';

          if (line.startsWith('+++') || line.startsWith('---')) {
            lineBg = 'bg-canvas-surface/60 font-bold';
            lineTextColor = 'text-text-primary';
          } else if (line.startsWith('diff --git')) {
            lineBg = 'bg-[#121826] font-bold';
            lineTextColor = 'text-accent-chaos';
          } else if (line.startsWith('@@')) {
            lineBg = 'bg-accent-chaos/5 font-semibold';
            lineTextColor = 'text-accent-chaos/90';
          } else if (line.startsWith('+')) {
            lineBg = 'bg-emerald-500/10';
            lineTextColor = 'text-emerald-300';
            borderAccent = 'border-l-2 border-emerald-500 pl-2';
          } else if (line.startsWith('-')) {
            lineBg = 'bg-rose-500/10';
            lineTextColor = 'text-rose-300';
            borderAccent = 'border-l-2 border-rose-500 pl-2';
          }

          return (
            <div
              key={idx}
              className={`flex items-baseline py-0.5 px-2 hover:bg-white/5 transition-colors font-mono ${lineBg} ${borderAccent}`}
            >
              <span className="w-8 shrink-0 select-none text-[10px] text-text-muted/40 text-right pr-3 font-mono">
                {idx + 1}
              </span>
              <span className={`whitespace-pre ${lineTextColor}`}>
                {line || ' '}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
