import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  PlayCircle,
  ArrowUpRight,
  TrendingUp,
  Shield,
  Layers,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { api } from '../api/client';
import { DashboardSummary, Experiment } from '../types';
import { KineticGrid } from '../components/ui/KineticGrid';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { BentoCardSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';

interface OverviewPageProps {
  onNavigateLauncher: () => void;
  onSelectExperiment: (id: number) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigateLauncher,
  onSelectExperiment,
}) => {
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
    const interval = setInterval(fetchSummary, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Command Center Section with Subtle Kinetic Grid Background */}
      <div className="relative rounded-2xl border border-canvas-border overflow-hidden bg-[#080B12] shadow-glow-card">
        <KineticGrid intensity="subtle" className="min-h-[200px] sm:min-h-[220px]">
          <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-accent-chaos/10 border border-accent-chaos/30 text-accent-chaos text-xs font-mono font-bold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-accent-chaos animate-ping" />
                <span>AI SOFTWARE RELIABILITY ENGINEERING</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-mono font-extrabold text-text-primary tracking-tight">
                Controlled Chaos. <span className="text-accent-chaos">Verified Recovery.</span>
              </h1>

              <p className="text-xs sm:text-sm text-text-secondary font-mono leading-relaxed max-w-xl">
                CHAOSPATCH reproduces failures, gathers sanitized evidence, synthesizes minimal AI patches,
                and independently tests whether recovery succeeded inside isolated Docker sandboxes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={onNavigateLauncher}
                className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-accent-chaos hover:bg-amber-400 text-canvas font-mono text-xs font-bold transition-all shadow-glow-amber hover:shadow-[0_0_24px_rgba(255,159,10,0.45)] cursor-pointer group btn-magnetic active:scale-[0.98]"
              >
                <PlayCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>RUN NEW EXPERIMENT</span>
              </button>
            </div>
          </div>
        </KineticGrid>
      </div>

      {/* Bento KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !summary ? (
          <>
            <BentoCardSkeleton />
            <BentoCardSkeleton />
            <BentoCardSkeleton />
            <BentoCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              label="Total Experiments"
              value={summary?.total_experiments ?? 0}
              caption="Sandbox test runs"
              icon={Activity}
              variant="cyan"
              trend={{ text: 'Live Persistence', positive: true }}
            />

            <MetricCard
              label="Verified Recoveries"
              value={summary?.successful_recoveries ?? 0}
              caption="Independent verification passed"
              icon={CheckCircle2}
              variant="emerald"
              trend={{ text: 'Verified', positive: true }}
            />

            <MetricCard
              label="Verification Rate"
              value={
                summary?.verification_rate !== null && summary?.verification_rate !== undefined
                  ? `${summary.verification_rate}%`
                  : 'N/A'
              }
              caption="Pass rate on post-patch check"
              icon={TrendingUp}
              variant="purple"
            />

            <MetricCard
              label="Avg Recovery Time"
              value={
                summary?.avg_recovery_time_ms
                  ? `${summary.avg_recovery_time_ms} ms`
                  : 'N/A'
              }
              caption="Diagnosis + apply + verify"
              icon={Clock}
              variant="amber"
            />
          </>
        )}
      </div>

      {/* Bento Middle Split: Recent Experiments & Scenario Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Experiments Table Panel (2 columns wide) */}
        <div className="lg:col-span-2 rounded-xl border border-canvas-border bg-canvas-card overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 bg-canvas-surface/80 border-b border-canvas-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-accent-chaos" />
                <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
                  Recent Chaos Experiments
                </span>
              </div>
              <span className="text-[10px] font-mono text-text-muted">
                {summary?.recent_experiments?.length || 0} recorded runs
              </span>
            </div>

            <div className="divide-y divide-canvas-border/70 font-mono text-xs">
              {!summary?.recent_experiments || summary.recent_experiments.length === 0 ? (
                <EmptyState
                  title="No Experiments Recorded"
                  description="Run a demo fault injection or inspect a public GitHub repository to observe autonomous recovery."
                  action={
                    <button
                      onClick={onNavigateLauncher}
                      className="px-3.5 py-1.5 rounded-lg bg-canvas-surface border border-canvas-border hover:border-accent-chaos text-xs font-mono text-accent-chaos transition"
                    >
                      Launch First Experiment
                    </button>
                  }
                />
              ) : (
                summary.recent_experiments.slice(0, 7).map((exp: Experiment) => {
                  return (
                    <div
                      key={exp.id}
                      onClick={() => onSelectExperiment(exp.id)}
                      className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-canvas-hover/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="font-bold text-accent-chaos shrink-0">
                          #EXP-{exp.id}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-text-primary block truncate">
                            {exp.repo_url ? (
                              <span className="flex items-center space-x-1.5">
                                <GitBranch className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                                <span className="truncate">{exp.repo_owner}/{exp.repo_name}</span>
                              </span>
                            ) : (
                              exp.scenario_type
                            )}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {new Date(exp.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <StatusIndicator status={exp.status} size="sm" />
                        <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {summary?.recent_experiments && summary.recent_experiments.length > 0 && (
            <div className="px-5 py-2.5 bg-canvas-surface/40 border-t border-canvas-border/50 text-[11px] font-mono text-text-muted flex justify-between items-center">
              <span>Click any experiment to open live workspace</span>
              <span className="text-accent-chaos font-semibold">Live Sandbox Harness</span>
            </div>
          )}
        </div>

        {/* Right Column: Scenario Distribution & Principle Panel */}
        <div className="space-y-6">
          {/* Scenario Distribution Bento Card */}
          <div className="rounded-xl border border-canvas-border bg-canvas-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
                Scenario Distribution
              </span>
              <span className="text-[10px] font-mono text-text-muted">Telemetry</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {!summary?.scenario_distribution ||
              Object.entries(summary.scenario_distribution).length === 0 ? (
                <div className="text-text-muted text-[11px] py-6 text-center">
                  No scenario telemetry recorded yet.
                </div>
              ) : (
                Object.entries(summary.scenario_distribution).map(([scen, count]) => {
                  const total = summary.total_experiments || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={scen} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-text-secondary truncate pr-2">{scen}</span>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="text-text-muted">{pct}%</span>
                          <span className="text-accent-chaos font-bold">({count})</span>
                        </div>
                      </div>
                      <div className="w-full bg-canvas-surface h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-accent-chaos h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Trust Statement Card */}
          <div className="rounded-xl border border-canvas-border/80 bg-gradient-to-br from-canvas-card via-[#121929] to-[#0E1524] p-5 space-y-3 shadow-lg">
            <div className="flex items-center space-x-2 text-accent-chaos text-xs font-mono font-bold uppercase tracking-wider">
              <Shield className="w-4 h-4 text-accent-chaos" />
              <span>Core Reliability Guarantee</span>
            </div>

            <blockquote className="text-xs font-mono text-text-primary font-medium leading-relaxed border-l-2 border-accent-chaos pl-3 py-0.5">
              "The AI proposes the repair. The verification engine decides whether it worked."
            </blockquote>

            <p className="text-[11px] font-mono text-text-muted leading-normal">
              No patch is declared recovered without independent deterministic checks executed in an isolated,
              air-gapped Docker container.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
