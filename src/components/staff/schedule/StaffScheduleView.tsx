import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Phone,
  ArrowLeftRight,
  Plus,
  ShieldCheck,
  Building2,
  CalendarCheck,
  Send,
  X,
  Sparkles,
  Calendar as CalendarIcon,
  List,
  FileText,
  Download,
  Filter,
  Radio,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Flame,
} from 'lucide-react';
import type {
  ShiftScheduleItem,
  ShiftSwapRequest,
  ShiftType,
  ShiftRegistrationRequest,
  ShiftLeaveRequest,
} from '../../../types/staff';
import {
  mockShiftSchedules,
  mockShiftSwapRequests,
  mockShiftRegistrationRequests,
  mockShiftLeaveRequests,
} from '../../../data/staffMock';
import { staffAudioService } from '../../../services/staffAudioService';
import { ShiftMonthCalendar, SHIFT_TYPE_CONFIG } from './ShiftMonthCalendar';
import { ShiftWeekCalendar } from './ShiftWeekCalendar';
import { ShiftListView } from './ShiftListView';
import { ShiftRegisterModal } from './ShiftRegisterModal';
import { ShiftLeaveModal } from './ShiftLeaveModal';
import { ShiftDetailDrawer } from './ShiftDetailDrawer';
import { ShiftRequestsManager } from './ShiftRequestsManager';

type ScheduleViewMode = 'month' | 'week' | 'list' | 'requests';

export const StaffScheduleView: React.FC = () => {
  // Schedules and Requests State
  const [schedules, setSchedules] = useState<ShiftScheduleItem[]>(mockShiftSchedules);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>(mockShiftSwapRequests);
  const [registrationRequests, setRegistrationRequests] = useState<ShiftRegistrationRequest[]>(
    mockShiftRegistrationRequests
  );
  const [leaveRequests, setLeaveRequests] = useState<ShiftLeaveRequest[]>(mockShiftLeaveRequests);

  // Active View Mode
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('month');

  // Month & Week Date Navigators (Base date: Sept 8, 2026)
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date(2026, 8, 8)); // Sept 2026

  // Monday of the active week (Sept 7, 2026)
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(new Date(2026, 8, 7));

  // Selected Shift for Detail Drawer
  const [selectedShift, setSelectedShift] = useState<ShiftScheduleItem | null>(null);

  // Filter by Shift Type
  const [filterShiftType, setFilterShiftType] = useState<ShiftType | 'all'>('all');

  // Modal Visibilities
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showSwapModal, setShowSwapModal] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [quickRegisterDate, setQuickRegisterDate] = useState<string | undefined>(undefined);

  // Check-in state
  const [isCheckInDone, setIsCheckInDone] = useState<boolean>(true);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Swap Modal Form States
  const [swapTargetDate, setSwapTargetDate] = useState<string>('2026-09-15');
  const [swapTargetStaff, setSwapTargetStaff] = useState<string>('Đ/c Lê Văn Toàn (Kíp 2)');
  const [swapOriginalShift, setSwapOriginalShift] = useState<ShiftType>('night');
  const [swapTargetShift, setSwapTargetShift] = useState<ShiftType>('morning');
  const [swapReason, setSwapReason] = useState<string>('');

  // Find today's active shift
  const todayShift = schedules.find((s) => s.date === '2026-09-08') || schedules[7];

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setNotificationMsg({ text, type });
    staffAudioService.playSuccessChime();
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Check-In Toggle Handler
  const handleCheckInToggle = () => {
    const nextState = !isCheckInDone;
    setIsCheckInDone(nextState);

    // Update schedules status for today
    setSchedules((prev) =>
      prev.map((s) =>
        s.date === '2026-09-08'
          ? {
              ...s,
              status: nextState ? 'checked_in' : 'completed',
              checkInTime: nextState ? '13:48' : s.checkInTime,
              checkOutTime: !nextState ? '22:05' : undefined,
            }
          : s
      )
    );

    showNotification(
      nextState
        ? 'Đã điểm danh vào ca trực thành công qua xác thực định vị GPS Trạm Q.1!'
        : 'Đã hoàn tất thủ tục bàn giao kết thúc ca trực.'
    );
  };

  // Month navigation
  const handlePrevMonth = () => {
    const d = new Date(currentCalendarDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentCalendarDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentCalendarDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentCalendarDate(d);
  };

  const handleTodayMonth = () => {
    setCurrentCalendarDate(new Date(2026, 8, 8));
  };

  // Week navigation
  const handlePrevWeek = () => {
    const d = new Date(currentWeekMonday);
    d.setDate(d.getDate() - 7);
    setCurrentWeekMonday(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekMonday);
    d.setDate(d.getDate() + 7);
    setCurrentWeekMonday(d);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekMonday(new Date(2026, 8, 7));
  };

  // Open Quick Register for a specific date
  const handleQuickRegisterDate = (dateStr: string) => {
    setQuickRegisterDate(dateStr);
    setShowRegisterModal(true);
  };

  // Submit Shift Registration
  const handleCreateRegistration = (
    data: Omit<ShiftRegistrationRequest, 'id' | 'createdAt' | 'status'>
  ) => {
    const newReq: ShiftRegistrationRequest = {
      ...data,
      id: `reg-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setRegistrationRequests([newReq, ...registrationRequests]);
    setShowRegisterModal(false);
    setQuickRegisterDate(undefined);

    // If registered on an empty date in schedules, optionally create tentative shift
    const updatedSchedules = [...schedules];
    data.dates.forEach((dStr) => {
      const existingIdx = updatedSchedules.findIndex((s) => s.date === dStr);
      const newShiftItem: ShiftScheduleItem = {
        id: `shift-${dStr}`,
        date: dStr,
        dayOfWeek: new Date(dStr).toLocaleDateString('vi-VN', { weekday: 'long' }),
        shiftType: data.shiftType,
        startTime:
          data.shiftType === 'morning'
            ? '06:00'
            : data.shiftType === 'afternoon'
            ? '14:00'
            : data.shiftType === 'night'
            ? '22:00'
            : data.shiftType === 'full_day'
            ? '08:00'
            : '-',
        endTime:
          data.shiftType === 'morning'
            ? '14:00'
            : data.shiftType === 'afternoon'
            ? '22:00'
            : data.shiftType === 'night'
            ? '06:00'
            : data.shiftType === 'full_day'
            ? '08:00 (hôm sau)'
            : '-',
        stationName: data.stationName,
        vehiclePlate: data.preferredVehicle || '51D-123.45',
        role: data.desiredRole,
        dutyHours: data.shiftType === 'full_day' ? 24 : data.shiftType === 'off' ? 0 : 8,
        isOvertime: data.registrationType === 'overtime',
        teamMembers: [
          { name: 'Trần Văn Bình', role: 'Lái xe', phone: '0901 111 222' },
          { name: 'Vũ Đức Nam', role: 'Chiến sĩ cứu hộ', phone: '0903 555 666' },
        ],
        status: 'scheduled',
        note: `Đã đăng ký (${data.registrationType === 'overtime' ? 'Trực Tăng Cường' : 'Ca Mới'}) - Chờ duyệt`,
      };

      if (existingIdx >= 0) {
        updatedSchedules[existingIdx] = newShiftItem;
      } else {
        updatedSchedules.push(newShiftItem);
      }
    });

    setSchedules(updatedSchedules);
    showNotification(
      `Đã gửi đơn đăng ký ${data.dates.length} ca trực thành công tới Ban Chỉ Huy CAD!`
    );
  };

  // Submit Swap Request
  const handleCreateSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapReason) return;

    const newRequest: ShiftSwapRequest = {
      id: `swap-${Date.now()}`,
      fromStaffName: 'Đ/c Nguyễn Văn An',
      toStaffName: swapTargetStaff,
      targetDate: swapTargetDate,
      originalShift: swapOriginalShift,
      swapShift: swapTargetShift,
      reason: swapReason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setSwapRequests([newRequest, ...swapRequests]);
    setShowSwapModal(false);
    setSwapReason('');
    showNotification(`Đã gửi yêu cầu đổi ca trực ngày ${swapTargetDate} tới Ban Chỉ Huy!`);
  };

  // Open Swap from a specific shift
  const handleOpenSwapForShift = (shift: ShiftScheduleItem) => {
    setSwapTargetDate(shift.date);
    setSwapOriginalShift(shift.shiftType);
    setShowSwapModal(true);
  };

  // Submit Leave Request
  const handleCreateLeave = (
    data: Omit<ShiftLeaveRequest, 'id' | 'createdAt' | 'status'>
  ) => {
    const newLeave: ShiftLeaveRequest = {
      ...data,
      id: `leave-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setLeaveRequests([newLeave, ...leaveRequests]);
    setShowLeaveModal(false);
    showNotification(
      `Đã gửi đơn xin nghỉ ${data.totalDays} ngày (${data.startDate}) tới Ban Chỉ Huy!`
    );
  };

  // Cancel requests
  const handleCancelRegistration = (id: string) => {
    setRegistrationRequests(registrationRequests.filter((r) => r.id !== id));
    showNotification('Đã hủy đơn đăng ký ca trực.', 'info');
  };

  const handleCancelSwap = (id: string) => {
    setSwapRequests(swapRequests.filter((s) => s.id !== id));
    showNotification('Đã hủy yêu cầu đổi ca trực.', 'info');
  };

  const handleCancelLeave = (id: string) => {
    setLeaveRequests(leaveRequests.filter((l) => l.id !== id));
    showNotification('Đã hủy đơn xin nghỉ phép.', 'info');
  };

  // Export Schedule Simulation
  const handleExportSchedule = () => {
    showNotification('Đang xuất bảng phân công ca trực định dạng PDF & file đồng bộ iCal...');
  };

  // Monthly KPI metrics calculation
  const totalDutyHours = schedules.reduce((acc, cur) => acc + (cur.dutyHours || 0), 0);
  const totalNightShifts = schedules.filter((s) => s.shiftType === 'night').length;
  const totalOvertimeShifts = schedules.filter((s) => s.isOvertime).length;
  const pendingRequestsCount =
    registrationRequests.filter((r) => r.status === 'pending').length +
    swapRequests.filter((s) => s.status === 'pending').length +
    leaveRequests.filter((l) => l.status === 'pending').length;

  return (
    <div className="space-y-5 p-1 pb-10">
      {/* Toast Notification */}
      {notificationMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 shadow-2xl animate-fadeIn border ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-300'
              : 'bg-cyan-950/95 border-cyan-500/80 text-cyan-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-medium">{notificationMsg.text}</span>
        </div>
      )}

      {/* 1. TOP HEADER: Active Shift & GPS Check-In Terminal */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-md shadow-cyan-950">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono-data font-bold text-cyan-400">
                  CA TRỰC TÁC CHIẾN HÔM NAY
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono-data font-bold border ${
                    isCheckInDone
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isCheckInDone ? 'ĐÃ ĐIỂM DANH ON-DUTY' : 'CHƯA ĐIỂM DANH'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {todayShift.dayOfWeek} ({todayShift.date}) — {SHIFT_TYPE_CONFIG[todayShift.shiftType].label}
              </h2>
            </div>
          </div>

          {/* Quick Action Buttons on Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setQuickRegisterDate(undefined);
                setShowRegisterModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-950/60 border border-cyan-400 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng Ký Ca Mới</span>
            </button>

            <button
              onClick={handleCheckInToggle}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95 ${
                isCheckInDone
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-950/60 border border-emerald-400 animate-pulse'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isCheckInDone ? 'Bàn Giao & Kết Thúc Ca' : 'Điểm Danh GPS Vào Ca'}</span>
            </button>
          </div>
        </div>

        {/* Shift Details: Station, Vehicle & Crew */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono-data uppercase flex items-center gap-1.5 font-bold">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Đơn Vị & Phương Tiện Trực
            </div>
            <div className="text-sm font-bold text-white">{todayShift.stationName}</div>
            <div className="text-cyan-400 font-mono-data font-bold">Xe: {todayShift.vehiclePlate}</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono-data uppercase flex items-center gap-1.5 font-bold">
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              Khung Giờ Tác Chiến
            </div>
            <div className="text-sm font-bold text-white">
              {todayShift.startTime} - {todayShift.endTime}
            </div>
            <div className="text-slate-400">
              GPS Điểm danh:{' '}
              <span className="text-emerald-400 font-mono-data font-bold">
                {todayShift.checkInTime || '13:48'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono-data uppercase flex items-center gap-1.5 font-bold">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Đồng Đội Kíp Xe ({todayShift.teamMembers.length} cán bộ)
            </div>
            <div className="space-y-1 pt-0.5">
              {todayShift.teamMembers.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-slate-300">
                  <span>
                    {m.name} ({m.role})
                  </span>
                  <a
                    href={`tel:${m.phone}`}
                    className="text-cyan-400 hover:underline font-mono-data"
                  >
                    <Phone className="w-3 h-3 inline mr-1" />
                    {m.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl text-center space-y-1">
          <div className="text-lg sm:text-xl font-black text-cyan-400 font-mono-data">
            {totalDutyHours}h
          </div>
          <div className="text-[11px] text-slate-400 font-mono-data uppercase">
            Tổng Giờ Trực Tháng
          </div>
        </div>

        <div className="p-3.5 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl text-center space-y-1">
          <div className="text-lg sm:text-xl font-black text-purple-400 font-mono-data">
            {String(totalNightShifts).padStart(2, '0')}
          </div>
          <div className="text-[11px] text-slate-400 font-mono-data uppercase">
            Ca Trực Đêm
          </div>
        </div>

        <div className="p-3.5 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl text-center space-y-1">
          <div className="text-lg sm:text-xl font-black text-rose-400 font-mono-data">
            {String(totalOvertimeShifts).padStart(2, '0')}
          </div>
          <div className="text-[11px] text-slate-400 font-mono-data uppercase">
            Trực Tăng Cường OT
          </div>
        </div>

        <div className="p-3.5 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl text-center space-y-1">
          <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono-data">
            100%
          </div>
          <div className="text-[11px] text-slate-400 font-mono-data uppercase">
            Đúng Giờ GPS
          </div>
        </div>

        <div className="p-3.5 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl text-center space-y-1 col-span-2 sm:col-span-1">
          <div className="text-lg sm:text-xl font-black text-amber-400 font-mono-data">
            12 Ngày
          </div>
          <div className="text-[11px] text-slate-400 font-mono-data uppercase">
            Phép Năm Còn Lại
          </div>
        </div>
      </div>

      {/* 3. VIEW MODE CONTROLLER & FILTER TOOLBAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#0F172A] border border-slate-800 p-3 rounded-2xl shadow-xl">
        {/* View mode switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'month'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Lịch Tháng (30 Ngày)</span>
          </button>

          <button
            onClick={() => setViewMode('week')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'week'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Lịch Tuần (7 Ngày)</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Danh Sách Ca</span>
          </button>

          <button
            onClick={() => setViewMode('requests')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'requests'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Quản Lý Đơn</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-mono-data text-[10px] font-black">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick Shift Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shift Type Filter */}
          {viewMode !== 'requests' && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterShiftType}
                onChange={(e) => setFilterShiftType(e.target.value as any)}
                className="bg-transparent text-slate-300 font-mono-data text-xs outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">Lọc ca: Tất cả</option>
                <option value="morning" className="bg-slate-900">Ca Sáng (06h-14h)</option>
                <option value="afternoon" className="bg-slate-900">Ca Chiều (14h-22h)</option>
                <option value="night" className="bg-slate-900">Ca Đêm (22h-06h)</option>
                <option value="full_day" className="bg-slate-900">Trực Chiến 24h</option>
                <option value="off" className="bg-slate-900">Nghỉ Ca</option>
              </select>
            </div>
          )}

          <button
            onClick={() => setShowSwapModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Đổi Ca</span>
          </button>

          <button
            onClick={() => setShowLeaveModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Xin Nghỉ</span>
          </button>

          <button
            onClick={handleExportSchedule}
            title="Xuất file lịch trực PDF & iCal"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. MAIN SCHEDULE VIEW CONTAINER */}
      {viewMode === 'month' && (
        <ShiftMonthCalendar
          currentDate={currentCalendarDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleTodayMonth}
          schedules={schedules}
          selectedDateStr={selectedShift?.date || null}
          onSelectShift={(shift) => setSelectedShift(shift)}
          onQuickRegisterDate={handleQuickRegisterDate}
          filterShiftType={filterShiftType}
        />
      )}

      {viewMode === 'week' && (
        <ShiftWeekCalendar
          currentWeekStart={currentWeekMonday}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onCurrentWeek={handleCurrentWeek}
          schedules={schedules}
          selectedDateStr={selectedShift?.date || null}
          onSelectShift={(shift) => setSelectedShift(shift)}
          onRequestSwap={handleOpenSwapForShift}
          onQuickRegisterDate={handleQuickRegisterDate}
          filterShiftType={filterShiftType}
        />
      )}

      {viewMode === 'list' && (
        <ShiftListView
          schedules={schedules}
          onSelectShift={(shift) => setSelectedShift(shift)}
          onRequestSwap={handleOpenSwapForShift}
          onExportSchedule={handleExportSchedule}
        />
      )}

      {viewMode === 'requests' && (
        <ShiftRequestsManager
          registrationRequests={registrationRequests}
          swapRequests={swapRequests}
          leaveRequests={leaveRequests}
          onCancelRegistration={handleCancelRegistration}
          onCancelSwap={handleCancelSwap}
          onCancelLeave={handleCancelLeave}
          onOpenRegisterModal={() => setShowRegisterModal(true)}
          onOpenSwapModal={() => setShowSwapModal(true)}
          onOpenLeaveModal={() => setShowLeaveModal(true)}
        />
      )}

      {/* 5. MODALS & DRAWERS */}
      {/* Shift Detail Drawer */}
      <ShiftDetailDrawer
        shift={selectedShift}
        onClose={() => setSelectedShift(null)}
        onRequestSwap={handleOpenSwapForShift}
        onCheckInToggle={handleCheckInToggle}
      />

      {/* Register Shift Modal */}
      <ShiftRegisterModal
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          setQuickRegisterDate(undefined);
        }}
        onSubmit={handleCreateRegistration}
        initialDate={quickRegisterDate}
      />

      {/* Leave Request Modal */}
      <ShiftLeaveModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSubmit={handleCreateLeave}
      />

      {/* Shift Swap Modal Form */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Fullscreen Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
            onClick={() => setShowSwapModal(false)}
          />

          {/* Centering Dialog Container */}
          <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
            <div className="relative z-10 w-full max-w-lg bg-[#0F172A] border border-cyan-500/40 rounded-2xl shadow-2xl p-5 text-white text-left space-y-4 my-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-base">Đăng Ký Đổi Ca Trực Quân Số</h3>
                </div>
                <button
                  onClick={() => setShowSwapModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSwap} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono-data mb-1">
                    Ngày muốn đổi ca:
                  </label>
                  <input
                    type="date"
                    value={swapTargetDate}
                    onChange={(e) => setSwapTargetDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono-data focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono-data mb-1">
                    Đồng đội đổi ca cùng:
                  </label>
                  <select
                    value={swapTargetStaff}
                    onChange={(e) => setSwapTargetStaff(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Đ/c Lê Văn Toàn (Kíp 2)">
                      Đ/c Lê Văn Toàn (Kíp 2 - Trạm PCCC Q.1)
                    </option>
                    <option value="Đ/c Phạm Văn Thắng (Kíp 3)">
                      Đ/c Phạm Văn Thắng (Kíp 3 - Trạm PCCC Q.1)
                    </option>
                    <option value="Đ/c Trần Quốc Toàn (Kíp 1)">
                      Đ/c Trần Quốc Toàn (Kíp 1 - Trạm PCCC Q.1)
                    </option>
                    <option value="Đ/c Đặng Quốc Huy (Kíp 3)">
                      Đ/c Đặng Quốc Huy (Kíp 3 - Trạm PCCC Q.1)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono-data mb-1">
                      Ca gốc hiện tại:
                    </label>
                    <select
                      value={swapOriginalShift}
                      onChange={(e) => setSwapOriginalShift(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="morning">Ca Sáng (06h - 14h)</option>
                      <option value="afternoon">Ca Chiều (14h - 22h)</option>
                      <option value="night">Ca Đêm (22h - 06h)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono-data mb-1">
                      Ca muốn nhận lại:
                    </label>
                    <select
                      value={swapTargetShift}
                      onChange={(e) => setSwapTargetShift(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="morning">Ca Sáng (06h - 14h)</option>
                      <option value="afternoon">Ca Chiều (14h - 22h)</option>
                      <option value="night">Ca Đêm (22h - 06h)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono-data mb-1">
                    Lý do xin đổi ca:
                  </label>
                  <textarea
                    rows={3}
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    placeholder="Ghi rõ lý do cần hoán đổi ca trực tác chiến..."
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowSwapModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-cyan-950"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gửi Đơn Xin Đổi Ca
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
