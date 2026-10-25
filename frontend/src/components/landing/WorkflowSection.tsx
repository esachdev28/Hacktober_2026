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
      badgeColor: 'text-[#86B7FF] bg-[#1D2735] border-[#363B30]',
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
      badgeColor: 'text-[#FF6B55] bg-[#321D19] border-[#FF6B55]/30',
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
      badge: 'NVIDIA NIM GLM-5.3-Flash',
      badgeColor: 'text-[#C7F36B] bg-[#202A16] border-[#363B30]',
      description:
        'Transmits sanitized failure evidence and target source excerpts to NVIDIA NIM inference running z-ai/glm-5.3-flash. The model isolates the failure mechanism and cites evidence identifiers.',
      details: [
        'Bounded timeouts and exponential-backoff retries on transient 429/503 errors',
        'Structured JSON response parsing with markdown code-fence sanitization',
        'Strict single-model execution with explicit MODEL_FAILED error reporting',
      ],
      codeSnippet: '{\n  "title": "Missing Environment Configuration",\n  "root_cause": "Unchecked os.environ[\'JWT_SECRET\'] access",\n  "confidence": 0.96,\n  "cited_evidence_ids": ["EVID-311-001"]\n}',
    },
    {
      number: '04',
      name: 'Repair',
      title: 'Minimal Unified Diff Synthesis',
      badge: 'Filesystem Boundary Guard',
      badgeColor: 'text-[#FFC66D] bg-[#302718] border-[#363B30]',
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
      badgeColor: 'text-[#C7F36B] bg-[#202A16] border-[#C7F36B]/40',
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
    <section id="workflow-section" className="relative w-full py-24 px-4 sm:px-6 lg:px-8 bg-[#111310] text-[#F3F0E7]">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#191C17] border border-[#363B30] text-[11px] font-mono text-[#C7F36B] mb-4">
            <Cpu className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider font-semibold">5-STAGE RELIABILITY LIFECYCLE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-sans uppercase tracking-tight mb-4 text-[#F3F0E7]">
            HOW CHAOSPATCH WORKS
          </h2>
          <p className="text-sm sm:text-base text-[#B0B2A7] font-sans leading-relaxed">
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
                    ? 'bg-[#202A16] border-[#C7F36B] shadow-sm'
                    : 'bg-[#191C17] border-[#363B30] hover:bg-[#22261F] hover:border-[#505745]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${isActive ? 'text-[#C7F36B]' : 'text-[#85897D]'}`}>
                    {s.number}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase border ${
                      isActive ? s.badgeColor : 'text-[#85897D] border-transparent'
                    }`}
                  >
                    STEP
                  </span>
                </div>
                <div className={`text-sm font-bold truncate ${isActive ? 'text-[#F3F0E7]' : 'text-[#B0B2A7]'}`}>
                  {s.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Card */}
        <div className="rounded-2xl bg-[#191C17] border border-[#363B30] p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Description & Technical Details */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-xs font-mono font-bold text-[#C7F36B] px-2.5 py-1 rounded bg-[#202A16] border border-[#363B30]">
                    STAGE {activeStep.number} // {activeStep.name.toUpperCase()}
                  </span>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded border ${activeStep.badgeColor}`}>
                    {activeStep.badge}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-[#F3F0E7] font-sans mb-3">
                  {activeStep.title}
                </h3>

                <p className="text-sm sm:text-base text-[#B0B2A7] font-sans leading-relaxed mb-6">
                  {activeStep.description}
                </p>

                <div className="space-y-2 mb-6">
                  {activeStep.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start space-x-2 text-xs sm:text-sm text-[#F3F0E7]">
                      <ShieldCheck className="w-4 h-4 text-[#C7F36B] flex-shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Navigation Buttons */}
              <div className="flex items-center space-x-3 pt-4 border-t border-[#363B30]">
                <button
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-[#363B30] text-xs font-mono text-[#B0B2A7] hover:text-[#F3F0E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ← Previous
                </button>
                <button
                  disabled={activeStepIndex === steps.length - 1}
                  onClick={() => setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-[#22261F] hover:bg-[#2B3026] border border-[#363B30] text-xs font-mono text-[#F3F0E7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next Step →
                </button>
              </div>
            </div>

            {/* Right Column: Code/Log Excerpt */}
            <div className="lg:col-span-5 w-full">
              <div className="rounded-xl bg-[#111310] border border-[#363B30] p-4 shadow-inner font-mono text-xs text-[#B0B2A7] overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#363B30]">
                  <div className="flex items-center space-x-2 text-[#85897D] text-[11px]">
                    <Terminal className="w-3.5 h-3.5 text-[#C7F36B]" />
                    <span>RAW TELEMETRY PREVIEW</span>
                  </div>
                  <span className="text-[10px] text-[#C7F36B]">ACTIVE</span>
                </div>
                <pre className="text-[#C7F36B]/90 whitespace-pre-wrap leading-relaxed overflow-x-auto text-[11px] sm:text-xs">
                  {activeStep.codeSnippet}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Transition Callout: Direct Bridge to Dashboard */}
        <div id="live-architecture" className="mt-16 text-center">
          <div className="p-8 rounded-2xl bg-[#191C17] border border-[#363B30] max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
            <h3 className="text-2xl sm:text-3xl font-black font-sans uppercase tracking-tight text-[#F3F0E7] mb-3">
              READY TO TEST RECOVERY IN THE LIVE WORKSPACE?
            </h3>
            <p className="text-xs sm:text-sm text-[#B0B2A7] max-w-2xl mx-auto mb-6">
              Launch the approved CHAOSPATCH interactive dashboard below. Select pre-configured failure scenarios or inject stochastic faults with the Autonomous Chaos Monkey.
            </p>

            <button
              onClick={onEnterDashboard}
              className="btn-magnetic px-8 py-3.5 rounded-xl bg-[#C7F36B] hover:bg-[#D8FF8A] active:bg-[#A9D94E] text-[#171A12] font-bold font-mono text-sm tracking-wider uppercase shadow-sm transition-all inline-flex items-center space-x-2 cursor-pointer"
            >
              <span>Scroll Down to Approved Dashboard</span>
              <ArrowDown className="w-4 h-4 text-[#171A12] animate-bounce" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
