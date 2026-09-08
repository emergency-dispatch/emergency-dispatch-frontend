import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { BarChart3, CircleCheckBig, Clock, Flame, Thermometer, TrendingUp } from 'lucide-react';
import { AnalyticsFiltersBar } from '../../../components/dashboard/analytics/AnalyticsFiltersBar';
import { AnalyticsHeatmapView } from '../../../components/dashboard/analytics/AnalyticsHeatmapView';
import { ChartCard } from '../../../components/dashboard/analytics/ChartCard';
import { ChartTooltip } from '../../../components/dashboard/analytics/ChartTooltip';
import { KpiCard } from '../../../components/dashboard/analytics/KpiCard';
import { getAnalyticsSnapshot } from '../../../data/analyticsMock';
import type { TimeRange } from '../../../types/analytics';

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [area, setArea] = useState('all');

  // Mock aggregation "endpoint" — no backend yet, so cache it per filter combo instead of refetching on every render.
  const snapshot = useMemo(() => getAnalyticsSnapshot(timeRange, area), [timeRange, area]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-lg font-bold text-white flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Analytics &amp; Heatmap Dashboard
        </h1>
        <AnalyticsFiltersBar
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          area={area}
          onAreaChange={setArea}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={Clock}
          label="Thời gian phản hồi trung bình"
          value={`${snapshot.kpis.avgResponseMinutes} phút`}
          accent="#2563EB"
        />
        <KpiCard
          icon={CircleCheckBig}
          label="Tỉ lệ xử lý thành công"
          value={`${snapshot.kpis.successRate}%`}
          accent="#10B981"
        />
        <KpiCard
          icon={Flame}
          label="Tổng sự cố hôm nay"
          value={String(snapshot.kpis.totalIncidentsToday)}
          accent="#F97316"
        />
        <KpiCard
          icon={TrendingUp}
          label="Tổng sự cố trong kỳ"
          value={String(snapshot.kpis.totalIncidentsPeriod)}
          accent="#8B5CF6"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-4 h-4 text-blue-400 shrink-0" />
          <h3 className="text-sm font-bold text-white">Bản đồ nhiệt khu vực xảy ra sự cố</h3>
        </div>
        <div className="h-[420px] rounded-lg overflow-hidden border border-slate-800">
          <AnalyticsHeatmapView points={snapshot.heatmap} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Sự cố theo thời gian" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={snapshot.trend}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={ChartTooltip} cursor={{ stroke: '#334155' }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563EB"
                strokeWidth={2}
                dot={{ r: 3, fill: '#2563EB', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sự cố theo loại" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={snapshot.byType} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
              <YAxis
                type="category"
                dataKey="label"
                stroke="#94A3B8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={112}
              />
              <Tooltip content={ChartTooltip} cursor={{ fill: 'rgba(51, 65, 85, 0.25)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {snapshot.byType.map((entry) => (
                  <Cell key={entry.type} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};
