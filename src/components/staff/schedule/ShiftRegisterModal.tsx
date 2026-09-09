import React, { useState } from 'react';
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

export const ShiftRegisterModal: React.FC<ShiftRegisterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
}) => {
  const [regType, setRegType] = useState<ShiftRegistrationType>('regular');
  const [selectedDates, setSelectedDates] = useState<string[]>(
    initialDate ? [initialDate] : ['2026-09-15']
  );
  const [newDateInput, setNewDateInput] = useState<string>('2026-09-16');
  const [shiftType, setShiftType] = useState<ShiftType>('morning');
  const [stationName, setStationName] = useState<string>(mockAvailableStations[0]);
  const [desiredRole, setDesiredRole] = useState<string>(mockAvailableRoles[0]);
  const [preferredVehicle, setPreferredVehicle] = useState<string>(mockAvailableVehicles[0].plate);
  const [reason, setReason] = useState<string>('');

  if (!isOpen) return null;

  const handleAddDate = () => {
    if (newDateInput && !selectedDates.includes(newDateInput)) {
      setSelectedDates([...selectedDates, newDateInput].sort());
    }
  };

  const handleRemoveDate = (dateToRemove: string) => {
    if (selectedDates.length > 1) {
      setSelectedDates(selectedDates.filter((d) => d !== dateToRemove));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDates.length === 0) return;

    onSubmit({
      staffId: 'staff-901',
      staffName: 'Đ/c Nguyễn Văn An',
      registrationType: regType,
      dates: selectedDates,
      shiftType,
      stationName,
      desiredRole,
      preferredVehicle,
      reason,
    });
  };

  const SHIFT_OPTIONS: { type: ShiftType; title: string; time: string; icon: React.ElementType }[] = [
    { type: 'morning', title: 'Ca Sáng', time: '06:00 - 14:00 (8h)', icon: Sun },
    { type: 'afternoon', title: 'Ca Chiều', time: '14:00 - 22:00 (8h)', icon: Sunset },
    { type: 'night', title: 'Ca Đêm', time: '22:00 - 06:00 (8h)', icon: Moon },
    { type: 'full_day', title: 'Trực Chiến 24h', time: '08:00 - 08:00 (24h)', icon: Flame },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Fullscreen Backdrop Blur */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Centering Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="relative z-10 w-full max-w-2xl bg-[#0F172A] border border-cyan-500/40 rounded-2xl shadow-2xl p-5 sm:p-6 text-white text-left space-y-5 my-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Đăng Ký Lịch Trực / Ca Làm Việc Mới
              </h3>
              <p className="text-xs text-slate-400 font-mono-data">
                Hệ thống tiếp nhận & điều phối ca trực tự động ResQ CAD
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
              Loại hình đăng ký ca trực:
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
                <div className="font-bold text-xs text-white">1. Ca Trực Định Kỳ / Tháng Mới</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Đăng ký nguyện vọng lịch chuẩn theo chu kỳ
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
                  <span>2. Trực Tăng Cường (Overtime)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Đăng ký tác chiến cao điểm, lễ hội, cuối tuần
                </div>
              </button>
            </div>
          </div>

          {/* 2. Select Shift Type */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-mono-data font-semibold">
              Chọn ca trực mong muốn:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SHIFT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSel = shiftType === opt.type;
                const cfg = SHIFT_TYPE_CONFIG[opt.type];

                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setShiftType(opt.type)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                      isSel
                        ? `${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass} ring-1 ${cfg.borderClass} shadow-lg shadow-cyan-950/30`
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="font-bold text-xs">{opt.title}</span>
                    <span className="text-[10px] font-mono-data text-slate-400 mt-0.5">
                      {opt.time}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Dates Picker & Date Chips */}
          <div className="space-y-2 p-3 bg-slate-900/90 rounded-xl border border-slate-800">
            <label className="block text-slate-300 font-mono-data font-semibold">
              Các ngày đăng ký ({selectedDates.length} ngày):
            </label>

            {/* Date Chips */}
            <div className="flex flex-wrap gap-1.5">
              {selectedDates.map((d) => (
                <span
                  key={d}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 font-mono-data text-xs flex items-center gap-1.5"
                >
                  <span>{d}</span>
                  {selectedDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(d)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            {/* Add more dates input */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="date"
                value={newDateInput}
                onChange={(e) => setNewDateInput(e.target.value)}
                className="flex-1 p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono-data focus:border-cyan-500 focus:outline-none text-xs"
              />
              <button
                type="button"
                onClick={handleAddDate}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white border border-slate-700 rounded-xl font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Ngày</span>
              </button>
            </div>
          </div>

          {/* 4. Station, Role, and Vehicle Selection */}
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

          {/* 5. Notes / Reason */}
          <div>
            <label className="block text-slate-400 font-mono-data mb-1">
              Ghi chú & Nguyện vọng tác chiến (Tùy chọn):
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ lý do nếu đăng ký trực tăng cường hoặc yêu cầu hỗ trợ đặc biệt..."
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/60 border border-cyan-400"
            >
              <Send className="w-4 h-4" />
              <span>Gửi Đơn Đăng Ký Lịch Trực</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
};
