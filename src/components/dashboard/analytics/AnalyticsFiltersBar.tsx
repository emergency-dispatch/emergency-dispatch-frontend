import React from 'react';
import { ANALYTICS_AREAS } from '../../../data/analyticsMock';
import type { TimeRange } from '../../../types/analytics';

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
];

interface AnalyticsFiltersBarProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  area: string;
  onAreaChange: (area: string) => void;
}

export const AnalyticsFiltersBar: React.FC<AnalyticsFiltersBarProps> = ({
  timeRange,
  onTimeRangeChange,
  area,
  onAreaChange,
}) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0">
        {TIME_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onTimeRangeChange(opt.value)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono-data font-semibold transition-colors ${
              timeRange === opt.value
                ? 'bg-red-600 text-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <select
        value={area}
        onChange={(e) => onAreaChange(e.target.value)}
        className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-red-500 shrink-0"
      >
        <option value="all">Tất cả khu vực</option>
        {ANALYTICS_AREAS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
};
