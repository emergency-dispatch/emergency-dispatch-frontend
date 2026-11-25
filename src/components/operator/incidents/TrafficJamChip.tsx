import React from 'react';
import { TrafficCone } from 'lucide-react';
import { TRAFFIC_JAM_STATUS_CLASS } from '../../../data/incidentMock';
import type { Incident } from '../../../types/incident';
import { useTranslation } from '../../../i18n';

/** Chỉ báo ùn tắc khi cần Operator thẩm định (nghi ngờ / bất đồng) hoặc đã xác nhận; bác bỏ / chưa xác minh không hiện. */
export const TrafficJamChip: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { t } = useTranslation();
  const status = incident.trafficJam?.status;
  const chip =
    status === 'Suspected'
      ? { label: t('incidents.row.trafficSuspected'), title: t('incidents.row.trafficNeedsReview') }
      : status === 'Disputed'
        ? { label: t('incidents.row.trafficDisputed'), title: t('incidents.row.trafficNeedsReview') }
        : status === 'Confirmed'
          ? { label: t('incidents.row.trafficConfirmed'), title: t('incidents.row.trafficConfirmedTitle') }
          : null;
  if (!chip || !status) return null;
  return (
    <span
      title={chip.title}
      className={`inline-flex items-center gap-1 px-1.5 py-px rounded border text-[10px] font-bold shrink-0 ${TRAFFIC_JAM_STATUS_CLASS[status]}`}
    >
      <TrafficCone className="w-3 h-3" />
      {chip.label}
    </span>
  );
};
