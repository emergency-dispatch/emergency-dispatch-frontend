import React from 'react';
import { Bot, Eye, EyeOff, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { LockableButton, VehicleStatusBadge } from '../common/ui';
import { iconButtonClass, thClass } from '../common/styles';
import { catalogColor, catalogIcon, catalogName, levelNumber, planSummary } from './catalogMeta';
import type { IncidentTypeDto, RescueUnitTypeDto } from '../../../types/typeCatalog';
import { useTranslation } from '../../../i18n';

type CatalogEntry = RescueUnitTypeDto | IncidentTypeDto;

interface CatalogTypesTableProps<T extends CatalogEntry> {
  kind: 'unit' | 'incident';
  items: T[];
  loading: boolean;
  emptyLabel: string;
  /** Loại xe: số xe đang mang mã này (để báo trước vì sao không xóa được). */
  vehicleCounts?: Map<string, number>;
  /** Dòng đang chờ phản hồi ẩn / dùng lại. */
  pendingId: string | null;
  onEdit: (entry: T) => void;
  onToggleActive: (entry: T) => void;
  onDelete: (entry: T) => void;
  /** Chỉ loại sự cố. */
  onEditPlan?: (entry: T) => void;
}

const ACTIVE_COLOR = '#059669';
const HIDDEN_COLOR = '#94A3B8';

export const CatalogTypesTable = <T extends CatalogEntry>({
  kind,
  items,
  loading,
  emptyLabel,
  vehicleCounts,
  pendingId,
  onEdit,
  onToggleActive,
  onDelete,
  onEditPlan,
}: CatalogTypesTableProps<T>) => {
  const { t } = useTranslation();
  const columns = kind === 'incident' ? 6 : 5;
  return (
    <div
      className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
        loading ? 'opacity-60' : ''
      }`}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className={thClass}>{t('admin.catalog.table.type')}</th>
            {kind === 'incident' ? (
              <>
                <th className={thClass}>{t('admin.catalog.table.category')}</th>
                <th className={thClass}>
                  {t('admin.catalog.table.plan')}
                  <span className="block font-normal normal-case tracking-normal text-slate-400">
                    {t('admin.catalog.table.planHeader')}
                  </span>
                </th>
              </>
            ) : (
              <th className={`${thClass} text-right`}>{t('admin.catalog.table.vehicles')}</th>
            )}
            <th className={`${thClass} text-right`}>{t('admin.catalog.table.order')}</th>
            <th className={thClass}>{t('admin.common.status')}</th>
            <th className={`${thClass} text-right`}>{t('admin.common.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 && (
            <tr>
              <td colSpan={columns} className="px-4 py-10 text-center text-slate-400 text-sm">
                {loading ? t('admin.common.loading') : emptyLabel}
              </td>
            </tr>
          )}
          {items.map((entry) => {
            const Icon = catalogIcon(entry.icon);
            const color = catalogColor(entry.color);
            const vehicles = vehicleCounts?.get(entry.code) ?? 0;
            const deleteLock = entry.isSystem
              ? t('admin.catalog.table.deleteLockSystem')
              : vehicles > 0
                ? t('admin.catalog.table.deleteLockVehicles', { count: vehicles })
                : null;
            const pending = pendingId === entry.id;
            return (
              <tr key={entry.id} className={`hover:bg-slate-50 ${entry.isActive ? '' : 'bg-slate-50/60'}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}1A`, color }}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-semibold ${entry.isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                          {catalogName(entry)}
                        </span>
                        {entry.isSystem && (
                          <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-[10px] font-mono-data font-semibold text-slate-500">
                            {t('admin.catalog.system')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono-data text-slate-400">{entry.code}</div>
                      {entry.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">{entry.description}</div>
                      )}
                    </div>
                  </div>
                </td>

                {'category' in entry ? (
                  <>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-slate-700">{t(`admin.catalog.category.${entry.category}`)}</span>
                      {entry.aiRecognizable && (
                        <span className="mt-1 flex items-center gap-1 text-[10px] font-mono-data font-semibold text-indigo-600">
                          <Bot className="w-3 h-3" />
                          {t('admin.catalog.aiRecognizable')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {planSummary(entry.dispatchPlan).map(({ severity, total }) => (
                          <span
                            key={severity}
                            title={
                              total > 0
                                ? t('admin.catalog.table.planLevelTitle', { n: levelNumber(severity), count: total })
                                : t('admin.catalog.table.planEmptyTitle', { n: levelNumber(severity) })
                            }
                            className={`min-w-[1.75rem] px-1.5 py-0.5 rounded text-center text-xs font-mono-data font-bold ${
                              total > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {total > 0 ? total : '—'}
                          </span>
                        ))}
                      </div>
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-3 text-right font-mono-data text-slate-700">{vehicles}</td>
                )}

                <td className="px-4 py-3 text-right font-mono-data text-slate-500">{entry.displayOrder}</td>
                <td className="px-4 py-3">
                  <VehicleStatusBadge
                    label={t(`admin.catalog.statusFilter.${entry.isActive ? 'active' : 'hidden'}`)}
                    color={entry.isActive ? ACTIVE_COLOR : HIDDEN_COLOR}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {onEditPlan && (
                      <LockableButton
                        onClick={() => onEditPlan(entry)}
                        title={t('admin.catalog.table.editPlan')}
                        aria-label={t('admin.catalog.table.editPlan')}
                        className={iconButtonClass}
                      >
                        <ListChecks className="w-4 h-4" />
                      </LockableButton>
                    )}
                    <LockableButton
                      onClick={() => onEdit(entry)}
                      title={t('admin.catalog.table.edit')}
                      aria-label={t('admin.catalog.table.edit')}
                      className={iconButtonClass}
                    >
                      <Pencil className="w-4 h-4" />
                    </LockableButton>
                    <LockableButton
                      onClick={() => onToggleActive(entry)}
                      disabled={pending}
                      title={t(entry.isActive ? 'admin.catalog.table.hide' : 'admin.catalog.table.show')}
                      aria-label={t(entry.isActive ? 'admin.catalog.table.hide' : 'admin.catalog.table.show')}
                      className={iconButtonClass}
                    >
                      {entry.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </LockableButton>
                    <LockableButton
                      onClick={() => onDelete(entry)}
                      lockedReason={deleteLock}
                      title={t('admin.catalog.table.delete')}
                      aria-label={t('admin.catalog.table.delete')}
                      className={iconButtonClass}
                    >
                      <Trash2 className="w-4 h-4" />
                    </LockableButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
