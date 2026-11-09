import React, { useMemo } from 'react';
import { Wrench } from 'lucide-react';
import { thClass } from '../common/styles';
import { EQUIPMENT_CATEGORY_META, type EquipmentStationOption } from '../../equipment/equipmentMeta';
import { EQUIPMENT_CATEGORIES, type EquipmentCategory, type EquipmentDto } from '../../../types/equipment';
import { useTranslation } from '../../../i18n';

interface Cell {
  items: number;
  units: number;
  maintenance: number;
}

const emptyCell = (): Cell => ({ items: 0, units: 0, maintenance: 0 });

const add = (cell: Cell, e: EquipmentDto) => {
  cell.items += 1;
  cell.units += e.quantity;
  if (e.status === 'Maintenance') cell.maintenance += 1;
};

interface EquipmentStationMatrixProps {
  /** Hàng của ma trận (đã lọc theo trạm nếu có) — trạm chưa có thiết bị vẫn hiện để thấy chỗ thiếu. */
  stations: EquipmentStationOption[];
  /** Thiết bị đã qua các bộ lọc khác (trừ nhóm — nhóm là cột). */
  items: EquipmentDto[];
  activeCategory: EquipmentCategory | '';
  /** Bấm ô → mở view Bảng lọc theo trạm + nhóm ('' = mọi nhóm). */
  onPick: (stationId: string, category: EquipmentCategory | '') => void;
}

/** View "Theo trạm" của Admin: trạm × nhóm thiết bị, số lớn = tổng số lượng, số nhỏ = số mục, amber = đang bảo trì. */
export const EquipmentStationMatrix: React.FC<EquipmentStationMatrixProps> = ({ stations, items, activeCategory, onPick }) => {
  const { t } = useTranslation();

  const { rows, totals } = useMemo(() => {
    const byStation = new Map<string, { cells: Record<EquipmentCategory, Cell>; total: Cell }>();
    const ensure = (id: string) => {
      let row = byStation.get(id);
      if (!row) {
        row = {
          cells: Object.fromEntries(EQUIPMENT_CATEGORIES.map((c) => [c, emptyCell()])) as Record<EquipmentCategory, Cell>,
          total: emptyCell(),
        };
        byStation.set(id, row);
      }
      return row;
    };
    const colTotals = Object.fromEntries(EQUIPMENT_CATEGORIES.map((c) => [c, emptyCell()])) as Record<EquipmentCategory, Cell>;
    const grand = emptyCell();
    for (const e of items) {
      const row = ensure(e.stationId);
      add(row.cells[e.category], e);
      add(row.total, e);
      add(colTotals[e.category], e);
      add(grand, e);
    }
    // Thiết bị của trạm không có trong danh sách (hiếm — VD danh sách trạm tải lỗi) vẫn có hàng riêng.
    const known = new Set(stations.map((s) => s.id));
    const extra: EquipmentStationOption[] = [...byStation.keys()]
      .filter((id) => !known.has(id))
      .map((id) => ({ id, code: null, name: items.find((e) => e.stationId === id)?.stationName ?? '—' }));
    return {
      rows: [...stations, ...extra].map((s) => ({ station: s, ...ensure(s.id) })),
      totals: { cells: colTotals, total: grand },
    };
  }, [stations, items]);

  const renderCell = (cell: Cell, onClick: (() => void) | null, emphasize: boolean, label: string) => {
    if (cell.items === 0) {
      return <span className="text-slate-300 font-mono-data">—</span>;
    }
    const content = (
      <>
        <span className="block text-base font-black font-mono-data tabular-nums text-slate-900">{cell.units}</span>
        <span className="block text-[10px] text-slate-500">{t('admin.equipment.matrix.items', { count: cell.items })}</span>
        {cell.maintenance > 0 && (
          <span className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 rounded border border-amber-300 bg-amber-50 text-[10px] font-bold font-mono-data text-amber-700">
            <Wrench className="w-2.5 h-2.5" />
            {cell.maintenance}
          </span>
        )}
      </>
    );
    if (!onClick) return <div className="text-center">{content}</div>;
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`w-full rounded-lg px-2 py-1.5 text-center transition-colors hover:bg-red-50 hover:ring-1 hover:ring-red-200 ${
          emphasize ? 'bg-slate-100/70' : ''
        }`}
      >
        {content}
      </button>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 text-[11px] text-slate-500">
        <span>
          <span className="font-mono-data font-black text-slate-900">12</span> {t('admin.equipment.matrix.legendUnits')}
        </span>
        <span>{t('admin.equipment.matrix.legendItems')}</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex items-center gap-0.5 px-1.5 rounded border border-amber-300 bg-amber-50 font-bold font-mono-data text-amber-700">
            <Wrench className="w-2.5 h-2.5" />2
          </span>
          {t('admin.equipment.matrix.legendMaintenance')}
        </span>
        <span className="sm:ml-auto">{t('admin.equipment.matrix.hint')}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className={`${thClass} sticky left-0 bg-slate-50 z-10`}>{t('admin.equipment.matrix.station')}</th>
              {EQUIPMENT_CATEGORIES.map((c) => {
                const meta = EQUIPMENT_CATEGORY_META[c];
                const Icon = meta.icon;
                return (
                  <th
                    key={c}
                    className={`${thClass} text-center ${activeCategory === c ? `${meta.bg} ${meta.text}` : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Icon className={`w-3.5 h-3.5 ${meta.text}`} />
                      {t(`vehicles.equipment.category.${c}`)}
                    </span>
                  </th>
                );
              })}
              <th className={`${thClass} text-center border-l border-slate-200`}>{t('admin.equipment.matrix.total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={EQUIPMENT_CATEGORIES.length + 2} className="px-4 py-10 text-center text-sm text-slate-500">
                  {t('admin.equipment.matrix.noStations')}
                </td>
              </tr>
            )}
            {rows.map(({ station, cells, total }) => {
              const empty = total.items === 0;
              return (
                <tr key={station.id} className={empty ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}>
                  <td
                    className={`px-4 py-2.5 sticky left-0 bg-white z-[1] min-w-[200px] ${
                      empty ? 'shadow-[inset_3px_0_0_theme(colors.red.300)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {station.code && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-bold font-mono-data text-slate-700">
                          {station.code}
                        </span>
                      )}
                      <span className="font-semibold text-slate-900 truncate" title={station.name}>
                        {station.name}
                      </span>
                    </div>
                    {empty && (
                      <p className="mt-0.5 text-[11px] font-semibold text-red-600">{t('admin.equipment.matrix.stationEmpty')}</p>
                    )}
                  </td>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <td key={c} className="px-1.5 py-1 text-center align-middle">
                      {renderCell(
                        cells[c],
                        () => onPick(station.id, c),
                        activeCategory === c,
                        t('admin.equipment.matrix.cellLabel', {
                          station: station.name,
                          category: t(`vehicles.equipment.category.${c}`),
                        })
                      )}
                    </td>
                  ))}
                  <td className="px-1.5 py-1 text-center align-middle border-l border-slate-100">
                    {renderCell(
                      total,
                      () => onPick(station.id, ''),
                      false,
                      t('admin.equipment.matrix.rowLabel', { station: station.name })
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="px-4 py-2.5 sticky left-0 bg-slate-50 z-[1] text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('admin.equipment.matrix.allStations')}
                </td>
                {EQUIPMENT_CATEGORIES.map((c) => (
                  <td key={c} className="px-1.5 py-1 text-center align-middle">
                    {renderCell(totals.cells[c], null, activeCategory === c, '')}
                  </td>
                ))}
                <td className="px-1.5 py-1 text-center align-middle border-l border-slate-200">
                  {renderCell(totals.total, null, false, '')}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
