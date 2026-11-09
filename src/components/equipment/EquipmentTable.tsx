import React from 'react';
import { thClass } from '../admin/common/styles';
import { EquipmentCategoryChip, EquipmentLocation, EquipmentRowActions, EquipmentStatusBadge } from './EquipmentBits';
import { sinceText, type EquipmentUnitOption } from './equipmentMeta';
import { formatDateTime } from '../../utils/incidentFormat';
import type { EquipmentDto } from '../../types/equipment';
import { useTranslation } from '../../i18n';

interface EquipmentTableProps {
  items: EquipmentDto[];
  unitById: Map<string, EquipmentUnitOption>;
  now: number;
  /** Admin: thêm cột Trạm (nhiều trạm trong một bảng). */
  renderStation?: (e: EquipmentDto) => React.ReactNode;
  onToggleStatus: (e: EquipmentDto) => void;
  onEdit: (e: EquipmentDto) => void;
  onDelete: (e: EquipmentDto) => void;
}

/** View Bảng: mỗi dòng một thiết bị; dòng Bảo trì có vạch amber bên trái. */
export const EquipmentTable: React.FC<EquipmentTableProps> = ({
  items,
  unitById,
  now,
  renderStation,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <table className={`w-full text-sm ${renderStation ? 'min-w-[1080px]' : 'min-w-[900px]'}`}>
      <thead className="bg-slate-50 sticky top-0 z-10">
        <tr className="text-left">
          <th className={thClass}>{t('vehicles.equipment.columns.name')}</th>
          {renderStation && <th className={thClass}>{t('vehicles.equipment.columns.station')}</th>}
          <th className={thClass}>{t('vehicles.equipment.columns.category')}</th>
          <th className={`${thClass} text-right`}>{t('vehicles.equipment.columns.quantity')}</th>
          <th className={thClass}>{t('vehicles.equipment.columns.location')}</th>
          <th className={thClass}>{t('vehicles.equipment.columns.status')}</th>
          <th className={thClass}>{t('vehicles.equipment.columns.statusNote')}</th>
          <th className={`${thClass} text-right`}>{t('vehicles.equipment.columns.actions')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((e) => {
          const maintenance = e.status === 'Maintenance';
          return (
            <tr key={e.id} className={maintenance ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/60'}>
              <td className={`px-4 py-3 max-w-[280px] ${maintenance ? 'shadow-[inset_3px_0_0_theme(colors.amber.400)]' : ''}`}>
                <p className="font-semibold text-slate-900 break-words">{e.name}</p>
                {e.notes && (
                  <p className="text-[11px] text-slate-500 truncate" title={e.notes}>
                    {e.notes}
                  </p>
                )}
              </td>
              {renderStation && <td className="px-4 py-3">{renderStation(e)}</td>}
              <td className="px-4 py-3">
                <EquipmentCategoryChip category={e.category} />
              </td>
              <td className="px-4 py-3 text-right font-mono-data font-bold text-slate-900 tabular-nums">×{e.quantity}</td>
              <td className="px-4 py-3">
                <EquipmentLocation equipment={e} vehicle={e.rescueUnitId ? unitById.get(e.rescueUnitId) : undefined} />
              </td>
              <td className="px-4 py-3">
                <EquipmentStatusBadge status={e.status} />
              </td>
              <td className="px-4 py-3 max-w-[260px]">
                {maintenance && e.statusNote ? (
                  <div className="min-w-0">
                    <p className="text-xs text-amber-800 line-clamp-2 break-words" title={e.statusNote}>
                      {e.statusNote}
                    </p>
                    {e.statusChangedAt && (
                      <p className="text-[11px] text-slate-400 font-mono-data" title={formatDateTime(e.statusChangedAt)}>
                        {sinceText(e.statusChangedAt, now)}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <EquipmentRowActions equipment={e} onToggleStatus={onToggleStatus} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
