import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { api } from '../api/client';
import { DashboardSummary, Experiment } from '../types';

interface OverviewPageProps {
  onNavigateLauncher: () => void;
  onSelectExperiment: (id: number) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateLauncher, onSelectExperiment }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl border border-canvas-border bg-gradient-to-r from-canvas-card via-canvas-card to-canvas-surface">
        <div>
          <div className="flex items-center space-x-2 text-accent-chaos text-xs font-mono font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-accent-chaos animate-ping" />
            <span>Autonomous AI Reliability Engineering</span>
          </div>
          <h1 className="text-xl md:text-2xl font-mono font-bold text-text-primary mt-1">
            Controlled Chaos Injection & Verification
          </h1>
          <p className="text-xs text-text-muted mt-1 max-w-xl">
            Simulate real-world production outages in isolated sandboxes. Qwen AI identifies root causes and proposes
            minimal patches; independent verifiers decide if recovery succeeded.
          </p>
        </div>

        <button
          onClick={onNavigateLauncher}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-accent-chaos hover:bg-amber-400 text-canvas font-mono text-xs font-bold transition shadow-lg shadow-amber-500/10 shrink-0"
        >
          <PlayCircle className="w-4 h-4" />
          <span>RUN NEW EXPERIMENT</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Experiments */}
        <div className="p-4 rounded-lg border border-canvas-border bg-canvas-card">
          <div className="flex items-center justify-between text-text-muted text-xs font-mono">
            <span>Total Experiments</span>
            <Activity className="w-4 h-4 text-accent-info" />
          </div>
          <div className="text-2xl font-mono font-bold text-text-primary mt-2">
            {summary?.total_experiments ?? 0}
          </div>
          <div className="text-[11px] font-mono text-text-muted mt-1">Sandbox test runs</div>
        </div>

        {/* Verified Recoveries */}
        <div className="p-4 rounded-lg border border-canvas-border bg-canvas-card">
          <div className="flex items-center justify-between text-text-muted text-xs font-mono">
            <span>Verified Recoveries</span>
            <CheckCircle2 className="w-4 h-4 text-accent-success" />
          </div>
          <div className="text-2xl font-mono font-bold text-accent-success mt-2">
            {summary?.successful_recoveries ?? 0}
          </div>
          <div className="text-[11px] font-mono text-text-muted mt-1">Independent tests passed</div>
        </div>

        {/* Verification Success Rate */}
        <div className="p-4 rounded-lg border border-canvas-border bg-canvas-card">
          <div className="flex items-center justify-between text-text-muted text-xs font-mono">
            <span>Verification Rate</span>
            <TrendingUp className="w-4 h-4 text-accent-purple" />
          </div>
          <div className="text-2xl font-mono font-bold text-text-primary mt-2">
            {summary?.verification_rate !== null && summary?.verification_rate !== undefined
              ? `${summary.verification_rate}%`
              : 'N/A'}
          </div>
          <div className="text-[11px] font-mono text-text-muted mt-1">Pass rate on first verify</div>
        </div>

        {/* MTTR / Avg Recovery Time */}
        <div className="p-4 rounded-lg border border-canvas-border bg-canvas-card">
          <div className="flex items-center justify-between text-text-muted text-xs font-mono">
            <span>Avg Recovery Time</span>
            <Clock className="w-4 h-4 text-accent-chaos" />
          </div>
          <div className="text-2xl font-mono font-bold text-text-primary mt-2">
            {summary?.avg_recovery_time_ms ? `${summary.avg_recovery_time_ms} ms` : 'N/A'}
          </div>
          <div className="text-[11px] font-mono text-text-muted mt-1">Diagnosis + patch apply + test</div>
        </div>
      </div>

      {/* Two Column Layout: Recent Experiments & Scenario Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Experiments Table */}
        <div className="lg:col-span-2 rounded-lg border border-canvas-border bg-canvas-card overflow-hidden">
          <div className="px-4 py-3 bg-canvas-surface border-b border-canvas-border flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-text-primary">Recent Chaos Experiments</span>
            <span className="text-[11px] font-mono text-text-muted">Live DB persistence</span>
          </div>

          <div className="divide-y divide-canvas-border">
            {!summary?.recent_experiments || summary.recent_experiments.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-text-muted">
                No experiments conducted yet. Click <span className="text-accent-chaos font-bold">RUN NEW EXPERIMENT</span> to begin.
              </div>
            ) : (
              summary.recent_experiments.map((exp: Experiment) => {
                const isSuccess = exp.final_verified === true;
                return (
                  <div
                    key={exp.id}
                    onClick={() => onSelectExperiment(exp.id)}
                    className="p-3.5 flex items-center justify-between hover:bg-canvas-hover/30 transition cursor-pointer text-xs font-mono"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-accent-chaos">#EXP-{exp.id}</span>
                      <span className="text-text-primary">{exp.scenario_type}</span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          exp.status === 'COMPLETED'
                            ? 'bg-accent-success/20 text-accent-success'
                            : exp.status === 'FAILED' || exp.status === 'VERIFICATION_FAILED'
                            ? 'bg-accent-failure/20 text-accent-failure'
                            : 'bg-canvas-surface text-text-muted'
                        }`}
                      >
                        {exp.status}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Scenario Distribution */}
        <div className="rounded-lg border border-canvas-border bg-canvas-card p-4 space-y-4">
          <div className="text-xs font-mono font-bold text-text-primary border-b border-canvas-border pb-2">
            Scenario Distribution
          </div>

          <div className="space-y-3 font-mono text-xs">
            {Object.entries(summary?.scenario_distribution || {}).length === 0 ? (
              <div className="text-text-muted text-[11px] py-4 text-center">No scenario metrics yet.</div>
            ) : (
              Object.entries(summary?.scenario_distribution || {}).map(([scen, count]) => (
                <div key={scen} className="space-y-1">
                  <div className="flex justify-between text-text-secondary">
                    <span className="truncate">{scen}</span>
                    <span className="text-accent-chaos font-bold">{count}</span>
                  </div>
                  <div className="w-full bg-canvas-surface h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-accent-chaos h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (count / (summary?.total_experiments || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Principle Reminder Card */}
          <div className="p-3 rounded bg-canvas-surface border border-canvas-border text-[11px] font-mono space-y-1 text-text-muted">
            <div className="font-bold text-text-secondary">Core Guarantee:</div>
            <div>The AI proposes the repair. The verification engine independently tests and validates it.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
