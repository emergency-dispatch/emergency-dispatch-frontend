import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  Building2,
  Radio,
  Users,
  CheckCircle2,
  ArrowLeftRight,
  Info,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import type { ShiftScheduleItem, ShiftType } from '../../../types/staff';
import { SHIFT_TYPE_CONFIG } from './ShiftMonthCalendar';

interface ShiftListViewProps {
  schedules: ShiftScheduleItem[];
  onSelectShift: (shift: ShiftScheduleItem) => void;
  onRequestSwap: (shift: ShiftScheduleItem) => void;
  onExportSchedule: () => void;
}

export const ShiftListView: React.FC<ShiftListViewProps> = ({
  schedules,
  onSelectShift,
  onRequestSwap,
  onExportSchedule,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'completed' | 'scheduled' | 'swapped'>('all');
  const [shiftTypeFilter, setShiftTypeFilter] = useState<ShiftType | 'all'>('all');

  const filteredSchedules = schedules.filter((shift) => {
    const matchesSearch =
      shift.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.dayOfWeek.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shift.note && shift.note.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || shift.status === statusFilter;
    const matchesShiftType = shiftTypeFilter === 'all' || shift.shiftType === shiftTypeFilter;

    return matchesSearch && matchesStatus && matchesShiftType;
  });

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex flex-1 items-center gap-2 max-w-md bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo ngày, trạm, biển số xe, kíp trực..."
            className="w-full bg-transparent border-none outline-none placeholder:text-slate-500 text-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-slate-500 hover:text-slate-300 font-mono-data text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Filters and Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="checked_in">Đang trực ca (On-duty)</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="swapped">Đã đổi ca</option>
          </select>

          {/* Shift Type Filter */}
          <select
            value={shiftTypeFilter}
            onChange={(e) => setShiftTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Tất cả ca trực</option>
            <option value="morning">Ca Sáng (06h - 14h)</option>
            <option value="afternoon">Ca Chiều (14h - 22h)</option>
            <option value="night">Ca Đêm (22h - 06h)</option>
            <option value="full_day">Trực Chiến 24h</option>
            <option value="off">Nghỉ Ca / Nghỉ Bù</option>
          </select>

          {/* Export Button */}
          <button
            onClick={onExportSchedule}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Xuất Lịch</span>
          </button>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono-data text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-3">Ngày & Ca Trực</th>
              <th className="py-3 px-3">Khung Giờ</th>
              <th className="py-3 px-3">Trạm & Phương Tiện</th>
              <th className="py-3 px-3">Vị Trí Kíp Trực</th>
              <th className="py-3 px-3">Đồng Đội Kíp Xe</th>
              <th className="py-3 px-3">Trạng Thái GPS</th>
              <th className="py-3 px-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredSchedules.length > 0 ? (
              filteredSchedules.map((shift) => {
                const config = SHIFT_TYPE_CONFIG[shift.shiftType];
                const isToday = shift.date === '2026-09-08';

                return (
                  <tr
                    key={shift.id}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      isToday ? 'bg-cyan-950/20' : ''
                    }`}
                  >
                    {/* Date & Shift */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{shift.dayOfWeek}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono-data">
                                Hôm nay
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono-data text-slate-400">
                            {shift.date}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Shift Badge & Time */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${config.bgClass} ${config.borderClass} ${config.textClass}`}
                      >
                        <config.icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{config.label}</span>
                      </span>
                      {shift.shiftType !== 'off' && (
                        <div className="text-[10px] font-mono-data text-slate-400 mt-1">
                          {shift.startTime} - {shift.endTime}
                        </div>
                      )}
                    </td>

                    {/* Station & Vehicle */}
                    <td className="py-3.5 px-3">
                      <div className="space-y-0.5">
                        <div className="text-white font-medium truncate max-w-[150px]">
                          {shift.stationName}
                        </div>
                        {shift.vehiclePlate !== '-' && (
                          <div className="text-cyan-400 font-mono-data font-bold text-[11px] flex items-center gap-1">
                            <Radio className="w-3 h-3" />
                            <span>{shift.vehiclePlate}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-200">{shift.role}</div>
                      {shift.note && (
                        <div className="text-[10px] text-slate-500 italic truncate max-w-[160px]">
                          {shift.note}
                        </div>
                      )}
                    </td>

                    {/* Team Members */}
                    <td className="py-3.5 px-3">
                      {shift.teamMembers && shift.teamMembers.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-mono-data flex items-center gap-1">
                            <Users className="w-3 h-3 text-emerald-400" />
                            <span>{shift.teamMembers.length} cán bộ</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono-data">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      {shift.status === 'checked_in' && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono-data text-[10px] font-bold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Đang Trực Ca
                        </span>
                      )}
                      {shift.status === 'completed' && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 font-mono-data text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-slate-500" />
                          Đã Hoàn Thành ({shift.dutyHours || 8}h)
                        </span>
                      )}
                      {shift.status === 'scheduled' && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-mono-data text-[10px]">
                          Đã Lên Lịch
                        </span>
                      )}
                      {shift.status === 'swapped' && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono-data text-[10px]">
                          Đã Đổi Ca
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => onSelectShift(shift)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Xem chi tiết"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>

                      {shift.shiftType !== 'off' && shift.status !== 'completed' && (
                        <button
                          onClick={() => onRequestSwap(shift)}
                          className="p-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/30 transition-colors"
                          title="Đổi ca"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                  Không tìm thấy ca trực nào phù hợp với bộ lọc tìm kiếm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
