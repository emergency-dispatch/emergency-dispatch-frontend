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
  /** Điểm của phần tử neo vào tọa độ (mặc định tâm). Ghim trạm neo 'bottom' để mũi ghim chỉ đúng vị trí. */
  anchor?: mapboxgl.Anchor;
  /** Dời phần tử theo pixel so với điểm neo — xe đậu xếp hàng dưới ghim trạm. */
  offset?: [number, number];
  /** Khoảng cách popup so với tâm marker (px). */
  popupOffset?: number;
  onClick?: () => void;
  /** Nội dung popup (React) — bấm marker để mở/đóng. Không truyền thì marker không có popup. */
  children?: React.ReactNode;
}

/**
 * Offset popup theo từng hướng neo, cộng thêm offset pixel của marker — để popup mở đúng tại phần tử đã dời
 * (xe đậu xếp hàng dưới ghim trạm) thay vì tại tọa độ gốc.
 */
function popupOffsets(distance: number, [ox, oy]: [number, number]): Partial<Record<mapboxgl.Anchor, [number, number]>> {
  const d = Math.round(distance * 0.7);
  return {
    center: [ox, oy],
    top: [ox, oy + distance],
    'top-left': [ox + d, oy + d],
    'top-right': [ox - d, oy + d],
    bottom: [ox, oy - distance],
    'bottom-left': [ox + d, oy - d],
    'bottom-right': [ox - d, oy - d],
    left: [ox + distance, oy],
    right: [ox - distance, oy],
  };
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
  anchor = 'center',
  offset,
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
    // Chạy onClick SAU khi mapbox xử lý xong cú click: onClick thường đổi icon (đổi innerHTML) → nếu chạy ngay,
    // phần tử vừa bấm bị thay trước khi mapbox kiểm tra "click trúng marker" và popup không mở.
    const handleClick = () => {
      setTimeout(() => onClickRef.current?.(), 0);
    };
    element.addEventListener('click', handleClick);

    const marker = new mapboxgl.Marker({ element, anchor, offset }).setLngLat([lng, lat]).addTo(map);
    if (hasPopup) {
      marker.setPopup(
        new mapboxgl.Popup({ offset: popupOffsets(popupOffset, offset ?? [0, 0]), maxWidth: '300px' }).setDOMContent(
          popupNode
        )
      );
    }
    markerRef.current = marker;

    return () => {
      element.removeEventListener('click', handleClick);
      marker.remove();
      markerRef.current = null;
    };
    // Vị trí cập nhật ở effect riêng bên dưới — không tạo lại marker mỗi tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element, popupNode, hasPopup, anchor]);

  const [offsetX, offsetY] = offset ?? [0, 0];
  useEffect(() => {
    markerRef.current?.setOffset([offsetX, offsetY]);
    markerRef.current?.getPopup()?.setOffset(popupOffsets(popupOffset, [offsetX, offsetY]));
  }, [offsetX, offsetY, popupOffset]);

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
