import React from 'react';

interface MaintenanceTimelineProps {
  lastDate: string;
  nextDate: string;
}

export const MaintenanceTimeline: React.FC<MaintenanceTimelineProps> = ({ lastDate, nextDate }) => {
  const last = new Date(lastDate).getTime();
  const next = new Date(nextDate).getTime();
  const now = Date.now();
  const total = Math.max(1, next - last);
  const progressPct = Math.min(100, Math.max(0, ((now - last) / total) * 100));
  const isOverdue = now > next;
  const daysLeft = Math.round((next - now) / (1000 * 60 * 60 * 24));

  const barColor = isOverdue ? 'bg-red-500' : progressPct > 80 ? 'bg-amber-500' : 'bg-emerald-500';
  const labelColor = isOverdue ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono-data text-slate-500">
        <span>Gần nhất: {new Date(lastDate).toLocaleDateString('vi-VN')}</span>
        <span>Kế tiếp: {new Date(nextDate).toLocaleDateString('vi-VN')}</span>
      </div>

      <div className="relative h-2.5 rounded-full bg-slate-200 overflow-visible">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progressPct}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-700 shadow"
          style={{ left: `calc(${progressPct}% - 6px)` }}
          title="Hôm nay"
        />
      </div>

      <p className={`text-xs font-semibold ${labelColor}`}>
        {isOverdue ? `Đã quá hạn bảo dưỡng ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày đến hạn bảo dưỡng`}
      </p>
    </div>
  );
};
