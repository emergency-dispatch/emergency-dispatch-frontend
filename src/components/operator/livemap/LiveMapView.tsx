import React, { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Building2, CheckCircle2, Clock, Crown, ExternalLink, Loader2, LocateFixed, MapPin, Users } from 'lucide-react';
import { MAP_CENTER, VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import { INCIDENT_CATEGORY_META, SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import { MAPBOX_ACCESS_TOKEN } from '../../../services/mapboxService';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { useAuth } from '../../../hooks/useAuth';
import { TEAM_FUNCTION_META } from '../teams/teamFunction';
import type { Station, Vehicle } from '../../../types/vehicle';
import type { Incident, TrafficJamReport } from '../../../types/incident';
import {
  incidentMarkerHtml,
  stationMarkerHtml,
  trafficJamMarkerHtml,
  vehicleMarkerHtml,
} from './mapIcons';
import { MapMarker } from './MapMarker';
import { MapRouteLayer } from './MapRouteLayer';
import { MapServiceAreaLayer } from './MapServiceAreaLayer';
import type { ServiceAreaDto } from '../../../services/liveMapService';
import type { DispatchRoute } from '../../../hooks/useDispatchRoutes';
import { MapLegend } from './MapLegend';
import { MapLayerToggle, applyTileMode, createBaseMapStyle, type MapTileMode } from './MapLayerToggle';

// Bán kính gom cụm (px trên màn hình) — các xe nằm gần nhau hơn mức này ở zoom hiện tại sẽ gộp lại.
const MAX_ZOOM = 18;
// Thứ tự lớp marker: sự cố luôn nằm trên xe, xe nằm trên trạm / điểm ùn tắc.
const STATION_Z_INDEX = 1;
const VEHICLE_Z_INDEX = 2;
const INCIDENT_Z_INDEX = 3;

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
  const team = useTeamByVehicle().get(vehicle.id);
  const statusMeta =
    vehicle.unitStatus === 'OutOfService' ? { label: 'Ngừng hoạt động', color: '#64748B' } : VEHICLE_STATUS_META[vehicle.status];
  const typeMeta = VEHICLE_TYPE_META[vehicle.type];
  const TypeIcon = typeMeta.icon;
  const fn = TEAM_FUNCTION_META[vehicle.type];
  const leader = team?.members.find((m) => m.crewRole === 'commander');

  return (
    <div className="min-w-[220px] space-y-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Phương tiện cứu hộ</p>
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
          {typeMeta.label} · {fn.label}
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
              {team.members.length} người
            </>
          ) : (
            <span className="text-amber-700">Chưa có tổ phụ trách — chưa điều động được</span>
          )}
        </PopupRow>
        {incident && (
          <PopupRow icon={MapPin}>
            Nhiệm vụ: <span className="font-semibold text-slate-800">{incident.title}</span>
            {vehicle.etaMinutes !== null && <span className="text-red-600 font-semibold"> · ETA {vehicle.etaMinutes} phút</span>}
          </PopupRow>
        )}
        <PopupRow icon={Clock}>
          {vehicle.incidentId && !vehicle.hasLiveGps
            ? 'Chưa nhận GPS từ đội — đang hiển thị tại trạm'
            : `Cập nhật vị trí ${new Date(vehicle.lastUpdated).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
              })}`}
        </PopupRow>
      </div>
    </div>
  );
};

const TrafficJamPopup: React.FC<{
  jam: TrafficJamReport;
  onResolve?: (id: string) => Promise<{ ok: boolean; message?: string }>;
}> = ({ jam, onResolve }) => {
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
      setError(result.message ?? 'Không thể giải tỏa điểm ùn tắc.');
    }
  };

  return (
    <div className="min-w-[200px] space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Ùn tắc giao thông</p>
      <p className="text-sm font-bold text-slate-900">{jam.area}</p>
      <p className="text-xs text-slate-600">{jam.note}</p>
      <p className="text-[11px] text-slate-400">
        Báo lúc {new Date(jam.reportedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
      </p>
      {onResolve && (
        <button
          onClick={handleResolve}
          disabled={resolving}
          className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors disabled:opacity-60"
        >
          {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Đánh dấu đã giải tỏa
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [tileMode, setTileMode] = useState<MapTileMode>('satellite');
  const appliedTileModeRef = useRef(tileMode);
  const [recenterCount, setRecenterCount] = useState(0);

  // Tọa độ xe đúng như đang hiển thị: xe đậu lấy tọa độ trạm (tọa độ trong DB có thể là vị trí cũ / trạm cũ).
  // Camera, nút định vị và chỉ đường Google Maps đều dùng tọa độ này.
  const mapVehicles = useMemo(() => {
    const stationsById = new Map(stations.map((s) => [s.id, s]));
    return vehicles.map((v) => {
      const station = stationsById.get(v.stationId);
      return station && isParkedAtStation(v) ? { ...v, lat: station.lat, lng: station.lng } : v;
    });
  }, [vehicles, stations]);
  const selectedVehicle = mapVehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const placements = useMemo(() => computeVehiclePlacements(mapVehicles, stations), [mapVehicles, stations]);
  const selectedIncident = dispatchIncidents.find((i) => i.id === selectedIncidentId) ?? null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const instance = new mapboxgl.Map({
      container,
      style: createBaseMapStyle(appliedTileModeRef.current),
      center: [MAP_CENTER[1], MAP_CENTER[0]],
      zoom: 14,
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
            vehicles={mapVehicles}
            selectedVehicle={selectedVehicle}
            selectedIncident={selectedIncident}
            recenterTrigger={recenterCount}
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
                    {isMine ? 'Trạm bạn phụ trách' : 'Trạm cứu hộ'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{station.name}</p>
                  <p className="text-[11px] text-slate-500">{station.address}</p>
                  <p className="text-[11px] text-slate-600 pt-1">
                    {stationVehicles.filter((v) => v.status === 'available').length}/{stationVehicles.length} xe sẵn sàng
                  </p>
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
            vehicles={mapVehicles}
            placements={placements}
            incidentsById={incidentsById}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={onSelectVehicle}
          />

          {dispatchIncidents.map((incident) => {
            const severityMeta = SEVERITY_LEVEL_META[incident.severity];
            const category = INCIDENT_CATEGORY_META[incident.category];
            const isSelected = incident.id === selectedIncidentId;
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
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: category.color }}>
                    {category.label}
                  </span>
                  <p className="text-sm font-bold text-slate-900">{incident.title}</p>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityMeta.badgeClass}`}
                  >
                    {severityMeta.label}
                  </span>
                  <p className="text-xs text-slate-600">{incident.area}</p>
                  {assigned.length > 0 ? (
                    assigned.map((v) => (
                      <p key={v.id} className="text-xs text-red-600 font-semibold">
                        {v.plate} · ETA {v.etaMinutes ?? '--'} phút
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-amber-600 font-semibold">Chưa giao xe</p>
                  )}
                </div>
              </MapMarker>
            );
          })}
        </>
      )}

      <MapLegend />

      {/* Camera / layer / external navigation controls — mirrors the Staff field map's control set. */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setRecenterCount((v) => v + 1)}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-red-600 shadow-md transition-all active:scale-95"
          title={selectedVehicle ? 'Định vị lại vị trí xe đã chọn' : 'Định vị tất cả xe trong khung nhìn'}
          aria-label="Định vị vị trí xe"
        >
          <LocateFixed className="w-5 h-5" />
        </button>

        <MapLayerToggle mode={tileMode} onChange={setTileMode} />

        <button
          onClick={handleOpenDirections}
          disabled={!selectedVehicle}
          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 border border-red-600 disabled:border-slate-200 text-white shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100"
          title={selectedVehicle ? 'Mở chỉ đường Google Maps' : 'Chọn 1 xe trước để mở chỉ đường'}
          aria-label="Mở chỉ đường Google Maps"
        >
          <ExternalLink className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
