import React from 'react';
import { inputClass, labelClass } from '../common/styles';
import { toYmd } from './auditMeta';

export const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const daysAgoYmd = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toYmd(d);
};

const QUICK_RANGES: { label: string; days: number }[] = [
  { label: 'Hôm nay', days: 0 },
  { label: '7 ngày', days: 6 },
  { label: '30 ngày', days: 29 },
];

interface AuditDateRangeFilterProps {
  fromDate: string;
  toDate: string;
  /** Đổi cả hai đầu cùng lúc (nút khoảng nhanh) hoặc từng đầu. */
  onChange: (fromDate: string, toDate: string) => void;
  /** Nút đứng cuối hàng (VD "Xóa bộ lọc"). */
  children?: React.ReactNode;
}

/** Khoảng ngày (theo giờ địa phương, tính trọn ngày) + nút chọn nhanh Hôm nay / 7 ngày / 30 ngày. */
export const AuditDateRangeFilter: React.FC<AuditDateRangeFilterProps> = ({ fromDate, toDate, onChange, children }) => {
  const activeQuick = QUICK_RANGES.find((r) => fromDate === daysAgoYmd(r.days) && toDate === daysAgoYmd(0));

  return (
    <div className="flex flex-col lg:flex-row lg:items-end gap-3">
      <div className="space-y-1.5">
        <span className={labelClass}>Khoảng ngày</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => onChange(e.target.value, toDate)}
            aria-label="Từ ngày"
            className={`${inputClass} sm:w-40`}
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => onChange(fromDate, e.target.value)}
            aria-label="Đến ngày"
            className={`${inputClass} sm:w-40`}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => onChange(daysAgoYmd(r.days), daysAgoYmd(0))}
            className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-colors ${
              activeQuick === r ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-300 text-slate-600 hover:border-slate-400'
            }`}
          >
            {r.label}
          </button>
        ))}
        {children}
      </div>
    </div>
  );
};
