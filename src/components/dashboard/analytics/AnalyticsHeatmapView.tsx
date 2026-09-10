import React from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { stations } from '../../../data/liveMapMock';
import { createStationIcon } from '../livemap/mapIcons';
import { HeatmapLayer } from './HeatmapLayer';
import type { HeatmapPoint } from '../../../types/analytics';

const HCMC_CENTER: [number, number] = [10.7756, 106.7019];

interface AnalyticsHeatmapViewProps {
  points: HeatmapPoint[];
}

export const AnalyticsHeatmapView: React.FC<AnalyticsHeatmapViewProps> = ({ points }) => {
  return (
    <MapContainer center={HCMC_CENTER} zoom={12} className="h-full w-full">
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
      />

      <HeatmapLayer points={points} />

      {stations.map((station) => (
        <Marker key={station.id} position={[station.lat, station.lng]} icon={createStationIcon()} />
      ))}
    </MapContainer>
  );
};
