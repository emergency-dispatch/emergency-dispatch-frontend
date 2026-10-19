import React from 'react';
import { ChevronLeft, ChevronRight, CircleCheck, CircleAlert, X } from 'lucide-react';
import { labelClass } from './styles';

export const FormField: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({
  label,
  required,
  hint,
  children,
}) => (
  <div className="space-y-1.5">
    <label className={labelClass}>
      {label}
      {required && ' *'}
    </label>
    {children}
    {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
  </div>
);

export type NoticeState = { kind: 'success' | 'error'; message: string } | null;

export const Notice: React.FC<{ notice: NoticeState; onClose?: () => void }> = ({ notice, onClose }) => {
  if (!notice) return null;
  const isError = notice.kind === 'error';
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm ${
        isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
      }`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1">{notice.message}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Đóng thông báo" className="shrink-0 opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/** Nút bị khóa vẫn hiện tooltip lý do (title trên button disabled không hiện ở mọi trình duyệt). */
export const LockableButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { lockedReason?: string | null }
> = ({ lockedReason, title, disabled, ...props }) => (
  <span title={lockedReason ?? title} className="inline-flex">
    <button {...props} disabled={disabled || !!lockedReason} aria-label={props['aria-label']} />
  </span>
);

export const Pagination: React.FC<{
  pageIndex: number;
  totalPages: number;
  totalCount: number;
  onChange: (page: number) => void;
}> = ({ pageIndex, totalPages, totalCount, onChange }) => (
  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
    <span className="font-mono-data">{totalCount} bản ghi</span>
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(pageIndex - 1)}
        disabled={pageIndex <= 1}
        aria-label="Trang trước"
        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="px-2 font-mono-data">
        {pageIndex} / {totalPages}
      </span>
      <button
        onClick={() => onChange(pageIndex + 1)}
        disabled={pageIndex >= totalPages}
        aria-label="Trang sau"
        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export const DrawerShell: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ title, onClose, children, footer, onSubmit }) => (
  <>
    <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />
    <aside className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in">
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
        <div className="shrink-0 p-4 border-t border-slate-200 grid grid-cols-2 gap-3">{footer}</div>
      </form>
    </aside>
  </>
);

export const DrawerFooter: React.FC<{ onCancel: () => void; submitLabel: string; submitting: boolean; canSubmit: boolean }> = ({
  onCancel,
  submitLabel,
  submitting,
  canSubmit,
}) => (
  <>
    <button
      type="button"
      onClick={onCancel}
      className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
    >
      Hủy
    </button>
    <button
      type="submit"
      disabled={!canSubmit || submitting}
      className="py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
    >
      {submitting ? 'Đang lưu...' : submitLabel}
    </button>
  </>
);

export const ConfirmModal: React.FC<{
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  confirmDisabled?: boolean;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ title, children, confirmLabel, confirmDisabled, submitting, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <div className="text-sm text-slate-600 space-y-3">{children}</div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          disabled={confirmDisabled || submitting}
          className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
        >
          {submitting ? 'Đang xử lý...' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export const VehicleStatusBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap"
    style={{ color, backgroundColor: `${color}14`, borderColor: `${color}55` }}
  >
    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
    {label}
  </span>
);
