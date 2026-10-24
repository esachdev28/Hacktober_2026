import React, { useState, useEffect } from 'react';
import {
  Play,
  AlertTriangle,
  ShieldCheck,
  Flame,
  Loader2,
  Clock,
  Layers,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { ScenarioInfo } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

interface LauncherPageProps {
  onExperimentLaunched: (experimentId: number) => void;
}

export const LauncherPage: React.FC<LauncherPageProps> = ({ onExperimentLaunched }) => {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getScenarios()
      .then(setScenarios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleOpenConfirm = (scen: ScenarioInfo) => {
    setSelectedScenario(scen);
    setShowModal(true);
  };

  const handleLaunch = async () => {
    if (!selectedScenario) return;
    setLaunching(true);
    try {
      const exp = await api.createExperiment(selectedScenario.id, 'SANDBOX');
      await api.startExperiment(exp.id, autoApprove);
      setShowModal(false);
      onExperimentLaunched(exp.id);
    } catch (err: any) {
      alert(`Failed to launch experiment: ${err.message}`);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        badge="DETERMINISTIC SUITE"
        title="Fault Injection Scenario Launcher"
        description="Select a controlled failure scenario. Target execution is strictly restricted to isolated, disposable sandbox workspaces."
      />

      {/* Scenarios Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LoadingSkeleton className="h-72 rounded-xl" count={3} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {scenarios.map((scen) => {
            const isHighRisk = scen.risk_level === 'HIGH';
            const isMedRisk = scen.risk_level === 'MEDIUM';

            return (
              <div
                key={scen.id}
                className="bento-card rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-accent-chaos/50 transition-all duration-200 group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        isHighRisk
                          ? 'bg-accent-failure/15 text-accent-failure border-accent-failure/30'
                          : isMedRisk
                          ? 'bg-accent-chaos/15 text-accent-chaos border-accent-chaos/30'
                          : 'bg-accent-info/15 text-accent-info border-accent-info/30'
                      }`}
                    >
                      Risk: {scen.risk_level}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span>{scen.estimated_stages} Stages</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-mono font-bold text-text-primary group-hover:text-accent-chaos transition-colors">
                      {scen.name}
                    </h3>
                    <p className="text-xs text-text-secondary font-mono mt-1 leading-relaxed">
                      {scen.description}
                    </p>
                  </div>

                  {/* Failure Mechanism Box */}
                  <div className="p-3 rounded-lg bg-[#070A10] border border-canvas-border text-[11px] font-mono space-y-1">
                    <div className="text-text-muted uppercase text-[10px] font-bold">Failure Mechanism:</div>
                    <div className="text-accent-chaos leading-snug">{scen.failure_mechanism}</div>
                  </div>

                  {/* Expected Symptoms */}
                  <div className="space-y-1 text-xs font-mono">
                    <div className="text-[10px] font-bold uppercase text-text-muted">Expected Symptoms:</div>
                    {scen.expected_symptoms.slice(0, 2).map((s, i) => (
                      <div key={i} className="text-text-secondary flex items-start space-x-1.5 text-[11px]">
                        <AlertTriangle className="w-3 h-3 text-accent-chaos shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{s}</span>
                      </div>
                    ))}
                  </div>

                  {/* Verification Checks */}
                  <div className="space-y-1 text-xs font-mono">
                    <div className="text-[10px] font-bold uppercase text-text-muted">Verification Checks:</div>
                    {scen.verification_checks.slice(0, 2).map((c, i) => (
                      <div key={i} className="text-text-secondary flex items-start space-x-1.5 text-[11px]">
                        <ShieldCheck className="w-3 h-3 text-accent-success shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Launch Action */}
                <button
                  onClick={() => handleOpenConfirm(scen)}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-canvas-surface border border-canvas-border hover:border-accent-chaos/60 hover:bg-accent-chaos/10 text-xs font-mono font-bold text-text-primary hover:text-accent-chaos transition-all cursor-pointer btn-magnetic active:scale-[0.985]"
                >
                  <Flame className="w-3.5 h-3.5 text-accent-chaos" />
                  <span>Configure & Inject</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Confirmation Modal */}
      {showModal && selectedScenario && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl border border-canvas-border bg-[#0D1220]/95 backdrop-blur-md max-w-lg w-full p-6 space-y-5 shadow-2xl font-mono">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 text-accent-chaos">
                <div className="p-2.5 rounded-xl bg-accent-chaos/10 border border-accent-chaos/30">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary">
                    Confirm Chaos Injection
                  </h3>
                  <div className="text-xs text-text-muted">
                    Scenario: {selectedScenario.name}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded text-text-muted hover:text-text-primary transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#070A10] border border-canvas-border text-xs space-y-2 text-text-secondary leading-relaxed">
              <div className="flex items-center space-x-2 text-accent-success font-bold text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>SANDBOX ISOLATION ENFORCED</span>
              </div>
              <div>
                This experiment will spawn a disposable sandbox workspace (<code className="text-accent-chaos">workspaces/exp_...</code>).
              </div>
              <div className="text-text-muted text-[11px]">
                Production configuration, host filesystem, and credentials are completely protected.
              </div>
            </div>

            {/* Auto-Approve Checkbox */}
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-canvas-card border border-canvas-border text-xs">
              <input
                type="checkbox"
                id="autoApprove"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="mt-0.5 rounded border-canvas-border bg-canvas-surface text-accent-chaos focus:ring-0 cursor-pointer"
              />
              <label htmlFor="autoApprove" className="cursor-pointer select-none text-text-secondary">
                <span className="font-bold text-text-primary block">Auto-approve validated repair patch</span>
                Execute complete automated recovery pipeline (reproduce → diagnose → patch → verify).
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-mono text-text-muted hover:text-text-primary transition"
                disabled={launching}
              >
                Cancel
              </button>
              <button
                onClick={handleLaunch}
                disabled={launching}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-accent-chaos hover:bg-amber-400 text-canvas font-mono text-xs font-bold transition-all shadow-glow-amber hover:shadow-[0_0_22px_rgba(255,159,10,0.45)] cursor-pointer btn-magnetic active:scale-[0.98]"
              >
                {launching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Spinning up sandbox...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>LAUNCH EXPERIMENT</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
