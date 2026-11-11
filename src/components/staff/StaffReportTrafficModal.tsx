import React, { useState } from 'react';
import {
  X,
  AlertOctagon,
  Car,
  MapPin,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { TrafficCongestionLevel } from '../../types/incident';
import type { ReportTrafficHotspotDto } from '../../services/liveMapService';
import { staffAudioService } from '../../services/staffAudioService';

interface StaffReportTrafficModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (dto: ReportTrafficHotspotDto) => Promise<boolean>;
  defaultLat?: number;
  defaultLng?: number;
  defaultAddress?: string;
  reporterName?: string;
}

const CONGESTION_OPTIONS: {
  value: TrafficCongestionLevel;
  label: string;
  description: string;
  badgeBg: string;
}[] = [
  {
    value: 'Moderate',
    label: 'Ùn ứ vừa (Moderate)',
    description: 'Di chuyển chậm nhưng xe vẫn qua được',
    badgeBg: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  },
  {
    value: 'Severe',
    label: 'Kẹt xe nghiêm trọng (Severe)',
    description: 'Xe cộ dồn ứ kéo dài, khó khăn lớn khi di chuyển',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  {
    value: 'Blocked',
    label: 'Tắc nghẽn hoàn toàn (Blocked)',
    description: 'Tắc chết / Vật cản chắn ngang đường (cây ngã, ngập sâu)',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-300',
  },
];

const QUICK_TITLES = [
  'Ùn tắc giao thông nghiêm trọng',
  'Cây ngã đổ chắn ngang làn đường',
  'Ngập nước sâu xe cứu hộ không qua được',
  'Va chạm giữa các phương tiện gây tắc nghẽn',
  'Công trường đang thi công chặn luồng xe',
];

export const StaffReportTrafficModal: React.FC<StaffReportTrafficModalProps> = ({
  visible,
  onClose,
  onSubmit,
  defaultLat = 10.8441,
  defaultLng = 106.8089,
  defaultAddress = 'Khu Công nghệ cao TP.HCM',
  reporterName = 'Kíp xe cứu hộ',
}) => {
  const [title, setTitle] = useState('');
  const [congestionLevel, setCongestionLevel] = useState<TrafficCongestionLevel>('Severe');
  const [locationAddress, setLocationAddress] = useState(defaultAddress);
  const [description, setDescription] = useState('');
  const [ttlMinutes, setTtlMinutes] = useState(45);
  const [latitude, setLatitude] = useState(defaultLat);
  const [longitude, setLongitude] = useState(defaultLng);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!visible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề điểm nghẽn.');
      return;
    }
    if (!locationAddress.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ / tuyến đường xảy ra ùn tắc.');
      return;
    }

    setIsSubmitting(true);
    try {
      staffAudioService.playPriorityBeep();
      const payload: ReportTrafficHotspotDto = {
        title: title.trim(),
        description: description.trim() || null,
        latitude,
        longitude,
        locationAddress: locationAddress.trim(),
        congestionLevel,
        reporterName,
        ttlMinutes,
      };

      const success = await onSubmit(payload);
      if (success) {
        onClose();
        // Reset form
        setTitle('');
        setDescription('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi báo cáo điểm nghẽn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Báo Cáo Điểm Nghẽn / Chướng Ngại Vật Giao Thông
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                API POST /api/traffic/report • Phát cảnh báo Live Map
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Gợi ý điểm nghẽn thường gặp:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTitle(t)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-900 border border-slate-200 transition-colors text-left"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">
              Tiêu đề điểm nghẽn <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Kẹt xe nặng tại nút giao D1 - D2..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-medium"
              required
            />
          </div>

          {/* Congestion Level Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Mức độ ùn tắc:</label>
            <div className="grid grid-cols-1 gap-2">
              {CONGESTION_OPTIONS.map((opt) => {
                const isSelected = congestionLevel === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCongestionLevel(opt.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? `${opt.badgeBg} shadow-xs ring-1 ring-amber-400 font-bold`
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold text-xs">{opt.label}</p>
                      <p className="text-[11px] opacity-80 mt-0.5">{opt.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Address */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Địa chỉ / Tuyến đường <span className="text-red-500">*</span>:</span>
              <span className="font-mono text-[10px] text-slate-400">
                GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Nhập tên đường hoặc giao lộ xảy ra tắc nghẽn..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Mô tả chi tiết nguyên nhân / tình trạng:</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả nguyên nhân (va chạm, cây đổ, ngập nước...) để xe cứu hộ khác chủ động né tránh..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
              maxLength={1000}
            />
          </div>

          {/* TTL Preset */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Thời gian hiển thị cảnh báo (TTL):</span>
              <span className="font-mono text-amber-600 font-bold">{ttlMinutes} phút</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setTtlMinutes(mins)}
                  className={`py-1.5 rounded-xl font-mono font-bold text-xs border transition-all ${
                    ttlMinutes === mins
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {mins} phút
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Điểm nghẽn sẽ được hiển thị ngay tức thì trên Live Map của Điều phối viên CAD và cảnh báo cho các kíp xe cứu hộ khác để né tuyến đường ùn tắc.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>ĐANG PHÁT CẢNH BÁO...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>PHÁT CẢNH BÁO ĐIỂM NGHẼN</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

