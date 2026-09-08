import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, ShieldAlert } from 'lucide-react';
import { dashboardNavGroups } from '../../data/dashboardMock';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside
      className={`flex flex-col h-full shrink-0 bg-[#0B0F19] border-r border-slate-800 transition-all duration-300 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Brand mark */}
      <div className="flex items-center h-16 shrink-0 border-b border-slate-800 px-4 gap-2.5 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center shrink-0 border border-slate-700">
          <ShieldAlert className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-black text-white tracking-wide whitespace-nowrap">
            CAD<span className="text-red-500"> Console</span>
          </span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6">
        {dashboardNavGroups.map((group) => (
          <div key={group.id} className="px-3">
            {!collapsed && (
              <div className="px-2.5 mb-2 text-[10px] font-mono-data uppercase tracking-widest text-slate-500 font-bold">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors border-l-2 ${
                        collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2.5'
                      } ${
                        isActive
                          ? 'bg-blue-600/15 border-blue-500 text-white'
                          : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
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
        className="flex items-center gap-2 h-12 shrink-0 border-t border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors justify-center"
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
