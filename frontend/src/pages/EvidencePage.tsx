import React, { useState, useEffect } from 'react';
import { FileSearch, Search, Filter, ShieldCheck, Database, Clock, ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { api } from '../api/client';
import { EvidenceItem } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

interface EvidencePageProps {
  onSelectExperiment: (id: number) => void;
}

export const EvidencePage: React.FC<EvidencePageProps> = ({ onSelectExperiment }) => {
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    // Collect evidence across recent experiments
    api.listExperiments(15, 0).then(async (res) => {
      const allItems: EvidenceItem[] = [];
      for (const exp of res.experiments) {
        try {
          const items = await api.getExperimentEvidence(exp.id);
          allItems.push(...items);
        } catch {
          // ignore individual fetch errors
        }
      }
      setEvidenceItems(allItems);
      setLoading(false);
    });
  }, []);

  const types = ['ALL', ...Array.from(new Set(evidenceItems.map((e) => e.evidence_type)))];

  const filtered = evidenceItems.filter((e) => {
    const matchesText =
      e.source.toLowerCase().includes(filter.toLowerCase()) ||
      e.content.toLowerCase().includes(filter.toLowerCase()) ||
      String(e.experiment_id).includes(filter);
    const matchesType = typeFilter === 'ALL' || e.evidence_type === typeFilter;
    return matchesText && matchesType;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        badge="TELEMETRY VAULT"
        title="Evidence Artifact Explorer"
        description="Inspect raw test telemetry, runtime stack traces, exit codes, and sanitized logs with stable cryptographic provenance."
      />

      {/* Filter and Query Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-canvas-border bg-canvas-card">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter by source, experiment ID, or text..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-canvas-surface border border-canvas-border rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-chaos"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted text-[11px] hidden sm:inline">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-canvas-surface border border-canvas-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-chaos"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Evidence Items Container */}
      <div className="rounded-xl border border-canvas-border bg-canvas-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <LoadingSkeleton count={4} className="h-20" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No Evidence Records Match"
            description="Run an experiment to capture reproduction evidence packages and test traces."
          />
        ) : (
          <div className="divide-y divide-canvas-border font-mono text-xs">
            {filtered.map((item) => {
              const isExpanded = expandedId === item.id;

              const severityBadge = {
                critical: 'bg-accent-failure/20 text-accent-failure border-accent-failure/30',
                error: 'bg-accent-failure/15 text-accent-failure border-accent-failure/25',
                warning: 'bg-accent-chaos/15 text-accent-chaos border-accent-chaos/25',
                info: 'bg-accent-info/15 text-accent-info border-accent-info/25',
              }[item.severity] || 'bg-canvas-surface text-text-muted border-canvas-border';

              return (
                <div key={item.id} className="p-4 sm:p-5 hover:bg-canvas-hover/20 transition space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onSelectExperiment(item.experiment_id)}
                        className="font-bold text-accent-chaos hover:underline flex items-center space-x-1"
                        title="Jump to experiment workspace"
                      >
                        <Hash className="w-3.5 h-3.5" />
                        <span>EXP-{item.experiment_id}</span>
                      </button>

                      <span className="px-2 py-0.5 rounded text-[10px] bg-canvas-surface border border-canvas-border text-text-secondary uppercase font-semibold">
                        {item.evidence_type}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${severityBadge}`}>
                        {item.severity}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-text-muted text-[11px]">
                      <span className="truncate">Source: <code className="text-text-secondary">{item.source}</code></span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sanitized Content Window */}
                  <div className="rounded-lg bg-[#05070B] border border-canvas-border p-3 text-[11px] text-text-secondary overflow-x-auto max-h-48 whitespace-pre-wrap select-text leading-relaxed">
                    {item.content}
                  </div>

                  {/* Redaction Notice */}
                  <div className="flex items-center justify-between text-[10px] text-text-muted">
                    <div className="flex items-center space-x-1 text-accent-success">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Tokens & secrets redacted before persistence</span>
                    </div>
                    <span>Stable Identifier: #{item.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
