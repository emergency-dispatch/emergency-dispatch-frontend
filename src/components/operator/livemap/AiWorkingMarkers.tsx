import React from 'react';
import type mapboxgl from 'mapbox-gl';
import { Bot } from 'lucide-react';
import { MapMarker } from './MapMarker';
import { glowAiWorkingMarkerHtml } from './glowMarkers';
import { AiStepGlyph, AiTakeOver } from '../AiLane';
import { IncidentCode } from '../incidents/IncidentCode';
import { aiProgressOf, formatWaitTime, useAiWorkingItems } from '../incidents/incomingTriage';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useTranslation } from '../../../i18n';

/** Trên sự cố đã duyệt (z 3), dưới xe đang chọn. */
const AI_MARKER_Z_INDEX = 4;

/**
 * §31.E: tin báo AI đang phân tích / điều phối trên Live Map (sự cố chưa duyệt nên không thuộc marker sự cố thường).
 * Tách khỏi LiveMapView vì đồng hồ chờ chạy mỗi giây — chỉ phần này vẽ lại.
 */
export const AiWorkingMarkers: React.FC<{
  map: mapboxgl.Map;
  /** Bay tới + mở popup (bấm "Xem trên bản đồ" ở dải AI); `key` đổi mỗi lần yêu cầu. */
  focus: { id: string; key: number } | null;
}> = ({ map, focus }) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const { items, now } = useAiWorkingItems();

  return (
    <>
      {items.map((item) => {
        const { incident } = item;
        const progress = aiProgressOf(item, now);
        return (
          <MapMarker
            key={`ai-${incident.id}`}
            map={map}
            lat={incident.lat}
            lng={incident.lng}
            html={glowAiWorkingMarkerHtml(incident.category, progress.phase)}
            zIndex={AI_MARKER_Z_INDEX}
            popupOffset={28}
            popupOpenKey={focus?.id === incident.id ? focus.key : undefined}
          >
            <div className="min-w-[220px] space-y-1.5">
              <p className="flex items-center gap-1 text-[11px] font-bold text-indigo-700">
                <Bot className="w-3.5 h-3.5" />
                {t('layout.aiLane.mapPopupTitle')}
              </p>
              <div className="flex items-baseline justify-between gap-3">
                <IncidentCode code={incident.code} className="text-xs font-bold text-slate-900" />
                <span
                  className={`font-mono-data text-xs tabular-nums ${progress.slow ? 'text-amber-700 font-bold' : 'text-slate-500'}`}
                >
                  {formatWaitTime(progress.elapsedSeconds)}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {incident.aiPending ? t('layout.aiLane.pendingAi') : incidentKindLabel(incident)}
              </p>
              <p className="text-xs text-slate-600">{incident.area}</p>
              <p
                className={`flex items-center gap-1.5 text-[11px] ${progress.slow ? 'text-amber-800' : 'text-indigo-800'}`}
              >
                <AiStepGlyph phase={progress.phase} />
                {progress.slow
                  ? t('layout.aiLane.slow')
                  : progress.phase === 'analyzing'
                    ? t('layout.aiLane.analyzing')
                    : t('layout.aiLane.deciding')}
              </p>
              <div className="pt-1">
                <AiTakeOver incidentId={incident.id} />
              </div>
            </div>
          </MapMarker>
        );
      })}
    </>
  );
};
