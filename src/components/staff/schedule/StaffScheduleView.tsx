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
} from 'lucide-react';
import type { ShiftScheduleItem, ShiftSwapRequest, ShiftType } from '../../../types/staff';
import { mockShiftSchedules, mockShiftSwapRequests } from '../../../data/staffMock';
import { staffAudioService } from '../../../services/staffAudioService';

const SHIFT_TYPE_META: Record<ShiftType, { label: string; color: string; badge: string }> = {
  morning: {
    label: 'Ca Sáng (06:00 - 14:00)',
    color: 'text-amber-400',
    badge: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  },
  afternoon: {
    label: 'Ca Chiều (14:00 - 22:00)',
    color: 'text-cyan-400',
    badge: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
  },
  night: {
    label: 'Ca Đêm (22:00 - 06:00)',
    color: 'text-purple-400',
    badge: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
  },
  off: {
    label: 'Nghỉ Ca / Nghỉ Bù',
    color: 'text-slate-500',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
  },
};

export const StaffScheduleView: React.FC = () => {
  const [schedules, setSchedules] = useState<ShiftScheduleItem[]>(mockShiftSchedules);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>(mockShiftSwapRequests);
  const [isCheckInDone, setIsCheckInDone] = useState<boolean>(true);
  const [showSwapModal, setShowSwapModal] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Swap modal state
  const [swapTargetDate, setSwapTargetDate] = useState<string>('2026-09-12');
  const [swapTargetStaff, setSwapTargetStaff] = useState<string>('Đ/c Lê Văn Toàn (Kíp 2)');
  const [swapReason, setSwapReason] = useState<string>('');

  const todayShift = schedules.find((s) => s.id === 'shift-tue') || schedules[1];

  const handleCheckInToggle = () => {
    staffAudioService.playSuccessChime();
    const nextState = !isCheckInDone;
    setIsCheckInDone(nextState);
    setNotificationMsg(
      nextState
        ? 'Đã điểm danh vào ca trực thành công qua xác thực định vị GPS Trạm Q.1!'
        : 'Đã hoàn tất thủ tục bàn giao kết thúc ca trực.'
    );
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleCreateSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapReason) return;

    const newRequest: ShiftSwapRequest = {
      id: `swap-${Date.now()}`,
      fromStaffName: 'Đ/c Nguyễn Văn An',
      toStaffName: swapTargetStaff,
      targetDate: swapTargetDate,
      originalShift: 'afternoon',
      swapShift: 'morning',
      reason: swapReason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setSwapRequests([newRequest, ...swapRequests]);
    setShowSwapModal(false);
    setSwapReason('');
    staffAudioService.playSuccessChime();
    setNotificationMsg(`Đã gửi yêu cầu đổi ca trực ngày ${swapTargetDate} tới Ban Chỉ Huy!`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  return (
    <div className="space-y-5 p-1">
      {/* Toast notification */}
      {notificationMsg && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2 shadow-xl animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Header Card: Active Shift & Check-in Terminal */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono-data font-bold text-cyan-400">
                  CA TRỰC HIỆN TẠI
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono-data font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {isCheckInDone ? 'ĐÃ ĐIỂM DANH ON-DUTY' : 'CHƯA ĐIỂM DANH'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {todayShift.dayOfWeek} — {SHIFT_TYPE_META[todayShift.shiftType].label}
              </h2>
            </div>
          </div>

          {/* Check-in / Check-out button */}
          <button
            onClick={handleCheckInToggle}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95 ${
              isCheckInDone
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-950/60 border border-emerald-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isCheckInDone ? 'Kết Thúc & Bàn Giao Ca' : 'Điểm Danh Vào Ca (GPS Check-in)'}</span>
          </button>
        </div>

        {/* Shift Details: Station, Vehicle & Crew members */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono-data uppercase flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Đơn Vị & Phương Tiện Trực
            </div>
            <div className="text-sm font-bold text-white">{todayShift.stationName}</div>
            <div className="text-cyan-400 font-mono-data font-bold">Xe: {todayShift.vehiclePlate}</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono-data uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              Khung Giờ Tác Chiến
            </div>
            <div className="text-sm font-bold text-white">{todayShift.startTime} - {todayShift.endTime}</div>
            <div className="text-slate-400">Điểm danh lúc: <span className="text-emerald-400 font-mono-data">{todayShift.checkInTime || '13:48'}</span></div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono-data uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Đồng Đội Kíp Xe ({todayShift.teamMembers.length} người)
            </div>
            <div className="space-y-1 pt-0.5">
              {todayShift.teamMembers.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-slate-300">
                  <span>{m.name} ({m.role})</span>
                  <a href={`tel:${m.phone}`} className="text-cyan-400 hover:underline font-mono-data">
                    <Phone className="w-3 h-3 inline mr-1" />
                    {m.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Weekly Schedule Grid & Swap Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 7-Day Weekly Shift Calendar (8 Cols) */}
        <div className="lg:col-span-8 bg-[#0F172A] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Lịch Phân Công Ca Trực Tuần Này (07/09 - 13/09/2026)
              </h3>
            </div>

            <button
              onClick={() => setShowSwapModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 rounded-xl text-xs font-semibold transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Đăng Ký Đổi Ca</span>
            </button>
          </div>

          {/* Schedule List */}
          <div className="space-y-2.5">
            {schedules.map((shift) => {
              const meta = SHIFT_TYPE_META[shift.shiftType];
              const isToday = shift.id === 'shift-tue';

              return (
                <div
                  key={shift.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isToday
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs ${isToday ? 'text-cyan-400' : 'text-white'}`}>
                        {shift.dayOfWeek} ({shift.date})
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                      <span>Vị trí: <strong className="text-slate-200">{shift.role}</strong></span>
                      {shift.vehiclePlate !== '-' && (
                        <span>Xe: <strong className="text-cyan-400 font-mono-data">{shift.vehiclePlate}</strong></span>
                      )}
                      {shift.note && <span className="text-slate-500 italic">• {shift.note}</span>}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0">
                    {shift.status === 'completed' && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono-data flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                        Đã Hoàn Thành
                      </span>
                    )}
                    {shift.status === 'checked_in' && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono-data font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Đang Trực Ca
                      </span>
                    )}
                    {shift.status === 'scheduled' && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs font-mono-data">
                        Đã Lên Lịch
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Swap Requests & Shift Statistics (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Shift Stats Card */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <h4 className="text-xs font-mono-data font-bold uppercase tracking-wider text-slate-400">
              Thống Kê Ca Trực Tháng 09/2026
            </h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-lg font-black text-cyan-400 font-mono-data">168h</div>
                <div className="text-[10px] text-slate-400">Tổng giờ trực</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-lg font-black text-purple-400 font-mono-data">06</div>
                <div className="text-[10px] text-slate-400">Ca trực đêm</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-lg font-black text-emerald-400 font-mono-data">100%</div>
                <div className="text-[10px] text-slate-400">Đúng giờ GPS</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-lg font-black text-amber-400 font-mono-data">02</div>
                <div className="text-[10px] text-slate-400">Ngày nghỉ phép</div>
              </div>
            </div>
          </div>

          {/* Swap Requests Log */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono-data font-bold uppercase tracking-wider text-slate-400">
                Yêu Cầu Đổi Ca Trực
              </h4>
              <span className="text-xs text-cyan-400 font-mono-data">{swapRequests.length} đơn</span>
            </div>

            <div className="space-y-2">
              {swapRequests.map((req) => (
                <div key={req.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{req.targetDate}</span>
                    {req.status === 'approved' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-data font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        ĐÃ DUYỆT
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-data font-bold bg-amber-500/20 text-yellow-400 border border-amber-500/40">
                        CHỜ DUYỆT
                      </span>
                    )}
                  </div>
                  <div className="text-slate-300">
                    Đổi với: <strong className="text-slate-200">{req.toStaffName}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400 italic">Lý do: {req.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shift Swap Modal Form */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0F172A] border border-cyan-500/40 rounded-2xl shadow-2xl p-5 text-white space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base">Đăng Ký Đổi Ca Trực Quân Số</h3>
              </div>
              <button onClick={() => setShowSwapModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSwap} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono-data mb-1">Ngày muốn đổi ca:</label>
                <input
                  type="date"
                  value={swapTargetDate}
                  onChange={(e) => setSwapTargetDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono-data mb-1">Đồng đội đổi ca cùng:</label>
                <select
                  value={swapTargetStaff}
                  onChange={(e) => setSwapTargetStaff(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Đ/c Lê Văn Toàn (Kíp 2)">Đ/c Lê Văn Toàn (Kíp 2 - Trạm Q.1)</option>
                  <option value="Đ/c Phạm Văn Thắng (Kíp 3)">Đ/c Phạm Văn Thắng (Kíp 3 - Trạm Q.1)</option>
                  <option value="Đ/c Trần Quốc Toàn (Kíp 1)">Đ/c Trần Quốc Toàn (Kíp 1 - Trạm Q.1)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono-data mb-1">Lý do xin đổi ca:</label>
                <textarea
                  rows={3}
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="Ghi rõ lý do cần đổi ca trực..."
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
      )}
    </div>
  );
};
