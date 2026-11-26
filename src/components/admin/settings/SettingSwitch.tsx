import React, { useId } from 'react';
import { useTranslation } from '../../../i18n';

/** Tên cấu hình + công tắc bật / tắt ở đầu khung (thay tiêu đề khung khi cả khung xoay quanh một công tắc). */
export const SettingSwitch: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ title, description, checked, onChange }) => {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="text-base font-bold text-slate-900">
          {title}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={titleId}
        onClick={() => onChange(!checked)}
        className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
      >
        <span aria-hidden className={`w-8 text-right text-xs font-semibold ${checked ? 'text-emerald-700' : 'text-slate-500'}`}>
          {t(checked ? 'admin.common.settings.on' : 'admin.common.settings.off')}
        </span>
        <span
          aria-hidden
          className={`relative h-6 w-11 rounded-full transition-colors motion-reduce:transition-none ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${
              checked ? 'translate-x-5' : ''
            }`}
          />
        </span>
      </button>
    </div>
  );
};
