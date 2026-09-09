import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Flame,
  CheckCircle2,
  Clock,
  Plus,
  Radio,
} from 'lucide-react';
import type { ShiftScheduleItem, ShiftType } from '../../../types/staff';

interface ShiftMonthCalendarProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  schedules: ShiftScheduleItem[];
  selectedDateStr: string | null;
  onSelectShift: (shift: ShiftScheduleItem) => void;
  onQuickRegisterDate: (dateStr: string) => void;
  filterShiftType: ShiftType | 'all';
}

export const SHIFT_TYPE_CONFIG: Record<
  ShiftType,
  {
    label: string;
    shortLabel: string;
    time: string;
    icon: React.ElementType;
    bgClass: string;
    borderClass: string;
    textClass: string;
    dotClass: string;
  }
> = {
  morning: {
    label: 'Ca Sáng',
    shortLabel: 'Sáng',
    time: '06:00 - 14:00',
    icon: Sun,
    bgClass: 'bg-amber-500/15 hover:bg-amber-500/25',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-300',
    dotClass: 'bg-amber-400',
  },
  afternoon: {
    label: 'Ca Chiều',
    shortLabel: 'Chiều',
    time: '14:00 - 22:00',
    icon: Sunset,
    bgClass: 'bg-cyan-500/15 hover:bg-cyan-500/25',
    borderClass: 'border-cyan-500/40',
    textClass: 'text-cyan-300',
    dotClass: 'bg-cyan-400',
  },
  night: {
    label: 'Ca Đêm',
    shortLabel: 'Đêm',
    time: '22:00 - 06:00',
    icon: Moon,
    bgClass: 'bg-purple-500/15 hover:bg-purple-500/25',
    borderClass: 'border-purple-500/40',
    textClass: 'text-purple-300',
    dotClass: 'bg-purple-400',
  },
  full_day: {
    label: 'Trực Chiến 24h',
    shortLabel: '24 Giờ',
    time: '08:00 - 08:00',
    icon: Flame,
    bgClass: 'bg-rose-500/20 hover:bg-rose-500/30',
    borderClass: 'border-rose-500/50',
    textClass: 'text-rose-300',
    dotClass: 'bg-rose-400',
  },
  off: {
    label: 'Nghỉ Ca / Nghỉ Bù',
    shortLabel: 'Nghỉ Ca',
    time: 'Nghỉ ngơi',
    icon: Coffee,
    bgClass: 'bg-slate-800/60 hover:bg-slate-800',
    borderClass: 'border-slate-700/60',
    textClass: 'text-slate-400',
    dotClass: 'bg-slate-500',
  },
};

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

export const ShiftMonthCalendar: React.FC<ShiftMonthCalendarProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  schedules,
  selectedDateStr,
  onSelectShift,
  onQuickRegisterDate,
  filterShiftType,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Format month title
  const monthTitle = `Tháng ${String(month + 1).padStart(2, '0')} / ${year}`;

  // Calculate calendar days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  // Day of week for day 1 (0: Sunday, 1: Mon, ..., 6: Sat) -> Convert to Monday=0
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevMonthNum = month === 0 ? 12 : month;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    prevMonthDays.push({ day: d, dateStr, isCurrentMonth: false });
  }

  // Current month days
  const currentMonthDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    currentMonthDays.push({ day: d, dateStr, isCurrentMonth: true });
  }

  // Next month leading days to complete grid (multiples of 7)
  const remainingCells = (7 - ((prevMonthDays.length + currentMonthDays.length) % 7)) % 7;
  const nextMonthDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthNum = month === 11 ? 1 : month + 2;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    nextMonthDays.push({ day: d, dateStr, isCurrentMonth: false });
  }

  const allCalendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  // Schedule map by dateStr
  const scheduleMap = new Map<string, ShiftScheduleItem>();
  schedules.forEach((s) => {
    scheduleMap.set(s.date, s);
  });

  const todayStr = '2026-09-08'; // System reference date

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Calendar Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5">
            <button
              onClick={onPrevMonth}
              title="Tháng trước"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 font-black text-sm text-cyan-400 font-mono-data tracking-wide min-w-[140px] text-center">
              {monthTitle}
            </div>
            <button
              onClick={onNextMonth}
              title="Tháng sau"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onToday}
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            Hôm Nay
          </button>
        </div>

        {/* Quick Shift Legend */}
        <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono-data">
          {Object.entries(SHIFT_TYPE_CONFIG).map(([typeKey, cfg]) => (
            <div
              key={typeKey}
              className={`px-2 py-0.5 rounded border flex items-center gap-1.5 ${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
              <span>{cfg.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-slate-400 font-mono-data">
        {DAY_NAMES.map((name, idx) => (
          <div
            key={name}
            className={`py-2 rounded-lg ${
              idx >= 5 ? 'text-amber-400/90 bg-amber-950/10' : 'bg-slate-900/60'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {allCalendarDays.map((cell) => {
          const shift = scheduleMap.get(cell.dateStr);
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDateStr;

          // Check if matches filter
          const isFilteredOut =
            filterShiftType !== 'all' && shift && shift.shiftType !== filterShiftType;

          const config = shift ? SHIFT_TYPE_CONFIG[shift.shiftType] : null;

          return (
            <div
              key={cell.dateStr}
              onClick={() => {
                if (shift) {
                  onSelectShift(shift);
                } else if (cell.isCurrentMonth) {
                  onQuickRegisterDate(cell.dateStr);
                }
              }}
              className={`min-h-[105px] sm:min-h-[125px] p-2 rounded-xl border flex flex-col justify-between transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                !cell.isCurrentMonth
                  ? 'bg-slate-950/30 border-slate-900/60 opacity-35'
                  : isSelected
                  ? 'bg-cyan-950/50 border-cyan-400 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400'
                  : isToday
                  ? 'bg-slate-900/95 border-emerald-500/80 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                  : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-850'
              } ${isFilteredOut ? 'opacity-25 grayscale' : ''}`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-xs font-mono-data font-bold px-1.5 py-0.5 rounded ${
                    isToday
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : isSelected
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : cell.isCurrentMonth
                      ? 'text-slate-200 group-hover:text-white'
                      : 'text-slate-600'
                  }`}
                >
                  {cell.day}
                </span>

                {isToday && (
                  <span className="text-[9px] font-mono-data font-bold text-emerald-400 uppercase tracking-tighter">
                    Hôm Nay
                  </span>
                )}

                {/* Overtime tag */}
                {shift?.isOvertime && (
                  <span className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-mono-data font-bold">
                    OT
                  </span>
                )}
              </div>

              {/* Shift Details inside Cell */}
              {shift && config ? (
                <div className="space-y-1 my-1">
                  <div
                    className={`p-1.5 rounded-lg border text-left transition-all ${config.bgClass} ${config.borderClass} ${config.textClass}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 font-bold text-[11px] leading-tight truncate">
                        <config.icon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{config.shortLabel}</span>
                      </div>
                      {shift.status === 'checked_in' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      )}
                    </div>

                    {shift.shiftType !== 'off' && (
                      <div className="text-[10px] font-mono-data text-slate-300 truncate mt-0.5">
                        {shift.startTime}
                      </div>
                    )}
                  </div>

                  {/* Vehicle plate or Role preview on hover/normal */}
                  {shift.vehiclePlate && shift.vehiclePlate !== '-' && (
                    <div className="text-[10px] font-mono-data text-cyan-400 truncate flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 shrink-0 text-cyan-500" />
                      <span>{shift.vehiclePlate}</span>
                    </div>
                  )}
                </div>
              ) : cell.isCurrentMonth ? (
                <div className="flex flex-col items-center justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-cyan-600 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono-data mt-0.5">Đăng ký</span>
                </div>
              ) : null}

              {/* Status footer pill */}
              <div className="pt-0.5 flex items-center justify-between text-[10px] font-mono-data">
                {shift?.status === 'checked_in' && (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    On-duty
                  </span>
                )}
                {shift?.status === 'completed' && (
                  <span className="text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-slate-500" />
                    Đã trực ({shift.dutyHours || 8}h)
                  </span>
                )}
                {shift?.status === 'swapped' && (
                  <span className="text-amber-400 italic">Đã đổi ca</span>
                )}
                {shift?.status === 'scheduled' && shift.shiftType !== 'off' && (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-500" />
                    Đã lên lịch
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
