import React from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LeafletMouseEvent } from 'leaflet';

const pickerIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:9999px;background:#2563EB;border:2px solid #F8FAFC;box-shadow:0 0 8px 2px rgba(37,99,235,0.6);"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface ClickHandlerProps {
  onPick: (lat: number, lng: number) => void;
}

const ClickHandler: React.FC<ClickHandlerProps> = ({ onPick }) => {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface StationMapPickerProps {
  lat: number;
  lng: number;
  radiusKm: number;
  onChange: (lat: number, lng: number) => void;
}

/**
 * Uncontrolled after mount: the map view stays where the admin left it once
 * panning/zooming, only the marker + coverage circle move on click/drag.
 * Re-centering on every position change would be jarring UX.
 */
export const StationMapPicker: React.FC<StationMapPickerProps> = ({ lat, lng, radiusKm, onChange }) => {
  return (
    <MapContainer center={[lat, lng]} zoom={13} className="h-full w-full">
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
      />

      <ClickHandler onPick={onChange} />

      <Circle
        center={[lat, lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.12, weight: 1.5 }}
      />

      <Marker
        position={[lat, lng]}
        icon={pickerIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const pos = e.target.getLatLng();
            onChange(pos.lat, pos.lng);
          },
        }}
      />
    </MapContainer>
  );
};
