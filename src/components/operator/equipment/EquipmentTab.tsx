import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, LayoutGrid, Loader2, Package, RefreshCw, Rows3, Search, X } from 'lucide-react';
import { Notice, type NoticeState } from '../../admin/common/ui';
import { inputClass } from '../../admin/common/styles';
import { FleetHeader, type FleetStat } from '../vehicles/FleetHeader';
import { EquipmentTable } from '../../equipment/EquipmentTable';
import { EquipmentByVehicle } from './EquipmentByVehicle';
import { EquipmentFormDrawer } from '../../equipment/EquipmentFormDrawer';
import { EquipmentStatusDialog } from '../../equipment/EquipmentStatusDialog';
import { EquipmentDeleteDialog } from '../../equipment/EquipmentDeleteDialog';
import {
  EQUIPMENT_CATEGORY_META,
  STOCK_KEY,
  compareEquipment,
  matchesEquipment,
  type EquipmentFilters,
} from '../../equipment/equipmentMeta';
import type { EquipmentListState } from '../../equipment/useEquipmentList';
import { vehicleToUnitOption } from './unitOption';
import { useNow } from '../../../hooks/useNow';
import { normalizeText } from '../../../services/admin/listUtils';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
  type EquipmentCategory,
  type EquipmentDto,
  type EquipmentStatus,
} from '../../../types/equipment';
import type { Vehicle } from '../../../types/vehicle';
import { dateLocale, useTranslation } from '../../../i18n';

type EquipmentView = 'table' | 'vehicle';

interface EquipmentTabProps {
  title: string;
  tabs: React.ReactNode;
  stationId: string;
  /** Xe của trạm, sắp theo biển số. */
  vehicles: Vehicle[];
  equipment: EquipmentListState;
}

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | '' =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : '';

/**
 * Tab "Thiết bị" của trang Đội xe (§25). Bộ lọc nhóm / trạng thái / vị trí / kiểu xem nằm trên URL
 * (`?tab=equipment&unit=…&view=vehicle`) để cột "Thiết bị" ở tab Xe dẫn thẳng tới đúng xe.
 */
export const EquipmentTab: React.FC<EquipmentTabProps> = ({ title, tabs, stationId, vehicles, equipment }) => {
  const { t } = useTranslation();
  const now = useNow(60_000);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  /** undefined = đóng · null = thêm mới · dto = sửa. */
  const [editing, setEditing] = useState<EquipmentDto | null | undefined>(undefined);
  const [addDefaults, setAddDefaults] = useState<{ category: EquipmentCategory | ''; unit: string }>({ category: '', unit: '' });
  const [statusTarget, setStatusTarget] = useState<EquipmentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentDto | null>(null);

  const { items, loading, error, loadedAt, reload, upsert, removeLocal } = equipment;
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  // Tính mỗi lần render (danh sách nhỏ) để nhãn loại / trạng thái xe theo kịp khi đổi ngôn ngữ.
  const unitOptions = vehicles.map(vehicleToUnitOption);
  const unitById = new Map(unitOptions.map((u) => [u.id, u]));

  const unitParam = params.get('unit') ?? '';
  const filters: EquipmentFilters = {
    category: oneOf(params.get('category'), EQUIPMENT_CATEGORIES),
    status: oneOf(params.get('status'), EQUIPMENT_STATUSES),
    // Xe không còn trong trạm / không có thiết bị nào → bỏ lọc thay vì hiện danh sách rỗng khó hiểu.
    unit:
      unitParam === STOCK_KEY || vehicleById.has(unitParam) || items.some((e) => e.rescueUnitId === unitParam)
        ? unitParam
        : '',
    query: normalizeText(search.trim()),
  };
  const view: EquipmentView = params.get('view') === 'vehicle' ? 'vehicle' : 'table';
  const filtering = !!(filters.category || filters.status || filters.unit || filters.query);

  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );
  const toggleParam = (key: keyof EquipmentFilters, value: string) =>
    setParam(key, filters[key] === value ? '' : value);
  const clearFilters = () => {
    setSearch('');
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        ['category', 'status', 'unit'].forEach((k) => next.delete(k));
        return next;
      },
      { replace: true }
    );
  };

  // Danh sách một trạm nhỏ → lọc thẳng mỗi lần render.
  const visible = items.filter((e) => matchesEquipment(e, filters)).sort(compareEquipment);
  const countBy = (skip: keyof EquipmentFilters, pred: (e: EquipmentDto) => boolean) =>
    items.filter((e) => matchesEquipment(e, filters, skip) && pred(e)).length;

  const totalUnits = items.reduce((sum, e) => sum + e.quantity, 0);
  const stats: FleetStat[] = [
    {
      key: 'items',
      label: t('vehicles.equipment.stats.items'),
      value: items.length,
      sub: t('vehicles.equipment.stats.units', { count: totalUnits }),
      onClick: clearFilters,
      active: false,
    },
    {
      key: 'available',
      label: t('vehicles.equipment.stats.available'),
      value: items.filter((e) => e.status === 'Available').length,
      onClick: () => toggleParam('status', 'Available'),
      active: filters.status === 'Available',
    },
    {
      key: 'maintenance',
      label: t('vehicles.equipment.stats.maintenance'),
      value: items.filter((e) => e.status === 'Maintenance').length,
      warn: true,
      onClick: () => toggleParam('status', 'Maintenance'),
      active: filters.status === 'Maintenance',
    },
    {
      key: 'stock',
      label: t('vehicles.equipment.stats.stock'),
      value: items.filter((e) => !e.rescueUnitId).length,
      onClick: () => toggleParam('unit', STOCK_KEY),
      active: filters.unit === STOCK_KEY,
    },
  ];

  const openCreate = (unit = filters.unit) => {
    setAddDefaults({ category: filters.category, unit });
    setEditing(null);
  };

  const handleGone = () => {
    setEditing(undefined);
    setStatusTarget(null);
    setDeleteTarget(null);
    setNotice({ kind: 'error', message: t('vehicles.equipment.notices.gone') });
    reload();
  };

  const segmented = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
    }`;

  const locationLabel = (e: EquipmentDto) =>
    e.rescueUnitId ? vehicleById.get(e.rescueUnitId)?.plate ?? e.rescueUnitPlate ?? '—' : t('vehicles.equipment.stock');

  return (
    <div className="h-full flex flex-col gap-4 p-4 lg:p-6 min-h-0">
      <FleetHeader
        kicker={t('vehicles.equipment.kicker')}
        title={title}
        description={t('vehicles.equipment.description')}
        tabs={tabs}
        addLabel={t('vehicles.equipment.add')}
        onAdd={() => openCreate()}
        stats={stats}
      />

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <section className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="shrink-0 p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('vehicles.equipment.filters.search')}
                aria-label={t('vehicles.equipment.filters.search')}
                className={`${inputClass} pl-9`}
              />
            </div>

            <div role="group" aria-label={t('vehicles.equipment.filters.statusLabel')} className="inline-flex p-1 rounded-lg bg-slate-100">
              {(['', ...EQUIPMENT_STATUSES] as const).map((key) => (
                <button
                  key={key || 'all'}
                  type="button"
                  aria-pressed={filters.status === key}
                  onClick={() => setParam('status', key)}
                  className={segmented(filters.status === key)}
                >
                  {key ? t(`vehicles.equipment.statusLabel.${key as EquipmentStatus}`) : t('vehicles.equipment.filters.all')}
                  <span className="opacity-60 tabular-nums">
                    {countBy('status', (e) => !key || e.status === key)}
                  </span>
                </button>
              ))}
            </div>

            <select
              value={filters.unit}
              onChange={(e) => setParam('unit', e.target.value)}
              aria-label={t('vehicles.equipment.filters.unitLabel')}
              className={`${inputClass} w-auto py-2`}
            >
              <option value="">{t('vehicles.equipment.filters.allUnits')}</option>
              <option value={STOCK_KEY}>{t('vehicles.equipment.stock')}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate}
                </option>
              ))}
            </select>

            {filtering && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
                {t('vehicles.equipment.filters.clear')}
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden md:inline text-[11px] font-mono-data text-slate-400">
                {loadedAt &&
                  t('vehicles.equipment.updatedAt', {
                    time: new Date(loadedAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }),
                  })}
              </span>
              <button
                type="button"
                onClick={reload}
                disabled={loading}
                title={t('vehicles.equipment.refresh')}
                aria-label={t('vehicles.equipment.refresh')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div role="group" aria-label={t('vehicles.equipment.view.label')} className="inline-flex p-1 rounded-lg bg-slate-100">
                <button
                  type="button"
                  aria-pressed={view === 'table'}
                  onClick={() => setParam('view', '')}
                  className={segmented(view === 'table')}
                >
                  <Rows3 className="w-3.5 h-3.5" />
                  {t('vehicles.equipment.view.table')}
                </button>
                <button
                  type="button"
                  aria-pressed={view === 'vehicle'}
                  onClick={() => setParam('view', 'vehicle')}
                  className={segmented(view === 'vehicle')}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  {t('vehicles.equipment.view.byVehicle')}
                </button>
              </div>
            </div>
          </div>

          {/* Nhóm thiết bị — số trên chip đếm theo các bộ lọc còn lại */}
          <div role="group" aria-label={t('vehicles.equipment.filters.categoryLabel')} className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={!filters.category}
              onClick={() => setParam('category', '')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                !filters.category ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {t('vehicles.equipment.filters.all')} <span className="opacity-70">({countBy('category', () => true)})</span>
            </button>
            {EQUIPMENT_CATEGORIES.map((key) => {
              const meta = EQUIPMENT_CATEGORY_META[key];
              const Icon = meta.icon;
              const active = filters.category === key;
              const count = countBy('category', (e) => e.category === key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleParam('category', key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    active
                      ? `${meta.activeBg} border-transparent text-white`
                      : `bg-white border-slate-200 hover:border-slate-300 ${count ? 'text-slate-700' : 'text-slate-400'}`
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? '' : meta.text}`} />
                  {t(`vehicles.equipment.category.${key}`)}
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="shrink-0 mx-4 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={reload} className="font-semibold underline underline-offset-2">
              {t('vehicles.equipment.refresh')}
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto">
          {loading && !loadedAt ? (
            <div className="p-10 flex flex-col items-center gap-2 text-slate-300">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm text-slate-500">{t('vehicles.equipment.loading')}</p>
            </div>
          ) : items.length === 0 && !error ? (
            <div className="p-10 text-center space-y-3">
              <Package className="w-9 h-9 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500">{t('vehicles.equipment.empty')}</p>
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-bold hover:bg-red-50"
              >
                {t('vehicles.equipment.emptyAction')}
              </button>
            </div>
          ) : view === 'vehicle' ? (
            <EquipmentByVehicle
              items={visible}
              vehicles={vehicles}
              filtering={filtering}
              unitFilter={filters.unit}
              now={now}
              onAdd={(unit) => openCreate(unit)}
              onToggleStatus={setStatusTarget}
              onEdit={setEditing}
              onDelete={setDeleteTarget}
            />
          ) : visible.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm text-slate-500">{t('vehicles.equipment.noMatch')}</p>
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-red-600 hover:underline">
                {t('vehicles.equipment.filters.clear')}
              </button>
            </div>
          ) : (
            <EquipmentTable
              items={visible}
              unitById={unitById}
              now={now}
              onToggleStatus={setStatusTarget}
              onEdit={setEditing}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      </section>

      {editing !== undefined && (
        <EquipmentFormDrawer
          equipment={editing}
          stationId={stationId}
          vehicles={unitOptions}
          defaults={addDefaults}
          onClose={() => setEditing(undefined)}
          onSaved={(saved, created, keepOpen) => {
            upsert(saved);
            if (keepOpen) return;
            setEditing(undefined);
            setNotice({
              kind: 'success',
              message: created
                ? t('vehicles.equipment.notices.created', { name: saved.name })
                : t('vehicles.equipment.notices.updated', { name: saved.name }),
            });
          }}
          onGone={handleGone}
        />
      )}

      {statusTarget && (
        <EquipmentStatusDialog
          equipment={statusTarget}
          onCancel={() => setStatusTarget(null)}
          onDone={(updated) => {
            upsert(updated);
            setStatusTarget(null);
            setNotice({
              kind: 'success',
              message:
                updated.status === 'Maintenance'
                  ? t('vehicles.equipment.notices.maintenance', { name: updated.name })
                  : t('vehicles.equipment.notices.available', { name: updated.name }),
            });
          }}
          onGone={handleGone}
        />
      )}

      {deleteTarget && (
        <EquipmentDeleteDialog
          equipment={deleteTarget}
          locationLabel={locationLabel(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={(deleted) => {
            removeLocal(deleted.id);
            setDeleteTarget(null);
            setNotice({ kind: 'success', message: t('vehicles.equipment.notices.deleted', { name: deleted.name }) });
          }}
          onGone={handleGone}
        />
      )}
    </div>
  );
};
