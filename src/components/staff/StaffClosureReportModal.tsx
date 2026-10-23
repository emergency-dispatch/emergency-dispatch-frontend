import React, { useState, useRef } from 'react';
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
  Phone,
  User,
  FileText,
} from 'lucide-react';
import type { DigitalClosureReport, ClosureEvidencePhoto, StaffMission } from '../../types/staff';
import { StaffSignaturePad } from './StaffSignaturePad';
import { staffAudioService } from '../../services/staffAudioService';
import { useAuth } from '../../hooks/useAuth';

interface StaffClosureReportModalProps {
  mission: StaffMission;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: DigitalClosureReport) => void;
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
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Validation error banner
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string;
        if (result) {
          const newPhoto: ClosureEvidencePhoto = {
            id: `photo-${Date.now()}-${idx}`,
            url: result,
            category: 'after_action',
            label: file.name.slice(0, 30),
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          };
          setPhotos((prev) => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
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
    setResources((prev) => [
      ...prev,
      { name: newResourceName.trim(), quantity: newResourceQty, unit: newResourceUnit.trim() || 'Cái' },
    ]);
    setNewResourceName('');
    setNewResourceQty(1);
  };

  const handleRemoveResource = (index: number) => {
    setResources((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    // Validation 1: Photos count >= 1 (FR-RS-03 / MSG42)
    if (photos.length === 0) {
      errors.push('Bắt buộc phải có ít nhất 1 ảnh hiện trường sau can thiệp (theo quy định FR-RS-03 / MSG42).');
    }

    // Validation 2: Action summary >= 10 chars (Backend /resolve requirement)
    if (actionSummary.trim().length < 10) {
      errors.push('Tóm tắt diễn biến & hành động phải có tối thiểu 10 ký tự (theo yêu cầu API Backend /resolve).');
    }

    // Validation 3: Casualties count >= 0
    if (casualtiesTreated < 0 || casualtiesHospitalized < 0) {
      errors.push('Số nạn nhân phải là số nguyên không âm.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
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
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-600 border border-slate-200">
                    Sự cố #{mission.incidentId}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-0.5">
                  Nghiệm Thu &amp; Đóng Nhiệm Vụ Cứu Nạn
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body (Scrollable) */}
          <form id="closure-form" onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
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
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Tải Ảnh Từ Thiết Bị
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

            {/* Section 4: Resources Consumed */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-red-600" />
                5. Vật Tư &amp; Trang Thiết Bị Tiêu Hao Tại Hiện Trường
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  placeholder="Tên vật tư (bình bột, gạc y tế...)"
                  className="flex-1 min-w-[160px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                />
                <input
                  type="number"
                  min={1}
                  value={newResourceQty}
                  onChange={(e) => setNewResourceQty(Number(e.target.value) || 1)}
                  className="w-20 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-mono text-center"
                />
                <input
                  type="text"
                  value={newResourceUnit}
                  onChange={(e) => setNewResourceUnit(e.target.value)}
                  placeholder="Đơn vị"
                  className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Thêm
                </button>
              </div>

              {resources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {resources.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs shadow-xs"
                    >
                      <span className="text-slate-800 font-medium truncate">{item.name}</span>
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

            {/* Section 5: Signature Pad Component */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <StaffSignaturePad
                onSaveSignature={(dataUrl) => setSignatureDataUrl(dataUrl)}
                initialSignature={signatureDataUrl}
              />
            </div>
          </form>

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
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 border border-red-600 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Nghiệm Thu &amp; Nộp Báo Cáo Hoàn Tất
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
