import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, Cpu, ArrowDown, Activity, Sparkles, ExternalLink } from 'lucide-react';

interface LandingNavbarProps {
  onEnterDashboard: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onEnterDashboard }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#080B12]/90 backdrop-blur-md border-b border-[#253148]/80 py-3 shadow-lg shadow-black/40'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-5 h-5 text-accent-chaos" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-wider text-white font-mono">CHAOSPATCH</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                SRE CORE
              </span>
            </div>
            <p className="text-[10px] text-text-muted font-mono tracking-tight hidden sm:block">
              INJECT FAILURE · LET AI RECOVER
            </p>
          </div>
        </div>

        {/* Quick Nav Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-mono text-text-secondary">
          <button
            onClick={() => scrollToSection('failure-reveal')}
            className="hover:text-accent-chaos transition-colors flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-white/5"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Fracture Engine</span>
          </button>
          <button
            onClick={() => scrollToSection('workflow-section')}
            className="hover:text-accent-chaos transition-colors flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-white/5"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>5-Stage Recovery</span>
          </button>
          <button
            onClick={() => scrollToSection('live-architecture')}
            className="hover:text-accent-chaos transition-colors flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-white/5"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sandbox Policy</span>
          </button>
        </nav>

        {/* Action Button: Jump to Approved Dashboard */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded bg-[#111827] border border-[#253148] text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>NVIDIA NIM: READY</span>
          </div>

          <button
            onClick={onEnterDashboard}
            className="btn-magnetic relative group px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold text-xs tracking-wider uppercase font-mono shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:from-amber-400 hover:to-orange-500 transition-all flex items-center space-x-2"
          >
            <span>Launch Dashboard</span>
            <ArrowDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
};
