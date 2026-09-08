import React, { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock, User } from 'lucide-react';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META, stations } from '../../../data/liveMapMock';
import { SEVERITY_META } from '../../../data/incidentMock';
import type { Vehicle } from '../../../types/vehicle';
import type { Incident } from '../../../types/incident';
import { createIncidentIcon, createStationIcon, createVehicleIcon } from './mapIcons';
import { MapLegend } from './MapLegend';

const HCMC_CENTER: [number, number] = [10.7756, 106.7019];

interface FlyToSelectedProps {
  vehicle: Vehicle | null;
}

const FlyToSelected: React.FC<FlyToSelectedProps> = ({ vehicle }) => {
  const map = useMap();

  useEffect(() => {
    if (vehicle) {
      map.flyTo([vehicle.lat, vehicle.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
    // Fly only when a *different* vehicle is selected, not on every live position tick.
  }, [vehicle?.id]);

  return null;
};

interface LiveMapViewProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  dispatchIncidents?: Incident[];
  vehiclesById?: Map<string, Vehicle>;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  dispatchIncidents = [],
  vehiclesById,
}) => {
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  return (
    <div className="relative h-full w-full">
      <MapContainer center={HCMC_CENTER} zoom={12} className="h-full w-full">
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        />

        <FlyToSelected vehicle={selectedVehicle} />

        {stations.map((station) => (
          <Marker key={station.id} position={[station.lat, station.lng]} icon={createStationIcon()}>
            <Popup>
              <div className="text-xs font-semibold text-white">{station.name}</div>
              <div className="text-[11px] text-slate-400">{station.area}</div>
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
                    <span className="text-sm font-bold text-white font-mono-data">{vehicle.plate}</span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ color: statusMeta.color, backgroundColor: `${statusMeta.color}1A` }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{typeMeta.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>{vehicle.driver}</span>
                  </div>
                  {vehicle.etaMinutes !== null && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold">
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
                    <span className="text-sm font-bold text-white">{incident.title}</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityMeta.badgeClass}`}
                  >
                    {severityMeta.label}
                  </span>
                  <p className="text-xs text-slate-300">{incident.area}</p>
                  {assignedVehicle ? (
                    <p className="text-xs text-blue-400 font-semibold">
                      Đã gán {assignedVehicle.plate} · ETA {assignedVehicle.etaMinutes ?? '--'} phút
                    </p>
                  ) : (
                    <p className="text-xs text-amber-400 font-semibold">Chưa gán xe</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <MapLegend />
    </div>
  );
};
