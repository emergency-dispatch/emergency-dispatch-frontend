import React, { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import mapboxgl from 'mapbox-gl';
import { MapMarker } from '../livemap/MapMarker';
import { createBaseMapStyle } from '../livemap/MapLayerToggle';
import { stationMarkerHtml, vehicleMarkerHtml } from '../livemap/mapIcons';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import { MAPBOX_ACCESS_TOKEN } from '../../../services/mapboxService';
import type { IncidentCategory } from '../../../types/incident';
import type { VehicleStatus, VehicleType } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';

// Ghim tổ gợi ý dùng màu "Sẵn sàng" của Live Map: tổ được gợi ý luôn là xe đang sẵn sàng.
const CANDIDATE_COLOR = VEHICLE_STATUS_META.available.color;
const SINGLE_POINT_ZOOM = 14;
const MAX_FIT_ZOOM = 15;
// Xe cách trạm dưới ngần này (độ ~ 150 m) coi như đang đậu tại trạm → xếp hàng dưới ghim trạm như Live Map.
const PARKED_THRESHOLD_DEG = 0.0015;
const STACK_SPACING_PX = 24;
// Hàng ghim số dưới ghim trạm (ghim trạm neo đáy, cao ~37 px).
const PARKED_ROW_OFFSET_Y = 16;

export interface MiniMapCandidate {
  vehicleId: string;
  lat: number;
  lng: number;
  stationId: string;
  /** Thứ hạng trong danh sách gợi ý (1, 2, 3…) — số trên ghim khớp số thứ tự bên cạnh. */
  rank: number;
}

export interface MiniMapAssigned {
  vehicleId: string;
  lat: number;
  lng: number;
  type: VehicleType;
  status: VehicleStatus;
}

export interface MiniMapStation {
  id: string;
  lat: number;
  lng: number;
}

interface DispatchMiniMapProps {
  incident: { lat: number; lng: number; category: IncidentCategory; responsibleStationId?: string | null };
  candidates: MiniMapCandidate[];
  assigned: MiniMapAssigned[];
  stations: MiniMapStation[];
  /** Tổ đang được rê chuột / chọn ở danh sách → ghim phóng to. */
  highlightedVehicleId: string | null;
  /** Bấm ghim tổ → tô sáng dòng tương ứng trong danh sách. */
  onSelectCandidate: (vehicleId: string) => void;
}

type LatLng = { lat: number; lng: number };
const isValid = (p: LatLng) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0);

function rankMarkerHtml(rank: number, highlighted: boolean): string {
  const size = highlighted ? 30 : 22;
  const glow = highlighted ? `0 0 0 4px ${CANDIDATE_COLOR}66, 0 2px 6px rgba(15,23,42,.45)` : '0 2px 6px rgba(15,23,42,.45)';
  return `
    <div class="flex items-center justify-center rounded-full border-2 font-bold text-white cursor-pointer"
      style="width:${size}px;height:${size}px;background:${CANDIDATE_COLOR};border-color:#FFFFFF;box-shadow:${glow};font-size:${highlighted ? 14 : 11}px;line-height:1;">
      ${rank}
    </div>
  `;
}

// Ghim hiện trường không kèm huy hiệu cấp độ (số cấp dễ nhầm với số thứ hạng tổ trên cùng bản đồ).
function incidentPinHtml(category: IncidentCategory): string {
  const { color, icon } = INCIDENT_CATEGORY_META[category];
  const svg = renderToStaticMarkup(createElement(icon, { width: 18, height: 18, color: '#FFFFFF', strokeWidth: 2.5 }));
  return `
    <div class="relative flex items-center justify-center" style="width:34px;height:34px;">
      <span class="absolute inset-0 rounded-full animate-ping motion-reduce:animate-none" style="background:${color};opacity:0.45;"></span>
      <div class="relative flex items-center justify-center rounded-full border-2"
        style="width:34px;height:34px;background:${color};border-color:#FFFFFF;box-shadow:0 0 10px 2px ${color}99;">
        ${svg}
      </div>
    </div>
  `;
}

/**
 * Bản đồ nhỏ ở bước "Điều xe" (Hàng đợi) — chỉ để nhìn sơ qua khoảng cách: nền bản đồ đường như Live Map, không tương tác,
 * tự thu phóng vừa hiện trường + trạm của các tổ gợi ý + xe đã giao. Tổ đậu tại trạm xếp hàng dưới ghim trạm.
 */
export const DispatchMiniMap: React.FC<DispatchMiniMapProps> = ({
  incident,
  candidates,
  assigned,
  stations,
  highlightedVehicleId,
  onSelectCandidate,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !MAPBOX_ACCESS_TOKEN || !isValid(incident)) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const instance = new mapboxgl.Map({
      container,
      style: createBaseMapStyle('light'),
      center: [incident.lng, incident.lat],
      zoom: SINGLE_POINT_ZOOM,
      // Chỉ để xem: không kéo, không cuộn zoom, không xoay.
      interactive: false,
      attributionControl: false,
    });
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    instance.on('error', (e) => console.warn('Dispatch mini map notice:', e?.error?.message || e));
    const resizeObserver = new ResizeObserver(() => instance.resize());
    resizeObserver.observe(container);
    setMap(instance);
    return () => {
      resizeObserver.disconnect();
      instance.remove();
      setMap(null);
    };
    // Bản đồ tạo một lần cho mỗi drawer; vị trí sự cố không đổi trong lúc điều xe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stationsById = useMemo(() => new Map(stations.filter(isValid).map((s) => [s.id, s])), [stations]);

  // Vị trí vẽ của từng tổ: đang đậu tại trạm → neo vào trạm, xếp hàng ngang dưới ghim trạm; đang ngoài đường → vị trí GPS.
  const placedCandidates = useMemo(() => {
    const valid = candidates.filter(isValid);
    const groups = new Map<string, { anchor: LatLng; parked: boolean; ids: string[] }>();
    for (const c of valid) {
      const station = stationsById.get(c.stationId);
      const parked =
        !!station &&
        Math.abs(station.lat - c.lat) < PARKED_THRESHOLD_DEG &&
        Math.abs(station.lng - c.lng) < PARKED_THRESHOLD_DEG;
      const anchor = parked && station ? { lat: station.lat, lng: station.lng } : { lat: c.lat, lng: c.lng };
      const key = parked ? `station:${c.stationId}` : `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
      const group = groups.get(key) ?? { anchor, parked, ids: [] };
      group.ids.push(c.vehicleId);
      groups.set(key, group);
    }
    const placed = new Map<string, { anchor: LatLng; offset: [number, number] }>();
    for (const { anchor, parked, ids } of groups.values()) {
      ids.forEach((id, k) =>
        placed.set(id, {
          anchor,
          offset: [Math.round((k - (ids.length - 1) / 2) * STACK_SPACING_PX), parked ? PARKED_ROW_OFFSET_Y : 0],
        })
      );
    }
    return valid.flatMap((c) => {
      const p = placed.get(c.vehicleId);
      return p ? [{ ...c, ...p }] : [];
    });
  }, [candidates, stationsById]);

  // Trạm cần vẽ: trạm của các tổ gợi ý + trạm phụ trách sự cố.
  const visibleStations = useMemo(() => {
    const ids = new Set(candidates.map((c) => c.stationId));
    if (incident.responsibleStationId) ids.add(incident.responsibleStationId);
    return [...ids].flatMap((id) => {
      const s = stationsById.get(id);
      return s ? [s] : [];
    });
  }, [candidates, incident.responsibleStationId, stationsById]);

  const validAssigned = useMemo(() => assigned.filter(isValid), [assigned]);

  // Khung nhìn bao trọn hiện trường + trạm + tổ + xe đã giao; chỉ tính lại khi tập điểm đổi.
  const points: LatLng[] = [...visibleStations, ...placedCandidates.map((c) => c.anchor), ...validAssigned];
  const boundsKey = points
    .map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`)
    .sort()
    .join('|');
  useEffect(() => {
    if (!map) return;
    if (points.length === 0) {
      map.jumpTo({ center: [incident.lng, incident.lat], zoom: SINGLE_POINT_ZOOM });
      return;
    }
    const bounds = new mapboxgl.LngLatBounds([incident.lng, incident.lat], [incident.lng, incident.lat]);
    points.forEach((p) => bounds.extend([p.lng, p.lat]));
    // Đáy chừa thêm chỗ cho hàng ghim số dưới ghim trạm; đỉnh chừa cho ghim trạm.
    map.fitBounds(bounds, {
      padding: { top: 52, bottom: 48, left: 40, right: 40 },
      maxZoom: MAX_FIT_ZOOM,
      duration: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);

  if (!MAPBOX_ACCESS_TOKEN || !isValid(incident)) return null;

  return (
    <figure className="space-y-2">
      <div
        ref={containerRef}
        role="img"
        aria-label={t('incidents.dispatchStep.miniMap.alt')}
        className="aspect-[7/4] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      />
      {map && (
        <>
          {visibleStations.map((s) => (
            <MapMarker
              key={`station-${s.id}`}
              map={map}
              lat={s.lat}
              lng={s.lng}
              anchor="bottom"
              html={stationMarkerHtml(s.id === incident.responsibleStationId)}
              zIndex={1}
            />
          ))}
          {validAssigned.map((v) => (
            <MapMarker
              key={`assigned-${v.vehicleId}`}
              map={map}
              lat={v.lat}
              lng={v.lng}
              html={vehicleMarkerHtml(v.type, v.status, false)}
              zIndex={2}
            />
          ))}
          {placedCandidates.map((c) => {
            const highlighted = c.vehicleId === highlightedVehicleId;
            return (
              <MapMarker
                key={`candidate-${c.vehicleId}`}
                map={map}
                lat={c.anchor.lat}
                lng={c.anchor.lng}
                offset={c.offset}
                html={rankMarkerHtml(c.rank, highlighted)}
                zIndex={highlighted ? 5 : 3}
                onClick={() => onSelectCandidate(c.vehicleId)}
              />
            );
          })}
          <MapMarker map={map} lat={incident.lat} lng={incident.lng} html={incidentPinHtml(incident.category)} zIndex={4} />
        </>
      )}
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: INCIDENT_CATEGORY_META[incident.category].color }} />
          {t('incidents.dispatchStep.miniMap.incident')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" />
          {t('incidents.dispatchStep.miniMap.station')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: CANDIDATE_COLOR }} />
          {t('incidents.dispatchStep.miniMap.candidate')}
        </span>
        {validAssigned.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            {t('incidents.dispatchStep.miniMap.assigned')}
          </span>
        )}
        <span className="ml-auto text-slate-400">{t('incidents.dispatchStep.miniMap.hint')}</span>
      </figcaption>
    </figure>
  );
};
