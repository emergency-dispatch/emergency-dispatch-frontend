import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { adminNavGroups } from './adminNav';
import { useTranslation } from '../../i18n';

interface AdminSidebarProps {
  collapsed: boolean;
  /** Desktop: thu gọn/mở rộng. Không truyền thì ẩn nút thu gọn. */
  onToggle?: () => void;
  /** Mobile drawer: đóng menu (nút X và sau khi chọn trang). */
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onToggle, onClose }) => {
  const { t } = useTranslation();
  return (
    <aside
      className={`flex flex-col h-full shrink-0 bg-white border-r border-slate-200 transition-all duration-300 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Brand mark */}
      <div className="flex items-center h-16 shrink-0 border-b border-slate-200 px-3.5 gap-2 overflow-hidden">
        <Link to="/" title="Về trang chủ" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-85 transition-opacity">
          {collapsed ? (
            <img src="/favicon.png?v=2" alt="ResQ-AI" className="w-8 h-8 object-contain shrink-0 mx-auto" />
          ) : (
            <>
              <img src="/brand-logo.png" alt="ResQ-AI" className="h-8 w-auto object-contain shrink-0" />
              <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap">
                Admin
              </span>
            </>
          )}
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={t('admin.layout.closeMenu')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5">
        {adminNavGroups.map((group, index) => (
          <div key={group.key ?? index} className="px-3">
            {!collapsed && group.key && (
              <div className="px-2.5 mb-2 text-[10px] font-mono-data uppercase tracking-widest text-slate-400 font-bold">
                {t(`admin.layout.groups.${group.key}`)}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const label = t(`admin.layout.nav.${item.key}`);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
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
                        {!collapsed && <span className="truncate">{label}</span>}
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
          aria-label={collapsed ? t('admin.layout.expandSidebar') : t('admin.layout.collapseSidebar')}
          className="flex items-center gap-2 h-12 shrink-0 border-t border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors justify-center"
        >
          {collapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronsLeft className="w-4 h-4" />
              <span className="text-xs font-mono-data">{t('admin.layout.collapse')}</span>
            </>
          )}
        </button>
      )}
    </aside>
  );
};
