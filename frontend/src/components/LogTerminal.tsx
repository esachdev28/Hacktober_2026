import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Search, ArrowDown } from 'lucide-react';
import { ExperimentEvent } from '../types';

interface LogTerminalProps {
  events: ExperimentEvent[];
  title?: string;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ events, title = 'Real-time Event Stream' }) => {
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  const filteredEvents = events.filter(
    (e) =>
      e.message.toLowerCase().includes(filter.toLowerCase()) ||
      e.event_type.toLowerCase().includes(filter.toLowerCase())
  );

  const getEventBadge = (type: string) => {
    if (type.startsWith('STAGE_')) {
      return 'bg-accent-chaos/20 text-accent-chaos border border-accent-chaos/30';
    }
    if (type.includes('ERROR') || type.includes('FAIL')) {
      return 'bg-accent-failure/20 text-accent-failure border border-accent-failure/30';
    }
    if (type.includes('SUCCESS') || type.includes('VERIFIED') || type.includes('APPLIED')) {
      return 'bg-accent-success/20 text-accent-success border border-accent-success/30';
    }
    return 'bg-canvas-surface text-text-muted border border-canvas-border';
  };

  return (
    <div className="rounded-lg border border-canvas-border bg-canvas-card overflow-hidden flex flex-col h-80">
      {/* Terminal Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-canvas-surface border-b border-canvas-border">
        <div className="flex items-center space-x-2 text-xs font-mono text-text-secondary">
          <Terminal className="w-4 h-4 text-accent-chaos" />
          <span>{title}</span>
          <span className="text-[10px] text-text-muted">({filteredEvents.length} events)</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 text-text-muted absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-canvas-subtle border border-canvas-border rounded text-[11px] font-mono pl-7 pr-2 py-1 text-text-primary focus:outline-none focus:border-accent-chaos w-36"
            />
          </div>

          {/* Autoscroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded text-xs transition ${
              autoScroll ? 'bg-accent-chaos/20 text-accent-chaos' : 'text-text-muted hover:text-text-primary'
            }`}
            title="Toggle auto-scroll"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-1.5 bg-[#111310]">
        {filteredEvents.length === 0 ? (
          <div className="text-text-muted/60 text-center py-8">No events recorded yet.</div>
        ) : (
          filteredEvents.map((e, idx) => {
            const timeStr = new Date(e.created_at).toLocaleTimeString();
            return (
              <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-text-muted/60 text-[10px] shrink-0 mt-0.5">{timeStr}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${getEventBadge(e.event_type)}`}>
                  {e.event_type}
                </span>
                <span className="text-text-secondary break-all">{e.message}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
