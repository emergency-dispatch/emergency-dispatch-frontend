import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export interface PickedPoint {
  lat: number;
  lng: number;
}

interface MapPickLocationProps {
  map: mapboxgl.Map;
  position: PickedPoint | null;
  onPick: (point: PickedPoint) => void;
  /** Tăng lên khi vị trí đến từ ô tìm địa chỉ → camera bay tới ghim. */
  flyKey: number;
}

const PIN_HTML = `
  <div style="width:30px;height:40px;cursor:grab;filter:drop-shadow(0 3px 4px rgba(0,0,0,0.4));">
    <svg viewBox="0 0 30 40" width="30" height="40">
      <path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 39 15 39s14-13.7 14-24.1C29 7.2 22.7 1 15 1z" fill="#DC2626" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="15" cy="15" r="5" fill="#FFFFFF"/>
    </svg>
  </div>`;

/**
 * Chế độ chọn vị trí khi Operator tạo sự cố: click bản đồ để đặt ghim, kéo ghim để chỉnh.
 * Con trỏ đổi thành dấu cộng trong lúc chọn.
 */
export const MapPickLocation: React.FC<MapPickLocationProps> = ({ map, position, onPick, flyKey }) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    const canvas = map.getCanvasContainer();
    canvas.style.cursor = 'crosshair';
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      // Bấm vào marker / popup (VD xem sự cố nghi trùng, thả ghim sau khi kéo) không phải đặt vị trí mới.
      const target = e.originalEvent.target as HTMLElement | null;
      if (target?.closest('.mapboxgl-marker, .mapboxgl-popup')) return;
      onPickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
      canvas.style.cursor = '';
    };
  }, [map]);

  useEffect(() => {
    if (!position) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([position.lng, position.lat]);
      return;
    }
    const element = document.createElement('div');
    element.innerHTML = PIN_HTML;
    const marker = new mapboxgl.Marker({ element, anchor: 'bottom', draggable: true })
      .setLngLat([position.lng, position.lat])
      .addTo(map);
    marker.getElement().style.zIndex = '10';
    marker.on('dragend', () => {
      const { lat, lng } = marker.getLngLat();
      onPickRef.current({ lat, lng });
    });
    markerRef.current = marker;
  }, [map, position?.lat, position?.lng]);

  useEffect(
    () => () => {
      markerRef.current?.remove();
      markerRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (flyKey === 0 || !position) return;
    map.flyTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), 16), duration: 800 });
    // Chỉ bay khi có lượt tìm địa chỉ mới, không bay mỗi lần kéo ghim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyKey]);

  return null;
};
