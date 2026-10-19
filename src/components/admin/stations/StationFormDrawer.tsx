import React, { useState } from 'react';
import { StationMapPicker } from '../../dashboard/stations/StationMapPicker';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { useServiceQuery } from '../common/hooks';
import { MAP_CENTER, STATION_AREAS } from '../fleetMeta';
import { accountAdminService } from '../../../services/admin/accountAdminService';
import { HOTLINE_PATTERN, stationAdminService } from '../../../services/admin/stationAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { UserRole } from '../../../types/auth';
import type { AdminStation, AdminStationListItem, StationInput } from '../../../types/adminFleet';

interface StationFormDrawerProps {
  initialStation: AdminStationListItem | null;
  onClose: () => void;
  onSaved: (station: AdminStation) => void;
}

// Danh sách chọn trong form: lấy hết (mock nhỏ). Backend thật nên có endpoint rút gọn cho dropdown.
const ALL = { pageIndex: 1, pageSize: 500 };

export const StationFormDrawer: React.FC<StationFormDrawerProps> = ({ initialStation, onClose, onSaved }) => {
  const [form, setForm] = useState<StationInput>({
    name: initialStation?.name ?? '',
    address: initialStation?.address ?? '',
    area: initialStation?.area ?? STATION_AREAS[0],
    lat: initialStation?.lat ?? MAP_CENTER[0],
    lng: initialStation?.lng ?? MAP_CENTER[1],
    coverageRadiusKm: initialStation?.coverageRadiusKm ?? 5,
    hotline: initialStation?.hotline ?? '',
    headOperatorId: initialStation?.headOperatorId ?? null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operators = useServiceQuery(
    () => accountAdminService.listAccounts({ role: UserRole.Operator, ...ALL }),
    'operators'
  );
  const stations = useServiceQuery(() => stationAdminService.list(ALL), 'stations');

  // Operator đang là trưởng của trạm khác → không chọn được (mỗi Operator chỉ làm trưởng 1 trạm).
  const headOfOtherStation = new Map(
    (stations.data?.items ?? [])
      .filter((s) => s.headOperatorId && s.id !== initialStation?.id)
      .map((s) => [s.headOperatorId!, s.name])
  );
  const areas = STATION_AREAS.includes(form.area) ? STATION_AREAS : [...STATION_AREAS, form.area];

  const set = <K extends keyof StationInput>(key: K, value: StationInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const hotlineValid = HOTLINE_PATTERN.test(form.hotline.replace(/\s/g, ''));
  const canSubmit =
    form.name.trim().length > 0 && form.address.trim().length > 0 && form.coverageRadiusKm > 0 && hotlineValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = initialStation
        ? await stationAdminService.update(initialStation.id, form)
        : await stationAdminService.create(form);
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
        <input value={form.name} onChange={(e) => set('name', e.target.value)} required className={inputClass} />
      </FormField>

      <FormField label="Địa chỉ" required>
        <input value={form.address} onChange={(e) => set('address', e.target.value)} required className={inputClass} />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Khu vực">
          <select value={form.area} onChange={(e) => set('area', e.target.value)} className={inputClass}>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Bán kính phủ sóng (km)" required>
          <input
            type="number"
            min={0.5}
            max={30}
            step={0.5}
            value={form.coverageRadiusKm}
            onChange={(e) => set('coverageRadiusKm', Number(e.target.value))}
            className={inputClass}
          />
        </FormField>
      </div>

      <FormField
        label="Hotline"
        required
        hint={form.hotline && !hotlineValid ? 'Hotline phải gồm 3–11 chữ số.' : undefined}
      >
        <input
          value={form.hotline}
          onChange={(e) => set('hotline', e.target.value)}
          inputMode="tel"
          placeholder="VD: 02837301111"
          className={inputClass}
        />
      </FormField>

      <FormField
        label="Trưởng trạm"
        hint="Chọn một Operator. Mỗi trạm tối đa 1 trưởng trạm, mỗi Operator chỉ làm trưởng 1 trạm."
      >
        <select
          value={form.headOperatorId ?? ''}
          onChange={(e) => set('headOperatorId', e.target.value || null)}
          disabled={operators.loading && !operators.data}
          className={inputClass}
        >
          <option value="">— Chưa gán —</option>
          {(operators.data?.items ?? []).map((op) => {
            const otherStation = headOfOtherStation.get(op.id);
            return (
              <option key={op.id} value={op.id} disabled={!!otherStation}>
                {op.fullName}
                {otherStation ? ` (trưởng ${otherStation})` : ''}
                {op.isLocked ? ' — đang bị khóa' : ''}
              </option>
            );
          })}
        </select>
        {operators.error && <p className="text-[11px] text-red-600">{operators.error}</p>}
      </FormField>

      <FormField label="Vị trí trên bản đồ" required hint="Bấm lên bản đồ để đặt vị trí hoặc kéo marker.">
        <div className="h-64 rounded-lg overflow-hidden border border-slate-200">
          <StationMapPicker
            lat={form.lat}
            lng={form.lng}
            radiusKm={form.coverageRadiusKm}
            onChange={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
          />
        </div>
        <p className="text-[11px] font-mono-data text-slate-500">
          {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
        </p>
      </FormField>
    </DrawerShell>
  );
};
