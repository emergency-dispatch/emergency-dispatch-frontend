import React from 'react';
import { INCIDENT_SOURCE_ICON } from '../../../data/incidentSourceMeta';
import type { IncidentSource } from '../../../types/incident';
import { useTranslation } from '../../../i18n';

/** Nhãn "Operator tạo · Điện thoại" — phân biệt sự cố Operator tự tạo với SOS người dân. SOS thì không hiện gì. */
export const SourceChip: React.FC<{ source: IncidentSource }> = ({ source }) => {
  const { t } = useTranslation();
  if (source === 'CitizenApp') return null;
  const Icon = INCIDENT_SOURCE_ICON[source];
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[9px] font-bold text-indigo-700 whitespace-nowrap">
      <Icon className="w-2.5 h-2.5 shrink-0" />
      {t('liveMap.source.operatorCreated', { channel: t(`enums.incidentSource.${source}`) })}
    </span>
  );
};
