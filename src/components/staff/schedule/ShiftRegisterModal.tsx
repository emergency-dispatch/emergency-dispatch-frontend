import React, { useState, useEffect } from 'react';
import {
  X,
  CalendarPlus,
  Send,
  Building2,
  Radio,
  Clock,
  Sun,
  Sunset,
  Moon,
  Flame,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  Calendar,
  Check,
  Layers,
  Settings2,
} from 'lucide-react';
import type { ShiftRegistrationRequest, ShiftType, ShiftRegistrationType } from '../../../types/staff';
import { mockAvailableStations, mockAvailableRoles, mockAvailableVehicles } from '../../../data/staffMock';
import { SHIFT_TYPE_CONFIG } from './ShiftMonthCalendar';

interface ShiftRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<ShiftRegistrationRequest, 'id' | 'createdAt' | 'status'>) => void;
  initialDate?: string;
}

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const SHIFT_OPTIONS: {
  type: ShiftType;
  title: string;
  time: string;
  icon: React.ElementType;
  hours: number;
}[] = [
  { type: 'morning', title: 'Ca Sáng', time: '06:00 - 14:00', icon: Sun, hours: 8 },
  { type: 'afternoon', title: 'Ca Chiều', time: '14:00 - 22:00', icon: Sunset, hours: 8 },
  { type: 'night', title: 'Ca Đêm', time: '22:00 - 06:00', icon: Moon, hours: 8 },
  { type: 'full_day', title: 'Trực Chiến 24h', time: '08:00 - 08:00', icon: Flame, hours: 24 },
];

export const ShiftRegisterModal: React.FC<ShiftRegisterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
}) => {
  const [regType, setRegType] = useState<ShiftRegistrationType>('regular');
  const [selectedDates, setSelectedDates] = useState<string[]>(
    initialDate ? [initialDate] : ['2026-09-15', '2026-09-16', '2026-09-17']
  );
  const [rangeStart, setRangeStart] = useState<string>('2026-09-18');
  const [rangeEnd, setRangeEnd] = useState<string>('2026-09-22');

  // Multi-shift selection state (Array of ShiftType)
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<ShiftType[]>(['morning']);

  // Per-day custom shift map mode (e.g. {'2026-09-15': 'morning', '2026-09-16': 'afternoon'})
  const [isPerDayMode, setIsPerDayMode] = useState<boolean>(false);
  const [dayShiftMap, setDayShiftMap] = useState<Record<string, ShiftType>>({});

  const [stationName, setStationName] = useState<string>(mockAvailableStations[0]);
  const [desiredRole, setDesiredRole] = useState<string>(mockAvailableRoles[0]);
  const [preferredVehicle, setPreferredVehicle] = useState<string>(mockAvailableVehicles[0].plate);
  const [reason, setReason] = useState<string>('');

  // Keep dayShiftMap in sync with selectedDates
  useEffect(() => {
    setDayShiftMap((prev) => {
      const nextMap = { ...prev };
      const defaultShift = selectedShiftTypes[0] || 'morning';
      selectedDates.forEach((d) => {
        if (!nextMap[d]) {
          nextMap[d] = defaultShift;
        }
      });
      return nextMap;
    });
  }, [selectedDates]);

  if (!isOpen) return null;

  // Toggle shift type selection in multi-select mode
  const handleToggleShiftType = (type: ShiftType) => {
    if (selectedShiftTypes.includes(type)) {
      if (selectedShiftTypes.length > 1) {
        const next = selectedShiftTypes.filter((t) => t !== type);
        setSelectedShiftTypes(next);
      }
    } else {
      setSelectedShiftTypes([...selectedShiftTypes, type]);
    }
  };

  // Set specific shift for a single day in per-day mode
  const handleSetDayShift = (dateStr: string, shift: ShiftType) => {
    setDayShiftMap((prev) => ({
      ...prev,
      [dateStr]: shift,
    }));
  };

  // Apply one shift to all dates in per-day mode
  const handleApplyShiftToAllDays = (shift: ShiftType) => {
    const newMap: Record<string, ShiftType> = {};
    selectedDates.forEach((d) => {
      newMap[d] = shift;
    });
    setDayShiftMap(newMap);
  };

  // Toggle individual date selection
  const handleToggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      if (selectedDates.length > 1) {
        setSelectedDates(selectedDates.filter((d) => d !== dateStr));
      }
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  // Add date range (From -> To)
  const handleAddRange = () => {
    if (!rangeStart || !rangeEnd) return;
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    if (start > end) return;

    const datesToAdd: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      datesToAdd.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }

    const merged = Array.from(new Set([...selectedDates, ...datesToAdd])).sort();
    setSelectedDates(merged);
  };

  // Quick Preset Handlers
  const handleSelectFullWeek = (weekStartDay: number) => {
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = weekStartDay + i;
      if (d <= 30) {
        weekDates.push(`2026-09-${String(d).padStart(2, '0')}`);
      }
    }
    const merged = Array.from(new Set([...selectedDates, ...weekDates])).sort();
    setSelectedDates(merged);
  };

  const handleSelectWeekdays = () => {
    const weekdays: string[] = [];
    for (let d = 1; d <= 30; d++) {
      const date = new Date(2026, 8, d);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        weekdays.push(`2026-09-${String(d).padStart(2, '0')}`);
      }
    }
    setSelectedDates(weekdays);
  };

  const handleSelectWeekends = () => {
    const weekends: string[] = [];
    for (let d = 1; d <= 30; d++) {
      const date = new Date(2026, 8, d);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekends.push(`2026-09-${String(d).padStart(2, '0')}`);
      }
    }
    setSelectedDates(weekends);
  };

  const handleSelectAllMonth = () => {
    const allDays: string[] = [];
    for (let d = 1; d <= 30; d++) {
      allDays.push(`2026-09-${String(d).padStart(2, '0')}`);
    }
    setSelectedDates(allDays);
  };

  const handleClearDates = () => {
    setSelectedDates(['2026-09-15']);
  };

  const handleRemoveDate = (dateToRemove: string) => {
    if (selectedDates.length > 1) {
      setSelectedDates(selectedDates.filter((d) => d !== dateToRemove));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDates.length === 0) return;
    if (selectedShiftTypes.length === 0) return;

    onSubmit({
      staffId: 'staff-901',
      staffName: 'Đ/c Nguyễn Văn An',
      registrationType: regType,
      dates: selectedDates,
      shiftType: selectedShiftTypes[0],
      shiftTypes: selectedShiftTypes,
      dayShiftMap: isPerDayMode ? dayShiftMap : undefined,
      stationName,
      desiredRole,
      preferredVehicle,
      reason,
    });
  };

  // Calculate grid days for Sept 2026
  const startDayOffset = 1; // Sept 1 is Tuesday
  const totalMonthDays = 30;

  // Calculate estimated total duty hours
  const totalCalculatedHours = isPerDayMode
    ? selectedDates.reduce((acc, d) => {
        const sType = dayShiftMap[d] || selectedShiftTypes[0] || 'morning';
        const h = SHIFT_OPTIONS.find((s) => s.type === sType)?.hours || 8;
        return acc + h;
      }, 0)
    : selectedDates.length *
      (SHIFT_OPTIONS.find((s) => s.type === selectedShiftTypes[0])?.hours || 8);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Fullscreen Backdrop Blur */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Centering Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="relative z-10 w-full max-w-3xl bg-[#0F172A] border border-cyan-500/40 rounded-2xl shadow-2xl p-5 sm:p-6 text-white text-left space-y-5 my-6 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-md shadow-cyan-950">
                <CalendarPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Đăng Ký Lịch Trực Nhiều Ngày & Nhiều Ca
                </h3>
                <p className="text-xs text-slate-400 font-mono-data">
                  Cho phép chọn nhiều ca trực hoặc phân ca chi tiết từng ngày
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Registration Type Switcher */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-mono-data font-semibold">
                1. Loại hình đăng ký ca trực:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegType('regular')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    regType === 'regular'
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-white">Ca Trực Định Kỳ / Tháng Mới</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Đăng ký nguyện vọng lịch chuẩn nhiều ngày theo chu kỳ
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegType('overtime')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    regType === 'overtime'
                      ? 'bg-rose-950/60 border-rose-500 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-500'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Trực Tác Chiến Tăng Cường (Overtime)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Đăng ký tăng cường kíp xe trực cao điểm, lễ hội, cuối tuần
                  </div>
                </button>
              </div>
            </div>

            {/* 2. MULTI-SHIFT SELECTION */}
            <div className="space-y-2 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-slate-200 font-mono-data font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>2. Chọn các ca trực mong muốn (Có thể chọn nhiều ca):</span>
                </label>

                {/* Per-day Switcher Toggle */}
                <button
                  type="button"
                  onClick={() => setIsPerDayMode(!isPerDayMode)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono-data font-semibold flex items-center gap-1.5 border transition-all ${
                    isPerDayMode
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{isPerDayMode ? 'Đang phân ca theo từng ngày' : 'Phân ca chi tiết từng ngày'}</span>
                </button>
              </div>

              {/* Multi-Select Shift Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SHIFT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedShiftTypes.includes(opt.type);
                  const cfg = SHIFT_TYPE_CONFIG[opt.type];

                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => handleToggleShiftType(opt.type)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all relative ${
                        isSelected
                          ? `${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass} ring-1 ${cfg.borderClass} shadow-lg shadow-cyan-950/30`
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {/* Selection Checkmark Badge */}
                      <div
                        className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-black'
                            : 'border border-slate-700 bg-slate-950/60'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>

                      <Icon className="w-5 h-5 mb-1" />
                      <span className="font-bold text-xs">{opt.title}</span>
                      <span className="text-[10px] font-mono-data text-slate-400 mt-0.5">
                        {opt.time} ({opt.hours}h)
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Shift Types Summary Badge */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono-data pt-1">
                <span>Đã chọn {selectedShiftTypes.length} loại ca:</span>
                {selectedShiftTypes.map((st) => (
                  <span
                    key={st}
                    className={`px-2 py-0.2 rounded border font-bold ${SHIFT_TYPE_CONFIG[st].badge}`}
                  >
                    {SHIFT_TYPE_CONFIG[st].label}
                  </span>
                ))}
              </div>
            </div>

            {/* 3. MULTI-DAY DATE PICKER & MINI CALENDAR */}
            <div className="space-y-3 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-slate-200 font-mono-data font-bold flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-cyan-400" />
                  <span>3. Chọn các ngày trực trong Tháng 09/2026:</span>
                </label>

                {/* Total Stats Tag */}
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono-data font-bold text-xs">
                  Đã chọn {selectedDates.length} ngày ({totalCalculatedHours} giờ trực)
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-mono-data">Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => handleSelectFullWeek(14)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors"
                >
                  + Tuần 14-20/9
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFullWeek(21)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors"
                >
                  + Tuần 21-27/9
                </button>
                <button
                  type="button"
                  onClick={handleSelectWeekdays}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors"
                >
                  + Tất cả T2-T6
                </button>
                <button
                  type="button"
                  onClick={handleSelectWeekends}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors"
                >
                  + Cuối Tuần (T7, CN)
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllMonth}
                  className="px-2 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 text-[11px] transition-colors font-bold"
                >
                  + Cả Tháng 9 (30 Ngày)
                </button>
                <button
                  type="button"
                  onClick={handleClearDates}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-[11px] transition-colors ml-auto"
                >
                  Xóa Chọn
                </button>
              </div>

              {/* Interactive Mini Calendar Grid (Month 09/2026) */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/90 space-y-2">
                {/* Weekday Header */}
                <div className="grid grid-cols-7 gap-1 text-center font-mono-data text-[11px] font-bold text-slate-400">
                  {DAY_NAMES.map((name) => (
                    <div key={name} className="py-1">
                      {name}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Leading empty space for Tuesday start (1 empty cell) */}
                  {Array.from({ length: startDayOffset }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-9 rounded-lg opacity-10" />
                  ))}

                  {/* 30 days of September */}
                  {Array.from({ length: totalMonthDays }, (_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `2026-09-${String(dayNum).padStart(2, '0')}`;
                    const isSelected = selectedDates.includes(dateStr);
                    const isToday = dateStr === '2026-09-08';

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => handleToggleDate(dateStr)}
                        className={`h-9 rounded-lg font-mono-data text-xs font-bold transition-all flex flex-col items-center justify-center relative ${
                          isSelected
                            ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950 ring-1 ring-cyan-300 scale-[1.02]'
                            : isToday
                            ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-slate-800'
                            : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span>{dayNum}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white absolute bottom-1" />
                        )}
                        {isToday && !isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute bottom-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Date Range Tool (From Date -> To Date) */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono-data shrink-0">
                  Hoặc chọn khoảng ngày:
                </span>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-data text-xs outline-none focus:border-cyan-500"
                />
                <span className="text-slate-500 font-mono-data text-xs">➔</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-data text-xs outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleAddRange}
                  className="px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Khoảng Ngày</span>
                </button>
              </div>

              {/* 4. PER-DAY SHIFT CUSTOMIZER TABLE (IF ENABLED) */}
              {isPerDayMode && (
                <div className="p-3 bg-slate-950/90 rounded-xl border border-cyan-500/40 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-cyan-300 font-mono-data">
                      Bảng Phân Ca Chi Tiết Từng Ngày ({selectedDates.length} ngày):
                    </span>

                    {/* Quick Apply All */}
                    <div className="flex items-center gap-1 text-[10px] font-mono-data">
                      <span className="text-slate-400">Áp dụng cho tất cả:</span>
                      {SHIFT_OPTIONS.map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => handleApplyShiftToAllDays(opt.type)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                        >
                          {opt.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {selectedDates.map((dateStr) => {
                      const curShift = dayShiftMap[dateStr] || selectedShiftTypes[0] || 'morning';

                      return (
                        <div
                          key={dateStr}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-1"
                        >
                          <span className="font-mono-data font-bold text-[11px] text-white">
                            {dateStr}
                          </span>

                          {/* Mini Shift Selector Buttons */}
                          <div className="flex items-center gap-1">
                            {SHIFT_OPTIONS.map((opt) => (
                              <button
                                key={opt.type}
                                type="button"
                                onClick={() => handleSetDayShift(dateStr, opt.type)}
                                title={opt.title}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono-data font-bold transition-colors ${
                                  curShift === opt.type
                                    ? `${SHIFT_TYPE_CONFIG[opt.type].bgClass} ${SHIFT_TYPE_CONFIG[opt.type].textClass} border ${SHIFT_TYPE_CONFIG[opt.type].borderClass}`
                                    : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                {opt.type === 'morning'
                                  ? 'S'
                                  : opt.type === 'afternoon'
                                  ? 'C'
                                  : opt.type === 'night'
                                  ? 'Đ'
                                  : '24h'}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Dates Chips Preview */}
              {!isPerDayMode && (
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 font-mono-data">
                    Danh sách {selectedDates.length} ngày đã chọn:
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-slate-950/40 rounded-xl border border-slate-800/80">
                    {selectedDates.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono-data text-[11px] flex items-center gap-1"
                      >
                        <span>{d}</span>
                        {selectedDates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDate(d)}
                            className="hover:text-red-400 transition-colors ml-0.5"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Station, Role, and Vehicle Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-mono-data mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Đơn vị / Trạm trực tiếp nhận:</span>
                </label>
                <select
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                >
                  {mockAvailableStations.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono-data mb-1 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Phương tiện ưu tiên tác chiến:</span>
                </label>
                <select
                  value={preferredVehicle}
                  onChange={(e) => setPreferredVehicle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                >
                  {mockAvailableVehicles.map((v) => (
                    <option key={v.plate} value={v.plate}>
                      {v.plate} — {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-mono-data mb-1">
                Vị trí / Nhiệm vụ kíp trực đảm nhận:
              </label>
              <select
                value={desiredRole}
                onChange={(e) => setDesiredRole(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                {mockAvailableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Notes / Reason */}
            <div>
              <label className="block text-slate-400 font-mono-data mb-1">
                Ghi chú & Nguyện vọng tác chiến (Tùy chọn):
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ghi rõ lý do nếu đăng ký trực tăng cường hoặc yêu cầu phân công đặc biệt..."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors font-medium"
              >
                Hủy Bỏ
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/60 border border-cyan-400 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>
                  Gửi Đơn Đăng Ký ({selectedDates.length} Ngày • {selectedShiftTypes.length} Ca)
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
