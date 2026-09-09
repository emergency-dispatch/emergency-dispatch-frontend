import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  Radio,
  Users,
  Phone,
  ArrowLeftRight,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Info,
} from 'lucide-react';
import type { ShiftScheduleItem, ShiftType } from '../../../types/staff';
import { SHIFT_TYPE_CONFIG } from './ShiftMonthCalendar';

interface ShiftWeekCalendarProps {
  currentWeekStart: Date; // Monday of current week
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  schedules: ShiftScheduleItem[];
  selectedDateStr: string | null;
  onSelectShift: (shift: ShiftScheduleItem) => void;
  onRequestSwap: (shift: ShiftScheduleItem) => void;
  onQuickRegisterDate: (dateStr: string) => void;
  filterShiftType: ShiftType | 'all';
}

const formatDateToIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DAY_LABELS = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

export const ShiftWeekCalendar: React.FC<ShiftWeekCalendarProps> = ({
  currentWeekStart,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  schedules,
  selectedDateStr,
  onSelectShift,
  onRequestSwap,
  onQuickRegisterDate,
  filterShiftType,
}) => {
  // Generate 7 days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    return {
      dateObj: d,
      dateStr: formatDateToIso(d),
      dayLabel: DAY_LABELS[i],
      formattedDate: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  const weekStartDateStr = weekDays[0].formattedDate;
  const weekEndDateStr = weekDays[6].formattedDate;
  const yearStr = currentWeekStart.getFullYear();

  const todayStr = '2026-09-08';

  const scheduleMap = new Map<string, ShiftScheduleItem>();
  schedules.forEach((s) => scheduleMap.set(s.date, s));

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Week Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5">
            <button
              onClick={onPrevWeek}
              title="Tuần trước"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 font-black text-sm text-cyan-400 font-mono-data tracking-wide min-w-[200px] text-center">
              Tuần: {weekStartDateStr} - {weekEndDateStr}/{yearStr}
            </div>
            <button
              onClick={onNextWeek}
              title="Tuần sau"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onCurrentWeek}
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            Tuần Này
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-xs font-mono-data text-slate-400">
          <span>7 Ngày Tác Chiến</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          <span className="text-cyan-400 font-bold">
            {schedules.filter((s) => s.shiftType !== 'off').length} Ca Đã Phân Công
          </span>
        </div>
      </div>

      {/* 7-Day Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const shift = scheduleMap.get(day.dateStr);
          const isToday = day.dateStr === todayStr;
          const isSelected = day.dateStr === selectedDateStr;
          const config = shift ? SHIFT_TYPE_CONFIG[shift.shiftType] : null;

          const isFilteredOut =
            filterShiftType !== 'all' && shift && shift.shiftType !== filterShiftType;

          return (
            <div
              key={day.dateStr}
              className={`rounded-2xl border flex flex-col justify-between p-3.5 transition-all duration-200 relative overflow-hidden ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-400'
                  : isToday
                  ? 'bg-slate-900/95 border-emerald-500/80 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                  : 'bg-slate-900/75 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
              } ${isFilteredOut ? 'opacity-30 grayscale' : ''}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div>
                  <div
                    className={`font-black text-xs ${
                      isToday ? 'text-emerald-400' : isSelected ? 'text-cyan-400' : 'text-white'
                    }`}
                  >
                    {day.dayLabel}
                  </div>
                  <div className="text-[11px] font-mono-data text-slate-400">
                    {day.formattedDate}
                  </div>
                </div>

                {isToday && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono-data font-bold text-[10px] animate-pulse">
                    Hôm nay
                  </span>
                )}
              </div>

              {/* Body Content */}
              {shift && config ? (
                <div className="my-2.5 space-y-2.5 flex-1">
                  {/* Shift Badge Banner */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-1.5 ${config.bgClass} ${config.borderClass} ${config.textClass}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 font-bold text-xs">
                      <config.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{config.label}</span>
                    </div>

                    {shift.isOvertime && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[9px] font-mono-data font-bold shrink-0">
                        Tăng Cường
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  {shift.shiftType !== 'off' ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-mono-data text-[11px] font-bold">
                          {shift.startTime} - {shift.endTime}
                        </span>
                      </div>

                      {shift.stationName && shift.stationName !== '-' && (
                        <div className="flex items-center gap-1.5 text-slate-400 truncate">
                          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate text-[11px]">{shift.stationName}</span>
                        </div>
                      )}

                      {shift.vehiclePlate && shift.vehiclePlate !== '-' && (
                        <div className="flex items-center gap-1.5 text-cyan-300 font-mono-data font-bold">
                          <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="text-[11px]">{shift.vehiclePlate}</span>
                        </div>
                      )}

                      {/* Crew Members Preview */}
                      {shift.teamMembers && shift.teamMembers.length > 0 && (
                        <div className="pt-1 border-t border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-mono-data flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3 text-emerald-400" />
                            <span>Kíp trực ({shift.teamMembers.length})</span>
                          </div>
                          <div className="space-y-0.5">
                            {shift.teamMembers.slice(0, 2).map((m) => (
                              <div
                                key={m.name}
                                className="text-[10px] text-slate-300 truncate flex items-center justify-between"
                              >
                                <span className="truncate">{m.name}</span>
                                <span className="text-slate-500 text-[9px] font-mono-data">
                                  {m.role.slice(0, 8)}
                                </span>
                              </div>
                            ))}
                            {shift.teamMembers.length > 2 && (
                              <div className="text-[9px] text-slate-500 italic">
                                +{shift.teamMembers.length - 2} đồng đội khác
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-500 text-xs">
                      <p className="font-medium text-slate-400">Nghỉ ca dưỡng sức</p>
                      <p className="text-[10px] mt-1 italic">Không có lịch tác chiến</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="my-6 text-center text-slate-500 text-xs flex-1 flex flex-col items-center justify-center space-y-2">
                  <p className="text-[11px]">Chưa xếp lịch ca</p>
                  <button
                    onClick={() => onQuickRegisterDate(day.dateStr)}
                    className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 rounded-lg text-[11px] font-mono-data font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Đăng Ký</span>
                  </button>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                {shift ? (
                  <>
                    <button
                      onClick={() => onSelectShift(shift)}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <Info className="w-3 h-3" />
                      <span>Chi Tiết</span>
                    </button>

                    {shift.shiftType !== 'off' && shift.status !== 'completed' && (
                      <button
                        onClick={() => onRequestSwap(shift)}
                        title="Đăng ký đổi ca trực này"
                        className="p-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-500/30 text-[11px] transition-colors"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => onQuickRegisterDate(day.dateStr)}
                    className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  >
                    Đăng Ký Ca
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
