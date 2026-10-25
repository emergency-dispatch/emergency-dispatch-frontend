import React, { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import '../../services/operatorAdminLanguage';
import { showVietnameseOnly } from '../../i18n';

const PageLoading: React.FC = () => (
  <div className="h-full flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin" />
  </div>
);

/**
 * Layout riêng của Admin (/admin/*). Không bọc DispatchProvider — Admin không dùng Command Center.
 * ≥ 1024px: sidebar cố định, thu gọn được. < 1024px: sidebar thành menu trượt, mở bằng nút trên Topbar.
 */
export const AdminLayout: React.FC = () => {
  // Admin chưa song ngữ — các component dùng chung với Operator (admin/common) hiển thị tiếng Việt.
  useLayoutEffect(showVietnameseOnly, []);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  return (
    <div className="h-screen w-screen flex bg-white text-slate-900 overflow-hidden">
      <div className="hidden lg:flex h-full">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      </div>

      {menuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 bg-black/50 z-[1350]" onClick={() => setMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-[1351] max-w-[85vw] shadow-2xl shadow-slate-900/20">
            <AdminSidebar collapsed={false} onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-slate-50/60">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
