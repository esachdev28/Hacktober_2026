import React, { useRef, useLayoutEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldAlert, CheckCircle2, Cpu, Terminal, ArrowRight, Zap, FileCode2, AlertTriangle, Layers } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const FailureReveal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fracturePathRef = useRef<SVGPathElement>(null);
  const upperPlateRef = useRef<HTMLDivElement>(null);
  const lowerPlateRef = useRef<HTMLDivElement>(null);
  const machineryRef = useRef<HTMLDivElement>(null);
  const overlayTitleRef = useRef<HTMLDivElement>(null);
  const settleSummaryRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    if (mediaQuery.matches) {
      // In reduced motion, do not bind GSAP scroll pinning
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          scrub: 0.8,
          start: 'top top',
          end: '+=1200',
          anticipatePin: 1,
        },
      });

      // Step 1: Amber fracture line ignites and sparks across the surface
      if (fracturePathRef.current) {
        const length = fracturePathRef.current.getTotalLength() || 1200;
        gsap.set(fracturePathRef.current, {
          strokeDasharray: length,
          strokeDashoffset: length,
          opacity: 0,
        });

        tl.to(fracturePathRef.current, {
          strokeDashoffset: 0,
          opacity: 1,
          duration: 0.35,
          ease: 'power2.inOut',
        });
      }

      // Step 2: Overlay title text distorts and fades as fault expands
      if (overlayTitleRef.current) {
        tl.to(
          overlayTitleRef.current,
          {
            scale: 0.95,
            opacity: 0,
            filter: 'blur(8px)',
            duration: 0.25,
            ease: 'power1.out',
          },
          0.15
        );
      }

      // Step 3: Upper & Lower Plates tear open along the jagged fracture seam
      tl.to(
        upperPlateRef.current,
        {
          yPercent: -110,
          xPercent: -4,
          rotation: -3,
          opacity: 0.05,
          duration: 0.6,
          ease: 'power3.inOut',
        },
        0.25
      );

      tl.to(
        lowerPlateRef.current,
        {
          yPercent: 110,
          xPercent: 4,
          rotation: 2.5,
          opacity: 0.05,
          duration: 0.6,
          ease: 'power3.inOut',
        },
        0.25
      );

      // Step 4: The inner failure-to-recovery machinery ascends into sharp focus
      if (machineryRef.current) {
        tl.fromTo(
          machineryRef.current,
          {
            scale: 0.88,
            opacity: 0,
            y: 40,
            filter: 'blur(6px)',
          },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.55,
            ease: 'power2.out',
          },
          0.35
        );
      }

      // Step 5: Final settlement message highlights verified recovery
      if (settleSummaryRef.current) {
        tl.fromTo(
          settleSummaryRef.current,
          {
            opacity: 0,
            y: 20,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: 'power2.out',
          },
          0.7
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      id="failure-reveal"
      ref={containerRef}
      className="relative w-full min-h-screen bg-[#06080F] text-white overflow-hidden flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 select-none"
    >
      {/* Background Architectural Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

      {/* AMBER GLOW FILTERS FOR THE SVG FRACTURE */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="fracture-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* =========================================================================
          REVEALED INNER LAYER: THE FAILURE-TO-RECOVERY MACHINERY (Rendered Below)
         ========================================================================= */}
      <div
        ref={machineryRef}
        className={`relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center transition-all ${
          prefersReducedMotion ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Machinery Header Telemetry */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-[#253148]/80 mb-6 font-mono text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold uppercase tracking-wider">
              SANDBOX FORENSICS & RECOVERY PIPELINE
            </span>
            <span className="text-text-muted">/</span>
            <span className="text-text-secondary">EXP-311: ISOLATED RUN</span>
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-text-muted text-[11px]">
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              AIR-GAPPED NET: NONE
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              GEMMA-4-31B-IT
            </span>
          </div>
        </div>

        {/* Triple Node Architecture: Failure -> AI Diagnosis -> Verified Recovery */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full">
          {/* NODE 1: Captured Failure Evidence */}
          <div className="rounded-xl bg-[#0D1220]/95 border border-red-500/40 p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
            
            <div className="flex items-center justify-between mb-3 font-mono">
              <div className="flex items-center space-x-2 text-xs text-red-400 font-bold">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>1. INJECTED FAILURE</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                EXIT 1 · ERROR
              </span>
            </div>

            <div className="text-xs text-text-muted mb-2 font-mono">Captured Raw Sandbox Evidence:</div>
            
            {/* Terminal Mock Snippet */}
            <div className="bg-[#05070B] rounded-lg p-3 font-mono text-[11px] text-red-300 border border-red-500/20 mb-3 overflow-x-auto leading-relaxed">
              <p className="text-text-muted text-[10px] mb-1"># py.test -q tests/test_auth.py</p>
              <p className="font-semibold">FAILED tests/test_auth.py::test_jwt_sign</p>
              <p className="text-red-400">KeyError: 'JWT_SECRET_KEY' missing from environment</p>
              <p className="text-text-muted mt-1">&gt; raise TokenConfigException(f"key missing: &#123;key&#125;")</p>
            </div>

            <div className="text-[11px] font-mono text-text-secondary space-y-1">
              <div><span className="text-text-muted">Evidence ID:</span> <span className="text-white font-mono">EVID-311-001</span></div>
              <div><span className="text-text-muted">Sanitization:</span> <span className="text-emerald-400">Tokens Redacted</span></div>
            </div>
          </div>

          {/* NODE 2: AI Investigator & Unified Diff Patch */}
          <div className="rounded-xl bg-[#0D1220]/95 border border-purple-500/40 p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-amber-500" />

            <div className="flex items-center justify-between mb-3 font-mono">
              <div className="flex items-center space-x-2 text-xs text-purple-300 font-bold">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>2. AI SYNTHESIZED REPAIR</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                NVIDIA NIM
              </span>
            </div>

            <div className="text-xs text-text-muted mb-2 font-mono">Validated Unified Diff Patch:</div>

            {/* Diff Card */}
            <div className="bg-[#05070B] rounded-lg p-3 font-mono text-[11px] border border-purple-500/20 mb-3 overflow-x-auto leading-relaxed">
              <p className="text-text-muted text-[10px]">--- a/demo_app/auth/token.py</p>
              <p className="text-text-muted text-[10px]">+++ b/demo_app/auth/token.py</p>
              <p className="text-cyan-400 text-[10px]">@@ -14,3 +14,5 @@</p>
              <p className="text-red-400 bg-red-950/30 px-1 rounded-sm">- return os.environ["JWT_SECRET_KEY"]</p>
              <p className="text-emerald-400 bg-emerald-950/30 px-1 rounded-sm">+ key = os.getenv("JWT_SECRET_KEY")</p>
              <p className="text-emerald-400 bg-emerald-950/30 px-1 rounded-sm">+ return key if key else default_key()</p>
            </div>

            <div className="text-[11px] font-mono text-text-secondary space-y-1">
              <div><span className="text-text-muted">Security Guard:</span> <span className="text-emerald-400">Path Bounds OK</span></div>
              <div><span className="text-text-muted">Human Approval:</span> <span className="text-amber-400">Required Before Apply</span></div>
            </div>
          </div>

          {/* NODE 3: Deterministic Verified Recovery */}
          <div className="rounded-xl bg-[#0D1220]/95 border border-emerald-500/40 p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />

            <div className="flex items-center justify-between mb-3 font-mono">
              <div className="flex items-center space-x-2 text-xs text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>3. VERIFIED RECOVERY</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% PASS
              </span>
            </div>

            <div className="text-xs text-text-muted mb-2 font-mono">Deterministic Sandbox Rerun:</div>

            <div className="bg-[#05070B] rounded-lg p-3 font-mono text-[11px] text-emerald-400 border border-emerald-500/20 mb-3 overflow-x-auto leading-relaxed">
              <p className="text-text-muted text-[10px] mb-1"># py.test -q (post-patch verification)</p>
              <p className="font-semibold text-emerald-300">tests/test_auth.py . [100%]</p>
              <p className="text-emerald-400">1 passed, 0 failed, 0 errors in 0.42s</p>
              <p className="text-text-muted mt-1 font-semibold text-white">&gt; VERDICT: VERIFIED_RECOVERY</p>
            </div>

            <div className="text-[11px] font-mono text-text-secondary space-y-1">
              <div><span className="text-text-muted">Strict Policy:</span> <span className="text-white">Zero Fake Passes</span></div>
              <div><span className="text-text-muted">Export:</span> <span className="text-cyan-400">Verified Branch Ready</span></div>
            </div>
          </div>
        </div>

        {/* Settle Summary Banner */}
        <div
          ref={settleSummaryRef}
          className="mt-8 text-center max-w-3xl mx-auto px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#111827] to-cyan-500/10 border border-[#253148] backdrop-blur-sm"
        >
          <p className="text-xs sm:text-sm font-mono text-text-primary">
            <span className="text-amber-400 font-bold">CHAOSPATCH GUARANTEE:</span> An inference response is never reported as a verified recovery until fresh deterministic sandbox checks succeed.
          </p>
        </div>
      </div>

      {/* =========================================================================
          TOP TEAR LAYER: UPPER & LOWER HULL PLATES THAT TEAR APART (Rendered Above)
         ========================================================================= */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden">
          {/* UPPER TEAR PLATE */}
          <div
            ref={upperPlateRef}
            className="w-full h-1/2 bg-[#090D18] border-b-2 border-amber-500/80 relative flex items-end justify-center shadow-2xl"
            style={{
              clipPath:
                'polygon(0% 0%, 100% 0%, 100% 90%, 85% 97%, 70% 88%, 55% 98%, 40% 90%, 25% 96%, 10% 89%, 0% 98%)',
            }}
          >
            {/* Upper Surface Plate Styling */}
            <div className="absolute inset-0 bg-grid-pattern opacity-30" />
            <div className="absolute top-8 left-8 flex items-center space-x-3 text-xs font-mono text-text-muted">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>CORE_SURFACE_MONITOR // SEAM_01</span>
            </div>
          </div>

          {/* LOWER TEAR PLATE */}
          <div
            ref={lowerPlateRef}
            className="w-full h-1/2 bg-[#090D18] border-t-2 border-amber-500/80 relative flex items-start justify-center shadow-2xl"
            style={{
              clipPath:
                'polygon(0% 2%, 10% 11%, 25% 4%, 40% 10%, 55% 2%, 70% 12%, 85% 3%, 100% 10%, 100% 100%, 0% 100%)',
            }}
          >
            {/* Lower Surface Plate Styling */}
            <div className="absolute inset-0 bg-grid-pattern opacity-30" />
            <div className="absolute bottom-8 right-8 flex items-center space-x-3 text-xs font-mono text-text-muted">
              <span>SECURITY_BOUNDARY // DISPOSABLE_WORKSPACE</span>
            </div>
          </div>

          {/* AMBER JAGGED FRACTURE SEAM (SVG PATH ACROSS THE MIDDLE) */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 flex items-center justify-center pointer-events-none">
            <svg
              className="w-full h-24 overflow-visible"
              viewBox="0 0 1200 100"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                ref={fracturePathRef}
                d="M 0,50 L 120,40 L 240,65 L 360,35 L 480,68 L 600,42 L 720,62 L 840,38 L 960,66 L 1080,45 L 1200,50"
                stroke="#FF9F0A"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#fracture-glow)"
              />
            </svg>
          </div>

          {/* INITIAL HEADLINE IN MIDDLE OF TEAR (Disappears as tear propagates) */}
          <div
            ref={overlayTitleRef}
            className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none px-4 text-center"
          >
            <div className="px-3.5 py-1.5 rounded-full bg-[#111827]/90 border border-amber-500/40 text-[11px] font-mono text-amber-400 mb-4 shadow-xl">
              [ SYSTEM STATUS: CONTROLLED EQUILIBRIUM ]
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-sans uppercase tracking-tight text-white drop-shadow-2xl">
              THE SURFACE LOOKS CALM.
            </h2>
            <p className="text-xs sm:text-sm font-mono text-text-secondary mt-2 tracking-wide max-w-md">
              Scroll down to induce fracture and reveal the autonomous recovery machinery underneath.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
