import React from 'react';
import type mapboxgl from 'mapbox-gl';
import { MapMarker } from './MapMarker';
import { glowPendingMarkerHtml } from './glowMarkers';
import { isAiWorkingUnheld, usePendingTriage } from '../incidents/incomingTriage';

/** Trên sự cố đã duyệt (z 3), ngang marker AI. */
const PENDING_MARKER_Z_INDEX = 4;

/**
 * Ca chờ người thẩm định trên Live Map (AI chuyển / tự điều phối tắt / có người đang giữ). Bấm là mở thẩm định ở Hàng đợi; ca AI đang
 * làm do `AiWorkingMarkers` vẽ. Tách khỏi LiveMapView vì nguồn giai đoạn AI chạy mỗi giây — chỉ phần này vẽ lại.
 */
export const PendingCaseMarkers: React.FC<{
  map: mapboxgl.Map;
  openIncidentId: string | null;
  onOpen: (incidentId: string) => void;
}> = ({ map, openIncidentId, onOpen }) => {
  const { items } = usePendingTriage();
  return (
    <>
      {items
        .filter((item) => !isAiWorkingUnheld(item))
        .map(({ incident }) => (
          <MapMarker
            key={`pending-${incident.id}`}
            map={map}
            lat={incident.lat}
            lng={incident.lng}
            html={glowPendingMarkerHtml(incident.category, incident.id === openIncidentId)}
            zIndex={PENDING_MARKER_Z_INDEX}
            onClick={() => onOpen(incident.id)}
          />
        ))}
    </>
  );
};
