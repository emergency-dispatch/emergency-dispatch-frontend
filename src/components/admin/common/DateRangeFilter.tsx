import React from 'react';
import { inputClass, labelClass } from './styles';
import { useTranslation } from '../../../i18n';

const pad = (n: number) => String(n).padStart(2, '0');

/** yyyy-MM-dd theo giờ địa phương (giá trị của <input type="date">). */
const toYmd = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const daysAgoYmd = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toYmd(d);
};

const QUICK_RANGES = [
  { key: 'today', days: 0 },
  { key: 'last7Days', days: 6 },
  { key: 'last30Days', days: 29 },
] as const;

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  /** Đổi cả hai đầu cùng lúc (nút khoảng nhanh) hoặc từng đầu. */
  onChange: (fromDate: string, toDate: string) => void;
  /** Nút đứng cuối hàng (VD "Xóa bộ lọc"). */
  children?: React.ReactNode;
}

/** Khoảng ngày (theo giờ địa phương, tính trọn ngày) + nút chọn nhanh Hôm nay / 7 ngày / 30 ngày. */
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ fromDate, toDate, onChange, children }) => {
  const { t } = useTranslation();
  const activeQuick = QUICK_RANGES.find((r) => fromDate === daysAgoYmd(r.days) && toDate === daysAgoYmd(0));

  return (
    <div className="flex flex-col lg:flex-row lg:items-end gap-3">
      <div className="space-y-1.5">
        <span className={labelClass}>{t('admin.common.dateRange.label')}</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => onChange(e.target.value, toDate)}
            aria-label={t('admin.common.dateRange.from')}
            className={`${inputClass} sm:w-40`}
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => onChange(fromDate, e.target.value)}
            aria-label={t('admin.common.dateRange.to')}
            className={`${inputClass} sm:w-40`}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => onChange(daysAgoYmd(r.days), daysAgoYmd(0))}
            className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-colors ${
              activeQuick === r ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-300 text-slate-600 hover:border-slate-400'
            }`}
          >
            {t(`admin.common.dateRange.${r.key}`)}
          </button>
        ))}
        {children}
      </div>
    </div>
  );
};
