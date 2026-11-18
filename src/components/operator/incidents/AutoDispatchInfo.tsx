import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, BotOff, ExternalLink, Loader2 } from 'lucide-react';
import { useDispatchStore } from '../../../context/DispatchContext';
import type { Incident } from '../../../types/incident';
import { autoDispatchVerdict, type HandoverReason } from './autoDispatchVerdict';
import { useTranslation } from '../../../i18n';

type AutoDispatchIncident = Pick<Incident, 'autoDispatch' | 'confidenceScore'>;

/**
 * §31.E: nhãn ngắn trên dòng hàng đợi / danh sách ca. Dispatched: "AI tự điều phối · 93%"; Skipped: "AI bỏ qua".
 * Không áp dụng → không hiện gì.
 */
export const AutoDispatchBadge: React.FC<{ incident: AutoDispatchIncident }> = ({ incident }) => {
  const { t } = useTranslation();
  const auto = incident.autoDispatch;
  if (!auto) return null;
  const dispatched = auto.state === 'Dispatched';
  const Icon = dispatched ? Bot : BotOff;
  return (
    <span
      title={auto.note ?? undefined}
      className={`inline-flex items-center gap-1 px-1.5 py-px rounded border text-[10px] font-bold shrink-0 ${
        dispatched ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
    >
      <Icon className="w-3 h-3" />
      {dispatched
        ? t('incidents.autoDispatch.badgeDispatched', { confidence: incident.confidenceScore })
        : t('incidents.autoDispatch.badgeSkipped')}
      {auto.suspectedDuplicateOfId && <span aria-hidden>·</span>}
      {auto.suspectedDuplicateOfId && t('incidents.autoDispatch.badgeDuplicate')}
      {/* §35: AI điều chưa đủ số tổ theo kế hoạch */}
      {auto.partial && <span aria-hidden>·</span>}
      {auto.partial && <span title={t('incidents.autoDispatch.badgePartialTitle')}>{t('incidents.autoDispatch.badgePartial')}</span>}
    </span>
  );
};

/**
 * Thanh độ tin cậy kèm vạch ngưỡng tự điều phối: Operator thấy ngay còn thiếu (hoặc vượt) bao nhiêu.
 * `measured = false` (chỉ ước lượng) → thanh nét đứt, không tô — con số không dùng để tự điều phối.
 */
export const ConfidenceThresholdBar: React.FC<{
  confidence: number;
  threshold: number;
  measured: boolean | null;
  tone: 'amber' | 'indigo';
}> = ({ confidence, threshold, measured, tone }) => {
  const { t } = useTranslation();
  const label =
    measured === false
      ? t('incidents.autoDispatch.notMeasured', { confidence })
      : t('incidents.autoDispatch.confidenceVsThreshold', { confidence, threshold });
  const fill = tone === 'amber' ? 'bg-amber-600' : 'bg-indigo-600';
  const track = tone === 'amber' ? 'bg-amber-200' : 'bg-indigo-100';
  return (
    <div className="space-y-1">
      <div
        role="img"
        aria-label={label}
        className={`relative h-1.5 rounded-full ${
          measured === false ? 'border border-dashed border-slate-400 bg-transparent' : track
        }`}
      >
        {measured !== false && (
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${fill}`}
            style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
          />
        )}
        <div className="absolute -top-1 -bottom-1 w-0.5 bg-slate-800" style={{ left: `${threshold}%` }} />
      </div>
      <p className="text-[10px] opacity-80">{label}</p>
    </div>
  );
};

type StripPhase = 'analyzing' | 'deciding' | 'handover';

/**
 * Dải tiến trình của tin báo: Đã nhận → AI phân tích → Tự điều phối / Chuyển cho bạn. Màu chàm = việc AI đang làm,
 * đỏ = tới lượt người. Dùng chung cho thẻ AI, modal tin báo mới và drawer thẩm định để thấy cùng một ca đi tới đâu.
 */
export const AiProgressStrip: React.FC<{ phase: StripPhase }> = ({ phase }) => {
  const { t } = useTranslation();
  const steps: { label: string; state: 'done' | 'active' | 'todo' | 'handover' }[] = [
    { label: t('layout.incomingIncident.strip.received'), state: 'done' },
    { label: t('layout.incomingIncident.strip.analyzing'), state: phase === 'analyzing' ? 'active' : 'done' },
    {
      label:
        phase === 'handover'
          ? t('layout.incomingIncident.strip.handover')
          : t('layout.incomingIncident.strip.dispatching'),
      state: phase === 'analyzing' ? 'todo' : phase === 'deciding' ? 'active' : 'handover',
    },
  ];
  return (
    <ol aria-label={t('layout.incomingIncident.strip.label')} className="flex items-center gap-1.5 text-[10px] font-semibold">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-1.5 min-w-0">
          {index > 0 && (
            <span aria-hidden className={`h-px w-3 sm:w-5 shrink-0 ${step.state === 'todo' ? 'bg-slate-300' : 'bg-indigo-300'}`} />
          )}
          {step.state === 'handover' ? (
            <span aria-hidden className="w-2 h-2 rotate-45 shrink-0 bg-red-600" />
          ) : (
            <span
              aria-hidden
              className={`w-2 h-2 rounded-full shrink-0 ${
                step.state === 'done'
                  ? 'bg-indigo-600'
                  : step.state === 'active'
                    ? 'bg-indigo-500 ring-2 ring-indigo-200 motion-safe:animate-pulse'
                    : 'bg-slate-300'
              }`}
            />
          )}
          <span
            aria-current={step.state === 'active' || step.state === 'handover' ? 'step' : undefined}
            className={`truncate ${
              step.state === 'handover'
                ? 'text-red-700 font-bold'
                : step.state === 'active'
                  ? 'text-indigo-700'
                  : 'text-slate-500'
            }`}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
};

interface HandoverReasonBoxProps {
  incident: Incident;
  reason: HandoverReason;
  /** Ngưỡng tự điều phối (%), null = chưa có cài đặt. */
  threshold: number | null;
  /** Mặc định "Vì sao AI không tự điều phối". */
  title?: string;
  /** Dải tiến trình ở đầu khối (drawer thẩm định). */
  showStrip?: boolean;
  /** Dòng hướng dẫn cuối khối. */
  hint?: string;
  className?: string;
}

/** Khối vàng giải thích vì sao AI chuyển ca cho người (modal tin báo mới, drawer thẩm định). */
export const HandoverReasonBox: React.FC<HandoverReasonBoxProps> = ({
  incident,
  reason,
  threshold,
  title,
  showStrip = false,
  hint,
  className = '',
}) => {
  const { t } = useTranslation();
  const { currentOperatorId } = useDispatchStore();
  const lockName =
    incident.lock?.operatorId === currentOperatorId
      ? t('layout.incomingIncident.you')
      : incident.lock?.operatorName || t('layout.incomingIncident.anotherOperator');
  // §35: lý do "đang giữ ca" do backend lưu có thể đến sau khi khóa đã nhả → không biết ai giữ.
  const reasonKey = reason === 'operatorHandling' && !incident.lock ? 'operatorHandlingNoName' : reason;
  const text =
    reason === 'skipped' && incident.autoDispatch?.note
      ? incident.autoDispatch.note
      : t(`layout.incomingIncident.reasons.${reasonKey}`, {
          confidence: incident.confidenceScore,
          threshold: threshold ?? 0,
          name: lockName,
        });
  // Thanh % chỉ có nghĩa khi lý do nằm ở độ tin cậy.
  const showBar = threshold !== null && (reason === 'belowThreshold' || reason === 'confidenceNotMeasured');
  return (
    <div className={`p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2 text-amber-900 ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold">
        <BotOff className="w-4 h-4 shrink-0" />
        {title ?? t('layout.incomingIncident.reasonTitle')}
      </p>
      {showStrip && <AiProgressStrip phase="handover" />}
      <p className="text-xs leading-relaxed">{text}</p>
      {showBar && (
        <ConfidenceThresholdBar
          confidence={incident.confidenceScore}
          threshold={threshold}
          measured={incident.confidenceMeasured}
          tone="amber"
        />
      )}
      {hint && <p className="text-[11px] opacity-80">{hint}</p>}
    </div>
  );
};

/**
 * §31.E: khối giải thích trong drawer thẩm định / panel ca: kết quả AI tự điều phối, lý do (autoDispatchNote) và cờ
 * "Nghi trùng với sự cố …" — bấm để mở sự cố kia trên Live Map (sự cố đó đã được điều xe).
 */
export const AutoDispatchNotice: React.FC<{ incident: Incident; className?: string }> = ({
  incident,
  className = '',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { incidents, autoDispatchSettings } = useDispatchStore();
  const auto = incident.autoDispatch;
  if (!auto) return null;
  const dispatched = auto.state === 'Dispatched';
  const Icon = dispatched ? Bot : BotOff;
  const duplicateId = auto.suspectedDuplicateOfId;
  const duplicate = duplicateId ? incidents.find((i) => i.id === duplicateId) : undefined;
  // Sự cố kia có thể không thuộc trạm mình / đã đóng → hiện mã ngắn.
  const duplicateLabel = duplicate?.title ?? (duplicateId ? `#${duplicateId.slice(0, 8)}` : '');

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs space-y-1 ${
        dispatched ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : 'border-amber-300 bg-amber-50 text-amber-900'
      } ${className}`}
    >
      <p className="flex items-center gap-1.5 font-bold">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {dispatched
          ? t('incidents.autoDispatch.dispatchedTitle', { confidence: incident.confidenceScore })
          : t('incidents.autoDispatch.skippedTitle')}
      </p>
      {auto.note && <p className="leading-relaxed">{auto.note}</p>}
      {/* AI đã điều: cho thấy độ tin cậy vượt ngưỡng bao nhiêu (ngưỡng hiện tại của Admin). */}
      {dispatched && autoDispatchSettings && (
        <ConfidenceThresholdBar
          confidence={incident.confidenceScore}
          threshold={Math.round(autoDispatchSettings.minConfidence * 100)}
          measured={incident.confidenceMeasured}
          tone="indigo"
        />
      )}
      <p className="text-[11px] opacity-80">
        {dispatched ? t('incidents.autoDispatch.dispatchedHint') : t('incidents.autoDispatch.skippedHint')}
      </p>
      {duplicateId && (
        <div className="pt-1 space-y-1">
          <button
            type="button"
            onClick={() => navigate('/dashboard/command-center/live-map', { state: { focusIncidentId: duplicateId } })}
            className="inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:no-underline"
          >
            {t('incidents.autoDispatch.suspectedDuplicate', { title: duplicateLabel })}
            <ExternalLink className="w-3 h-3" />
          </button>
          <p className="text-[11px] opacity-80">{t('incidents.autoDispatch.duplicateHint')}</p>
        </div>
      )}
    </div>
  );
};

/**
 * §31.E: dải đầu drawer thẩm định trả lời "vì sao ca này tới tay tôi":
 * - AI đã điều / đã bỏ qua (có kết quả backend) → `AutoDispatchNotice`;
 * - ca chờ duyệt, AI chưa xong mà Operator đã mở → cảnh báo AI sẽ không tự điều phối (đóng ca để AI làm);
 * - ca chờ duyệt, AI chuyển cho người → lý do + thanh độ tin cậy / ngưỡng + hướng dẫn.
 * Tự điều phối đang tắt → không hiện gì (luồng thẩm định cũ).
 */
export const AutoDispatchBanner: React.FC<{ incident: Incident; className?: string }> = ({ incident, className = '' }) => {
  const { t } = useTranslation();
  const { autoDispatchSettings } = useDispatchStore();
  if (incident.autoDispatch) return <AutoDispatchNotice incident={incident} className={className} />;
  if (incident.status !== 'pending') return null;
  // Đang mở drawer → không chờ "đang điều phối": khóa mềm đã chặn AI.
  const verdict = autoDispatchVerdict(incident, autoDispatchSettings, { transferred: false, decidingExpired: true });
  if (verdict.phase === 'manual') return null;
  const threshold = autoDispatchSettings ? Math.round(autoDispatchSettings.minConfidence * 100) : null;

  if (verdict.phase === 'handover') {
    return (
      <HandoverReasonBox
        incident={incident}
        reason={verdict.reason}
        threshold={threshold}
        title={t('incidents.autoDispatch.handoverTitle')}
        showStrip
        hint={t('incidents.autoDispatch.handoverHint')}
        className={className}
      />
    );
  }
  return (
    <div className={`p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 text-indigo-900 ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold">
        <Loader2 className="w-4 h-4 shrink-0 motion-safe:animate-spin" />
        {t('incidents.autoDispatch.heldWhileAnalyzingTitle')}
      </p>
      <AiProgressStrip phase={verdict.phase} />
      <p className="text-xs leading-relaxed">{t('incidents.autoDispatch.heldWhileAnalyzingBody')}</p>
    </div>
  );
};
