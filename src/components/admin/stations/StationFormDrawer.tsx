import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocateFixed, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { AddressSearchField } from './AddressSearchField';
import { HeadOperatorField } from './HeadOperatorField';
import { StationMapPicker, type MapReferenceArea, type MapReferenceStation } from './StationMapPicker';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { useMediaQuery, useServiceQuery } from '../common/hooks';
import { adminSettingsService } from '../../../services/admin/adminSettingsService';
import { inputClass, labelClass, validatedInputClass } from '../common/styles';
import { MAP_CENTER } from '../fleetMeta';
import { HOTLINE_PATTERN, stationAdminService } from '../../../services/admin/stationAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { mapboxService } from '../../../services/mapboxService';
import {
  COVERAGE_RADIUS_KM,
  STATION_CODE_MAX,
  STATION_CODE_PATTERN,
  type StationResponseDto,
  type StationUpsertDto,
} from '../../../types/station';
import { useTranslation } from '../../../i18n';

interface StationFormDrawerProps {
  initialStation: StationResponseDto | null;
  onClose: () => void;
  onSaved: (station: StationResponseDto) => void;
}

// Giới hạn độ dài khớp validation của CreateStationDto / UpdateStationDto.
const NAME_MAX = 200;
const ADDRESS_MAX = 500;

// Khớp breakpoint `xl` của Tailwind (DrawerShell chỉ hiện panel phụ từ xl): đủ chỗ cho bản đồ lớn
// giữa sidebar Admin (≤ 16rem) và drawer (32rem).
const WIDE_QUERY = '(min-width: 1280px)';

/** Nút nổi trên bản đồ (góc trên trái — góc phải đã có nút +/− của Mapbox). */
const mapOverlayButtonClass =
  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 border border-slate-200 shadow-md text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900';

export const StationFormDrawer: React.FC<StationFormDrawerProps> = ({ initialStation, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    code: initialStation?.code ?? '',
    name: initialStation?.name ?? '',
    address: initialStation?.address ?? '',
    latitude: initialStation?.latitude ?? MAP_CENTER[0],
    longitude: initialStation?.longitude ?? MAP_CENTER[1],
    phoneNumber: initialStation?.phoneNumber ?? '',
    isActive: initialStation?.isActive ?? true,
    // Ô số giữ dạng chuỗi để gõ dở không bị nhảy.
    coverageRadiusKm: String(initialStation?.coverageRadiusKm ?? COVERAGE_RADIUS_KM.default),
  });
  const [headOperatorId, setHeadOperatorId] = useState<string | null>(initialStation?.headOperatorId ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMiss, setGeocodeMiss] = useState(false);
  // Chỉ nhận kết quả của lần bấm bản đồ mới nhất (bấm liên tục thì các yêu cầu cũ có thể về sau).
  const geocodeSeq = useRef(0);
  const [recenterKey, setRecenterKey] = useState(0);
  // Màn rộng: bản đồ lớn nằm giữa sidebar và drawer. Màn hẹp: bản đồ trong drawer + nút phóng to.
  const isWide = useMediaQuery(WIDE_QUERY);
  const [expanded, setExpanded] = useState(false);
  const showExpanded = expanded && !isWide;

  // Lớp tham chiếu trên bản đồ: khu vực phục vụ + các trạm khác (như Live Map của Operator).
  // Lỗi tải thì bỏ qua — chỉ là thông tin phụ, không chặn việc nhập form.
  const references = useServiceQuery(async () => {
    const [area, stations] = await Promise.all([
      adminSettingsService.getServiceArea().catch(() => null),
      stationAdminService.list({ pageIndex: 1, pageSize: 500 }).catch(() => null),
    ]);
    return { area: area?.values ?? null, stations: stations?.items ?? [] };
  }, 'station-form-references');
  const referenceArea = useMemo<MapReferenceArea | null>(() => {
    const area = references.data?.area;
    // Tâm 0,0 = chưa cấu hình (xem ServiceAreaSettingsPage).
    if (!area || !area.enabled || area.radiusKm <= 0 || (area.centerLat === 0 && area.centerLng === 0)) return null;
    return { lat: area.centerLat, lng: area.centerLng, radiusKm: area.radiusKm };
  }, [references.data]);
  const referenceStations = useMemo<MapReferenceStation[]>(
    () =>
      (references.data?.stations ?? [])
        .filter((s) => s.id !== initialStation?.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          lat: s.latitude,
          lng: s.longitude,
          radiusKm: s.coverageRadiusKm,
          inactive: !s.isActive,
        })),
    [references.data, initialStation?.id]
  );
  const hasInactiveStation = referenceStations.some((s) => s.inactive);

  useEffect(() => {
    if (!showExpanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showExpanded]);

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
  // §23 Mã trạm: kiểm tra định dạng + trùng với trạm khác ngay khi gõ (backend vẫn kiểm tra lại, trả 400).
  const code = form.code.trim().toUpperCase();
  const otherStations = (references.data?.stations ?? []).filter((s) => s.id !== initialStation?.id);
  const codeError = !code
    ? null
    : !STATION_CODE_PATTERN.test(code)
      ? t('admin.stations.form.codeInvalid')
      : otherStations.some((s) => s.code?.toUpperCase() === code)
        ? t('admin.stations.form.codeDuplicate', { code })
        : null;
  const trimmedName = form.name.trim();
  const nameError =
    trimmedName && otherStations.some((s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase())
      ? t('admin.stations.form.nameDuplicate', { name: trimmedName })
      : null;
  const canSubmit =
    trimmedName.length > 0 && form.address.trim().length > 0 && hotlineValid && radiusValid && !codeError && !nameError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const body: StationUpsertDto = {
      code: code || null,
      name: form.name.trim(),
      address: form.address.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      phoneNumber: hotline,
      isActive: form.isActive,
      coverageRadiusKm: radiusKm,
      headOperatorId,
    };
    try {
      onSaved(
        initialStation
          ? await stationAdminService.update(initialStation.id, body)
          : await stationAdminService.create(body)
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  // Mỗi lúc chỉ mount một bản đồ (panel lớn / bản phóng to / trong drawer) để không tải Mapbox hai lần.
  const mapPicker = (
    <StationMapPicker
      lat={form.latitude}
      lng={form.longitude}
      radiusKm={radiusValid ? radiusKm : undefined}
      onChange={handlePickLocation}
      recenterKey={recenterKey}
      referenceArea={referenceArea}
      referenceStations={referenceStations}
    />
  );
  // Chú thích màu (khớp màu trong StationMapPicker / Live Map của Operator).
  const legendRow = (swatch: string, label: string) => (
    <div className="flex items-center gap-2">
      <span className={`w-5 shrink-0 border-t-2 ${swatch}`} />
      <span>{label}</span>
    </div>
  );
  const mapLegend = (
    <div className="absolute bottom-2.5 right-2.5 space-y-1 rounded-lg bg-white/95 border border-slate-200 shadow-md px-3 py-2 text-[11px] text-slate-700">
      {legendRow('border-red-600', t('admin.stations.form.legend.thisStation'))}
      {referenceStations.length > 0 && legendRow('border-violet-600', t('admin.stations.form.legend.otherStations'))}
      {hasInactiveStation && legendRow('border-slate-500', t('admin.stations.form.legend.inactiveStations'))}
      {referenceArea && legendRow('border-dashed border-blue-600', t('admin.stations.form.legend.serviceArea'))}
    </div>
  );
  const coordinates = `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`;
  const recenterButton = (
    <button type="button" onClick={() => setRecenterKey((k) => k + 1)} className={mapOverlayButtonClass}>
      <LocateFixed className="w-3.5 h-3.5" />
      {t('admin.stations.form.recenter')}
    </button>
  );

  // Khung bản đồ lớn: dùng cho panel giữa màn (≥ xl) và chế độ phóng to (màn hẹp).
  const renderMapCard = (headerAction?: React.ReactNode) => (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/30 overflow-hidden">
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-3 border-b border-slate-200">
        <div className="min-w-0 space-y-0.5">
          <p className={labelClass}>{t('admin.stations.form.location')} *</p>
          <p className="text-[11px] text-slate-500">{t('admin.stations.form.locationHint')}</p>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          {geocoding ? (
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('admin.stations.form.geocoding')}
            </span>
          ) : (
            <span className="text-[11px] font-mono-data text-slate-500">{coordinates}</span>
          )}
          {headerAction}
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        {mapPicker}
        <div className="absolute top-2.5 left-2.5">{recenterButton}</div>
        {mapLegend}
      </div>
    </div>
  );

  return (
    <DrawerShell
      title={initialStation ? t('admin.stations.form.editTitle') : t('admin.stations.form.addTitle')}
      onClose={onClose}
      onSubmit={handleSubmit}
      aside={isWide ? renderMapCard() : undefined}
      footer={
        <DrawerFooter onCancel={onClose} submitLabel={t('admin.stations.form.save')} submitting={submitting} canSubmit={canSubmit} />
      }
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      <div className="grid grid-cols-[9rem_1fr] gap-3 items-start">
        <FormField
          label={t('admin.stations.form.code')}
          error={codeError}
          hint={initialStation ? t('admin.stations.form.codeHintEdit') : t('admin.stations.form.codeHintCreate')}
        >
          <input
            value={form.code}
            onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
            maxLength={STATION_CODE_MAX}
            placeholder={initialStation?.code || t('admin.stations.form.codePlaceholder')}
            aria-invalid={!!codeError}
            className={`${validatedInputClass(!!codeError)} font-mono-data uppercase`}
          />
        </FormField>
        <FormField label={t('admin.stations.form.name')} required error={nameError}>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            maxLength={NAME_MAX}
            required
            aria-invalid={!!nameError}
            className={validatedInputClass(!!nameError)}
          />
        </FormField>
      </div>

      <FormField
        label={t('admin.stations.form.address')}
        required
        hint={geocodeMiss ? t('admin.stations.form.addressNotFound') : t('admin.stations.form.addressHint')}
      >
        <AddressSearchField
          value={form.address}
          onChange={(value) => set('address', value)}
          onPick={(s) => {
            // Hủy kết quả tra ngược đang chờ (nếu có) để không ghi đè địa chỉ vừa chọn.
            geocodeSeq.current++;
            setGeocoding(false);
            setGeocodeMiss(false);
            setForm((f) => ({ ...f, address: s.label.slice(0, ADDRESS_MAX), latitude: s.lat, longitude: s.lng }));
            setRecenterKey((k) => k + 1);
          }}
          maxLength={ADDRESS_MAX}
          disabled={geocoding}
          placeholder={geocoding ? t('admin.stations.form.geocoding') : undefined}
        />
        {geocoding && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('admin.stations.form.geocodingFromMap')}
          </p>
        )}
      </FormField>

      <FormField
        label={t('admin.stations.form.hotline')}
        required
        hint={form.phoneNumber && !hotlineValid ? t('admin.stations.form.hotlineInvalid') : undefined}
      >
        <input
          value={form.phoneNumber}
          onChange={(e) => set('phoneNumber', e.target.value)}
          inputMode="tel"
          placeholder={t('admin.stations.form.hotlinePlaceholder')}
          className={inputClass}
        />
      </FormField>

      <FormField
        label={t('admin.stations.form.radius')}
        required
        hint={t(radiusValid ? 'admin.stations.form.radiusHint' : 'admin.stations.form.radiusInvalid', {
          min: COVERAGE_RADIUS_KM.min,
          max: COVERAGE_RADIUS_KM.max,
        })}
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
        {t('admin.stations.form.isActive')}
      </label>

      <HeadOperatorField station={initialStation} value={headOperatorId} onChange={setHeadOperatorId} />

      <FormField
        label={t('admin.stations.form.location')}
        required
        hint={t(isWide ? 'admin.stations.form.locationOnSidePanel' : 'admin.stations.form.locationHint')}
      >
        {isWide ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-600">
            <LocateFixed className="w-3.5 h-3.5 shrink-0 text-red-600" />
            <span className="font-mono-data">{coordinates}</span>
          </div>
        ) : (
          <>
            <div className="relative h-80 rounded-lg overflow-hidden border border-slate-200">
              {showExpanded ? (
                <div className="h-full flex items-center justify-center px-4 text-center bg-slate-50 text-xs text-slate-500">
                  {t('admin.stations.form.expandedPlaceholder')}
                </div>
              ) : (
                <>
                  {mapPicker}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setExpanded(true)} className={mapOverlayButtonClass}>
                      <Maximize2 className="w-3.5 h-3.5" />
                      {t('admin.stations.form.expandMap')}
                    </button>
                    {recenterButton}
                  </div>
                </>
              )}
            </div>
            <p className="text-[11px] font-mono-data text-slate-500">{coordinates}</p>
          </>
        )}
        {showExpanded &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('admin.stations.form.location')}
              className="fixed inset-0 z-[1450] flex flex-col bg-black/60 p-3 sm:p-6"
            >
              {renderMapCard(
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  {t('admin.stations.form.collapseMap')}
                </button>
              )}
            </div>,
            document.body
          )}
      </FormField>
    </DrawerShell>
  );
};
