import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Clock, ExternalLink, LocateFixed, User } from 'lucide-react';
import { MAP_CENTER, VEHICLE_STATUS_META, VEHICLE_TYPE_META, stations } from '../../../data/liveMapMock';
import { INCIDENT_CATEGORY_META, SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import type { Vehicle } from '../../../types/vehicle';
import type { Incident, TrafficJamReport } from '../../../types/incident';
import {
  createClusterIcon,
  createIncidentIcon,
  createStationIcon,
  createTrafficJamIcon,
  createVehicleIcon,
} from './mapIcons';
import { MapLegend } from './MapLegend';
import { MapLayerToggle, TILE_URLS, type MapTileMode } from './MapLayerToggle';

// Bán kính gom cụm (px trên màn hình) — các xe nằm gần nhau hơn mức này ở zoom hiện tại sẽ gộp lại.
const CLUSTER_RADIUS_PX = 36;
const MAX_ZOOM = 18;

interface MapCameraControllerProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  selectedIncident: Incident | null;
  recenterTrigger: number;
}

/** Owns all camera movement: auto-fly on selection change, plus the manual "locate" button trigger. */
const MapCameraController: React.FC<MapCameraControllerProps> = ({
  vehicles,
  selectedVehicle,
  selectedIncident,
  recenterTrigger,
}) => {
  const map = useMap();

  useEffect(() => {
    if (selectedVehicle) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
    // Fly only when a *different* vehicle is selected, not on every live position tick.
  }, [selectedVehicle?.id]);

  useEffect(() => {
    if (selectedIncident) {
      map.flyTo([selectedIncident.lat, selectedIncident.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
    }
  }, [selectedIncident?.id]);

  useEffect(() => {
    if (recenterTrigger === 0) return;
    if (selectedVehicle) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
    } else if (vehicles.length > 0) {
      const bounds = L.latLngBounds(vehicles.map((v): [number, number] => [v.lat, v.lng]));
      map.flyToBounds(bounds, { padding: [60, 60], duration: 0.8 });
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
        <User className="w-3.5 h-3.5 shrink-0" />
        <span>{vehicle.driver}</span>
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

interface ClusteredVehicleMarkersProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
}

/** Gom cụm marker xe theo khoảng cách pixel ở mức zoom hiện tại; bấm cụm để phóng to. */
const ClusteredVehicleMarkers: React.FC<ClusteredVehicleMarkersProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const groups = useMemo(() => {
    const result: Array<{ center: L.Point; members: Vehicle[] }> = [];
    for (const vehicle of vehicles) {
      const point = map.project([vehicle.lat, vehicle.lng], zoom);
      // Xe đang chọn luôn đứng riêng để không bị "nuốt" vào cụm.
      const group =
        vehicle.id === selectedVehicleId
          ? undefined
          : result.find(
              (g) => !g.members.some((m) => m.id === selectedVehicleId) && g.center.distanceTo(point) < CLUSTER_RADIUS_PX
            );
      if (group) group.members.push(vehicle);
      else result.push({ center: point, members: [vehicle] });
    }
    return result;
  }, [vehicles, zoom, selectedVehicleId, map]);

  return (
    <>
      {groups.map((group) => {
        if (group.members.length === 1) {
          const vehicle = group.members[0];
          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.lat, vehicle.lng]}
              icon={createVehicleIcon(vehicle.type, vehicle.status, vehicle.id === selectedVehicleId)}
              eventHandlers={{ click: () => onSelectVehicle(vehicle.id) }}
            >
              <Popup>
                <VehiclePopup vehicle={vehicle} />
              </Popup>
            </Marker>
          );
        }

        const bounds = L.latLngBounds(group.members.map((v): [number, number] => [v.lat, v.lng]));
        const atMaxZoom = zoom >= MAX_ZOOM - 1;
        return (
          <Marker
            key={`cluster-${group.members.map((v) => v.id).join('-')}`}
            position={bounds.getCenter()}
            icon={createClusterIcon(group.members.length)}
            eventHandlers={{
              click: () => {
                if (!atMaxZoom) map.flyToBounds(bounds, { padding: [80, 80], maxZoom: MAX_ZOOM, duration: 0.6 });
              },
            }}
          >
            {atMaxZoom && (
              <Popup>
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
              </Popup>
            )}
          </Marker>
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
  trafficJams?: TrafficJamReport[];
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
  trafficJams = [],
  vehiclesById,
  incidentsById,
}) => {
  const [tileMode, setTileMode] = useState<MapTileMode>('light');
  const [recenterCount, setRecenterCount] = useState(0);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const selectedIncident = dispatchIncidents.find((i) => i.id === selectedIncidentId) ?? null;

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
      <MapContainer center={MAP_CENTER} zoom={14} maxZoom={MAX_ZOOM} className="h-full w-full">
        <TileLayer
          url={TILE_URLS[tileMode]}
          maxZoom={MAX_ZOOM}
          attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        />

        <MapCameraController
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          selectedIncident={selectedIncident}
          recenterTrigger={recenterCount}
        />

        {stations.map((station) => (
          <Marker key={station.id} position={[station.lat, station.lng]} icon={createStationIcon()}>
            <Popup>
              <div className="text-xs font-semibold text-slate-900">{station.name}</div>
              <div className="text-[11px] text-slate-500">{station.area}</div>
            </Popup>
          </Marker>
        ))}

        {trafficJams.map((jam) => (
          <Marker key={jam.id} position={[jam.lat, jam.lng]} icon={createTrafficJamIcon()}>
            <Popup>
              <div className="min-w-[180px] space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Ùn tắc giao thông</p>
                <p className="text-sm font-bold text-slate-900">{jam.area}</p>
                <p className="text-xs text-slate-600">{jam.note}</p>
                <p className="text-[11px] text-slate-400">
                  Báo lúc {new Date(jam.reportedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        <ClusteredVehicleMarkers
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={onSelectVehicle}
        />

        {dispatchIncidents.map((incident) => {
          const severityMeta = SEVERITY_LEVEL_META[incident.severity];
          const category = INCIDENT_CATEGORY_META[incident.category];
          const assigned = incident.assignedVehicleIds
            .map((id) => vehiclesById?.get(id))
            .filter((v): v is Vehicle => !!v);

          return (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lng]}
              icon={createIncidentIcon(incident.category, incident.severity, incident.id === selectedIncidentId)}
              eventHandlers={{ click: () => onSelectIncident?.(incident.id) }}
              zIndexOffset={1000}
            >
              <Popup>
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
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

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
