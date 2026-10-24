import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  GitCommit,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { api } from '../api/client';
import { Incident } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

interface IncidentsPageProps {
  onSelectExperiment: (id: number) => void;
  mode?: 'incidents' | 'repairs';
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({
  onSelectExperiment,
  mode = 'incidents',
}) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getIncidents()
      .then(setIncidents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = incidents.filter((i) => {
    const matchesQuery =
      i.title.toLowerCase().includes(filter.toLowerCase()) ||
      (i.root_cause && i.root_cause.toLowerCase().includes(filter.toLowerCase())) ||
      (i.description && i.description.toLowerCase().includes(filter.toLowerCase()));

    const matchesSeverity =
      severityFilter === 'all' || i.severity.toLowerCase() === severityFilter.toLowerCase();

    return matchesQuery && matchesSeverity;
  });

  const isRepairsMode = mode === 'repairs';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <SectionHeader
        badge={isRepairsMode ? 'HISTORICAL TELEMETRY' : 'INCIDENT AUDIT'}
        title={isRepairsMode ? 'Autonomous Repair History' : 'Incident Audit Log & Diagnosis'}
        description={
          isRepairsMode
            ? 'Chronological record of AI synthesized patches, validation statuses, and independent verification runs.'
            : 'Audited failure incidents, model-hypothesized root causes, confidence metrics, and evidence traces.'
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-canvas-border bg-canvas-card">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by experiment ID, title, or root-cause..."
            aria-label="Search incidents by experiment ID, title, or root cause"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-canvas-surface border border-canvas-border rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-chaos"
          />
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted text-[11px] hidden sm:inline">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter incidents by severity"
            className="bg-canvas-surface border border-canvas-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-chaos"
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="critical">CRITICAL</option>
            <option value="error">ERROR</option>
            <option value="warning">WARNING</option>
            <option value="info">INFO</option>
          </select>
        </div>
      </div>

      {/* Incident / Repair List */}
      <div className="rounded-xl border border-canvas-border bg-canvas-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <LoadingSkeleton count={4} className="h-16" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={isRepairsMode ? GitCommit : AlertTriangle}
            title={isRepairsMode ? 'No Repair Records Found' : 'No Incident Records Found'}
            description="Run failure injection scenarios or inspect repositories to generate diagnosed incidents and repair attempts."
          />
        ) : (
          <div className="divide-y divide-canvas-border font-mono text-xs">
            {filtered.map((inc) => {
              const confidencePercent = Math.round((inc.confidence || 0) * 100);

              const severityBadge = {
                critical: 'bg-accent-failure/20 text-accent-failure border-accent-failure/30',
                error: 'bg-accent-failure/15 text-accent-failure border-accent-failure/25',
                warning: 'bg-accent-chaos/15 text-accent-chaos border-accent-chaos/25',
                info: 'bg-accent-info/15 text-accent-info border-accent-info/25',
              }[inc.severity] || 'bg-canvas-surface text-text-muted border-canvas-border';

              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectExperiment(inc.experiment_id)}
                  className="p-4 sm:p-5 hover:bg-canvas-hover/30 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-accent-chaos shrink-0">
                        #EXP-{inc.experiment_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${severityBadge}`}>
                        {inc.severity}
                      </span>
                      <span className="font-semibold text-text-primary text-xs sm:text-sm">
                        {inc.title}
                      </span>
                    </div>

                    <div className="text-text-secondary text-[11px] leading-relaxed line-clamp-2 bg-[#070A10] p-2.5 rounded border border-canvas-border/60">
                      <span className="text-text-muted font-bold mr-1">Root Cause:</span>
                      {inc.root_cause || inc.description || 'Diagnosis summary pending.'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 text-text-muted text-[11px] self-end md:self-auto">
                    {inc.confidence !== null && inc.confidence !== undefined && (
                      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-canvas-surface border border-canvas-border">
                        <Cpu className="w-3.5 h-3.5 text-accent-purple" />
                        <span>Confidence:</span>
                        <span className="text-text-primary font-bold">{confidencePercent}%</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-1 text-text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(inc.created_at).toLocaleTimeString()}</span>
                    </div>

                    <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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
