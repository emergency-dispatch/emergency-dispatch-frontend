import React from 'react';
import { CheckCircle2, Pencil, Trash2, TriangleAlert, Warehouse, Wrench } from 'lucide-react';
import { EQUIPMENT_CATEGORY_META, isOnDeletedUnit, sinceText, type EquipmentUnitOption } from './equipmentMeta';
import { formatDateTime } from '../../utils/incidentFormat';
import type { EquipmentCategory, EquipmentDto, EquipmentStatus } from '../../types/equipment';
import { useTranslation } from '../../i18n';

// Mảnh giao diện nhỏ dùng chung: view Bảng / Theo xe (Operator) và trang Thiết bị (Admin).

export const EquipmentStatusBadge: React.FC<{ status: EquipmentStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const maintenance = status === 'Maintenance';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${
        maintenance ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
      }`}
    >
      {maintenance ? <Wrench className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
      {t(`vehicles.equipment.statusLabel.${status}`)}
    </span>
  );
};

export const EquipmentCategoryChip: React.FC<{ category: EquipmentCategory; compact?: boolean }> = ({
  category,
  compact,
}) => {
  const { t } = useTranslation();
  const meta = EQUIPMENT_CATEGORY_META[category];
  const Icon = meta.icon;
  const label = t(`vehicles.equipment.category.${category}`);
  if (compact) {
    return (
      <span title={label} className={`inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${meta.bg} ${meta.text}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${meta.bg} ${meta.border} ${meta.text}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

/** Vị trí đặt: biển số xe (kèm chấm trạng thái xe) hoặc Kho trạm; xe đã bị xóa → cảnh báo đỏ. */
export const EquipmentLocation: React.FC<{ equipment: EquipmentDto; vehicle: EquipmentUnitOption | undefined }> = ({
  equipment,
  vehicle,
}) => {
  const { t } = useTranslation();
  if (!equipment.rescueUnitId) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
        <Warehouse className="w-3.5 h-3.5 text-slate-400" />
        {t('vehicles.equipment.stock')}
      </span>
    );
  }
  if (!vehicle && isOnDeletedUnit(equipment)) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-red-200 bg-red-50 text-[11px] font-bold text-red-700"
        title={t('vehicles.equipment.deletedUnitHint')}
      >
        <TriangleAlert className="w-3 h-3" />
        {t('vehicles.equipment.deletedUnit')}
      </span>
    );
  }
  const TypeIcon = vehicle?.icon ?? null;
  const statusLabel = vehicle ? `${vehicle.typeLabel} · ${vehicle.statusLabel}` : null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" title={statusLabel ?? undefined}>
      {TypeIcon && <TypeIcon className="w-3.5 h-3.5 text-slate-500" />}
      <span className="font-mono-data font-bold text-slate-900">{vehicle?.plate ?? equipment.rescueUnitPlate ?? '—'}</span>
      {vehicle && (
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: vehicle.statusColor }}
        />
      )}
    </span>
  );
};

interface RowActionsProps {
  equipment: EquipmentDto;
  onToggleStatus: (e: EquipmentDto) => void;
  onEdit: (e: EquipmentDto) => void;
  onDelete: (e: EquipmentDto) => void;
  /** View Theo xe: chỉ icon cho gọn. */
  iconOnly?: boolean;
}

export const EquipmentRowActions: React.FC<RowActionsProps> = ({ equipment, onToggleStatus, onEdit, onDelete, iconOnly }) => {
  const { t } = useTranslation();
  const toMaintenance = equipment.status === 'Available';
  const statusText = toMaintenance
    ? t('vehicles.equipment.actions.setMaintenance')
    : t('vehicles.equipment.actions.setAvailable');
  const iconBtn =
    'inline-flex items-center justify-center w-7 h-7 rounded-lg border border-transparent text-slate-400 transition-colors';
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onToggleStatus(equipment)}
        title={statusText}
        aria-label={`${statusText}: ${equipment.name}`}
        className={
          iconOnly
            ? `${iconBtn} ${toMaintenance ? 'hover:text-amber-700 hover:bg-amber-50' : 'hover:text-emerald-700 hover:bg-emerald-50'}`
            : `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-colors ${
                toMaintenance
                  ? 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`
        }
      >
        {toMaintenance ? <Wrench className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        {!iconOnly && statusText}
      </button>
      <button
        type="button"
        onClick={() => onEdit(equipment)}
        title={t('vehicles.equipment.actions.edit')}
        aria-label={t('vehicles.equipment.actions.editLabel', { name: equipment.name })}
        className={`${iconBtn} hover:text-slate-900 hover:bg-slate-100`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(equipment)}
        title={t('vehicles.equipment.actions.deleteLabel', { name: equipment.name })}
        aria-label={t('vehicles.equipment.actions.deleteLabel', { name: equipment.name })}
        className={`${iconBtn} hover:text-red-600 hover:bg-red-50`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/** Một dòng thiết bị gọn (thẻ xe ở view Theo xe, popup thiết bị của xe ở tab Xe). */
export const EquipmentListItem: React.FC<Omit<RowActionsProps, 'iconOnly'> & { now: number }> = ({
  equipment: e,
  now,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const isMaintenance = e.status === 'Maintenance';
  return (
    <li
      className={`flex items-start gap-3 px-4 py-2.5 ${
        isMaintenance ? 'bg-amber-50/40 shadow-[inset_3px_0_0_theme(colors.amber.400)]' : ''
      }`}
    >
      <EquipmentCategoryChip category={e.category} compact />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-900 break-words">
          <span className="font-semibold">{e.name}</span>
          <span className="ml-1.5 font-mono-data font-bold text-slate-500 tabular-nums">×{e.quantity}</span>
        </p>
        {isMaintenance ? (
          <p className="text-[11px] text-amber-800 break-words">
            <Wrench className="inline w-3 h-3 -mt-0.5 mr-1" />
            {e.statusNote ?? t('vehicles.equipment.statusLabel.Maintenance')}
            {e.statusChangedAt && (
              <span className="text-slate-400 font-mono-data" title={formatDateTime(e.statusChangedAt)}>
                {' · '}
                {sinceText(e.statusChangedAt, now)}
              </span>
            )}
          </p>
        ) : (
          e.notes && (
            <p className="text-[11px] text-slate-500 truncate" title={e.notes}>
              {e.notes}
            </p>
          )
        )}
      </div>
      <EquipmentRowActions equipment={e} iconOnly onToggleStatus={onToggleStatus} onEdit={onEdit} onDelete={onDelete} />
    </li>
  );
};
