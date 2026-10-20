import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';

interface MapMarkerProps {
  map: mapboxgl.Map;
  lat: number;
  lng: number;
  /** HTML của phần tử marker (xem mapIcons.ts). */
  html: string;
  zIndex?: number;
  /** Khoảng cách popup so với tâm marker (px). */
  popupOffset?: number;
  onClick?: () => void;
  /** Nội dung popup (React) — bấm marker để mở/đóng. Không truyền thì marker không có popup. */
  children?: React.ReactNode;
}

/**
 * Marker DOM của mapbox-gl, popup render bằng React portal. Marker chỉ tạo một lần;
 * vị trí / icon / z-index cập nhật tại chỗ để xe di chuyển mượt theo từng tick GPS.
 */
export const MapMarker: React.FC<MapMarkerProps> = ({
  map,
  lat,
  lng,
  html,
  zIndex,
  popupOffset = 16,
  onClick,
  children,
}) => {
  const [element] = useState(() => document.createElement('div'));
  const [popupNode] = useState(() => document.createElement('div'));
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  const hasPopup = children !== undefined && children !== null && children !== false;

  useEffect(() => {
    const handleClick = () => onClickRef.current?.();
    element.addEventListener('click', handleClick);

    const marker = new mapboxgl.Marker({ element }).setLngLat([lng, lat]).addTo(map);
    if (hasPopup) {
      marker.setPopup(new mapboxgl.Popup({ offset: popupOffset, maxWidth: '280px' }).setDOMContent(popupNode));
    }
    markerRef.current = marker;

    return () => {
      element.removeEventListener('click', handleClick);
      marker.remove();
      markerRef.current = null;
    };
    // Vị trí cập nhật ở effect riêng bên dưới — không tạo lại marker mỗi tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element, popupNode, hasPopup, popupOffset]);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
  }, [lng, lat]);

  useEffect(() => {
    element.innerHTML = html;
  }, [element, html]);

  useEffect(() => {
    element.style.zIndex = zIndex === undefined ? '' : String(zIndex);
  }, [element, zIndex]);

  return hasPopup ? createPortal(children, popupNode) : null;
};
