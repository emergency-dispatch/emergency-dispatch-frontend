import React, { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { VehicleFormDrawer } from '../../components/admin/vehicles/VehicleFormDrawer';
import { VehiclesTable } from '../../components/admin/vehicles/VehiclesTable';
import { ConfirmModal, Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { stationAdminService } from '../../services/admin/stationAdminService';
import { typeCatalogService } from '../../services/typeCatalogService';
import { vehicleAdminService, type VehicleStatusFilter } from '../../services/admin/vehicleAdminService';
import { getApiErrorMessage } from '../../services/apiClient';
import { HubEvents, incidentHubService } from '../../services/realtime/incidentHubService';
import { unitTypeLabel } from '../../components/admin/fleetMeta';
import {
  RESCUE_UNIT_STATUSES,
  RESCUE_UNIT_TYPES,
  type RescueUnitResponseDto,
  type RescueUnitType,
} from '../../types/rescueUnit';
import { Trans, useTranslation } from '../../i18n';

const PAGE_SIZE = 10;
// Gom các sự kiện đổi trạng thái xe đến dồn dập (VD giao nhiều xe cùng lúc) thành một lần tải lại.
const REALTIME_RELOAD_DELAY_MS = 500;
const STATUS_FILTERS: VehicleStatusFilter[] = ['on_mission', ...RESCUE_UNIT_STATUSES];

const VehiclesPage: React.FC = () => {
  const { t } = useTranslation();
  const initial = useInitialQueryParams();
  const [search, setSearch] = useState(() => initial.text('search'));
  const [stationId, setStationId] = useState(() => initial.text('stationId'));
  // Mã loại xe là danh mục mở (Admin thêm được) → nhận mọi mã từ query string; mã lạ chỉ làm danh sách rỗng.
  const [type, setType] = useState<RescueUnitType>(() => initial.text('type'));
  const [status, setStatus] = useState<VehicleStatusFilter | ''>(() => initial.oneOf('status', STATUS_FILTERS));
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const params = {
    search: debouncedSearch,
    stationId: stationId || undefined,
    type: type || undefined,
    status: status || undefined,
    pageIndex,
    pageSize: PAGE_SIZE,
  };
  const query = useServiceQuery(() => vehicleAdminService.list(params), JSON.stringify(params));
  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'vehicle-stations');
  // Cả loại đã ẩn: xe cũ vẫn có thể mang loại đó, bộ lọc / nhãn phải nhận ra.
  const unitTypes = useServiceQuery(() => typeCatalogService.listUnitTypes(true), 'vehicle-unit-types');
  const typeOptions: RescueUnitType[] = unitTypes.data?.map((u) => u.code) ?? RESCUE_UNIT_TYPES;

  // Realtime: xe đổi trạng thái (giao xe, tới nơi, hồi sức, hết hồi sức, Operator đổi tay, thêm / xóa xe) → tải lại
  // trang hiện tại để giữ đúng bộ lọc và phân trang. Kết nối lại sau khi rớt mạng cũng tải lại vì có thể đã lỡ sự kiện.
  const reloadRef = useRef(query.reload);
  useEffect(() => {
    reloadRef.current = query.reload;
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => reloadRef.current(), REALTIME_RELOAD_DELAY_MS);
    };
    const unsubscribers = [
      incidentHubService.on(HubEvents.ReceiveRescueUnitStatus, scheduleReload),
      incidentHubService.onReconnected(scheduleReload),
    ];
    incidentHubService.start();
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      incidentHubService.stop();
    };
  }, []);

  const [formVehicle, setFormVehicle] = useState<RescueUnitResponseDto | 'new' | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<RescueUnitResponseDto | null>(null);
  const [unstickVehicle, setUnstickVehicle] = useState<RescueUnitResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const withPageReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPageIndex(1);
    };

  const handleToggleMaintenance = async (vehicle: RescueUnitResponseDto) => {
    const next = vehicle.status === 'Maintenance' ? 'Available' : 'Maintenance';
    setPendingId(vehicle.id);
    try {
      await vehicleAdminService.setStatus(vehicle.id, next);
      setNotice({
        kind: 'success',
        message: t('admin.vehicles.statusChanged', { plate: vehicle.plateNumber, status: t(`enums.unitStatus.${next}`) }),
      });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setPendingId(null);
      query.reload();
    }
  };

  const handleUnstick = async () => {
    if (!unstickVehicle) return;
    const vehicle = unstickVehicle;
    setPendingId(vehicle.id);
    try {
      await vehicleAdminService.unstick(vehicle.id);
      setNotice({ kind: 'success', message: t('admin.vehicles.unstickDone', { plate: vehicle.plateNumber }) });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setPendingId(null);
      setUnstickVehicle(null);
      query.reload();
    }
  };

  const handleDelete = async () => {
    if (!deletingVehicle) return;
    setDeleting(true);
    try {
      await vehicleAdminService.remove(deletingVehicle.id);
      setNotice({ kind: 'success', message: t('admin.vehicles.deleted', { plate: deletingVehicle.plateNumber }) });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setDeleting(false);
      setDeletingVehicle(null);
      query.reload();
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => withPageReset(setSearch)(e.target.value)}
            placeholder={t('admin.vehicles.searchPlaceholder')}
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:flex">
          <select
            value={stationId}
            onChange={(e) => withPageReset(setStationId)(e.target.value)}
            aria-label={t('admin.vehicles.filterByStation')}
            className={`${inputClass} lg:w-48`}
          >
            <option value="">{t('admin.vehicles.allStations')}</option>
            {(stations.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => withPageReset(setType)(e.target.value)}
            aria-label={t('admin.vehicles.filterByType')}
            className={`${inputClass} lg:w-40`}
          >
            <option value="">{t('admin.vehicles.allTypes')}</option>
            {typeOptions.map((unitType) => (
              <option key={unitType} value={unitType}>
                {unitTypeLabel(unitType, unitTypes.data)}
              </option>
            ))}
            {/* Mã lấy từ query string nhưng không có trong danh mục → vẫn hiện để không mất bộ lọc đang áp dụng. */}
            {type && !typeOptions.includes(type) && <option value={type}>{type}</option>}
          </select>
          <select
            value={status}
            onChange={(e) => withPageReset(setStatus)(e.target.value as VehicleStatusFilter | '')}
            aria-label={t('admin.common.filterByStatus')}
            className={`${inputClass} lg:w-44`}
          >
            <option value="">{t('admin.common.allStatuses')}</option>
            <option value="on_mission">{t('admin.vehicles.onMission')}</option>
            {RESCUE_UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`enums.unitStatus.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setFormVehicle('new')}
          className="lg:ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {t('admin.vehicles.add')}
        </button>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <VehiclesTable
        vehicles={query.data?.items ?? []}
        loading={query.loading}
        unitTypes={unitTypes.data ?? null}
        pendingId={pendingId}
        onEdit={setFormVehicle}
        onToggleMaintenance={handleToggleMaintenance}
        onUnstick={setUnstickVehicle}
        onDelete={setDeletingVehicle}
      />

      {query.data && (
        <Pagination
          pageIndex={query.data.pageIndex}
          totalPages={query.data.totalPages}
          totalCount={query.data.totalCount}
          onChange={setPageIndex}
        />
      )}

      {formVehicle && (
        <VehicleFormDrawer
          initialVehicle={formVehicle === 'new' ? null : formVehicle}
          unitTypes={unitTypes.data ?? null}
          unitTypesError={unitTypes.error}
          onClose={() => setFormVehicle(null)}
          onSaved={(saved) => {
            setNotice({
              kind: 'success',
              message: t(formVehicle === 'new' ? 'admin.vehicles.added' : 'admin.vehicles.updated', {
                plate: saved.plateNumber,
              }),
            });
            setFormVehicle(null);
            query.reload();
          }}
        />
      )}

      {deletingVehicle && (
        <ConfirmModal
          title={t('admin.vehicles.deleteDialog.title')}
          confirmLabel={t('admin.vehicles.deleteDialog.confirm')}
          submitting={deleting}
          onCancel={() => setDeletingVehicle(null)}
          onConfirm={handleDelete}
        >
          <p>
            <Trans
              i18nKey="admin.vehicles.deleteDialog.body"
              values={{
                plate: deletingVehicle.plateNumber,
                station: deletingVehicle.stationName ? ` (${deletingVehicle.stationName})` : '',
              }}
              components={{ b: <span className="font-semibold font-mono-data text-slate-900" /> }}
            />
          </p>
        </ConfirmModal>
      )}

      {unstickVehicle && (
        <ConfirmModal
          title={t('admin.vehicles.unstickDialog.title', { plate: unstickVehicle.plateNumber })}
          confirmLabel={t('admin.vehicles.unstickDialog.confirm')}
          submitting={pendingId === unstickVehicle.id}
          onCancel={() => setUnstickVehicle(null)}
          onConfirm={handleUnstick}
        >
          <p>
            {t('admin.vehicles.unstickDialog.body', {
              status: t(`enums.unitStatus.${unstickVehicle.status}`, { defaultValue: unstickVehicle.statusName }),
            })}
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default VehiclesPage;
