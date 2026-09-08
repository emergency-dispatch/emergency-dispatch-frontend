import React from 'react';
import { MAINTENANCE_META, getMaintenanceStatus } from '../../../data/stationMock';

interface MaintenanceBadgeProps {
  dueDate: string;
}

export const MaintenanceBadge: React.FC<MaintenanceBadgeProps> = ({ dueDate }) => {
  const status = getMaintenanceStatus(dueDate);
  const meta = MAINTENANCE_META[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap shrink-0 ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};
