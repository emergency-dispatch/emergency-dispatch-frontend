import React, { useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { useServiceQuery } from '../common/hooks';
import { ADMIN_VEHICLE_TYPES, VEHICLE_TYPE_META } from '../fleetMeta';
import { accountAdminService } from '../../../services/admin/accountAdminService';
import { stationAdminService } from '../../../services/admin/stationAdminService';
import { vehicleAdminService } from '../../../services/admin/vehicleAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { UserRole } from '../../../types/auth';
import { isVehicleBusy, type AdminVehicle, type AdminVehicleListItem, type VehicleInput } from '../../../types/adminFleet';

interface VehicleFormDrawerProps {
  initialVehicle: AdminVehicleListItem | null;
  onClose: () => void;
  onSaved: (vehicle: AdminVehicle) => void;
}

// Danh sách chọn trong form: lấy hết (mock nhỏ). Backend thật nên có endpoint rút gọn cho dropdown.
const ALL = { pageIndex: 1, pageSize: 500 };

export const VehicleFormDrawer: React.FC<VehicleFormDrawerProps> = ({ initialVehicle, onClose, onSaved }) => {
  const stations = useServiceQuery(() => stationAdminService.list(ALL), 'stations');
  const staff = useServiceQuery(
    () => accountAdminService.listAccounts({ role: UserRole.RescueStaff, ...ALL }),
    'rescue-staff'
  );
  const vehicles = useServiceQuery(() => vehicleAdminService.list(ALL), 'vehicles');

  // Xe Ngừng hoạt động (trạm cũ bị xóa): chỉ được chọn trạm mới, các trường khác khóa.
  const outOfService = initialVehicle?.status === 'out_of_service';

  const [form, setForm] = useState<VehicleInput>({
    plate: initialVehicle?.plate ?? '',
    type: initialVehicle?.type ?? 'fire_truck',
    stationId: outOfService ? '' : (initialVehicle?.stationId ?? ''),
    crewMemberId: initialVehicle?.crewMemberId ?? null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = !!initialVehicle && isVehicleBusy(initialVehicle.status);
  // Thêm xe mới: mặc định chọn trạm đầu tiên khi danh sách trạm về. Xe ngừng hoạt động phải tự chọn.
  const stationId = form.stationId || (outOfService ? '' : stations.data?.items[0]?.id || '');

  // RescueStaff đã gán cho xe khác → không chọn được (mỗi nhân sự chỉ gán cho 1 xe).
  const vehicleByCrew = new Map(
    (vehicles.data?.items ?? [])
      .filter((v) => v.crewMemberId && v.id !== initialVehicle?.id)
      .map((v) => [v.crewMemberId!, v.plate])
  );

  const set = <K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const canSubmit = form.plate.trim().length > 0 && !!stationId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const input = { ...form, stationId };
    try {
      const saved = !initialVehicle
        ? await vehicleAdminService.create(input)
        : outOfService
          ? await vehicleAdminService.reassignStation(initialVehicle.id, stationId)
          : await vehicleAdminService.update(initialVehicle.id, input);
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      title={initialVehicle ? `Chỉnh sửa xe ${initialVehicle.plate}` : 'Thêm xe mới'}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<DrawerFooter onCancel={onClose} submitLabel="Lưu xe" submitting={submitting} canSubmit={canSubmit} />}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      {outOfService && (
        <p className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
          Xe đang ngừng hoạt động vì trạm cũ đã bị xóa. Chọn trạm mới để đưa xe hoạt động trở lại.
        </p>
      )}

      <FormField label="Biển số" required>
        <input
          value={form.plate}
          onChange={(e) => set('plate', e.target.value)}
          placeholder="VD: 51D-123.45"
          disabled={outOfService}
          required
          className={`${inputClass} font-mono-data uppercase`}
        />
      </FormField>

      <FormField label="Chủng loại" required>
        <div className="grid grid-cols-3 gap-2">
          {ADMIN_VEHICLE_TYPES.map((type) => {
            const meta = VEHICLE_TYPE_META[type];
            const Icon = meta.icon;
            const active = form.type === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => set('type', type)}
                disabled={outOfService}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  active ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-300 text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {meta.label}
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField
        label="Trạm trực thuộc"
        required
        hint={busy ? 'Xe đang làm nhiệm vụ — không thể đổi trạm trực thuộc.' : undefined}
      >
        <select
          value={stationId}
          onChange={(e) => set('stationId', e.target.value)}
          disabled={busy || (stations.loading && !stations.data)}
          className={inputClass}
        >
          {outOfService && <option value="">— Chọn trạm mới —</option>}
          {(stations.data?.items ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {stations.error && <p className="text-[11px] text-red-600">{stations.error}</p>}
      </FormField>

      <FormField label="Nhân sự phụ trách" hint="Chọn 1 RescueStaff. Mỗi nhân sự chỉ được gán cho 1 xe.">
        <select
          value={form.crewMemberId ?? ''}
          onChange={(e) => set('crewMemberId', e.target.value || null)}
          disabled={outOfService || (staff.loading && !staff.data)}
          className={inputClass}
        >
          <option value="">— Chưa gán —</option>
          {(staff.data?.items ?? []).map((s) => {
            const plate = vehicleByCrew.get(s.id);
            const locked = s.lock.kind === 'admin';
            return (
              <option key={s.id} value={s.id} disabled={!!plate || locked}>
                {s.fullName}
                {plate ? ` (đang gán xe ${plate})` : ''}
                {locked ? ' — đang bị khóa' : ''}
              </option>
            );
          })}
        </select>
        {staff.error && <p className="text-[11px] text-red-600">{staff.error}</p>}
      </FormField>

      {!initialVehicle && (
        <p className="text-xs text-slate-500">Xe mới được tạo ở trạng thái Sẵn sàng.</p>
      )}
    </DrawerShell>
  );
};
