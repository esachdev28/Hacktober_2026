import React from 'react';
import {
  LayoutDashboard,
  PlayCircle,
  GitBranch,
  AlertTriangle,
  FileSearch,
  GitCommit,
  Settings,
  Terminal,
} from 'lucide-react';

export type NavTab = 'overview' | 'launcher' | 'repo_mode' | 'workspace' | 'incidents' | 'evidence' | 'repairs' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeExperimentId?: number | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, activeExperimentId }) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'repo_mode' as NavTab, label: 'Public GitHub Mode', icon: GitBranch, badge: 'NEW' },
    { id: 'launcher' as NavTab, label: 'Demo Scenarios', icon: PlayCircle },
    {
      id: 'workspace' as NavTab,
      label: 'Live Workspace',
      icon: Terminal,
      badge: activeExperimentId ? `#${activeExperimentId}` : undefined,
    },
    { id: 'incidents' as NavTab, label: 'Incidents', icon: AlertTriangle },
    { id: 'evidence' as NavTab, label: 'Evidence Explorer', icon: FileSearch },
    { id: 'repairs' as NavTab, label: 'Repair History', icon: GitCommit },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 border-r border-canvas-border bg-canvas-subtle flex flex-col justify-between select-none">
      <div className="py-4">
        <div className="px-4 mb-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Reliability Engineering
          </span>
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono transition ${
                  isActive
                    ? 'bg-accent-chaos/10 text-accent-chaos border border-accent-chaos/30 font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-canvas-hover'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent-chaos' : 'text-text-muted'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent-chaos text-canvas font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-canvas-border text-[11px] font-mono text-text-muted">
        <div>CHAOSPATCH Engine v0.1.0</div>
        <div className="text-[10px] text-text-muted/60 mt-0.5">Isolated Test Harness</div>
      </div>
    </aside>
  );
};
