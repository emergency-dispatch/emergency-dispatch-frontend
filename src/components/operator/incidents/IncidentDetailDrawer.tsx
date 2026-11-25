import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  ArrowLeft,
  Ban,
  CircleCheck,
  Clock,
  Loader2,
  Lock,
  MapPin,
  RotateCcw,
  Siren,
  X,
} from 'lucide-react';
import { CaseSteps } from './CaseSteps';
import { IncidentAuditTimeline } from './IncidentAuditTimeline';
import { AiFindings, CancelCaseFields, ReporterEvidence } from './IncidentDossierSections';
import { LinkedReportsPanel } from './LinkedReportsPanel';
import { TrafficJamReview } from './TrafficJamReview';
import { blockDurationOf, EMPTY_CANCEL_INPUT } from './cancelCaseInput';
import {
  CANCELLATION_REASON_OPTIONS,
  CONFIRMABLE_CATEGORIES,
  INCIDENT_CATEGORY_META,
  OVERRIDE_REASON_MIN_LENGTH,
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
const DOCK_LABEL = 'text-[13px] font-semibold text-slate-700 mb-2';
const SECONDARY_BUTTON =
  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400';

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
  onRelock: (id: string) => void;
  /** Trả số đầy đủ (backend ghi vết Audit Trail), null nếu thất bại. */
  onRevealPhone: (id: string) => Promise<string | null>;
  /** BR-07: tách báo cáo đã gộp qua store (không bật popup tin báo mới cho chính mình). */
  onUnlinkReport?: (reportId: string, reason?: string) => Promise<{ ok: boolean; message?: string }>;
  /** §21.4: tăng khi nhận ReceiveIncidentSupplement cho sự cố này → tải lại thông tin bổ sung. */
  supplementVersion?: number;
  isSubmitting?: boolean;
  errorMsg?: string | null;
  /** overlay = drawer phủ từ bên phải (Hàng đợi); panel = nằm trong panel trái của Live Map, bản đồ vẫn thấy. */
  variant?: 'overlay' | 'panel';
  /** Số ca đang cần xử lý, hiện cạnh nút quay lại (panel). */
  attentionCount?: number;
  /** Đang nhập dở (lý do ghi đè / hủy / chuyển trạm, thẩm định ùn tắc) → nơi dùng hỏi lại trước khi rời ca. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Dải hỏi "rời ca này?" ngay dưới phần đầu (panel). */
  leavePrompt?: React.ReactNode;
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
  onUnlinkReport,
  supplementVersion = 0,
  isSubmitting = false,
  errorMsg = null,
  variant = 'overlay',
  attentionCount = 0,
  onDirtyChange,
  leavePrompt,
}) => {
  const isPanel = variant === 'panel';
  const now = useNow();
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
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
  const canAct = !!activeLock && !lockedByOther;
  const lockWasMine = incident.lock?.operatorId === currentOperatorId;

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
    : !canAct
      ? t('incidents.drawer.decisionHint.needLock')
      : !categoryValid
        ? t('incidents.drawer.decisionHint.chooseType')
        : confirmedSeverity === null
          ? t('incidents.drawer.decisionHint.chooseLevel')
          : !overrideReasonValid
            ? t('incidents.drawer.decisionHint.needReason', { min: OVERRIDE_REASON_MIN_LENGTH })
            : null;

  // Trạng thái khóa quyết định màu dải trạng thái: cần nhận ca (amber) / đang giữ (blue) / người khác giữ (slate).
  const statusTone = isLocking
    ? 'bg-slate-50 border-slate-200 text-slate-600'
    : lockedByOther
      ? 'bg-slate-100 border-slate-200 text-slate-700'
      : canAct
        ? 'bg-blue-50 border-blue-100 text-blue-700'
        : 'bg-amber-50 border-amber-200 text-amber-800';

  return (
    <>
      {!isPanel && <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />}

      <aside
        aria-label={t('incidents.drawer.kicker')}
        className={
          isPanel
            ? 'h-full flex flex-col bg-white'
            : 'fixed top-0 right-0 h-full w-full max-w-5xl bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in'
        }
      >
        {/* Đầu drawer: bước xử lý + tên sự cố + loại / nơi / thời gian chờ */}
        <div className="shrink-0 px-5 pt-3.5 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {isPanel ? (
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
            ) : (
              <CaseSteps current={1} />
            )}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {onTransfer && transferStations.length > 0 && mode !== 'transfer' && (
                <button
                  onClick={() => setMode('transfer')}
                  disabled={!canAct || isSubmitting}
                  title={canAct ? t('incidents.drawer.transferTitle') : t('incidents.drawer.transferNeedsLock')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  {t('incidents.drawer.transfer')}
                </button>
              )}
              {!isPanel && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                  aria-label={t('common.close')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <h2 className="mt-2.5 text-lg font-bold text-slate-900 leading-snug truncate">{incident.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <IncidentCode code={incident.code} className="font-semibold text-slate-600" />
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: category.color }}>
              <CategoryIcon className="w-3.5 h-3.5" />
              {incidentKindLabel(incident)}
            </span>
            <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{incident.area}</span>
            </span>
            <span className="inline-flex items-center gap-1" title={formatDateTime(incident.createdAt)}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {t('incidents.drawer.waited', { duration: formatWaitDuration(waitMs) })}
            </span>
          </div>
        </div>

        {leavePrompt}

        {/* Một dải trạng thái duy nhất: leo thang (nếu có) + khóa xử lý */}
        <div className={`shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-2 border-b text-xs ${statusTone}`}>
          {isEscalated && (
            <span
              title={t('incidents.drawer.escalatedBanner')}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-600 text-white font-semibold"
            >
              <Siren className="w-3.5 h-3.5 shrink-0 animate-pulse motion-reduce:animate-none" />
              {t('incidents.drawer.escalatedShort')}
            </span>
          )}
          {isLocking ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              {t('incidents.drawer.locking')}
            </span>
          ) : lockedByOther ? (
            <span className="flex items-center gap-2 min-w-0">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {t('incidents.drawer.lockedByOtherBefore')}
                <strong>{activeLock.operatorName}</strong>
                {t('incidents.drawer.lockedByOtherMiddle')}
                <strong className="font-mono-data">{formatCountdown(lockRemainingMs)}</strong>
                {t('incidents.drawer.lockedByOtherAfter')}
              </span>
            </span>
          ) : canAct ? (
            <span className="flex items-center gap-2 min-w-0">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {t('incidents.drawer.holdingBefore')}
                <strong className="font-mono-data">{formatCountdown(lockRemainingMs)}</strong>
                {t('incidents.drawer.holdingAfter')}
              </span>
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {lockWasMine ? t('incidents.drawer.lockExpired') : t('incidents.drawer.unlocked')}
              </span>
              <button
                onClick={() => onRelock(incident.id)}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-amber-300 font-bold hover:bg-amber-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {lockWasMine ? t('incidents.drawer.relock') : t('incidents.drawer.lock')}
              </button>
            </>
          )}
        </div>

        <div className="shrink-0 flex gap-1 px-5 pt-2 border-b border-slate-200" role="tablist">
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

        {/* §31.E: vì sao ca này tới tay Operator (AI chuyển ca / AI chưa xong / AI đã điều). */}
        {!isPanel && tab === 'review' && <AutoDispatchBanner incident={incident} className="shrink-0 mx-5 mt-3" />}

        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === 'history' ? (
            <div className="p-5 max-w-2xl">
              <IncidentAuditTimeline key={incident.id} incidentId={incident.id} />
            </div>
          ) : tab === 'linked' ? (
            <div className="p-5 max-w-3xl">
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
          <>
            {/* Panel hẹp hơn drawer → dải lý do cuộn cùng nội dung để nhường chỗ cho ảnh. */}
            {isPanel && <AutoDispatchBanner incident={incident} className="mx-5 mt-4" />}
            <div className={`grid gap-6 p-5 ${isPanel ? 'md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2' : 'md:grid-cols-2'}`}>
              <ReporterEvidence incident={incident} supplements={supplements} phone={phone} revealDisabled={lockedByOther} />

              <div className="space-y-4 min-w-0">
                <AiFindings key={incident.id} incident={incident} />

                {!incident.aiPending && incident.trafficJam && (
                  <TrafficJamReview
                    trafficJam={incident.trafficJam}
                    currentOperatorId={currentOperatorId}
                    decision={trafficJamDecision}
                    onDecisionChange={setTrafficJamDecision}
                    readOnly={!canAct || mode !== 'review'}
                  />
                )}
              </div>
            </div>
          </>
          )}
        </div>

        {/* Dock quyết định của Điều phối viên: luôn nằm dưới đáy, không phải cuộn mới thấy */}
        <div className="shrink-0 border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
          <div className="max-h-[45vh] overflow-y-auto px-5 pt-4 pb-3 space-y-3">
            {mode === 'transfer' ? (
              <section className="space-y-2.5">
                <h3 className="text-[13px] font-semibold text-blue-700">{t('incidents.drawer.transferHeading')}</h3>
                <div className="grid sm:grid-cols-2 gap-2.5">
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
                    rows={2}
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
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
                <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
                  {incident.needsEventType && (
                    <div>
                      <p className={DOCK_LABEL}>
                        {t('incidents.drawer.incidentType')}{' '}
                        <span className="font-normal text-red-600">{t('incidents.drawer.required')}</span>
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
                              onClick={() => {
                                setConfirmedCategory(cat);
                                // Đổi nhóm → về loại chung của nhóm (loại chi tiết cũ thuộc nhóm khác).
                                if (cat !== confirmedCategory) setConfirmedTypeCode(EVENT_TYPE_FROM_CATEGORY[cat]);
                              }}
                              disabled={!canAct}
                              aria-pressed={isActive}
                              title={t('incidents.drawer.chooseTypeHelp')}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                isActive ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                              }`}
                              style={isActive ? { backgroundColor: meta.color, borderColor: meta.color } : undefined}
                            >
                              <Icon className="w-4 h-4" />
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
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('incidents.drawer.confirmSeverity')}>
                      {CONFIRMABLE_LEVELS.map((level) => {
                        const meta = SEVERITY_LEVEL_META[level];
                        const isActive = confirmedSeverity === level;
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
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                              isActive ? meta.badgeClass : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {t(`enums.severity.level${level}`)}
                            {level === incident.severity && hasAiSeverity && (
                              <span className="px-1 rounded bg-slate-900/10 text-[10px] font-bold">AI</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

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
                      rows={2}
                      className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    {!overrideReasonValid && (
                      <p className="text-[11px] text-amber-700">
                        {t('incidents.drawer.minLength', { min: OVERRIDE_REASON_MIN_LENGTH, length: overrideReasonLength })}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
            {mode === 'transfer' ? (
              <>
                <button
                  onClick={() => setMode('review')}
                  disabled={isSubmitting}
                  className={SECONDARY_BUTTON}
                >
                  {t('incidents.drawer.back')}
                </button>
                <button
                  onClick={handleConfirmTransfer}
                  disabled={!canTransfer}
                  className="ml-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
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
                  className={SECONDARY_BUTTON}
                >
                  {t('incidents.drawer.back')}
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={isSubmitting || !canAct}
                  className="ml-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
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
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <Ban className="w-4 h-4" />
                  {t('incidents.drawer.rejectTitle')}
                </button>
                {decisionHint && (
                  <p role="status" className="flex-1 min-w-[10rem] text-right text-xs text-slate-500">
                    {decisionHint}
                  </p>
                )}
                <button
                  onClick={handleApprove}
                  disabled={!canApprove}
                  className="ml-auto flex items-center justify-center gap-2 px-6 py-3 min-w-[14rem] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-colors disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleCheck className="w-4 h-4" />}
                  {t('incidents.drawer.approve')}
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
