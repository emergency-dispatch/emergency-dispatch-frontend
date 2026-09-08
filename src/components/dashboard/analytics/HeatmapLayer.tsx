import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { HeatmapPoint } from '../../../types/analytics';

interface HeatmapLayerProps {
  points: HeatmapPoint[];
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const heatPoints: L.HeatLatLngTuple[] = points.map((p) => [p.lat, p.lng, p.intensity]);
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 22,
      maxZoom: 15,
      gradient: { 0.2: '#2563EB', 0.5: '#F59E0B', 0.8: '#F97316', 1.0: '#DC2626' },
    });

    heatLayer.addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};
