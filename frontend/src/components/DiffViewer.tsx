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
  const isValidExecutableDiff = Boolean(
    diff &&
    diff.trim().length > 0 &&
    !diff.includes('# Proposed candidate patch diff') &&
    ((diff.includes('--- ') && diff.includes('+++ ')) || diff.includes('@@'))
  );

  return (
    <div className={`rounded-xl border border-canvas-border bg-[#191C17] overflow-hidden flex flex-col font-mono text-xs ${className}`}>
      {/* Diff Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-surface/80 border-b border-canvas-border">
        <div className="flex items-center space-x-2 text-xs text-text-secondary truncate">
          <FileCode className="w-4 h-4 text-accent-chaos shrink-0" />
          <span className="font-semibold text-text-primary text-[11px] truncate">{title}</span>
          <span className="text-[10px] text-text-muted">({isValidExecutableDiff ? `${lines.length} lines` : 'No executable patch'})</span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopy}
            disabled={!isValidExecutableDiff}
            className="flex items-center space-x-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded bg-canvas-card border border-canvas-border hover:border-canvas-hover transition"
            title={isValidExecutableDiff ? "Copy patch diff to clipboard" : "No executable patch to copy"}
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

      {/* Notice if no executable diff */}
      {!isValidExecutableDiff && (
        <div className="px-4 py-2.5 bg-[#321D19] border-b border-[#FF6B55]/30 text-[#FF6B55] text-[11px] flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>No executable patch generated. Model inference failed or returned an empty response.</span>
        </div>
      )}

      {/* Code Display */}
      <div className="p-3 bg-[#111310] overflow-x-auto max-h-96 text-xs leading-relaxed select-text">
        {lines.map((line, idx) => {
          let lineBg = '';
          let lineTextColor = 'text-text-secondary';
          let borderAccent = '';

          if (line.startsWith('+++') || line.startsWith('---')) {
            lineBg = 'bg-canvas-surface/60 font-bold';
            lineTextColor = 'text-text-primary';
          } else if (line.startsWith('diff --git')) {
            lineBg = 'bg-[#22261F] font-bold';
            lineTextColor = 'text-accent-chaos';
          } else if (line.startsWith('@@')) {
            lineBg = 'bg-accent-chaos/5 font-semibold';
            lineTextColor = 'text-accent-chaos/90';
          } else if (line.startsWith('+')) {
            lineBg = 'bg-[#202A16]';
            lineTextColor = 'text-[#C7F36B]';
            borderAccent = 'border-l-2 border-[#C7F36B] pl-2';
          } else if (line.startsWith('-')) {
            lineBg = 'bg-[#321D19]';
            lineTextColor = 'text-[#FF6B55]';
            borderAccent = 'border-l-2 border-[#FF6B55] pl-2';
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
