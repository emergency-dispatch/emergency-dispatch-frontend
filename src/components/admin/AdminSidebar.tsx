import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, ShieldCheck, X } from 'lucide-react';
import { adminNavGroups } from './adminNav';

interface AdminSidebarProps {
  collapsed: boolean;
  /** Desktop: thu gọn/mở rộng. Không truyền thì ẩn nút thu gọn. */
  onToggle?: () => void;
  /** Mobile drawer: đóng menu (nút X và sau khi chọn trang). */
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onToggle, onClose }) => {
  return (
    <aside
      className={`flex flex-col h-full shrink-0 bg-white border-r border-slate-200 transition-all duration-300 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Brand mark */}
      <div className="flex items-center h-16 shrink-0 border-b border-slate-200 px-4 gap-2.5 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="flex-1 text-sm font-black text-slate-900 tracking-wide whitespace-nowrap">
            ResQ<span className="text-red-600"> Admin</span>
          </span>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Đóng menu"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5">
        {adminNavGroups.map((group) => (
          <div key={group.id} className="px-3">
            {!collapsed && group.label && (
              <div className="px-2.5 mb-2 text-[10px] font-mono-data uppercase tracking-widest text-slate-400 font-bold">
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
                    onClick={onClose}
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
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            isActive ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {onToggle && (
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="flex items-center gap-2 h-12 shrink-0 border-t border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors justify-center"
        >
          {collapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronsLeft className="w-4 h-4" />
              <span className="text-xs font-mono-data">Thu gọn</span>
            </>
          )}
        </button>
      )}
    </aside>
  );
};
