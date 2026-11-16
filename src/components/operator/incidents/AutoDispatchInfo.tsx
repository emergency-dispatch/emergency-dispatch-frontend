import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, BotOff, ExternalLink } from 'lucide-react';
import { useDispatchStore } from '../../../context/DispatchContext';
import type { Incident } from '../../../types/incident';
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
    </span>
  );
};

/**
 * §31.E: khối giải thích trong drawer thẩm định / panel ca: kết quả AI tự điều phối, lý do (autoDispatchNote) và cờ
 * "Nghi trùng với sự cố …" — bấm để mở sự cố kia trên Live Map (sự cố đó đã được điều xe).
 */
export const AutoDispatchNotice: React.FC<{ incident: AutoDispatchIncident; className?: string }> = ({
  incident,
  className = '',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { incidents } = useDispatchStore();
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
