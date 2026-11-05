import React, { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Building2, CheckCircle2, Clock, Compass, Crown, ExternalLink, Loader2, LocateFixed, MapPin, Radius, Users } from 'lucide-react';
import { MAP_CENTER, VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import { INCIDENT_CATEGORY_META, SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import { MAPBOX_ACCESS_TOKEN } from '../../../services/mapboxService';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { useAuth } from '../../../hooks/useAuth';
import type { Station, Vehicle } from '../../../types/vehicle';
import type { Incident, TrafficJamReport } from '../../../types/incident';
import {
  MAP_VISIBLE_VEHICLE_STATUSES,
  incidentMarkerHtml,
  stationMarkerHtml,
  trafficJamMarkerHtml,
  vehicleMarkerHtml,
} from './mapIcons';
import { MapMarker } from './MapMarker';
import { MapRouteLayer } from './MapRouteLayer';
import { MapServiceAreaLayer } from './MapServiceAreaLayer';
import { MapStationCoverageLayer } from './MapStationCoverageLayer';
import type { ServiceAreaDto } from '../../../services/liveMapService';
import type { DispatchRoute } from '../../../hooks/useDispatchRoutes';
import { MapLegend } from './MapLegend';
import { MapPickLocation, type PickedPoint } from './MapPickLocation';
import { SourceChip } from '../incidents/SourceChip';
import { MapLayerToggle, applyTileMode, createBaseMapStyle, type MapTileMode } from './MapLayerToggle';
import { dateLocale, useTranslation } from '../../../i18n';

// Bán kính gom cụm (px trên màn hình) — các xe nằm gần nhau hơn mức này ở zoom hiện tại sẽ gộp lại.
const MAX_ZOOM = 18;
// Thứ tự lớp marker: sự cố luôn nằm trên xe, xe nằm trên trạm / điểm ùn tắc.
const STATION_Z_INDEX = 1;
const VEHICLE_Z_INDEX = 2;
const INCIDENT_Z_INDEX = 3;

// Nhớ lựa chọn bật/tắt vòng phủ sóng trạm cho lần mở sau (chỉ là tiện ích của từng người xem).
const COVERAGE_STORAGE_KEY = 'resq.liveMap.showStationCoverage';
const readShowCoverage = () => {
  try {
    return localStorage.getItem(COVERAGE_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
};

const boundsOf = (points: Array<{ lat: number; lng: number }>) =>
  points.reduce((b, p) => b.extend([p.lng, p.lat]), new mapboxgl.LngLatBounds());

interface MapCameraControllerProps {
  map: mapboxgl.Map;
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  selectedIncident: Incident | null;
  recenterTrigger: number;
}

/** Owns all camera movement: auto-fly on selection change, plus the manual "locate" button trigger. */
const MapCameraController: React.FC<MapCameraControllerProps> = ({
  map,
  vehicles,
  selectedVehicle,
  selectedIncident,
  recenterTrigger,
}) => {
  useEffect(() => {
    if (selectedVehicle) {
      map.flyTo({ center: [selectedVehicle.lng, selectedVehicle.lat], zoom: Math.max(map.getZoom(), 14), duration: 800 });
    }
    // Fly only when a *different* vehicle is selected, not on every live position tick.
  }, [selectedVehicle?.id]);

  useEffect(() => {
    if (selectedIncident) {
      map.flyTo({ center: [selectedIncident.lng, selectedIncident.lat], zoom: Math.max(map.getZoom(), 15), duration: 800 });
    }
  }, [selectedIncident?.id]);

  useEffect(() => {
    if (recenterTrigger === 0) return;
    if (selectedVehicle) {
      map.flyTo({ center: [selectedVehicle.lng, selectedVehicle.lat], zoom: Math.max(map.getZoom(), 15), duration: 800 });
    } else if (vehicles.length > 0) {
      map.fitBounds(boundsOf(vehicles), { padding: 60, maxZoom: 16, duration: 800 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterTrigger]);

  return null;
};

const PopupRow: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex items-start gap-1.5 text-xs text-slate-600">
    <Icon className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" />
    <span className="min-w-0">{children}</span>
  </div>
);

/** Popup xe (RescueUnit): biển số, loại xe, trạng thái, trạm, tổ phụ trách, nhiệm vụ đang chạy, lần cập nhật vị trí. */
const VehiclePopup: React.FC<{ vehicle: Vehicle; incident?: Incident }> = ({ vehicle, incident }) => {
  const { t } = useTranslation();
  const team = useTeamByVehicle().get(vehicle.id);
  const statusMeta =
    vehicle.unitStatus === 'OutOfService'
      ? { label: t('enums.vehicleStatus.outOfService'), color: '#64748B' }
      : { label: t(`enums.vehicleStatus.${vehicle.status}`), color: VEHICLE_STATUS_META[vehicle.status].color };
  const typeMeta = VEHICLE_TYPE_META[vehicle.type];
  const TypeIcon = typeMeta.icon;
  const leader = team?.members.find((m) => m.crewRole === 'commander');

  return (
    <div className="min-w-[220px] space-y-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('liveMap.map.vehicle')}</p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-sm font-bold text-slate-900 font-mono-data">{vehicle.plate}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{ color: statusMeta.color, backgroundColor: `${statusMeta.color}1A` }}
          >
            {statusMeta.label}
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
          <TypeIcon className="w-3.5 h-3.5 shrink-0" />
          {t(`enums.vehicleType.${vehicle.type}`)} · {t(`enums.teamFunction.${vehicle.type}`)}
        </p>
      </div>

      <div className="space-y-1 pt-1.5 border-t border-slate-100">
        <PopupRow icon={Building2}>{vehicle.stationName}</PopupRow>
        <PopupRow icon={team && leader ? Crown : Users}>
          {team ? (
            <>
              <span className="font-semibold text-slate-800">{team.name}</span>
              {' · '}
              {leader?.fullName ? `${leader.fullName} · ` : ''}
              {t('liveMap.map.teamMembers', { count: team.members.length })}
            </>
          ) : (
            <span className="text-amber-700">{t('liveMap.map.noTeam')}</span>
          )}
        </PopupRow>
        {incident && (
          <PopupRow icon={MapPin}>
            {t('liveMap.map.mission')}
            <span className="font-semibold text-slate-800">{incident.title}</span>
            {vehicle.etaMinutes !== null && (
              <span className="text-red-600 font-semibold">{t('liveMap.map.etaMinutes', { count: vehicle.etaMinutes })}</span>
            )}
          </PopupRow>
        )}
        <PopupRow icon={Clock}>
          {vehicle.incidentId && !vehicle.hasLiveGps
            ? t('liveMap.map.noGps')
            : t('liveMap.map.locationUpdated', {
                time: new Date(vehicle.lastUpdated).toLocaleString(dateLocale(), {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                }),
              })}
        </PopupRow>
      </div>
    </div>
  );
};

const TrafficJamPopup: React.FC<{
  jam: TrafficJamReport;
  onResolve?: (id: string) => Promise<{ ok: boolean; message?: string }>;
}> = ({ jam, onResolve }) => {
  const { t } = useTranslation();
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    if (!onResolve) return;
    setResolving(true);
    setError(null);
    const result = await onResolve(jam.id);
    // Thành công → điểm ùn tắc bị gỡ khỏi bản đồ cùng popup này.
    if (!result.ok) {
      setResolving(false);
      setError(result.message ?? t('liveMap.map.resolveFailed'));
    }
  };

  return (
    <div className="min-w-[200px] space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">{t('liveMap.map.trafficJam')}</p>
      <p className="text-sm font-bold text-slate-900">{jam.area}</p>
      <p className="text-xs text-slate-600">{jam.note}</p>
      <p className="text-[11px] text-slate-400">
        {t('liveMap.map.reportedAt', {
          time: new Date(jam.reportedAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }),
        })}
      </p>
      {onResolve && (
        <button
          onClick={handleResolve}
          disabled={resolving}
          className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors disabled:opacity-60"
        >
          {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          {t('liveMap.map.markResolved')}
        </button>
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
};

// Xe đậu tại trạm xếp hàng ngay dưới ghim trạm (pixel), mỗi hàng tối đa PARKED_PER_ROW xe.
const PARKED_PER_ROW = 4;
const PARKED_SPACING_PX = 26;
const PARKED_TOP_PX = 16;

interface VehicleMarkersProps {
  map: mapboxgl.Map;
  vehicles: Vehicle[];
  placements: Map<string, VehiclePlacement>;
  incidentsById?: Map<string, Incident>;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
}

/** Xe đứng tại trạm, trừ xe đang làm nhiệm vụ đã có GPS thật. Dùng chung cho marker, camera và chỉ đường. */
const isParkedAtStation = (v: Vehicle) => !(v.incidentId && v.hasLiveGps);

/** Vị trí vẽ của một xe: tọa độ + (xe đậu) độ dời pixel để xếp hàng dưới ghim trạm. */
export interface VehiclePlacement {
  lat: number;
  lng: number;
  offset?: [number, number];
}

/** Xe đậu xếp hàng dưới ghim trạm (sắp theo biển số); xe đang chạy có GPS thật đứng tại tọa độ GPS. */
function computeVehiclePlacements(vehicles: Vehicle[], stations: Station[]): Map<string, VehiclePlacement> {
  const stationsById = new Map(stations.map((s) => [s.id, s]));
  const parkedByStation = new Map<string, Vehicle[]>();
  vehicles.forEach((v) => {
    // Đang làm nhiệm vụ mà đã có GPS thật → hiện theo GPS; còn lại (kể cả xe vừa được giao, chưa gửi GPS) đứng tại trạm.
    if (!isParkedAtStation(v) || !stationsById.has(v.stationId)) return;
    parkedByStation.set(v.stationId, [...(parkedByStation.get(v.stationId) ?? []), v]);
  });

  const result = new Map<string, VehiclePlacement>();
  parkedByStation.forEach((parked, stationId) => {
    const station = stationsById.get(stationId)!;
    [...parked]
      .sort((a, b) => a.plate.localeCompare(b.plate))
      .forEach((v, index) => {
        const row = Math.floor(index / PARKED_PER_ROW);
        const inRow = Math.min(PARKED_PER_ROW, parked.length - row * PARKED_PER_ROW);
        const col = index % PARKED_PER_ROW;
        result.set(v.id, {
          lat: station.lat,
          lng: station.lng,
          offset: [(col - (inRow - 1) / 2) * PARKED_SPACING_PX, PARKED_TOP_PX + row * PARKED_SPACING_PX],
        });
      });
  });
  vehicles.forEach((v) => {
    if (!result.has(v.id)) result.set(v.id, { lat: v.lat, lng: v.lng });
  });
  return result;
}

/**
 * Mỗi xe một marker (không gom cụm), icon theo loại xe, màu theo trạng thái.
 * Xe đứng tại trạm của nó, trừ xe đang làm nhiệm vụ đã có GPS thật (hiện theo vị trí GPS).
 */
const VehicleMarkers: React.FC<VehicleMarkersProps> = ({
  map,
  vehicles,
  placements,
  incidentsById,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  return (
    <>
      {vehicles.map((vehicle) => {
        const place = placements.get(vehicle.id)!;
        const isSelected = vehicle.id === selectedVehicleId;
        return (
          <MapMarker
            key={vehicle.id}
            map={map}
            lat={place.lat}
            lng={place.lng}
            offset={place.offset}
            html={vehicleMarkerHtml(vehicle.type, vehicle.status, isSelected)}
            zIndex={isSelected ? VEHICLE_Z_INDEX + 1 : VEHICLE_Z_INDEX}
            popupOffset={isSelected ? 18 : 14}
            onClick={() => onSelectVehicle(vehicle.id)}
          >
            <VehiclePopup vehicle={vehicle} incident={vehicle.incidentId ? incidentsById?.get(vehicle.incidentId) : undefined} />
          </MapMarker>
        );
      })}
    </>
  );
};

interface LiveMapViewProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  dispatchIncidents?: Incident[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
  stations?: Station[];
  trafficJams?: TrafficJamReport[];
  onResolveTrafficJam?: (id: string) => Promise<{ ok: boolean; message?: string }>;
  /** Lộ trình xe đang tới hiện trường. */
  routes?: DispatchRoute[];
  vehiclesById?: Map<string, Vehicle>;
  incidentsById?: Map<string, Incident>;
  /** Khu vực phục vụ (vẽ vòng tròn khi Admin bật). */
  serviceArea?: ServiceAreaDto | null;
  /** Đang tạo sự cố: click bản đồ để đặt ghim hiện trường. */
  pickLocation?: { position: PickedPoint | null; onPick: (point: PickedPoint) => void; flyKey: number } | null;
  /** Sự cố nghi trùng quanh ghim — chưa có trên bản đồ (VD đang chờ duyệt) thì vẽ thêm. */
  nearbyIncidents?: Incident[];
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  dispatchIncidents = [],
  selectedIncidentId = null,
  onSelectIncident,
  stations = [],
  trafficJams = [],
  onResolveTrafficJam,
  routes = [],
  serviceArea = null,
  vehiclesById,
  incidentsById,
  pickLocation = null,
  nearbyIncidents = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [tileMode, setTileMode] = useState<MapTileMode>('satellite');
  const appliedTileModeRef = useRef(tileMode);
  const [recenterCount, setRecenterCount] = useState(0);
  const [is3DMode, setIs3DMode] = useState(true);
  const [showCoverage, setShowCoverage] = useState(readShowCoverage);
  const toggleCoverage = () =>
    setShowCoverage((prev) => {
      try {
        localStorage.setItem(COVERAGE_STORAGE_KEY, prev ? '0' : '1');
      } catch {
        // Trình duyệt chặn storage → chỉ không nhớ được lựa chọn.
      }
      return !prev;
    });

  // Góc nghiêng 2D / 3D như bản đồ Staff (45°); các lần bay camera sau đó giữ nguyên góc đang chọn.
  const handleToggle3D = () => {
    if (!map) return;
    const next = !is3DMode;
    setIs3DMode(next);
    map.easeTo({ pitch: next ? 45 : 0, duration: 600 });
  };

  // Tọa độ xe đúng như đang hiển thị: xe đậu lấy tọa độ trạm (tọa độ trong DB có thể là vị trí cũ / trạm cũ).
  // Camera, nút định vị và chỉ đường Google Maps đều dùng tọa độ này.
  const mapVehicles = useMemo(() => {
    const stationsById = new Map(stations.map((s) => [s.id, s]));
    return vehicles.map((v) => {
      const station = stationsById.get(v.stationId);
      return station && isParkedAtStation(v) ? { ...v, lat: station.lat, lng: station.lng } : v;
    });
  }, [vehicles, stations]);
  // Chỉ vẽ xe đang trên đường tới hiện trường; icon theo loại xe (vehicleMarkerHtml).
  const movingVehicles = useMemo(
    () => mapVehicles.filter((v) => MAP_VISIBLE_VEHICLE_STATUSES.includes(v.status)),
    [mapVehicles]
  );
  const selectedVehicle = movingVehicles.find((v) => v.id === selectedVehicleId) ?? null;
  // Xe không vẽ thì không có vị trí marker → đường đi (VD xe chờ đội xác nhận) bắt đầu từ điểm đầu của tuyến (trạm).
  const placements = useMemo(() => computeVehiclePlacements(movingVehicles, stations), [movingVehicles, stations]);
  const selectedIncident = dispatchIncidents.find((i) => i.id === selectedIncidentId) ?? null;
  const nearbyIds = useMemo(() => new Set(nearbyIncidents.map((i) => i.id)), [nearbyIncidents]);
  const nearbyOffMap = useMemo(() => {
    const onMap = new Set(dispatchIncidents.map((i) => i.id));
    return nearbyIncidents.filter((i) => !onMap.has(i.id));
  }, [nearbyIncidents, dispatchIncidents]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const instance = new mapboxgl.Map({
      container,
      style: createBaseMapStyle(appliedTileModeRef.current),
      center: [MAP_CENTER[1], MAP_CENTER[0]],
      zoom: 14,
      // Mở ở góc nhìn 3D (khớp is3DMode mặc định).
      pitch: 45,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
    });
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    instance.on('error', (e) => console.warn('Live map notice:', e?.error?.message || e));

    // Panel bên phải / Bottom Sheet đổi kích thước → canvas WebGL phải resize theo.
    const resizeObserver = new ResizeObserver(() => instance.resize());
    resizeObserver.observe(container);

    setMap(instance);
    return () => {
      resizeObserver.disconnect();
      instance.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map || appliedTileModeRef.current === tileMode) return;
    appliedTileModeRef.current = tileMode;
    if (map.isStyleLoaded()) applyTileMode(map, tileMode);
    else map.once('style.load', () => applyTileMode(map, appliedTileModeRef.current));
  }, [map, tileMode]);

  const handleOpenDirections = () => {
    if (!selectedVehicle) return;
    const targetIncident = selectedVehicle.incidentId ? incidentsById?.get(selectedVehicle.incidentId) : null;
    const url = targetIncident
      ? `https://www.google.com/maps/dir/?api=1&origin=${selectedVehicle.lat},${selectedVehicle.lng}&destination=${targetIncident.lat},${targetIncident.lng}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${selectedVehicle.lat},${selectedVehicle.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="cad-map h-full w-full" />

      {map && (
        <>
          <MapCameraController
            map={map}
            vehicles={movingVehicles}
            selectedVehicle={selectedVehicle}
            selectedIncident={selectedIncident}
            recenterTrigger={recenterCount}
          />

          <MapStationCoverageLayer
            map={map}
            stations={stations}
            myStationId={user?.stationId ?? null}
            visible={showCoverage}
          />
          <MapServiceAreaLayer map={map} area={serviceArea} />
          <MapRouteLayer map={map} routes={routes} placements={placements} selectedVehicleId={selectedVehicleId} />

          {stations.map((station) => {
            const isMine = station.id === user?.stationId;
            const stationVehicles = vehicles.filter((v) => v.stationId === station.id);
            return (
              <MapMarker
                key={station.id}
                map={map}
                lat={station.lat}
                lng={station.lng}
                anchor="bottom"
                html={stationMarkerHtml(isMine)}
                zIndex={STATION_Z_INDEX}
                popupOffset={40}
              >
                <div className="min-w-[200px] space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {isMine ? t('liveMap.map.myStation') : t('liveMap.map.station')}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{station.name}</p>
                  <p className="text-[11px] text-slate-500">{station.address}</p>
                  <p className="text-[11px] text-slate-600 pt-1">
                    {t('liveMap.map.availableVehicles', {
                      available: stationVehicles.filter((v) => v.status === 'available').length,
                      total: stationVehicles.length,
                    })}
                  </p>
                  {station.coverageRadiusKm > 0 && (
                    <p className="text-[11px] text-slate-500">
                      {t('liveMap.map.coverageRadius', { km: station.coverageRadiusKm })}
                    </p>
                  )}
                </div>
              </MapMarker>
            );
          })}

          {trafficJams.map((jam) => (
            <MapMarker key={jam.id} map={map} lat={jam.lat} lng={jam.lng} html={trafficJamMarkerHtml()} popupOffset={14}>
              <TrafficJamPopup jam={jam} onResolve={onResolveTrafficJam} />
            </MapMarker>
          ))}

          <VehicleMarkers
            map={map}
            vehicles={movingVehicles}
            placements={placements}
            incidentsById={incidentsById}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={onSelectVehicle}
          />

          {dispatchIncidents.map((incident) => {
            const severityMeta = SEVERITY_LEVEL_META[incident.severity];
            const category = INCIDENT_CATEGORY_META[incident.category];
            const isSelected = incident.id === selectedIncidentId || nearbyIds.has(incident.id);
            const assigned = incident.assignedVehicleIds
              .map((id) => vehiclesById?.get(id))
              .filter((v): v is Vehicle => !!v);

            return (
              <MapMarker
                key={incident.id}
                map={map}
                lat={incident.lat}
                lng={incident.lng}
                html={incidentMarkerHtml(incident.category, incident.severity, isSelected)}
                zIndex={INCIDENT_Z_INDEX}
                popupOffset={isSelected ? 20 : 16}
                onClick={() => onSelectIncident?.(incident.id)}
              >
                <div className="min-w-[200px] space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: category.color }}>
                      {t(`enums.category.${incident.category}`)}
                    </span>
                    <SourceChip source={incident.source} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">{incident.title}</p>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityMeta.badgeClass}`}
                  >
                    {t(`enums.severity.level${incident.severity}`)}
                  </span>
                  <p className="text-xs text-slate-600">{incident.area}</p>
                  {assigned.length > 0 ? (
                    assigned.map((v) => (
                      <p key={v.id} className="text-xs text-red-600 font-semibold">
                        {t('liveMap.map.vehicleEta', { plate: v.plate, eta: v.etaMinutes ?? '--' })}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-amber-600 font-semibold">{t('liveMap.map.noVehicle')}</p>
                  )}
                </div>
              </MapMarker>
            );
          })}

          {nearbyOffMap.map((incident) => (
            <MapMarker
              key={`nearby-${incident.id}`}
              map={map}
              lat={incident.lat}
              lng={incident.lng}
              html={incidentMarkerHtml(incident.category, incident.severity, true)}
              zIndex={INCIDENT_Z_INDEX}
              popupOffset={20}
            >
              <div className="min-w-[200px] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  {t('liveMap.create.pendingIncident')}
                </span>
                <p className="text-sm font-bold text-slate-900">{incident.title}</p>
                <p className="text-xs text-slate-600">{incident.area}</p>
              </div>
            </MapMarker>
          ))}

          {pickLocation && (
            <MapPickLocation
              map={map}
              position={pickLocation.position}
              onPick={pickLocation.onPick}
              flyKey={pickLocation.flyKey}
            />
          )}
        </>
      )}

      {pickLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none max-w-[calc(100%-8rem)]">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 text-white text-xs font-semibold shadow-lg">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">{t('liveMap.create.pickHint')}</span>
          </div>
        </div>
      )}

      <MapLegend />

      <div className="absolute top-4 left-4 z-[1000]">
        <MapLayerToggle mode={tileMode} onChange={setTileMode} />
      </div>

      {/* Camera / layer / external navigation controls — mirrors the Staff field map's control set. */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setRecenterCount((v) => v + 1)}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-red-600 shadow-md transition-all active:scale-95"
          title={selectedVehicle ? t('liveMap.map.recenterSelected') : t('liveMap.map.recenterAll')}
          aria-label={t('liveMap.map.recenter')}
        >
          <LocateFixed className="w-5 h-5" />
        </button>

        <button
          onClick={handleToggle3D}
          aria-pressed={is3DMode}
          className={`p-2.5 rounded-xl border shadow-md transition-all active:scale-95 ${
            is3DMode
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
          title={is3DMode ? t('liveMap.layers.view2d') : t('liveMap.layers.view3d')}
          aria-label={is3DMode ? t('liveMap.layers.view2d') : t('liveMap.layers.view3d')}
        >
          <Compass className={`w-5 h-5 transition-transform ${is3DMode ? 'rotate-45' : ''}`} />
        </button>

        <button
          onClick={toggleCoverage}
          aria-pressed={showCoverage}
          className={`p-2.5 rounded-xl border shadow-md transition-all active:scale-95 ${
            showCoverage
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
          title={showCoverage ? t('liveMap.map.hideCoverage') : t('liveMap.map.showCoverage')}
          aria-label={showCoverage ? t('liveMap.map.hideCoverage') : t('liveMap.map.showCoverage')}
        >
          <Radius className="w-5 h-5" />
        </button>

        <button
          onClick={handleOpenDirections}
          disabled={!selectedVehicle}
          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 border border-red-600 disabled:border-slate-200 text-white shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100"
          title={selectedVehicle ? t('liveMap.map.directions') : t('liveMap.map.directionsNeedVehicle')}
          aria-label={t('liveMap.map.directions')}
        >
          <ExternalLink className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
