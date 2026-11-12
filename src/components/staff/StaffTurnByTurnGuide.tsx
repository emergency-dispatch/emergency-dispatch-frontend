import React from 'react';
import {
  CornerUpLeft,
  CornerUpRight,
  MoveUp,
  RotateCcw,
  Compass,
  Gauge,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Route,
} from 'lucide-react';
import type { TurnByTurnStep } from '../../types/staff';

interface StaffTurnByTurnGuideProps {
  steps: TurnByTurnStep[];
  currentStepIndex: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  isEnRoute: boolean;
  variant?: 'full' | 'compact-overlay';
}

const getManeuverIcon = (maneuver: TurnByTurnStep['maneuver'], iconClass?: string) => {
  const cls = iconClass || 'w-8 h-8 text-red-600 stroke-[2.5]';
  switch (maneuver) {
    case 'turn_left':
      return <CornerUpLeft className={cls} />;
    case 'turn_right':
      return <CornerUpRight className={cls} />;
    case 'slight_left':
      return <CornerUpLeft className={`${cls} -rotate-45`} />;
    case 'slight_right':
      return <CornerUpRight className={`${cls} rotate-45`} />;
    case 'roundabout':
      return <RotateCcw className={cls} />;
    case 'u_turn':
      return <RotateCcw className={cls} />;
    case 'arrive':
      return <MapPin className={`${cls} animate-bounce`} />;
    case 'straight':
    default:
      return <MoveUp className={cls} />;
  }
};

export const StaffTurnByTurnGuide: React.FC<StaffTurnByTurnGuideProps> = ({
  steps,
  currentStepIndex,
  onNextStep,
  onPrevStep,
  isEnRoute,
  variant = 'full',
}) => {
  if (!steps || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex] || steps[0];
  const nextStep = steps[currentStepIndex + 1];

  // Calculate remaining totals
  const remainingSteps = steps.slice(currentStepIndex);
  const remainingMeters = remainingSteps.reduce((acc, step) => acc + step.distanceMeters, 0);
  const remainingSeconds = remainingSteps.reduce((acc, step) => acc + step.durationSeconds, 0);

  const remainingKm = (remainingMeters / 1000).toFixed(1);
  const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));

  // Compact floating HUD overlay (designed for Mobile full-screen map navigation)
  if (variant === 'compact-overlay') {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 sm:p-3 text-white shadow-2xl flex items-center gap-2.5 sm:gap-3">
        {/* Maneuver Icon */}
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
          {getManeuverIcon(currentStep.maneuver, 'w-6 h-6 text-red-500 stroke-[2.5]')}
        </div>

        {/* Direction Text & Road name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-base sm:text-lg font-extrabold text-red-400 font-mono leading-none">
              {currentStep.distanceMeters < 1000
                ? `${currentStep.distanceMeters}m`
                : `${(currentStep.distanceMeters / 1000).toFixed(1)} km`}
            </span>
            <span className="text-xs font-bold text-slate-100 truncate leading-none">
              {currentStep.instruction}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate mt-1">
            <span className="text-slate-300 font-semibold">{currentStep.roadName}</span>
            {nextStep && <span className="text-slate-500"> • Kế tiếp: {nextStep.instruction}</span>}
          </div>
        </div>

        {/* Step Prev/Next */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <button
            type="button"
            onClick={onPrevStep}
            disabled={currentStepIndex === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            title="Chặng trước"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-bold text-slate-400 px-1">
            {currentStepIndex + 1}/{steps.length}
          </span>
          <button
            type="button"
            onClick={onNextStep}
            disabled={currentStepIndex >= steps.length - 1}
            className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            title="Chặng kế tiếp"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden shrink-0 text-slate-900">
      <div className="flex flex-col gap-3.5 relative z-10">
        {/* Top Header: Title & Step counter */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 shrink-0 flex items-center justify-center">
              <Route className="w-4 h-4" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 leading-tight truncate">
                Dẫn Đường Tác Chiến (HUD)
              </h4>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Chặng {currentStepIndex + 1} / {steps.length}
              </p>
            </div>
          </div>

          {/* Navigation Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono shrink-0 ml-auto">
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 shrink-0" />
            <span className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-none">ĐIỀU HƯỚNG:</span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 leading-none">
              {isEnRoute ? 'Đang dẫn đường' : 'Sẵn sàng'}
            </span>
          </div>
        </div>

        {/* Main Instruction Display */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
          {/* Big Maneuver Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
            {getManeuverIcon(currentStep.maneuver)}
          </div>

          {/* Direction Text & Next Distance */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-red-600 font-mono">
                {currentStep.distanceMeters < 1000
                  ? `${currentStep.distanceMeters}m`
                  : `${(currentStep.distanceMeters / 1000).toFixed(1)} km`}
              </span>
              <span className="text-xs text-slate-500 font-mono uppercase">Sau đó</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 leading-tight mt-0.5 truncate">
              {currentStep.instruction}
            </div>
            <div className="text-xs text-slate-500 font-mono truncate mt-0.5">
              Tuyến: <span className="text-slate-800 font-semibold">{currentStep.roadName}</span>
            </div>
          </div>
        </div>

        {/* Next Upcoming Step Preview (if any) */}
        {nextStep && (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/70 rounded-lg border border-slate-200 text-xs text-slate-600">
            <Compass className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-500">Tiếp theo:</span>
            <span className="font-semibold text-slate-800 truncate">{nextStep.instruction}</span>
          </div>
        )}

        {/* Bottom Metrics & Step Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Remaining Distance & ETA */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-mono">
              <MapPin className="w-4 h-4 text-red-600" />
              <span className="text-xs text-slate-500">CÒN LẠI:</span>
              <span className="text-sm font-bold text-red-600">{remainingKm} km</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500">DỰ KIẾN:</span>
              <span className="text-sm font-bold text-slate-900">{remainingMinutes} phút</span>
            </div>
          </div>

          {/* Step Back & Forward Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevStep}
              disabled={currentStepIndex === 0}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
              title="Chặng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-500">
              {currentStepIndex + 1}/{steps.length}
            </span>
            <button
              onClick={onNextStep}
              disabled={currentStepIndex >= steps.length - 1}
              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
              title="Chặng kế tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
