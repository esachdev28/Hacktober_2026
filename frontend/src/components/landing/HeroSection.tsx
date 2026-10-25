import React from 'react';
import { ArrowDown, Flame, ShieldCheck, Terminal, Cpu, Bug, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onScrollToReveal: () => void;
  onEnterDashboard: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToReveal, onEnterDashboard }) => {
  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 sm:px-6 lg:px-8 pt-28 pb-12 overflow-hidden bg-[#111310]">
      {/* Background Ambience: Precision Grid & Subtle Lighting */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
      
      {/* Restrained Ambient Vignette */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#22261F]/40 blur-3xl rounded-full pointer-events-none" />

      {/* Top Spacer */}
      <div className="w-full" />

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#191C17] border border-[#363B30] text-xs font-mono text-[#C7F36B] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#C7F36B] animate-pulse" />
          <span className="font-semibold tracking-wider uppercase">AUTONOMOUS FAILURE RECOVERY SYSTEM</span>
          <span className="text-[#505745]">|</span>
          <span className="text-[#B0B2A7] hidden sm:inline">NVIDIA NIM POWERED</span>
        </div>

        {/* Master Headline: Warm Chalk and Acid Lime */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#F3F0E7] font-sans uppercase leading-none select-none mb-6">
          <span className="block">INJECT FAILURE.</span>
          <span className="block text-[#C7F36B]">
            LET AI RECOVER.
          </span>
        </h1>

        {/* Supporting Copy: Warm Chalk / Muted Neutrals */}
        <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-[#B0B2A7] font-sans leading-relaxed mb-10">
          Introduce controlled, disposable failure into isolated sandboxes, capture structured diagnostic evidence, synthesize minimal code patches with NVIDIA-hosted GLM-5.3-Flash inference, and verify recovery before human authorization.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-14">
          <button
            onClick={onScrollToReveal}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#C7F36B] hover:bg-[#D8FF8A] active:bg-[#A9D94E] text-[#171A12] font-bold text-sm tracking-wider uppercase font-mono shadow-sm transition-all flex items-center justify-center space-x-2.5 group cursor-pointer"
          >
            <Flame className="w-4 h-4 text-[#171A12]" />
            <span>Witness Failure Reveal</span>
            <ArrowDown className="w-4 h-4 text-[#171A12] group-hover:translate-y-0.5 transition-transform" />
          </button>

          <button
            onClick={onEnterDashboard}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#191C17] hover:bg-[#22261F] border border-[#363B30] hover:border-[#505745] text-[#F3F0E7] font-mono text-sm tracking-wide transition-all flex items-center justify-center space-x-2.5 cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-[#C7F36B]" />
            <span>Open SRE Dashboard</span>
          </button>
        </div>

        {/* Technical Architecture Strip: Obsidian & Graphite Surfaces */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl text-left font-mono">
          <div className="p-3.5 rounded-lg bg-[#191C17] border border-[#363B30]">
            <div className="flex items-center space-x-2 text-xs text-[#85897D] mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C7F36B]" />
              <span>SANDBOX BOUNDARY</span>
            </div>
            <div className="text-xs text-[#F3F0E7] font-semibold">AIR-GAPPED DOCKER</div>
            <div className="text-[10px] text-[#85897D] mt-0.5">--network none · 1GB RAM · 60s timeout</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#191C17] border border-[#363B30]">
            <div className="flex items-center space-x-2 text-xs text-[#85897D] mb-1">
              <Cpu className="w-3.5 h-3.5 text-[#C7F36B]" />
              <span>AI REASONING</span>
            </div>
            <div className="text-xs text-[#F3F0E7] font-semibold">NVIDIA NIM GLM-5.3</div>
            <div className="text-[10px] text-[#85897D] mt-0.5">z-ai/glm-5.3-flash · Unified diff repair</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#191C17] border border-[#363B30]">
            <div className="flex items-center space-x-2 text-xs text-[#85897D] mb-1">
              <Bug className="w-3.5 h-3.5 text-[#FF6B55]" />
              <span>CHAOS MONKEY</span>
            </div>
            <div className="text-xs text-[#F3F0E7] font-semibold">STOCHASTIC INJECTION</div>
            <div className="text-[10px] text-[#85897D] mt-0.5">Multi-vector fault & blast radius limits</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#191C17] border border-[#363B30]">
            <div className="flex items-center space-x-2 text-xs text-[#85897D] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C7F36B]" />
              <span>VERIFICATION</span>
            </div>
            <div className="text-xs text-[#F3F0E7] font-semibold">DETERMINISTIC SUITE</div>
            <div className="text-[10px] text-[#85897D] mt-0.5">No fake passes · Sandbox test rerun</div>
          </div>
        </div>
      </div>

      {/* Visible Scroll Cue */}
      <div
        onClick={onScrollToReveal}
        className="relative z-10 flex flex-col items-center mt-12 cursor-pointer group select-none"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#85897D] group-hover:text-[#C7F36B] transition-colors mb-2">
          SCROLL TO TEAR & REVEAL
        </span>
        <div className="w-6 h-10 rounded-full border border-[#363B30] group-hover:border-[#505745] flex items-start justify-center p-1.5 transition-colors">
          <div className="w-1.5 h-2.5 rounded-full bg-[#C7F36B] animate-bounce" />
        </div>
      </div>
    </section>
  );
};
