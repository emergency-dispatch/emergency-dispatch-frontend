import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  BrainCircuit,
  CircleCheck,
  Clock,
  Eye,
  ImageOff,
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
import { SeverityBadge } from './SeverityBadge';
import {
  BLOCK_DURATION_OPTIONS,
  INCIDENT_CATEGORY_META,
  LOW_CONFIDENCE_THRESHOLD,
  OVERRIDE_REASON_MIN_LENGTH,
  SEVERITY_LEVEL_META,
} from '../../../data/incidentMock';
import { useNow } from '../../../hooks/useNow';
import { formatCountdown } from '../../../utils/incidentFormat';
import type { BlockDuration, Incident, SeverityLevel } from '../../../types/incident';

const CONFIRMABLE_LEVELS: SeverityLevel[] = [1, 2, 3];

interface IncidentDetailDrawerProps {
  incident: Incident | null;
  currentOperatorId: string;
  isEscalated?: boolean;
  isLocking?: boolean;
  onClose: () => void;
  onApprove: (id: string, confirmedSeverity: SeverityLevel, overrideReason?: string) => void;
  onReject: (id: string, reason: string, blockDuration: BlockDuration | null) => void;
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
  onRelock,
  onRevealPhone,
  isSubmitting = false,
  errorMsg = null,
}) => {
  const now = useNow();
  const [confirmedSeverity, setConfirmedSeverity] = useState<SeverityLevel | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [blockPhone, setBlockPhone] = useState(false);
  const [blockDuration, setBlockDuration] = useState<BlockDuration>('30d');
  // Backend luôn trả số đã che; số đầy đủ chỉ có sau khi bấm "Hiện số".
  const [revealedPhone, setRevealedPhone] = useState<{ phone: string; at: Date } | null>(null);
  const [revealingPhone, setRevealingPhone] = useState(false);

  // Reset local form state whenever a different incident is opened.
  useEffect(() => {
    if (!incident) return;
    setConfirmedSeverity(incident.severity);
    setOverrideReason('');
    setRejecting(false);
    setRejectReason('');
    setBlockPhone(false);
    setBlockDuration('30d');
    setRevealedPhone(null);
  }, [incident?.id]);

  if (!incident) return null;

  const waitMinutes = Math.max(0, Math.round((now - new Date(incident.createdAt).getTime()) / 60000));
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const isLowConfidence = incident.confidenceScore < LOW_CONFIDENCE_THRESHOLD;
  const hasPhone = /\d/.test(incident.reporterPhone);

  const lockRemainingMs = incident.lock ? new Date(incident.lock.expiresAt).getTime() - now : 0;
  const activeLock = incident.lock && lockRemainingMs > 0 ? incident.lock : null;
  const lockedByOther = !!activeLock && activeLock.operatorId !== currentOperatorId;
  const canAct = !!activeLock && !lockedByOther;
  const lockWasMine = incident.lock?.operatorId === currentOperatorId;

  const isOverride = confirmedSeverity !== null && confirmedSeverity !== incident.severity;
  const overrideReasonLength = overrideReason.trim().length;
  const overrideReasonValid = !isOverride || overrideReasonLength >= OVERRIDE_REASON_MIN_LENGTH;
  const canApprove = canAct && !isSubmitting && confirmedSeverity !== null && overrideReasonValid;

  const handleApprove = () => {
    if (!confirmedSeverity) return;
    onApprove(incident.id, confirmedSeverity, isOverride ? overrideReason.trim() : undefined);
  };

  const handleConfirmReject = () => {
    onReject(
      incident.id,
      rejectReason.trim() || 'Điều phối viên hủy ca báo khống tại Command Center.',
      hasPhone && blockPhone ? blockDuration : null
    );
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
            Sự cố đã leo thang — Cấp 3 chờ quá lâu chưa có đội nhận. Ưu tiên thẩm định và điều phối ngay.
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

        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-5 p-5">
            {/* Cột trái: media hiện trường + thông tin người báo */}
            <div className="space-y-4 min-w-0">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
                {incident.mediaUrl && incident.mediaType === 'video' ? (
                  <video src={incident.mediaUrl} controls className="w-full h-full object-cover bg-black" />
                ) : incident.mediaUrl ? (
                  <img src={incident.mediaUrl} alt={incident.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-400">
                    <ImageOff className="w-8 h-8 text-slate-300" />
                    <span className="text-xs">Người báo không gửi kèm hình ảnh</span>
                  </div>
                )}
              </div>

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
              </div>
            </div>

            {/* Cột phải: kết quả AI + thẩm định */}
            <div className="space-y-4 min-w-0">
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
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500 mb-1">Loại sự kiện</p>
                    <span className="inline-flex items-center gap-1 font-bold" style={{ color: category.color }}>
                      <CategoryIcon className="w-3.5 h-3.5" />
                      {category.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Độ tin cậy AI</p>
                    <ConfidenceBadge score={incident.confidenceScore} />
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Cấp độ đề xuất</p>
                    <SeverityBadge severity={incident.severity} />
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
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Lý do hủy (không bắt buộc). Vd: Báo khống, trùng lặp với sự cố khác..."
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
              ) : (
                <div>
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
                          onClick={() => setConfirmedSeverity(level)}
                          disabled={!canAct}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-bold font-mono-data whitespace-nowrap transition-colors disabled:cursor-not-allowed ${
                            isActive ? meta.badgeClass : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {meta.label}
                          {level === incident.severity && (
                            <span className="px-1 rounded bg-slate-900/10 text-[9px] tracking-wide">AI</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isOverride && (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
                      <p className="text-xs text-amber-800">
                        Bạn đang ghi đè cấp độ AI đề xuất ({SEVERITY_LEVEL_META[incident.severity].label} →{' '}
                        {SEVERITY_LEVEL_META[confirmedSeverity].label}). Lý do sẽ được lưu vào nhật ký kiểm tra.
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
        </div>

        {errorMsg && (
          <div className="shrink-0 mx-4 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="shrink-0 p-4 border-t border-slate-200 grid grid-cols-2 gap-3">
          {rejecting ? (
            <>
              <button
                onClick={() => setRejecting(false)}
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
                onClick={() => setRejecting(true)}
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
