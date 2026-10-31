import React, { useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { useServiceQuery } from '../common/hooks';
import { RESCUE_UNIT_TYPE_META } from '../fleetMeta';
import { stationAdminService } from '../../../services/admin/stationAdminService';
import { isOffMission, vehicleAdminService, type VehicleEditInput } from '../../../services/admin/vehicleAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import {
  ADMIN_SETTABLE_UNIT_STATUSES,
  RESCUE_UNIT_TYPES,
  type RescueUnitResponseDto,
  type RescueUnitStatus,
} from '../../../types/rescueUnit';
import { useTranslation } from '../../../i18n';

interface VehicleFormDrawerProps {
  initialVehicle: RescueUnitResponseDto | null;
  onClose: () => void;
  onSaved: (vehicle: RescueUnitResponseDto) => void;
}

// Backend giới hạn biển số / mã hiệu xe tối đa 50 ký tự.
const PLATE_MAX_LENGTH = 50;

export const VehicleFormDrawer: React.FC<VehicleFormDrawerProps> = ({ initialVehicle, onClose, onSaved }) => {
  const { t } = useTranslation();
  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'vehicle-form-stations');

  const [form, setForm] = useState<VehicleEditInput>({
    plateNumber: initialVehicle?.plateNumber ?? '',
    unitType: initialVehicle?.unitType ?? 'FireTruck',
    stationId: initialVehicle?.stationId ?? '',
  });
  const [status, setStatus] = useState<RescueUnitStatus | undefined>(initialVehicle?.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stationItems = stations.data?.items ?? [];
  // Xe đang làm nhiệm vụ: vẫn sửa được biển số / loại xe, nhưng không đổi trạm và trạng thái.
  const onMission = !!initialVehicle && !isOffMission(initialVehicle.status);
  // Trạng thái hiện tại do hệ thống đặt (VD Hồi sức) vẫn hiện trong danh sách để không mất giá trị đang có.
  const statusOptions =
    initialVehicle && !ADMIN_SETTABLE_UNIT_STATUSES.includes(initialVehicle.status)
      ? [initialVehicle.status, ...ADMIN_SETTABLE_UNIT_STATUSES]
      : ADMIN_SETTABLE_UNIT_STATUSES;
  // Thêm xe mới: mặc định chọn trạm đầu tiên khi danh sách trạm về.
  const stationId = form.stationId || stationItems[0]?.id || '';
  // Trạm của xe có thể đã bị xóa / tạm ngưng — vẫn hiện để không mất giá trị đang chọn.
  const currentStationMissing =
    !!initialVehicle && !!stations.data && !stationItems.some((s) => s.id === initialVehicle.stationId);

  const set = <K extends keyof VehicleEditInput>(key: K, value: VehicleEditInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const plate = form.plateNumber.trim();
  const canSubmit = plate.length > 0 && plate.length <= PLATE_MAX_LENGTH && !!stationId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    // Chỉ gửi trạng thái khi Admin đổi — giữ nguyên thì service gửi lại trạng thái mới nhất của xe.
    const input = {
      ...form,
      plateNumber: plate,
      stationId,
      status: initialVehicle && status !== initialVehicle.status ? status : undefined,
    };
    try {
      const saved = initialVehicle
        ? await vehicleAdminService.update(initialVehicle.id, input)
        : await vehicleAdminService.create(input);
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      title={
        initialVehicle
          ? t('admin.vehicles.form.editTitle', { plate: initialVehicle.plateNumber })
          : t('admin.vehicles.form.addTitle')
      }
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<DrawerFooter onCancel={onClose} submitLabel={t('admin.vehicles.form.save')} submitting={submitting} canSubmit={canSubmit} />}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      <FormField label={t('admin.vehicles.form.plate')} required>
        <input
          value={form.plateNumber}
          onChange={(e) => set('plateNumber', e.target.value)}
          placeholder={t('admin.vehicles.form.platePlaceholder')}
          maxLength={PLATE_MAX_LENGTH}
          required
          className={`${inputClass} font-mono-data uppercase`}
        />
      </FormField>

      <FormField label={t('admin.vehicles.form.type')} required>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {RESCUE_UNIT_TYPES.map((type) => {
            const meta = RESCUE_UNIT_TYPE_META[type];
            const Icon = meta.icon;
            const active = form.unitType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => set('unitType', type)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-bold transition-colors ${
                  active ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-300 text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {t(`enums.unitType.${type}`)}
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField
        label={t('admin.vehicles.form.station')}
        required
        hint={
          onMission
            ? t('admin.vehicles.form.stationLockedOnMission')
            : currentStationMissing
              ? t('admin.vehicles.form.stationDeleted')
              : undefined
        }
      >
        <select
          value={stationId}
          onChange={(e) => set('stationId', e.target.value)}
          disabled={onMission || (stations.loading && !stations.data)}
          className={inputClass}
        >
          {!stationId && <option value="">{t('admin.vehicles.form.noStation')}</option>}
          {initialVehicle && currentStationMissing && (
            <option value={initialVehicle.stationId}>{initialVehicle.stationName || t('admin.vehicles.form.missingStation')}</option>
          )}
          {stationItems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isActive ? '' : t('admin.vehicles.form.inactiveSuffix')}
            </option>
          ))}
        </select>
        {stations.error && <p className="text-[11px] text-red-600">{stations.error}</p>}
      </FormField>

      {initialVehicle ? (
        <FormField
          label={t('admin.common.status')}
          required
          hint={onMission ? t('admin.vehicles.form.statusOnMission') : t('admin.vehicles.form.statusHint')}
        >
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RescueUnitStatus)}
            disabled={onMission}
            className={inputClass}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s} disabled={!ADMIN_SETTABLE_UNIT_STATUSES.includes(s)}>
                {t(`enums.unitStatus.${s}`)}
              </option>
            ))}
          </select>
        </FormField>
      ) : (
        <p className="text-xs text-slate-500">{t('admin.vehicles.form.newVehicleNote')}</p>
      )}
    </DrawerShell>
  );
};
