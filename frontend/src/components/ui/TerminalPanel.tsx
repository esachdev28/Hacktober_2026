import React, { useState } from 'react';
import { Terminal, Copy, Check, WrapText } from 'lucide-react';

interface TerminalPanelProps {
  title?: string;
  command?: string;
  output: string;
  exitCode?: number | null;
  durationMs?: number | null;
  statusLabel?: string;
  maxHeight?: string;
  className?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  title = 'Terminal Output',
  command,
  output = '',
  exitCode,
  durationMs,
  statusLabel,
  maxHeight = 'max-h-80',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  const safeOutput = output || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(safeOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = exitCode === 0;

  return (
    <div className={`rounded-xl border border-canvas-border bg-[#191C17] overflow-hidden flex flex-col font-mono text-xs ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-surface/80 border-b border-canvas-border">
        <div className="flex items-center space-x-2.5 truncate">
          <div className="flex space-x-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex items-center space-x-2 text-text-secondary truncate">
            <Terminal className="w-3.5 h-3.5 text-accent-chaos shrink-0" />
            <span className="font-semibold text-text-primary text-[11px] truncate">{title}</span>
          </div>
        </div>

        {/* Status Pills & Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {exitCode !== undefined && exitCode !== null && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                isSuccess
                  ? 'bg-accent-success/10 text-accent-success border-accent-success/30'
                  : 'bg-accent-failure/10 text-accent-failure border-accent-failure/30'
              }`}
            >
              EXIT {exitCode}
            </span>
          )}

          {durationMs !== undefined && durationMs !== null && (
            <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-canvas-card border border-canvas-border">
              {durationMs}ms
            </span>
          )}

          {statusLabel && (
            <span className="text-[10px] text-accent-chaos font-semibold px-1.5 py-0.5 rounded bg-accent-chaos/10 border border-accent-chaos/20">
              {statusLabel}
            </span>
          )}

          <button
            onClick={() => setWrap(!wrap)}
            title="Toggle word wrap"
            className={`p-1 rounded text-text-muted hover:text-text-primary transition ${
              wrap ? 'bg-canvas-card text-accent-chaos' : ''
            }`}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            title="Copy terminal output"
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-canvas-card transition flex items-center space-x-1 text-[11px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-accent-success" />
                <span className="text-accent-success text-[10px]">Copied</span>
              </>
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Optional Command Invocation Bar */}
      {command && (
        <div className="px-4 py-1.5 bg-[#141712] border-b border-canvas-border/40 text-[11px] text-text-muted flex items-center space-x-2">
          <span className="text-accent-chaos font-bold">$</span>
          <span className="text-text-secondary select-all">{command}</span>
        </div>
      )}

      {/* Content Area */}
      <div
        className={`p-4 bg-[#111310] overflow-x-auto ${maxHeight} text-text-secondary select-text ${
          wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
        }`}
      >
        {output ? output : <span className="text-text-muted/50 italic">No output recorded.</span>}
      </div>
    </div>
  );
};
