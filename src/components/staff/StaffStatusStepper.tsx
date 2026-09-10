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
    activeColor: 'from-red-600 to-red-700',
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    key: 'en_route',
    label: 'En route',
    sublabel: 'Đang di chuyển',
    icon: Navigation,
    activeColor: 'from-amber-500 to-amber-600',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    key: 'on_scene',
    label: 'On scene',
    sublabel: 'Tại hiện trường',
    icon: Flame,
    activeColor: 'from-red-600 to-rose-600',
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    key: 'completed',
    label: 'Completed',
    sublabel: 'Hoàn tất xử lý',
    icon: FileCheck2,
    activeColor: 'from-emerald-600 to-green-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3 shrink-0">
      {/* Top Header: Mission ID & Stopwatch */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
            Trạng Thái:
          </span>
          <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono border bg-red-50 text-red-600 border-red-200">
            {STEPS[currentIndex]?.label.toUpperCase()} ({STEPS[currentIndex]?.sublabel})
          </span>
        </div>

        {/* Stopwatch timer */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
          <Clock className="w-3.5 h-3.5 text-red-600" />
          <span className="text-[11px] text-slate-500 font-medium">THỜI GIAN:</span>
          <span className="text-xs sm:text-sm font-bold text-red-600">{formatTimer(elapsedSeconds)}</span>
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
                  ? 'bg-red-50/70 border-red-500 shadow-xs'
                  : isDone
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-slate-50/40 border-slate-200/60 text-slate-400 opacity-60'
              }`}
            >
              {/* Step indicator circle */}
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mb-1 transition-all ${
                  isCurrent
                    ? 'bg-red-600 text-white shadow-xs'
                    : isDone
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </div>

              <div className="text-[11px] sm:text-xs font-bold truncate w-full text-slate-900">
                {step.label}
              </div>
              <div className="text-[9px] text-slate-500 truncate w-full hidden sm:block">
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
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-white fill-current" />
            <span>XUẤT PHÁT TỚI HIỆN TRƯỜNG (EN ROUTE)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {mission.status === 'en_route' && (
          <button
            onClick={handleNextStep}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Flame className="w-4 h-4 text-white" />
            <span>XÁC NHẬN ĐÃ TỚI HIỆN TRƯỜNG (ON SCENE)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {mission.status === 'on_scene' && (
          <button
            onClick={handleNextStep}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4 text-white" />
            <span>HOÀN TẤT XỬ LÝ &amp; LẬP BÁO CÁO (COMPLETED)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {mission.status === 'completed' && (
          <button
            onClick={onOpenReportModal}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>ĐÃ HOÀN TẤT - XEM BÁO CÁO ĐIỆN TỬ</span>
          </button>
        )}
      </div>

      {/* Timeline Toggle & Collapsible Log */}
      <div>
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="flex items-center justify-between w-full text-xs text-slate-500 hover:text-slate-800 transition-colors pt-1 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-slate-500" />
            <span>Nhật Ký Hành Trình Tác Chiến ({mission.timeline.length} mốc)</span>
          </div>
          {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showTimeline && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            {mission.timeline.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2.5">
                <span className="font-mono text-red-600 font-bold text-[11px] shrink-0 mt-0.5">
                  [{entry.timestamp}]
                </span>
                <span className="text-slate-700">{entry.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
