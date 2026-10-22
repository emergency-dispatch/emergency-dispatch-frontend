import React from 'react';
import { CircleHelp } from 'lucide-react';
import { SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import type { SeverityLevel } from '../../../types/incident';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  /**
   * AI không phân loại được (backend severity Unclassified). Khi bật, badge hiện "Chưa phân loại"
   * thay vì "Cấp 1 · Nhẹ" — ca này đang xếp đầu hàng đợi, không được trông như ca nhẹ.
   */
  unclassified?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, unclassified = false }) => {
  if (unclassified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-slate-400 bg-white text-[11px] font-bold text-slate-700 whitespace-nowrap shrink-0">
        <CircleHelp className="w-3.5 h-3.5" />
        Chưa phân loại
      </span>
    );
  }

  const meta = SEVERITY_LEVEL_META[severity];

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md border text-[11px] font-bold whitespace-nowrap shrink-0 ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};
