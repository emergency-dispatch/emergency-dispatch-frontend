import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  BellRing,
  History,
  ChevronRight,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { StaffProfile } from '../../types/staff';
import { staffAudioService } from '../../services/staffAudioService';
import { useAuth } from '../../hooks/useAuth';
import { UserProfileModal } from '../profile/UserProfileModal';

interface StaffNavbarProps {
  profile: StaffProfile;
  hasActiveMission: boolean;
  onOpenHistory: () => void;
  onSimulateNewMission: () => void;
}

export const StaffNavbar: React.FC<StaffNavbarProps> = ({
  profile,
  hasActiveMission,
  onOpenHistory,
  onSimulateNewMission,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isMuted, setIsMuted] = useState<boolean>(staffAudioService.getIsMuted());
  const [userOpen, setUserOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const userRef = useRef<HTMLDivElement>(null);

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSound = () => {
    const nextState = !isMuted;
    staffAudioService.setMuted(nextState);
    setIsMuted(nextState);
    if (!nextState) {
      staffAudioService.playSuccessChime();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Staff logout error:', err);
    }
    navigate('/login');
  };

  const displayName = user?.fullName || profile.name || 'Cán bộ tác chiến';
  const displayRole = user?.role || profile.role || 'Chỉ huy kíp xe';
  const displayEmail = user?.email || profile.email || 'staff@resq.gov.vn';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'AN';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 md:px-6 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Clean Operational Context */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Kíp Trực Tác Chiến</span>
          <span className="text-xs font-mono font-bold text-red-600 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200">
            {profile.vehiclePlate}
          </span>
        </h1>
        {hasActiveMission ? (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            Đang làm nhiệm vụ
          </span>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Sẵn sàng nhận lệnh
          </span>
        )}
      </div>

      {/* Right: Actions, Switchers & User Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sound toggle button */}
        <button
          onClick={toggleSound}
          title={isMuted ? 'Bật âm thanh còi báo' : 'Tắt âm thanh'}
          className={`p-2 rounded-lg border transition-all cursor-pointer ${
            isMuted
              ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
              : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
        </button>

        {/* Simulate New Mission (Demo trigger) */}
        <button
          onClick={onSimulateNewMission}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          title="Tạo giả lập nhận nhiệm vụ điều phối mới kèm còi hú cảnh báo"
        >
          <BellRing className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Giả Lập Báo Động</span>
        </button>

        {/* Mission History */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Nhật Ký</span>
        </button>

        {/* Link to CAD Dashboard Console */}
        <Link
          to="/dashboard"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-red-600 rounded-lg text-xs font-medium transition-all"
          title="Chuyển sang màn hình điều phối CAD Dispatcher"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          <span className="hidden md:inline">Tổng Đài CAD</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5 opacity-70" />
        </Link>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-200 mx-0.5" />

        {/* User Profile & Logout Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            title="Tài khoản người dùng"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white shadow-sm font-mono">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="hidden lg:flex flex-col items-start leading-tight">
              <span className="text-xs font-bold text-slate-900">{displayName}</span>
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]">{displayRole}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50 animate-fadeIn">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] font-semibold text-red-600 truncate mt-0.5">{displayRole}</p>
                <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{displayEmail}</p>
              </div>

              <div className="p-1.5 space-y-0.5 text-xs">
                <button
                  onClick={() => {
                    setUserOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Hồ sơ cá nhân &amp; Y tế</span>
                </button>
                <button
                  onClick={() => {
                    setUserOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Cài đặt tài khoản</span>
                </button>
              </div>

              <div className="p-1.5 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
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
