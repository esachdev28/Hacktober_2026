import React from 'react';
import { ArrowDown, Flame, ShieldCheck, Terminal, Cpu, Bug, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onScrollToReveal: () => void;
  onEnterDashboard: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToReveal, onEnterDashboard }) => {
  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 sm:px-6 lg:px-8 pt-28 pb-12 overflow-hidden">
      {/* Background Ambience: Precision Grid & Subtle Lighting */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
      
      {/* Subtle Ambient Radial Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-b from-amber-500/10 via-orange-600/5 to-transparent blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

      {/* Top Spacer */}
      <div className="w-full" />

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#111827]/90 border border-amber-500/30 text-xs font-mono text-amber-400 mb-8 shadow-lg shadow-black/40">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="font-semibold tracking-wider uppercase">AUTONOMOUS FAILURE RECOVERY SYSTEM</span>
          <span className="text-text-muted">|</span>
          <span className="text-text-secondary hidden sm:inline">NVIDIA NIM POWERED</span>
        </div>

        {/* Master Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white font-sans uppercase leading-none select-none mb-6">
          <span className="block drop-shadow-sm">INJECT FAILURE.</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 drop-shadow-md">
            LET AI RECOVER.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-text-secondary font-sans leading-relaxed mb-10">
          Introduce controlled, disposable failure into isolated sandboxes, capture structured diagnostic evidence, synthesize minimal code patches with NVIDIA-hosted Gemma inference, and verify recovery before human authorization.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-14">
          <button
            onClick={onScrollToReveal}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold text-sm tracking-wider uppercase font-mono shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center space-x-2.5 group cursor-pointer"
          >
            <Flame className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
            <span>Witness Failure Reveal</span>
            <ArrowDown className="w-4 h-4 text-black group-hover:translate-y-0.5 transition-transform" />
          </button>

          <button
            onClick={onEnterDashboard}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#172033]/80 hover:bg-[#1E293B] border border-[#253148] hover:border-amber-500/40 text-text-primary hover:text-white font-mono text-sm tracking-wide transition-all flex items-center justify-center space-x-2.5 cursor-pointer backdrop-blur-sm"
          >
            <Terminal className="w-4 h-4 text-accent-chaos" />
            <span>Open SRE Dashboard</span>
          </button>
        </div>

        {/* Technical Architecture Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl text-left font-mono">
          <div className="p-3 rounded-lg bg-[#0E1526]/80 border border-[#253148]/60 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-xs text-text-muted mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SANDBOX BOUNDARY</span>
            </div>
            <div className="text-xs text-white font-semibold">AIR-GAPPED DOCKER</div>
            <div className="text-[10px] text-text-secondary mt-0.5">--network none · 1GB RAM · 60s timeout</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0E1526]/80 border border-[#253148]/60 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-xs text-text-muted mb-1">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>AI REASONING</span>
            </div>
            <div className="text-xs text-white font-semibold">NVIDIA NIM GEMMA-31B</div>
            <div className="text-[10px] text-text-secondary mt-0.5">Automated prompt & unified diff repair</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0E1526]/80 border border-[#253148]/60 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-xs text-text-muted mb-1">
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>CHAOS MONKEY</span>
            </div>
            <div className="text-xs text-white font-semibold">STOCHASTIC INJECTION</div>
            <div className="text-[10px] text-text-secondary mt-0.5">Multi-vector fault & blast radius limits</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0E1526]/80 border border-[#253148]/60 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-xs text-text-muted mb-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>VERIFICATION</span>
            </div>
            <div className="text-xs text-white font-semibold">DETERMINISTIC SUITE</div>
            <div className="text-[10px] text-text-secondary mt-0.5">No fake passes · Sandbox test rerun</div>
          </div>
        </div>
      </div>

      {/* Visible Scroll Cue */}
      <div
        onClick={onScrollToReveal}
        className="relative z-10 flex flex-col items-center mt-12 cursor-pointer group select-none"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted group-hover:text-amber-400 transition-colors mb-2">
          SCROLL TO TEAR & REVEAL
        </span>
        <div className="w-6 h-10 rounded-full border border-[#253148] group-hover:border-amber-500/50 flex items-start justify-center p-1.5 transition-colors">
          <div className="w-1.5 h-2.5 rounded-full bg-amber-400 animate-bounce" />
        </div>
      </div>
    </section>
  );
};
