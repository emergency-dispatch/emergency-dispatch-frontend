import React, { useEffect, useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../../admin/common/ui';
import { inputClass } from '../../admin/common/styles';
import { RESCUE_UNIT_TYPE_META } from '../../admin/fleetMeta';
import { useDispatchStore } from '../../../context/DispatchContext';
import { liveMapService } from '../../../services/liveMapService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { RESCUE_UNIT_TYPES, type RescueUnitType } from '../../../types/rescueUnit';
import type { Vehicle } from '../../../types/vehicle';
import i18n, { useTranslation } from '../../../i18n';

interface VehicleFormDrawerProps {
  /** null → thêm xe mới vào trạm `stationId`. */
  vehicle: Vehicle | null;
  stationId: string;
  stationName: string;
  onClose: () => void;
  onSaved: (plate: string, created: boolean) => void;
}

// Backend giới hạn biển số / mã hiệu xe tối đa 50 ký tự.
const PLATE_MAX_LENGTH = 50;

// Bối cảnh KCN/Khu CNC: Operator không điều xe tuần tra (bị ẩn khỏi Live Map / Đội xe) nên không cho tạo.
const OPERATOR_UNIT_TYPES = RESCUE_UNIT_TYPES.filter((t) => t !== 'PolicePatrol');

/** Thêm / sửa xe của trạm Operator phụ trách. Trạm cố định; đổi trạng thái làm ở bảng, xóa / chuyển trạm do Admin. */
export const VehicleFormDrawer: React.FC<VehicleFormDrawerProps> = ({ vehicle, stationId, stationName, onClose, onSaved }) => {
  const { saveVehicle } = useDispatchStore();
  const { t } = useTranslation();
  const [plateNumber, setPlateNumber] = useState(vehicle?.plate ?? '');
  const [unitType, setUnitType] = useState<RescueUnitType | null>(vehicle ? null : 'FireTruck');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vehicle của Live Map chỉ có nhóm loại xe (VD Xe thang gộp vào chữa cháy) → đọc chủng loại gốc từ backend.
  const vehicleId = vehicle?.id;
  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    liveMapService
      .getRescueUnit(vehicleId)
      .then((dto) => !cancelled && setUnitType(dto.unitType))
      .catch((err) => !cancelled && setError(getApiErrorMessage(err, i18n.t('vehicles.form.loadFailed'))));
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const plate = plateNumber.trim();
  const canSubmit = plate.length > 0 && plate.length <= PLATE_MAX_LENGTH && !!unitType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !unitType) return;
    setSubmitting(true);
    setError(null);
    const result = await saveVehicle({ plateNumber: plate, unitType, stationId }, vehicle?.id);
    if (result.ok) {
      onSaved(plate.toUpperCase(), !vehicle);
    } else {
      setError(result.message ?? t('vehicles.form.saveFailed'));
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      title={vehicle ? t('vehicles.form.editTitle', { plate: vehicle.plate }) : t('vehicles.form.createTitle')}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<DrawerFooter onCancel={onClose} submitLabel={t('vehicles.form.save')} submitting={submitting} canSubmit={canSubmit} />}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      <FormField label={t('vehicles.form.plate')} required>
        <input
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
          placeholder={t('vehicles.form.platePlaceholder')}
          maxLength={PLATE_MAX_LENGTH}
          required
          className={`${inputClass} font-mono-data uppercase`}
        />
      </FormField>

      <FormField label={t('vehicles.form.type')} required>
        {unitType === null && !error ? (
          <p className="text-xs text-slate-500">{t('common.loading')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {OPERATOR_UNIT_TYPES.map((type) => {
              const meta = RESCUE_UNIT_TYPE_META[type];
              const Icon = meta.icon;
              const active = unitType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setUnitType(type)}
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
        )}
      </FormField>

      <FormField label={t('vehicles.form.station')} hint={t('vehicles.form.stationHint')}>
        <input value={stationName} disabled className={inputClass} />
      </FormField>

      <p className="text-xs text-slate-500">
        {vehicle
          ? t('vehicles.form.statusHint')
          : t('vehicles.form.createHint')}
      </p>
    </DrawerShell>
  );
};
