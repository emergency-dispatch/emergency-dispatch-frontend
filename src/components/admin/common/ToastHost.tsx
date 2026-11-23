import React, { useEffect, useState } from 'react';
import { CircleCheck, Info, X } from 'lucide-react';
import { clearToasts, dismissToast, useToasts, type ToastItem } from './toastStore';
import { useTranslation } from '../../../i18n';

const TOAST_MS = 4000;

const KIND_META = {
  success: { icon: CircleCheck, className: 'border-emerald-200', iconClassName: 'text-emerald-600' },
  info: { icon: Info, className: 'border-blue-200', iconClassName: 'text-blue-600' },
} as const;

const Toast: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const { t } = useTranslation();
  // Đang rê chuột / focus vào toast thì không tự tắt, để kịp đọc.
  const [paused, setPaused] = useState(false);
  const { icon: Icon, className, iconClassName } = KIND_META[toast.kind];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => dismissToast(toast.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [paused, toast.id]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border bg-white shadow-lg shadow-slate-900/10 text-sm text-slate-800 animate-drawer-in motion-reduce:animate-none ${className}`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClassName}`} />
      <span className="flex-1 min-w-0 break-words">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label={t('common.dismissNotice')}
        className="shrink-0 text-slate-400 hover:text-slate-700"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Nơi hiện toast báo thành công (gọi `showToast`), góc trên phải dưới Topbar — nằm trên drawer / hộp xác nhận của Admin.
 * Lỗi vẫn dùng `Notice` trong trang để không tự mất. Gắn một lần ở layout.
 */
export const ToastHost: React.FC = () => {
  const toasts = useToasts();
  // Rời khu vực (đăng xuất) thì không để toast cũ hiện lại ở lần vào sau.
  useEffect(() => clearToasts, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-20 right-4 z-[1600] w-[min(24rem,calc(100vw-2rem))] space-y-2"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
