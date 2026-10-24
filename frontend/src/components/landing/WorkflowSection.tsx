import React, { useState } from 'react';
import { Search, Play, Brain, Wrench, CheckCircle, ArrowRight, ShieldCheck, Terminal, Cpu, ArrowDown } from 'lucide-react';

interface WorkflowSectionProps {
  onEnterDashboard: () => void;
}

interface StepInfo {
  number: string;
  name: string;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  details: string[];
  codeSnippet?: string;
}

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({ onEnterDashboard }) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const steps: StepInfo[] = [
    {
      number: '01',
      name: 'Inspect',
      title: 'Repository & Manifest Discovery',
      badge: 'Multi-Language Adapters',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      description:
        'Clones target GitHub revision into an ephemeral workspace. Multi-language detectors scan manifests to resolve test runners for Python (pytest), Node (jest/vitest), Go (go test), Rust (cargo test), and Java.',
      details: [
        'Heuristic detection of package.json, pyproject.toml, Cargo.toml, go.mod, pom.xml',
        'Fallback scripts: test → typecheck → lint → build',
        'Security screening against embedded tokens and directory traversal',
      ],
      codeSnippet: '# Detection telemetry\nADAPTER: PythonProjectAdapter\nRUNNER:  pytest (v7.4.3)\nMANIFEST: demo_app/pyproject.toml',
    },
    {
      number: '02',
      name: 'Reproduce',
      title: 'Air-Gapped Sandbox Execution',
      badge: 'Disposable Docker',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description:
        'Spawns a hardened, ephemeral container with strict resource limits (--network none, 1GB RAM, 1.5 CPUs, 64 PIDs). Captures standard output, exit codes, and raw failure tracebacks.',
      details: [
        'Network disabled during execution to prevent data exfiltration or SSRF',
        'Strict 60-second execution timeout prevents hung subprocesses',
        'Evidence package extractor redacts NVAPI keys, passwords, and bearer tokens',
      ],
      codeSnippet: 'docker run --rm --network none --memory 1g --cpus 1.5 \\\n  --pids-limit 64 chaospatch-sandbox:latest \\\n  pytest -q tests/ # exit 1 (failure captured)',
    },
    {
      number: '03',
      name: 'Investigate',
      title: 'AI Root Cause Forensics',
      badge: 'NVIDIA NIM Gemma-31B',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      description:
        'Transmits sanitized failure evidence and target source excerpts to NVIDIA NIM inference running google/gemma-4-31b-it. The model isolates the failure mechanism and cites evidence identifiers.',
      details: [
        'Bounded timeouts and exponential-backoff retries on transient 429/503 errors',
        'Structured JSON response parsing with markdown code-fence sanitization',
        'Automatic fallback to reference diagnoses if credentials are unconfigured',
      ],
      codeSnippet: '{\n  "title": "Missing Environment Configuration",\n  "root_cause": "Unchecked os.environ[\'JWT_SECRET\'] access",\n  "confidence": 0.96,\n  "cited_evidence_ids": ["EVID-311-001"]\n}',
    },
    {
      number: '04',
      name: 'Repair',
      title: 'Minimal Unified Diff Synthesis',
      badge: 'Filesystem Boundary Guard',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      description:
        'Synthesizes a minimal unified diff patch. A strict security policy screens the candidate patch against forbidden files (.env*, credentials, shell scripts) and rejects directory traversal before staging.',
      details: [
        'Enforces maximum patch size (10KB) and maximum changed files (5)',
        'Mandatory human review modal requires explicit SRE operator authorization',
        'One-click Git branch export (chaospatch/repair-exp-xxx)',
      ],
      codeSnippet: '--- a/demo_app/config.py\n+++ b/demo_app/config.py\n@@ -8,2 +8,2 @@\n- return os.environ["API_KEY"]\n+ return os.getenv("API_KEY", "dev-default")',
    },
    {
      number: '05',
      name: 'Verify',
      title: 'Deterministic Sandbox Rerun',
      badge: 'Zero Fake Passes',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description:
        'Applies the authorized patch to a fresh, clean workspace and reruns the identical test runner inside a new isolated container. Only a true exit code 0 transitions the experiment to VERIFIED_RECOVERY.',
      details: [
        'Never marks an experiment verified unless tests pass inside the container',
        'Detects regressions if previously passing tests break under the patch',
        'Records tamper-evident telemetry logs and rollback snapshots',
      ],
      codeSnippet: '# Post-patch verification inside fresh container\npytest tests/test_config.py\n==== 1 passed, 0 failed in 0.32s ====\nVERDICT: VERIFIED_RECOVERY [EXIT: 0]',
    },
  ];

  const activeStep = steps[activeStepIndex];

  return (
    <section id="workflow-section" className="relative w-full py-24 px-4 sm:px-6 lg:px-8 bg-[#080B12] text-white">
      {/* Background Subtle Ambience */}
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-400 mb-4">
            <Cpu className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider font-semibold">5-STAGE RELIABILITY LIFECYCLE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-sans uppercase tracking-tight mb-4">
            HOW CHAOSPATCH WORKS
          </h2>
          <p className="text-sm sm:text-base text-text-secondary font-sans leading-relaxed">
            From automated test-runner discovery to air-gapped fault reproduction, NVIDIA NIM reasoning, and deterministic post-patch verification.
          </p>
        </div>

        {/* 5-Step Horizontal Tab Navigator */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-8">
          {steps.map((s, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <button
                key={s.number}
                onClick={() => setActiveStepIndex(idx)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer font-mono ${
                  isActive
                    ? 'bg-[#172033] border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : 'bg-[#0E1526]/80 border-[#253148]/60 hover:bg-[#131C2E] hover:border-[#253148]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${isActive ? 'text-amber-400' : 'text-text-muted'}`}>
                    {s.number}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase border ${
                      isActive ? s.badgeColor : 'text-text-muted border-transparent'
                    }`}
                  >
                    STEP
                  </span>
                </div>
                <div className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-text-secondary'}`}>
                  {s.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Card */}
        <div className="rounded-2xl bg-[#0D1220] border border-[#253148] p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Description & Technical Details */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30">
                    STAGE {activeStep.number} // {activeStep.name.toUpperCase()}
                  </span>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded border ${activeStep.badgeColor}`}>
                    {activeStep.badge}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans mb-3">
                  {activeStep.title}
                </h3>

                <p className="text-sm sm:text-base text-text-secondary font-sans leading-relaxed mb-6">
                  {activeStep.description}
                </p>

                <div className="space-y-2 mb-6">
                  {activeStep.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start space-x-2 text-xs sm:text-sm text-text-primary">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Navigation Buttons */}
              <div className="flex items-center space-x-3 pt-4 border-t border-[#253148]">
                <button
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-[#253148] text-xs font-mono text-text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ← Previous
                </button>
                <button
                  disabled={activeStepIndex === steps.length - 1}
                  onClick={() => setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#253148] border border-[#253148] text-xs font-mono text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next Step →
                </button>
              </div>
            </div>

            {/* Right Column: Code/Log Excerpt */}
            <div className="lg:col-span-5 w-full">
              <div className="rounded-xl bg-[#05070B] border border-[#253148] p-4 shadow-inner font-mono text-xs text-text-secondary overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#253148]/60">
                  <div className="flex items-center space-x-2 text-text-muted text-[11px]">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>RAW TELEMETRY PREVIEW</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">ACTIVE</span>
                </div>
                <pre className="text-emerald-400/90 whitespace-pre-wrap leading-relaxed overflow-x-auto text-[11px] sm:text-xs">
                  {activeStep.codeSnippet}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Transition Callout: Direct Bridge to Dashboard */}
        <div id="live-architecture" className="mt-16 text-center">
          <div className="p-8 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0A0E1A] border border-[#253148] max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl pointer-events-none" />
            
            <h3 className="text-2xl sm:text-3xl font-black font-sans uppercase tracking-tight text-white mb-3">
              READY TO TEST RECOVERY IN THE LIVE WORKSPACE?
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl mx-auto mb-6">
              Launch the approved CHAOSPATCH interactive dashboard below. Select pre-configured failure scenarios or inject stochastic faults with the Autonomous Chaos Monkey.
            </p>

            <button
              onClick={onEnterDashboard}
              className="btn-magnetic px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-black font-bold font-mono text-sm tracking-wider uppercase shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 transition-all inline-flex items-center space-x-2 cursor-pointer"
            >
              <span>Scroll Down to Approved Dashboard</span>
              <ArrowDown className="w-4 h-4 text-black animate-bounce" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
