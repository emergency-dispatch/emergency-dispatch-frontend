import React, { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Building2, CheckCircle2, Clock, ExternalLink, Loader2, LocateFixed } from 'lucide-react';
import { MAP_CENTER, VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import { INCIDENT_CATEGORY_META, SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import { MAPBOX_ACCESS_TOKEN } from '../../../services/mapboxService';
import type { Station, Vehicle } from '../../../types/vehicle';
import type { Incident, TrafficJamReport } from '../../../types/incident';
import {
  clusterMarkerHtml,
  incidentMarkerHtml,
  stationMarkerHtml,
  trafficJamMarkerHtml,
  vehicleMarkerHtml,
} from './mapIcons';
import { MapMarker } from './MapMarker';
import { MapLegend } from './MapLegend';
import { MapLayerToggle, applyTileMode, createBaseMapStyle, type MapTileMode } from './MapLayerToggle';

// Bán kính gom cụm (px trên màn hình) — các xe nằm gần nhau hơn mức này ở zoom hiện tại sẽ gộp lại.
const CLUSTER_RADIUS_PX = 36;
const MAX_ZOOM = 18;
// Thứ tự lớp marker: sự cố luôn nằm trên xe, xe nằm trên trạm / điểm ùn tắc.
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

const VehiclePopup: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const statusMeta = VEHICLE_STATUS_META[vehicle.status];
  const typeMeta = VEHICLE_TYPE_META[vehicle.type];
  const TypeIcon = typeMeta.icon;

  return (
    <div className="min-w-[180px] space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-900 font-mono-data">{vehicle.plate}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{ color: statusMeta.color, backgroundColor: `${statusMeta.color}1A` }}
        >
          {statusMeta.label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <TypeIcon className="w-3.5 h-3.5 shrink-0" />
        <span>{typeMeta.label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span>{vehicle.stationName}</span>
      </div>
      {vehicle.etaMinutes !== null && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>ETA {vehicle.etaMinutes} phút</span>
        </div>
      )}
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

interface ClusteredVehicleMarkersProps {
  map: mapboxgl.Map;
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
}

/** Gom cụm marker xe theo khoảng cách pixel ở mức zoom hiện tại; bấm cụm để phóng to. */
const ClusteredVehicleMarkers: React.FC<ClusteredVehicleMarkersProps> = ({
  map,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  const [zoom, setZoom] = useState(() => map.getZoom());
  useEffect(() => {
    const handleZoomEnd = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  const groups = useMemo(() => {
    const result: Array<{ center: mapboxgl.Point; members: Vehicle[] }> = [];
    for (const vehicle of vehicles) {
      // Khoảng cách pixel giữa các xe chỉ phụ thuộc mức zoom, không phụ thuộc vị trí khung nhìn.
      const point = map.project([vehicle.lng, vehicle.lat]);
      // Xe đang chọn luôn đứng riêng để không bị "nuốt" vào cụm.
      const group =
        vehicle.id === selectedVehicleId
          ? undefined
          : result.find(
              (g) => !g.members.some((m) => m.id === selectedVehicleId) && g.center.dist(point) < CLUSTER_RADIUS_PX
            );
      if (group) group.members.push(vehicle);
      else result.push({ center: point, members: [vehicle] });
    }
    return result;
    // map.project() đọc zoom hiện tại của map — `zoom` có trong deps để gom cụm lại sau mỗi lần zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, zoom, selectedVehicleId, map]);

  return (
    <>
      {groups.map((group) => {
        if (group.members.length === 1) {
          const vehicle = group.members[0];
          const isSelected = vehicle.id === selectedVehicleId;
          return (
            <MapMarker
              key={vehicle.id}
              map={map}
              lat={vehicle.lat}
              lng={vehicle.lng}
              html={vehicleMarkerHtml(vehicle.type, vehicle.status, isSelected)}
              zIndex={VEHICLE_Z_INDEX}
              popupOffset={isSelected ? 18 : 14}
              onClick={() => onSelectVehicle(vehicle.id)}
            >
              <VehiclePopup vehicle={vehicle} />
            </MapMarker>
          );
        }

        const bounds = boundsOf(group.members);
        const center = bounds.getCenter();
        const atMaxZoom = zoom >= MAX_ZOOM - 1;
        return (
          <MapMarker
            key={`cluster-${group.members.map((v) => v.id).join('-')}-${atMaxZoom ? 'max' : 'zoom'}`}
            map={map}
            lat={center.lat}
            lng={center.lng}
            html={clusterMarkerHtml(group.members.length)}
            zIndex={VEHICLE_Z_INDEX}
            popupOffset={20}
            onClick={() => {
              if (!atMaxZoom) map.fitBounds(bounds, { padding: 80, maxZoom: MAX_ZOOM, duration: 600 });
            }}
          >
            {atMaxZoom && (
              <div className="space-y-1">
                {group.members.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onSelectVehicle(v.id)}
                    className="block w-full text-left text-xs font-mono-data font-bold text-slate-800 hover:text-red-600"
                  >
                    {v.plate} · {VEHICLE_STATUS_META[v.status].label}
                  </button>
                ))}
              </div>
            )}
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
  vehiclesById?: Map<string, Vehicle>;
  incidentsById?: Map<string, Incident>;
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
  vehiclesById,
  incidentsById,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [tileMode, setTileMode] = useState<MapTileMode>('light');
  const appliedTileModeRef = useRef(tileMode);
  const [recenterCount, setRecenterCount] = useState(0);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
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
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            selectedIncident={selectedIncident}
            recenterTrigger={recenterCount}
          />

          {stations.map((station) => (
            <MapMarker
              key={station.id}
              map={map}
              lat={station.lat}
              lng={station.lng}
              html={stationMarkerHtml()}
              popupOffset={10}
            >
              <div className="text-xs font-semibold text-slate-900">{station.name}</div>
              <div className="text-[11px] text-slate-500">{station.address}</div>
            </MapMarker>
          ))}

          {trafficJams.map((jam) => (
            <MapMarker key={jam.id} map={map} lat={jam.lat} lng={jam.lng} html={trafficJamMarkerHtml()} popupOffset={14}>
              <TrafficJamPopup jam={jam} onResolve={onResolveTrafficJam} />
            </MapMarker>
          ))}

          <ClusteredVehicleMarkers
            map={map}
            vehicles={vehicles}
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
      <div className="absolute top-16 right-4 z-[1000] flex flex-col gap-2">
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
