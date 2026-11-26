import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  ArrowLeft,
  Ban,
  CircleCheck,
  Clock,
  Loader2,
  Lock,
  MapPin,
  Siren,
} from 'lucide-react';
import { IncidentAuditTimeline } from './IncidentAuditTimeline';
import { AiInsightBlock, CancelCaseFields, ReporterEvidence } from './IncidentDossierSections';
import { LinkedReportsPanel } from './LinkedReportsPanel';
import { PlanForcePreview } from './PlanForcePreview';
import { StaleChip } from './StaleChip';
import { TrafficJamReview } from './TrafficJamReview';
import { blockDurationOf, EMPTY_CANCEL_INPUT } from './cancelCaseInput';
import {
  CANCELLATION_REASON_OPTIONS,
  CONFIRMABLE_CATEGORIES,
  INCIDENT_CATEGORY_META,
  OVERRIDE_REASON_MIN_LENGTH,
  SEVERITY_LEVEL_COLOR,
  SEVERITY_LEVEL_META,
} from '../../../data/incidentMock';
import { useIncidentSupplements } from '../../../hooks/useIncidentSupplements';
import { useNow } from '../../../hooks/useNow';
import { useRevealPhone } from '../../../hooks/useRevealPhone';
import { formatCountdown, formatDateTime, formatWaitDuration } from '../../../utils/incidentFormat';
import {
  EVENT_TYPE_FROM_CATEGORY,
  type BlockDuration,
  type Incident,
  type IncidentCategory,
  type OperatorCancellationCode,
  type SeverityLevel,
  type TrafficJamDecision,
} from '../../../types/incident';
import type { Station } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';
import { IncidentTypePicker } from './IncidentTypePicker';
import { useDispatchStore } from '../../../context/DispatchContext';
import { AutoDispatchBanner } from './AutoDispatchInfo';
import { IncidentCode } from './IncidentCode';

const CONFIRMABLE_LEVELS: SeverityLevel[] = [1, 2, 3];
// Lý do chuyển trạm: backend yêu cầu tối thiểu 5 ký tự.
const TRANSFER_REASON_MIN_LENGTH = 5;
const DOCK_LABEL = 'text-[13px] font-semibold text-slate-700 mb-1.5';
const SECONDARY_BUTTON =
  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400';

type DrawerMode = 'review' | 'reject' | 'transfer';

interface IncidentDetailDrawerProps {
  incident: Incident | null;
  currentOperatorId: string;
  isEscalated?: boolean;
  onClose: () => void;
  /** `category` gửi kèm khi sự cố chưa có loại đã xác nhận (incident.needsEventType). */
  onApprove: (
    id: string,
    confirmedSeverity: SeverityLevel,
    overrideReason: string | undefined,
    category: IncidentCategory | undefined,
    /** Thẩm định ùn tắc gửi kèm; undefined = giữ nguyên nhận định hiện tại. */
    trafficJam: TrafficJamDecision | undefined,
    /** §31: loại chi tiết khi Operator đổi so với loại hiện tại; undefined = giữ nguyên. */
    incidentTypeCode: string | undefined
  ) => void;
  onReject: (id: string, reason: string, blockDuration: BlockDuration | null, reasonCode: OperatorCancellationCode) => void;
  /** Chuyển sự cố sang trạm khác. Không truyền → ẩn nút "Chuyển trạm". */
  onTransfer?: (id: string, stationId: string, reason: string) => void;
  /** Trạm có thể chuyển tới (đã bỏ trạm đang phụ trách). */
  transferStations?: Station[];
  /** Trả số đầy đủ (backend ghi vết Audit Trail), null nếu thất bại. */
  onRevealPhone: (id: string) => Promise<string | null>;
  /** BR-07: tách báo cáo đã gộp qua store (không bật popup tin báo mới cho chính mình). */
  onUnlinkReport?: (reportId: string, reason?: string) => Promise<{ ok: boolean; message?: string }>;
  /** §21.4: tăng khi nhận ReceiveIncidentSupplement cho sự cố này → tải lại thông tin bổ sung. */
  supplementVersion?: number;
  isSubmitting?: boolean;
  errorMsg?: string | null;
  /** Số ca đang cần xử lý, hiện cạnh nút quay lại. */
  attentionCount?: number;
  /** Đang nhập dở (lý do ghi đè / hủy / chuyển trạm, thẩm định ùn tắc) → nơi dùng hỏi lại trước khi rời ca. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Dải hỏi "rời ca này?" ngay dưới phần đầu. */
  leavePrompt?: React.ReactNode;
}

/**
 * Thẩm định một ca chờ duyệt trong drawer của Hàng đợi (FR-OP-02/03; trạng thái mở / gửi do `useIncidentTriage` lo). Một cột:
 * phần trên cuộn là bằng chứng (lý do AI chuyển ca, ảnh, ghi âm, mô tả người báo + nhận định AI), dải dưới đáy là quyết định
 * (loại, mức độ, lực lượng sẽ điều, ghi đè, ùn tắc, nút duyệt / hủy / chuyển trạm) luôn nằm trong tầm mắt.
 * Ca đã duyệt xem ở `CaseDossierPanel` (Live Map).
 */
export const IncidentDetailDrawer: React.FC<IncidentDetailDrawerProps> = ({
  incident,
  currentOperatorId,
  isEscalated = false,
  onClose,
  onApprove,
  onReject,
  onTransfer,
  transferStations = [],
  onRevealPhone,
  onUnlinkReport,
  supplementVersion = 0,
  isSubmitting = false,
  errorMsg = null,
  attentionCount = 0,
  onDirtyChange,
  leavePrompt,
}) => {
  const now = useNow();
  const { t } = useTranslation();
  const { incidentKindLabel, vehicleLimitFor } = useDispatchStore();
  const supplements = useIncidentSupplements(incident?.id ?? null, supplementVersion);
  const [confirmedSeverity, setConfirmedSeverity] = useState<SeverityLevel | null>(null);
  const [confirmedCategory, setConfirmedCategory] = useState<IncidentCategory | null>(null);
  // §31: loại chi tiết (mã danh mục) — mặc định loại hiện tại của sự cố.
  const [confirmedTypeCode, setConfirmedTypeCode] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [mode, setMode] = useState<DrawerMode>('review');
  // Tab nội dung: thẩm định (media + AI), báo cáo trùng đã gom (BR-07) hoặc lịch sử xử lý (audit trail).
  const [tab, setTab] = useState<'review' | 'linked' | 'history'>('review');
  // Đã xử lý hết báo cáo gộp → quay về tab Thẩm định kèm thông báo thành công.
  const rejecting = mode === 'reject';
  const [cancelInput, setCancelInput] = useState(EMPTY_CANCEL_INPUT);
  const [transferStationId, setTransferStationId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const phone = useRevealPhone(incident?.id ?? null, onRevealPhone);
  // Thẩm định ùn tắc chưa lưu — gửi kèm verify (confirmedTrafficJamStatus).
  const [trafficJamDecision, setTrafficJamDecision] = useState<TrafficJamDecision | null>(null);

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
    setConfirmedTypeCode(
      incident.incidentTypeCode ?? (incident.category === 'unknown' ? null : EVENT_TYPE_FROM_CATEGORY[incident.category])
    );
    setOverrideReason('');
    setMode('review');
    setTab('review');
    setCancelInput(EMPTY_CANCEL_INPUT);
    setTransferStationId('');
    setTransferReason('');
    setTrafficJamDecision(null);
  }, [incident?.id]);

  // AI vừa xong phân tích (aiPending false → severity mới) — cập nhật nếu Operator chưa override.
  useEffect(() => {
    if (!incident || incident.aiPending) return;
    if (operatorOverrodeRef.current) return; // Operator đã chọn tay → không ghi đè
    setConfirmedSeverity(incident.aiUnclassified || incident.aiFailed ? null : incident.severity);
  }, [incident?.aiPending, incident?.severity, incident?.aiUnclassified, incident?.aiFailed]);

  const dirty =
    !!incident &&
    (!!overrideReason.trim() || !!cancelInput.note.trim() || !!transferReason.trim() || trafficJamDecision !== null);
  useEffect(() => {
    onDirtyChange?.(dirty);
    // Chỉ báo khi trạng thái đổi (hàm truyền xuống đổi mỗi lần render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  if (!incident) return null;

  const waitMs = now - new Date(incident.createdAt).getTime();
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  // AI lỗi / quá thời gian chờ: % tin cậy và cấp đề xuất vô nghĩa → báo rõ là AI thất bại, không phải "độ tin cậy thấp".
  const aiFailed = !incident.aiPending && incident.aiFailed;
  // Nhãn "AI" chỉ khi AI thực sự đề xuất được cấp 1–3.
  const hasAiSeverity = !incident.aiPending && !aiFailed && !incident.aiUnclassified;

  const lockRemainingMs = incident.lock ? new Date(incident.lock.expiresAt).getTime() - now : 0;
  const activeLock = incident.lock && lockRemainingMs > 0 ? incident.lock : null;
  const lockedByOther = !!activeLock && activeLock.operatorId !== currentOperatorId;
  // Không còn khóa ca (2026-11-26): chỉ chặn khi Operator khác vẫn đang giữ khóa (bản cũ / app khác) — backend trả 409.
  const canAct = !lockedByOther;

  // Backend coi Unclassified → Level 1–3 là ghi đè AI (bắt buộc operatorNotes ≥ 5 ký tự), nên ca AI không phân loại
  // được luôn cần lý do, kể cả khi chọn Cấp 1.
  const isOverride =
    confirmedSeverity !== null && (!hasAiSeverity || confirmedSeverity !== incident.severity);
  const overrideReasonLength = overrideReason.trim().length;
  const overrideReasonValid = !isOverride || overrideReasonLength >= OVERRIDE_REASON_MIN_LENGTH;
  // Backend chưa có loại sự cố (eventType None) → bắt buộc chọn Cháy nổ / Tai nạn / Khác.
  const categoryValid = !incident.needsEventType || (confirmedCategory !== null && confirmedCategory !== 'unknown');
  const canApprove = canAct && !isSubmitting && confirmedSeverity !== null && overrideReasonValid && categoryValid;

  const transferReasonValid = transferReason.trim().length >= TRANSFER_REASON_MIN_LENGTH;
  const canTransfer = canAct && !isSubmitting && !!transferStationId && transferReasonValid;

  // Nhóm để chọn loại chi tiết: nhóm Operator đang chọn (sự cố chưa có loại) hoặc nhóm hiện tại.
  const pickerCategory = incident.needsEventType ? confirmedCategory : incident.category;
  const typeCategory = pickerCategory && pickerCategory !== 'unknown' ? pickerCategory : null;

  const handleApprove = () => {
    if (!confirmedSeverity) return;
    onApprove(
      incident.id,
      confirmedSeverity,
      isOverride ? overrideReason.trim() : undefined,
      incident.needsEventType ? (confirmedCategory ?? undefined) : undefined,
      trafficJamDecision && trafficJamDecision !== incident.trafficJam?.status ? trafficJamDecision : undefined,
      // Chỉ gửi khi Operator đổi loại chi tiết (backend lấy nhóm theo danh mục).
      confirmedTypeCode && confirmedTypeCode !== incident.incidentTypeCode ? confirmedTypeCode : undefined
    );
  };

  const handleConfirmReject = () => {
    const label = CANCELLATION_REASON_OPTIONS.find((o) => o.value === cancelInput.code)?.label ?? '';
    onReject(
      incident.id,
      cancelInput.note.trim() || `Điều phối viên hủy ca: ${label.toLowerCase()}.`,
      blockDurationOf(incident, cancelInput),
      cancelInput.code
    );
  };

  const handleConfirmTransfer = () => {
    if (!onTransfer || !canTransfer) return;
    onTransfer(incident.id, transferStationId, transferReason.trim());
  };

  // Nút "Duyệt" bị khóa thì nói rõ còn thiếu gì, thay vì để nút nhạt màu không giải thích.
  const decisionHint = lockedByOther
    ? t('incidents.drawer.decisionHint.lockedByOther', { name: activeLock?.operatorName ?? '' })
    : !categoryValid
      ? t('incidents.drawer.decisionHint.chooseType')
      : confirmedSeverity === null
        ? t('incidents.drawer.decisionHint.chooseLevel')
        : !overrideReasonValid
          ? t('incidents.drawer.decisionHint.needReason', { min: OVERRIDE_REASON_MIN_LENGTH })
          : null;
  return (
    <aside aria-label={t('incidents.drawer.kicker')} className="h-full flex flex-col bg-white">
      {/* Đầu panel: quay lại + giữ ca + chuyển trạm; tên sự cố; mã / loại / nơi / thời gian chờ */}
      <div className="shrink-0 px-5 pt-3.5 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('liveMap.detail.back')}
            {attentionCount > 0 && (
              <span className="text-red-600">{t('liveMap.detail.attention', { count: attentionCount })}</span>
            )}
          </button>
          <div className="ml-auto flex items-center gap-2 min-w-0">
            {isEscalated && (
              <span
                title={t('incidents.drawer.escalatedBanner')}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600 text-white text-xs font-semibold min-w-0"
              >
                <Siren className="w-3.5 h-3.5 shrink-0 animate-pulse motion-reduce:animate-none" />
                <span className="truncate">{t('incidents.drawer.escalatedShort')}</span>
              </span>
            )}
            {onTransfer && transferStations.length > 0 && mode !== 'transfer' && (
              <button
                onClick={() => setMode('transfer')}
                disabled={!canAct || isSubmitting}
                title={t('incidents.drawer.transferTitle')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                {t('incidents.drawer.transfer')}
              </button>
            )}
          </div>
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-900 leading-snug truncate">{incident.title}</h2>
        <div className="mt-1 flex items-center gap-x-4 gap-y-1 text-xs text-slate-500 min-w-0">
          <IncidentCode code={incident.code} className="font-semibold text-slate-600 shrink-0" />
          <StaleChip incident={incident} />
          <span className="inline-flex items-center gap-1 font-semibold shrink-0" style={{ color: category.color }}>
            <CategoryIcon className="w-3.5 h-3.5" />
            {incidentKindLabel(incident)}
          </span>
          <span className="inline-flex items-center gap-1 shrink-0" title={formatDateTime(incident.createdAt)}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {/* Dưới 1 phút: "Vừa gửi" thay vì "Đã chờ Vừa xong". */}
            {waitMs < 60_000 ? t('incidents.drawer.justSent') : t('incidents.drawer.waited', { duration: formatWaitDuration(waitMs) })}
          </span>
        </div>
        {/* Địa chỉ dòng riêng, xuống dòng đầy đủ (Operator cần đọc hết để đối chiếu / gọi lại). */}
        <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span className="break-words">{incident.area}</span>
        </p>
      </div>

      {leavePrompt}

      {/* Operator khác vẫn giữ khóa ca này (bản cũ / app khác) → chỉ xem tới khi khóa hết hạn. */}
      {lockedByOther && (
        <div className="shrink-0 flex items-center gap-2 px-5 py-2 border-b border-slate-200 bg-slate-100 text-xs text-slate-700">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {t('incidents.drawer.lockedByOtherBefore')}
            <strong>{activeLock.operatorName}</strong>
            {t('incidents.drawer.lockedByOtherMiddle')}
            <strong className="font-mono-data">{formatCountdown(lockRemainingMs)}</strong>
            {t('incidents.drawer.lockedByOtherAfter')}
          </span>
        </div>
      )}

      <div className="shrink-0 flex gap-1 px-5 pt-1 border-b border-slate-200" role="tablist">
        {(
          [
            ['review', t('incidents.drawer.tabReview')],
            // Chỉ hiện khi có báo cáo trùng đang gom; giữ tab khi đang mở dù vừa xác nhận / tách hết.
            ...(incident.linkedReportCount > 0 || tab === 'linked'
              ? ([['linked', t('incidents.drawer.tabLinked', { count: incident.linkedReportCount })]] as const)
              : []),
            ['history', t('incidents.drawer.tabHistory')],
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

      {/* Thân drawer một cột: bằng chứng cuộn riêng ở trên, dải quyết định dính đáy. */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
          {tab === 'history' ? (
            <div className="p-5">
              <IncidentAuditTimeline key={incident.id} incidentId={incident.id} />
            </div>
          ) : tab === 'linked' ? (
            <div className="p-5">
              <LinkedReportsPanel
                key={incident.id}
                parentIncidentId={incident.id}
                linkedReportCount={incident.linkedReportCount}
                readOnly={lockedByOther}
                onUnlink={onUnlinkReport}
                onAllHandled={() => setTab('review')}
              />
            </div>
          ) : (
            <div className="p-5">
              {/* Lý do AI chuyển ca đặt đầu phần bằng chứng. */}
              <div className="mb-4 empty:hidden">
                <AutoDispatchBanner incident={incident} compact />
              </div>
              <ReporterEvidence
                incident={incident}
                supplements={supplements}
                phone={phone}
                revealDisabled={lockedByOther}
                showLocation={false}
                afterDescription={<AiInsightBlock key={incident.id} incident={incident} />}
                compact
              />
            </div>
          )}
        </div>

        {/* Dải quyết định của Điều phối viên: cuộn chung, hàng nút dính đáy (sticky). */}
        <div className="shrink-0 flex flex-col min-h-0 max-h-[50vh] overflow-y-auto border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
          <div className="p-4 space-y-3.5">
            {mode === 'transfer' ? (
              <section className="space-y-2.5">
                <h3 className="text-[13px] font-semibold text-blue-700">{t('incidents.drawer.transferHeading')}</h3>
                <select
                  value={transferStationId}
                  onChange={(e) => setTransferStationId(e.target.value)}
                  className="w-full text-sm bg-white border border-blue-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">{t('incidents.drawer.chooseStation')}</option>
                  {transferStations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder={t('incidents.drawer.transferPlaceholder')}
                  rows={3}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {transferReason.length > 0 && !transferReasonValid && (
                  <p className="text-[11px] text-blue-700">
                    {t('incidents.drawer.minLength', {
                      min: TRANSFER_REASON_MIN_LENGTH,
                      length: transferReason.trim().length,
                    })}
                  </p>
                )}
                <p className="text-[11px] text-slate-500">{t('incidents.drawer.transferHelp')}</p>
              </section>
            ) : rejecting ? (
              <CancelCaseFields incident={incident} value={cancelInput} onChange={setCancelInput} />
            ) : (
              <>
                <div className="space-y-3.5">
                  {incident.needsEventType && (
                    <div>
                      <p className={DOCK_LABEL}>
                        {t('incidents.drawer.incidentType')}{' '}
                        <span className="font-normal text-red-600">{t('incidents.drawer.required')}</span>
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {CONFIRMABLE_CATEGORIES.map((cat) => {
                          const meta = INCIDENT_CATEGORY_META[cat];
                          const Icon = meta.icon;
                          const isActive = confirmedCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setConfirmedCategory(cat);
                                // Đổi nhóm → về loại chung của nhóm (loại chi tiết cũ thuộc nhóm khác).
                                if (cat !== confirmedCategory) setConfirmedTypeCode(EVENT_TYPE_FROM_CATEGORY[cat]);
                              }}
                              disabled={!canAct}
                              aria-pressed={isActive}
                              title={t('incidents.drawer.chooseTypeHelp')}
                              className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[13px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                isActive ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                              }`}
                              style={isActive ? { backgroundColor: meta.color, borderColor: meta.color } : undefined}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              {t(`enums.category.${cat}`)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <IncidentTypePicker
                    category={typeCategory}
                    value={confirmedTypeCode}
                    onChange={setConfirmedTypeCode}
                    disabled={!canAct}
                    labelClassName={DOCK_LABEL}
                  />
                  <div>
                    <p className={DOCK_LABEL}>{t('incidents.drawer.levelLabel')}</p>
                    {/* Mỗi mức một hàng: vạch màu cấp + số tổ sẽ điều theo kế hoạch (BR-14) → thấy ngay hệ quả của lựa chọn. */}
                    <div
                      className="grid gap-1.5 sm:grid-cols-3"
                      role="radiogroup"
                      aria-label={t('incidents.drawer.confirmSeverity')}
                    >
                      {CONFIRMABLE_LEVELS.map((level) => {
                        const meta = SEVERITY_LEVEL_META[level];
                        const isActive = confirmedSeverity === level;
                        const teams = vehicleLimitFor({
                          severity: level,
                          incidentTypeCode: confirmedTypeCode,
                          category: typeCategory ?? incident.category,
                          needsEventType: !typeCategory && incident.needsEventType,
                        }).max;
                        return (
                          <button
                            key={level}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => {
                              operatorOverrodeRef.current = true;
                              setConfirmedSeverity(level);
                            }}
                            disabled={!canAct}
                            className={`flex items-center gap-2.5 w-full pl-2 pr-2.5 py-1.5 rounded-lg border text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                              isActive ? `${meta.badgeClass} ring-1 ring-current` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span
                              aria-hidden
                              className="w-1 self-stretch rounded-full shrink-0"
                              style={{ backgroundColor: SEVERITY_LEVEL_COLOR[level] }}
                            />
                            <span className="flex-1 min-w-0 truncate">{t(`enums.severity.level${level}`)}</span>
                            {level === incident.severity && hasAiSeverity && (
                              <span className="px-1 rounded bg-slate-900/10 text-[10px] font-bold shrink-0">AI</span>
                            )}
                            <span className="shrink-0 text-[11px] font-medium opacity-75" title={t('incidents.drawer.teamsTitle')}>
                              {level === 3
                                ? t('incidents.drawer.teamsUpTo', { count: teams })
                                : t('incidents.drawer.teamsPlanned', { count: teams })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Xem trước lực lượng theo mức đang chọn (kế hoạch điều tổ ↔ tổ sẵn sàng của trạm). */}
                  <PlanForcePreview
                    incident={incident}
                    severity={confirmedSeverity}
                    typeCode={confirmedTypeCode}
                    category={typeCategory}
                  />

                  {isOverride && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                      <p className="text-xs text-amber-800">
                        {!hasAiSeverity
                          ? t('incidents.drawer.unclassifiedOverride', {
                              level: t(`enums.severity.level${confirmedSeverity}`),
                            })
                          : t('incidents.drawer.override', {
                              from: t(`enums.severity.level${incident.severity}`),
                              to: t(`enums.severity.level${confirmedSeverity}`),
                            })}
                      </p>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder={t('incidents.drawer.overridePlaceholder')}
                        rows={3}
                        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      {!overrideReasonValid && (
                        <p className="text-[11px] text-amber-700">
                          {t('incidents.drawer.minLength', { min: OVERRIDE_REASON_MIN_LENGTH, length: overrideReasonLength })}
                        </p>
                      )}
                    </div>
                  )}

                  {!incident.aiPending && incident.trafficJam && (
                    <TrafficJamReview
                      trafficJam={incident.trafficJam}
                      currentOperatorId={currentOperatorId}
                      decision={trafficJamDecision}
                      onDecisionChange={setTrafficJamDecision}
                      readOnly={!canAct}
                      compact
                    />
                  )}
                </div>
              </>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Hàng nút chốt: một hàng — nút phụ bên trái, gợi ý còn thiếu ở giữa, nút chính bên phải. */}
          <div className="sticky bottom-0 z-10 shrink-0 flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100 bg-white">
            {mode === 'transfer' ? (
              <>
                <button
                  onClick={() => setMode('review')}
                  disabled={isSubmitting}
                  className={`${SECONDARY_BUTTON} order-1`}
                >
                  {t('incidents.drawer.back')}
                </button>
                <button
                  onClick={handleConfirmTransfer}
                  disabled={!canTransfer}
                  className="order-2 ml-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  {t('incidents.drawer.confirmTransfer')}
                </button>
              </>
            ) : rejecting ? (
              <>
                <button
                  onClick={() => setMode('review')}
                  disabled={isSubmitting}
                  className={`${SECONDARY_BUTTON} order-1`}
                >
                  {t('incidents.drawer.back')}
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={isSubmitting || !canAct}
                  className="order-2 ml-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  {t('incidents.drawer.confirmReject')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setMode('reject')}
                  disabled={isSubmitting || !canAct}
                  title={t('incidents.drawer.rejectTitle')}
                  className="order-1 flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 font-bold text-sm whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <Ban className="w-4 h-4 shrink-0" />
                  {t('incidents.drawer.rejectTitle')}
                </button>
                {decisionHint && (
                  <p role="status" className="order-2 flex-1 min-w-[10rem] text-right text-xs text-slate-500">
                    {decisionHint}
                  </p>
                )}
                <button
                  onClick={handleApprove}
                  disabled={!canApprove}
                  className="order-3 ml-auto flex items-center justify-center gap-2 px-6 py-3 min-w-[14rem] whitespace-nowrap rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-colors disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleCheck className="w-4 h-4" />}
                  {t('incidents.drawer.approve')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
