import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Clock, ExternalLink, LocateFixed, User } from 'lucide-react';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META, stations } from '../../../data/liveMapMock';
import { SEVERITY_META } from '../../../data/incidentMock';
import type { Vehicle } from '../../../types/vehicle';
import type { Incident } from '../../../types/incident';
import { createIncidentIcon, createStationIcon, createVehicleIcon } from './mapIcons';
import { MapLegend } from './MapLegend';
import { MapLayerToggle, TILE_URLS, type MapTileMode } from './MapLayerToggle';

const HCMC_CENTER: [number, number] = [10.7756, 106.7019];

interface MapCameraControllerProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  recenterTrigger: number;
}

/** Owns all camera movement: auto-fly on selection change, plus the manual "locate" button trigger. */
const MapCameraController: React.FC<MapCameraControllerProps> = ({ vehicles, selectedVehicle, recenterTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedVehicle) {
      map.flyTo([selectedVehicle.lat, selectedVehicle.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
    // Fly only when a *different* vehicle is selected, not on every live position tick.
  }, [selectedVehicle?.id]);

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

interface LiveMapViewProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  dispatchIncidents?: Incident[];
  vehiclesById?: Map<string, Vehicle>;
  incidentsById?: Map<string, Incident>;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  dispatchIncidents = [],
  vehiclesById,
  incidentsById,
}) => {
  const [tileMode, setTileMode] = useState<MapTileMode>('light');
  const [recenterCount, setRecenterCount] = useState(0);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

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
      <MapContainer center={HCMC_CENTER} zoom={12} className="h-full w-full">
        <TileLayer
          url={TILE_URLS[tileMode]}
          attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        />

        <MapCameraController vehicles={vehicles} selectedVehicle={selectedVehicle} recenterTrigger={recenterCount} />

        {stations.map((station) => (
          <Marker key={station.id} position={[station.lat, station.lng]} icon={createStationIcon()}>
            <Popup>
              <div className="text-xs font-semibold text-slate-900">{station.name}</div>
              <div className="text-[11px] text-slate-500">{station.area}</div>
            </Popup>
          </Marker>
        ))}

        {vehicles.map((vehicle) => {
          const statusMeta = VEHICLE_STATUS_META[vehicle.status];
          const typeMeta = VEHICLE_TYPE_META[vehicle.type];
          const TypeIcon = typeMeta.icon;
          const isSelected = vehicle.id === selectedVehicleId;

          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.lat, vehicle.lng]}
              icon={createVehicleIcon(vehicle.status, isSelected)}
              eventHandlers={{ click: () => onSelectVehicle(vehicle.id) }}
            >
              <Popup>
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
              </Popup>
            </Marker>
          );
        })}

        {dispatchIncidents.map((incident) => {
          const severityMeta = SEVERITY_META[incident.severity];
          const assignedVehicle = incident.assignedVehicleId ? vehiclesById?.get(incident.assignedVehicleId) : null;

          return (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lng]}
              icon={createIncidentIcon(incident.severity, false)}
            >
              <Popup>
                <div className="min-w-[180px] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{incident.title}</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityMeta.badgeClass}`}
                  >
                    {severityMeta.label}
                  </span>
                  <p className="text-xs text-slate-600">{incident.area}</p>
                  {assignedVehicle ? (
                    <p className="text-xs text-red-600 font-semibold">
                      Đã gán {assignedVehicle.plate} · ETA {assignedVehicle.etaMinutes ?? '--'} phút
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 font-semibold">Chưa gán xe</p>
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
