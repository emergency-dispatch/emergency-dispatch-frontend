import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserProfileModal } from '../profile/UserProfileModal';
import { findAdminNavItem } from './adminNav';

interface AdminTopbarProps {
  onOpenMenu: () => void;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({ onOpenMenu }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [userOpen, setUserOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  const pageTitle = findAdminNavItem(location.pathname)?.label ?? 'Quản trị hệ thống';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.fullName || 'Quản trị viên';
  const initials =
    displayName
      .split(' ')
      .map((w) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase() || 'AD';

  return (
    <header className="relative z-[1300] h-16 shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs flex items-center justify-between gap-3 px-4 sm:px-5">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMenu}
          aria-label="Mở menu"
          className="lg:hidden p-2 -ml-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[10px] font-mono-data uppercase tracking-widest text-slate-400 font-bold">
            Quản trị hệ thống
          </span>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">{pageTitle}</h1>
        </div>
      </div>

      <div className="relative shrink-0" ref={userRef}>
        <button
          onClick={() => setUserOpen((v) => !v)}
          className="flex items-center gap-2.5 p-1 pr-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover shadow-xs border border-slate-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
              {initials}
            </div>
          )}
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-xs font-semibold text-slate-900">{displayName}</span>
            <span className="text-[10px] font-mono-data text-slate-500">Admin</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
        </button>

        {userOpen && (
          <div className="absolute right-0 mt-2 w-60 rounded-xl cad-glass overflow-hidden z-[1200]">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
              <p className="text-[10px] font-mono-data text-red-600 font-semibold uppercase">Admin</p>
              <p className="text-[10px] font-mono-data text-slate-400 truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="py-1.5">
              <button
                onClick={() => {
                  setUserOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Hồ sơ cá nhân &amp; Đổi mật khẩu</span>
              </button>
            </div>
            <div className="py-1.5 border-t border-slate-100">
              <button
                onClick={() => logout('/login')}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <UserProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </header>
  );
};
