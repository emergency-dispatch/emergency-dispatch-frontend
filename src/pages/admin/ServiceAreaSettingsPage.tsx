import React, { useMemo, useState } from 'react';
import { AlertTriangle, Circle, FileUp, Hexagon, LocateFixed, RotateCcw } from 'lucide-react';
import { SettingsForm } from '../../components/admin/settings/SettingsForm';
import { sameSettings, toNumber } from '../../components/admin/settings/settingsDraft';
import { StationMapPicker, type MapReferenceArea, type MapReferenceStation } from '../../components/admin/stations/StationMapPicker';
import {
  boundaryCircle,
  boundaryToGeoJson,
  boundaryVertexCount,
  haversineKm,
  isValidBoundary,
  parseBoundary,
  pointInBoundary,
  type PolygonCoords,
} from '../../components/admin/settings/serviceAreaBoundary';
import { createBoundaryDraw, polygonsFromDraw } from '../../components/admin/settings/serviceAreaDraw';
import { ImportBoundaryDialog } from '../../components/admin/settings/ImportBoundaryDialog';
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
import { Trans, useTranslation } from '../../i18n';

// Cùng màu với vòng khu vực trên Live Map của Operator (MapServiceAreaLayer).
const AREA_COLOR = '#2563EB';
const NAME_MAX = 100;

const ServiceAreaSettingsPage: React.FC = () => {
  const { t } = useTranslation();
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
  if (!query.data) return <div className="p-4 sm:p-6 text-sm text-slate-400">{t('admin.common.settings.loading')}</div>;

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
  rejectOutside: boolean;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: string;
  /** §33: hình tròn (tâm + bán kính) hoặc đa giác vẽ trên bản đồ. */
  shape: AreaShape;
  /** Đa giác đang vẽ — giữ cả khi tạm chuyển sang hình tròn để quay lại không mất. */
  polygons: PolygonCoords[];
}

type AreaShape = 'circle' | 'polygon';

/**
 * Đa giác: backend xét trong / ngoài vùng theo đa giác nhưng vẫn bắt buộc tâm + bán kính (hiển thị bản đồ, VD vòng
 * khu vực trên Live Map của Operator) → tự tính vòng bao quanh đa giác. Hình tròn: gửi boundaryGeoJson = null.
 */
const toSettings = (d: ServiceAreaDraft): ServiceAreaSettings => {
  const circle = d.shape === 'polygon' ? boundaryCircle(d.polygons) : null;
  return {
    enabled: d.enabled,
    rejectOutside: d.rejectOutside,
    name: d.name.trim(),
    centerLat: circle?.centerLat ?? Number(d.centerLat.toFixed(6)),
    centerLng: circle?.centerLng ?? Number(d.centerLng.toFixed(6)),
    radiusKm: circle?.radiusKm ?? toNumber(d.radiusKm),
    boundaryGeoJson: d.shape === 'polygon' ? boundaryToGeoJson(d.polygons) : null,
  };
};

const ServiceAreaForm: React.FC<{
  record: SettingsRecord<ServiceAreaSettings>;
  stations: StationResponseDto[];
  initialNotice: NoticeState;
  onSaved: (message: string) => void;
}> = ({ record, stations, initialNotice, onSaved }) => {
  const { t } = useTranslation();
  // Bản nháp ban đầu (chưa cấu hình thì tâm đã được đặt mặc định) — mốc để biết có thay đổi chưa lưu.
  const [initialDraft] = useState<ServiceAreaDraft>(() => {
    const center = initialCenter(record.values, stations);
    const polygons = parseBoundary(record.values.boundaryGeoJson);
    return {
      enabled: record.values.enabled,
      // Backend cũ chưa có trường này → mặc định của backend là từ chối.
      rejectOutside: record.values.rejectOutside ?? true,
      name: record.values.name,
      centerLat: center.lat,
      centerLng: center.lng,
      // Ô số giữ dạng chuỗi để gõ dở không bị nhảy.
      radiusKm: String(record.values.radiusKm),
      shape: polygons.length > 0 ? 'polygon' : 'circle',
      polygons,
    };
  });
  const [draft, setDraft] = useState(initialDraft);
  const [recenterKey, setRecenterKey] = useState(0);
  // Đổi để dựng lại bản đồ vẽ (Hủy thay đổi / Vẽ lại từ đầu) — công cụ vẽ chỉ nạp đa giác lúc khởi tạo.
  const [mapKey, setMapKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(initialNotice);
  const [importOpen, setImportOpen] = useState(false);

  const values = toSettings(draft);
  const errors = validateServiceArea(values);
  const isPolygon = draft.shape === 'polygon';
  const polygonValid = isValidBoundary(draft.polygons);
  const boundaryError = isPolygon && !polygonValid ? t('admin.settings.serviceArea.boundaryRequired') : null;
  const dirty = !sameSettings(values, toSettings(initialDraft));
  const canSave = dirty && Object.keys(errors).length === 0 && !boundaryError;
  useUnsavedChangesGuard(dirty);
  const radiusValid = !errors.radiusKm;
  const circleRadius = toNumber(draft.radiusKm);

  // Chế độ đa giác: vẽ nét đứt vòng tròn đang cấu hình làm mốc khi vẽ.
  const referenceArea = useMemo<MapReferenceArea | null>(
    () =>
      isPolygon && Number.isFinite(circleRadius) && circleRadius > 0
        ? { lat: draft.centerLat, lng: draft.centerLng, radiusKm: circleRadius }
        : null,
    [isPolygon, draft.centerLat, draft.centerLng, circleRadius]
  );

  // Backend chỉ cảnh báo (không chặn) trạm nằm ngoài khu vực → hiện trước để Admin cân nhắc.
  // Đa giác: xét theo đa giác (giống backend), hình tròn: theo tâm + bán kính.
  const outsideStations = useMemo(
    () =>
      isPolygon
        ? polygonValid
          ? stations.filter((s) => !pointInBoundary(s.latitude, s.longitude, draft.polygons))
          : []
        : radiusValid
          ? stations.filter(
            (s) => haversineKm(values.centerLat, values.centerLng, s.latitude, s.longitude) > values.radiusKm
          )
          : [],
    [stations, isPolygon, polygonValid, draft.polygons, values.centerLat, values.centerLng, values.radiusKm, radiusValid]
  );

  // Hiện các trạm (vòng phủ sóng + tên) trên bản đồ để thấy trạm nào lọt ngoài khu vực.
  const referenceStations = useMemo<MapReferenceStation[]>(
    () =>
      stations.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.latitude,
        lng: s.longitude,
        radiusKm: s.coverageRadiusKm,
        inactive: !s.isActive,
      })),
    [stations]
  );

  const set = <K extends keyof ServiceAreaDraft>(key: K, value: ServiceAreaDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await adminSettingsService.updateServiceArea(values);
      onSaved(
        !values.enabled
          ? t('admin.settings.serviceArea.savedDisabled')
          : values.rejectOutside
            ? t('admin.settings.serviceArea.savedReject')
            : t('admin.settings.serviceArea.savedEnabled')
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
        setMapKey((k) => k + 1);
        setNotice(null);
      }}
      aside={
        <>
          <div className="absolute inset-0">
            {/* Đổi hình dạng / vẽ lại → key đổi → dựng lại bản đồ đúng chế độ. */}
            <StationMapPicker
              key={`${draft.shape}-${mapKey}`}
              lat={draft.centerLat}
              lng={draft.centerLng}
              radiusKm={!isPolygon && radiusValid ? values.radiusKm : undefined}
              onChange={(lat, lng) => setDraft((d) => ({ ...d, centerLat: lat, centerLng: lng }))}
              recenterKey={recenterKey}
              color={AREA_COLOR}
              fitToRadius
              referenceArea={referenceArea}
              referenceStations={referenceStations}
              boundary={
                isPolygon
                  ? {
                      polygons: draft.polygons,
                      onChange: (polygons) => setDraft((d) => ({ ...d, polygons })),
                      createDraw: createBoundaryDraw,
                      readPolygons: polygonsFromDraw,
                    }
                  : undefined
              }
            />
          </div>
          {/* Góc trên-trái: tránh nút zoom (trên-phải) và logo/attribution Mapbox (dưới). */}
          <button
            type="button"
            onClick={() => setRecenterKey((k) => k + 1)}
            className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-md ring-1 ring-slate-900/10 hover:text-red-600 transition-colors"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            {t('admin.settings.serviceArea.viewWholeArea')}
          </button>
        </>
      }
    >
      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-red-600"
        />
        <span>
          <span className="block text-sm font-bold text-slate-900">{t('admin.settings.serviceArea.enable')}</span>
          <span className="block text-[11px] text-slate-500 mt-0.5">
            {t('admin.settings.serviceArea.enableHint')}
          </span>
        </span>
      </label>

      {/* §22: xử lý SOS của người dân nằm ngoài khu vực — chỉ có ý nghĩa khi đang bật kiểm tra */}
      <fieldset disabled={!draft.enabled} className={`space-y-1.5 ${draft.enabled ? '' : 'opacity-50'}`}>
        <legend className={`${labelClass} mb-1.5`}>{t('admin.settings.serviceArea.outsideTitle')}</legend>
        {/* Cột form hẹp ở ≥ xl → hai lựa chọn xếp dọc. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
          {([true, false] as const).map((reject) => {
            const active = draft.rejectOutside === reject;
            const key = reject ? 'reject' : 'flag';
            return (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  draft.enabled ? 'cursor-pointer' : 'cursor-not-allowed'
                } ${active ? 'border-red-500 bg-red-50/60' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <input
                  type="radio"
                  name="service-area-outside"
                  checked={active}
                  onChange={() => set('rejectOutside', reject)}
                  className="w-4 h-4 mt-0.5 accent-red-600"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    {t(`admin.settings.serviceArea.outside.${key}`)}
                    {reject && (
                      <span className="ml-1.5 text-[10px] font-mono-data font-semibold text-slate-400">
                        {t('admin.settings.serviceArea.outside.default')}
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {t(`admin.settings.serviceArea.outside.${key}Hint`)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400">{t('admin.settings.serviceArea.outsideNote')}</p>
      </fieldset>

      <div className="space-y-1.5">
        <label className={labelClass}>{t('admin.settings.serviceArea.name')}</label>
        <input
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          maxLength={NAME_MAX}
          placeholder={t('admin.settings.serviceArea.namePlaceholder')}
          className={`${inputClass} ${errors.name ? 'border-red-400' : ''}`}
        />
        {errors.name ? (
          <p className="text-[11px] text-red-600">{errors.name}</p>
        ) : (
          <p className="text-[11px] text-slate-500">{t('admin.settings.serviceArea.nameHint')}</p>
        )}
      </div>

      {/* §33: ranh giới hình tròn (tâm + bán kính) hoặc đa giác vẽ trên bản đồ. */}
      <fieldset className="space-y-1.5">
        <legend className={`${labelClass} mb-1.5`}>{t('admin.settings.serviceArea.shapeTitle')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['circle', 'polygon'] as const).map((shape) => {
            const active = draft.shape === shape;
            const Icon = shape === 'circle' ? Circle : Hexagon;
            return (
              <label
                key={shape}
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  active ? 'border-red-500 bg-red-50/60' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="service-area-shape"
                  checked={active}
                  onChange={() => set('shape', shape)}
                  className="sr-only"
                />
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-red-600' : 'text-slate-400'}`} />
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    {t(`admin.settings.serviceArea.shape.${shape}`)}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {t(`admin.settings.serviceArea.shape.${shape}Hint`)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {isPolygon && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={labelClass}>{t('admin.settings.serviceArea.polygonTitle')}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-bold text-slate-600 hover:border-red-400 hover:text-red-600"
              >
                <FileUp className="w-3.5 h-3.5" />
                {t('admin.settings.serviceArea.import.open')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft((d) => ({ ...d, polygons: [] }));
                  setMapKey((k) => k + 1);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-bold text-slate-600 hover:border-red-400 hover:text-red-600"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('admin.settings.serviceArea.redraw')}
              </button>
            </div>
          </div>
          {importOpen && (
            <ImportBoundaryDialog
              onCancel={() => setImportOpen(false)}
              onImport={(polygons, originalVertices) => {
                setDraft((d) => ({ ...d, polygons }));
                // Công cụ vẽ chỉ nạp đa giác lúc khởi tạo → dựng lại bản đồ; bản đồ tự căn khung vừa đa giác mới.
                setMapKey((k) => k + 1);
                setImportOpen(false);
                setNotice({
                  kind: 'success',
                  message: t('admin.settings.serviceArea.import.done', {
                    parts: polygons.length,
                    before: originalVertices,
                    after: boundaryVertexCount(polygons),
                  }),
                });
              }}
            />
          )}
          {polygonValid ? (
            <p className="font-mono-data text-sm text-slate-800">
              {t('admin.settings.serviceArea.polygonSummary', {
                vertices: boundaryVertexCount(draft.polygons),
                parts: draft.polygons.length,
              })}
            </p>
          ) : (
            <p role="alert" className="text-[11px] font-medium text-red-600">
              {boundaryError}
            </p>
          )}
          <p className="text-[11px] text-slate-500">{t('admin.settings.serviceArea.drawHint')}</p>
          {polygonValid && (
            <p className="text-[11px] text-slate-500">
              {t('admin.settings.serviceArea.derivedCircle', {
                lat: values.centerLat.toFixed(5),
                lng: values.centerLng.toFixed(5),
                km: values.radiusKm,
              })}
            </p>
          )}
        </div>
      )}

      {!isPolygon && (
        <div className="space-y-2">
          <label className={labelClass}>{t('admin.settings.serviceArea.radius')}</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={SERVICE_AREA_RADIUS_KM.min}
              max={SERVICE_AREA_RADIUS_KM.max}
              step={0.5}
              value={radiusValid ? values.radiusKm : SERVICE_AREA_RADIUS_KM.min}
              onChange={(e) => set('radiusKm', e.target.value)}
              aria-label={t('admin.settings.serviceArea.radiusAria')}
              className="flex-1 accent-red-600"
            />
            <div className="flex items-stretch w-28 shrink-0">
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
              {t('admin.settings.serviceArea.radiusRange', SERVICE_AREA_RADIUS_KM)}
            </p>
          )}
        </div>

      )}

      {/* Bản đồ chọn tâm nằm ở cột bên phải (aside) — ở đây chỉ hiện tọa độ đang chọn. */}
      {!isPolygon && (
        <div className="space-y-1.5">
          <span className={labelClass}>{t('admin.settings.serviceArea.center')}</span>
          <p className="font-mono-data text-sm text-slate-800">
            {draft.centerLat.toFixed(5)}, {draft.centerLng.toFixed(5)}
          </p>
          {errors.centerLat ? (
            <p className="text-[11px] text-red-600">{errors.centerLat}</p>
          ) : (
            <p className="text-[11px] text-slate-500">{t('admin.settings.serviceArea.centerHint')}</p>
          )}
        </div>
      )}

      {outsideStations.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <Trans
              i18nKey={
                isPolygon ? 'admin.settings.serviceArea.outsideStationsPolygon' : 'admin.settings.serviceArea.outsideStations'
              }
              values={{ stations: outsideStations.map((s) => s.name).join(', ') }}
              components={{ b: <strong /> }}
            />
          </span>
        </div>
      )}
    </SettingsForm>
  );
};

export default ServiceAreaSettingsPage;
