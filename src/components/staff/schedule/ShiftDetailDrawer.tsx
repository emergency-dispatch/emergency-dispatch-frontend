import React from 'react';
import {
  X,
  Building2,
  Radio,
  Clock,
  Users,
  Phone,
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Info,
  MapPin,
  Sparkles,
} from 'lucide-react';
import type { ShiftScheduleItem } from '../../../types/staff';
import { SHIFT_TYPE_CONFIG } from './ShiftMonthCalendar';

interface ShiftDetailDrawerProps {
  shift: ShiftScheduleItem | null;
  onClose: () => void;
  onRequestSwap: (shift: ShiftScheduleItem) => void;
  onCheckInToggle?: () => void;
}

export const ShiftDetailDrawer: React.FC<ShiftDetailDrawerProps> = ({
  shift,
  onClose,
  onRequestSwap,
  onCheckInToggle,
}) => {
  if (!shift) return null;

  const config = SHIFT_TYPE_CONFIG[shift.shiftType];
  const isToday = shift.date === '2026-09-08';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fullscreen Backdrop Blur */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="relative z-10 w-screen max-w-md bg-[#0B0F19] border-l border-slate-800 shadow-2xl p-5 overflow-y-auto flex flex-col justify-between text-white space-y-4 animate-fadeIn">
        {/* Header */}
        <div className="space-y-3 pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-mono-data text-cyan-400 uppercase tracking-wider font-bold">
                  CHI TIẾT CA TRỰC TÁC CHIẾN
                </span>
                <h3 className="text-base font-black text-white">
                  {shift.dayOfWeek} — {shift.date}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Shift Type Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${config.bgClass} ${config.borderClass} ${config.textClass}`}
          >
            <div className="flex items-center gap-2">
              <config.icon className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-bold text-sm">{config.label}</div>
                <div className="text-xs font-mono-data text-slate-300">
                  {shift.startTime} - {shift.endTime} ({shift.dutyHours || 8} giờ)
                </div>
              </div>
            </div>

            {shift.isOvertime && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/50 text-[10px] font-mono-data font-bold">
                Tăng Cường OT
              </span>
            )}
          </div>
        </div>

        {/* Body Details */}
        <div className="space-y-4 flex-1 text-xs">
          {/* Station & Vehicle Card */}
          <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
            <div className="text-slate-400 font-mono-data uppercase text-[10px] flex items-center gap-1.5 font-bold">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              ĐƠN VỊ & PHƯƠNG TIỆN PHÂN CÔNG
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{shift.stationName || 'Chưa phân công'}</span>
              </div>
              {shift.vehiclePlate !== '-' && (
                <div className="text-cyan-400 font-mono-data font-bold text-xs flex items-center gap-1.5 pt-1">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Biển Số Xe: {shift.vehiclePlate}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Vị trí kíp xe:</span>
              <span className="font-bold text-white">{shift.role}</span>
            </div>
          </div>

          {/* GPS Check-in & Time Record Card */}
          <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
            <div className="text-slate-400 font-mono-data uppercase text-[10px] flex items-center gap-1.5 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              ĐIỂM DANH GPS & NHẬT KÝ CA
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Giờ vào ca:</div>
                <div className="text-emerald-400 font-mono-data font-bold text-xs">
                  {shift.checkInTime || (shift.status === 'scheduled' ? 'Chưa điểm danh' : '-')}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Giờ kết thúc:</div>
                <div className="text-slate-300 font-mono-data font-bold text-xs">
                  {shift.checkOutTime || (shift.status === 'completed' ? '14:10' : '-')}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">Trạng thái:</span>
              {shift.status === 'checked_in' && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono-data font-bold flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Đang Trực Tác Chiến
                </span>
              )}
              {shift.status === 'completed' && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono-data text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-slate-500" />
                  Đã Hoàn Thành
                </span>
              )}
              {shift.status === 'scheduled' && (
                <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono-data text-[10px]">
                  Đã Lên Lịch Sẵn Sàng
                </span>
              )}
              {shift.status === 'swapped' && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono-data text-[10px]">
                  Đã Đổi Ca
                </span>
              )}
            </div>
          </div>

          {/* Crew Members List */}
          {shift.teamMembers && shift.teamMembers.length > 0 && (
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
              <div className="text-slate-400 font-mono-data uppercase text-[10px] flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  ĐỒNG ĐỘI KÍP XE ({shift.teamMembers.length})
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {shift.teamMembers.map((member) => (
                  <div
                    key={member.name}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{member.name}</div>
                      <div className="text-[10px] text-slate-400">{member.role}</div>
                    </div>
                    <a
                      href={`tel:${member.phone}`}
                      className="px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-500/40 font-mono-data text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{member.phone}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operational Notes */}
          {shift.note && (
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-slate-300 italic text-[11px]">
              <strong className="not-italic text-slate-400 font-mono-data block mb-0.5">
                Chỉ đạo tác chiến / Ghi chú:
              </strong>
              {shift.note}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          {isToday && onCheckInToggle && (
            <button
              onClick={onCheckInToggle}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 text-xs transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {shift.status === 'checked_in'
                  ? 'Bàn Giao & Kết Thúc Ca'
                  : 'Điểm Danh GPS Vào Ca Trực'}
              </span>
            </button>
          )}

          {shift.shiftType !== 'off' && shift.status !== 'completed' && (
            <button
              onClick={() => {
                onClose();
                onRequestSwap(shift);
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Đăng Ký Đổi Ca Trực Này</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
