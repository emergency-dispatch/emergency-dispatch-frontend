import React, { useMemo, useState } from 'react';
import { AlertTriangle, LocateFixed } from 'lucide-react';
import { SettingsForm } from '../../components/admin/settings/SettingsForm';
import { sameSettings, toNumber } from '../../components/admin/settings/settingsDraft';
import { StationMapPicker } from '../../components/admin/stations/StationMapPicker';
import { MAP_CENTER } from '../../components/admin/fleetMeta';
import { Notice, type NoticeState } from '../../components/admin/common/ui';
import { inputClass, labelClass } from '../../components/admin/common/styles';
import { useServiceQuery, useUnsavedChangesGuard } from '../../components/admin/common/hooks';
import {
  SERVICE_AREA_RADIUS_KM,
  adminSettingsService,
  validateServiceArea,
  type ServiceAreaSettings,
  type SettingsRecord,
} from '../../services/admin/adminSettingsService';
import { stationAdminService } from '../../services/admin/stationAdminService';
import { getApiErrorMessage } from '../../services/apiClient';
import type { StationResponseDto } from '../../types/station';

// Cùng màu với vòng khu vực trên Live Map của Operator (MapServiceAreaLayer).
const AREA_COLOR = '#2563EB';
const NAME_MAX = 100;

const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const ServiceAreaSettingsPage: React.FC = () => {
  const query = useServiceQuery(async () => {
    const [area, stations] = await Promise.all([
      adminSettingsService.getServiceArea(),
      stationAdminService.list({ pageIndex: 1, pageSize: 500 }),
    ]);
    return { area, stations: stations.items };
  }, 'service-area-settings');
  const [flash, setFlash] = useState<NoticeState>(null);

  if (query.error && !query.data) {
    return (
      <div className="p-4 sm:p-6">
        <Notice notice={{ kind: 'error', message: query.error }} />
      </div>
    );
  }
  if (!query.data) return <div className="p-4 sm:p-6 text-sm text-slate-400">Đang tải cấu hình...</div>;

  return (
    <ServiceAreaForm
      key={query.data.area.updatedAt ?? 'default'}
      record={query.data.area}
      stations={query.data.stations}
      initialNotice={flash}
      onSaved={(message) => {
        setFlash({ kind: 'success', message });
        query.reload();
      }}
    />
  );
};

/** Chưa cấu hình (tâm 0,0) → đặt tâm mặc định ở giữa các trạm, không có trạm thì ở Khu Công nghệ cao. */
const initialCenter = (values: ServiceAreaSettings, stations: StationResponseDto[]) => {
  if (values.centerLat !== 0 || values.centerLng !== 0) return { lat: values.centerLat, lng: values.centerLng };
  if (stations.length === 0) return { lat: MAP_CENTER[0], lng: MAP_CENTER[1] };
  return {
    lat: stations.reduce((sum, s) => sum + s.latitude, 0) / stations.length,
    lng: stations.reduce((sum, s) => sum + s.longitude, 0) / stations.length,
  };
};

interface ServiceAreaDraft {
  enabled: boolean;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: string;
}

const toSettings = (d: ServiceAreaDraft): ServiceAreaSettings => ({
  enabled: d.enabled,
  name: d.name.trim(),
  centerLat: Number(d.centerLat.toFixed(6)),
  centerLng: Number(d.centerLng.toFixed(6)),
  radiusKm: toNumber(d.radiusKm),
});

const ServiceAreaForm: React.FC<{
  record: SettingsRecord<ServiceAreaSettings>;
  stations: StationResponseDto[];
  initialNotice: NoticeState;
  onSaved: (message: string) => void;
}> = ({ record, stations, initialNotice, onSaved }) => {
  // Bản nháp ban đầu (chưa cấu hình thì tâm đã được đặt mặc định) — mốc để biết có thay đổi chưa lưu.
  const [initialDraft] = useState<ServiceAreaDraft>(() => {
    const center = initialCenter(record.values, stations);
    return {
      enabled: record.values.enabled,
      name: record.values.name,
      centerLat: center.lat,
      centerLng: center.lng,
      // Ô số giữ dạng chuỗi để gõ dở không bị nhảy.
      radiusKm: String(record.values.radiusKm),
    };
  });
  const [draft, setDraft] = useState(initialDraft);
  const [recenterKey, setRecenterKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(initialNotice);

  const values = toSettings(draft);
  const errors = validateServiceArea(values);
  const dirty = !sameSettings(values, toSettings(initialDraft));
  const canSave = dirty && Object.keys(errors).length === 0;
  useUnsavedChangesGuard(dirty);
  const radiusValid = !errors.radiusKm;

  // Backend chỉ cảnh báo (không chặn) trạm nằm ngoài khu vực → hiện trước để Admin cân nhắc.
  const outsideStations = useMemo(
    () =>
      radiusValid
        ? stations.filter(
          (s) => distanceKm(values.centerLat, values.centerLng, s.latitude, s.longitude) > values.radiusKm
        )
        : [],
    [stations, values.centerLat, values.centerLng, values.radiusKm, radiusValid]
  );

  const set = <K extends keyof ServiceAreaDraft>(key: K, value: ServiceAreaDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await adminSettingsService.updateServiceArea(values);
      onSaved(
        values.enabled
          ? 'Đã lưu khu vực phục vụ. SOS ngoài vùng sẽ được gắn cờ và báo cho Operator / Admin.'
          : 'Đã lưu khu vực phục vụ (đang tắt kiểm tra).'
      );
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
      setSaving(false);
    }
  };

  return (
    <SettingsForm
      updatedAt={record.updatedAt}
      updatedByName={record.updatedByName}
      notice={notice}
      onCloseNotice={() => setNotice(null)}
      dirty={dirty}
      canSave={canSave}
      saving={saving}
      onSave={handleSave}
      onDiscard={() => {
        setDraft(initialDraft);
        setRecenterKey((k) => k + 1);
        setNotice(null);
      }}
    >
      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-red-600"
        />
        <span>
          <span className="block text-sm font-bold text-slate-900">Bật kiểm tra khu vực phục vụ</span>
          <span className="block text-[11px] text-slate-500 mt-0.5">
            Tắt thì không gắn cờ SOS ngoài vùng và không vẽ vòng khu vực trên Live Map.
          </span>
        </span>
      </label>

      <div className="space-y-1.5">
        <label className={labelClass}>Tên khu vực </label>
        <input
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          maxLength={NAME_MAX}
          placeholder="VD: Khu Công nghệ cao TP.HCM"
          className={`${inputClass} ${errors.name ? 'border-red-400' : ''}`}
        />
        {errors.name ? (
          <p className="text-[11px] text-red-600">{errors.name}</p>
        ) : (
          <p className="text-[11px] text-slate-500">Hiện trong cảnh báo cho người dân và thông báo cho Operator.</p>
        )}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Bán kính </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={SERVICE_AREA_RADIUS_KM.min}
            max={SERVICE_AREA_RADIUS_KM.max}
            step={0.5}
            value={radiusValid ? values.radiusKm : SERVICE_AREA_RADIUS_KM.min}
            onChange={(e) => set('radiusKm', e.target.value)}
            aria-label="Bán kính khu vực (km)"
            className="flex-1 accent-red-600"
          />
          <div className="flex items-stretch w-32 shrink-0">
            <input
              type="number"
              inputMode="decimal"
              min={SERVICE_AREA_RADIUS_KM.min}
              max={SERVICE_AREA_RADIUS_KM.max}
              step={0.5}
              value={draft.radiusKm}
              onChange={(e) => set('radiusKm', e.target.value)}
              aria-invalid={!!errors.radiusKm}
              className={`${inputClass} rounded-r-none font-mono-data ${errors.radiusKm ? 'border-red-400' : ''}`}
            />
            <span className="px-3 flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 text-xs text-slate-500">
              km
            </span>
          </div>
        </div>
        {errors.radiusKm ? (
          <p className="text-[11px] text-red-600">{errors.radiusKm}</p>
        ) : (
          <p className="text-[11px] text-slate-500">
            Từ {SERVICE_AREA_RADIUS_KM.min} đến {SERVICE_AREA_RADIUS_KM.max} km.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label className={labelClass}>Tâm khu vực </label>
          <button
            type="button"
            onClick={() => setRecenterKey((k) => k + 1)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-red-600"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            Xem cả khu vực
          </button>
        </div>
        <div className="h-80 rounded-lg overflow-hidden border border-slate-200">
          <StationMapPicker
            lat={draft.centerLat}
            lng={draft.centerLng}
            radiusKm={radiusValid ? values.radiusKm : undefined}
            onChange={(lat, lng) => setDraft((d) => ({ ...d, centerLat: lat, centerLng: lng }))}
            recenterKey={recenterKey}
            color={AREA_COLOR}
            fitToRadius
          />
        </div>
        <p className="text-[11px] text-slate-500">
          Bấm lên bản đồ hoặc kéo chấm đỏ để đặt tâm ·{' '}
          <span className="font-mono-data">
            {draft.centerLat.toFixed(5)}, {draft.centerLng.toFixed(5)}
          </span>
        </p>
        {errors.centerLat && <p className="text-[11px] text-red-600">{errors.centerLat}</p>}
      </div>

      {outsideStations.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Trạm nằm ngoài khu vực: <strong>{outsideStations.map((s) => s.name).join(', ')}</strong>. Vẫn lưu được, nhưng
            nên mở rộng bán kính hoặc dời tâm để các trạm nằm trong vùng phục vụ.
          </span>
        </div>
      )}
    </SettingsForm>
  );
};

export default ServiceAreaSettingsPage;
