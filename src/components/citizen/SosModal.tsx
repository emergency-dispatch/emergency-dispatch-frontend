import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlertTriangle,
  MapPin,
  Camera,
  Send,
  CheckCircle2,
  Sparkles,
  Loader2,
  Trash2,
  User,
  Phone,
  Clock,
  XCircle,
  Search,
  ShieldAlert,
  MapPinOff,
  PhoneCall,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { incidentService } from '../../services/incidentService';
import { mediaService } from '../../services/mediaService';
import { liveMapService } from '../../services/liveMapService';
import { getApiErrorMessage } from '../../services/apiClient';
import { MapboxLocationPicker } from '../common/MapboxLocationPicker';
import { mapboxService } from '../../services/mapboxService';
import { UserRole } from '../../types/auth';
import type { CreateIncidentDto, IncidentResponseDto } from '../../types/incident';
import { CitizenPhoneModal } from './CitizenPhoneModal';

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

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371.0;
  const rad = (deg: number) => (deg * Math.PI) / 180.0;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose, onOpenReports }) => {
  const { user, isAuthenticated, updateProfile } = useAuth();

  const [description, setDescription] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>('');
  const [reporterPhone, setReporterPhone] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(DEFAULT_COORDS.lat);
  const [longitude, setLongitude] = useState<number>(DEFAULT_COORDS.lng);
  const [locationAddress, setLocationAddress] = useState<string>(DEFAULT_COORDS.address);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'locked' | 'default'>('locating');
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);

  // Phone modal & auto-save
  const [showPhoneModal, setShowPhoneModal] = useState<boolean>(false);
  const [savePhoneToProfile, setSavePhoneToProfile] = useState<boolean>(false);

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

  // Out of service area notice modal
  const [showOutOfAreaModal, setShowOutOfAreaModal] = useState<boolean>(false);
  const [outOfAreaNotice, setOutOfAreaNotice] = useState<{
    areaName: string;
    radiusKm: number;
    outsideKm: number;
  }>({ areaName: '', radiusKm: 0, outsideKm: 0 });

  const isCitizen = !user || user.role === UserRole.Citizen;
  const isCitizenWithoutPhone = isAuthenticated && isCitizen && (!user?.phoneNumber || user.phoneNumber.trim() === '');

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

  // Sync reporter phone whenever user's phone in profile updates
  useEffect(() => {
    if (user?.phoneNumber) {
      setReporterPhone(user.phoneNumber);
    }
  }, [user?.phoneNumber]);

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
        setSavePhoneToProfile(!user.phoneNumber);
      } else {
        setReporterName('');
        setReporterPhone('');
        setSavePhoneToProfile(false);
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
              setLocationAddress('Không lấy được vị trí (Vui lòng chọn trên bản đồ hoặc nhập địa chỉ)');
            }
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else if (!hasPreFetched) {
        setGpsStatus('default');
        setLocationAddress('Không lấy được vị trí (Vui lòng chọn trên bản đồ hoặc nhập địa chỉ)');
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSearchLocation = async () => {
    if (!locationAddress.trim()) return;
    setIsSearchingLocation(true);
    try {
      const res = await mapboxService.forwardGeocode(locationAddress);
      if (res) {
        setLatitude(res.lat);
        setLongitude(res.lng);
        setLocationAddress(res.address);
        setGpsStatus('locked');
      }
    } catch (err) {
      console.warn('Lỗi tìm kiếm địa chỉ:', err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

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
      setErrorMsg('Chưa xác định được vị trí. Vui lòng nhập địa chỉ hoặc click chọn trên bản đồ.');
      return;
    }

    // Phone validation if provided
    const cleanPhone = reporterPhone.trim();
    if (cleanPhone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
      setErrorMsg('Số điện thoại liên lạc không đúng định dạng Việt Nam (ví dụ: 0912345678).');
      return;
    }

    // Optionally save phone to citizen profile
    if (savePhoneToProfile && cleanPhone && user && isCitizen) {
      try {
        const u = user as any;
        await updateProfile({
          fullName: user.fullName || reporterName.trim() || 'Người dân',
          phoneNumber: cleanPhone,
          avatarUrl: user.avatarUrl,
          address: u?.address,
          citizenIdNumber: u?.citizenIdNumber,
          gender: u?.gender,
          bloodType: user.bloodType,
          medicalNotes: u?.medicalNotes,
        });
      } catch (saveErr) {
        console.warn('Lỗi lưu số điện thoại vào hồ sơ:', saveErr);
      }
    }

    // Service area boundary validation
    try {
      const area = await liveMapService.getServiceArea().catch(() => null);
      if (area && area.enabled && area.radiusKm > 0) {
        const dist = haversineDistanceKm(latitude, longitude, area.centerLat, area.centerLng);
        const outsideKm = dist - area.radiusKm;
        if (outsideKm > 0) {
          setOutOfAreaNotice({
            areaName: area.name || 'Khu vực hoạt động ResQ',
            radiusKm: area.radiusKm,
            outsideKm: Math.round(outsideKm * 10) / 10,
          });
          setShowOutOfAreaModal(true);
          return;
        }
      }
    } catch {
      // Continue if service area check fails
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

      const payload: CreateIncidentDto = {
        title: 'Tín hiệu cứu nạn khẩn cấp SOS',
        description: description.trim() || `Tín hiệu cứu nạn SOS từ người dân tại ${locationAddress}`,
        latitude,
        longitude,
        locationAddress,
        reporterName: reporterName.trim() || (user?.fullName ?? 'Người dân'),
        reporterPhone: cleanPhone || (user?.phoneNumber ?? undefined),
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card - Dynamic sizing: spacious 2-column for form, compact elegant for success/analyzing */}
      <div
        className={`relative w-full ${
          submittingState === 'dispatched'
            ? 'max-w-xl h-auto'
            : submittingState === 'analyzing'
            ? 'max-w-lg h-auto'
            : 'max-w-6xl xl:max-w-7xl max-h-[96vh] h-[90vh]'
        } rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 flex flex-col overflow-hidden transition-all duration-300`}
      >
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden p-6 flex flex-col">
          {submittingState === 'idle' && (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
              {/* Error Alert */}
              {errorMsg && (
                <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 2-Column Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
                {/* Left Column (7 cols): Map & Editable Location */}
                <div className="lg:col-span-7 flex flex-col space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-mono uppercase text-slate-700 font-bold flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-red-600" />
                        <span>Vị trí hiện trường (Nhập hoặc ghim trên map)</span>
                      </label>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${
                          gpsStatus === 'locked'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : gpsStatus === 'locating'
                            ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse'
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        {gpsStatus === 'locked' ? 'ĐÃ ĐỊNH VỊ' : gpsStatus === 'locating' ? 'ĐANG ĐỊNH VỊ...' : 'CHƯA ĐỊNH VỊ'}
                      </span>
                    </div>

                    {/* Address Text Input + Search Button */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={locationAddress}
                          onChange={(e) => setLocationAddress(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchLocation();
                            }
                          }}
                          placeholder="Nhập địa chỉ, số nhà, tên đường hoặc địa điểm cụ thể..."
                          className="w-full pl-3.5 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-red-500 font-mono shadow-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSearchLocation}
                        disabled={isSearchingLocation}
                        className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                        title="Tìm vị trí trên bản đồ"
                      >
                        {isSearchingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>Tìm</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Mapbox Map - Bự và thoáng */}
                  <div className="flex-1 min-h-[380px] lg:min-h-[460px] xl:min-h-[500px] rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
                    <MapboxLocationPicker
                      latitude={latitude}
                      longitude={longitude}
                      onChange={(lat, lng, addr) => {
                        setLatitude(lat);
                        setLongitude(lng);
                        setGpsStatus('locked');
                        if (addr) setLocationAddress(addr);
                      }}
                      height="100%"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono italic">
                    * Mẹo: Bạn có thể nhập địa chỉ ở trên hoặc click trực tiếp / kéo ghim đỏ trên bản đồ để xác định vị trí.
                  </p>
                </div>

                {/* Right Column (5 cols): Details, Media & SOS Submission */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Reporter Name */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono uppercase text-slate-700 font-bold">
                        Họ tên người báo (Tùy chọn)
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={reporterName}
                          onChange={(e) => setReporterName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 font-mono shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Reporter Phone */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-mono uppercase text-slate-700 font-bold">
                          Số điện thoại gọi lại khẩn cấp
                        </label>
                        {isCitizenWithoutPhone && (
                          <button
                            type="button"
                            onClick={() => setShowPhoneModal(true)}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Bổ sung vào hồ sơ</span>
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="tel"
                          value={reporterPhone}
                          onChange={(e) => setReporterPhone(e.target.value)}
                          placeholder="0912345678"
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 font-mono shadow-xs"
                        />
                      </div>
                      {isCitizenWithoutPhone && reporterPhone.trim() && (
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer pt-0.5">
                          <input
                            type="checkbox"
                            checked={savePhoneToProfile}
                            onChange={(e) => setSavePhoneToProfile(e.target.checked)}
                            className="rounded text-red-600 focus:ring-red-500"
                          />
                          <span>Lưu số điện thoại này vào hồ sơ tài khoản</span>
                        </label>
                      )}
                    </div>

                    {/* Description Note */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono uppercase text-slate-700 font-bold">
                        Mô tả chi tiết tình huống (nếu có thể):
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ví dụ: Hai xe máy va chạm trước cổng Nidec, 1 người bất tỉnh cần cấp cứu..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 font-mono resize-none shadow-xs"
                      />
                    </div>

                    {/* Media Upload */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono uppercase text-slate-700 font-bold">
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
                        <div className="relative rounded-xl border border-red-200 bg-red-50/30 overflow-hidden group">
                          <div className="relative w-full h-36 sm:h-48 bg-slate-900 flex items-center justify-center overflow-hidden">
                            <img
                              src={photoPreview}
                              alt="Hiện trường"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                            {/* Overlay delete button top-right */}
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white transition-all shadow-md cursor-pointer"
                              title="Xóa ảnh này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {/* Change photo button */}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-mono font-bold transition-all shadow-md cursor-pointer flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Đổi ảnh</span>
                            </button>
                            <span className="absolute bottom-2 left-2.5 text-[10px] font-mono text-white/90 drop-shadow-md truncate max-w-[200px]">
                              {photoFile?.name}
                            </span>
                          </div>
                          <div className="px-3 py-1.5 flex items-center justify-between text-xs bg-white border-t border-red-100">
                            <span className="text-[11px] font-bold text-slate-700">Ảnh hiện trường</span>
                            <span className="text-[10px] text-emerald-600 font-mono font-bold">
                              {Math.round((photoFile?.size || 0) / 1024)} KB · Sẵn sàng gửi CAD
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center gap-2 text-xs font-mono font-bold cursor-pointer transition-colors"
                        >
                          <Camera className="w-4 h-4 text-red-600" />
                          <span>Chạm để chọn hoặc chụp ảnh hiện trường gửi cho CAD</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submit Action Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-5 h-5 text-white" />
                      <span>Gửi cảnh báo khẩn cấp đến Trung tâm CAD</span>
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* State 2: AI Analyzing Simulation & Backend Dispatch */}
          {submittingState === 'analyzing' && (
            <div className="py-12 text-center space-y-6 my-auto">
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
            <div className="py-6 text-center space-y-5 animate-fadeIn my-auto">
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
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 font-mono text-xs w-full max-w-xl mx-auto">
                <div className="space-y-1.5 pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wide">
                    <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>HIỆN TRƯỜNG:</span>
                  </div>
                  <p className="text-slate-900 font-bold text-xs leading-relaxed break-words text-left pl-5">
                    {createdIncident.locationAddress}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-500 font-bold shrink-0 text-[11px] uppercase tracking-wide">THỜI GIAN TIẾP NHẬN:</span>
                  <span className="text-slate-900 font-bold">
                    {new Date(createdIncident.createdAt).toLocaleTimeString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Cancel Alarm Action / Inline Confirmation */}
              {createdIncident.status === 'Cancelled' ? (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs font-mono font-bold flex items-center justify-center gap-2 max-w-xl mx-auto">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span>Sự cố này đã được hủy bỏ thành công</span>
                </div>
              ) : showCancelConfirm ? (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-center space-y-2.5 animate-fadeIn max-w-xl mx-auto">
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
                <div className="max-w-xl mx-auto">
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-600 font-bold text-xs uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Hủy yêu cầu cứu hộ (Bấm nhầm)</span>
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 max-w-xl mx-auto">
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

      {/* Quick Phone Modal for Citizen */}
      <CitizenPhoneModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={(phone) => {
          setReporterPhone(phone);
          setShowPhoneModal(false);
        }}
      />

      {/* Out of Service Area Informational Modal */}
      {showOutOfAreaModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowOutOfAreaModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <MapPinOff className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              Ngoài Phạm Vi Hoạt Động
            </h3>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Không thể gửi tín hiệu cứu nạn SOS vì toạ độ hiện tại của bạn nằm ngoài bán kính phục vụ của hệ thống ResQ.
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1.5 mb-4 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">Khu vực phục vụ:</span>
                <span className="font-semibold text-slate-900">{outOfAreaNotice.areaName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bán kính hoạt động:</span>
                <span className="font-semibold text-slate-900">{outOfAreaNotice.radiusKm} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khoảng cách vượt ngoài:</span>
                <span className="font-bold text-red-600">+{outOfAreaNotice.outsideKm} km</span>
              </div>
              <div className="pt-1 text-[11px] text-slate-400 font-mono">
                Toạ độ: {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center mb-4">
              Vui lòng liên hệ trực tiếp tổng đài ứng cứu quốc gia:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <a
                href="tel:114"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>114 Cứu hoả</span>
              </a>
              <a
                href="tel:115"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>115 Cấp cứu</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowOutOfAreaModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Đã hiểu &amp; Đóng
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default SosModal;
