import React, { useState } from 'react';
import { StationMapPicker } from './StationMapPicker';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { MAP_CENTER } from '../fleetMeta';
import { HOTLINE_PATTERN, stationAdminService } from '../../../services/admin/stationAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { COVERAGE_RADIUS_KM, type StationResponseDto, type StationUpsertDto } from '../../../types/station';

interface StationFormDrawerProps {
  initialStation: StationResponseDto | null;
  onClose: () => void;
  onSaved: (station: StationResponseDto) => void;
}

// Giới hạn độ dài khớp validation của CreateStationDto / UpdateStationDto.
const NAME_MAX = 200;
const ADDRESS_MAX = 500;

export const StationFormDrawer: React.FC<StationFormDrawerProps> = ({ initialStation, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: initialStation?.name ?? '',
    address: initialStation?.address ?? '',
    latitude: initialStation?.latitude ?? MAP_CENTER[0],
    longitude: initialStation?.longitude ?? MAP_CENTER[1],
    phoneNumber: initialStation?.phoneNumber ?? '',
    isActive: initialStation?.isActive ?? true,
    // Ô số giữ dạng chuỗi để gõ dở không bị nhảy.
    coverageRadiusKm: String(initialStation?.coverageRadiusKm ?? COVERAGE_RADIUS_KM.default),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const hotline = form.phoneNumber.replace(/\s/g, '');
  const hotlineValid = HOTLINE_PATTERN.test(hotline);
  const radiusKm = form.coverageRadiusKm.trim() === '' ? NaN : Number(form.coverageRadiusKm);
  const radiusValid = radiusKm >= COVERAGE_RADIUS_KM.min && radiusKm <= COVERAGE_RADIUS_KM.max;
  const canSubmit = form.name.trim().length > 0 && form.address.trim().length > 0 && hotlineValid && radiusValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const body: StationUpsertDto = {
      name: form.name.trim(),
      address: form.address.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      phoneNumber: hotline,
      isActive: form.isActive,
      coverageRadiusKm: radiusKm,
    };
    try {
      const saved = initialStation
        ? await stationAdminService.update(initialStation.id, body)
        : await stationAdminService.create(body);
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      title={initialStation ? 'Chỉnh sửa trạm' : 'Thêm trạm mới'}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <DrawerFooter onCancel={onClose} submitLabel="Lưu trạm" submitting={submitting} canSubmit={canSubmit} />
      }
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      <FormField label="Tên trạm" required>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          maxLength={NAME_MAX}
          required
          className={inputClass}
        />
      </FormField>

      <FormField label="Địa chỉ" required>
        <input
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          maxLength={ADDRESS_MAX}
          required
          className={inputClass}
        />
      </FormField>

      <FormField
        label="Hotline"
        required
        hint={form.phoneNumber && !hotlineValid ? 'Hotline phải gồm 3–11 chữ số.' : undefined}
      >
        <input
          value={form.phoneNumber}
          onChange={(e) => set('phoneNumber', e.target.value)}
          inputMode="tel"
          placeholder="VD: 02837301111"
          className={inputClass}
        />
      </FormField>

      <FormField
        label="Bán kính phủ sóng (km)"
        required
        hint={
          radiusValid
            ? `Vùng trạm phụ trách, vẽ trên bản đồ bên dưới. Từ ${COVERAGE_RADIUS_KM.min} đến ${COVERAGE_RADIUS_KM.max} km.`
            : `Nhập từ ${COVERAGE_RADIUS_KM.min} đến ${COVERAGE_RADIUS_KM.max} km.`
        }
      >
        <input
          type="number"
          inputMode="decimal"
          min={COVERAGE_RADIUS_KM.min}
          max={COVERAGE_RADIUS_KM.max}
          step={0.5}
          value={form.coverageRadiusKm}
          onChange={(e) => set('coverageRadiusKm', e.target.value)}
          className={`${inputClass} font-mono-data sm:max-w-[160px] ${radiusValid ? '' : 'border-red-400'}`}
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-slate-700 select-none cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          className="w-4 h-4 accent-red-600"
        />
        Trạm đang hoạt động
      </label>

      <FormField label="Vị trí trên bản đồ" required hint="Bấm lên bản đồ để đặt vị trí hoặc kéo marker.">
        <div className="h-64 rounded-lg overflow-hidden border border-slate-200">
          <StationMapPicker
            lat={form.latitude}
            lng={form.longitude}
            radiusKm={radiusValid ? radiusKm : undefined}
            onChange={(latitude, longitude) => setForm((f) => ({ ...f, latitude, longitude }))}
          />
        </div>
        <p className="text-[11px] font-mono-data text-slate-500">
          {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
        </p>
      </FormField>
    </DrawerShell>
  );
};
