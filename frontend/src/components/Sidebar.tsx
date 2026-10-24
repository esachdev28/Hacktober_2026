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
  Activity,
  ShieldAlert,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'launcher'
  | 'repo_mode'
  | 'workspace'
  | 'incidents'
  | 'evidence'
  | 'repairs'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeExperimentId?: number | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeExperimentId,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const sections = [
    {
      group: 'RELIABILITY WORKBENCH',
      items: [
        {
          id: 'overview' as NavTab,
          label: 'Overview',
          icon: LayoutDashboard,
          caption: 'Command Dashboard',
        },
        {
          id: 'repo_mode' as NavTab,
          label: 'Public GitHub Mode',
          icon: GitBranch,
          badge: 'SIGNATURE',
          badgeColor: 'bg-accent-chaos/20 text-accent-chaos border-accent-chaos/30',
          caption: 'Zero-Config Repo Repair',
        },
        {
          id: 'launcher' as NavTab,
          label: 'Demo Scenarios',
          icon: PlayCircle,
          caption: 'Fault Injection Suite',
        },
        {
          id: 'workspace' as NavTab,
          label: 'Live Workspace',
          icon: Terminal,
          badge: activeExperimentId ? `#${activeExperimentId}` : undefined,
          badgeColor: 'bg-accent-info/20 text-accent-info border-accent-info/30',
          caption: 'Interactive Sandbox',
        },
      ],
    },
    {
      group: 'OBSERVABILITY & AUDIT',
      items: [
        {
          id: 'incidents' as NavTab,
          label: 'Incidents',
          icon: AlertTriangle,
          caption: 'Diagnosis Audit Trail',
        },
        {
          id: 'evidence' as NavTab,
          label: 'Evidence Explorer',
          icon: FileSearch,
          caption: 'Redacted Telemetry',
        },
        {
          id: 'repairs' as NavTab,
          label: 'Repair History',
          icon: GitCommit,
          caption: 'Patches & Verifications',
        },
      ],
    },
    {
      group: 'ENGINE CONFIG',
      items: [
        {
          id: 'settings' as NavTab,
          label: 'Settings',
          icon: Settings,
          caption: 'Model & Sandbox Policy',
        },
      ],
    },
  ];

  const handleSelect = (tab: NavTab) => {
    onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 shrink-0 md:shrink-0 w-64 border-r border-canvas-border bg-[#0D1220] flex flex-col justify-between select-none font-mono transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="py-4 overflow-y-auto">
          {sections.map((sec, secIdx) => (
            <div key={sec.group} className={secIdx > 0 ? 'mt-5' : ''}>
              <div className="px-4 mb-2">
                <span className="text-[10px] font-mono font-bold tracking-wider text-text-muted uppercase">
                  {sec.group}
                </span>
              </div>

              <nav className="space-y-1 px-2.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      type="button"
                      id={`nav-${item.id}`}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all duration-150 border cursor-pointer ${
                        isActive
                          ? 'bg-accent-chaos/10 text-accent-chaos border-accent-chaos/30 font-bold shadow-sm'
                          : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-canvas-card hover:border-canvas-border/50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-accent-chaos'
                              : 'text-text-muted group-hover:text-text-primary'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-bold rounded border uppercase tracking-wider shrink-0 ${
                            item.badgeColor || 'bg-canvas-surface text-text-muted border-canvas-border'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer Technical Metadata */}
        <div className="p-3.5 border-t border-canvas-border bg-[#090D18] text-[11px] font-mono space-y-1 text-text-muted">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-semibold">CHAOSPATCH v0.1.0</span>
            <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" title="System Operational" />
          </div>
          <div className="text-[10px] text-text-muted/70 flex items-center justify-between">
            <span>Air-Gapped Sandbox</span>
            <span>--network none</span>
          </div>
        </div>
      </aside>
    </>
  );
};
