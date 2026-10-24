import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { AuroraStarfieldBackground } from './components/ui/AuroraStarfieldBackground';
import { OverviewPage } from './pages/OverviewPage';
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

  return (
    <div className="relative min-h-screen bg-[#080B12] text-text-primary flex flex-col font-sans selection:bg-accent-chaos/30 selection:text-white overflow-x-hidden">
      {/* Global Cinematic Aurora & 3D Starfield Background */}
      <AuroraStarfieldBackground />

      {/* Top Bar with real runtime status */}
      <Header
        onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
        mobileNavOpen={mobileNavOpen}
      />

      {/* Main Container Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
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
    </div>
  );
};

export default App;
