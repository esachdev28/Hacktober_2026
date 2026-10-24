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
    <div className="relative min-h-screen bg-[#080B12] text-text-primary flex flex-col font-sans selection:bg-accent-chaos/30 selection:text-white overflow-x-hidden">
      {/* Global Cinematic Aurora & 3D Starfield Background */}
      <AuroraStarfieldBackground />

      {/* 1. Cinematic Landing Page with GSAP Scroll Fracture Reveal */}
      <LandingPage onEnterDashboard={handleScrollToDashboard} />

      {/* 2. Existing Approved SRE Dashboard (Preserved 100% Intact) */}
      <section
        id="dashboard"
        className="relative z-10 w-full min-h-screen flex flex-col border-t border-[#253148] shadow-2xl bg-[#080B12]"
      >
        {/* Navigation Bridge Banner */}
        <div className="bg-[#0B0F19] border-b border-[#253148]/80 px-4 sm:px-6 py-2 flex items-center justify-between text-xs font-mono text-text-muted">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-white font-semibold uppercase tracking-wider">
              CHAOSPATCH DASHBOARD
            </span>
            <span className="hidden sm:inline text-text-secondary">
              · ACTIVE SRE WORKSPACE
            </span>
          </div>
          <button
            onClick={handleScrollToTop}
            className="hover:text-accent-chaos transition-colors flex items-center space-x-1.5 py-0.5 px-2 rounded hover:bg-white/5 cursor-pointer text-[11px]"
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
