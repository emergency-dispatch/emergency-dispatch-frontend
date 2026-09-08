import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, MapPin, Settings, ShieldAlert, User } from 'lucide-react';
import { mockDashboardUser, mockNotifications } from '../../data/dashboardMock';

export const Topbar: React.FC = () => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
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

  return (
    <header className="relative z-[1300] h-16 shrink-0 bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-5">
      {/* Left: Logo + Station on duty */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center border border-slate-700">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-black text-white tracking-wide hidden xl:inline whitespace-nowrap">
            ResQ<span className="text-red-500">-AI</span>
          </span>
        </Link>

        <div className="h-6 w-px bg-slate-800 shrink-0" />

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs font-semibold text-white truncate">{mockDashboardUser.station}</span>
            <span className="text-[10px] font-mono-data text-slate-500 truncate">{mockDashboardUser.area}</span>
          </div>
          <span className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-800 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-mono-data text-emerald-400 font-semibold whitespace-nowrap">ON DUTY</span>
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
                ? 'bg-red-950/60 border-red-800 text-red-400 animate-flash-critical'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold border-2 border-[#0F172A]">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl cad-glass border border-slate-700/80 shadow-2xl shadow-black/60 overflow-hidden z-[1200]">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono-data uppercase tracking-wider text-slate-300 font-bold">
                  Escalation Alerts
                </span>
                {hasCriticalAlert && (
                  <span className="text-[10px] font-mono-data text-red-400 font-bold whitespace-nowrap">
                    {criticalUnclaimed.length} UNCLAIMED &gt;5MIN
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                {mockNotifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{n.title}</span>
                      {!n.acknowledged && n.severity >= 4 && n.unclaimedMinutes > 5 && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{n.description}</p>
                    <span className="text-[10px] font-mono-data text-slate-500 mt-1 block">
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
            className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xs font-bold text-white border border-slate-700">
                {mockDashboardUser.avatarInitials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0F172A]" />
            </div>
            <div className="hidden lg:flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-white">{mockDashboardUser.name}</span>
              <span className="text-[10px] font-mono-data text-slate-500">{mockDashboardUser.role}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden lg:block" />
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl cad-glass border border-slate-700/80 shadow-2xl shadow-black/60 overflow-hidden z-[1200]">
              <div className="px-4 py-3 border-b border-slate-800">
                <p className="text-xs font-semibold text-white">{mockDashboardUser.name}</p>
                <p className="text-[10px] font-mono-data text-slate-500">{mockDashboardUser.role}</p>
              </div>
              <div className="py-1.5">
                <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors">
                  <User className="w-3.5 h-3.5" />
                  Hồ sơ cá nhân
                </button>
                <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                  Cài đặt
                </button>
              </div>
              <div className="py-1.5 border-t border-slate-800">
                <Link
                  to="/login"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng xuất
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
