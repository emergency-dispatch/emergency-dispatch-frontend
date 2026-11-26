import React from 'react';
import { TimerOff } from 'lucide-react';
import type { Incident } from '../../../types/incident';
import { formatDateTime } from '../../../utils/incidentFormat';
import { useTranslation } from '../../../i18n';

/**
 * §59 (BR-09): ca chờ duyệt quá `autoExpireHours` → backend đánh dấu "Quá hạn – cần rà soát" (không tự hủy). Chỉ hiện khi
 * ca còn chờ thẩm định; duyệt rồi thì cờ không còn ý nghĩa.
 */
export const StaleChip: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { t } = useTranslation();
  if (!incident.staleFlaggedAt || incident.status !== 'pending') return null;
  return (
    <span
      title={t('liveMap.cases.staleTitle', { time: formatDateTime(incident.staleFlaggedAt) })}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 border border-red-300 text-[10px] font-bold text-red-700 shrink-0"
    >
      <TimerOff className="w-3 h-3" />
      {t('liveMap.cases.stale')}
    </span>
  );
};
