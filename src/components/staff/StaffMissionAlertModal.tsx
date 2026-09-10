import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border-2 border-red-600 rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
        {/* Flashing Top Siren Header */}
        <div className="relative bg-red-600 px-4 sm:px-6 py-3.5 flex items-center justify-between overflow-hidden shadow-md text-white">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl animate-bounce">
              <Siren className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono-data font-black tracking-widest text-red-100">
                  LỆNH ĐIỀU ĐỘNG KHẨN CẤP
                </span>
                <span className="px-2 py-0.5 rounded bg-black/20 text-[11px] font-mono-data font-bold text-white">
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
              className="p-2 rounded-lg bg-black/20 hover:bg-black/30 text-white transition-all"
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-white/70" /> : <Volume2 className="w-5 h-5 text-white animate-pulse" />}
            </button>
            <div className="px-3 py-1 bg-black/25 rounded-lg text-center font-mono-data">
              <div className="text-[10px] text-red-100 uppercase font-bold">Tự nhận sau</div>
              <div className="text-base font-black text-white">{timeLeft}s</div>
            </div>
          </div>
        </div>

        {/* Progress bar countdown */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div
            className="h-full bg-red-600 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-white">
          {/* Incident Title & Severity */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-mono-data font-bold flex items-center gap-1.5 border ${severityMeta.badgeClass}`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                MỨC ĐỘ NGUY HIỂM: CẤP {mission.severity} ({severityMeta.label})
              </span>
              <span className="text-xs text-slate-500 font-mono-data">
                Sự cố #{mission.incidentId}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900">{mission.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{mission.description}</p>

            {/* Hazard Tags */}
            <div className="pt-2 flex flex-wrap gap-1.5">
              {mission.hazardTags.map((tag) => (
                <HazardTagBadge key={tag} tag={tag} size="sm" />
              ))}
            </div>
          </div>

          {/* Location & Navigation Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold uppercase font-mono-data">Địa Điểm Sự Cố</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 pl-5">{mission.address}</div>
              <div className="text-xs text-slate-500 pl-5">Khu vực: <span className="text-red-600 font-medium">{mission.area}</span></div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold uppercase font-mono-data">Lộ Trình Ước Tính</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 pl-5 flex items-center gap-3">
                <span className="text-red-600 font-mono-data font-bold text-base">~1.4 km</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-800 font-mono-data font-bold text-base">~4 - 6 Phút</span>
              </div>
              <div className="text-xs text-slate-500 pl-5">Tuyến đường tối ưu nhất đã được định tuyến</div>
            </div>
          </div>

          {/* Reporter info & CAD notes */}
          <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-600" />
              <span className="text-slate-600">Người báo: <strong className="text-slate-900">{mission.callerName}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-red-600" />
              <a href={`tel:${mission.callerPhone}`} className="text-red-600 font-mono-data font-bold hover:underline">
                {mission.callerPhone}
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleDecline}
            className="w-full sm:w-1/3 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <XCircle className="w-4 h-4 text-slate-500" />
            Từ Chối / Báo Kẹt
          </button>

          <button
            onClick={handleAccept}
            className="w-full sm:w-2/3 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base font-bold shadow-md shadow-red-600/20 border border-red-600 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5 text-white animate-pulse" />
            Tiếp Nhận Nhiệm Vụ Ngay
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
