import React, { useState, useEffect } from 'react';
import { Play, AlertTriangle, ShieldCheck, CheckCircle2, Flame, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { ScenarioInfo } from '../types';

interface LauncherPageProps {
  onExperimentLaunched: (experimentId: number) => void;
}

export const LauncherPage: React.FC<LauncherPageProps> = ({ onExperimentLaunched }) => {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    api.getScenarios().then(setScenarios).catch(console.error);
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
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-mono font-bold text-text-primary">Fault Injection Scenario Launcher</h1>
        <p className="text-xs font-mono text-text-muted mt-1">
          Select a deterministic failure scenario. Target is strictly restricted to disposable sandbox workspaces.
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map((scen) => {
          const isHighRisk = scen.risk_level === 'HIGH';
          const isMedRisk = scen.risk_level === 'MEDIUM';

          return (
            <div
              key={scen.id}
              className="rounded-lg border border-canvas-border bg-canvas-card p-5 flex flex-col justify-between hover:border-canvas-hover transition space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      isHighRisk
                        ? 'bg-accent-failure/20 text-accent-failure'
                        : isMedRisk
                        ? 'bg-accent-chaos/20 text-accent-chaos'
                        : 'bg-accent-info/20 text-accent-info'
                    }`}
                  >
                    Risk: {scen.risk_level}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {scen.estimated_stages} Stages
                  </span>
                </div>

                <h3 className="text-sm font-mono font-bold text-text-primary">{scen.name}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{scen.description}</p>

                {/* Failure Mechanism */}
                <div className="p-2.5 rounded bg-canvas-surface border border-canvas-border text-[11px] font-mono space-y-1">
                  <div className="text-text-muted uppercase text-[10px] font-bold">Failure Mechanism:</div>
                  <div className="text-accent-chaos">{scen.failure_mechanism}</div>
                </div>

                {/* Expected Symptoms */}
                <div className="space-y-1 text-xs font-mono">
                  <div className="text-[10px] font-bold uppercase text-text-muted">Expected Symptoms:</div>
                  {scen.expected_symptoms.slice(0, 2).map((s, i) => (
                    <div key={i} className="text-text-muted flex items-center space-x-1.5 text-[11px]">
                      <AlertTriangle className="w-3 h-3 text-accent-chaos shrink-0" />
                      <span className="truncate">{s}</span>
                    </div>
                  ))}
                </div>

                {/* Verification Checks */}
                <div className="space-y-1 text-xs font-mono">
                  <div className="text-[10px] font-bold uppercase text-text-muted">Verification Checks:</div>
                  {scen.verification_checks.slice(0, 2).map((c, i) => (
                    <div key={i} className="text-text-muted flex items-center space-x-1.5 text-[11px]">
                      <ShieldCheck className="w-3 h-3 text-accent-success shrink-0" />
                      <span className="truncate">{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Launch CTA */}
              <button
                onClick={() => handleOpenConfirm(scen)}
                className="w-full flex items-center justify-center space-x-2 py-2 rounded bg-canvas-surface border border-canvas-border hover:border-accent-chaos hover:bg-accent-chaos/10 text-xs font-mono font-bold text-text-primary transition"
              >
                <Flame className="w-3.5 h-3.5 text-accent-chaos" />
                <span>Configure & Inject</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Safety Confirmation Modal */}
      {showModal && selectedScenario && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl border border-canvas-border bg-canvas-card max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-accent-chaos">
              <div className="p-2 rounded bg-accent-chaos/10 border border-accent-chaos/30">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-base text-text-primary">
                  Confirm Chaos Injection
                </h3>
                <div className="text-xs font-mono text-text-muted">
                  Scenario: {selectedScenario.name}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded bg-canvas-surface border border-canvas-border text-xs font-mono space-y-2 text-text-secondary leading-relaxed">
              <div className="flex items-center space-x-2 text-accent-success font-bold text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>TARGET ISOLATION CONFIRMED</span>
              </div>
              <div>
                This experiment will clone the target application into an isolated disposable workspace (
                <code className="text-accent-chaos">workspaces/exp_...</code>).
              </div>
              <div>
                Production files, <code className="text-text-primary">.env</code>, and host credentials cannot be
                accessed or modified.
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center space-x-2 text-xs font-mono text-text-secondary">
              <input
                type="checkbox"
                id="autoApprove"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="rounded border-canvas-border bg-canvas-subtle text-accent-chaos focus:ring-0"
              />
              <label htmlFor="autoApprove" className="cursor-pointer select-none">
                Auto-approve validated repair patch (Run full end-to-end recovery automatically)
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded text-xs font-mono text-text-muted hover:text-text-primary transition"
                disabled={launching}
              >
                Cancel
              </button>
              <button
                onClick={handleLaunch}
                disabled={launching}
                className="flex items-center space-x-2 px-5 py-2 rounded bg-accent-chaos hover:bg-amber-400 text-canvas font-mono text-xs font-bold transition shadow-lg shadow-amber-500/20"
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
