import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Navigation,
  Flame,
  FileCheck2,
  Clock,
  ArrowRight,
  ListOrdered,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { MissionStatus, StaffMission } from '../../types/staff';
import { staffAudioService } from '../../services/staffAudioService';

interface StaffStatusStepperProps {
  mission: StaffMission;
  onStatusChange: (nextStatus: MissionStatus) => void;
  onOpenReportModal: () => void;
}

const STEPS: {
  key: MissionStatus;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  activeColor: string;
  badgeBg: string;
}[] = [
  {
    key: 'accepted',
    label: 'Accepted',
    sublabel: 'Đã tiếp nhận',
    icon: CheckCircle2,
    activeColor: 'from-blue-600 to-cyan-600',
    badgeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
  {
    key: 'en_route',
    label: 'En route',
    sublabel: 'Đang di chuyển',
    icon: Navigation,
    activeColor: 'from-amber-500 to-yellow-600',
    badgeBg: 'bg-amber-500/20 text-yellow-400 border-amber-500/40',
  },
  {
    key: 'on_scene',
    label: 'On scene',
    sublabel: 'Tại hiện trường',
    icon: Flame,
    activeColor: 'from-red-600 to-orange-600',
    badgeBg: 'bg-red-500/20 text-red-400 border-red-500/40',
  },
  {
    key: 'completed',
    label: 'Completed',
    sublabel: 'Hoàn tất xử lý',
    icon: FileCheck2,
    activeColor: 'from-emerald-600 to-green-600',
    badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
];

export const StaffStatusStepper: React.FC<StaffStatusStepperProps> = ({
  mission,
  onStatusChange,
  onOpenReportModal,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showTimeline, setShowTimeline] = useState<boolean>(false);

  const currentIndex = STEPS.findIndex((s) => s.key === mission.status);

  // Live stopwatch timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number): string => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNextStep = () => {
    if (mission.status === 'accepted') {
      staffAudioService.playSuccessChime();
      onStatusChange('en_route');
    } else if (mission.status === 'en_route') {
      staffAudioService.playSuccessChime();
      onStatusChange('on_scene');
    } else if (mission.status === 'on_scene') {
      // Prompt report modal
      onOpenReportModal();
    } else if (mission.status === 'completed') {
      onOpenReportModal();
    }
  };

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3 shrink-0">
      {/* Top Header: Mission ID & Stopwatch */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-data uppercase tracking-wider text-slate-400">
            Trạng Thái:
          </span>
          <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono-data border ${STEPS[currentIndex]?.badgeBg}`}>
            {STEPS[currentIndex]?.label.toUpperCase()} ({STEPS[currentIndex]?.sublabel})
          </span>
        </div>

        {/* Stopwatch timer */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 font-mono-data">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-slate-400">THỜI GIAN:</span>
          <span className="text-xs sm:text-sm font-bold text-cyan-400">{formatTimer(elapsedSeconds)}</span>
        </div>
      </div>

      {/* 4-Step Visual Progress Bar */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 relative">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={step.key}
              onClick={() => {
                if (idx <= currentIndex + 1 && idx !== currentIndex) {
                  if (step.key === 'completed') {
                    onOpenReportModal();
                  } else {
                    onStatusChange(step.key);
                  }
                }
              }}
              className={`relative flex flex-col items-center text-center p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer select-none ${
                isCurrent
                  ? `bg-gradient-to-b from-slate-800/90 to-slate-900 border-cyan-500/80 shadow-md shadow-cyan-950/40`
                  : isDone
                  ? 'bg-slate-900/60 border-slate-700 text-slate-300'
                  : 'bg-slate-900/30 border-slate-800/60 text-slate-500 opacity-60'
              }`}
            >
              {/* Step indicator circle */}
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mb-1 transition-all ${
                  isCurrent
                    ? `bg-gradient-to-r ${step.activeColor} text-white shadow-sm animate-pulse`
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </div>

              <div className="text-[11px] sm:text-xs font-bold truncate w-full text-white">
                {step.label}
              </div>
              <div className="text-[9px] text-slate-400 truncate w-full hidden sm:block">
                {step.sublabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Touch Action Button (For Vehicle Drivers / In-field MDT) */}
      <div className="pt-0.5">
        {mission.status === 'accepted' && (
          <button
            onClick={handleNextStep}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Navigation className="w-4 h-4 text-slate-950 fill-current" />
            <span>XUẤT PHÁT TỚI HIỆN TRƯỜNG (EN ROUTE)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {mission.status === 'en_route' && (
          <button
            onClick={handleNextStep}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-red-950/60 flex items-center justify-center gap-2 transition-all active:scale-[0.98] animate-pulse"
          >
            <Flame className="w-4 h-4 text-yellow-300" />
            <span>XÁC NHẬN ĐÃ TỚI HIỆN TRƯỜNG (ON SCENE)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {mission.status === 'on_scene' && (
          <button
            onClick={handleNextStep}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <FileCheck2 className="w-4 h-4 text-white" />
            <span>HOÀN TẤT XỬ LÝ & LẬP BÁO CÁO (COMPLETED)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {mission.status === 'completed' && (
          <button
            onClick={onOpenReportModal}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs sm:text-sm rounded-xl border border-emerald-500/40 flex items-center justify-center gap-2 transition-all"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>ĐÃ HOÀN TẤT - XEM BÁO CÁO ĐIỆN TỬ</span>
          </button>
        )}
      </div>

      {/* Timeline Toggle & Collapsible Log */}
      <div>
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors pt-1"
        >
          <div className="flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-slate-400" />
            <span>Nhật Ký Hành Trình Tác Chiến ({mission.timeline.length} mốc)</span>
          </div>
          {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showTimeline && (
          <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs">
            {mission.timeline.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2.5">
                <span className="font-mono-data text-cyan-400 text-[11px] shrink-0 mt-0.5">
                  [{entry.timestamp}]
                </span>
                <span className="text-slate-300">{entry.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
