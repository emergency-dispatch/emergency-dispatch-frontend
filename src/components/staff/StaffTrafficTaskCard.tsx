import React, { useState } from 'react';
import {
  Car,
  AlertTriangle,
  MapPin,
  Clock,
  CheckCircle2,
  FileText,
  Navigation,
  Loader2,
  ShieldAlert,
  X,
  ExternalLink,
} from 'lucide-react';
import type { TrafficHotspotResponseDto } from '../../services/liveMapService';
import { staffAudioService } from '../../services/staffAudioService';

export interface ActiveTrafficTask extends TrafficHotspotResponseDto {
  taskNotes?: string | null;
}

interface StaffTrafficTaskCardProps {
  task: ActiveTrafficTask;
  onResolve: (hotspotId: string, note?: string) => Promise<boolean>;
}

export const StaffTrafficTaskCard: React.FC<StaffTrafficTaskCardProps> = ({
  task,
  onResolve,
}) => {
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCongestionBadge = (level?: string) => {
    switch (level) {
      case 'Blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
            TẮC NGHẼN HOÀN TOÀN (BLOCKED)
          </span>
        );
      case 'Severe':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
            KẸT XE NGHIÊM TRỌNG (SEVERE)
          </span>
        );
      case 'Moderate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
            ÙN Ứ VỪA (MODERATE)
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300">
            ÙN Ứ NHẸ (LOW)
          </span>
        );
    }
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      staffAudioService.playSuccessChime();
      const success = await onResolve(task.id, resolveNote.trim() || undefined);
      if (success) {
        setIsResolveModalOpen(false);
        setResolveNote('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-2 border-amber-400 bg-white rounded-2xl p-4 sm:p-5 shadow-md space-y-3.5 relative overflow-hidden animate-fadeIn">
        {/* Top Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <Car className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-950">
                  NHIỆM VỤ: GIẢI TỎA ĐIỂM NGHẼN (TRAFFIC TASK)
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-200 text-amber-900 border border-amber-300">
                  MỤC 20
                </span>
              </div>
              <p className="text-[11px] text-amber-800 font-medium">
                Lệnh điều động phân luồng giao thông / dọn chướng ngại vật từ Operator
              </p>
            </div>
          </div>

          <div>{getCongestionBadge(task.congestionLevel || task.congestionLevelName)}</div>
        </div>

        {/* Hotspot details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-slate-900 text-sm">{task.title}</p>
              {task.description && (
                <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">{task.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-700 bg-amber-50/60 p-2 rounded-xl border border-amber-200/80">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold truncate">{task.locationAddress}</span>
            </div>

            <div className="flex items-center justify-between gap-1 text-slate-700 bg-amber-50/60 p-2 rounded-xl border border-amber-200/80">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Xe nhận lệnh:</span>
              </span>
              <span className="font-mono font-bold text-red-600">
                {task.assignedUnitPlate || 'Xe kíp trực'}
              </span>
            </div>
          </div>

          {/* Operator Directives (Chỉ đạo từ trung tâm) */}
          {(task.taskNotes || task.resolutionNote) && (
            <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-950 flex items-start gap-2 text-xs">
              <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Chỉ đạo từ Tổng đài viên CAD:</strong>{' '}
                <span>{task.taskNotes || task.resolutionNote}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Đã giải tỏa */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <Navigation className="w-3.5 h-3.5 text-slate-600" />
            <span>Mở chỉ đường Google Maps</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            type="button"
            onClick={() => setIsResolveModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>BÁO CÁO ĐÃ GIẢI TỎA (HOÀN THÀNH)</span>
          </button>
        </div>
      </div>

      {/* Resolve Confirmation Modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleUp">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Báo Cáo Đã Giải Tỏa Điểm Nghẽn
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">PUT /api/traffic/{task.id}/resolve</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResolve} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">{task.title}</p>
                <p className="text-slate-600 text-[11px]">{task.locationAddress}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Ghi chú kết quả xử lý (Tùy chọn, tối đa 500 ký tự):
                </label>
                <textarea
                  rows={3}
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="Ví dụ: Đã phân luồng xe di chuyển thông suốt, dọn xong cành cây đổ chắn ngang đường..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  maxLength={500}
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Sau khi gửi báo cáo, điểm nghẽn sẽ được chuyển sang trạng thái <strong>Resolved</strong> và xe của tổ sẽ tự động quay trở lại trạng thái Sẵn sàng (Available).
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>ĐANG CẬP NHẬT...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>XÁC NHẬN ĐÃ GIẢI TỎA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

