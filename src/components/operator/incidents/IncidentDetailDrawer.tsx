import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  BrainCircuit,
  Building2,
  CircleCheck,
  Clock,
  Eye,
  Loader2,
  Lock,
  MapPin,
  Phone,
  RotateCcw,
  Siren,
  User,
  X,
} from 'lucide-react';
import { HazardTagBadge } from '../../common/HazardTagBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { IncidentAuditTimeline } from './IncidentAuditTimeline';
import { IncidentMediaGallery } from './IncidentMediaGallery';
import { ReporterMedicalCard } from './ReporterMedicalCard';
import { SeverityBadge } from './SeverityBadge';
import {
  BLOCK_DURATION_OPTIONS,
  CANCELLATION_REASON_OPTIONS,
  CONFIRMABLE_CATEGORIES,
  INCIDENT_CATEGORY_META,
  LOW_CONFIDENCE_THRESHOLD,
  OVERRIDE_REASON_MIN_LENGTH,
  SEVERITY_LEVEL_META,
} from '../../../data/incidentMock';
import { useNow } from '../../../hooks/useNow';
import { formatCountdown } from '../../../utils/incidentFormat';
import type {
  BlockDuration,
  Incident,
  IncidentCategory,
  OperatorCancellationCode,
  SeverityLevel,
} from '../../../types/incident';
import type { Station } from '../../../types/vehicle';

const CONFIRMABLE_LEVELS: SeverityLevel[] = [1, 2, 3];
// Lý do chuyển trạm: backend yêu cầu tối thiểu 5 ký tự.
const TRANSFER_REASON_MIN_LENGTH = 5;

type DrawerMode = 'review' | 'reject' | 'transfer';

interface IncidentDetailDrawerProps {
  incident: Incident | null;
  currentOperatorId: string;
  isEscalated?: boolean;
  isLocking?: boolean;
  onClose: () => void;
  /** `category` gửi kèm khi sự cố chưa có loại đã xác nhận (incident.needsEventType). */
  onApprove: (
    id: string,
    confirmedSeverity: SeverityLevel,
    overrideReason: string | undefined,
    category: IncidentCategory | undefined
  ) => void;
  onReject: (id: string, reason: string, blockDuration: BlockDuration | null, reasonCode: OperatorCancellationCode) => void;
  /** Chuyển sự cố sang trạm khác. Không truyền → ẩn nút "Chuyển trạm". */
  onTransfer?: (id: string, stationId: string, reason: string) => void;
  /** Trạm có thể chuyển tới (đã bỏ trạm đang phụ trách). */
  transferStations?: Station[];
  onRelock: (id: string) => void;
  /** Trả số đầy đủ (backend ghi vết Audit Trail), null nếu thất bại. */
  onRevealPhone: (id: string) => Promise<string | null>;
  isSubmitting?: boolean;
  errorMsg?: string | null;
}

export const IncidentDetailDrawer: React.FC<IncidentDetailDrawerProps> = ({
  incident,
  currentOperatorId,
  isEscalated = false,
  isLocking = false,
  onClose,
  onApprove,
  onReject,
  onTransfer,
  transferStations = [],
  onRelock,
  onRevealPhone,
  isSubmitting = false,
  errorMsg = null,
}) => {
  const now = useNow();
  const [confirmedSeverity, setConfirmedSeverity] = useState<SeverityLevel | null>(null);
  const [confirmedCategory, setConfirmedCategory] = useState<IncidentCategory | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [mode, setMode] = useState<DrawerMode>('review');
  // Tab nội dung: thẩm định (media + AI) hoặc lịch sử xử lý (audit trail).
  const [tab, setTab] = useState<'review' | 'history'>('review');
  const rejecting = mode === 'reject';
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCode, setRejectCode] = useState<OperatorCancellationCode>('FalseReport');
  const [transferStationId, setTransferStationId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [blockPhone, setBlockPhone] = useState(false);
  const [blockDuration, setBlockDuration] = useState<BlockDuration>('30d');
  // Backend luôn trả số đã che; số đầy đủ chỉ có sau khi bấm "Hiện số".
  const [revealedPhone, setRevealedPhone] = useState<{ phone: string; at: Date } | null>(null);
  const [revealingPhone, setRevealingPhone] = useState(false);

  // Sync severity khi mở drawer mới HOẶC khi AI xong (aiPending → false).
  // Dùng ref để không ghi đè khi Operator đã tự tay chọn cấp khác.
  const operatorOverrodeRef = React.useRef(false);

  useEffect(() => {
    if (!incident) return;
    // Mở sự cố mới → reset flag và chọn severity theo AI
    operatorOverrodeRef.current = false;
    setConfirmedSeverity(incident.aiUnclassified || incident.aiFailed ? null : incident.severity);
    // Loại sự cố chưa xác nhận → gợi ý sẵn theo loại SOS người dân chọn (nếu suy được), Operator vẫn đổi được.
    setConfirmedCategory(incident.category === 'unknown' ? null : incident.category);
    setOverrideReason('');
    setMode('review');
    setTab('review');
    setRejectReason('');
    setRejectCode('FalseReport');
    setTransferStationId('');
    setTransferReason('');
    setBlockPhone(false);
    setBlockDuration('30d');
    setRevealedPhone(null);
  }, [incident?.id]);

  // AI vừa xong phân tích (aiPending false → severity mới) — cập nhật nếu Operator chưa override.
  useEffect(() => {
    if (!incident || incident.aiPending) return;
    if (operatorOverrodeRef.current) return; // Operator đã chọn tay → không ghi đè
    setConfirmedSeverity(incident.aiUnclassified || incident.aiFailed ? null : incident.severity);
  }, [incident?.aiPending, incident?.severity, incident?.aiUnclassified, incident?.aiFailed]);


  if (!incident) return null;

  const waitMinutes = Math.max(0, Math.round((now - new Date(incident.createdAt).getTime()) / 60000));
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  // AI lỗi / quá thời gian chờ: % tin cậy và cấp đề xuất vô nghĩa → báo rõ là AI thất bại, không phải "độ tin cậy thấp".
  const aiFailed = !incident.aiPending && incident.aiFailed;
  // Nhãn "AI" chỉ khi AI thực sự đề xuất được cấp 1–3.
  const hasAiSeverity = !incident.aiPending && !aiFailed && !incident.aiUnclassified;
  const isLowConfidence = hasAiSeverity && incident.confidenceScore < LOW_CONFIDENCE_THRESHOLD;
  const hasPhone = /\d/.test(incident.reporterPhone);

  const lockRemainingMs = incident.lock ? new Date(incident.lock.expiresAt).getTime() - now : 0;
  const activeLock = incident.lock && lockRemainingMs > 0 ? incident.lock : null;
  const lockedByOther = !!activeLock && activeLock.operatorId !== currentOperatorId;
  const canAct = !!activeLock && !lockedByOther;
  const lockWasMine = incident.lock?.operatorId === currentOperatorId;

  // Backend coi Unclassified → Level 1–3 là ghi đè AI (bắt buộc operatorNotes ≥ 5 ký tự), nên ca AI không phân loại
  // được luôn cần lý do, kể cả khi chọn Cấp 1.
  const isOverride =
    confirmedSeverity !== null && (!hasAiSeverity || confirmedSeverity !== incident.severity);
  const overrideReasonLength = overrideReason.trim().length;
  const overrideReasonValid = !isOverride || overrideReasonLength >= OVERRIDE_REASON_MIN_LENGTH;
  // Backend chưa có loại sự cố (eventType None) → bắt buộc chọn Cháy nổ / Tai nạn.
  const categoryValid = !incident.needsEventType || (confirmedCategory !== null && confirmedCategory !== 'unknown');
  const canApprove = canAct && !isSubmitting && confirmedSeverity !== null && overrideReasonValid && categoryValid;

  const transferReasonValid = transferReason.trim().length >= TRANSFER_REASON_MIN_LENGTH;
  const canTransfer = canAct && !isSubmitting && !!transferStationId && transferReasonValid;

  const handleApprove = () => {
    if (!confirmedSeverity) return;
    onApprove(
      incident.id,
      confirmedSeverity,
      isOverride ? overrideReason.trim() : undefined,
      incident.needsEventType ? (confirmedCategory ?? undefined) : undefined
    );
  };

  const handleConfirmReject = () => {
    const label = CANCELLATION_REASON_OPTIONS.find((o) => o.value === rejectCode)?.label ?? '';
    onReject(
      incident.id,
      rejectReason.trim() || `Điều phối viên hủy ca: ${label.toLowerCase()}.`,
      hasPhone && blockPhone ? blockDuration : null,
      rejectCode
    );
  };

  const handleConfirmTransfer = () => {
    if (!onTransfer || !canTransfer) return;
    onTransfer(incident.id, transferStationId, transferReason.trim());
  };

  const handleRevealPhone = async () => {
    setRevealingPhone(true);
    const phone = await onRevealPhone(incident.id);
    setRevealingPhone(false);
    if (phone) setRevealedPhone({ phone, at: new Date() });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />

      <aside className="fixed top-0 right-0 h-full w-full max-w-5xl bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-[11px] font-mono-data text-slate-500 uppercase tracking-widest">Chi tiết sự cố</p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5 truncate">{incident.title}</h2>
          </div>
          {onTransfer && transferStations.length > 0 && mode !== 'transfer' && (
            <button
              onClick={() => setMode('transfer')}
              disabled={!canAct || isSubmitting}
              title={canAct ? 'Chuyển sự cố sang trạm khác phụ trách' : 'Nhận ca trước khi chuyển trạm'}
              className="ml-auto mr-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Chuyển trạm
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isEscalated && (
          <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-red-600 text-xs text-white font-semibold">
            <Siren className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            Sự cố đã leo thang — chờ quá ngưỡng mà chưa có đội nhận. Ưu tiên thẩm định và điều phối ngay.
          </div>
        )}

        {isLocking ? (
          <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            Đang nhận ca xử lý...
          </div>
        ) : lockedByOther ? (
          <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-slate-100 border-b border-slate-200 text-xs text-slate-700">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              Ca đang được xử lý bởi <strong>{activeLock.operatorName}</strong> — chỉ xem, không thể thao tác. Tự mở
              khóa sau <strong className="font-mono-data">{formatCountdown(lockRemainingMs)}</strong>.
            </span>
          </div>
        ) : canAct ? (
          <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              Bạn đang giữ ca này — còn <strong className="font-mono-data">{formatCountdown(lockRemainingMs)}</strong>{' '}
              trước khi ca được trả về hàng đợi.
            </span>
          </div>
        ) : (
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {lockWasMine
                ? 'Hết thời gian giữ ca — ca đã được trả về hàng đợi.'
                : 'Ca chưa có người xử lý — nhận ca để thao tác.'}
            </span>
            <button
              onClick={() => onRelock(incident.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-amber-300 font-bold hover:bg-amber-100 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {lockWasMine ? 'Nhận lại ca' : 'Nhận ca'}
            </button>
          </div>
        )}

        <div className="shrink-0 flex gap-1 px-5 pt-3 border-b border-slate-200" role="tablist">
          {(
            [
              ['review', 'Thẩm định'],
              ['history', 'Lịch sử xử lý'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 -mb-px border-b-2 text-sm font-semibold transition-colors ${
                tab === key ? 'border-red-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'history' ? (
            <div className="p-5 max-w-2xl">
              <IncidentAuditTimeline key={incident.id} incidentId={incident.id} />
            </div>
          ) : (
          <div className="grid md:grid-cols-2 gap-5 p-5">
            {/* Cột trái: media hiện trường + thông tin người báo */}
            <div className="space-y-4 min-w-0">
              <IncidentMediaGallery key={incident.id} media={incident.media} title={incident.title} />

              <div>
                <p className="text-xs font-mono-data uppercase tracking-widest text-slate-400 font-bold mb-1.5">
                  Mô tả của người báo
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">{incident.description}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{incident.reporterName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono-data truncate">
                    {revealedPhone?.phone ?? incident.reporterPhone}
                  </span>
                  {hasPhone && !revealedPhone && (
                    <button
                      onClick={handleRevealPhone}
                      disabled={revealingPhone || lockedByOther}
                      className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 shrink-0"
                    >
                      {revealingPhone ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                      Hiện số
                    </button>
                  )}
                </div>
                {revealedPhone && (
                  <p className="text-[11px] text-slate-400 pl-5">
                    Đã ghi vết lượt xem số lúc {revealedPhone.at.toLocaleTimeString('vi-VN')}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{incident.area}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{waitMinutes} phút trước</span>
                </div>
                {incident.responsibleStationName && (
                  <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Trạm phụ trách: {incident.responsibleStationName}</span>
                  </div>
                )}
                {incident.isOutOfServiceArea && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    SOS ngoài khu vực phục vụ
                    {incident.distanceOutsideAreaKm != null &&
                      ` (cách ${incident.distanceOutsideAreaKm.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km)`}
                    — thời gian tiếp cận có thể lâu hơn.
                  </p>
                )}
              </div>

              <ReporterMedicalCard profile={incident.reporterMedical} smsLog={incident.emergencySmsLog} />
            </div>

            {/* Cột phải: kết quả AI + thẩm định */}
            <div className="space-y-4 min-w-0">
              {aiFailed && (
                <div className="flex items-start gap-2 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-3 text-xs text-slate-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
                  <span>
                    <strong>AI chưa phân tích được</strong> (lỗi hoặc quá thời gian chờ) — vui lòng đánh giá thủ công dựa
                    trên ảnh/video và mô tả.
                  </span>
                </div>
              )}

              {isLowConfidence && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Độ tin cậy thấp.</strong> Hình ảnh có thể không khớp với mô tả — đối chiếu kỹ media trước
                    khi duyệt hoặc hủy ca.
                  </span>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono-data uppercase tracking-widest text-slate-500 font-bold">
                  <BrainCircuit className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  Kết quả phân tích AI
                </div>
                {incident.aiPending ? (
                  <div className="flex items-start gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs text-slate-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5 text-red-600" />
                    <span>
                      <strong>AI đang phân tích hình ảnh…</strong> Kết quả sẽ tự hiện khi có. Bạn vẫn có thể tự thẩm định
                      dựa trên media và mô tả.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">Loại sự kiện</p>
                      <span className="inline-flex items-center gap-1 font-bold" style={{ color: category.color }}>
                        <CategoryIcon className="w-3.5 h-3.5" />
                        {category.label}
                      </span>
                      {incident.needsEventType && incident.category !== 'unknown' && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Gợi ý theo loại SOS người dân chọn</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Độ tin cậy AI</p>
                      {aiFailed ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <ConfidenceBadge score={incident.confidenceScore} />
                      )}
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Cấp độ đề xuất</p>
                      {aiFailed ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
                      )}
                    </div>
                    {incident.hazardTags.length > 0 && (
                      <div>
                        <p className="text-slate-500 mb-1">Thẻ nguy cơ</p>
                        <div className="flex flex-wrap gap-1.5">
                          {incident.hazardTags.map((tag) => (
                            <HazardTagBadge key={tag} tag={tag} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {incident.aiSummary && (
                  <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                    {incident.aiSummary}
                  </p>
                )}
              </div>

              {rejecting ? (
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3">
                  <p className="text-xs font-mono-data uppercase tracking-widest text-red-600 font-bold">
                    Hủy ca báo khống
                  </p>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Lý do hủy">
                    {CANCELLATION_REASON_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={rejectCode === opt.value}
                        onClick={() => setRejectCode(opt.value)}
                        className={`px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                          rejectCode === opt.value
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-white border-red-200 text-slate-600 hover:border-red-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ghi chú thêm (không bắt buộc). Vd: Gọi xác minh không có cháy, trùng sự cố lúc 10:05…"
                    rows={2}
                    className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  {hasPhone && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={blockPhone}
                          onChange={(e) => setBlockPhone(e.target.checked)}
                          className="w-4 h-4 accent-red-600"
                        />
                        Chặn số điện thoại người báo ({incident.reporterPhone})
                      </label>
                      {blockPhone && (
                        <select
                          value={blockDuration}
                          onChange={(e) => setBlockDuration(e.target.value as BlockDuration)}
                          className="w-full text-sm bg-white border border-red-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                        >
                          {BLOCK_DURATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              Chặn trong {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              ) : mode === 'transfer' ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
                  <p className="text-xs font-mono-data uppercase tracking-widest text-blue-700 font-bold">
                    Chuyển sang trạm khác
                  </p>
                  <select
                    value={transferStationId}
                    onChange={(e) => setTransferStationId(e.target.value)}
                    className="w-full text-sm bg-white border border-blue-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Chọn trạm nhận…</option>
                    {transferStations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="Lý do chuyển (bắt buộc). Vd: Hiện trường gần trạm kia hơn, trạm mình hết xe phù hợp…"
                    rows={2}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  {transferReason.length > 0 && !transferReasonValid && (
                    <p className="text-[11px] text-blue-700">
                      Cần tối thiểu {TRANSFER_REASON_MIN_LENGTH} ký tự ({transferReason.trim().length}/
                      {TRANSFER_REASON_MIN_LENGTH}).
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Ca sẽ rời hàng đợi của trạm bạn và chuyển sang Operator trạm nhận; khóa xử lý được nhả.
                  </p>
                </div>
              ) : (
                <div>
                  {incident.needsEventType && (
                    <div className="mb-4">
                      <p className="text-xs font-mono-data uppercase tracking-widest text-slate-400 font-bold mb-2">
                        Loại sự cố <span className="text-red-600 normal-case tracking-normal">· bắt buộc</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {CONFIRMABLE_CATEGORIES.map((cat) => {
                          const meta = INCIDENT_CATEGORY_META[cat];
                          const Icon = meta.icon;
                          const isActive = confirmedCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setConfirmedCategory(cat)}
                              disabled={!canAct}
                              aria-pressed={isActive}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                                isActive ? 'text-white' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                              }`}
                              style={isActive ? { backgroundColor: meta.color, borderColor: meta.color } : undefined}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        AI chưa xác định được loại sự cố — chọn để hệ thống gợi ý đúng loại xe.
                      </p>
                    </div>
                  )}
                  <p className="text-xs font-mono-data uppercase tracking-widest text-slate-400 font-bold mb-2">
                    Xác nhận mức độ nghiêm trọng
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONFIRMABLE_LEVELS.map((level) => {
                      const meta = SEVERITY_LEVEL_META[level];
                      const isActive = confirmedSeverity === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => {
                          operatorOverrodeRef.current = true;
                          setConfirmedSeverity(level);
                        }}
                          disabled={!canAct}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-bold font-mono-data whitespace-nowrap transition-colors disabled:cursor-not-allowed ${
                            isActive ? meta.badgeClass : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {meta.label}
                          {level === incident.severity && hasAiSeverity && (
                            <span className="px-1 rounded bg-slate-900/10 text-[9px] tracking-wide">AI</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isOverride && (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
                      <p className="text-xs text-amber-800">
                        {!hasAiSeverity ? (
                          <>
                            AI không phân loại được — bạn tự xác định mức{' '}
                            {SEVERITY_LEVEL_META[confirmedSeverity].label}. Ghi lý do (căn cứ từ ảnh/video, mô tả, gọi xác
                            minh…); lý do sẽ được lưu vào nhật ký kiểm tra.
                          </>
                        ) : (
                          <>
                            Bạn đang ghi đè cấp độ AI đề xuất ({SEVERITY_LEVEL_META[incident.severity].label} →{' '}
                            {SEVERITY_LEVEL_META[confirmedSeverity].label}). Lý do sẽ được lưu vào nhật ký kiểm tra.
                          </>
                        )}
                      </p>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Lý do ghi đè (bắt buộc). Vd: Ảnh cho thấy có người mắc kẹt..."
                        rows={2}
                        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      {!overrideReasonValid && (
                        <p className="text-[11px] text-amber-700">
                          Cần tối thiểu {OVERRIDE_REASON_MIN_LENGTH} ký tự ({overrideReasonLength}/
                          {OVERRIDE_REASON_MIN_LENGTH}).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {errorMsg && (
          <div className="shrink-0 mx-4 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="shrink-0 p-4 border-t border-slate-200 grid grid-cols-2 gap-3">
          {mode === 'transfer' ? (
            <>
              <button
                onClick={() => setMode('review')}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-sm transition-colors disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={!canTransfer}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                Xác nhận chuyển trạm
              </button>
            </>
          ) : rejecting ? (
            <>
              <button
                onClick={() => setMode('review')}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-sm transition-colors disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmitting || !canAct}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Xác nhận hủy ca
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMode('reject')}
                disabled={isSubmitting || !canAct}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600 font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban className="w-4 h-4" />
                Hủy ca báo khống
              </button>
              <button
                onClick={handleApprove}
                disabled={!canApprove}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleCheck className="w-4 h-4" />}
                Duyệt lên bản đồ
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
