import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Zap,
  ShieldAlert,
  Sliders,
  Terminal,
  Play,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import {
  MonkeyVectorInfo,
  MonkeyIntensity,
  MonkeyConfig,
  MonkeyLaunchResponse,
  ExperimentEvent,
} from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

interface MonkeyChaosPageProps {
  onExperimentLaunched: (experimentId: number) => void;
}

export const MonkeyChaosPage: React.FC<MonkeyChaosPageProps> = ({ onExperimentLaunched }) => {
  const [vectors, setVectors] = useState<MonkeyVectorInfo[]>([]);
  const [intensities, setIntensities] = useState<MonkeyIntensity[]>([
    'LOW',
    'MODERATE',
    'AGGRESSIVE',
    'CHAOS_BARRAGE',
  ]);
  const [loading, setLoading] = useState(true);

  // Configuration State
  const [selectedIntensity, setSelectedIntensity] = useState<MonkeyIntensity>('MODERATE');
  const [selectedVectors, setSelectedVectors] = useState<string[]>([
    'monkey_config_drop',
    'monkey_network_stall',
    'monkey_payload_scramble',
  ]);
  const [autoRepair, setAutoRepair] = useState(true);
  const [jitterMs, setJitterMs] = useState(150);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isStriking, setIsStriking] = useState(false);

  // Live Stream State
  const [activeStrike, setActiveStrike] = useState<MonkeyLaunchResponse | null>(null);
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [strikeDiff, setStrikeDiff] = useState<string | null>(null);
  const [strikePhase, setStrikePhase] = useState<string>('STANDBY');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .fetchMonkeyVectors()
      .then((data) => {
        setVectors(data.vectors);
        if (data.intensities && data.intensities.length > 0) {
          setIntensities(data.intensities as MonkeyIntensity[]);
        }
      })
      .catch((err) => {
        console.error('Failed to load monkey vector catalog:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto-scroll terminal stream
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamLogs]);

  const toggleVector = (id: string) => {
    if (selectedVectors.includes(id)) {
      if (selectedVectors.length === 1) return; // Maintain at least 1 vector
      setSelectedVectors(selectedVectors.filter((v) => v !== id));
    } else {
      setSelectedVectors([...selectedVectors, id]);
    }
  };

  const handleUnleashConfirmed = async () => {
    setShowWarningModal(false);
    setIsStriking(true);
    setStreamLogs([]);
    setStrikeDiff(null);
    setStrikePhase('ARMING');

    const config: MonkeyConfig = {
      target_environment: 'DOCKER_SANDBOX',
      target_path: 'demo_app',
      attack_vectors: selectedVectors,
      intensity: selectedIntensity,
      auto_repair: autoRepair,
      jitter_ms: jitterMs,
    };

    try {
      setStreamLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🚀 Initiating autonomous Monkey Chaos strike...`,
        `[${new Date().toLocaleTimeString()}] ⚙️ Intensity: ${selectedIntensity} | Allowed vectors: ${selectedVectors.join(', ')}`,
        `[${new Date().toLocaleTimeString()}] ⏱️ Injected latency jitter: ${jitterMs}ms`,
      ]);

      const res = await api.launchMonkeyChaos(config);
      setActiveStrike(res);
      setStrikePhase('INJECTING');

      setStreamLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 💥 Strike launched! Assigned Experiment #${res.experiment_id}`,
        `[${new Date().toLocaleTimeString()}] 🎯 Planned attack vectors: ${res.planned_vectors.join(' + ')}`,
      ]);

      // Subscribe to real-time experiment events
      api.subscribeToExperiment(
        res.experiment_id,
        (event: ExperimentEvent) => {
          const time = new Date(event.created_at || Date.now()).toLocaleTimeString();
          setStreamLogs((prev) => [...prev, `[${time}] [${event.event_type}] ${event.message}`]);

          if (event.event_type === 'MONKEY_STRIKE_APPLIED') {
            setStrikePhase('FAULT_ACTIVE');
            if (event.metadata_json?.candidate_repair?.diff) {
              setStrikeDiff(event.metadata_json.candidate_repair.diff);
            }
          } else if (event.event_type === 'STAGE_DIAGNOSING') {
            setStrikePhase('AI_DIAGNOSING');
          } else if (event.event_type === 'STAGE_VERIFYING') {
            setStrikePhase('VERIFYING_RECOVERY');
          } else if (event.event_type === 'STAGE_COMPLETED') {
            setStrikePhase('RECOVERY_VERIFIED');
            setIsStriking(false);
          } else if (event.event_type === 'STAGE_FAILED') {
            setStrikePhase('STRIKE_FAILED');
            setIsStriking(false);
          }
        },
        (err) => {
          console.warn('SSE stream notice:', err);
        }
      );
    } catch (err: any) {
      setStreamLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Failed to unleash monkey strike: ${err.message}`,
      ]);
      setStrikePhase('ERROR');
      setIsStriking(false);
    }
  };

  const intensityDetails: Record<MonkeyIntensity, { label: string; desc: string; color: string; badge: string }> = {
    LOW: {
      label: 'Low Chaos',
      desc: 'Samples 1 single fault vector at random with minimal blast radius.',
      color: 'border-blue-500/40 bg-blue-950/20 text-blue-400',
      badge: 'Single Vector',
    },
    MODERATE: {
      label: 'Moderate Strike',
      desc: 'Injects 1 vector combined with randomized latency jitter (0-5000ms).',
      color: 'border-yellow-500/40 bg-yellow-950/20 text-yellow-400',
      badge: 'Jittered Strike',
    },
    AGGRESSIVE: {
      label: 'Aggressive Cascade',
      desc: 'Simultaneously triggers 2 distinct failure vectors across different layers.',
      color: 'border-orange-500/40 bg-orange-950/20 text-orange-400',
      badge: 'Dual Vector Storm',
    },
    CHAOS_BARRAGE: {
      label: 'Chaos Barrage',
      desc: 'Full autonomous barrage executing all 3 vectors in cascading succession.',
      color: 'border-red-500/50 bg-red-950/30 text-red-400',
      badge: 'Maximum Multi-Vector',
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader
          badge="AUTONOMOUS SRE ENGINE"
          title="Monkey Chaos Lab"
          description="Autonomous multi-vector stochastic fault injection engine."
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <LoadingSkeleton className="h-40 rounded-xl" count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Page Title & SRE Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#253148]/80 pb-5">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-red-500/20 text-red-400 border-red-500/40 flex items-center space-x-1">
              <Flame className="w-3 h-3 text-red-400 animate-pulse" />
              <span>CHAOS MONKEY ENGINE</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              SANDBOX ISOLATED
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
            <span>Autonomous Monkey Chaos Lab</span>
          </h1>
          <p className="text-xs text-text-muted mt-1 max-w-2xl">
            Simulate real-world stochastic infrastructure anomalies across configuration, network transport,
            and data serialization layers. Controlled blast radius with automated AI recovery verification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowWarningModal(true)}
          disabled={isStriking || selectedVectors.length === 0}
          className={`flex items-center space-x-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border shadow-lg cursor-pointer ${
            isStriking
              ? 'bg-red-950/40 border-red-700/50 text-red-300 cursor-not-allowed opacity-80'
              : selectedVectors.length === 0
              ? 'bg-[#151D30] border-[#253148] text-text-muted cursor-not-allowed'
              : 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.35)] hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isStriking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Strike In Progress...</span>
            </>
          ) : (
            <>
              <Flame className="w-4 h-4 text-white animate-bounce" />
              <span>Unleash Monkey Strike</span>
            </>
          )}
        </button>
      </div>

      {/* Main Grid: Controls & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intensity & Attack Vectors (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Intensity Selector Card */}
          <div className="rounded-xl border border-[#253148] bg-[#0E1526]/80 p-5 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-accent-chaos" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  1. Strike Intensity & Cascading Mode
                </h3>
              </div>
              <span className="text-[10px] text-text-muted">Multi-Vector Stochastics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {intensities.map((lvl) => {
                const info = intensityDetails[lvl];
                const isSelected = selectedIntensity === lvl;
                return (
                  <div
                    key={lvl}
                    onClick={() => setSelectedIntensity(lvl)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all duration-200 relative ${
                      isSelected
                        ? `${info.color} ring-1 ring-current shadow-md scale-[1.01]`
                        : 'border-[#253148] bg-[#121B30]/50 text-text-secondary hover:border-[#384869] hover:bg-[#15203A]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs uppercase">{info.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-current/30 font-semibold uppercase">
                        {info.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">{info.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vector Selection Checkboxes */}
          <div className="rounded-xl border border-[#253148] bg-[#0E1526]/80 p-5 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-accent-info" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  2. Architectural Attack Vectors ({selectedVectors.length} Selected)
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedVectors(
                    selectedVectors.length === vectors.length
                      ? [vectors[0]?.id || 'monkey_config_drop']
                      : vectors.map((v) => v.id)
                  )
                }
                className="text-[10px] text-accent-info hover:underline cursor-pointer"
              >
                {selectedVectors.length === vectors.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-3">
              {vectors.map((vec) => {
                const checked = selectedVectors.includes(vec.id);
                return (
                  <div
                    key={vec.id}
                    onClick={() => toggleVector(vec.id)}
                    className={`flex items-start space-x-3 p-3.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                      checked
                        ? 'border-accent-chaos/40 bg-accent-chaos/10'
                        : 'border-[#253148] bg-[#121B30]/40 opacity-70 hover:opacity-100 hover:border-[#384869]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}} // handled by parent onClick
                      className="mt-0.5 w-4 h-4 rounded border-[#253148] text-accent-chaos focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">{vec.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] px-1.5 py-0.2 rounded border bg-[#1A253E] border-[#2A3B63] text-text-secondary">
                            {vec.target_layer}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${
                              vec.risk_level === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {vec.risk_level} RISK
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted leading-tight">
                        {vec.failure_mechanism}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Blast Radius Controls & Jitter Slider (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* SRE Tuning & Safety Parameters */}
          <div className="rounded-xl border border-[#253148] bg-[#0E1526]/80 p-5 backdrop-blur-md space-y-5">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                3. Blast Radius & Jitter Controls
              </h3>
            </div>

            {/* Jitter Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary font-medium">Injection Latency Jitter</span>
                <span className="px-2 py-0.5 rounded bg-[#16223B] border border-[#25355A] font-bold text-accent-chaos">
                  {jitterMs} ms
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="50"
                value={jitterMs}
                onChange={(e) => setJitterMs(Number(e.target.value))}
                className="w-full h-1.5 bg-[#1B2742] rounded-lg appearance-none cursor-pointer accent-accent-chaos"
              />
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>0ms (Immediate)</span>
                <span>2500ms</span>
                <span>5000ms (High Drift)</span>
              </div>
            </div>

            {/* Auto-Repair Toggle */}
            <div className="p-3.5 rounded-lg border border-[#253148] bg-[#121B30]/50 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-white mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent-chaos" />
                  <span>Automated AI Recovery</span>
                </div>
                <p className="text-[10px] text-text-muted">
                  Auto-diagnose with LLM and verify zero-regression recovery
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRepair}
                  onChange={(e) => setAutoRepair(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#253148] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-chaos"></div>
              </label>
            </div>

            {/* Target Sandbox Spec */}
            <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/15 text-[11px] space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Filesystem Security Invariant</span>
              </div>
              <p className="text-emerald-300/80 text-[10px] leading-relaxed">
                Strikes execute strictly inside ephemeral clone{' '}
                <code className="text-emerald-200">workspaces/exp_xxx/</code> with network isolation.
                The canonical repository root <code className="text-emerald-200">demo_app/</code> is never touched.
              </p>
            </div>
          </div>

          {/* Quick Active Status Badge */}
          {activeStrike && (
            <div className="rounded-xl border border-accent-chaos/40 bg-accent-chaos/10 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-accent-chaos flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent-chaos animate-ping" />
                  <span>Experiment #{activeStrike.experiment_id}</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-current">
                  {strikePhase}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onExperimentLaunched(activeStrike.experiment_id)}
                  className="text-xs text-white hover:text-accent-chaos flex items-center space-x-1 underline cursor-pointer"
                >
                  <span>Open Full Workspace Inspector</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Attack Stream & Terminal Output Card */}
      <div className="rounded-xl border border-[#253148] bg-[#0A0F1D]/90 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#253148]/80 bg-[#0E1526]">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-wider uppercase">
              Live Attack Stream & Telemetry
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[10px]">
            <span className="flex items-center space-x-1.5 text-text-muted">
              <span
                className={`w-2 h-2 rounded-full ${
                  isStriking ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <span>{isStriking ? 'ATTACK ACTIVE' : 'STREAM READY'}</span>
            </span>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Terminal Console Logs (7 cols or full) */}
          <div className={`${strikeDiff ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
            <div className="bg-[#050811] border border-[#1B253D] rounded-lg p-3.5 font-mono text-[11px] h-64 overflow-y-auto space-y-1 text-emerald-400/90 shadow-inner">
              {streamLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted/60 text-center">
                  <Terminal className="w-8 h-8 mb-2 opacity-40 text-text-muted" />
                  <p>Awaiting strike initiation. Configure parameters above and click "Unleash Monkey Strike".</p>
                </div>
              ) : (
                <>
                  {streamLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed hover:bg-white/5 px-1 rounded">
                      {log}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Diff Preview if available (5 cols) */}
          {strikeDiff && (
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center space-x-2 text-xs font-bold text-accent-chaos mb-1.5">
                <FileCode className="w-4 h-4" />
                <span>Synthesized Repair Diff Preview</span>
              </div>
              <pre className="bg-[#050811] border border-[#1B253D] rounded-lg p-3 text-[10px] text-amber-300 font-mono h-64 overflow-auto whitespace-pre leading-snug">
                {strikeDiff}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Warning Confirmation Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0D1322] border border-red-500/50 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Confirm Monkey Strike</h3>
                  <p className="text-xs text-text-muted">Autonomous stochastic fault injection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-text-secondary border-y border-[#253148] py-4">
              <div className="flex justify-between">
                <span className="text-text-muted">Selected Intensity:</span>
                <span className="font-bold text-red-400 uppercase">{selectedIntensity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Target Vectors:</span>
                <span className="font-bold text-white">{selectedVectors.length} vector(s) active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Injection Jitter:</span>
                <span className="font-bold text-accent-chaos">{jitterMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Automated AI Recovery:</span>
                <span className={`font-bold ${autoRepair ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {autoRepair ? 'ENABLED' : 'MANUAL APPROVAL'}
                </span>
              </div>

              <div className="mt-3 p-3 rounded-lg bg-red-950/20 border border-red-800/40 text-[11px] text-red-300 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-red-400 inline mr-1.5" />
                This strike will induce real failures in an isolated sandbox clone. No production or
                canonical root repository files will be permanently modified.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2.5 rounded-lg border border-[#253148] text-xs font-bold text-text-secondary hover:bg-[#1A253D] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnleashConfirmed}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-xs font-bold text-white border border-red-500/50 shadow-lg cursor-pointer flex items-center space-x-2"
              >
                <Flame className="w-4 h-4" />
                <span>Confirm & Unleash Strike</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
