import React from 'react';
import {
  Radio,
  CalendarDays,
  FileCheck2,
  Wrench,
  UserCircle,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  Flame,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { StaffProfile } from '../../types/staff';

export type StaffNavTab = 'mission' | 'schedule' | 'reports' | 'equipment' | 'profile';

interface StaffSidebarProps {
  activeTab: StaffNavTab;
  onSelectTab: (tab: StaffNavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hasActiveMission: boolean;
  profile: StaffProfile;
}

const NAV_ITEMS: {
  id: StaffNavTab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}[] = [
  {
    id: 'mission',
    label: 'Tác Chiến & Điều Hướng',
    sublabel: 'Live Mission & HUD',
    icon: Radio,
    badge: 'LIVE',
    badgeColor: 'bg-red-500 text-white animate-pulse',
  },
  {
    id: 'schedule',
    label: 'Quản Lý Lịch Làm Việc',
    sublabel: 'Ca trực & Điểm danh',
    icon: CalendarDays,
    badge: 'Hôm nay',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  },
  {
    id: 'reports',
    label: 'Báo Cáo & Hiện Trường',
    sublabel: 'Digital Closure Reports',
    icon: FileCheck2,
  },
  {
    id: 'equipment',
    label: 'Kiểm Tra Phương Tiện',
    sublabel: 'Readiness Checklist',
    icon: Wrench,
  },
  {
    id: 'profile',
    label: 'Hồ Sơ & Chứng Chỉ',
    sublabel: 'Cấp bậc & Bằng cấp',
    icon: UserCircle,
  },
];

export const StaffSidebar: React.FC<StaffSidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  hasActiveMission,
  profile,
}) => {
  return (
    <aside
      className={`flex flex-col h-full shrink-0 bg-[#0B0F19] border-r border-slate-800 transition-all duration-300 select-none z-20 ${
        collapsed ? 'w-[72px]' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center h-16 shrink-0 border-b border-slate-800 px-4 gap-3 overflow-hidden">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 flex items-center justify-center shrink-0 border border-red-500/40 shadow-lg shadow-red-950/40">
          <Flame className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="text-sm font-black text-white tracking-wide uppercase font-mono-data">
              Staff <span className="text-red-500">MDT Hub</span>
            </span>
            <div className="text-[11px] text-cyan-400 font-mono-data truncate">
              {profile.vehiclePlate}
            </div>
          </div>
        )}
      </div>

      {/* Navigation menu items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1.5">
        {!collapsed && (
          <div className="px-2.5 mb-2 text-[10px] font-mono-data uppercase tracking-widest text-slate-500 font-bold">
            CHỨC NĂNG TÁC CHIẾN
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600/25 to-blue-600/15 border border-cyan-500/50 text-white shadow-lg shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  isActive ? 'bg-cyan-500 text-white' : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-white truncate">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className={`text-[10px] font-mono-data px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0 leading-none ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.sublabel}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini Profile Summary in Footer */}
      {!collapsed && (
        <div className="p-3 mx-2 mb-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 font-bold flex items-center justify-center font-mono-data text-xs">
              AN
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white truncate text-[11px]">{profile.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{profile.role}</div>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        className="flex items-center gap-2 h-11 shrink-0 border-t border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors justify-center"
      >
        {collapsed ? (
          <ChevronsRight className="w-4 h-4" />
        ) : (
          <>
            <ChevronsLeft className="w-4 h-4" />
            <span className="text-xs font-mono-data">Thu Gọn Sidebar</span>
          </>
        )}
      </button>
    </aside>
  );
};
