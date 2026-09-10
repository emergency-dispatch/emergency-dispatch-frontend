import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  PhoneCall, 
  MapPin, 
  Camera, 
  Mic, 
  Send, 
  CheckCircle2, 
  Flame, 
  Car, 
  HeartPulse, 
  ShieldAlert, 
  Sparkles,
  Truck
} from 'lucide-react';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose }) => {
  const [selectedHazard, setSelectedHazard] = useState<string>('traffic');
  const [submittingState, setSubmittingState] = useState<'idle' | 'analyzing' | 'dispatched'>('idle');
  const [hasPhoto, setHasPhoto] = useState<boolean>(true);

  if (!isOpen) return null;

  const hazardOptions = [
    { id: 'traffic', label: 'Tai nạn giao thông', icon: Car },
    { id: 'fire', label: 'Hỏa hoạn & Khói', icon: Flame },
    { id: 'medical', label: 'Cấp cứu y tế', icon: HeartPulse },
    { id: 'security', label: 'An ninh & Trật tự', icon: ShieldAlert },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingState('analyzing');
    setTimeout(() => {
      setSubmittingState('dispatched');
    }, 2000);
  };

  const handleReset = () => {
    setSubmittingState('idle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 border border-slate-200 shadow-2xl text-slate-900 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-5 h-5" />
        </button>

        {submittingState === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Phát tín hiệu cứu nạn SOS</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 font-bold">
                    ƯU TIÊN CẤP 1
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Hệ thống tiếp nhận cứu hộ khẩn cấp ResQ-AI
                </p>
              </div>
            </div>

            {/* Emergency Direct Hotlines Box */}
            <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-red-700 font-medium">
                <PhoneCall className="w-4 h-4 text-red-600 shrink-0" />
                <span>Nguy hiểm cận kề? Gọi ngay tổng đài:</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="tel:113"
                  className="px-3 py-1 rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-mono text-xs font-bold transition-colors shadow-xs"
                >
                  113 (Cảnh sát)
                </a>
                <a
                  href="tel:114"
                  className="px-3 py-1 rounded-md bg-red-600 text-white font-mono text-xs font-bold hover:bg-red-700 transition-colors shadow-xs"
                >
                  114 (Cứu hỏa)
                </a>
                <a
                  href="tel:115"
                  className="px-3 py-1 rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-mono text-xs font-bold transition-colors shadow-xs"
                >
                  115 (Cấp cứu)
                </a>
              </div>
            </div>

            {/* Incident Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
                Chọn loại tình huống khẩn cấp:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {hazardOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedHazard === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setSelectedHazard(opt.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-2 border-red-600 bg-red-50 text-red-600 font-bold shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GPS Telemetry Pill */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-red-600" />
                <div className="text-xs">
                  <span className="text-slate-500 block text-[10px] font-mono uppercase">VỊ TRÍ ĐỊNH VỊ TỰ ĐỘNG</span>
                  <span className="text-slate-900 font-mono font-bold">21.0285° N, 105.8542° E (±2.4m)</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-mono font-bold border border-emerald-200">
                ĐÃ KHÓA TỌA ĐỘ
              </span>
            </div>

            {/* Media Upload Simulation */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
                Hình ảnh / Âm thanh hiện trường (Tùy chọn):
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setHasPhoto(!hasPhoto)}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${
                    hasPhoto ? 'bg-red-50/60 border-red-300 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <Camera className="w-4 h-4 text-red-600" />
                  <div className="text-xs">
                    <span className="font-bold block">{hasPhoto ? 'photo_accident.jpg' : 'Chụp ảnh hiện trường'}</span>
                    <span className="text-[10px] text-slate-500">{hasPhoto ? 'Đã tải ảnh lên' : 'Chạm để tải ảnh'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-2.5">
                  <Mic className="w-4 h-4 text-red-600" />
                  <div className="text-xs">
                    <span className="font-bold block text-slate-800">Ghi âm trực tiếp</span>
                    <span className="text-[10px] text-slate-500">Tự động chuyển văn bản</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <AlertTriangle className="w-5 h-5 text-white" />
              <span>Gửi cảnh báo khẩn cấp đến CAD</span>
              <Send className="w-4 h-4 text-white" />
            </button>

          </form>
        )}

        {/* State 2: AI Analyzing Simulation */}
        {submittingState === 'analyzing' && (
          <div className="py-12 text-center space-y-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-red-200 border-t-red-600 animate-spin"></div>
              <Sparkles className="w-8 h-8 text-red-600 absolute animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-slate-900">
                AI đang phân tích hiện trường...
              </h3>
              <p className="text-sm text-slate-600">
                Mô hình đang nhận diện mức độ nghiêm trọng và quét các trạm cứu hộ gần nhất.
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left font-mono text-xs space-y-1.5 text-slate-600">
              <div className="text-emerald-600 font-bold">✔ Đã khóa tọa độ GPS: (21.0285, 105.8542)</div>
              <div className="text-red-600 font-bold">✔ AI đang bóc tách phân loại rủi ro...</div>
              <div className="text-slate-700 font-bold">✔ Tìm kiếm đội phản ứng trong bán kính 3.5km...</div>
            </div>
          </div>
        )}

        {/* State 3: Dispatched Confirmation */}
        {submittingState === 'dispatched' && (
          <div className="py-8 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono text-emerald-600 font-bold tracking-widest uppercase">
                TÍN HIỆU CỨU NẠN ĐÃ ĐƯỢC TIẾP NHẬN
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Lực lượng cứu hộ đang xuất phát
              </h3>
              <p className="text-sm text-slate-600">
                Mã sự cố <strong className="text-red-600 font-mono">#VN-8942</strong> được xếp loại <strong className="text-slate-900 font-mono">Mức 4 (Nghiêm trọng)</strong>.
              </p>
            </div>

            {/* Units Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-600">ĐỘI ỨNG CỨU TIẾP NHẬN:</span>
                <span className="text-red-600 font-bold">Dự kiến đến (ETA): 3m 40s</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-red-600" />
                  <span className="text-slate-900 font-bold">Xe cấp cứu AM-04 (Y tế)</span>
                </div>
                <span className="text-slate-500">Cách 2.1 km</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-600" />
                  <span className="text-slate-900 font-bold">Xe cứu nạn FE-09 (PCCC)</span>
                </div>
                <span className="text-slate-500">Cách 1.4 km</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleReset}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
              >
                Mở bản đồ theo dõi xe cứu hộ trực tiếp
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
