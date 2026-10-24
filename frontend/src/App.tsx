import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
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

  const handleExperimentLaunched = (id: number) => {
    setActiveExperimentId(id);
    setActiveTab('workspace');
  };

  const handleSelectExperiment = (id: number) => {
    setActiveExperimentId(id);
    setActiveTab('workspace');
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col font-sans">
      {/* Top Header */}
      <Header />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeExperimentId={activeExperimentId}
        />

        {/* Dynamic Main Workspace */}
        <main className="flex-1 overflow-y-auto p-6 bg-grid-pattern">
          <div className="max-w-7xl mx-auto">
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
              <IncidentsPage onSelectExperiment={handleSelectExperiment} />
            )}

            {activeTab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
