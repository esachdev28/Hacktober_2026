import React, { useState, useEffect } from 'react';
import { FileSearch, Search, Filter, ShieldCheck, Database } from 'lucide-react';
import { api } from '../api/client';
import { EvidenceItem } from '../types';

interface EvidencePageProps {
  onSelectExperiment: (id: number) => void;
}

export const EvidencePage: React.FC<EvidencePageProps> = ({ onSelectExperiment }) => {
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Collect evidence across recent experiments
    api.listExperiments(10, 0).then(async (res) => {
      const allItems: EvidenceItem[] = [];
      for (const exp of res.experiments) {
        try {
          const items = await api.getExperimentEvidence(exp.id);
          allItems.push(...items);
        } catch {
          // ignore
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
      e.content.toLowerCase().includes(filter.toLowerCase());
    const matchesType = typeFilter === 'ALL' || e.evidence_type === typeFilter;
    return matchesText && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-text-primary">Evidence Artifact Explorer</h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Raw inspectable telemetry, stack traces, and verification logs with stable identifiers.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-canvas-card border border-canvas-border rounded text-xs font-mono px-3 py-1.5 text-text-primary focus:outline-none focus:border-accent-chaos"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by source or text..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-canvas-card border border-canvas-border rounded text-xs font-mono pl-9 pr-3 py-1.5 text-text-primary focus:outline-none focus:border-accent-chaos w-60"
            />
          </div>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="rounded-lg border border-canvas-border bg-canvas-card overflow-hidden">
        <div className="divide-y divide-canvas-border">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-text-muted">
              {loading ? 'Scanning evidence repository...' : 'No evidence records match current filters.'}
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="p-4 hover:bg-canvas-hover/20 transition space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span
                      onClick={() => onSelectExperiment(item.experiment_id)}
                      className="font-bold text-accent-chaos cursor-pointer hover:underline"
                    >
                      #EXP-{item.experiment_id}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-canvas-surface border border-canvas-border text-text-secondary uppercase">
                      {item.evidence_type}
                    </span>
                    <span className="text-text-muted truncate">Source: {item.source}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      item.severity === 'error'
                        ? 'bg-accent-failure/20 text-accent-failure'
                        : item.severity === 'warning'
                        ? 'bg-accent-chaos/20 text-accent-chaos'
                        : 'bg-canvas-surface text-text-muted'
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#070A10] border border-canvas-border text-[11px] text-text-secondary whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {item.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
