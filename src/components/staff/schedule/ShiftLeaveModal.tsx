import React, { useState } from 'react';
import {
  X,
  Coffee,
  Send,
  Calendar,
  AlertCircle,
  FileText,
  Phone,
} from 'lucide-react';
import type { ShiftLeaveRequest } from '../../../types/staff';

interface ShiftLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<ShiftLeaveRequest, 'id' | 'createdAt' | 'status'>) => void;
}

export const ShiftLeaveModal: React.FC<ShiftLeaveModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [leaveType, setLeaveType] = useState<'annual' | 'compensatory' | 'sick' | 'personal'>('compensatory');
  const [startDate, setStartDate] = useState<string>('2026-09-17');
  const [endDate, setEndDate] = useState<string>('2026-09-17');
  const [totalDays, setTotalDays] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('0908 774 901');

  if (!isOpen) return null;

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate < val) {
      setEndDate(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    onSubmit({
      staffId: 'staff-901',
      staffName: 'Đ/c Nguyễn Văn An',
      leaveType,
      startDate,
      endDate,
      totalDays: Number(totalDays) || 1,
      reason,
      emergencyContact,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Fullscreen Backdrop Blur */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Centering Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="relative z-10 w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-5 text-slate-900 text-left space-y-4 my-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Đăng Ký Nghỉ Phép / Nghỉ Bù</h3>
                <p className="text-[11px] text-slate-500 font-mono-data">
                  Gửi Ban Chỉ Huy Đơn Vị & Điều Phối CAD
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-mono-data mb-1">Loại hình nghỉ phép:</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-red-500 focus:outline-none"
              >
                <option value="compensatory">Nghỉ Bù (Sau ca trực đêm / trực lễ)</option>
                <option value="annual">Nghỉ Phép Năm Định Kỳ (Còn 12 ngày)</option>
                <option value="sick">Nghỉ Ốm / Điều Trị Quân Y</option>
                <option value="personal">Nghỉ Việc Riêng Đột Xuất</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-mono-data mb-1">Từ ngày:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono-data focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-mono-data mb-1">Đến ngày:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono-data focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-mono-data mb-1">Tổng số ngày nghỉ:</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono-data focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-mono-data mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-red-500" />
                  <span>Số ĐT khẩn cấp:</span>
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono-data focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-mono-data mb-1">Lý do xin nghỉ:</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ghi rõ lý do xin nghỉ phép / nghỉ bù..."
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:border-red-500 focus:outline-none placeholder:text-slate-400"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                Gửi Đơn Xin Nghỉ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
