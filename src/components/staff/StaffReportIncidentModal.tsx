import React, { useState, useEffect } from 'react';
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
  Flame,
  ShieldAlert,
  Upload,
  Camera,
  RefreshCw,
  Truck,
  FileText,
} from 'lucide-react';
import type { TrafficCongestionLevel } from '../../types/incident';
import type { ReportTrafficHotspotDto } from '../../services/liveMapService';
import type { FieldIncidentReportDto } from '../../types/dispatch';
import type { StaffProfile } from '../../types/staff';
import type { IncidentTypeDto } from '../../types/typeCatalog';
import { staffAudioService } from '../../services/staffAudioService';
import { mediaService } from '../../services/mediaService';
import { mapboxService } from '../../services/mapboxService';
import { typeCatalogService } from '../../services/typeCatalogService';

export type ReportModalTab = 'field_incident' | 'traffic';

interface StaffReportIncidentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitFieldIncident: (dto: FieldIncidentReportDto) => Promise<boolean>;
  onSubmitTraffic: (dto: ReportTrafficHotspotDto) => Promise<boolean>;
  defaultLat?: number;
  defaultLng?: number;
  defaultAddress?: string;
  reporterName?: string;
  profile?: StaffProfile;
  initialTab?: ReportModalTab;
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

const TRAFFIC_QUICK_TITLES = [
  'Ùn tắc giao thông nghiêm trọng',
  'Cây ngã đổ chắn ngang làn đường',
  'Ngập nước sâu xe cứu hộ không qua được',
  'Va chạm giữa các phương tiện gây tắc nghẽn',
  'Công trường đang thi công chặn luồng xe',
];

const INCIDENT_QUICK_TITLES = [
  'Phát hiện đám cháy khu dân cư',
  'Tai nạn va chạm giao thông nghiêm trọng',
  'Chập điện phát hỏa đường dây cao thế',
  'Sạt lở / sập đổ công trình cần cứu hộ',
  'Phát hiện người bị nạn cần sơ cứu khẩn cấp',
];

const SEVERITY_LEVELS: {
  value: 'Level1' | 'Level2' | 'Level3';
  label: string;
  sublabel: string;
  badgeBg: string;
}[] = [
    {
      value: 'Level1',
      label: 'Cấp 1 · Nhẹ',
      sublabel: 'Tổ tại hiện trường tự xử lý an toàn',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    },
    {
      value: 'Level2',
      label: 'Cấp 2 · Trung bình',
      sublabel: 'Quy mô vừa, có thể cần chi viện thêm 1 xe',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
    },
    {
      value: 'Level3',
      label: 'Cấp 3 · Nghiêm trọng',
      sublabel: 'Nguy cơ cao, nhiều nạn nhân, cần báo động đỏ',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-300',
    },
  ];

export const StaffReportIncidentModal: React.FC<StaffReportIncidentModalProps> = ({
  visible,
  onClose,
  onSubmitFieldIncident,
  onSubmitTraffic,
  defaultLat,
  defaultLng,
  defaultAddress = 'Khu Công nghệ cao TP.HCM',
  reporterName = 'Kíp xe cứu hộ',
  profile,
  initialTab = 'field_incident',
}) => {
  const [activeTab, setActiveTab] = useState<ReportModalTab>(initialTab);

  // Common location state
  const [latitude, setLatitude] = useState(defaultLat ?? 10.8441);
  const [longitude, setLongitude] = useState(defaultLng ?? 106.8089);
  const [locationAddress, setLocationAddress] = useState(defaultAddress);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Traffic form state
  const [trafficTitle, setTrafficTitle] = useState('');
  const [congestionLevel, setCongestionLevel] = useState<TrafficCongestionLevel>('Severe');
  const [trafficDescription, setTrafficDescription] = useState('');
  const [ttlMinutes, setTtlMinutes] = useState(45);

  // Field incident form state
  const [eventType, setEventType] = useState<'FireExplosion' | 'TrafficAccident' | 'Other'>('FireExplosion');
  const [severity, setSeverity] = useState<'Level1' | 'Level2' | 'Level3'>('Level2');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(profile?.vehicleId || null);
  const [selectedTypeCode, setSelectedTypeCode] = useState<string | null>(null);
  const [availableTypes, setAvailableTypes] = useState<IncidentTypeDto[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // General submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial tab and location on open
  useEffect(() => {
    if (!visible) return;
    setActiveTab(initialTab);
    setErrorMessage(null);

    if (defaultLat && defaultLng) {
      setLatitude(defaultLat);
      setLongitude(defaultLng);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          handleReverseGeocode(pos.coords.longitude, pos.coords.latitude);
        },
        () => { },
        { timeout: 5000 }
      );
    }
    if (defaultAddress) {
      setLocationAddress(defaultAddress);
    }
    if (profile?.vehicleId) {
      setSelectedUnitId(profile.vehicleId);
    }
  }, [visible, defaultLat, defaultLng, defaultAddress, initialTab, profile?.vehicleId]);

  // Load incident type catalog on mount
  useEffect(() => {
    if (!visible) return;
    typeCatalogService.listIncidentTypes().then((types) => {
      setAvailableTypes(types.filter((t) => t.isActive !== false));
    }).catch(() => { });
  }, [visible]);

  // Reverse geocode helper
  const handleReverseGeocode = async (lng: number, lat: number) => {
    setIsGeocoding(true);
    try {
      const addr = await mapboxService.reverseGeocode(lng, lat);
      if (addr) setLocationAddress(addr);
    } catch {
      // Keep existing address on geocoding error
    } finally {
      setIsGeocoding(false);
    }
  };

  // Re-fetch GPS location
  const handleRefreshLocation = () => {
    if (!navigator.geolocation) return;
    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        handleReverseGeocode(pos.coords.longitude, pos.coords.latitude);
      },
      () => setIsGeocoding(false),
      { timeout: 7000 }
    );
  };

  // Handle uploading photos
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (mediaUrls.length + files.length > 10) {
      setErrorMessage('Chỉ được tải lên tối đa 10 ảnh / tài liệu hiện trường.');
      return;
    }

    setIsUploadingMedia(true);
    setErrorMessage(null);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await mediaService.upload(file);
        if (url) uploaded.push(url);
      }
      setMediaUrls((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tải ảnh lên máy chủ.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRemoveMedia = (idx: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Traffic Hotspot (Tab 2)
  const handleSubmitTraffic = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!trafficTitle.trim()) {
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
        title: trafficTitle.trim(),
        description: trafficDescription.trim() || null,
        latitude,
        longitude,
        locationAddress: locationAddress.trim(),
        congestionLevel,
        reporterName,
        ttlMinutes,
      };

      const success = await onSubmitTraffic(payload);
      if (success) {
        onClose();
        setTrafficTitle('');
        setTrafficDescription('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi báo cáo điểm nghẽn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Field Incident (Tab 1)
  const handleSubmitFieldIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!locationAddress.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ hiện trường sự cố.');
      return;
    }

    setIsSubmitting(true);
    try {
      staffAudioService.playPriorityBeep();
      const payload: FieldIncidentReportDto = {
        title: incidentTitle.trim() || `Sự cố phát hiện bởi tổ ${profile?.teamName || profile?.vehiclePlate || 'cứu hộ'}`,
        description: incidentDescription.trim() || undefined,
        latitude,
        longitude,
        locationAddress: locationAddress.trim(),
        eventType,
        incidentTypeCode: selectedTypeCode || undefined,
        severity,
        rescueUnitId: selectedUnitId || undefined,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      };

      const success = await onSubmitFieldIncident(payload);
      if (success) {
        onClose();
        setIncidentTitle('');
        setIncidentDescription('');
        setMediaUrls([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể lập hồ sơ sự cố hiện trường.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Navigation Tabs */}
        <div className="px-5 pt-4 pb-0 border-b border-slate-200 bg-slate-50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl text-white shadow-xs ${activeTab === 'field_incident' ? 'bg-red-600' : 'bg-amber-600'
                }`}>
                {activeTab === 'field_incident' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <Car className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {activeTab === 'field_incident'
                    ? 'Báo Sự Cố Hiện Trường & Tự Nhận Tác Chiến'
                    : 'Báo Điểm Nghẽn / Kẹt Xe Giao Thông'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {activeTab === 'field_incident'
                    ? 'Tổ tự phát hiện sự cố, tự nhận xử lý tại chỗ'
                    : 'Phát cảnh báo kẹt xe / vật cản đường lên Live Map'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('field_incident')}
              className={`flex-1 py-2.5 px-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${activeTab === 'field_incident'
                ? 'border-red-600 text-red-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Báo sự cố hiện trường</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('traffic')}
              className={`flex-1 py-2.5 px-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${activeTab === 'traffic'
                ? 'border-amber-600 text-amber-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Car className="w-4 h-4 text-amber-600" />
              <span>Báo kẹt xe / điểm nghẽn</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Field Incident Form */}
        {activeTab === 'field_incident' && (
          <form onSubmit={handleSubmitFieldIncident} className="px-5 py-4 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Field Report Info Note */}
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Quy trình tự nhận tại hiện trường:</strong> Sự cố sẽ được xác minh ngay theo đánh giá của tổ bạn. Sau khi gửi, hệ thống tự động đưa bạn vào thẳng màn hình <strong>Đang ở hiện trường</strong> mà không cần qua quy trình duyệt hay rung còi.
              </div>
            </div>

            {/* Event Type & Catalog Code */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Loại sự cố phát hiện <span className="text-red-500">*</span>:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setEventType('FireExplosion'); setSelectedTypeCode(null); }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${eventType === 'FireExplosion'
                    ? 'border-red-500 bg-red-50 text-red-800 font-bold ring-2 ring-red-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <Flame className="w-4 h-4 mx-auto mb-1 text-red-500" />
                  <span>Cháy nổ</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setEventType('TrafficAccident'); setSelectedTypeCode(null); }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${eventType === 'TrafficAccident'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold ring-2 ring-amber-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <Car className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <span>Tai nạn giao thông</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setEventType('Other'); setSelectedTypeCode(null); }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${eventType === 'Other'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 font-bold ring-2 ring-blue-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <AlertOctagon className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                  <span>Sự cố khác</span>
                </button>
              </div>

              {/* Sub-types dropdown if available */}
              {availableTypes.filter((t) => t.category === eventType).length > 0 && (
                <div className="mt-2">
                  <select
                    value={selectedTypeCode || ''}
                    onChange={(e) => setSelectedTypeCode(e.target.value || null)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500 outline-hidden font-medium"
                  >
                    <option value="">-- Chi tiết loại sự cố (Tùy chọn) --</option>
                    {availableTypes
                      .filter((t) => t.category === eventType)
                      .map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Severity Level Selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Mức độ khẩn cấp (Đánh giá của tổ) <span className="text-red-500">*</span>:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SEVERITY_LEVELS.map((lvl) => {
                  const isSelected = severity === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setSeverity(lvl.value)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                        ? `${lvl.badgeBg} shadow-xs ring-2 ring-red-400 font-bold`
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">{lvl.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-current shrink-0" />}
                      </div>
                      <p className="text-[10px] opacity-80 mt-1 leading-snug">{lvl.sublabel}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Title Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Gợi ý nhanh tiêu đề:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INCIDENT_QUICK_TITLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setIncidentTitle(t)}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-red-50 hover:border-red-300 text-slate-700 hover:text-red-900 border border-slate-200 transition-colors text-left cursor-pointer"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Incident Title */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Tiêu đề sự cố:</label>
              <input
                type="text"
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                placeholder="Nhập tiêu đề hoặc chọn gợi ý ở trên..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden font-medium"
              />
            </div>

            {/* Incident Description */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Mô tả tình hình hiện trường:</label>
              <textarea
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                rows={2}
                placeholder="Thông tin chi tiết: số lượng nạn nhân, vật liệu cháy, quy mô hiện trường, đề xuất thiết bị cần..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden font-medium"
              />
            </div>

            {/* Location & GPS */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">
                  Vị trí / Địa chỉ hiện trường <span className="text-red-500">*</span>:
                </label>
                <button
                  type="button"
                  onClick={handleRefreshLocation}
                  disabled={isGeocoding}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeocoding ? 'animate-spin' : ''}`} />
                  <span>{isGeocoding ? 'Đang định vị...' : 'Lấy vị trí GPS'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Nhập số nhà, tên đường, khu vực..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden font-medium"
                  required
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              {/* <p className="text-[10px] text-slate-400 font-mono">
                Tọa độ GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p> */}
            </div>

            {/* Vehicle selection (if team has multiple) */}
            {profile?.teamPlates && profile.teamPlates.length > 1 && (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Chỉ định phương tiện tiếp nhận:</label>
                <div className="flex flex-wrap gap-2">
                  {profile.teamPlates.map((plate, idx) => {
                    const unitId = profile.teamVehicleIds?.[idx] || null;
                    const isSelected = selectedUnitId === unitId;
                    return (
                      <button
                        key={plate}
                        type="button"
                        onClick={() => setSelectedUnitId(unitId)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${isSelected
                          ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-400'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        <Truck className="w-3.5 h-3.5 text-current" />
                        <span>{plate}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Media Upload */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Ảnh / Video hiện trường (Tối đa 10 tệp):</label>
              <div className="flex flex-wrap gap-2 items-center">
                {mediaUrls.map((url, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden group">
                    <img src={url} alt="Hiện trường" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {mediaUrls.length < 10 && (
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-red-500 flex flex-col items-center justify-center text-slate-400 hover:text-red-500 transition-colors cursor-pointer bg-slate-50/50">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Thêm ảnh</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaUpload}
                      disabled={isUploadingMedia}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {isUploadingMedia && (
                <p className="text-[11px] text-blue-600 flex items-center gap-1 font-semibold">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Đang tải tệp lên máy chủ...
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingMedia}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kích hoạt tác chiến...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>LẬP HỒ SƠ & TỰ NHẬN TÁC CHIẾN</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Traffic Hotspot Form */}
        {activeTab === 'traffic' && (
          <form onSubmit={handleSubmitTraffic} className="px-5 py-4 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Quick Preset Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Gợi ý điểm nghẽn thường gặp:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TRAFFIC_QUICK_TITLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrafficTitle(t)}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-900 border border-slate-200 transition-colors text-left cursor-pointer"
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
                value={trafficTitle}
                onChange={(e) => setTrafficTitle(e.target.value)}
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
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${isSelected
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
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">
                  Địa chỉ / Tuyến đường <span className="text-red-500">*</span>:
                </label>
                <button
                  type="button"
                  onClick={handleRefreshLocation}
                  disabled={isGeocoding}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeocoding ? 'animate-spin' : ''}`} />
                  <span>{isGeocoding ? 'Đang định vị...' : 'Lấy vị trí GPS'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Ví dụ: Đường D1, Phường Tân Phú, TP. Thủ Đức..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-medium"
                  required
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              {/* <p className="text-[10px] text-slate-400 font-mono">
                Tọa độ GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p> */}
            </div>

            {/* Time to Live (TTL) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Thời gian duy trì cảnh báo:</label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTtlMinutes(mins)}
                    className={`py-2 text-xs rounded-xl border text-center font-bold transition-all cursor-pointer ${ttlMinutes === mins
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    {mins} phút
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Description */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Chi tiết bổ sung (tùy chọn):</label>
              <textarea
                value={trafficDescription}
                onChange={(e) => setTrafficDescription(e.target.value)}
                rows={2}
                placeholder="Ghi chú thêm về làn đường bị phong tỏa, hướng di chuyển bị ảnh hưởng..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-medium"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang phát cảnh báo...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>GỬI BÁO CÁO ĐIỂM NGHẼN</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
