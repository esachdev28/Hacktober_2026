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
  Flame,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'monkey_chaos'
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
          badgeColor: 'bg-[#202A16] text-[#C7F36B] border-[#363B30]',
          caption: 'Zero-Config Repo Repair',
        },
        {
          id: 'monkey_chaos' as NavTab,
          label: 'Monkey Chaos',
          icon: Flame,
          badge: 'STOCHASTIC',
          badgeColor: 'bg-[#321D19] text-[#FF6B55] border-[#363B30]',
          caption: 'Autonomous Fault Injection',
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
          badgeColor: 'bg-[#1D2735] text-[#86B7FF] border-[#363B30]',
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
        className={`fixed md:static inset-y-0 left-0 z-30 shrink-0 md:shrink-0 w-64 border-r border-[#363B30] bg-[#191C17]/95 backdrop-blur-md flex flex-col justify-between select-none font-mono transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="py-4 overflow-y-auto">
          {sections.map((sec, secIdx) => (
            <div key={sec.group} className={secIdx > 0 ? 'mt-5' : ''}>
              <div className="px-4 mb-2">
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#85897D] uppercase">
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
                      className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all duration-150 border cursor-pointer ${
                        isActive
                          ? 'bg-[#202A16] text-[#C7F36B] border-[#505745] font-bold'
                          : 'border-transparent text-[#B0B2A7] hover:text-[#F3F0E7] hover:bg-[#22261F] hover:border-[#363B30]'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#C7F36B] rounded-r" />
                      )}

                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-[#C7F36B]'
                              : 'text-[#85897D] group-hover:text-[#F3F0E7]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-bold rounded border uppercase tracking-wider shrink-0 transition-colors ${
                            item.badgeColor || 'bg-[#22261F] text-[#85897D] border-[#363B30]'
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
        <div className="p-3.5 border-t border-[#363B30] bg-[#191C17] text-[11px] font-mono space-y-1 text-[#85897D]">
          <div className="flex items-center justify-between">
            <span className="text-[#B0B2A7] font-semibold">CHAOSPATCH v0.1.0</span>
            <span className="w-2 h-2 rounded-full bg-[#C7F36B] animate-pulse" title="System Operational" />
          </div>
          <div className="text-[10px] text-[#85897D] flex items-center justify-between">
            <span>Air-Gapped Sandbox</span>
            <span>--network none</span>
          </div>
        </div>
      </aside>
    </>
  );
};
