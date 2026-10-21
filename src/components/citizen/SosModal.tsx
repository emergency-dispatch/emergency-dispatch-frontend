import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlertTriangle,
  PhoneCall,
  MapPin,
  Camera,
  Send,
  CheckCircle2,
  Flame,
  Car,
  HeartPulse,
  Sparkles,
  Loader2,
  Trash2,
  User,
  Phone,
  Clock,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { incidentService } from '../../services/incidentService';
import { mediaService } from '../../services/mediaService';
import { getApiErrorMessage } from '../../services/apiClient';
import { MapboxLocationPicker } from '../common/MapboxLocationPicker';
import { mapboxService } from '../../services/mapboxService';
import type { CreateIncidentDto, IncidentResponseDto } from '../../types/incident';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReports?: () => void;
}

const DEFAULT_COORDS = {
  lat: 10.8441,
  lng: 106.8089,
  address: 'Đường D1, Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh',
};

const formatIncidentStatus = (status: string) => {
  switch (status) {
    case 'Pending':
    case 'AiProcessed':
      return 'Chờ tiếp nhận';
    case 'Verified':
      return 'Đã duyệt';
    case 'Dispatched':
      return 'Đang điều phối xe';
    case 'InProgress':
      return 'Đang ứng cứu';
    case 'Completed':
    case 'Resolved':
      return 'Đã xử lý xong';
    case 'Cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
};

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose, onOpenReports }) => {
  const { user } = useAuth();

  const [selectedHazard, setSelectedHazard] = useState<string>('accident');
  const [description, setDescription] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>('');
  const [reporterPhone, setReporterPhone] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(DEFAULT_COORDS.lat);
  const [longitude, setLongitude] = useState<number>(DEFAULT_COORDS.lng);
  const [locationAddress, setLocationAddress] = useState<string>(DEFAULT_COORDS.address);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'locked' | 'default'>('locating');

  // Photo attachment
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [submittingState, setSubmittingState] = useState<'idle' | 'analyzing' | 'dispatched'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [createdIncident, setCreatedIncident] = useState<IncidentResponseDto | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSubmittingState('idle');
      setCreatedIncident(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setDescription('');

      if (user) {
        setReporterName(user.fullName || '');
        setReporterPhone(user.phoneNumber || '');
      } else {
        setReporterName('');
        setReporterPhone('');
      }

      // 1. Kiểm tra tọa độ đã được lấy sẵn ngay khi vừa mở web
      let hasPreFetched = false;
      try {
        const cached = localStorage.getItem('resq_citizen_coords');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.lat && parsed.lng && Date.now() - (parsed.updatedAt || 0) < 30 * 60 * 1000) {
            setLatitude(parsed.lat);
            setLongitude(parsed.lng);
            if (parsed.address) setLocationAddress(parsed.address);
            setGpsStatus('locked');
            hasPreFetched = true;
          }
        }
      } catch {
        // Ignore
      }

      // 2. Tiếp tục cập nhật/lấy GPS thực tế chính xác cao
      if (navigator.geolocation) {
        if (!hasPreFetched) setGpsStatus('locating');
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setLatitude(lat);
            setLongitude(lng);
            setGpsStatus('locked');
            try {
              const addr = await mapboxService.reverseGeocode(lng, lat);
              setLocationAddress(addr);
              localStorage.setItem('resq_citizen_coords', JSON.stringify({ lat, lng, address: addr, updatedAt: Date.now() }));
            } catch {
              setLocationAddress('Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh');
            }
          },
          () => {
            if (!hasPreFetched) {
              setGpsStatus('default');
              setLatitude(DEFAULT_COORDS.lat);
              setLongitude(DEFAULT_COORDS.lng);
              setLocationAddress('Không lấy được vị trí (Vui lòng chọn trên bản đồ)');
            }
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else if (!hasPreFetched) {
        setGpsStatus('default');
        setLocationAddress('Không lấy được vị trí (Vui lòng chọn trên bản đồ)');
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const hazardOptions = [
    { id: 'fire', label: 'Hỏa hoạn & Khói', icon: Flame, defaultTitle: 'Hỏa hoạn & Khói khẩn cấp' },
    { id: 'accident', label: 'Tai nạn & Va chạm', icon: Car, defaultTitle: 'Tai nạn & Va chạm giao thông' },
    { id: 'medical', label: 'Cấp cứu y tế lao động', icon: HeartPulse, defaultTitle: 'Cấp cứu y tế lao động khẩn cấp' },
    { id: 'traffic_jam', label: 'Ùn tắc cổng KCN', icon: AlertTriangle, defaultTitle: 'Ùn tắc giao thông cục bộ' },
  ];

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Location validation
    if (!locationAddress || locationAddress.startsWith('Không lấy được vị trí')) {
      setErrorMsg('Chưa xác định được vị trí. Vui lòng click chọn hoặc kéo ghim vị trí hiện trường trên bản đồ bên dưới.');
      return;
    }

    // Phone validation if provided
    if (reporterPhone.trim() && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(reporterPhone.trim())) {
      setErrorMsg('Số điện thoại liên lạc không đúng định dạng Việt Nam (ví dụ: 0912345678).');
      return;
    }

    setSubmittingState('analyzing');

    try {
      let mediaUrls: string[] = [];
      if (photoFile) {
        try {
          const uploadedUrl = await mediaService.upload(photoFile);
          if (uploadedUrl) {
            mediaUrls = [uploadedUrl];
          }
        } catch (uploadErr) {
          console.warn('Lỗi tải ảnh lên Cloudinary, tiếp tục gửi SOS không kèm ảnh:', uploadErr);
        }
      }

      const activeOpt = hazardOptions.find((h) => h.id === selectedHazard);
      const title = activeOpt?.defaultTitle || 'Tín hiệu cứu nạn khẩn cấp SOS';

      const payload: CreateIncidentDto = {
        title,
        description: description.trim() || `Tín hiệu cứu nạn SOS từ người dân tại ${locationAddress}`,
        latitude,
        longitude,
        locationAddress,
        reporterName: reporterName.trim() || (user?.fullName ?? 'Người dân'),
        reporterPhone: reporterPhone.trim() || (user?.phoneNumber ?? undefined),
        mediaUrls,
      };

      const response = await incidentService.createIncident(payload);
      if (response.success && response.data) {
        setCreatedIncident(response.data);
        setSubmittingState('dispatched');

        try {
          const stored = JSON.parse(localStorage.getItem('resq_my_reported_incident_ids') || '[]');
          if (!stored.includes(response.data.id)) {
            stored.unshift(response.data.id);
            localStorage.setItem('resq_my_reported_incident_ids', JSON.stringify(stored));
          }
          window.dispatchEvent(new CustomEvent('resq_incident_updated', { detail: response.data }));
        } catch {
          // Ignore
        }
      } else {
        throw new Error(response.message || 'Không thể tạo báo cáo SOS');
      }
    } catch (err) {
      setSubmittingState('idle');
      setErrorMsg(getApiErrorMessage(err, 'Gửi tín hiệu cứu nạn thất bại. Vui lòng thử lại hoặc gọi ngay 114/115.'));
    }
  };

  const handleReset = () => {
    setSubmittingState('idle');
    setCreatedIncident(null);
    setIsCancelling(false);
    setShowCancelConfirm(false);
    onClose();
  };

  const handleCancelSubmittedIncident = async () => {
    if (!createdIncident?.id) return;
    try {
      setIsCancelling(true);
      await incidentService.cancel(createdIncident.id, 'Người dân bấm nhầm nút SOS trên Web');
      const updated = { ...createdIncident, status: 'Cancelled' as const };
      setCreatedIncident(updated);
      window.dispatchEvent(new CustomEvent('resq_incident_updated', { detail: updated }));
      setShowCancelConfirm(false);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể hủy sự cố lúc này.'));
    } finally {
      setIsCancelling(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card - Constrained Height with Internal Scrolling */}
      <div className="relative w-full max-w-2xl max-h-[92vh] rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Phát tín hiệu cứu nạn SOS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 font-bold">
                  NỘI KHU KCN
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Trung tâm tiếp nhận &amp; điều phối cứu hộ khẩn cấp Khu Công nghệ cao
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {submittingState === 'idle' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Emergency Direct Hotlines Box */}
              <div className="p-3 rounded-xl bg-red-50/50 border border-red-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs text-red-700 font-medium">
                  <PhoneCall className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Cần trợ giúp ngay? Hotline khẩn cấp:</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="tel:02837360000"
                    className="px-2.5 py-1 rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-mono text-[11px] font-bold transition-colors shadow-xs"
                  >
                    028.3736 (An ninh)
                  </a>
                  <a
                    href="tel:114"
                    className="px-2.5 py-1 rounded-md bg-red-600 text-white font-mono text-[11px] font-bold hover:bg-red-700 transition-colors shadow-xs"
                  >
                    114 (PCCC)
                  </a>
                  <a
                    href="tel:115"
                    className="px-2.5 py-1 rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-mono text-[11px] font-bold transition-colors shadow-xs"
                  >
                    115 (Cấp cứu)
                  </a>
                </div>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

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
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                  <div className="text-xs min-w-0">
                    <span className="text-slate-500 block text-[10px] font-mono uppercase font-semibold">VỊ TRÍ HIỆN TRƯỜNG</span>
                    <span className="text-slate-900 font-medium text-xs truncate block">{locationAddress}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${
                    gpsStatus === 'locked'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : gpsStatus === 'locating'
                      ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse'
                      : 'bg-red-100 text-red-700 border-red-200'
                  }`}
                >
                  {gpsStatus === 'locked' ? 'ĐÃ ĐỊNH VỊ' : gpsStatus === 'locating' ? 'ĐANG ĐỊNH VỊ...' : 'KHÔNG LẤY ĐƯỢC VỊ TRÍ'}
                </span>
              </div>

              {/* Interactive Mapbox Map with real GPS and Draggable Marker */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase text-slate-600 font-bold flex items-center justify-between">
                  <span>Vị trí trên bản đồ vệ tinh Mapbox:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Kéo ghim hoặc click để chỉnh vị trí</span>
                </label>
                <MapboxLocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  onChange={(lat, lng, addr) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setGpsStatus('locked');
                    if (addr) setLocationAddress(addr);
                  }}
                  height="220px"
                />
              </div>

              {/* Reporter Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono uppercase text-slate-600 font-bold">
                    Họ tên người báo (Tùy chọn)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono uppercase text-slate-600 font-bold">
                    Số điện thoại gọi lại khẩn cấp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Description note */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase text-slate-600 font-bold">
                  Mô tả chi tiết tình huống (nếu có thể):
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Hai xe máy va chạm trước cổng công ty Nidec, 1 nạn nhân bất tỉnh cần xe cứu thương..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 font-mono resize-none"
                />
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
                  Hình ảnh hiện trường (Tùy chọn):
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                {photoPreview ? (
                  <div className="p-3 rounded-xl border border-red-200 bg-red-50/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={photoPreview}
                        alt="Hiện trường"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">{photoFile?.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {Math.round((photoFile?.size || 0) / 1024)} KB — Sẵn sàng tải lên
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center gap-2 text-xs font-mono font-bold cursor-pointer transition-colors"
                  >
                    <Camera className="w-4 h-4 text-red-600" />
                    <span>Chạm để chọn hoặc chụp ảnh hiện trường gửi cho AI CAD</span>
                  </button>
                )}
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <AlertTriangle className="w-5 h-5 text-white" />
                <span>Gửi cảnh báo khẩn cấp đến Trung tâm CAD</span>
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          )}

          {/* State 2: AI Analyzing Simulation & Backend Dispatch */}
          {submittingState === 'analyzing' && (
            <div className="py-12 text-center space-y-6">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-red-200 border-t-red-600 animate-spin"></div>
                <Sparkles className="w-8 h-8 text-red-600 absolute animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-900">
                  Đang gửi tín hiệu cứu nạn SOS...
                </h3>
                <p className="text-sm text-slate-600">
                  Hệ thống đang truyền toạ độ hiện trường về máy chủ trung tâm và kích hoạt chuông báo động cứu hộ.
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left font-mono text-xs space-y-2 text-slate-600">
                <div className="text-emerald-600 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Đã xác định vị trí hiện trường</span>
                </div>
                <div className="text-red-600 font-bold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  <span>Đang kết nối với trung tâm điều phối cứu hộ...</span>
                </div>
              </div>
            </div>
          )}

          {/* State 3: Dispatched Confirmation */}
          {submittingState === 'dispatched' && createdIncident && (
            <div className="py-6 text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-mono text-emerald-600 font-bold tracking-widest uppercase">
                  TÍN HIỆU CỨU NẠN ĐÃ ĐƯỢC TIẾP NHẬN THÀNH CÔNG
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Trung tâm đang điều phối lực lượng
                </h3>
                <p className="text-sm text-slate-600">
                  Mã sự cố:{' '}
                  <strong className="text-red-600 font-mono text-base">
                    INC-{createdIncident.id.substring(0, 8).toUpperCase()}
                  </strong>{' '}
                  — Trạng thái:{' '}
                  <strong className="text-slate-900 font-mono">
                    {formatIncidentStatus(createdIncident.status)}
                  </strong>
                </p>
              </div>

              {/* Details Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">HIỆN TRƯỜNG:</span>
                  <span className="text-slate-900 font-bold">{createdIncident.locationAddress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">THỜI GIAN TIẾP NHẬN:</span>
                  <span className="text-slate-700">
                    {new Date(createdIncident.createdAt).toLocaleTimeString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Cancel Alarm Action / Inline Confirmation */}
              {createdIncident.status === 'Cancelled' ? (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs font-mono font-bold flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span>Sự cố này đã được hủy bỏ thành công</span>
                </div>
              ) : showCancelConfirm ? (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-center space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-center gap-2 text-red-700 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>Bạn có chắc chắn muốn hủy yêu cầu cứu hộ này (do bấm nhầm)?</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Không, giữ lại
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelSubmittedIncident}
                      disabled={isCancelling}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>Xác nhận hủy yêu cầu</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-600 font-bold text-xs uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Hủy yêu cầu cứu hộ (Bấm nhầm)</span>
                </button>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                {onOpenReports && (
                  <button
                    type="button"
                    onClick={() => {
                      handleReset();
                      onOpenReports();
                    }}
                    className="w-full py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider font-mono border border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4 text-red-600" />
                    <span>Xem lịch sử báo cáo của bạn</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-sm transition-all cursor-pointer"
                >
                  Đóng thông báo &amp; Giữ an toàn
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SosModal;
