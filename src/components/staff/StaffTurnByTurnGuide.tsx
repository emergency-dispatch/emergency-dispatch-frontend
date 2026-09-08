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
}

const getManeuverIcon = (maneuver: TurnByTurnStep['maneuver']) => {
  switch (maneuver) {
    case 'turn_left':
      return <CornerUpLeft className="w-8 h-8 text-cyan-400 stroke-[2.5]" />;
    case 'turn_right':
      return <CornerUpRight className="w-8 h-8 text-emerald-400 stroke-[2.5]" />;
    case 'slight_left':
      return <CornerUpLeft className="w-8 h-8 text-cyan-300 stroke-[2] -rotate-45" />;
    case 'slight_right':
      return <CornerUpRight className="w-8 h-8 text-emerald-300 stroke-[2] rotate-45" />;
    case 'roundabout':
      return <RotateCcw className="w-8 h-8 text-amber-400 stroke-[2.5]" />;
    case 'u_turn':
      return <RotateCcw className="w-8 h-8 text-rose-400 stroke-[2.5]" />;
    case 'arrive':
      return <MapPin className="w-8 h-8 text-red-500 stroke-[2.5] animate-bounce" />;
    case 'straight':
    default:
      return <MoveUp className="w-8 h-8 text-blue-400 stroke-[2.5]" />;
  }
};

export const StaffTurnByTurnGuide: React.FC<StaffTurnByTurnGuideProps> = ({
  steps,
  currentStepIndex,
  onNextStep,
  onPrevStep,
  isEnRoute,
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

  return (
    <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-4 shadow-2xl relative overflow-hidden shrink-0">
      {/* Background HUD Grid Glow */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-3.5 relative z-10">
        {/* Top Header: Title & Step counter */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0 flex items-center justify-center">
              <Route className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h4 className="text-xs font-mono-data font-bold uppercase tracking-wider text-cyan-300 leading-tight truncate">
                Turn-By-Turn Navigation HUD
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Chặng {currentStepIndex + 1} / {steps.length}
              </p>
            </div>
          </div>

          {/* Speedometer Simulation */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl font-mono-data shrink-0">
            <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-400 font-semibold leading-none">TỐC ĐỘ:</span>
            <span className="text-sm font-bold text-white leading-none">{isEnRoute ? '46 km/h' : '0 km/h'}</span>
          </div>
        </div>

        {/* Main Instruction Display */}
        <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          {/* Big Maneuver Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950/50">
            {getManeuverIcon(currentStep.maneuver)}
          </div>

          {/* Direction Text & Next Distance */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono-data">
                {currentStep.distanceMeters < 1000
                  ? `${currentStep.distanceMeters}m`
                  : `${(currentStep.distanceMeters / 1000).toFixed(1)} km`}
              </span>
              <span className="text-xs text-slate-400 font-mono-data uppercase">Sau đó</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white leading-tight mt-0.5 truncate">
              {currentStep.instruction}
            </div>
            <div className="text-xs text-slate-400 font-mono-data truncate mt-0.5">
              Tuyến: <span className="text-slate-200">{currentStep.roadName}</span>
            </div>
          </div>
        </div>

        {/* Next Upcoming Step Preview (if any) */}
        {nextStep && (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-800/80 text-xs text-slate-300">
            <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400">Tiếp theo:</span>
            <span className="font-semibold text-white truncate">{nextStep.instruction}</span>
          </div>
        )}

        {/* Bottom Metrics & Step Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
          {/* Remaining Distance & ETA */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-mono-data">
              <MapPin className="w-4 h-4 text-red-400" />
              <span className="text-xs text-slate-400">CÒN LẠI:</span>
              <span className="text-sm font-bold text-red-400">{remainingKm} km</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono-data">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">DỰ KIẾN:</span>
              <span className="text-sm font-bold text-amber-400">{remainingMinutes} phút</span>
            </div>
          </div>

          {/* Step Back & Forward Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevStep}
              disabled={currentStepIndex === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
              title="Chặng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono-data text-slate-400">
              {currentStepIndex + 1}/{steps.length}
            </span>
            <button
              onClick={onNextStep}
              disabled={currentStepIndex >= steps.length - 1}
              className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
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
