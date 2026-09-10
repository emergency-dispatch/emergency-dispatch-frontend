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
  Eye,
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

  // Active View Mode (Default to Week view before Month view)
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('week');

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
      const assignedShiftType: ShiftType =
        data.dayShiftMap?.[dStr] ||
        (data.shiftTypes && data.shiftTypes[0]) ||
        data.shiftType ||
        'morning';

      const existingIdx = updatedSchedules.findIndex((s) => s.date === dStr);
      const newShiftItem: ShiftScheduleItem = {
        id: `shift-${dStr}`,
        date: dStr,
        dayOfWeek: new Date(dStr).toLocaleDateString('vi-VN', { weekday: 'long' }),
        shiftType: assignedShiftType,
        startTime:
          assignedShiftType === 'morning'
            ? '06:00'
            : assignedShiftType === 'afternoon'
            ? '14:00'
            : assignedShiftType === 'night'
            ? '22:00'
            : assignedShiftType === 'full_day'
            ? '08:00'
            : '-',
        endTime:
          assignedShiftType === 'morning'
            ? '14:00'
            : assignedShiftType === 'afternoon'
            ? '22:00'
            : assignedShiftType === 'night'
            ? '06:00'
            : assignedShiftType === 'full_day'
            ? '08:00 (hôm sau)'
            : '-',
        stationName: data.stationName,
        vehiclePlate: data.preferredVehicle || '51D-123.45',
        role: data.desiredRole,
        dutyHours: assignedShiftType === 'full_day' ? 24 : assignedShiftType === 'off' ? 0 : 8,
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
    const shiftsCountText = data.shiftTypes ? `(${data.shiftTypes.length} loại ca)` : '';
    showNotification(
      `Đã gửi đơn đăng ký ${data.dates.length} ngày ${shiftsCountText} thành công tới Ban Chỉ Huy CAD!`
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
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 shadow-sm animate-fadeIn border ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{notificationMsg.text}</span>
        </div>
      )}

      {/* 1. TOP KPI METRICS CARDS (Generous padding, clean Vietnamese typography) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Hours */}
        <div className="p-4 sm:p-5 bg-white border border-slate-200 hover:border-red-300 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-between group">
          <div className="space-y-1.5">
            <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono-data tracking-tight">
              {totalDutyHours}h
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-800">
              Tổng Giờ Trực Tháng
            </div>
            <div className="text-[11px] text-slate-500">
              Tháng 09/2026 (Đạt 100%)
            </div>
          </div>
          <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Metric 2: Night & OT */}
        <div className="p-4 sm:p-5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-between group">
          <div className="space-y-1.5">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-data tracking-tight">
              {String(totalNightShifts).padStart(2, '0')}{' '}
              <span className="text-slate-400 font-normal text-lg">/</span>{' '}
              <span className="text-red-600">{String(totalOvertimeShifts).padStart(2, '0')}</span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-800">
              Ca Đêm & Tăng Cường
            </div>
            <div className="text-[11px] text-slate-500">
              {totalNightShifts} đêm • {totalOvertimeShifts} ca tăng cường
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 group-hover:scale-110 transition-transform">
            <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Metric 3: Punctuality */}
        <div className="p-4 sm:p-5 bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-between group">
          <div className="space-y-1.5">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono-data tracking-tight">
              100%
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-800">
              Chỉ Số Đúng Giờ
            </div>
            <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3" />
              Định vị GPS chuẩn xác
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Metric 4: Leave balance */}
        <div className="p-4 sm:p-5 bg-white border border-slate-200 hover:border-amber-300 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-between group">
          <div className="space-y-1.5">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono-data tracking-tight">
              12 <span className="text-sm font-sans font-bold text-amber-700">Ngày</span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-800">
              Phép Năm Còn Lại
            </div>
            <div className="text-[11px] text-slate-500">
              Hạn dùng đến 31/12/2026
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 group-hover:scale-110 transition-transform">
            <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* 2. COMPACT UNIFIED TODAY'S ACTIVE SHIFT BANNER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm transition-all">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left: Shift info & badges */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200">
                  HÔM NAY: Thứ Ba (08/09/2026)
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                    isCheckInDone
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {isCheckInDone ? '● Đã Điểm Danh GPS' : '○ Chưa Điểm Danh'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-0.5">
                <span className="font-bold text-slate-900 text-sm">
                  {SHIFT_TYPE_CONFIG[todayShift.shiftType].label} ({todayShift.startTime} - {todayShift.endTime})
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {todayShift.stationName}
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-red-600 font-mono-data font-bold">
                  Xe: {todayShift.vehiclePlate}
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Kíp 3 cán bộ
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions (View Details, Register, Check-in) */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <button
              onClick={() => setSelectedShift(todayShift)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              title="Xem chi tiết ca trực hôm nay (Quân số kíp xe, phương tiện, lịch sử GPS)"
              aria-label="Xem chi tiết ca trực"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setQuickRegisterDate(undefined);
                setShowRegisterModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm shadow-sm border border-slate-300 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng Ký Ca Mới</span>
            </button>

            <button
              onClick={handleCheckInToggle}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 transition-all active:scale-95 ${
                isCheckInDone
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 border border-red-600 animate-pulse'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isCheckInDone ? 'Bàn Giao Ca' : 'Điểm Danh GPS'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. VIEW MODE CONTROLLER & FILTER TOOLBAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
        {/* View mode switcher */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'week'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Lịch Tuần (7 Ngày)</span>
          </button>

          <button
            onClick={() => setViewMode('month')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'month'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Lịch Tháng (30 Ngày)</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Danh Sách Ca</span>
          </button>

          <button
            onClick={() => setViewMode('requests')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'requests'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Quản Lý Đơn</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono-data text-[10px] font-black">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick Shift Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shift Type Filter */}
          {viewMode !== 'requests' && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterShiftType}
                onChange={(e) => setFilterShiftType(e.target.value as any)}
                className="bg-transparent text-slate-700 font-mono-data text-xs outline-none cursor-pointer"
              >
                <option value="all">Lọc ca: Tất cả</option>
                <option value="morning">Ca Sáng (06h-14h)</option>
                <option value="afternoon">Ca Chiều (14h-22h)</option>
                <option value="night">Ca Đêm (22h-06h)</option>
                <option value="full_day">Trực Chiến 24h</option>
                <option value="off">Nghỉ Ca</option>
              </select>
            </div>
          )}

          <button
            onClick={() => setShowSwapModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
            <span>Đổi Ca</span>
          </button>

          <button
            onClick={() => setShowLeaveModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Coffee className="w-3.5 h-3.5 text-slate-500" />
            <span>Xin Nghỉ</span>
          </button>

          <button
            onClick={handleExportSchedule}
            title="Xuất file lịch trực PDF & iCal"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. MAIN SCHEDULE VIEW CONTAINER */}
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowSwapModal(false)}
          />

          {/* Centering Dialog Container */}
          <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
            <div className="relative z-10 w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 text-slate-900 text-left space-y-4 my-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900">Đăng Ký Đổi Ca Trực Quân Số</h3>
                </div>
                <button
                  onClick={() => setShowSwapModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSwap} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-mono-data font-semibold mb-1">
                    Ngày muốn đổi ca:
                  </label>
                  <input
                    type="date"
                    value={swapTargetDate}
                    onChange={(e) => setSwapTargetDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono-data focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-mono-data font-semibold mb-1">
                    Đồng đội đổi ca cùng:
                  </label>
                  <select
                    value={swapTargetStaff}
                    onChange={(e) => setSwapTargetStaff(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-red-500 focus:outline-none cursor-pointer"
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
                    <label className="block text-slate-700 font-mono-data font-semibold mb-1">
                      Ca gốc hiện tại:
                    </label>
                    <select
                      value={swapOriginalShift}
                      onChange={(e) => setSwapOriginalShift(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-red-500 focus:outline-none cursor-pointer"
                    >
                      <option value="morning">Ca Sáng (06h - 14h)</option>
                      <option value="afternoon">Ca Chiều (14h - 22h)</option>
                      <option value="night">Ca Đêm (22h - 06h)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-mono-data font-semibold mb-1">
                      Ca muốn nhận lại:
                    </label>
                    <select
                      value={swapTargetShift}
                      onChange={(e) => setSwapTargetShift(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-red-500 focus:outline-none cursor-pointer"
                    >
                      <option value="morning">Ca Sáng (06h - 14h)</option>
                      <option value="afternoon">Ca Chiều (14h - 22h)</option>
                      <option value="night">Ca Đêm (22h - 06h)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-mono-data font-semibold mb-1">
                    Lý do xin đổi ca:
                  </label>
                  <textarea
                    rows={3}
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    placeholder="Ghi rõ lý do cần hoán đổi ca trực tác chiến..."
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowSwapModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20"
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
