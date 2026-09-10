import React, { useState } from 'react';
import {
  FileCheck2,
  Camera,
  Upload,
  Trash2,
  Plus,
  QrCode,
  PenTool,
  CheckCircle2,
  X,
  ShieldAlert,
  Flame,
  UserCheck,
  PackageCheck,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { DigitalClosureReport, ClosureEvidencePhoto, StaffMission } from '../../types/staff';
import { mockEvidencePhotos } from '../../data/staffMock';
import { StaffQrHandover } from './StaffQrHandover';
import { StaffSignaturePad } from './StaffSignaturePad';
import { staffAudioService } from '../../services/staffAudioService';

interface StaffClosureReportModalProps {
  mission: StaffMission;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: DigitalClosureReport) => void;
}

const CATEGORY_LABELS: Record<ClosureEvidencePhoto['category'], { label: string; color: string }> = {
  before_rescue: { label: 'Hiện trường ban đầu', color: 'bg-amber-500/20 text-yellow-400 border-amber-500/40' },
  after_action: { label: 'Sau khi dập tắt / xử lý', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  casualty_treatment: { label: 'Sơ cứu & Chuyển viện', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  property_damage: { label: 'Ghi nhận thiệt hại', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
};

export const StaffClosureReportModal: React.FC<StaffClosureReportModalProps> = ({
  mission,
  isOpen,
  onClose,
  onSubmitReport,
}) => {
  const [photos, setPhotos] = useState<ClosureEvidencePhoto[]>(
    mission.closureReport?.photos || mockEvidencePhotos
  );
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [casualtiesTreated, setCasualtiesTreated] = useState<number>(
    mission.closureReport?.casualtiesTreated ?? 2
  );
  const [casualtiesHospitalized, setCasualtiesHospitalized] = useState<number>(
    mission.closureReport?.casualtiesHospitalized ?? 2
  );
  const [fireExtinguished, setFireExtinguished] = useState<boolean>(
    mission.closureReport?.fireExtinguished ?? true
  );
  const [hazardsNeutralized, setHazardsNeutralized] = useState<boolean>(
    mission.closureReport?.hazardsNeutralized ?? true
  );
  const [actionSummary, setActionSummary] = useState<string>(
    mission.closureReport?.actionSummary ||
      'Đã triển khai 02 lăng B phun bọt dập tắt hoàn toàn đám cháy tại tầng 2. Cứu nạn an toàn 02 người mắc kẹt tại ban công, đã sơ cứu ban đầu và chuyển xe cấp cứu 115 an toàn.'
  );

  const [handoverEntity, setHandoverEntity] = useState<string>(
    mission.closureReport?.handoverEntity || 'Bệnh Viện Cấp Cứu 115 TP.HCM'
  );
  const [handoverContactName, setHandoverContactName] = useState<string>(
    mission.closureReport?.handoverContactName || 'BS. Lê Minh Trí'
  );
  const [handoverContactPhone, setHandoverContactPhone] = useState<string>(
    mission.closureReport?.handoverContactPhone || '028 3865 2368'
  );
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>(
    mission.closureReport?.signatureDataUrl || ''
  );

  const [resources, setResources] = useState([
    { name: 'Bột chữa cháy ABC', quantity: 4, unit: 'Bình 8kg' },
    { name: 'Băng gạc vô trùng sơ cứu', quantity: 6, unit: 'Cuộn' },
    { name: 'Mặt nạ phòng khói khí độc', quantity: 2, unit: 'Chiếc' },
  ]);

  if (!isOpen) return null;

  // Add dummy evidence photo
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
      label: `Ảnh hiện trường sau can thiệp #${photos.length + 1}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setPhotos([...photos, newPhoto]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const report: DigitalClosureReport = {
      missionId: mission.id,
      incidentId: mission.incidentId,
      vehiclePlate: mission.vehiclePlate,
      teamLeader: 'Nguyễn Văn An',
      completedAt: new Date().toISOString(),
      actionSummary,
      casualtiesTreated,
      casualtiesHospitalized,
      fireExtinguished,
      hazardsNeutralized,
      resourcesUsed: resources,
      photos,
      handoverEntity,
      handoverContactName,
      handoverContactPhone,
      handoverQrData: `QR-HANDOVER-${mission.id}-${Date.now()}`,
      signatureDataUrl: signatureDataUrl || 'SIGNED-DIGITALLY',
      dispatchApprovalStatus: 'submitted',
    };

    staffAudioService.playSuccessChime();
    onSubmitReport(report);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Fullscreen Backdrop Blur */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
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
                <span className="text-xs uppercase font-mono-data font-bold text-red-600">
                  DIGITAL CLOSURE REPORT
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono-data text-slate-600 border border-slate-200">
                  Nhiệm vụ {mission.id}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Báo Cáo Hoàn Tất Xử Lý Sự Cố Hiện Trường
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form id="closure-form" onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* Section 1: Photos Evidence */}
          <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-mono-data font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-red-600" />
                1. Bằng Chứng & Hình Ảnh Hiện Trường Sau Xử Lý ({photos.length} ảnh)
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddSamplePhoto}
                  className="flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm Ảnh Hiện Trường (Demo)
                </button>
              </div>
            </div>

            {/* Photos Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col"
                >
                  <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                    <img
                      src={photo.url}
                      alt={photo.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border backdrop-blur-md ${
                        CATEGORY_LABELS[photo.category]?.color
                      }`}
                    >
                      {CATEGORY_LABELS[photo.category]?.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2 text-xs text-slate-800 font-medium truncate">
                    {photo.label}
                    <div className="text-[10px] font-mono-data text-slate-400">{photo.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: QR Handover Verification Component */}
          <StaffQrHandover
            missionId={mission.id}
            incidentId={mission.incidentId}
            currentEntity={handoverEntity}
            onScanSuccess={(data) => {
              setHandoverEntity(data.entity);
              setHandoverContactName(data.contact);
              setHandoverContactPhone(data.phone);
            }}
          />

          {/* Section 3: Summary & Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Casualties & Status Toggles */}
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="text-xs font-mono-data font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-red-600" />
                2. Thống Kê Nạn Nhân & Tình Trạng Hiện Trường
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-sm">
                  <span className="text-[11px] text-slate-500 font-mono-data uppercase">Sơ Cứu Tại Chỗ</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCasualtiesTreated(Math.max(0, casualtiesTreated - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 border border-slate-200"
                    >
                      -
                    </button>
                    <span className="text-lg font-black text-red-600 font-mono-data flex-1 text-center">
                      {casualtiesTreated}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCasualtiesTreated(casualtiesTreated + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 border border-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-sm">
                  <span className="text-[11px] text-slate-500 font-mono-data uppercase">Chuyển Viện Cấp Cứu</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCasualtiesHospitalized(Math.max(0, casualtiesHospitalized - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 border border-slate-200"
                    >
                      -
                    </button>
                    <span className="text-lg font-black text-red-600 font-mono-data flex-1 text-center">
                      {casualtiesHospitalized}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCasualtiesHospitalized(casualtiesHospitalized + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 border border-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Status toggles */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 cursor-pointer shadow-sm hover:border-slate-300">
                  <span>Đám cháy / Sự cố đã dập tắt hoàn toàn</span>
                  <input
                    type="checkbox"
                    checked={fireExtinguished}
                    onChange={(e) => setFireExtinguished(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded bg-slate-100 border-slate-300 focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 cursor-pointer shadow-sm hover:border-slate-300">
                  <span>Hiện trường đã phong tỏa an toàn & bàn giao</span>
                  <input
                    type="checkbox"
                    checked={hazardsNeutralized}
                    onChange={(e) => setHazardsNeutralized(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded bg-slate-100 border-slate-300 focus:ring-red-500"
                  />
                </label>
              </div>
            </div>

            {/* Right: Resources & Operational Note */}
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="text-xs font-mono-data font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-red-600" />
                3. Vật Tư & Diễn Biến Xử Lý
              </label>

              {/* Action Summary Note */}
              <div>
                <label className="text-[11px] text-slate-500 font-mono-data block mb-1">
                  Tóm tắt diễn biến & hành động tại hiện trường:
                </label>
                <textarea
                  rows={3}
                  value={actionSummary}
                  onChange={(e) => setActionSummary(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:border-red-500 focus:outline-none leading-relaxed shadow-sm"
                  placeholder="Ghi rõ chi tiết công tác cứu nạn cứu hộ..."
                  required
                />
              </div>

              {/* Consumed resources list */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-500 font-mono-data">Vật tư tiêu hao:</div>
                <div className="space-y-1">
                  {resources.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs shadow-sm"
                    >
                      <span className="text-slate-700">{item.name}</span>
                      <span className="font-mono-data font-bold text-red-600">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Signature Pad Component */}
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
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            Đóng
          </button>

          <button
            type="submit"
            form="closure-form"
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 border border-red-600 flex items-center gap-2 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            Nộp Báo Cáo Hoàn Tất & Sẵn Sàng Nhận Nhiệm Vụ Mới
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
