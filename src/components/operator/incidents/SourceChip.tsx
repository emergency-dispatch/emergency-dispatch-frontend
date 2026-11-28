import React from 'react';
import { INCIDENT_SOURCE_ICON } from '../../../data/incidentSourceMeta';
import type { IncidentSource } from '../../../types/incident';
import { useTranslation } from '../../../i18n';

/** Nhãn "Tổ tự phát hiện" hoặc "Operator tạo · Điện thoại" — phân biệt sự cố tự tạo / tổ phát hiện với SOS người dân. SOS thì không hiện gì. */
export const SourceChip: React.FC<{ source: IncidentSource }> = ({ source }) => {
  const { t } = useTranslation();
  if (source === 'CitizenApp') return null;
  const Icon = INCIDENT_SOURCE_ICON[source];
  if (source === 'RescueTeam') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-700 whitespace-nowrap">
        <Icon className="w-2.5 h-2.5 shrink-0" />
        {t('enums.incidentSource.RescueTeam', 'Tổ tự phát hiện')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[9px] font-bold text-indigo-700 whitespace-nowrap">
      <Icon className="w-2.5 h-2.5 shrink-0" />
      {t('liveMap.source.operatorCreated', { channel: t(`enums.incidentSource.${source}`) })}
    </span>
  );
};
