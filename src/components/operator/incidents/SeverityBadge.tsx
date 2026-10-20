import React from 'react';
import { SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import type { SeverityLevel } from '../../../types/incident';

interface SeverityBadgeProps {
  severity: SeverityLevel;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const meta = SEVERITY_LEVEL_META[severity];

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md border text-[11px] font-bold font-mono-data whitespace-nowrap shrink-0 ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};
