import React from 'react';
import { Plus, Warehouse, Wrench } from 'lucide-react';
import { VehicleStatusBadge } from '../../admin/common/ui';
import { EquipmentListItem } from './EquipmentBits';
import { STOCK_KEY } from './equipmentMeta';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import type { EquipmentDto } from '../../../types/equipment';
import type { Vehicle } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';

interface EquipmentByVehicleProps {
  /** Thiết bị đã lọc + sắp xếp. */
  items: EquipmentDto[];
  /** Xe của trạm (theo biển số). */
  vehicles: Vehicle[];
  /** Đang lọc → ẩn thẻ không có thiết bị khớp; không lọc → hiện cả xe chưa có thiết bị (để thêm). */
  filtering: boolean;
  /** Lọc vị trí đang chọn ('' = mọi vị trí). */
  unitFilter: string;
  now: number;
  onAdd: (unitKey: string) => void;
  onToggleStatus: (e: EquipmentDto) => void;
  onEdit: (e: EquipmentDto) => void;
  onDelete: (e: EquipmentDto) => void;
}

interface Group {
  key: string;
  vehicle: Vehicle | null;
  /** Biển số khi xe không còn trong danh sách xe trạm (VD xe bị ẩn khỏi Live Map). */
  plate: string | null;
  items: EquipmentDto[];
}

/** View Theo xe: mỗi xe (và Kho trạm) là một thẻ — trả lời nhanh "xe này mang theo gì, có gì đang hỏng". */
export const EquipmentByVehicle: React.FC<EquipmentByVehicleProps> = ({
  items,
  vehicles,
  filtering,
  unitFilter,
  now,
  onAdd,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  const byUnit = new Map<string, EquipmentDto[]>();
  for (const e of items) {
    const key = e.rescueUnitId ?? STOCK_KEY;
    byUnit.set(key, [...(byUnit.get(key) ?? []), e]);
  }
  const known = new Set(vehicles.map((v) => v.id));
  const groups: Group[] = [
    ...vehicles.map((v) => ({ key: v.id, vehicle: v, plate: v.plate, items: byUnit.get(v.id) ?? [] })),
    ...[...byUnit.entries()]
      .filter(([key]) => key !== STOCK_KEY && !known.has(key))
      .map(([key, list]) => ({ key, vehicle: null, plate: list[0].rescueUnitPlate, items: list })),
    { key: STOCK_KEY, vehicle: null, plate: null, items: byUnit.get(STOCK_KEY) ?? [] },
  ].filter((g) => (unitFilter ? g.key === unitFilter : !filtering || g.items.length > 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 p-4 items-start">
      {groups.map((g) => {
        const isStock = g.key === STOCK_KEY;
        const TypeIcon = g.vehicle ? VEHICLE_TYPE_META[g.vehicle.type].icon : Warehouse;
        const place = isStock ? t('vehicles.equipment.stock') : g.plate ?? '—';
        const units = g.items.reduce((sum, e) => sum + e.quantity, 0);
        const maintenance = g.items.filter((e) => e.status === 'Maintenance').length;
        return (
          <section key={g.key} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0">
                <TypeIcon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-bold text-slate-900 ${isStock ? '' : 'font-mono-data'}`}>{place}</p>
                  {g.vehicle && (
                    <VehicleStatusBadge
                      label={t(`enums.vehicleStatus.${g.vehicle.status}`)}
                      color={VEHICLE_STATUS_META[g.vehicle.status].color}
                    />
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {g.vehicle
                    ? t(`enums.unitType.${g.vehicle.unitType}`)
                    : isStock
                      ? t('vehicles.equipment.group.stockHint')
                      : null}
                  {g.items.length > 0 && (
                    <>
                      {(g.vehicle || isStock) && ' · '}
                      {t('vehicles.equipment.group.summary', { count: g.items.length, units })}
                    </>
                  )}
                  {maintenance > 0 && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-amber-700">
                      <Wrench className="w-3 h-3" />
                      {t('vehicles.equipment.group.maintenance', { count: maintenance })}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(g.key)}
                aria-label={t('vehicles.equipment.group.addLabel', { place })}
                title={t('vehicles.equipment.group.addLabel', { place })}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('vehicles.equipment.group.add')}
              </button>
            </header>

            {g.items.length === 0 ? (
              <p className="px-4 py-5 text-center text-xs text-slate-400">
                {filtering ? t('vehicles.equipment.group.noMatch') : t('vehicles.equipment.group.empty')}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {g.items.map((e) => (
                  <EquipmentListItem
                    key={e.id}
                    equipment={e}
                    now={now}
                    onToggleStatus={onToggleStatus}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};
