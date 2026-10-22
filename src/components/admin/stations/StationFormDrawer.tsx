import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { StationMapPicker } from './StationMapPicker';
import { StationStaffSection, type StationMemberDraft } from './StationStaffSection';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { MAP_CENTER } from '../fleetMeta';
import { HOTLINE_PATTERN, stationAdminService } from '../../../services/admin/stationAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { mapboxService } from '../../../services/mapboxService';
import { COVERAGE_RADIUS_KM, type StationResponseDto, type StationUpsertDto } from '../../../types/station';

interface StationFormDrawerProps {
  initialStation: StationResponseDto | null;
  onClose: () => void;
  /** `staffWarning`: trạm đã lưu nhưng còn nhân sự chưa gán / gỡ được. */
  onSaved: (station: StationResponseDto, staffWarning: string | null) => void;
}

const toDraft = (m: StationResponseDto['staffMembers'][number]): StationMemberDraft => ({
  id: m.id,
  fullName: m.fullName,
  email: m.email,
  role: m.role,
  movingFromStation: null,
});

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
  const [initialMembers] = useState<StationMemberDraft[]>(() => (initialStation?.staffMembers ?? []).map(toDraft));
  const [members, setMembers] = useState<StationMemberDraft[]>(initialMembers);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMiss, setGeocodeMiss] = useState(false);
  // Chỉ nhận kết quả của lần bấm bản đồ mới nhất (bấm liên tục thì các yêu cầu cũ có thể về sau).
  const geocodeSeq = useRef(0);

  const handlePickLocation = async (latitude: number, longitude: number) => {
    setForm((f) => ({ ...f, latitude, longitude }));
    const seq = ++geocodeSeq.current;
    setGeocoding(true);
    setGeocodeMiss(false);
    const address = await mapboxService.reverseGeocode(longitude, latitude);
    if (seq !== geocodeSeq.current) return;
    setGeocoding(false);
    // Không tìm được thì service trả chuỗi "Tọa độ (...)" — giữ nguyên địa chỉ đang có để Admin tự nhập.
    if (address.startsWith('Tọa độ (')) setGeocodeMiss(true);
    else setForm((f) => ({ ...f, address: address.slice(0, ADDRESS_MAX) }));
  };

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
    let saved: StationResponseDto;
    try {
      saved = initialStation
        ? await stationAdminService.update(initialStation.id, body)
        : await stationAdminService.create(body);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
      return;
    }

    // Trạm đã lưu → gán người mới thêm, gỡ người bị bỏ ra. Lỗi từng người không hoàn tác trạm đã lưu.
    const memberIds = new Set(members.map((m) => m.id));
    const initialIds = new Set(initialMembers.map((m) => m.id));
    const changes = [
      ...members.filter((m) => !initialIds.has(m.id)).map((m) => ({ member: m, stationId: saved.id as string | null })),
      ...initialMembers.filter((m) => !memberIds.has(m.id)).map((m) => ({ member: m, stationId: null })),
    ];
    const results = await Promise.allSettled(
      changes.map((c) => stationAdminService.assignStaff(c.member.id, c.stationId))
    );
    const failed = changes.filter((_, i) => results[i].status === 'rejected').map((c) => c.member.fullName);
    onSaved(
      saved,
      failed.length > 0 ? `Chưa cập nhật được nhân sự: ${failed.join(', ')}. Mở Sửa trạm để thử lại.` : null
    );
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

      <FormField
        label="Địa chỉ"
        required
        hint={
          geocodeMiss
            ? 'Không tìm được địa chỉ cho vị trí này — vui lòng nhập tay.'
            : 'Tự điền khi chọn vị trí trên bản đồ; có thể sửa lại.'
        }
      >
        <input
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          maxLength={ADDRESS_MAX}
          required
          disabled={geocoding}
          placeholder={geocoding ? 'Đang tìm địa chỉ...' : undefined}
          className={inputClass}
        />
        {geocoding && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang tìm địa chỉ theo vị trí trên bản đồ...
          </p>
        )}
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

      <StationStaffSection stationId={initialStation?.id ?? null} members={members} onChange={setMembers} />

      <FormField
        label="Vị trí trên bản đồ"
        required
        hint="Bấm lên bản đồ hoặc kéo marker để đặt vị trí — địa chỉ được điền tự động."
      >
        <div className="h-64 rounded-lg overflow-hidden border border-slate-200">
          <StationMapPicker
            lat={form.latitude}
            lng={form.longitude}
            radiusKm={radiusValid ? radiusKm : undefined}
            onChange={handlePickLocation}
          />
        </div>
        <p className="text-[11px] font-mono-data text-slate-500">
          {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
        </p>
      </FormField>
    </DrawerShell>
  );
};
