import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ArrowUpRight, Search } from 'lucide-react';
import { api } from '../api/client';
import { Incident } from '../types';

interface IncidentsPageProps {
  onSelectExperiment: (id: number) => void;
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({ onSelectExperiment }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getIncidents()
      .then(setIncidents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = incidents.filter(
    (i) =>
      i.title.toLowerCase().includes(filter.toLowerCase()) ||
      (i.root_cause && i.root_cause.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-text-primary">Incident Audit Log</h1>
          <p className="text-xs font-mono text-text-muted mt-1">
            Recorded incidents diagnosed by Qwen-30B with root-cause confidence and evidence links.
          </p>
        </div>

        {/* Filter input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search incidents or root causes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-canvas-card border border-canvas-border rounded text-xs font-mono pl-9 pr-3 py-1.5 text-text-primary focus:outline-none focus:border-accent-chaos w-64"
          />
        </div>
      </div>

      <div className="rounded-lg border border-canvas-border bg-canvas-card overflow-hidden">
        <div className="divide-y divide-canvas-border">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-text-muted">
              {loading ? 'Loading incidents...' : 'No incident records found.'}
            </div>
          ) : (
            filtered.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectExperiment(inc.experiment_id)}
                className="p-4 hover:bg-canvas-hover/30 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-accent-chaos">#EXP-{inc.experiment_id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inc.severity === 'critical'
                          ? 'bg-accent-failure/20 text-accent-failure'
                          : 'bg-accent-chaos/20 text-accent-chaos'
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <span className="font-semibold text-text-primary">{inc.title}</span>
                  </div>
                  <div className="text-text-muted text-[11px] leading-relaxed line-clamp-2">
                    {inc.root_cause || inc.description}
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0 text-text-muted text-[11px]">
                  <div>
                    Confidence: <span className="text-accent-chaos font-bold">{Math.round((inc.confidence || 0) * 100)}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(inc.created_at).toLocaleTimeString()}</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-muted hover:text-text-primary" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
