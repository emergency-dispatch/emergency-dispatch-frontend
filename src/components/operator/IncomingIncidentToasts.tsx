import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRightLeft,
  BellRing,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  User,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { INCIDENT_CATEGORY_META } from '../../data/incidentMock';
import { SeverityBadge } from './incidents/SeverityBadge';
import {
  AUTO_DISPATCH_DECIDING_TIMEOUT_MS,
  autoDispatchVerdict,
  type AutoDispatchVerdict,
} from './incidents/autoDispatchVerdict';
import { AiProgressStrip, HandoverReasonBox } from './incidents/AutoDispatchInfo';
import { useNow } from '../../hooks/useNow';
import { useDispatchStore, type IncomingTransferNote } from '../../context/DispatchContext';
import type { Incident } from '../../types/incident';
import { useTranslation } from '../../i18n';

/** Số thẻ "AI đang xử lý" hiện cùng lúc; ca còn lại vẫn nằm trong hàng đợi. */
const MAX_AI_CARDS = 3;

const QUEUE_PATH = '/dashboard/command-center/incidents';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** mm:ss, từ 1 giờ trở lên thành h:mm:ss. */
const formatWaitTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
};

interface ModalProps {
  incident: Incident;
  /** manual = luồng cũ (AI tự điều phối tắt / ca chuyển trạm); handover = AI chuyển ca cho người. */
  verdict: Extract<AutoDispatchVerdict, { phase: 'manual' | 'handover' }>;
  /** Ngưỡng tự điều phối (%), null = chưa có cài đặt. */
  threshold: number | null;
  /** Có khi sự cố được trạm khác chuyển tới. */
  transfer?: IncomingTransferNote;
  onDismiss: () => void;
  onGoToQueue: () => void;
}

const IncidentModal: React.FC<ModalProps> = ({ incident, verdict, threshold, transfer, onDismiss, onGoToQueue }) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const handover = verdict.phase === 'handover';
  // Thời gian chờ kể từ lúc backend nhận SOS, đếm từng giây.
  const now = useNow(1000);
  const waitSeconds = Math.max(0, Math.floor((now - new Date(incident.createdAt).getTime()) / 1000));
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div className="relative w-full max-w-lg bg-white border-2 border-red-600 rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">

        {/* Header đỏ */}
        <div className="relative bg-red-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <BellRing className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] font-mono-data uppercase tracking-widest text-red-100 font-bold">
                {transfer
                  ? t('layout.incomingIncident.transferredKicker')
                  : handover
                    ? t('layout.incomingIncident.handoverKicker')
                    : t('layout.incomingIncident.kicker')}
              </div>
              <h2 className="text-base font-black text-white leading-tight">
                {handover ? t('layout.incomingIncident.handoverTitle') : t('layout.incomingIncident.title')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-all"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {handover && <AiProgressStrip phase="handover" />}

          {/* Mức độ + loại */}
          <div className="flex items-center flex-wrap gap-2">
            {/* AI chưa xong → chưa có cấp độ, chỉ hiện "AI đang phân tích…" bên dưới. */}
            {!incident.aiPending && (
              <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
            )}
            <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: category.color }}>
              <CategoryIcon className="w-3.5 h-3.5" />
              {incidentKindLabel(incident)}
            </span>
            {incident.aiPending && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('layout.incomingIncident.aiAnalyzing')}
              </span>
            )}
          </div>

          {verdict.phase === 'handover' && (
            <HandoverReasonBox incident={incident} reason={verdict.reason} threshold={threshold} />
          )}

          {/* Chuyển từ trạm khác: trạm gửi, người chuyển, lý do */}
          {transfer && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs">
              <ArrowRightLeft className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <div className="space-y-0.5 min-w-0">
                <p className="font-bold text-slate-900">
                  {t('layout.incomingIncident.transferredFrom', {
                    station: transfer.fromStationName ?? t('layout.operatorAlerts.otherStation'),
                    by: transfer.transferredByName
                      ? t('layout.operatorAlerts.transferredBy', { name: transfer.transferredByName })
                      : '',
                  })}
                </p>
                <p className="text-slate-600 break-words">
                  {t('layout.incomingIncident.transferReason', { reason: transfer.reason })}
                </p>
              </div>
            </div>
          )}

          {/* Tiêu đề + mô tả */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">{incident.title}</h3>
            {incident.description && (
              <p className="text-xs text-slate-600 leading-relaxed">{incident.description}</p>
            )}
          </div>

          {/* Thông tin địa điểm + thời gian */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono-data uppercase font-bold text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                {t('layout.incomingIncident.location')}
              </div>
              <p className="text-xs font-semibold text-slate-900 leading-snug">{incident.area}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono-data uppercase font-bold text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {t('layout.incomingIncident.waitTime')}
              </div>
              <p className="text-sm font-black text-slate-900 font-mono-data">
                {formatWaitTime(waitSeconds)}
              </p>
            </div>
          </div>

          {/* Người báo */}
          {(incident.reporterName || incident.reporterPhone) && (
            <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              {incident.reporterName && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-600">{t('layout.incomingIncident.reporter')} <strong className="text-slate-900">{incident.reporterName}</strong></span>
                </div>
              )}
              {incident.reporterPhone && incident.reporterPhone !== '—' && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-red-600" />
                  <a href={`tel:${incident.reporterPhone}`} className="text-red-600 font-mono-data font-bold hover:underline">
                    {incident.reporterPhone}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 pt-2 flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <X className="w-4 h-4 text-slate-400" />
            {t('layout.incomingIncident.skip')}
          </button>
          <button
            onClick={onGoToQueue}
            className="flex-[2] py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5 animate-pulse" />
            {t('layout.incomingIncident.verifyNow')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface AiCardProps {
  incident: Incident;
  phase: 'analyzing' | 'deciding';
  onHide: () => void;
  onTakeOver: () => void;
}

/**
 * Thẻ nhỏ cho tin báo AI đang xử lý: không chặn màn hình, không giữ ca. Mở ca lúc này = giữ khóa mềm → backend bỏ qua
 * tự điều phối, nên "Tôi xử lý thay AI" hỏi lại một lần.
 */
const AiCard: React.FC<AiCardProps> = ({ incident, phase, onHide, onTakeOver }) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const [confirming, setConfirming] = useState(false);
  const now = useNow(1000);
  const waitSeconds = Math.max(0, Math.floor((now - new Date(incident.createdAt).getTime()) / 1000));

  return (
    <div
      role="status"
      className="pointer-events-auto rounded-xl border border-indigo-200 bg-white shadow-xl p-3 space-y-2 animate-drawer-in"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
          <Bot className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">
            {t('layout.incomingIncident.ai.newReport')}
            {!incident.aiPending && ` · ${incidentKindLabel(incident)}`}
          </p>
          <p className="text-xs text-slate-600 line-clamp-2">{incident.area}</p>
        </div>
        <button
          onClick={onHide}
          aria-label={t('layout.incomingIncident.ai.hide')}
          title={t('layout.incomingIncident.ai.hideTitle')}
          className="p-1 rounded-md text-slate-400 hover:bg-slate-100 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <AiProgressStrip phase={phase} />
      <p className="flex items-center gap-1.5 text-xs text-indigo-800">
        <Loader2 className="w-3.5 h-3.5 shrink-0 motion-safe:animate-spin" />
        <span className="flex-1">
          {phase === 'analyzing' ? t('layout.incomingIncident.ai.analyzing') : t('layout.incomingIncident.ai.deciding')}
        </span>
        <span className="font-mono-data text-slate-500">{formatWaitTime(waitSeconds)}</span>
      </p>
      {confirming ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 space-y-2">
          <p className="text-xs text-amber-900">{t('layout.incomingIncident.ai.takeOverConfirm')}</p>
          <div className="flex gap-2">
            <button
              onClick={onTakeOver}
              className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              {t('layout.incomingIncident.ai.takeOverYes')}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              {t('layout.incomingIncident.ai.takeOverNo')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-xs font-bold text-slate-600 hover:text-red-700 underline underline-offset-2"
        >
          {t('layout.incomingIncident.ai.takeOver')}
        </button>
      )}
    </div>
  );
};

/**
 * Tin báo mới từ người dân (§31.E — AI tự điều phối là luồng chính):
 * - AI đang phân tích / đang điều phối → thẻ nhỏ góc phải, không chặn màn hình, không giữ ca;
 * - AI chuyển cho người (hoặc tự điều phối đang tắt, ca chuyển trạm) → modal giữa màn hình, kèm lý do;
 * - AI đã điều phối → sự cố rời khỏi danh sách chờ duyệt, thông báo "AI đã điều phối" do OperatorAlerts hiện.
 * Modal hiện từng tin một (FIFO).
 */
export const IncomingIncidentToasts: React.FC = () => {
  const { incomingIncidents, dismissIncomingIncident, incomingTransferNotes, autoDispatchSettings } = useDispatchStore();
  const navigate = useNavigate();
  const now = useNow(1000);
  // Lúc bắt đầu thấy ca ở bước "đang điều phối" — quá hạn mà chưa có kết quả thì chuyển cho người.
  const [decidingSince, setDecidingSince] = useState<Record<string, number>>({});
  // Thẻ AI Operator đã ẩn: chỉ ẩn thẻ, ca vẫn bật modal nếu AI chuyển về cho người.
  const [hiddenAiIds, setHiddenAiIds] = useState<ReadonlySet<string>>(() => new Set());

  const items = incomingIncidents.map((incident) => {
    const since = decidingSince[incident.id];
    return {
      incident,
      verdict: autoDispatchVerdict(incident, autoDispatchSettings, {
        transferred: incomingTransferNotes.has(incident.id),
        decidingExpired: since !== undefined && now - since > AUTO_DISPATCH_DECIDING_TIMEOUT_MS,
      }),
    };
  });

  const newlyDeciding = items
    .filter(({ incident, verdict }) => verdict.phase === 'deciding' && decidingSince[incident.id] === undefined)
    .map(({ incident }) => incident.id)
    .join(',');
  useEffect(() => {
    if (!newlyDeciding) return;
    const at = Date.now();
    setDecidingSince((prev) => ({ ...prev, ...Object.fromEntries(newlyDeciding.split(',').map((id) => [id, at])) }));
  }, [newlyDeciding]);

  const human = items.find(
    (item): item is { incident: Incident; verdict: Extract<AutoDispatchVerdict, { phase: 'manual' | 'handover' }> } =>
      item.verdict.phase === 'manual' || item.verdict.phase === 'handover'
  );
  const aiCards = items
    .filter(({ incident, verdict }) => (verdict.phase === 'analyzing' || verdict.phase === 'deciding') && !hiddenAiIds.has(incident.id))
    .slice(0, MAX_AI_CARDS);
  const threshold = autoDispatchSettings ? Math.round(autoDispatchSettings.minConfidence * 100) : null;

  const openInQueue = (id: string) => {
    dismissIncomingIncident(id);
    navigate(QUEUE_PATH, { state: { openIncidentId: id } });
  };

  return (
    <>
      {aiCards.length > 0 &&
        createPortal(
          // Góc trên phải, dưới thanh đầu trang — tránh chồng lên OperatorAlerts (góc dưới phải).
          <div className="pointer-events-none fixed top-20 right-4 z-[9998] w-[min(22rem,calc(100vw-2rem))] space-y-2">
            {aiCards.map(({ incident, verdict }) => (
              <AiCard
                key={incident.id}
                incident={incident}
                phase={verdict.phase === 'analyzing' ? 'analyzing' : 'deciding'}
                onHide={() => setHiddenAiIds((prev) => new Set(prev).add(incident.id))}
                onTakeOver={() => openInQueue(incident.id)}
              />
            ))}
          </div>,
          document.body
        )}
      {human && (
        <IncidentModal
          key={human.incident.id}
          incident={human.incident}
          verdict={human.verdict}
          threshold={threshold}
          transfer={incomingTransferNotes.get(human.incident.id)}
          onDismiss={() => dismissIncomingIncident(human.incident.id)}
          onGoToQueue={() => openInQueue(human.incident.id)}
        />
      )}
    </>
  );
};
