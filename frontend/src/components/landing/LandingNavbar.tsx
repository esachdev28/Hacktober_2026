import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, Cpu, ArrowDown, Activity } from 'lucide-react';

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-[#111310]/95 backdrop-blur-md border-b border-[#363B30] py-3 shadow-lg shadow-black/60'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="relative w-9 h-9 rounded-lg bg-[#191C17] border border-[#505745] flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-[#C7F36B]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#C7F36B]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-wider text-[#F3F0E7] font-mono">CHAOSPATCH</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#202A16] text-[#C7F36B] border border-[#363B30]">
                SRE CORE
              </span>
            </div>
            <p className="text-[10px] text-[#85897D] font-mono tracking-tight hidden sm:block">
              INJECT FAILURE · LET AI RECOVER
            </p>
          </div>
        </div>

        {/* Quick Nav Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-mono text-[#B0B2A7]">
          <button
            onClick={() => scrollToSection('failure-reveal')}
            className="hover:text-[#C7F36B] transition-colors flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-[#22261F] cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#FF6B55]" />
            <span>Fracture Engine</span>
          </button>
          <button
            onClick={() => scrollToSection('workflow-section')}
            className="hover:text-[#C7F36B] transition-colors flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-[#22261F] cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-[#C7F36B]" />
            <span>5-Stage Recovery</span>
          </button>
          <button
            onClick={() => scrollToSection('live-architecture')}
            className="hover:text-[#C7F36B] transition-colors flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-[#22261F] cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-[#86B7FF]" />
            <span>Sandbox Policy</span>
          </button>
        </nav>

        {/* Action Button: Acid Lime CTA with Dark Text */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded bg-[#191C17] border border-[#363B30] text-[11px] font-mono text-[#C7F36B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C7F36B] animate-pulse" />
            <span>NVIDIA NIM: READY</span>
          </div>

          <button
            onClick={onEnterDashboard}
            className="btn-magnetic px-4 py-2 rounded-lg bg-[#C7F36B] hover:bg-[#D8FF8A] active:bg-[#A9D94E] text-[#171A12] font-bold text-xs tracking-wider uppercase font-mono shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
          >
            <span>Launch Dashboard</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
