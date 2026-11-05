import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, BellRing } from 'lucide-react';

export type StaffToastType = 'success' | 'warning' | 'error' | 'info';

export interface StaffToastMessage {
  id: string;
  type: StaffToastType;
  title: string;
  message: string;
  timestamp?: string;
}

interface StaffToastContainerProps {
  toasts: StaffToastMessage[];
  onDismiss: (id: string) => void;
}

const TOAST_ICONS: Record<StaffToastType, React.FC<{ className?: string }>> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const TOAST_STYLES: Record<
  StaffToastType,
  {
    bg: string;
    border: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  success: {
    bg: 'bg-white',
    border: 'border-emerald-500 shadow-emerald-500/10',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
  },
  warning: {
    bg: 'bg-white',
    border: 'border-red-500 shadow-red-500/15',
    iconColor: 'text-red-600',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
  },
  error: {
    bg: 'bg-white',
    border: 'border-rose-500 shadow-rose-500/15',
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
  },
  info: {
    bg: 'bg-white',
    border: 'border-blue-500 shadow-blue-500/10',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
  },
};

export const StaffToastContainer: React.FC<StaffToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[10001] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.type] || BellRing;
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border-2 ${style.border} ${style.bg} shadow-xl backdrop-blur-md transition-all duration-300 animate-slideInRight`}
          >
            <div className={`p-2 rounded-xl ${style.badgeBg} ${style.iconColor} shrink-0 mt-0.5`}>
              <Icon className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${style.badgeText}`}>
                  {toast.type === 'warning' ? 'CẢNH BÁO KHẨN' : toast.type.toUpperCase()}
                </span>
                {toast.timestamp && (
                  <span className="text-[10px] font-mono text-slate-400">{toast.timestamp}</span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 leading-snug break-words">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

