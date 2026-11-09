import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, History, Loader2 } from 'lucide-react';
import { useServiceQuery } from '../common/hooks';
import { actorRoleLabel, fieldLabel, formatAuditTime, stateChanges, systemActionMeta } from '../audit/auditMeta';
import { auditTrailService } from '../../../services/admin/auditTrailService';
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES, type EquipmentDto } from '../../../types/equipment';
import { useTranslation } from '../../../i18n';

const HISTORY_SIZE = 8;
// Trường kỹ thuật không cần hiện trong lịch sử.
const HIDDEN_FIELDS = new Set(['statusChangedAt', 'updatedAt', 'createdAt']);

interface EquipmentHistoryProps {
  equipment: EquipmentDto;
  /** Id trạm → "ST-001 · Tên trạm". */
  stationLabel: (id: string) => string;
  /** Id xe → biển số (xe đã xóa → id rút gọn). */
  unitLabel: (id: string) => string;
}

const has = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v);

/**
 * "Lịch sử thay đổi" trong drawer sửa thiết bị (chỉ Admin — GET /audit-trail/system?entityType=Equipment&entityId=…).
 * Backend ghi Tạo / Sửa / Đổi trạng thái / Xóa; hiện vài bản ghi mới nhất, phần còn lại xem ở trang Nhật ký.
 */
export const EquipmentHistory: React.FC<EquipmentHistoryProps> = ({ equipment, stationLabel, unitLabel }) => {
  const { t } = useTranslation();
  const query = useServiceQuery(
    () => auditTrailService.listSystem({ entityType: 'Equipment', entityId: equipment.id }, { pageIndex: 1, pageSize: HISTORY_SIZE }),
    // updatedAt đổi sau mỗi lần lưu → tải lại lịch sử.
    `equipment-history-${equipment.id}-${equipment.updatedAt ?? ''}-${equipment.statusChangedAt ?? ''}`
  );

  const formatValue = (field: string, value: string | null): string => {
    if (value === null) return '—';
    switch (field) {
      case 'category':
        return has(EQUIPMENT_CATEGORIES, value) ? t(`vehicles.equipment.category.${value}`) : value;
      case 'status':
        return has(EQUIPMENT_STATUSES, value) ? t(`vehicles.equipment.statusLabel.${value}`) : value;
      case 'stationId':
        return value === '—' ? value : stationLabel(value);
      case 'rescueUnitId':
        return value === '—' ? t('vehicles.equipment.stock') : unitLabel(value);
      default:
        return value;
    }
  };

  const items = query.data?.items ?? [];
  const more = (query.data?.totalCount ?? 0) - items.length;
  const auditLink = `/admin/audit-trail?tab=system&entityType=Equipment&entityId=${equipment.id}&entityName=${encodeURIComponent(
    equipment.name
  )}`;

  return (
    <section className="pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
          <History className="w-3.5 h-3.5" />
          {t('admin.equipment.history.title')}
        </h3>
        <Link to={auditLink} className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline">
          {t('admin.equipment.history.openAudit')}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {query.loading && !query.data ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t('admin.equipment.history.loading')}
        </p>
      ) : query.error ? (
        <p className="text-xs text-red-600">{query.error}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500">{t('admin.equipment.history.empty')}</p>
      ) : (
        <ol className="relative space-y-3 before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-px before:bg-slate-200">
          {items.map((entry) => {
            const meta = systemActionMeta(entry.action);
            const Icon = meta.icon;
            const created = entry.action === 'Created';
            const changes = created
              ? []
              : stateChanges(entry.oldValueJson, entry.newValueJson).filter((c) => !HIDDEN_FIELDS.has(c.field));
            return (
              <li key={entry.id} className="relative pl-8">
                <span
                  className={`absolute left-0 top-0 inline-flex items-center justify-center w-6 h-6 rounded-full border ${meta.badgeClass}`}
                >
                  <Icon className="w-3 h-3" />
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="text-xs font-bold text-slate-800">{meta.label}</p>
                  <time className="text-[10px] font-mono-data text-slate-400" dateTime={entry.timestamp}>
                    {formatAuditTime(entry.timestamp)}
                  </time>
                </div>
                <p className="text-[11px] text-slate-500">
                  {entry.actorName ?? t('admin.equipment.history.system')}
                  {entry.actorRole && <span className="text-slate-400"> · {actorRoleLabel(entry.actorRole)}</span>}
                </p>
                {changes.length > 0 && (
                  <ul className="mt-1 space-y-0.5 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
                    {changes.map((c) => (
                      <li key={c.field} className="text-[11px] text-slate-600 break-words">
                        <span className="font-semibold text-slate-700">{fieldLabel(c.field)}: </span>
                        {c.from !== null && (
                          <>
                            <span className="line-through decoration-slate-300 text-slate-400">{formatValue(c.field, c.from)}</span>
                            {' → '}
                          </>
                        )}
                        <span className="text-slate-900">{formatValue(c.field, c.to)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {more > 0 && (
        <p className="mt-2 text-[11px] text-slate-500">{t('admin.equipment.history.more', { count: more })}</p>
      )}
    </section>
  );
};
