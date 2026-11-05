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
  RefreshCw,
  Video,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSosCooldown } from '../../hooks/useSosCooldown';
import { incidentService } from '../../services/incidentService';
import { mediaService } from '../../services/mediaService';
import { liveMapService, ServiceAreaDto } from '../../services/liveMapService';
import { getApiErrorMessage } from '../../services/apiClient';
import { MapboxLocationPicker } from '../common/MapboxLocationPicker';
import { mapboxService } from '../../services/mapboxService';
import { UserRole } from '../../types/auth';
import type { CreateIncidentDto, IncidentResponseDto } from '../../types/incident';
import { CitizenPhoneModal } from './CitizenPhoneModal';
import { formatCitizenIncidentStatus } from '../../utils/incidentFormat';
// Vùng phục vụ dùng chung với form Operator tạo sự cố (cùng tâm, cùng bán kính chặn).
import { DEFAULT_SERVICE_AREA, KCN_RADIUS_KM, haversineDistanceKm } from '../../utils/serviceArea';
import { useTranslation, dateLocale } from '../../i18n';

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
  return formatCitizenIncidentStatus(status);
};


export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose, onOpenReports }) => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const { isCooldown, cooldownLabel, triggerCooldown, clearCooldown } = useSosCooldown();

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

  // Photo & Camera live capture
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string>('');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Submission state
  const [submittingState, setSubmittingState] = useState<'idle' | 'analyzing' | 'dispatched'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [createdIncident, setCreatedIncident] = useState<IncidentResponseDto | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  // Out of service area notice modal & real-time monitoring
  const [showOutOfAreaModal, setShowOutOfAreaModal] = useState<boolean>(false);
  const [outOfAreaNotice, setOutOfAreaNotice] = useState<{
    areaName: string;
    radiusKm: number;
    outsideKm: number;
  }>({ areaName: '', radiusKm: 0, outsideKm: 0 });
  const [serviceArea, setServiceArea] = useState<ServiceAreaDto>(DEFAULT_SERVICE_AREA);

  useEffect(() => {
    if (isOpen) {
      liveMapService.getServiceArea().then((area) => {
        if (area) {
          const rawLat = area.centerLat ?? (area as any).CenterLat;
          const rawLng = area.centerLng ?? (area as any).CenterLng;
          const rawRad = area.radiusKm ?? (area as any).RadiusKm;
          setServiceArea({
            enabled: true,
            name: area.name || DEFAULT_SERVICE_AREA.name,
            centerLat: typeof rawLat === 'number' && rawLat !== 0 ? rawLat : DEFAULT_SERVICE_AREA.centerLat,
            centerLng: typeof rawLng === 'number' && rawLng !== 0 ? rawLng : DEFAULT_SERVICE_AREA.centerLng,
            radiusKm: typeof rawRad === 'number' && rawRad > 0 ? Math.min(rawRad, KCN_RADIUS_KM) : KCN_RADIUS_KM,
          });
        }
      }).catch(() => undefined);
    }
  }, [isOpen]);

  const effectiveCenterLat = (serviceArea.centerLat && serviceArea.centerLat !== 0) ? serviceArea.centerLat : DEFAULT_SERVICE_AREA.centerLat;
  const effectiveCenterLng = (serviceArea.centerLng && serviceArea.centerLng !== 0) ? serviceArea.centerLng : DEFAULT_SERVICE_AREA.centerLng;
  const effectiveRadiusKm = KCN_RADIUS_KM;
  const currentDistanceKm = haversineDistanceKm(latitude, longitude, effectiveCenterLat, effectiveCenterLng);
  const isOutsideArea = currentDistanceKm > effectiveRadiusKm;
  const outsideDistanceKm = isOutsideArea ? Math.round((currentDistanceKm - effectiveRadiusKm) * 10) / 10 : 0;

  const isCitizen = !user || user.role === UserRole.Citizen;
  const isCitizenWithoutPhone = isAuthenticated && isCitizen && (!user?.phoneNumber || user.phoneNumber.trim() === '');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
  };

  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    // Release previous tracks if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraError('');
    setIsCameraStarting(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ mở camera trực tiếp. Vui lòng chọn tải ảnh hiện trường.');
      setIsCameraStarting(false);
      setIsCameraActive(false);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback without exact constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);

      // Check for front/rear camera support
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // Ignore
      }
    } catch (err: any) {
      console.warn('Lỗi mở camera:', err);
      let msg: string = t('citizen.sos.cameraGenericError');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = t('citizen.sos.cameraDeniedError');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = t('citizen.sos.cameraNotFoundError');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = t('citizen.sos.cameraBusyError');
      }
      setCameraError(msg);
      setIsCameraActive(false);
    } finally {
      setIsCameraStarting(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `sos-scene-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPhotoFile(file);
          const previewUrl = URL.createObjectURL(blob);
          setPhotoPreview(previewUrl);
          stopCamera();
        }
      },
      'image/jpeg',
      0.88
    );
  };

  const switchCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const handleRetakePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    setPhotoFile(null);
    startCamera(cameraFacing);
  };

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      stopCamera();
    }
    return () => {
      document.body.style.overflow = '';
      stopCamera();
    };
  }, [isOpen]);

  // Sync reporter phone whenever user's phone in profile updates
  useEffect(() => {
    if (user?.phoneNumber) {
      setReporterPhone(user.phoneNumber);
    }
  }, [user?.phoneNumber]);

  // Initialize data and start camera when modal opens
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

      // Automatically start camera on SOS open
      startCamera('environment');

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
      stopCamera();
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

    // Cooldown validation
    if (isCooldown) {
      setErrorMsg(t('citizen.sos.cooldownWaitError', { time: cooldownLabel }));
      return;
    }

    // Location validation
    if (!locationAddress || locationAddress.startsWith('Không lấy được vị trí') || locationAddress.startsWith('Unable to determine')) {
      setErrorMsg(t('citizen.sos.locationRequiredError'));
      return;
    }

    // Phone validation if provided
    const cleanPhone = reporterPhone.trim();
    if (cleanPhone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
      setErrorMsg(t('citizen.sos.invalidPhoneError'));
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

    // Always geocode typed address to ensure coordinates match what the user entered
    let finalLat = latitude;
    let finalLng = longitude;
    if (locationAddress.trim() && !locationAddress.startsWith('Không lấy được vị trí')) {
      try {
        const geo = await mapboxService.forwardGeocode(locationAddress.trim());
        if (geo) {
          finalLat = geo.lat;
          finalLng = geo.lng;
          setLatitude(geo.lat);
          setLongitude(geo.lng);
        }
      } catch {
        // Ignore geocode failure
      }
    }

    // Service area boundary validation - STRICT BLOCK FIRST
    const finalDistKm = haversineDistanceKm(finalLat, finalLng, effectiveCenterLat, effectiveCenterLng);
    const finalOutside = finalDistKm > effectiveRadiusKm;
    const finalOutsideKm = finalOutside ? Math.round((finalDistKm - effectiveRadiusKm) * 10) / 10 : 0;

    if (finalOutside) {
      setOutOfAreaNotice({
        areaName: serviceArea.name || 'Khu Công nghệ cao, TP. Thủ Đức',
        radiusKm: effectiveRadiusKm,
        outsideKm: finalOutsideKm,
      });
      setShowOutOfAreaModal(true);
      setErrorMsg(
        t('citizen.sos.outsideAreaCoordsError', {
          lat: finalLat.toFixed(4),
          lng: finalLng.toFixed(4),
          km: finalOutsideKm,
        })
      );
      return;
    }

    // Camera photo requirement for SOS
    if (!photoFile) {
      if (!cameraError) {
        setErrorMsg(t('citizen.sos.photoRequiredError'));
        if (!isCameraActive) {
          startCamera();
        }
        return;
      } else if (!cameraError.includes('Không tìm thấy thiết bị') && !cameraError.includes('No camera device')) {
        setErrorMsg(t('citizen.sos.camPermissionError'));
        return;
      }
    }

    setSubmittingState('analyzing');
    stopCamera();

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
        latitude: finalLat,
        longitude: finalLng,
        locationAddress,
        reporterName: reporterName.trim() || (user?.fullName ?? 'Người dân'),
        reporterPhone: cleanPhone || (user?.phoneNumber ?? undefined),
        mediaUrls,
      };

      const response = await incidentService.createIncident(payload);
      if (response.success && response.data) {
        triggerCooldown();
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
      setErrorMsg(getApiErrorMessage(err, t('citizen.sos.createError')));
    }
  };

  const handleReset = () => {
    stopCamera();
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
      await incidentService.cancel(
        createdIncident.id,
        i18n.language === 'en' ? 'Citizen cancelled accidental SOS press on Web' : 'Người dân bấm nhầm nút SOS trên Web'
      );
      clearCooldown();
      const updated = { ...createdIncident, status: 'Cancelled' as const };
      setCreatedIncident(updated);
      window.dispatchEvent(new CustomEvent('resq_incident_updated', { detail: updated }));
      setShowCancelConfirm(false);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, t('citizen.sos.cancelError')));
    } finally {
      setIsCancelling(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card - Responsive fullscreen on mobile web, elegant modal on tablet/desktop */}
      <div
        className={`relative w-full ${
          submittingState === 'dispatched'
            ? 'max-w-xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[96vh]'
            : submittingState === 'analyzing'
            ? 'max-w-lg h-full sm:h-auto max-h-[100dvh] sm:max-h-[96vh]'
            : 'max-w-6xl xl:max-w-7xl h-full sm:h-[90vh] max-h-[100dvh] sm:max-h-[96vh]'
        } rounded-none sm:rounded-2xl bg-white border-0 sm:border border-slate-200 shadow-2xl text-slate-900 flex flex-col overflow-hidden transition-all duration-300`}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 sm:gap-2">
                <span>{t('citizen.sos.headerTitle')}</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 font-bold shrink-0">
                  {t('citizen.sos.headerBadge')}
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 sm:line-clamp-none">
                {t('citizen.sos.headerSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 flex flex-col">
          {submittingState === 'idle' && (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
              {/* Error Alert */}
              {errorMsg && (
                <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 shrink-0 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold">{errorMsg}</span>
                </div>
              )}

              {/* 2-Column Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1 items-stretch">
                {/* Left Column (7 cols): Map & Editable Location */}
                <div className="lg:col-span-7 flex flex-col space-y-2.5 sm:space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-mono uppercase text-slate-700 font-bold flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-red-600" />
                        <span>{t('citizen.sos.locationFieldLabel')}</span>
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
                        {gpsStatus === 'locked' ? t('citizen.sos.gpsLocked') : gpsStatus === 'locating' ? t('citizen.sos.gpsLocating') : t('citizen.sos.gpsUnlocated')}
                      </span>
                    </div>

                    {/* Address Text Input + Search Button */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={locationAddress}
                          onChange={(e) => setLocationAddress(e.target.value)}
                          onBlur={() => handleSearchLocation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchLocation();
                            }
                          }}
                          placeholder={t('citizen.sos.searchAddressPlaceholder')}
                          className="w-full pl-3.5 pr-3 py-2 sm:py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-red-500 font-mono shadow-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSearchLocation}
                        disabled={isSearchingLocation}
                        className="px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                        title={t('citizen.sos.btnSearch')}
                      >
                        {isSearchingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>{t('citizen.sos.btnSearch')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Mapbox Map - Responsive Height on Mobile Web */}
                  <div className="h-[220px] sm:h-[280px] lg:h-full lg:min-h-[440px] xl:min-h-[480px] rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
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
                    {t('citizen.sos.mapTip')}
                  </p>

                  {/* Out of Service Area Real-Time Warning Banner */}
                  {isOutsideArea && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5 animate-in fade-in">
                      <MapPinOff className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="font-bold text-red-800">{t('citizen.sos.outOfAreaTitle')}</span>
                    </div>
                  )}
                </div>

                {/* Right Column (5 cols): Details, Media & SOS Submission */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-3.5 sm:space-y-4">
                  <div className="space-y-3">
                    {/* Reporter Name */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono uppercase text-slate-700 font-bold">
                        {t('citizen.sos.reporterNameLabel')}
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
                          {t('citizen.sos.reporterPhoneLabel')}
                        </label>
                        {isCitizenWithoutPhone && (
                          <button
                            type="button"
                            onClick={() => setShowPhoneModal(true)}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>{t('citizen.sos.addToProfile')}</span>
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
                          <span>{t('citizen.sos.savePhoneCheckbox')}</span>
                        </label>
                      )}
                    </div>


                    {/* Description Note */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono uppercase text-slate-700 font-bold">
                        {t('citizen.sos.situationDescLabel')}
                      </label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('citizen.sos.situationDescPlaceholder')}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 font-mono resize-none shadow-xs"
                      />
                    </div>

                    {/* Media Camera Section - Live Camera Required */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-mono uppercase text-slate-700 font-bold flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-red-600" />
                          <span>{t('citizen.sos.scenePhotoLabel')}</span>
                        </label>
                        <span className="text-[9px] font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                          {t('citizen.sos.camRequiredBadge')}
                        </span>
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />

                      {photoPreview ? (
                        <div className="relative rounded-xl border border-emerald-300 bg-emerald-50/20 overflow-hidden group shadow-sm">
                          <div className="relative w-full h-36 sm:h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
                            <img
                              src={photoPreview}
                              alt="Scene"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                            {/* Top badge */}
                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-mono font-bold shadow-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t('citizen.sos.photoReady')}</span>
                            </div>

                            {/* Overlay delete button top-right */}
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white transition-all shadow-md cursor-pointer"
                              title={t('citizen.sos.deletePhotoTitle')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Retake photo button */}
                            <button
                              type="button"
                              onClick={handleRetakePhoto}
                              className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-mono font-bold transition-all shadow-md cursor-pointer flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" />
                              <span>{t('citizen.sos.retakeBtn')}</span>
                            </button>
                          </div>
                          <div className="px-3 py-1.5 flex items-center justify-between text-xs bg-white border-t border-emerald-100">
                            <span className="text-[11px] font-bold text-slate-700">{t('citizen.sos.photoReadySubtitle')}</span>
                            <span className="text-[10px] text-emerald-600 font-mono font-bold">
                              {Math.round((photoFile?.size || 0) / 1024)} KB · {t('citizen.sos.readyForCad')}
                            </span>
                          </div>
                        </div>
                      ) : isCameraActive ? (
                        <div className="relative rounded-xl border border-red-300 bg-slate-950 overflow-hidden shadow-inner">
                          {/* Live Video Viewfinder */}
                          <div className="relative w-full h-40 sm:h-48 bg-black flex items-center justify-center overflow-hidden">
                            <video
                              ref={(el) => {
                                videoRef.current = el;
                                if (el && streamRef.current && el.srcObject !== streamRef.current) {
                                  el.srcObject = streamRef.current;
                                  el.play().catch(() => {});
                                }
                              }}
                              autoPlay
                              playsInline
                              muted
                              className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                            />

                            {/* Live Badge and Camera Controls */}
                            <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-mono font-bold shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                <span>{t('citizen.sos.liveCameraBadge')}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {hasMultipleCameras && (
                                  <button
                                    type="button"
                                    onClick={switchCamera}
                                    className="px-2 py-1 rounded-md bg-black/60 hover:bg-black/80 text-white text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
                                    title="Switch Camera"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>{t('citizen.sos.switchCamBtn')}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={stopCamera}
                                  className="p-1 rounded-md bg-black/60 hover:bg-black/80 text-white text-[10px] font-mono transition-colors cursor-pointer"
                                  title={t('citizen.sos.stopCamTitle')}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Target Frame Guide */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                              <div className="w-36 h-28 border border-white/40 rounded-xl" />
                            </div>
                          </div>

                          {/* Shutter Capture Button */}
                          <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                            >
                              <Camera className="w-4 h-4 text-white animate-pulse" />
                              <span>{t('citizen.sos.captureNowBtn')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold transition-colors cursor-pointer shrink-0"
                              title={t('citizen.sos.chooseFileBtn')}
                            >
                              {t('citizen.sos.chooseFileBtn')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cameraError && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="flex-1 text-[11px] leading-relaxed">
                                {cameraError}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => startCamera('environment')}
                              disabled={isCameraStarting}
                              className="flex-1 py-2.5 px-3 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 flex items-center justify-center gap-2 text-xs font-mono font-bold cursor-pointer transition-colors shadow-xs"
                            >
                              {isCameraStarting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                              ) : (
                                <Camera className="w-4 h-4 text-red-600" />
                              )}
                              <span>{isCameraStarting ? t('citizen.sos.startingCam') : t('citizen.sos.startCamBtn')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="py-2.5 px-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 text-xs font-mono font-bold cursor-pointer transition-colors"
                            >
                              <span>{t('citizen.sos.uploadFileBtn')}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Action Button - Sticky Bottom on Mobile Web */}
                  <div className="pt-2 sticky bottom-0 bg-white/95 backdrop-blur-xs pb-1 sm:static sm:bg-transparent sm:pb-0">
                    <button
                      type="submit"
                      disabled={isOutsideArea || isCooldown}
                      className={`w-full min-h-[46px] py-3 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 ${
                        isOutsideArea || isCooldown
                          ? 'bg-slate-400 text-white cursor-not-allowed opacity-90'
                          : 'bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white hover:shadow-lg cursor-pointer'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
                      <span>
                        {isOutsideArea
                          ? t('citizen.sos.outOfAreaTitle')
                          : isCooldown
                          ? t('citizen.sos.cooldownNotice', { time: cooldownLabel })
                          : t('citizen.sos.submitAlertBtn')}
                      </span>
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
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
                  {t('citizen.sos.submittingTitle')}
                </h3>
                <p className="text-sm text-slate-600">
                  {t('citizen.sos.submittingDesc')}
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left font-mono text-xs space-y-2 text-slate-600">
                <div className="text-emerald-600 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{t('citizen.sos.sceneLocated')}</span>
                </div>
                <div className="text-red-600 font-bold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  <span>{t('citizen.sos.connectingCad')}</span>
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
                  {t('citizen.sos.dispatchedBadge')}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {t('citizen.sos.dispatchedTitle')}
                </h3>
                <p className="text-sm text-slate-600">
                  {t('citizen.sos.incidentCode')}{' '}
                  <strong className="text-red-600 font-mono text-base">
                    INC-{createdIncident.id.substring(0, 8).toUpperCase()}
                  </strong>{' '}
                  — {t('citizen.sos.statusLabel')}{' '}
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
                    <span>{t('citizen.sos.sceneLocationLabel')}</span>
                  </div>
                  <p className="text-slate-900 font-bold text-xs leading-relaxed break-words text-left pl-5">
                    {createdIncident.locationAddress}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-500 font-bold shrink-0 text-[11px] uppercase tracking-wide">
                    {t('citizen.sos.timeReceivedLabel')}
                  </span>
                  <span className="text-slate-900 font-bold">
                    {new Date(createdIncident.createdAt).toLocaleTimeString(dateLocale())}
                  </span>
                </div>
              </div>

              {/* Cancel Alarm Action / Inline Confirmation */}
              {createdIncident.status === 'Cancelled' ? (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs font-mono font-bold flex items-center justify-center gap-2 max-w-xl mx-auto">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span>{t('citizen.sos.cancelSuccessNotice')}</span>
                </div>
              ) : showCancelConfirm ? (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-center space-y-2.5 animate-fadeIn max-w-xl mx-auto">
                  <div className="flex items-center justify-center gap-2 text-red-700 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{t('citizen.sos.cancelConfirmPrompt')}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      {t('citizen.sos.cancelConfirmKeep')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelSubmittedIncident}
                      disabled={isCancelling}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{t('citizen.sos.cancelConfirmAction')}</span>
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
                    <span>{t('citizen.sos.cancelAccidentalBtn')}</span>
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
                    <span>{t('citizen.sos.viewHistoryBtn')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-sm transition-all cursor-pointer"
                >
                  {t('citizen.sos.closeKeepSafeBtn')}
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
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <MapPinOff className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-4">
              Ngoài phạm vi cứu hộ
            </h3>

            <button
              type="button"
              onClick={() => setShowOutOfAreaModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              {t('citizen.sos.understoodCloseBtn')}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default SosModal;
