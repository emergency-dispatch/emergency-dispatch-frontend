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
    <header className="h-16 bg-[#0B0F19] border-b border-slate-800 px-3 md:px-6 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Brand & Vehicle Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-950/40 border border-red-500/30">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white tracking-wide uppercase font-mono-data">
                Staff <span className="text-red-500">MDT</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-data font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[160px] sm:max-w-none">
              {profile.stationName}
            </p>
          </div>
        </div>

        {/* Vehicle Plate Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900/90 border border-slate-700/80 rounded-lg">
          {VEHICLE_ICONS[profile.vehicleType] || <Car className="w-4 h-4 text-blue-400" />}
          <div>
            <div className="text-[10px] text-slate-400 font-mono-data uppercase leading-none">Phương Tiện</div>
            <div className="text-xs font-bold text-white font-mono-data leading-tight">{profile.vehiclePlate}</div>
          </div>
        </div>
      </div>

      {/* Center: Live Clock & GPS telemetry */}
      <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-slate-900/60 border border-slate-800 rounded-xl">
        {/* Clock */}
        <div className="text-center font-mono-data">
          <span className="text-xs text-slate-400 mr-1.5">GIỜ CA TRỰC</span>
          <span className="text-sm font-bold text-cyan-400 tracking-wider">{currentTime}</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-800" />

        {/* GPS & Battery */}
        <div className="flex items-center gap-3 text-xs text-slate-300 font-mono-data">
          <div className="flex items-center gap-1" title="Tín hiệu GPS vệ tinh">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-medium">GPS 4G</span>
          </div>
          <div className="flex items-center gap-1" title="Mức pin thiết bị">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
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
          className={`p-2 rounded-lg border transition-all ${
            isMuted
              ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              : 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
        </button>

        {/* Simulate New Mission (Demo trigger) */}
        <button
          onClick={onSimulateNewMission}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-red-900/30 border border-red-400/40 transition-all active:scale-95"
          title="Tạo giả lập nhận nhiệm vụ điều phối mới kèm còi hú cảnh báo"
        >
          <BellRing className="w-3.5 h-3.5 animate-bounce" />
          <span className="hidden sm:inline">Giả Lập Báo Động</span>
        </button>

        {/* Mission History */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all"
        >
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Nhật Ký</span>
        </button>

        {/* Link to CAD Dashboard Console */}
        <Link
          to="/dashboard/command-center/live-map"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-medium transition-all"
          title="Chuyển sang màn hình điều phối CAD Dispatcher"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Tổng Đài CAD</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5 opacity-70" />
        </Link>
      </div>
    </header>
  );
};
