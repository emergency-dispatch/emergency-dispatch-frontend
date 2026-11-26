import React from 'react';
import { AlertTriangle, CircleCheck } from 'lucide-react';
import { useDispatchStore } from '../../../context/DispatchContext';
import type { Incident, IncidentCategory, SeverityLevel } from '../../../types/incident';
import { useReadyTeams } from '../livemap/readyTeams';
import { useTranslation } from '../../../i18n';

interface PlanForcePreviewProps {
  incident: Incident;
  /** Mức Operator đang chọn; null = chưa chọn. */
  severity: SeverityLevel | null;
  /** Loại chi tiết đang chọn (mã danh mục). */
  typeCode: string | null;
  /** Nhóm đang chọn; null = chưa chọn (sự cố chưa có loại). */
  category: Exclude<IncidentCategory, 'unknown'> | null;
}

/**
 * "Cấp … sẽ điều" trong cột quyết định của panel thẩm định: kế hoạch điều tổ của loại sự cố ở mức đang chọn (BR-14,
 * `vehicleLimitFor`) so với tổ còn sẵn sàng của trạm (cùng cách đếm thẻ "Tổ sẵn sàng"). Để Operator thấy trạm thiếu tổ
 * trước khi duyệt (→ cân nhắc chuyển trạm). Chỉ là ước tính phía FE; tổ cụ thể do backend gợi ý ở bước giao tổ.
 */
export const PlanForcePreview: React.FC<PlanForcePreviewProps> = ({ incident, severity, typeCode, category }) => {
  const { t } = useTranslation();
  const { vehicleLimitFor, unitTypeLabel } = useDispatchStore();
  const { readyTeams } = useReadyTeams();

  if (severity === null || (incident.needsEventType && !category)) {
    return <p className="text-xs text-slate-400">{t('incidents.drawer.force.needChoice')}</p>;
  }

  const usable = readyTeams.filter((r) => r.farKm === null);
  const limit = vehicleLimitFor({
    severity,
    incidentTypeCode: typeCode,
    category: category ?? incident.category,
    needsEventType: !category && incident.needsEventType,
  });
  const heading = t('incidents.drawer.force.title', { level: t(`enums.severityShort.level${severity}`) });

  // Chưa có kế hoạch cho loại này → backend giao theo giới hạn cũ (Cấp 1–2: 1 tổ, Cấp 3: tối đa 5), chức năng nào cũng được.
  if (limit.planUnits.length === 0) {
    const enough = usable.length >= 1;
    return (
      <section title={t('incidents.drawer.force.estimateNote')}>
        <p className="text-[13px] font-semibold text-slate-700 mb-1.5">{heading}</p>
        <p className={`flex items-start gap-1.5 text-xs ${enough ? 'text-slate-600' : 'text-amber-800'}`}>
          {enough ? (
            <CircleCheck className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-600" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          )}
          {t('incidents.drawer.force.noPlan', { max: limit.max, ready: usable.length })}
        </p>
      </section>
    );
  }

  return (
    <section title={t('incidents.drawer.force.estimateNote')}>
      <p className="text-[13px] font-semibold text-slate-700 mb-1.5">{heading}</p>
      <ul className="space-y-1">
        {limit.planUnits.map((unit) => {
          const teams = usable.filter((r) => r.vehicle.type === unit.unitTypeCode).map((r) => r.team.name);
          const short = Math.max(0, unit.quantity - teams.length);
          return (
            <li key={unit.unitTypeCode} className="flex items-start gap-1.5 text-xs">
              {short === 0 ? (
                <CircleCheck className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-600" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-600" />
              )}
              <span className="min-w-0">
                <span className="font-semibold text-slate-700">
                  {unit.quantity} × {unit.unitTypeName || unitTypeLabel(unit.unitTypeCode)}
                </span>
                <span className={short === 0 ? 'text-slate-500' : 'text-amber-800'}>
                  {' · '}
                  {short === 0
                    ? t('incidents.drawer.force.ready', { names: teams.slice(0, 2).join(', ') + (teams.length > 2 ? '…' : '') })
                    : teams.length === 0
                      ? t('incidents.drawer.force.none')
                      : t('incidents.drawer.force.short', { ready: teams.length, short })}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
