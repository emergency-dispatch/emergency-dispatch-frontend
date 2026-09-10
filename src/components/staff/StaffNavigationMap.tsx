import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  ExternalLink,
  Layers,
  LocateFixed,
  Maximize2,
  Navigation,
  ZoomIn,
  ZoomOut,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import type { StaffMission, TurnByTurnStep } from '../../types/staff';

interface StaffNavigationMapProps {
  mission: StaffMission;
  currentStepIndex: number;
}

// Custom vehicle marker icon
const createVehicleMarkerIcon = (heading: number = 0) => {
  return L.divIcon({
    className: 'custom-staff-vehicle-icon',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(220, 38, 38, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 36px; height: 36px; border-radius: 9999px; background: #dc2626; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); box-shadow: 0 0 15px rgba(220, 38, 38, 0.6);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

// Custom incident target marker icon
const createIncidentTargetIcon = (severity: number) => {
  const color = severity >= 4 ? '#b91c1c' : severity === 3 ? '#ea580c' : '#ca8a04';
  return L.divIcon({
    className: 'custom-incident-target-icon',
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background: ${color}33; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 38px; height: 38px; border-radius: 12px; background: ${color}; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px ${color};">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
          </svg>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// Custom step turn icon
const createStepMarkerIcon = (index: number, isCurrent: boolean) => {
  const bg = isCurrent ? '#dc2626' : '#64748b';
  const border = '#ffffff';
  return L.divIcon({
    className: 'custom-step-node-icon',
    html: `
      <div style="width: 22px; height: 22px; border-radius: 9999px; background: ${bg}; border: 2px solid ${border}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #ffffff; font-family: monospace; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
        ${index + 1}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// Controller component inside MapContainer for bounds & centering
const MapController: React.FC<{
  vehiclePos: [number, number];
  incidentPos: [number, number];
  recenterTrigger: number;
}> = ({ vehiclePos, incidentPos, recenterTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (recenterTrigger > 0) {
      map.flyTo(vehiclePos, Math.max(map.getZoom(), 16), { duration: 0.8 });
    }
  }, [recenterTrigger, vehiclePos, map]);

  useEffect(() => {
    // Initial fit bounds
    const bounds = L.latLngBounds([vehiclePos, incidentPos]);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, []);

  return null;
};

export const StaffNavigationMap: React.FC<StaffNavigationMapProps> = ({
  mission,
  currentStepIndex,
}) => {
  const [tileMode, setTileMode] = useState<'dark' | 'osm' | 'satellite'>('dark');
  const [recenterCount, setRecenterCount] = useState<number>(0);

  const vehicleCoords: [number, number] = [mission.vehicleLat, mission.vehicleLng];
  const incidentCoords: [number, number] = [mission.incidentLat, mission.incidentLng];

  // Tile layer URL selector
  const getTileUrl = () => {
    if (tileMode === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    if (tileMode === 'osm') {
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
    // Dark tactical mode
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  };

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${mission.vehicleLat},${mission.vehicleLng}&destination=${mission.incidentLat},${mission.incidentLng}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      <MapContainer
        center={vehicleCoords}
        zoom={15}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          url={getTileUrl()}
          attribution="&copy; OpenStreetMap &mdash; Emergency Field Navigation"
        />

        <MapController
          vehiclePos={vehicleCoords}
          incidentPos={incidentCoords}
          recenterTrigger={recenterCount}
        />

        {/* Route Polyline (Glow effect underlay) */}
        <Polyline
          positions={mission.routePolyline}
          pathOptions={{
            color: '#f87171',
            weight: 8,
            opacity: 0.4,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />

        {/* Route Polyline (Main sharp path) */}
        <Polyline
          positions={mission.routePolyline}
          pathOptions={{
            color: '#dc2626',
            weight: 4.5,
            opacity: 0.95,
            dashArray: mission.status === 'en_route' ? '8, 8' : undefined,
            lineCap: 'round',
          }}
        />

        {/* Step Maneuver Nodes */}
        {mission.routeSteps.map((step, idx) => (
          <Marker
            key={step.id}
            position={[step.lat, step.lng]}
            icon={createStepMarkerIcon(idx, idx === currentStepIndex)}
          >
            <Popup className="light-popup">
              <div className="p-1 font-mono-data text-xs text-slate-900">
                <strong>Chặng {idx + 1}:</strong> {step.instruction}
                <div className="text-slate-500 mt-1">{step.distanceMeters}m • ~{step.durationSeconds}s</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Vehicle Marker */}
        <Marker position={vehicleCoords} icon={createVehicleMarkerIcon(45)}>
          <Popup className="light-popup">
            <div className="p-1 font-mono-data text-xs text-slate-900">
              <div className="font-bold text-red-600">{mission.vehiclePlate}</div>
              <div className="text-slate-600">Vị trí hiện tại của xe</div>
            </div>
          </Popup>
        </Marker>

        {/* Incident Target Marker */}
        <Marker position={incidentCoords} icon={createIncidentTargetIcon(mission.severity)}>
          <Popup className="light-popup">
            <div className="p-1 text-xs text-slate-900">
              <div className="font-bold text-red-600">ĐIỂM SỰ CỐ: {mission.title}</div>
              <div className="text-slate-600 mt-0.5">{mission.address}</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Floating Tactical Overlay Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Recenter button */}
        <button
          onClick={() => setRecenterCount((prev) => prev + 1)}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-red-600 shadow-md transition-all active:scale-95"
          title="Định vị lại vị trí xe"
        >
          <LocateFixed className="w-5 h-5" />
        </button>

        {/* Tile Layer Toggle */}
        <button
          onClick={() =>
            setTileMode((prev) => (prev === 'dark' ? 'satellite' : prev === 'satellite' ? 'osm' : 'dark'))
          }
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-md transition-all"
          title={`Đổi lớp bản đồ (Hiện tại: ${tileMode})`}
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* External Google Maps Navigation Link */}
        <button
          onClick={openGoogleMaps}
          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 border border-red-600 text-white shadow-md transition-all active:scale-95"
          title="Mở chỉ đường Google Maps ngoài"
        >
          <ExternalLink className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Bottom Info Pill */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 backdrop-blur-md text-xs font-mono-data text-slate-700 shadow-md">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
        <span>ĐIỀU HƯỚNG TỰ ĐỘNG THEO DÕI GPS VỆ TINH</span>
      </div>
    </div>
  );
};
