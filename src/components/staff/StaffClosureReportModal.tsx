import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileCheck2,
  Camera,
  Upload,
  Trash2,
  Plus,
  PenTool,
  CheckCircle2,
  X,
  UserCheck,
  PackageCheck,
  AlertCircle,
  Building2,
  FileText,
  Sparkles,
  Loader2,
  Users,
  Truck,
  ChevronDown,
  Package,
} from 'lucide-react';
import type { DigitalClosureReport, ClosureEvidencePhoto, StaffMission } from '../../types/staff';
import type { EquipmentDto } from '../../types/equipment';
import { equipmentService } from '../../services/equipmentService';
import { StaffSignaturePad } from './StaffSignaturePad';
import { staffAudioService } from '../../services/staffAudioService';
import { mediaService } from '../../services/mediaService';
import { useAuth } from '../../hooks/useAuth';
import { formatShortId } from '../../utils/incidentFormat';

interface StaffClosureReportModalProps {
  mission: StaffMission;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: DigitalClosureReport) => void;
  isSubmitting?: boolean;
}

const CATEGORY_LABELS: Record<ClosureEvidencePhoto['category'], { label: string; color: string }> = {
  before_rescue: { label: 'Hiện trường ban đầu', color: 'bg-amber-500/20 text-yellow-500 border-amber-500/40' },
  after_action: { label: 'Sau khi dập tắt / xử lý', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40' },
  casualty_treatment: { label: 'Sơ cứu & Chuyển viện', color: 'bg-blue-500/20 text-blue-600 border-blue-500/40' },
  property_damage: { label: 'Ghi nhận thiệt hại', color: 'bg-rose-500/20 text-rose-600 border-rose-500/40' },
};

export const StaffClosureReportModal: React.FC<StaffClosureReportModalProps> = ({
  mission,
  isOpen,
  onClose,
  onSubmitReport,
  isSubmitting = false,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const signatureSectionRef = useRef<HTMLDivElement>(null);

  // Evidence Photos (starts empty, validated >= 1 per FR-RS-03 / MSG42)
  const [photos, setPhotos] = useState<ClosureEvidencePhoto[]>(
    mission.closureReport?.photos || []
  );

  // Casualties count (starts 0, no mock pre-fills per FR-RS-03)
  const [casualtiesTreated, setCasualtiesTreated] = useState<number>(
    mission.closureReport?.casualtiesTreated ?? 0
  );
  const [casualtiesHospitalized, setCasualtiesHospitalized] = useState<number>(
    mission.closureReport?.casualtiesHospitalized ?? 0
  );

  // Toggles
  const [fireExtinguished, setFireExtinguished] = useState<boolean>(
    mission.closureReport?.fireExtinguished ?? true
  );
  const [hazardsNeutralized, setHazardsNeutralized] = useState<boolean>(
    mission.closureReport?.hazardsNeutralized ?? true
  );

  // Action summary (minimum 10 chars required by backend /resolve)
  const [actionSummary, setActionSummary] = useState<string>(
    mission.closureReport?.actionSummary || ''
  );

  // Handover Info (no hardcoded fake doctor/hospitals)
  const [handoverEntity, setHandoverEntity] = useState<string>(
    mission.closureReport?.handoverEntity || ''
  );
  const [handoverContactName, setHandoverContactName] = useState<string>(
    mission.closureReport?.handoverContactName || ''
  );
  const [handoverContactPhone, setHandoverContactPhone] = useState<string>(
    mission.closureReport?.handoverContactPhone || ''
  );
  const [handoverNotes, setHandoverNotes] = useState<string>('');

  // Signature
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>(
    mission.closureReport?.signatureDataUrl || ''
  );

  // Resources used (starts clean, can add dynamically)
  const [resources, setResources] = useState<{ name: string; quantity: number; unit: string }[]>(
    mission.closureReport?.resourcesUsed || []
  );
  const [newResourceName, setNewResourceName] = useState<string>('');
  const [newResourceQty, setNewResourceQty] = useState<number>(1);
  const [newResourceUnit, setNewResourceUnit] = useState<string>('Bình');

  // Trang thiết bị gắn trên xe của kíp trực (FE_MOBILE_HANDOFF §25)
  const [vehicleEquipment, setVehicleEquipment] = useState<EquipmentDto[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState<boolean>(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingEquipment(true);

    equipmentService
      .list()
      .then((data) => {
        if (!isMounted) return;
        const plate = mission.vehiclePlate?.toUpperCase()?.trim();
        const vehId = mission.vehicleId;
        const teamPlates = (mission.teamVehicles || []).map((p) => p.toUpperCase().trim());

        // Lọc các thiết bị đã trang bị trên xe của kíp trực
        const onVehicle = (data || []).filter((item) => {
          const itemPlate = item.rescueUnitPlate?.toUpperCase()?.trim();
          if (plate && itemPlate === plate) return true;
          if (vehId && item.rescueUnitId === vehId) return true;
          if (itemPlate && teamPlates.includes(itemPlate)) return true;
          return false;
        });

        // Ưu tiên hiển thị thiết bị trên xe; nếu xe chưa cấu hình riêng thì hiển thị toàn bộ thiết bị trạm
        setVehicleEquipment(onVehicle.length > 0 ? onVehicle : (data || []));
      })
      .catch((err) => {
        console.warn('[StaffClosureReportModal] Error loading vehicle equipment:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingEquipment(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, mission.vehicleId, mission.vehiclePlate, mission.teamVehicles]);

  const selectedEquipment = useMemo(() => {
    return vehicleEquipment.find((e) => e.id === selectedEquipmentId) || null;
  }, [vehicleEquipment, selectedEquipmentId]);

  const inferEquipmentUnit = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('bình')) return 'Bình';
    if (lower.includes('túi')) return 'Túi';
    if (lower.includes('hộp')) return 'Hộp';
    if (lower.includes('cuộn') || lower.includes('băng') || lower.includes('gạc') || lower.includes('dây')) return 'Cuộn';
    if (lower.includes('bộ') || lower.includes('đồ bảo hộ') || lower.includes('quần áo')) return 'Bộ';
    if (lower.includes('đôi') || lower.includes('găng') || lower.includes('ủng')) return 'Đôi';
    if (lower.includes('viên') || lower.includes('thuốc')) return 'Viên';
    if (lower.includes('lít') || lower.includes('nước') || lower.includes('xăng') || lower.includes('dầu')) return 'Lít';
    if (lower.includes('ống')) return 'Ống';
    return 'Cái';
  };

  const handleSelectEquipment = (eqId: string) => {
    setSelectedEquipmentId(eqId);
    if (!eqId) return;
    const item = vehicleEquipment.find((e) => e.id === eqId);
    if (item) {
      setNewResourceName(item.name);
      setNewResourceUnit(inferEquipmentUnit(item.name));
      setNewResourceQty(1);
    }
  };

  // Validation error banner
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState<boolean>(false);

  if (!isOpen) return null;

  // File upload handler - Upload trực tiếp lên server qua mediaService để có HTTPS URL hợp lệ
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhotos(true);
    try {
      const fileList = Array.from(files);
      for (let idx = 0; idx < fileList.length; idx++) {
        const file = fileList[idx];
        let photoUrl = '';
        try {
          photoUrl = await mediaService.upload(file);
        } catch (uploadErr) {
          console.warn('[StaffClosureReportModal] Server upload fallback to dataUrl:', uploadErr);
          photoUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (loadEvent) => resolve((loadEvent.target?.result as string) || '');
            reader.readAsDataURL(file);
          });
        }

        if (photoUrl) {
          const newPhoto: ClosureEvidencePhoto = {
            id: `photo-${Date.now()}-${idx}`,
            url: photoUrl,
            category: 'after_action',
            label: file.name.slice(0, 30),
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          };
          setPhotos((prev) => [...prev, newPhoto]);
        }
      }
    } finally {
      setIsUploadingPhotos(false);
      e.target.value = '';
    }
  };

  // Quick sample photo for testing if user has no image file on hand
  const handleAddSamplePhoto = () => {
    const sampleUrls = [
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
    ];
    const newPhoto: ClosureEvidencePhoto = {
      id: `photo-${Date.now()}`,
      url: sampleUrls[photos.length % sampleUrls.length],
      category: 'after_action',
      label: `Ảnh nghiệm thu hiện trường #${photos.length + 1}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setPhotos([...photos, newPhoto]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddResource = () => {
    if (!newResourceName.trim()) return;
    const name = newResourceName.trim();
    const unit = newResourceUnit.trim() || 'Cái';
    const qty = Math.max(1, newResourceQty);

    setResources((prev) => {
      const existingIdx = prev.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + qty,
        };
        return next;
      }
      return [...prev, { name, quantity: qty, unit }];
    });

    setNewResourceName('');
    setSelectedEquipmentId('');
    setNewResourceQty(1);
    setNewResourceUnit('Bình');
  };

  const handleRemoveResource = (index: number) => {
    setResources((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick fill valid sample data for rapid testing
  const handleQuickFillSample = () => {
    if (photos.length === 0) {
      handleAddSamplePhoto();
    }
    if (!actionSummary || actionSummary.trim().length < 10) {
      setActionSummary('Đã dập tắt đám cháy hoàn toàn lúc 14:45. Nạn nhân đã được sơ cứu và chuyển viện an toàn, kiểm soát hiện trường.');
    }
    if (casualtiesTreated === 0) setCasualtiesTreated(1);
    if (!handoverEntity) setHandoverEntity('Công an phường & Đội BV sở tại');
    if (!handoverContactName) setHandoverContactName('Đại úy Trần Văn Nam');
    if (!handoverContactPhone) setHandoverContactPhone('0908114115');

    // Không tự động ký thay người dùng - người dùng phải tự ký tay trên màn hình
    setValidationErrors((prev) => prev.filter((e) => !e.includes('ảnh') && !e.includes('Tóm tắt')));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    // Validation 1: Photos count >= 1 (FR-RS-03 / MSG42)
    if (photos.length === 0) {
      errors.push('Bắt buộc phải có ít nhất 1 ảnh hiện trường sau can thiệp (theo quy định FR-RS-03 / MSG42).');
    }

    // Validation 2: Action summary >= 10 chars
    if (actionSummary.trim().length < 10) {
      errors.push('Tóm tắt diễn biến & hành động phải có tối thiểu 10 ký tự.');
    }

    // Validation 3: Casualties count >= 0
    if (casualtiesTreated < 0 || casualtiesHospitalized < 0) {
      errors.push('Số nạn nhân phải là số nguyên không âm.');
    }

    // Validation 4: Chữ ký điện tử bắt buộc (quy định backend FR-RS-03, BR-25)
    if (!signatureDataUrl || signatureDataUrl.trim() === '') {
      errors.push('Bắt buộc phải ký tên xác nhận vào ô chữ ký bên dưới trước khi nộp báo cáo nghiệm thu.');
      signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      if (errors.some((e) => e.includes('chữ ký'))) {
        signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    setValidationErrors([]);

    const report: DigitalClosureReport = {
      missionId: mission.id,
      incidentId: mission.incidentId,
      vehiclePlate: mission.vehiclePlate,
      teamLeader: user?.fullName || 'Chỉ huy kíp xe',
      completedAt: new Date().toISOString(),
      actionSummary: actionSummary.trim(),
      casualtiesTreated,
      casualtiesHospitalized,
      fireExtinguished,
      hazardsNeutralized,
      resourcesUsed: resources,
      photos,
      handoverEntity: handoverEntity.trim(),
      handoverContactName: handoverContactName.trim(),
      handoverContactPhone: handoverContactPhone.trim(),
      handoverNotes: handoverNotes.trim() || undefined,
      handoverQrData: '',
      signatureDataUrl: signatureDataUrl || '',
      dispatchApprovalStatus: 'submitted',
    };

    staffAudioService.playSuccessChime();
    onSubmitReport(report);
  };

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 z-[9999] overflow-y-auto">
      {/* Fullscreen Backdrop Blur */}
      <div
        className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Centering Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4 md:p-6 text-center">
        <div className="relative z-10 w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 text-left flex flex-col max-h-[92vh] my-4 animate-fadeIn">
          {/* Header */}
          <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono font-bold text-red-600">
                    BÁO CÁO NGHIỆM THU HIỆN TRƯỜNG (FR-RS-03)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-600 border border-slate-200" title={mission.incidentId}>
                    Sự cố {formatShortId(mission.incidentCode || mission.incidentId)}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-0.5">
                  Nghiệm Thu &amp; Đóng Nhiệm Vụ Cứu Nạn
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleQuickFillSample}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
                title="Tự động điền đầy đủ thông tin hợp lệ để test nhanh"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Điền Mẫu Nhanh</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Body (Scrollable) */}
          <form
            id="closure-form"
            ref={formRef}
            onSubmit={handleSubmit}
            className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white"
          >
            {/* Team Representative Banner (Mục 26.2) */}
            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-[13px]">
                    Nghiệm thu đại diện kíp trực ({mission.stationTeamName ? `Tổ ${mission.stationTeamName}` : 'Tổ cứu hộ'})
                  </div>
                  <div className="text-slate-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>Biên bản này có giá trị nghiệm thu hoàn tất cho toàn bộ phương tiện của tổ:</span>
                    <span className="font-mono font-bold text-blue-800 bg-blue-100/70 px-1.5 py-0.5 rounded border border-blue-200">
                      {mission.vehiclePlate}
                    </span>
                  </div>
                </div>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-mono font-bold text-[11px] shrink-0 border border-blue-300">
                1 người nộp cho cả tổ
              </span>
            </div>
            {/* Validation Errors Alert */}
            {validationErrors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Vui lòng kiểm tra lại thông tin báo cáo:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 1: Photos Evidence */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-red-600" />
                    1. Ảnh Hiện Trường Sau Xử Lý (Bắt buộc &ge; 1 ảnh - MSG42)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Hiện có: <strong className={photos.length === 0 ? 'text-rose-600' : 'text-emerald-600'}>{photos.length} ảnh</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingPhotos}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    {isUploadingPhotos ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Đang Tải Lên...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Tải Ảnh Từ Thiết Bị
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddSamplePhoto}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ảnh Mẫu (Demo)
                  </button>
                </div>
              </div>

              {photos.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-red-400 bg-white rounded-xl p-6 text-center cursor-pointer transition-colors"
                >
                  <Camera className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">Chưa có ảnh bằng chứng nào được tải lên</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Nhấn để chọn ảnh từ máy hoặc sử dụng nút "Tải Ảnh Từ Thiết Bị" ở trên</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs flex flex-col"
                    >
                      <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold border backdrop-blur-md ${
                            CATEGORY_LABELS[photo.category]?.color
                          }`}
                        >
                          {CATEGORY_LABELS[photo.category]?.label}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                          title="Xóa ảnh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2 text-xs text-slate-800 font-medium truncate">
                        {photo.label}
                        <div className="text-[10px] font-mono text-slate-400">{photo.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Action Summary (Min 10 chars per Backend /resolve) */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-red-600" />
                  2. Tóm Tắt Diễn Biến &amp; Kết Quả Xử Lý Hiện Trường (Tối thiểu 10 ký tự)
                </label>
                <span className={`text-[11px] font-mono font-bold ${actionSummary.trim().length >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {actionSummary.trim().length} / 10 ký tự
                </span>
              </div>

              <textarea
                rows={3}
                value={actionSummary}
                onChange={(e) => setActionSummary(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:border-red-500 focus:outline-none leading-relaxed shadow-xs"
                placeholder="Ví dụ: Đã dập tắt đám cháy hoàn toàn lúc 14:45. 2 nạn nhân đã được đưa vào Bệnh viện an toàn..."
                required
              />
            </div>

            {/* Section 3: Casualties & Handover Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Casualties count & status */}
              <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-red-600" />
                  3. Thống Kê Nạn Nhân &amp; Tình Trạng
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-xs">
                    <span className="text-[11px] text-slate-500 font-mono uppercase">Sơ Cứu Tại Chỗ</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCasualtiesTreated(Math.max(0, casualtiesTreated - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 border border-slate-200 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-lg font-black text-red-600 font-mono flex-1 text-center">
                        {casualtiesTreated}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCasualtiesTreated(casualtiesTreated + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 border border-slate-200 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-xs">
                    <span className="text-[11px] text-slate-500 font-mono uppercase">Chuyển Viện Cấp Cứu</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCasualtiesHospitalized(Math.max(0, casualtiesHospitalized - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 border border-slate-200 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-lg font-black text-red-600 font-mono flex-1 text-center">
                        {casualtiesHospitalized}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCasualtiesHospitalized(casualtiesHospitalized + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 border border-slate-200 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 cursor-pointer shadow-xs hover:border-slate-300">
                    <span>Đám cháy / Sự cố đã dập tắt &amp; khống chế hoàn toàn</span>
                    <input
                      type="checkbox"
                      checked={fireExtinguished}
                      onChange={(e) => setFireExtinguished(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded bg-slate-100 border-slate-300 focus:ring-red-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 cursor-pointer shadow-xs hover:border-slate-300">
                    <span>Hiện trường đã phong tỏa an toàn &amp; bàn giao</span>
                    <input
                      type="checkbox"
                      checked={hazardsNeutralized}
                      onChange={(e) => setHazardsNeutralized(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded bg-slate-100 border-slate-300 focus:ring-red-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Handover Information Form (Clean, no fake QR) */}
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-red-600" />
                  4. Bàn Giao Hiện Trường Cho Đơn Vị / Đại Diện
                </label>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Đơn vị / Cơ quan tiếp nhận:</label>
                    <input
                      type="text"
                      value={handoverEntity}
                      onChange={(e) => setHandoverEntity(e.target.value)}
                      placeholder="Ví dụ: Công an phường, Ban QL tòa nhà, Bệnh viện..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-0.5">Họ tên người nhận:</label>
                      <input
                        type="text"
                        value={handoverContactName}
                        onChange={(e) => setHandoverContactName(e.target.value)}
                        placeholder="Họ và tên..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-0.5">Số điện thoại liên hệ:</label>
                      <input
                        type="text"
                        value={handoverContactPhone}
                        onChange={(e) => setHandoverContactPhone(e.target.value)}
                        placeholder="09xx..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Ghi chú bàn giao chi tiết:</label>
                    <textarea
                      rows={2}
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      placeholder="Nội dung bàn giao hiện trường, trang thiết bị hoặc nạn nhân..."
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Resources Consumed */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-red-600" />
                  5. Vật Tư &amp; Trang Thiết Bị Tiêu Hao Tại Hiện Trường
                </label>
                {mission.vehiclePlate && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    <Truck className="w-3 h-3 text-blue-600" />
                    Xe kíp trực: {mission.vehiclePlate}
                  </span>
                )}
              </div>

              {/* Lựa chọn nhanh từ trang thiết bị gắn trên xe */}
              <div className="space-y-2 bg-white/80 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-red-600" />
                    Chọn thiết bị đã trang bị trên xe:
                  </label>
                  {loadingEquipment && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                      Đang đồng bộ từ xe...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedEquipmentId}
                    onChange={(e) => handleSelectEquipment(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-medium shadow-2xs appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">
                      {loadingEquipment
                        ? '⏳ Đang tải trang thiết bị trên xe...'
                        : vehicleEquipment.length > 0
                        ? `-- Bấm để chọn thiết bị gắn trên xe ${mission.vehiclePlate ? `(${mission.vehiclePlate})` : ''} (${vehicleEquipment.length} mục) --`
                        : '-- Không có sẵn thiết bị trên xe (Có thể gõ nhập thủ công) --'}
                    </option>
                    {vehicleEquipment.map((eq) => {
                      const onThisCar = eq.rescueUnitPlate === mission.vehiclePlate;
                      return (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} • Tồn: {eq.quantity} {inferEquipmentUnit(eq.name)} ({onThisCar ? `Xe ${eq.rescueUnitPlate}` : (eq.rescueUnitPlate ? `Xe ${eq.rescueUnitPlate}` : 'Kho trạm')})
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Phím bấm chọn nhanh 1 chạm (Quick chips) */}
                {vehicleEquipment.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Gợi ý nhanh:</span>
                    {vehicleEquipment.map((eq) => {
                      const isSelected = selectedEquipmentId === eq.id || newResourceName.trim().toLowerCase() === eq.name.toLowerCase();
                      const isAdded = resources.some((r) => r.name.toLowerCase() === eq.name.toLowerCase());
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => handleSelectEquipment(eq.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-red-50 border-red-500 text-red-700 font-bold shadow-xs'
                              : isAdded
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-red-300 hover:bg-slate-50 shadow-2xs'
                          }`}
                          title={`Chọn nhanh ${eq.name} (có ${eq.quantity} trên xe)`}
                        >
                          <span>{eq.name}</span>
                          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                            x{eq.quantity}
                          </span>
                          {isAdded && <CheckCircle2 className="w-3 h-3 text-emerald-600 inline ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dòng nhập chi tiết & bấm Thêm */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[160px] relative">
                  <input
                    type="text"
                    list="vehicle-equipment-datalist"
                    value={newResourceName}
                    onChange={(e) => {
                      setNewResourceName(e.target.value);
                      const matched = vehicleEquipment.find(
                        (eq) => eq.name.toLowerCase() === e.target.value.toLowerCase()
                      );
                      if (matched) {
                        setSelectedEquipmentId(matched.id);
                        setNewResourceUnit(inferEquipmentUnit(matched.name));
                      } else {
                        setSelectedEquipmentId('');
                      }
                    }}
                    placeholder="Tên vật tư (bình bột, gạc y tế... hoặc chọn từ xe ở trên)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                  />
                  <datalist id="vehicle-equipment-datalist">
                    {vehicleEquipment.map((eq) => (
                      <option key={eq.id} value={eq.name}>
                        {eq.name} ({eq.quantity} {inferEquipmentUnit(eq.name)} trên xe)
                      </option>
                    ))}
                  </datalist>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={selectedEquipment ? selectedEquipment.quantity : 999}
                    value={newResourceQty}
                    onChange={(e) => setNewResourceQty(Number(e.target.value) || 1)}
                    className="w-20 bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-mono text-center"
                    title={selectedEquipment ? `Tồn trên xe: ${selectedEquipment.quantity}` : undefined}
                  />
                  {selectedEquipment && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      /{selectedEquipment.quantity}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={newResourceUnit}
                  onChange={(e) => setNewResourceUnit(e.target.value)}
                  placeholder="Đơn vị"
                  className="w-20 bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={handleAddResource}
                  disabled={!newResourceName.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm
                </button>
              </div>

              {selectedEquipment && (
                <div className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center justify-between">
                  <span>
                   Thiết bị từ xe: <strong>{selectedEquipment.name}</strong> (Tồn trên xe: {selectedEquipment.quantity} {newResourceUnit})
                  </span>
                  <span className="text-[10px] text-blue-500">
                    {selectedEquipment.rescueUnitPlate ? `Biển số: ${selectedEquipment.rescueUnitPlate}` : 'Kho trạm'}
                  </span>
                </div>
              )}

              {resources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {resources.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-1">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-slate-800 font-medium truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-red-600">
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveResource(idx)}
                          className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-xs italic py-1">
                  Chưa ghi nhận vật tư tiêu hao cho lượt cứu nạn này.
                </div>
              )}
            </div>

            {/* Section 6: Signature Pad Component */}
            <div
              ref={signatureSectionRef}
              className={`rounded-xl p-4 space-y-3 transition-all ${
                validationErrors.some((e) => e.includes('chữ ký'))
                  ? 'bg-rose-50 border-2 border-rose-500 shadow-md shadow-rose-500/10'
                  : 'bg-slate-50 border border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-red-600" />
                  6. Chữ Ký Xác Nhận Của Thành Viên Tổ (Bắt buộc)
                </label>
                <span className={`text-[11px] font-mono font-bold ${signatureDataUrl ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {signatureDataUrl ? '✓ Đã ký' : '✕ Bắt buộc ký'}
                </span>
              </div>
              {validationErrors.some((e) => e.includes('chữ ký')) && (
                <div className="text-rose-700 font-semibold text-xs flex items-center gap-1.5 bg-white/80 p-2 rounded-lg border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  Vui lòng ký tên bằng chuột hoặc cảm ứng vào khung trắng dưới đây trước khi nộp!
                </div>
              )}
              <StaffSignaturePad
                onSaveSignature={(dataUrl) => {
                  setSignatureDataUrl(dataUrl);
                  if (dataUrl) {
                    setValidationErrors((prev) => prev.filter((e) => !e.includes('chữ ký')));
                  }
                }}
                initialSignature={signatureDataUrl}
              />
            </div>
          </form>

          {/* Validation Notice right above footer buttons */}
          {validationErrors.length > 0 && (
            <div className="px-5 py-3 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{validationErrors[0]}</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFillSample}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer shrink-0"
              >
                Tự động điền mẫu hợp lệ &rarr;
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="submit"
              form="closure-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 border border-red-600 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              {isSubmitting ? 'Đang Nộp Báo Cáo...' : 'Nghiệm Thu & Nộp Báo Cáo Hoàn Tất'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
