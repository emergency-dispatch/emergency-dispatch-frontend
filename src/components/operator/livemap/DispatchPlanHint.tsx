import React from 'react';
import { ListChecks } from 'lucide-react';
import type { DispatchVehicleLimit } from '../../../data/dispatchConfig';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useTranslation } from '../../../i18n';

const LEVEL_NUMBER = { Level1: 1, Level2: 2, Level3: 3 } as const;

/**
 * Thành phần kế hoạch điều xe đang áp dụng cho sự cố (§32), VD "Kế hoạch Cấp 2: 2× Xe chữa cháy · 1× Xe cấp cứu".
 * Loại sự cố chưa có kế hoạch → không hiện gì (dùng giới hạn cũ).
 */
export const DispatchPlanHint: React.FC<{ limit: DispatchVehicleLimit; className?: string }> = ({ limit, className = '' }) => {
  const { t } = useTranslation();
  const { unitTypeLabel } = useDispatchStore();
  if (!limit.planLevel || limit.planUnits.length === 0) return null;
  // Tên theo danh mục loại xe; loại đã ẩn (không có trong danh mục của Operator) dùng tên backend trả kèm kế hoạch.
  const label = (code: string, fallback?: string | null) => {
    const name = unitTypeLabel(code);
    return name === code && fallback ? fallback : name;
  };
  const units = limit.planUnits.map((u) => `${u.quantity}× ${label(u.unitTypeCode, u.unitTypeName)}`).join(' · ');
  return (
    <p className={`flex items-start gap-1.5 text-[11px] text-slate-500 ${className}`}>
      <ListChecks className="w-3.5 h-3.5 mt-px shrink-0 text-slate-400" />
      <span>
        {t('liveMap.plan.label', { level: LEVEL_NUMBER[limit.planLevel] })}{' '}
        <span className="font-semibold text-slate-700">{units}</span>
      </span>
    </p>
  );
};
