import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  BatteryCharging,
  Wifi,
  Volume2,
  VolumeX,
  BellRing,
  History,
  Radio,
  ExternalLink,
  ChevronRight,
  Car,
  Flame,
  Ambulance,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StaffProfile } from '../../types/staff';
import { staffAudioService } from '../../services/staffAudioService';

interface StaffNavbarProps {
  profile: StaffProfile;
  hasActiveMission: boolean;
  onOpenHistory: () => void;
  onSimulateNewMission: () => void;
}

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  fire_truck: <Flame className="w-4 h-4 text-orange-400" />,
  ambulance: <Ambulance className="w-4 h-4 text-emerald-400" />,
  police: <ShieldCheck className="w-4 h-4 text-blue-400" />,
  rescue: <Truck className="w-4 h-4 text-yellow-400" />,
};

export const StaffNavbar: React.FC<StaffNavbarProps> = ({
  profile,
  hasActiveMission,
  onOpenHistory,
  onSimulateNewMission,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(staffAudioService.getIsMuted());
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    const nextState = !isMuted;
    staffAudioService.setMuted(nextState);
    setIsMuted(nextState);
    if (!nextState) {
      staffAudioService.playSuccessChime();
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 md:px-6 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Brand & Vehicle Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-sm text-white">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 tracking-wide uppercase font-mono">
                Staff <span className="text-red-600">MDT</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate max-w-[160px] sm:max-w-none">
              {profile.stationName}
            </p>
          </div>
        </div>

        {/* Vehicle Plate Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
          {VEHICLE_ICONS[profile.vehicleType] || <Car className="w-4 h-4 text-red-600" />}
          <div>
            <div className="text-[10px] text-slate-500 font-mono uppercase leading-none">Phương Tiện</div>
            <div className="text-xs font-bold text-slate-900 font-mono leading-tight">{profile.vehiclePlate}</div>
          </div>
        </div>
      </div>

      {/* Center: Live Clock & GPS telemetry */}
      <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
        {/* Clock */}
        <div className="text-center font-mono">
          <span className="text-xs text-slate-500 mr-1.5 font-medium">GIỜ CA TRỰC</span>
          <span className="text-sm font-bold text-red-600 tracking-wider">{currentTime}</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200" />

        {/* GPS & Battery */}
        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-1" title="Tín hiệu GPS vệ tinh">
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] text-emerald-700 font-medium">GPS 4G</span>
          </div>
          <div className="flex items-center gap-1" title="Mức pin thiết bị">
            <BatteryCharging className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-medium">{profile.batteryLevel}%</span>
          </div>
        </div>
      </div>

      {/* Right: Actions & Switchers */}
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
      </div>
    </header>
  );
};
