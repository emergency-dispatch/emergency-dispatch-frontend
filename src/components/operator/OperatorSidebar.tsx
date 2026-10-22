import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, ShieldAlert } from 'lucide-react';
import { dashboardNavGroups } from '../../data/dashboardMock';
import { useDispatchStore } from '../../context/DispatchContext';

const QUEUE_PATH = '/dashboard/command-center/incidents';

interface OperatorSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const OperatorSidebar: React.FC<OperatorSidebarProps> = ({ collapsed, onToggle }) => {
  // Số ca chờ thẩm định — luôn thấy ở sidebar dù Operator đang ở màn khác.
  const { incidents } = useDispatchStore();
  const pendingCount = incidents.filter((i) => i.status === 'pending').length;

  return (
    <aside
      className={`flex flex-col h-full shrink-0 bg-white border-r border-slate-200 transition-all duration-300 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Brand mark */}
      <div className="flex items-center h-16 shrink-0 border-b border-slate-200 px-4 gap-2.5 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shrink-0 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-black text-slate-900 tracking-wide whitespace-nowrap">
            CAD<span className="text-red-600"> Console</span>
          </span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6">
        {dashboardNavGroups.map((group) => (
          <div key={group.id} className="px-3">
            {!collapsed && (
              <div className="px-2.5 mb-2 text-[10px] font-mono-data uppercase tracking-widest text-slate-400 font-bold">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const badge = item.path === QUEUE_PATH && pendingCount > 0 ? pendingCount : 0;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl text-sm font-medium transition-all border ${
                        collapsed ? 'justify-center p-3' : 'px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-red-50/80 border-red-500 text-slate-900 font-bold shadow-xs'
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={`relative p-1.5 rounded-lg transition-colors shrink-0 ${
                            isActive ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {collapsed && badge > 0 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white" />
                          )}
                        </div>
                        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                        {!collapsed && badge > 0 && (
                          <span
                            className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                            title={`${badge} sự cố chờ thẩm định`}
                          >
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="flex items-center gap-2 h-12 shrink-0 border-t border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors justify-center"
      >
        {collapsed ? (
          <ChevronsRight className="w-4 h-4" />
        ) : (
          <>
            <ChevronsLeft className="w-4 h-4" />
            <span className="text-xs font-mono-data">Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
};
