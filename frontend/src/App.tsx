import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { AuroraStarfieldBackground } from './components/ui/AuroraStarfieldBackground';
import { LandingPage } from './components/landing/LandingPage';
import { OverviewPage } from './pages/OverviewPage';
import { MonkeyChaosPage } from './pages/MonkeyChaosPage';
import { LauncherPage } from './pages/LauncherPage';
import { RepoIntakePage } from './pages/RepoIntakePage';
import { WorkspacePage } from './pages/WorkspacePage';
import { IncidentsPage } from './pages/IncidentsPage';
import { EvidencePage } from './pages/EvidencePage';
import { SettingsPage } from './pages/SettingsPage';
import { isApiConfigured } from './api/config';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [activeExperimentId, setActiveExperimentId] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleExperimentLaunched = (id: number) => {
    setActiveExperimentId(id);
    setActiveTab('workspace');
  };

  const handleSelectExperiment = (id: number) => {
    setActiveExperimentId(id);
    setActiveTab('workspace');
  };

  const handleScrollToDashboard = () => {
    const el = document.getElementById('dashboard');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-[#111310] text-[#F3F0E7] flex flex-col font-sans selection:bg-[#C7F36B]/30 selection:text-[#171A12] overflow-x-hidden">
      {/* Global Cinematic Ambient Background */}
      <AuroraStarfieldBackground />

      {/* Production Configuration Missing Banner */}
      {!isApiConfigured() && (
        <div className="sticky top-0 z-50 bg-[#321D19] border-b border-[#FF6B55]/50 px-4 py-2.5 text-center text-xs text-[#FF6B55] font-mono shadow-lg">
          <span className="font-bold mr-2">⚠ CONFIGURATION REQUIRED:</span>
          <span>VITE_API_BASE_URL is not configured in this production build. Please set </span>
          <code className="text-[#F3F0E7] bg-black/40 px-1.5 py-0.5 rounded font-mono">
            VITE_API_BASE_URL=https://hacktober-2026.onrender.com
          </code>
          <span> in Vercel Project Settings &gt; Environment Variables and redeploy.</span>
        </div>
      )}

      {/* 1. Cinematic Landing Page with GSAP Scroll Fracture Reveal */}
      <LandingPage onEnterDashboard={handleScrollToDashboard} />

      {/* 2. Existing Approved SRE Dashboard (Preserved 100% Intact) */}
      <section
        id="dashboard"
        className="relative z-10 w-full min-h-screen flex flex-col border-t border-[#363B30] shadow-2xl bg-[#111310]"
      >
        {/* Navigation Bridge Banner */}
        <div className="bg-[#191C17] border-b border-[#363B30] px-4 sm:px-6 py-2 flex items-center justify-between text-xs font-mono text-[#85897D]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#C7F36B]" />
            <span className="text-[#F3F0E7] font-semibold uppercase tracking-wider">
              CHAOSPATCH DASHBOARD
            </span>
            <span className="hidden sm:inline text-[#B0B2A7]">
              · ACTIVE SRE WORKSPACE
            </span>
          </div>
          <button
            onClick={handleScrollToTop}
            className="hover:text-[#C7F36B] transition-colors flex items-center space-x-1.5 py-0.5 px-2 rounded hover:bg-[#22261F] cursor-pointer text-[11px]"
          >
            <span>↑ Return to Cinematic Reveal</span>
          </button>
        </div>

        {/* Top Bar with real runtime status */}
        <Header
          onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
          mobileNavOpen={mobileNavOpen}
        />

        {/* Main Container Layout */}
        <div className="flex-1 flex overflow-hidden relative z-10 min-h-[calc(100vh-120px)]">
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeExperimentId={activeExperimentId}
            isOpenMobile={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
          />

          {/* Dynamic Main Workspace with Responsive Padding */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-grid-pattern/20 relative">
            <div className="max-w-7xl mx-auto w-full">
              {activeTab === 'overview' && (
                <OverviewPage
                  onNavigateLauncher={() => setActiveTab('repo_mode')}
                  onSelectExperiment={handleSelectExperiment}
                />
              )}

              {activeTab === 'repo_mode' && (
                <RepoIntakePage onSelectExperiment={handleSelectExperiment} />
              )}

              {activeTab === 'monkey_chaos' && (
                <MonkeyChaosPage onExperimentLaunched={handleExperimentLaunched} />
              )}

              {activeTab === 'launcher' && (
                <LauncherPage onExperimentLaunched={handleExperimentLaunched} />
              )}

              {activeTab === 'workspace' && (
                <WorkspacePage
                  experimentId={activeExperimentId}
                  onNavigateLauncher={() => setActiveTab('launcher')}
                />
              )}

              {activeTab === 'incidents' && (
                <IncidentsPage onSelectExperiment={handleSelectExperiment} />
              )}

              {activeTab === 'evidence' && (
                <EvidencePage onSelectExperiment={handleSelectExperiment} />
              )}

              {activeTab === 'repairs' && (
                <IncidentsPage onSelectExperiment={handleSelectExperiment} mode="repairs" />
              )}

              {activeTab === 'settings' && <SettingsPage />}
            </div>
          </main>
        </div>
      </section>
    </div>
  );
};

export default App;
