import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeftRight,
  CalendarPlus,
  Coffee,
  Trash2,
  Building2,
  Calendar,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import type {
  ShiftRegistrationRequest,
  ShiftSwapRequest,
  ShiftLeaveRequest,
} from '../../../types/staff';
import { SHIFT_TYPE_CONFIG } from './ShiftMonthCalendar';

interface ShiftRequestsManagerProps {
  registrationRequests: ShiftRegistrationRequest[];
  swapRequests: ShiftSwapRequest[];
  leaveRequests: ShiftLeaveRequest[];
  onCancelRegistration: (id: string) => void;
  onCancelSwap: (id: string) => void;
  onCancelLeave: (id: string) => void;
  onOpenRegisterModal: () => void;
  onOpenSwapModal: () => void;
  onOpenLeaveModal: () => void;
}

export const ShiftRequestsManager: React.FC<ShiftRequestsManagerProps> = ({
  registrationRequests,
  swapRequests,
  leaveRequests,
  onCancelRegistration,
  onCancelSwap,
  onCancelLeave,
  onOpenRegisterModal,
  onOpenSwapModal,
  onOpenLeaveModal,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'registrations' | 'swaps' | 'leaves'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredRegistrations = registrationRequests.filter(
    (r) => statusFilter === 'all' || r.status === statusFilter
  );
  const filteredSwaps = swapRequests.filter(
    (s) => statusFilter === 'all' || s.status === statusFilter
  );
  const filteredLeaves = leaveRequests.filter(
    (l) => statusFilter === 'all' || l.status === statusFilter
  );

  const totalPending =
    registrationRequests.filter((r) => r.status === 'pending').length +
    swapRequests.filter((s) => s.status === 'pending').length +
    leaveRequests.filter((l) => l.status === 'pending').length;

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">
              Quản Lý Đơn Đăng Ký & Yêu Cầu Ca Trực
            </h3>
            {totalPending > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono-data font-bold text-xs">
                {totalPending} chờ duyệt
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono-data mt-0.5">
            Theo dõi trạng thái phê duyệt từ Ban Chỉ Huy Điều Hành CAD
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenRegisterModal}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-all"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Đăng Ký Ca Mới</span>
          </button>

          <button
            onClick={onOpenSwapModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Đổi Ca Trực</span>
          </button>

          <button
            onClick={onOpenLeaveModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Xin Nghỉ Phép</span>
          </button>
        </div>
      </div>

      {/* Tabs & Status Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tất Cả ({registrationRequests.length + swapRequests.length + leaveRequests.length})
          </button>

          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'registrations'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Đăng Ký Ca ({registrationRequests.length})
          </button>

          <button
            onClick={() => setActiveTab('swaps')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'swaps'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Đổi Ca ({swapRequests.length})
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'leaves'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Nghỉ Phép ({leaveRequests.length})
          </button>
        </div>

        {/* Status Dropdown Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">Tất cả trạng thái duyệt</option>
          <option value="pending">Đang Chờ Duyệt</option>
          <option value="approved">Đã Phê Duyệt</option>
          <option value="rejected">Bị Từ Chối</option>
        </select>
      </div>

      {/* Requests Content Body */}
      <div className="space-y-3">
        {/* 1. Shift Registration Requests */}
        {(activeTab === 'all' || activeTab === 'registrations') &&
          filteredRegistrations.map((req) => {
            const shiftCfg = SHIFT_TYPE_CONFIG[req.shiftType];

            return (
              <div
                key={req.id}
                className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                      <CalendarPlus className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="font-bold text-white text-xs">
                        Đăng Ký {req.registrationType === 'overtime' ? 'Trực Tăng Cường OT' : 'Ca Trực Mới'}
                      </span>
                      <span className="text-[11px] font-mono-data text-slate-400 ml-2">
                        #{req.id}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {req.status === 'approved' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono-data font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ĐÃ DUYỆT
                      </span>
                    )}
                    {req.status === 'pending' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono-data font-bold text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        CHỜ DUYỆT
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 font-mono-data font-bold text-[10px] flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        TỪ CHỐI
                      </span>
                    )}

                    {req.status === 'pending' && (
                      <button
                        onClick={() => onCancelRegistration(req.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Hủy đơn đăng ký này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-300">
                  <div>
                    <span className="text-slate-500 font-mono-data">Ngày đăng ký:</span>{' '}
                    <strong className="text-cyan-400 font-mono-data">{req.dates.join(', ')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono-data">Ca trực:</span>{' '}
                    <div className="inline-flex flex-wrap items-center gap-1 mt-0.5">
                      {req.shiftTypes && req.shiftTypes.length > 0 ? (
                        req.shiftTypes.map((st) => {
                          const cfg = SHIFT_TYPE_CONFIG[st];
                          return (
                            <span
                              key={st}
                              className={`px-1.5 py-0.2 rounded border font-bold text-[10px] ${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass}`}
                            >
                              {cfg.label}
                            </span>
                          );
                        })
                      ) : (
                        <span
                          className={`px-1.5 py-0.2 rounded border font-bold text-[10px] ${
                            SHIFT_TYPE_CONFIG[req.shiftType || 'morning'].bgClass
                          } ${SHIFT_TYPE_CONFIG[req.shiftType || 'morning'].borderClass} ${
                            SHIFT_TYPE_CONFIG[req.shiftType || 'morning'].textClass
                          }`}
                        >
                          {SHIFT_TYPE_CONFIG[req.shiftType || 'morning'].label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono-data">Đơn vị:</span>{' '}
                    <strong className="text-white">{req.stationName}</strong>
                  </div>
                </div>

                {req.reason && (
                  <div className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded-lg">
                    Lý do / Nguyện vọng: {req.reason}
                  </div>
                )}

                {req.approvedBy && (
                  <div className="text-[11px] text-emerald-400 font-mono-data flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>
                      Phê duyệt bởi: <strong>{req.approvedBy}</strong> ({req.responseNote})
                    </span>
                  </div>
                )}
              </div>
            );
          })}

        {/* 2. Shift Swap Requests */}
        {(activeTab === 'all' || activeTab === 'swaps') &&
          filteredSwaps.map((req) => (
            <div
              key={req.id}
              className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    <ArrowLeftRight className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="font-bold text-white text-xs">Yêu Cầu Hoán Đổi Ca Trực</span>
                    <span className="text-[11px] font-mono-data text-slate-400 ml-2">
                      #{req.id}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {req.status === 'approved' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono-data font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      ĐÃ DUYỆT
                    </span>
                  ) : req.status === 'pending' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono-data font-bold text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      CHỜ DUYỆT
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 font-mono-data font-bold text-[10px]">
                      TỪ CHỐI
                    </span>
                  )}

                  {req.status === 'pending' && (
                    <button
                      onClick={() => onCancelSwap(req.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Hủy đơn đổi ca này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-300">
                <div>
                  <span className="text-slate-500 font-mono-data">Ngày đổi ca:</span>{' '}
                  <strong className="text-white font-mono-data">{req.targetDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-mono-data">Đồng đội hoán đổi:</span>{' '}
                  <strong className="text-cyan-300">{req.toStaffName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-mono-data">Hoán đổi:</span>{' '}
                  <strong className="text-slate-200">
                    {req.originalShift} ➔ {req.swapShift}
                  </strong>
                </div>
              </div>

              {req.reason && (
                <div className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded-lg">
                  Lý do: {req.reason}
                </div>
              )}

              {req.approvedBy && (
                <div className="text-[11px] text-emerald-400 font-mono-data flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    Chỉ huy phê duyệt: <strong>{req.approvedBy}</strong> ({req.responseNote})
                  </span>
                </div>
              )}
            </div>
          ))}

        {/* 3. Shift Leave Requests */}
        {(activeTab === 'all' || activeTab === 'leaves') &&
          filteredLeaves.map((req) => (
            <div
              key={req.id}
              className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <Coffee className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="font-bold text-white text-xs">
                      Đơn Xin Nghỉ Phép / Nghỉ Bù ({req.totalDays} ngày)
                    </span>
                    <span className="text-[11px] font-mono-data text-slate-400 ml-2">
                      #{req.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'approved' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono-data font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      ĐÃ DUYỆT
                    </span>
                  ) : req.status === 'pending' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono-data font-bold text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      CHỜ DUYỆT
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 font-mono-data font-bold text-[10px]">
                      TỪ CHỐI
                    </span>
                  )}

                  {req.status === 'pending' && (
                    <button
                      onClick={() => onCancelLeave(req.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Hủy đơn xin nghỉ này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-300">
                <div>
                  <span className="text-slate-500 font-mono-data">Thời gian nghỉ:</span>{' '}
                  <strong className="text-amber-300 font-mono-data">
                    {req.startDate} {req.startDate !== req.endDate ? `➔ ${req.endDate}` : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-mono-data">Loại nghỉ:</span>{' '}
                  <strong className="text-white">
                    {req.leaveType === 'compensatory'
                      ? 'Nghỉ bù sau ca trực đêm'
                      : req.leaveType === 'annual'
                      ? 'Nghỉ phép năm định kỳ'
                      : 'Nghỉ việc riêng'}
                  </strong>
                </div>
              </div>

              {req.reason && (
                <div className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded-lg">
                  Lý do: {req.reason}
                </div>
              )}
            </div>
          ))}

        {filteredRegistrations.length === 0 &&
          filteredSwaps.length === 0 &&
          filteredLeaves.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              Chưa có đơn đăng ký hay yêu cầu nào phù hợp với bộ lọc hiện tại.
            </div>
          )}
      </div>
    </div>
  );
};
