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
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { StaffProfile } from '../../types/staff';
import { useAuth } from '../../hooks/useAuth';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const displayName = user?.fullName || profile.name || 'Cán bộ tác chiến';
  const displayRole = user?.role || profile.role || 'Chỉ huy kíp xe';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'AN';

  return (
    <aside
      className={`flex flex-col h-full shrink-0 bg-white border-r border-slate-200 transition-all duration-300 select-none z-20 ${
        collapsed ? 'w-[72px]' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center h-16 shrink-0 border-b border-slate-200 px-4 gap-3 overflow-hidden">
        <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shrink-0 shadow-sm text-white">
          <Flame className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="text-sm font-extrabold text-slate-900 tracking-wide uppercase font-mono">
              Staff <span className="text-red-600">MDT Hub</span>
            </span>
            <div className="text-[11px] text-red-600 font-mono font-bold truncate">
              {profile.vehiclePlate}
            </div>
          </div>
        )}
      </div>

      {/* Navigation menu items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1.5">
        {!collapsed && (
          <div className="px-2.5 mb-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
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
              className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-red-50/80 border border-red-500 text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  isActive ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs truncate">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0 leading-none ${
                        item.id === 'mission' ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
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

      {/* Mini Profile Summary in Footer with Logout Button */}
      {!collapsed ? (
        <div className="p-2.5 mx-2 mb-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white font-bold flex items-center justify-center font-mono text-xs shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900 truncate text-[11px]">{displayName}</div>
              <div className="text-[10px] text-slate-500 truncate">{displayRole}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất khỏi hệ thống"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="mx-2 mb-2 flex justify-center">
          <button
            onClick={handleLogout}
            title="Đăng xuất khỏi hệ thống"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        className="flex items-center gap-2 h-11 shrink-0 border-t border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors justify-center cursor-pointer"
      >
        {collapsed ? (
          <ChevronsRight className="w-4 h-4" />
        ) : (
          <>
            <ChevronsLeft className="w-4 h-4" />
            <span className="text-xs font-mono">Thu Gọn Sidebar</span>
          </>
        )}
      </button>
    </aside>
  );
};
