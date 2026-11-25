import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useTranslation } from '../../../i18n';
import { gpsFarFromStationKm } from '../../../utils/vehicleLocation';
import type { DispatchCandidate } from '../../../types/vehicle';

/** Xe trong gợi ý có GPS lưu cách trạm của nó quá xa → khoảng cách / ETA có thể sai. Bình thường thì không hiện gì. */
export const GpsFarNote: React.FC<{ option: Pick<DispatchCandidate, 'lat' | 'lng' | 'stationId'> }> = ({ option }) => {
  const { stations } = useDispatchStore();
  const { t } = useTranslation();
  // Backend chỉ gợi ý xe Sẵn sàng.
  const km = gpsFarFromStationKm(
    { status: 'available', lat: option.lat, lng: option.lng },
    stations.find((s) => s.id === option.stationId)
  );
  if (km === null) return null;
  return (
    <p className="flex items-start gap-1 mt-0.5 text-[10px] font-semibold leading-snug text-amber-700">
      <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
      {t('liveMap.support.gpsFar', { km: km.toFixed(1) })}
    </p>
  );
};
