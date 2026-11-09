import React, { useMemo, useState } from 'react';
import {
  LayoutGrid,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  TriangleAlert,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { EquipmentStationMatrix } from '../../components/admin/equipment/EquipmentStationMatrix';
import { EquipmentHistory } from '../../components/admin/equipment/EquipmentHistory';
import {
  EQUIPMENT_VIEWS,
  LOCATION_FILTERS,
  matchesLocation,
  rescueUnitToOption,
  type EquipmentView,
  type LocationFilter,
} from '../../components/admin/equipment/adminEquipmentMeta';
import { EquipmentTable } from '../../components/equipment/EquipmentTable';
import { EquipmentFormDrawer } from '../../components/equipment/EquipmentFormDrawer';
import { EquipmentStatusDialog } from '../../components/equipment/EquipmentStatusDialog';
import { EquipmentDeleteDialog } from '../../components/equipment/EquipmentDeleteDialog';
import { useEquipmentList } from '../../components/equipment/useEquipmentList';
import {
  EQUIPMENT_CATEGORY_META,
  STOCK_KEY,
  compareEquipment,
  isOnDeletedUnit,
  matchesEquipment,
  stationOptionLabel,
  type EquipmentFilters,
  type EquipmentStationOption,
} from '../../components/equipment/equipmentMeta';
import { useNow } from '../../hooks/useNow';
import { stationAdminService } from '../../services/admin/stationAdminService';
import { vehicleAdminService } from '../../services/admin/vehicleAdminService';
import { normalizeText, paginate } from '../../services/admin/listUtils';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
  type EquipmentCategory,
  type EquipmentDto,
  type EquipmentStatus,
} from '../../types/equipment';
import { dateLocale, useTranslation } from '../../i18n';

const PAGE_SIZE = 15;

/** Thẻ số liệu bấm được — bấm để bật / tắt bộ lọc tương ứng. */
const StatButton: React.FC<{
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  tone?: 'default' | 'amber' | 'red';
  active?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, value, hint, tone = 'default', active, onClick }) => {
  const toneClass =
    tone === 'amber' && value > 0
      ? 'text-amber-700'
      : tone === 'red' && value > 0
        ? 'text-red-600'
        : 'text-slate-900';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-left rounded-xl border bg-white px-4 py-3 shadow-xs transition-all ${
        active ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 hover:border-red-300 hover:shadow-sm'
      }`}
    >
      <span className="flex items-center gap-1.5 text-[10px] font-mono-data uppercase tracking-wider text-slate-500">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className={`block text-2xl font-black font-mono-data mt-0.5 ${toneClass}`}>{value}</span>
      <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{hint}</span>
    </button>
  );
};

/**
 * Thiết bị cứu hộ của mọi trạm (§25). Tải nguyên danh sách rồi lọc / phân trang phía client.
 * Hai kiểu xem: Bảng (thao tác từng thiết bị) và Theo trạm (ma trận trạm × nhóm để so sánh phân bổ).
 */
const EquipmentPage: React.FC = () => {
  const { t } = useTranslation();
  const now = useNow(60_000);
  const initial = useInitialQueryParams();
  const [search, setSearch] = useState(() => initial.text('search'));
  const [stationId, setStationId] = useState(() => initial.text('stationId'));
  const [status, setStatus] = useState<EquipmentStatus | ''>(() => initial.oneOf('status', EQUIPMENT_STATUSES));
  const [category, setCategory] = useState<EquipmentCategory | ''>(() => initial.oneOf('category', EQUIPMENT_CATEGORIES));
  const [location, setLocation] = useState<LocationFilter | ''>(() => initial.oneOf('location', LOCATION_FILTERS));
  const [view, setView] = useState<EquipmentView>(() => initial.oneOf('view', EQUIPMENT_VIEWS) || 'table');
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [notice, setNotice] = useState<NoticeState>(null);
  /** undefined = đóng · null = thêm mới · dto = sửa. */
  const [editing, setEditing] = useState<EquipmentDto | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = useState<EquipmentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentDto | null>(null);

  const equipment = useEquipmentList('all');
  const { items, loading, error, loadedAt, upsert, removeLocal } = equipment;
  const stationsQuery = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'equipment-stations');
  const unitsQuery = useServiceQuery(() => vehicleAdminService.listAll(), 'equipment-units');

  const stations = useMemo<EquipmentStationOption[]>(
    () =>
      (stationsQuery.data?.items ?? [])
        .map((s) => ({ id: s.id, code: s.code ?? null, name: s.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [stationsQuery.data]
  );
  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  // Tính mỗi lần render (vài chục xe) để nhãn loại / trạng thái xe theo kịp khi đổi ngôn ngữ.
  const unitOptions = (unitsQuery.data ?? []).map(rescueUnitToOption);
  const unitById = new Map(unitOptions.map((u) => [u.id, u]));

  const stationName = (e: EquipmentDto) => stationById.get(e.stationId)?.name ?? e.stationName ?? '—';
  const stationLabel = (id: string) => {
    const s = stationById.get(id);
    return s ? stationOptionLabel(s) : (items.find((e) => e.stationId === id)?.stationName ?? id.slice(0, 8));
  };
  const unitLabel = (id: string) => unitById.get(id)?.plate ?? t('vehicles.equipment.deletedUnit');

  const withPageReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPageIndex(1);
    };

  // ---------- Lọc ----------
  const filters: EquipmentFilters = {
    category,
    status,
    unit: '',
    query: normalizeText(debouncedSearch.trim()),
    station: stationId,
  };
  const pass = (e: EquipmentDto, skip?: keyof EquipmentFilters) =>
    matchesEquipment(e, filters, skip) && matchesLocation(e, location);
  const sortRows = (a: EquipmentDto, b: EquipmentDto) =>
    stationName(a).localeCompare(stationName(b), 'vi') || compareEquipment(a, b);
  const visible = items.filter((e) => pass(e)).sort(sortRows);
  const page = paginate(visible, { pageIndex, pageSize: PAGE_SIZE });
  const countBy = (pred: (e: EquipmentDto) => boolean) => items.filter((e) => pass(e, 'category') && pred(e)).length;
  const hasFilter = !!(search || stationId || status || category || location);

  const clearFilters = () => {
    setSearch('');
    setStationId('');
    setStatus('');
    setCategory('');
    setLocation('');
    setPageIndex(1);
  };

  // ---------- Số liệu (theo trạm đang lọc) ----------
  const scope = stationId ? items.filter((e) => e.stationId === stationId) : items;
  const stats = {
    items: scope.length,
    units: scope.reduce((sum, e) => sum + e.quantity, 0),
    stationsWith: new Set(scope.map((e) => e.stationId)).size,
    maintenance: scope.filter((e) => e.status === 'Maintenance').length,
    stock: scope.filter((e) => !e.rescueUnitId).length,
    deletedUnit: scope.filter(isOnDeletedUnit).length,
  };
  const toggleLocation = (value: LocationFilter) => withPageReset(setLocation)(location === value ? '' : value);

  // ---------- Theo trạm ----------
  const matrixStations = stationId ? stations.filter((s) => s.id === stationId) : stations;
  const matrixItems = items.filter((e) => pass(e, 'category'));
  const pickCell = (station: string, cat: EquipmentCategory | '') => {
    setStationId(station);
    setCategory(cat);
    setPageIndex(1);
    setView('table');
  };

  const handleGone = () => {
    setEditing(undefined);
    setStatusTarget(null);
    setDeleteTarget(null);
    setNotice({ kind: 'error', message: t('vehicles.equipment.notices.gone') });
    equipment.reload();
  };

  const refresh = () => {
    equipment.reload();
    stationsQuery.reload();
    unitsQuery.reload();
  };

  const referencesError = stationsQuery.error || unitsQuery.error;
  const firstLoad = loading && !loadedAt;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Số liệu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatButton
          icon={Package}
          label={t('admin.equipment.stats.items')}
          value={stats.items}
          hint={t('admin.equipment.stats.itemsHint', {
            units: stats.units,
            stations: stats.stationsWith,
            total: stationId ? 1 : stations.length,
          })}
          active={false}
          onClick={clearFilters}
        />
        <StatButton
          icon={Wrench}
          label={t('admin.equipment.stats.maintenance')}
          value={stats.maintenance}
          hint={t('admin.equipment.stats.maintenanceHint')}
          tone="amber"
          active={status === 'Maintenance'}
          onClick={() => withPageReset(setStatus)(status === 'Maintenance' ? '' : 'Maintenance')}
        />
        <StatButton
          icon={Warehouse}
          label={t('admin.equipment.stats.stock')}
          value={stats.stock}
          hint={t('admin.equipment.stats.stockHint')}
          active={location === STOCK_KEY}
          onClick={() => toggleLocation(STOCK_KEY)}
        />
        <StatButton
          icon={TriangleAlert}
          label={t('admin.equipment.stats.attention')}
          value={stats.deletedUnit}
          hint={stats.deletedUnit ? t('admin.equipment.stats.attentionHint') : t('admin.equipment.stats.attentionNone')}
          tone="red"
          active={location === 'deletedUnit'}
          onClick={() => toggleLocation('deletedUnit')}
        />
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => withPageReset(setSearch)(e.target.value)}
            placeholder={t('admin.equipment.searchPlaceholder')}
            aria-label={t('admin.equipment.searchPlaceholder')}
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:flex">
          <select
            value={stationId}
            onChange={(e) => withPageReset(setStationId)(e.target.value)}
            aria-label={t('admin.equipment.filterByStation')}
            className={`${inputClass} lg:w-56`}
          >
            <option value="">{t('admin.equipment.allStations')}</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {stationOptionLabel(s)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => withPageReset(setStatus)(e.target.value as EquipmentStatus | '')}
            aria-label={t('admin.common.filterByStatus')}
            className={`${inputClass} lg:w-40`}
          >
            <option value="">{t('admin.common.allStatuses')}</option>
            {EQUIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`vehicles.equipment.statusLabel.${s}`)}
              </option>
            ))}
          </select>
          <select
            value={location}
            onChange={(e) => withPageReset(setLocation)(e.target.value as LocationFilter | '')}
            aria-label={t('admin.equipment.location.label')}
            className={`${inputClass} lg:w-44`}
          >
            <option value="">{t('admin.equipment.location.all')}</option>
            {LOCATION_FILTERS.map((l) => (
              <option key={l} value={l}>
                {t(`admin.equipment.location.${l}`)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="lg:ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {t('admin.equipment.add')}
        </button>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
        {/* Nhóm thiết bị — số trên chip đếm theo các bộ lọc còn lại */}
        <div role="group" aria-label={t('vehicles.equipment.filters.categoryLabel')} className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => withPageReset(setCategory)('')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              !category ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {t('vehicles.equipment.filters.all')} <span className="opacity-70">({countBy(() => true)})</span>
          </button>
          {EQUIPMENT_CATEGORIES.map((key) => {
            const meta = EQUIPMENT_CATEGORY_META[key];
            const Icon = meta.icon;
            const active = category === key;
            const count = countBy((e) => e.category === key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => withPageReset(setCategory)(active ? '' : key)}
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

        <div className="xl:ml-auto flex items-center gap-2">
          {hasFilter && (
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-red-600 hover:underline">
              {t('vehicles.equipment.filters.clear')}
            </button>
          )}
          {loadedAt && (
            <span className="text-[11px] text-slate-400 font-mono-data whitespace-nowrap">
              {t('vehicles.equipment.updatedAt', {
                time: new Date(loadedAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }),
              })}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            title={t('vehicles.equipment.refresh')}
            aria-label={t('vehicles.equipment.refresh')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div role="group" aria-label={t('admin.equipment.view.label')} className="inline-flex p-1 rounded-lg bg-slate-100">
            {(
              [
                ['table', Rows3],
                ['station', LayoutGrid],
              ] as const
            ).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  view === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(`admin.equipment.view.${key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {error && <Notice notice={{ kind: 'error', message: error }} />}
      {referencesError && <Notice notice={{ kind: 'error', message: t('admin.equipment.referencesFailed') }} />}

      {firstLoad ? (
        <div className="flex items-center justify-center gap-2 py-16 rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('vehicles.equipment.loading')}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-dashed border-slate-300 bg-white text-center">
          <Package className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-500">{t('admin.equipment.empty')}</p>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('admin.equipment.emptyAction')}
          </button>
        </div>
      ) : view === 'station' ? (
        <EquipmentStationMatrix stations={matrixStations} items={matrixItems} activeCategory={category} onPick={pickCell} />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 rounded-xl border border-slate-200 bg-white text-center">
          <p className="text-sm text-slate-500">{t('vehicles.equipment.noMatch')}</p>
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-red-600 hover:underline">
            {t('vehicles.equipment.filters.clear')}
          </button>
        </div>
      ) : (
        <>
          <div
            className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
              loading ? 'opacity-60' : ''
            }`}
          >
            <EquipmentTable
              items={page.items}
              unitById={unitById}
              now={now}
              renderStation={(e) => {
                const s = stationById.get(e.stationId);
                return (
                  <button
                    type="button"
                    onClick={() => withPageReset(setStationId)(e.stationId)}
                    title={t('admin.equipment.filterThisStation')}
                    className="flex items-center gap-1.5 text-left hover:text-red-600"
                  >
                    {s?.code && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-bold font-mono-data text-slate-700">
                        {s.code}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-700 max-w-[160px] truncate">{stationName(e)}</span>
                  </button>
                );
              }}
              onToggleStatus={setStatusTarget}
              onEdit={setEditing}
              onDelete={setDeleteTarget}
            />
          </div>
          <Pagination
            pageIndex={page.pageIndex}
            totalPages={page.totalPages}
            totalCount={page.totalCount}
            onChange={setPageIndex}
          />
        </>
      )}

      {editing !== undefined && (
        <EquipmentFormDrawer
          // Đổi thiết bị đang sửa → dựng lại form từ đầu.
          key={editing?.id ?? 'new'}
          equipment={editing}
          stationId={stationId}
          stations={stations}
          vehicles={unitOptions}
          defaults={{ category, unit: location === STOCK_KEY ? STOCK_KEY : '' }}
          extra={
            editing ? <EquipmentHistory equipment={editing} stationLabel={stationLabel} unitLabel={unitLabel} /> : undefined
          }
          onClose={() => setEditing(undefined)}
          onSaved={(saved, created, keepOpen) => {
            upsert(saved);
            if (keepOpen) return;
            setEditing(undefined);
            setNotice({
              kind: 'success',
              message: created
                ? t('admin.equipment.created', { name: saved.name, station: stationName(saved) })
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
          locationLabel={`${stationName(deleteTarget)} · ${
            deleteTarget.rescueUnitId
              ? (unitById.get(deleteTarget.rescueUnitId)?.plate ?? deleteTarget.rescueUnitPlate ?? t('vehicles.equipment.deletedUnit'))
              : t('vehicles.equipment.stock')
          }`}
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

export default EquipmentPage;
