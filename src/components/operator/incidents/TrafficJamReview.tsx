import React from 'react';
import { CheckCircle2, CircleSlash, TrafficCone } from 'lucide-react';
import { TRAFFIC_JAM_STATUS_CLASS } from '../../../data/incidentMock';
import type { IncidentTrafficJam, TrafficJamDecision } from '../../../types/incident';
import { dateLocale, useTranslation } from '../../../i18n';

const DECISIONS: Array<{ value: TrafficJamDecision; icon: typeof CheckCircle2; activeClass: string }> = [
  { value: 'Confirmed', icon: CheckCircle2, activeClass: 'bg-red-600 border-red-600 text-white' },
  { value: 'Dismissed', icon: CircleSlash, activeClass: 'bg-emerald-600 border-emerald-600 text-white' },
];

interface TrafficJamReviewProps {
  trafficJam: IncidentTrafficJam;
  currentOperatorId: string;
  /** Lựa chọn chưa lưu — gửi kèm khi duyệt (confirmedTrafficJamStatus). */
  decision: TrafficJamDecision | null;
  onDecisionChange: (decision: TrafficJamDecision | null) => void;
  /** Ẩn nút thẩm định (chưa nhận ca, đang hủy / chuyển trạm…). */
  readOnly?: boolean;
}

/**
 * Khối "Tình trạng giao thông" (Human-in-the-loop): AI chỉ nêu nghi ngờ kèm căn cứ, Operator chốt
 * xác nhận / bác bỏ. Không hiện khi AI không thấy dấu hiệu (NoEvidence).
 */
export const TrafficJamReview: React.FC<TrafficJamReviewProps> = ({
  trafficJam,
  currentOperatorId,
  decision,
  onDecisionChange,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const { status, evidence, reviewed, verifiedAt, verifiedByUserId } = trafficJam;
  // Chọn lại đúng trạng thái đã lưu thì không gửi gì.
  const pending = decision && decision !== status ? decision : null;
  const verifiedTime = verifiedAt
    ? new Date(verifiedAt).toLocaleString(dateLocale(), { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    : null;

  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-2 text-xs font-mono-data uppercase tracking-widest text-slate-500 font-bold">
          <TrafficCone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          {t('incidents.traffic.heading')}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${TRAFFIC_JAM_STATUS_CLASS[status]}`}
        >
          {t(`incidents.traffic.status.${status}`)}
        </span>
      </div>

      {evidence && <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{evidence}</p>}

      {reviewed && verifiedTime && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          {verifiedByUserId === currentOperatorId
            ? t('incidents.traffic.reviewedByYou', { time: verifiedTime })
            : t('incidents.traffic.reviewedByOther', { time: verifiedTime })}
        </p>
      )}

      {!readOnly && (
        <>
          {!reviewed && (
            <p className="text-[11px] text-slate-500">
              {status === 'Unverified' ? t('incidents.traffic.unverifiedHint') : t('incidents.traffic.needsReview')}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('incidents.traffic.decisionGroup')}>
            {DECISIONS.map(({ value, icon: Icon, activeClass }) => {
              const isActive = (decision ?? (reviewed ? status : null)) === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onDecisionChange(decision === value ? null : value)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                    isActive ? activeClass : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {value === 'Confirmed' ? t('incidents.traffic.confirm') : t('incidents.traffic.dismiss')}
                </button>
              );
            })}
          </div>
          {pending && (
            <p className="text-[11px] text-blue-700">
              {t('incidents.traffic.savedOnApprove', { decision: t(`incidents.traffic.status.${pending}`) })}
            </p>
          )}
        </>
      )}
    </div>
  );
};
