import React from 'react';
import { BellRing, CheckCircle2, Navigation, Truck, X } from 'lucide-react';
import { useTranslation } from '../../i18n';

export interface CitizenRescueAlertPayload {
  id: string;
  kind: 'accepted' | 'duplicate_confirmed' | 'milestone';
  title: string;
  message: string;
  incidentId?: string | null;
  incidentCode?: string | null;
  plateNumber?: string | null;
  stationName?: string | null;
}

interface CitizenRescueAlertModalProps {
  alert: CitizenRescueAlertPayload | null;
  onTrack?: (incidentId: string) => void;
  onDismiss: () => void;
}

let sharedCitizenAudioCtx: AudioContext | null = null;

/** Phát chuông báo nhẹ nhàng nhưng nổi bật qua Web Audio API khi xe cứu hộ nhận lệnh / xác nhận trùng. */
export function playCitizenRescueChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedCitizenAudioCtx) sharedCitizenAudioCtx = new AudioCtx();
    const ctx = sharedCitizenAudioCtx;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const notes = [587.33, 783.99, 987.77]; // D5 -> G5 -> B5 rõ ràng
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.14;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // Browser autoplay policy blocked before interaction
  }
}

export const CitizenRescueAlertModal: React.FC<CitizenRescueAlertModalProps> = ({
  alert,
  onTrack,
  onDismiss,
}) => {
  const { i18n } = useTranslation();
  const isVi = i18n.language !== 'en';
  if (!alert) return null;

  const isDuplicate = alert.kind === 'duplicate_confirmed';
  const cleanMessage = alert.message.replace(/^\s*\[[^\]]+\]\s*/, '');

  return (
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fadeIn"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-900">
        <div
          className={`px-5 py-4 flex items-center justify-between text-white ${
            isDuplicate
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="relative w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 mt-0.5">
              {isDuplicate ? (
                <BellRing className="w-5 h-5 text-white animate-bounce" />
              ) : (
                <Truck className="w-5 h-5 text-white animate-pulse" />
              )}
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-300 animate-ping" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/85 font-bold leading-tight">
                {isDuplicate
                  ? (isVi ? 'THÔNG BÁO SỰ CỐ' : 'INCIDENT NOTICE')
                  : (isVi ? 'THÔNG BÁO ĐIỀU PHỐI KHẨN' : 'EMERGENCY DISPATCH')}
              </p>
              <h3 className="text-sm sm:text-base font-extrabold leading-snug text-white mt-0.5 break-words">
                {alert.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label={isVi ? 'Đóng thông báo' : 'Close notification'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <CheckCircle2
              className={`w-5 h-5 shrink-0 mt-0.5 ${isDuplicate ? 'text-indigo-600' : 'text-emerald-600'}`}
            />
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium text-pretty">
              {cleanMessage}
            </p>
          </div>

          {(alert.plateNumber || alert.stationName) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 divide-y divide-slate-200/80 overflow-hidden text-xs">
              {alert.plateNumber && (
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-blue-50/60">
                  <span className="text-[11px] text-blue-700 uppercase font-mono font-semibold shrink-0">
                    {isVi ? 'Phương tiện' : 'Vehicle'}
                  </span>
                  <span className="font-mono font-bold text-blue-900 bg-white border border-blue-200 px-2 py-0.5 rounded-lg tabular-nums">
                    {alert.plateNumber}
                  </span>
                </div>
              )}
              {alert.stationName && (
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500 uppercase font-mono font-semibold shrink-0">
                    {isVi ? 'Đơn vị ứng cứu' : 'Rescue unit'}
                  </span>
                  <span className="font-semibold text-slate-900 text-right truncate" title={alert.stationName}>
                    {alert.stationName}
                  </span>
                </div>
              )}
            </div>
          )}

          <div
            className={`grid gap-2.5 pt-1 ${
              alert.incidentId && onTrack ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {alert.incidentId && onTrack && (
              <button
                type="button"
                onClick={() => {
                  const targetId = alert.incidentId!;
                  onDismiss();
                  onTrack(targetId);
                }}
                className={`h-11 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.98] ${
                  isDuplicate
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                }`}
              >
                <Navigation className="w-4 h-4 shrink-0" />
                <span>{isVi ? 'Theo dõi sự cố ngay' : 'Track incident now'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              {isVi ? 'Đã hiểu' : 'Got it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
