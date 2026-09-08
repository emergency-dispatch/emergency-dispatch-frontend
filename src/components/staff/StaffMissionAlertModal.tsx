import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Siren,
  MapPin,
  Clock,
  Phone,
  User,
  ShieldAlert,
  Flame,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { StaffMission } from '../../types/staff';
import { SEVERITY_META } from '../../data/incidentMock';
import { HazardTagBadge } from '../dashboard/incidents/HazardTagBadge';
import { staffAudioService } from '../../services/staffAudioService';

interface StaffMissionAlertModalProps {
  mission: StaffMission;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: (reason: string) => void;
}

const COUNTDOWN_SECONDS = 30;

export const StaffMissionAlertModal: React.FC<StaffMissionAlertModalProps> = ({
  mission,
  isOpen,
  onAccept,
  onDecline,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(COUNTDOWN_SECONDS);
  const [isMuted, setIsMuted] = useState<boolean>(staffAudioService.getIsMuted());

  useEffect(() => {
    if (!isOpen) {
      staffAudioService.stopEmergencySiren();
      return;
    }

    setTimeLeft(COUNTDOWN_SECONDS);
    staffAudioService.playEmergencySiren();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto accept when countdown hits 0
          clearInterval(timer);
          onAccept();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      staffAudioService.stopEmergencySiren();
    };
  }, [isOpen, mission.id]);

  if (!isOpen) return null;

  const severityMeta = SEVERITY_META[mission.severity];
  const progressPercent = (timeLeft / COUNTDOWN_SECONDS) * 100;

  const toggleSound = () => {
    const nextState = !isMuted;
    staffAudioService.setMuted(nextState);
    setIsMuted(nextState);
  };

  const handleAccept = () => {
    staffAudioService.stopEmergencySiren();
    staffAudioService.playSuccessChime();
    onAccept();
  };

  const handleDecline = () => {
    staffAudioService.stopEmergencySiren();
    onDecline('Xe đang bận hỗ trợ hoặc gặp sự cố kỹ thuật');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0F172A] border-2 border-red-500 rounded-2xl shadow-2xl shadow-red-900/60 overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Flashing Top Siren Header */}
        <div className="relative bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-4 sm:px-6 py-3.5 flex items-center justify-between overflow-hidden shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent animate-pulse pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl animate-bounce">
              <Siren className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono-data font-black tracking-widest text-red-100">
                  LỆNH ĐIỀU ĐỘNG KHẨN CẤP
                </span>
                <span className="px-2 py-0.5 rounded bg-black/30 text-[11px] font-mono-data font-bold text-amber-300">
                  MÃ {mission.id}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                Phân Công Nhiệm Vụ Mới
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-black/30 hover:bg-black/50 text-white transition-all"
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-slate-300" /> : <Volume2 className="w-5 h-5 text-amber-300 animate-pulse" />}
            </button>
            <div className="px-3 py-1 bg-black/40 rounded-lg text-center font-mono-data">
              <div className="text-[10px] text-red-200 uppercase font-bold">Tự nhận sau</div>
              <div className="text-base font-black text-yellow-300">{timeLeft}s</div>
            </div>
          </div>
        </div>

        {/* Progress bar countdown */}
        <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Incident Title & Severity */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-mono-data font-bold flex items-center gap-1.5 border ${severityMeta.badgeClass}`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                MỨC ĐỘ NGUY HIỂM: CẤP {mission.severity} ({severityMeta.label})
              </span>
              <span className="text-xs text-slate-400 font-mono-data">
                Sự cố #{mission.incidentId}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white">{mission.title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{mission.description}</p>

            {/* Hazard Tags */}
            <div className="pt-2 flex flex-wrap gap-1.5">
              {mission.hazardTags.map((tag) => (
                <HazardTagBadge key={tag} tag={tag} size="sm" />
              ))}
            </div>
          </div>

          {/* Location & Navigation Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-semibold uppercase font-mono-data">Địa Điểm Sự Cố</span>
              </div>
              <div className="text-sm font-semibold text-white pl-5">{mission.address}</div>
              <div className="text-xs text-slate-400 pl-5">Khu vực: <span className="text-cyan-400 font-medium">{mission.area}</span></div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
                <span className="font-semibold uppercase font-mono-data">Lộ Trình Ước Tính</span>
              </div>
              <div className="text-sm font-semibold text-white pl-5 flex items-center gap-3">
                <span className="text-yellow-300 font-mono-data text-base">~1.4 km</span>
                <span className="text-slate-400">|</span>
                <span className="text-emerald-400 font-mono-data text-base">~4 - 6 Phút</span>
              </div>
              <div className="text-xs text-slate-400 pl-5">Tuyến đường tối ưu nhất đã được định tuyến</div>
            </div>
          </div>

          {/* Reporter info & CAD notes */}
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">Người báo: <strong className="text-white">{mission.callerName}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <a href={`tel:${mission.callerPhone}`} className="text-emerald-400 font-mono-data font-bold hover:underline">
                {mission.callerPhone}
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleDecline}
            className="w-full sm:w-1/3 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <XCircle className="w-4 h-4 text-red-400" />
            Từ Chối / Báo Kẹt
          </button>

          <button
            onClick={handleAccept}
            className="w-full sm:w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-500 text-white text-sm sm:text-base font-bold shadow-lg shadow-emerald-950/60 border border-emerald-400/40 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5 text-white animate-pulse" />
            Tiếp Nhận Nhiệm Vụ Ngay
          </button>
        </div>
      </div>
    </div>
  );
};
