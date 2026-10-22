import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { dashboardNavGroups } from '../../data/dashboardMock';
import { useDispatchStore } from '../../context/DispatchContext';

const QUEUE_PATH = '/dashboard/command-center/incidents';

/**
 * Sidebar luôn thu gọn (64 px, icon-only) theo phong cách Command Center.
 * Label hiện qua tooltip khi hover.
 */
export const OperatorSidebar: React.FC = () => {
  const { incidents } = useDispatchStore();
  const pendingCount = incidents.filter((i) => i.status === 'pending').length;

  return (
    <aside className="flex flex-col h-full w-16 shrink-0 bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 shrink-0 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-sm">
          <ShieldAlert className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 flex flex-col items-center gap-1">
        {dashboardNavGroups.map((group) =>
          group.items.map((item) => {
            const Icon = item.icon;
            const badge = item.path === QUEUE_PATH && pendingCount > 0 ? pendingCount : 0;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                className={({ isActive }) =>
                  `relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-red-50 border-red-200 text-red-600 shadow-sm'
                      : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator: left border accent */}
                    {isActive && (
                      <span className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r bg-red-600" />
                    )}
                    <Icon className="w-4.5 h-4.5" />
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })
        )}
      </nav>
    </aside>
  );
};
