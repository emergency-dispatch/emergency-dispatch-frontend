import React, { useEffect, useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../../admin/common/ui';
import { inputClass, validatedInputClass } from '../../admin/common/styles';
import { unitTypeIcon } from '../../admin/fleetMeta';
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
const HIDDEN_UNIT_TYPE = 'PolicePatrol';
// Danh mục chưa tải được → 5 loại hệ thống.
const FALLBACK_UNIT_TYPES = RESCUE_UNIT_TYPES.filter((t) => t !== HIDDEN_UNIT_TYPE);
const DEFAULT_UNIT_TYPE = 'FireTruck';

/** Thêm / sửa xe của trạm Operator phụ trách. Trạm cố định; đổi trạng thái làm ở bảng, xóa / chuyển trạm do Admin. */
export const VehicleFormDrawer: React.FC<VehicleFormDrawerProps> = ({ vehicle, stationId, stationName, onClose, onSaved }) => {
  const { saveVehicle, rescueUnitTypes, unitTypeLabel } = useDispatchStore();
  const { t } = useTranslation();
  // §31: loại xe lấy từ danh mục (Operator chỉ nhận loại đang dùng). Loại hiện tại của xe (có thể đã bị Admin ẩn)
  // vẫn giữ trong danh sách để không mất giá trị khi sửa biển số.
  const activeTypes: RescueUnitType[] = rescueUnitTypes
    ? rescueUnitTypes.map((u) => u.code).filter((c) => c !== HIDDEN_UNIT_TYPE)
    : FALLBACK_UNIT_TYPES;
  const [plateNumber, setPlateNumber] = useState(vehicle?.plate ?? '');
  // Thêm mới: '' = chưa chọn → mặc định Xe chữa cháy (hoặc loại đầu tiên nếu loại đó bị ẩn).
  const [pickedType, setUnitType] = useState<RescueUnitType | null>(vehicle ? null : '');
  const unitType =
    pickedType === ''
      ? activeTypes.includes(DEFAULT_UNIT_TYPE)
        ? DEFAULT_UNIT_TYPE
        : (activeTypes[0] ?? null)
      : pickedType;
  const typeOptions = unitType && !activeTypes.includes(unitType) ? [unitType, ...activeTypes] : activeTypes;
  const [plateTouched, setPlateTouched] = useState(false);
  // Biển số backend báo trùng — hiện dưới ô biển số cho tới khi người dùng sửa thành giá trị khác.
  const [duplicatePlate, setDuplicatePlate] = useState<string | null>(null);
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
  // Không ép định dạng (backend nhận cả mã hiệu nội bộ): chỉ bắt buộc nhập; độ dài đã giới hạn bằng maxLength.
  const plateError = !plate
    ? t('vehicles.form.plateRequired')
    : duplicatePlate && plate.toUpperCase() === duplicatePlate
      ? t('vehicles.form.plateDuplicate', { plate: duplicatePlate })
      : null;
  const shownPlateError = plateTouched ? plateError : null;
  // Chỉ khóa nút khi chưa nhập biển số; biển số trùng vẫn cho bấm để backend báo lỗi dưới ô.
  const canSubmit = !!unitType && !!plate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlateTouched(true);
    if (plateError || !unitType) return;
    setSubmitting(true);
    setError(null);
    const result = await saveVehicle({ plateNumber: plate, unitType, stationId }, vehicle?.id);
    if (result.ok) {
      onSaved(plate.toUpperCase(), !vehicle);
      return;
    }
    setSubmitting(false);
    // Backend báo trùng kèm biển số trong nháy đơn ('51C-001.11') ở cả vi / en → đưa lỗi xuống dưới ô biển số.
    if (result.message?.toUpperCase().includes(`'${plate.toUpperCase()}'`)) {
      setDuplicatePlate(plate.toUpperCase());
    } else {
      setError(result.message ?? t('vehicles.form.saveFailed'));
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

      <FormField label={t('vehicles.form.plate')} required error={shownPlateError}>
        <input
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
          onBlur={() => setPlateTouched(true)}
          placeholder={t('vehicles.form.platePlaceholder')}
          maxLength={PLATE_MAX_LENGTH}
          aria-invalid={!!shownPlateError}
          className={`${validatedInputClass(!!shownPlateError)} font-mono-data uppercase`}
        />
      </FormField>

      <FormField label={t('vehicles.form.type')} required>
        {unitType === null && !error ? (
          <p className="text-xs text-slate-500">{t('common.loading')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {typeOptions.map((type) => {
              const Icon = unitTypeIcon(type);
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
                  <span className="text-center leading-tight px-1">{unitTypeLabel(type)}</span>
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
