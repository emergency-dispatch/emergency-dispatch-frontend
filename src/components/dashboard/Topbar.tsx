import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, MapPin, Settings, ShieldAlert, User } from 'lucide-react';
import { mockNotifications } from '../../data/dashboardMock';
import { useAuth } from '../../hooks/useAuth';
import { UserProfileModal } from '../profile/UserProfileModal';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Escalation Logic Engine: Level 4-5 incidents unclaimed past 5 minutes trigger the blinking alert.
  const criticalUnclaimed = mockNotifications.filter(
    (n) => !n.acknowledged && n.severity >= 4 && n.unclaimedMinutes > 5
  );
  const unreadCount = mockNotifications.filter((n) => !n.acknowledged).length;
  const hasCriticalAlert = criticalUnclaimed.length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.fullName || 'Điều phối viên';
  const displayRole = user?.role || 'Operator';
  const displayStation = user?.stationName || 'Trung tâm Điều phối Cứu nạn ResQ';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'CAD';

  return (
    <header className="relative z-[1300] h-16 shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs flex items-center justify-between px-5">
      {/* Left: Logo + Station on duty */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-black text-slate-900 tracking-wide hidden xl:inline whitespace-nowrap">
            ResQ<span className="text-red-600">-AI</span>
          </span>
        </Link>

        <div className="h-6 w-px bg-slate-200 shrink-0" />

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs font-semibold text-slate-900 truncate">{displayStation}</span>
            <span className="text-[10px] font-mono-data text-slate-500 truncate">Vùng phản ứng trọng điểm</span>
          </div>
          <span className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-mono-data text-emerald-600 font-semibold whitespace-nowrap">TRỰC CA</span>
          </span>
        </div>
      </div>

      {/* Right: Notification bell + Avatar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
            className={`relative p-2.5 rounded-lg border transition-colors ${
              hasCriticalAlert
                ? 'bg-red-50 border-red-300 text-red-600 animate-flash-critical'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl cad-glass overflow-hidden z-[1200]">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-mono-data uppercase tracking-wider text-slate-600 font-bold">
                  Cảnh báo leo thang
                </span>
                {hasCriticalAlert && (
                  <span className="text-[10px] font-mono-data text-red-600 font-bold whitespace-nowrap">
                    {criticalUnclaimed.length} CHƯA TIẾP NHẬN &gt;5PH
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {mockNotifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                      {!n.acknowledged && n.severity >= 4 && n.unclaimedMinutes > 5 && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{n.description}</p>
                    <span className="text-[10px] font-mono-data text-slate-400 mt-1 block">
                      {n.unclaimedMinutes > 0 ? `Chưa nhận ${n.unclaimedMinutes} phút` : 'Đã tiếp nhận'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="hidden lg:flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-slate-900">{displayName}</span>
              <span className="text-[10px] font-mono-data text-slate-500">{displayRole}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl cad-glass overflow-hidden z-[1200]">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                <p className="text-[10px] font-mono-data text-red-600 font-semibold uppercase">{displayRole}</p>
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
                  <span>Hồ sơ cá nhân &amp; Y tế</span>
                </button>
                <button
                  onClick={() => {
                    setUserOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đổi mật khẩu &amp; Cài đặt</span>
                </button>
              </div>
              <div className="py-1.5 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
};
