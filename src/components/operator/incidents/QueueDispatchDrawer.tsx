import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CircleCheck,
  HandHelping,
  Loader2,
  Map as MapIcon,
  MapPin,
  Radar,
  Siren,
  Truck,
  X,
} from 'lucide-react';
import { DispatchTeamLabel } from '../teams/DispatchTeamLabel';
import { CaseSteps } from './CaseSteps';
import { IncidentThumbnail } from './IncidentThumbnail';
import { SeverityBadge } from './SeverityBadge';
import { SourceChip } from './SourceChip';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { DISPATCH_ALGORITHM_META, MAX_VEHICLES_BY_LEVEL } from '../../../data/dispatchConfig';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useDispatchRecommendations } from '../../../hooks/useDispatchRecommendations';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import type { DispatchAlgorithm } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';

const SECONDARY_BUTTON =
  'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400';

interface QueueDispatchDrawerProps {
  incidentId: string;
  /** "Để sau" / "Hoàn tất" / nút X — trang Hàng đợi nhả khóa mềm. */
  onClose: () => void;
  /** Mở sự cố trên Live Map (giao thêm xe, theo dõi đội...). */
  onOpenLiveMap: (incidentId: string) => void;
}

/**
 * FR-OP-04: bước "Điều xe" ngay sau khi duyệt trong Hàng đợi — giao xe lần đầu mà không phải sang Live Map.
 * Operator vẫn giữ khóa mềm (duyệt không nhả khóa) nên không ai chen vào giao xe giữa hai bước.
 * Giao thêm xe vượt giới hạn Cấp 1–2, giao lại khi đội từ chối, chi viện... vẫn làm trên Live Map.
 */
export const QueueDispatchDrawer: React.FC<QueueDispatchDrawerProps> = ({ incidentId, onClose, onOpenLiveMap }) => {
  const { incidents, vehicles, escalatedIncidentIds, assignVehicle } = useDispatchStore();
  const teamByVehicle = useTeamByVehicle();
  const { t } = useTranslation();
  const [algorithm, setAlgorithm] = useState<DispatchAlgorithm>('nearest');
  const [assigningVehicleId, setAssigningVehicleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const incident = useMemo(() => incidents.find((i) => i.id === incidentId) ?? null, [incidents, incidentId]);
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  // Sự cố bị hủy / chuyển trạm / hoàn tất trong lúc đang mở → không điều xe được nữa.
  const available = !!incident && incident.status === 'approved';
  const maxVehicles = incident ? MAX_VEHICLES_BY_LEVEL[incident.severity] : 1;
  const activeVehicleIds = incident
    ? incident.assignedVehicleIds.filter((id) => !incident.reportedVehicleIds.includes(id))
    : [];
  const activeCount = activeVehicleIds.length;
  const isFull = activeCount >= maxVehicles;
  const isEscalated = escalatedIncidentIds.has(incidentId);

  const refreshKey = incident ? `${incident.assignedVehicleIds.join(',')}|${isEscalated}` : '';
  const { suggestion, loading, error: suggestionError } = useDispatchRecommendations(
    incidentId,
    available && !isFull,
    algorithm,
    refreshKey
  );

  // Giống Live Map: chỉ xe sẵn sàng; xe trạm mình phải có tổ, xe hỗ trợ trạm khác thì hiện theo xe.
  const readyCandidates = (suggestion?.candidates ?? []).filter(
    (c) => vehiclesById.get(c.vehicleId)?.status === 'available'
  );
  const candidates = readyCandidates.filter((c) => teamByVehicle.has(c.vehicleId) || c.isSupportUnit);
  const vehiclesWithoutTeam = readyCandidates.length - candidates.length;

  const handleAssign = async (vehicleId: string) => {
    setAssigningVehicleId(vehicleId);
    setError(null);
    const result = await assignVehicle(vehicleId, incidentId, algorithm);
    setAssigningVehicleId(null);
    if (!result.ok) setError(result.message ?? t('context.assignFailed'));
  };

  const category = incident ? INCIDENT_CATEGORY_META[incident.category] : null;
  const busy = !!assigningVehicleId;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={busy ? undefined : onClose} />

      <aside
        aria-label={t('incidents.dispatchStep.kicker')}
        className="fixed top-0 right-0 h-full w-full max-w-5xl bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20"
      >
        {/* Đầu drawer giữ nguyên vị trí như bước Thẩm định để Operator thấy là cùng một ca, chỉ sang bước 2 */}
        <div className="shrink-0 px-5 pt-3.5 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <CaseSteps current={2} />
            <button
              onClick={onClose}
              disabled={busy}
              className="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0 disabled:opacity-50"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="mt-2.5 text-lg font-bold text-slate-900 leading-snug truncate">{incident?.title ?? '—'}</h2>
          {incident && category && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: category.color }}>
                <category.icon className="w-3.5 h-3.5 shrink-0" />
                {t(`enums.category.${incident.category}`)}
              </span>
              <SeverityBadge severity={incident.severity} />
              <SourceChip source={incident.source} />
            </div>
          )}
        </div>

        {available && (
          <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-2 border-b border-emerald-100 bg-emerald-50 text-xs text-emerald-800">
            {isEscalated && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-600 text-white font-semibold">
                <Siren className="w-3.5 h-3.5 shrink-0 animate-pulse motion-reduce:animate-none" />
                {t('incidents.drawer.escalatedShort')}
              </span>
            )}
            <span className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {t('incidents.dispatchStep.approvedBanner')}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {!available || !incident ? (
            <div className="p-5">
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {t('incidents.dispatchStep.unavailable')}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 p-5">
              {/* Cột trái — sự cố đang điều xe: đủ để nhớ lại vụ việc, không lặp lại cả hồ sơ */}
              <div className="space-y-4 min-w-0">
                <h3 className="text-[13px] font-semibold text-slate-700">{t('incidents.dispatchStep.summaryHeading')}</h3>
                <IncidentThumbnail incident={incident} className="w-full aspect-video" />
                {incident.aiSummary && (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">
                    {incident.aiSummary}
                  </p>
                )}
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="break-words">{incident.area}</span>
                </p>

                <section className="border-t border-slate-100 pt-4">
                  <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
                    {t('incidents.dispatchStep.assignedHeading', { count: activeCount, max: maxVehicles })}
                  </h3>
                  {activeCount === 0 ? (
                    <p className="text-sm text-slate-400">{t('incidents.dispatchStep.noneAssigned')}</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {activeVehicleIds.map((vehicleId) => {
                        const vehicle = vehiclesById.get(vehicleId);
                        const team = teamByVehicle.get(vehicleId);
                        if (!vehicle) return null;
                        return (
                          <li key={vehicleId} className="flex items-center gap-2.5 py-2">
                            <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="min-w-0 flex-1">
                              {team ? (
                                <DispatchTeamLabel team={team} vehicle={vehicle} />
                              ) : (
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {t(`enums.unitType.${vehicle.unitType}`)}{' '}
                                  <span className="font-mono-data font-normal text-slate-500">{vehicle.plate}</span>
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {isFull && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
                      {incident.severity === 3
                        ? t('incidents.dispatchStep.fullLevel3', { max: maxVehicles })
                        : t('incidents.dispatchStep.fullLevel12')}
                    </p>
                  )}
                  {!isFull && incident.severity === 3 && (
                    <p className="mt-2 text-xs text-slate-500">{t('incidents.dispatchStep.level3Hint', { max: maxVehicles })}</p>
                  )}
                </section>
              </div>

              {/* Cột phải — chọn tổ: việc chính của bước này */}
              <div className="min-w-0 space-y-3">
                {isFull ? (
                  <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 px-6 text-center">
                    <CircleCheck className="w-8 h-8 text-emerald-600" />
                    <p className="text-sm text-slate-600 max-w-sm">
                      {incident.severity === 3
                        ? t('incidents.dispatchStep.fullLevel3', { max: maxVehicles })
                        : t('incidents.dispatchStep.fullLevel12')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                        <Radar className="w-4 h-4 text-red-600" />
                        {t('liveMap.recommend.suitableTeams')}
                        {suggestion && (
                          <span className="font-mono-data font-normal text-slate-400">
                            {t('liveMap.recommend.radius', { km: suggestion.radiusKm })}
                          </span>
                        )}
                      </h3>
                      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100" role="radiogroup">
                        {(Object.keys(DISPATCH_ALGORITHM_META) as DispatchAlgorithm[]).map((key) => (
                          <button
                            key={key}
                            role="radio"
                            aria-checked={algorithm === key}
                            onClick={() => setAlgorithm(key)}
                            title={t(`enums.algorithm.${key}.description`)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                              algorithm === key ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {t(`enums.algorithm.${key}.label`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isEscalated ? (
                      <p className="text-xs font-semibold text-red-600">{t('liveMap.recommend.radiusDoubled')}</p>
                    ) : suggestion?.expanded ? (
                      <p className="text-xs font-semibold text-amber-600">{t('liveMap.recommend.expanded')}</p>
                    ) : null}

                    {loading && !suggestion && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('liveMap.recommend.searching')}
                      </div>
                    )}

                    {suggestionError && <p className="text-sm text-red-600">{suggestionError}</p>}

                    {suggestion && candidates.length === 0 && (
                      <p className="text-sm text-red-600 py-1">
                        {t('liveMap.recommend.noneLeft')}
                        {suggestion.radiusKm > 0 && t('liveMap.recommend.noneLeftWithin', { km: suggestion.radiusKm })}.
                      </p>
                    )}

                    {/* Danh sách xếp hạng: số thứ tự là thứ hạng gợi ý thật, không phải trang trí */}
                    <ol className="divide-y divide-slate-100 border-y border-slate-100">
                      {candidates.map((candidate, index) => {
                        const vehicle = vehiclesById.get(candidate.vehicleId)!;
                        const team = teamByVehicle.get(vehicle.id);
                        const distanceLabel = (
                          <>
                            {t('liveMap.recommend.distance', { km: candidate.km.toFixed(1) })}
                            {candidate.isApproximate && t('liveMap.recommend.approximate')}
                            {t('liveMap.recommend.etaShort', { count: candidate.etaMinutes })}
                            {algorithm === 'load_aware' && ` · ${candidate.cost.toFixed(2)}`}
                          </>
                        );
                        return (
                          <li
                            key={vehicle.id}
                            className="flex items-center gap-3 py-2.5"
                            title={
                              algorithm === 'load_aware'
                                ? t('liveMap.recommend.costTitle', { load: Math.round(candidate.stationLoad * 100) })
                                : undefined
                            }
                          >
                            <span
                              className={`w-6 text-center text-sm font-bold shrink-0 ${index === 0 ? 'text-red-600' : 'text-slate-300'}`}
                            >
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              {candidate.isSupportUnit && (
                                <span className="inline-flex items-center gap-0.5 mb-0.5 px-1.5 py-px rounded bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700">
                                  <HandHelping className="w-3 h-3" />
                                  {t('liveMap.recommend.supportUnit', { station: candidate.stationName })}
                                </span>
                              )}
                              {team ? (
                                <DispatchTeamLabel team={team} vehicle={vehicle} detail={distanceLabel} />
                              ) : (
                                // Xe hỗ trợ trạm khác: không xem được tổ → hiện theo xe.
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {t(`enums.unitType.${vehicle.unitType}`)}
                                  </p>
                                  <p className="text-xs text-slate-400 truncate">
                                    <span className="font-mono-data">{vehicle.plate}</span>
                                    {distanceLabel}
                                  </p>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleAssign(vehicle.id)}
                              disabled={busy}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold shrink-0 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-red-500 ${
                                index === 0
                                  ? 'bg-red-600 hover:bg-red-500 text-white'
                                  : 'border border-red-200 text-red-700 hover:bg-red-50'
                              }`}
                            >
                              {assigningVehicleId === vehicle.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Truck className="w-4 h-4" />
                              )}
                              {t('liveMap.recommend.assign')}
                            </button>
                          </li>
                        );
                      })}
                    </ol>

                    {vehiclesWithoutTeam > 0 && (
                      <p className="text-xs text-amber-600">{t('liveMap.recommend.withoutTeam', { count: vehiclesWithoutTeam })}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
          {error && (
            <div className="mx-5 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            {activeCount === 0 && (
              <button
                onClick={onClose}
                disabled={busy}
                title={t('incidents.dispatchStep.laterTitle')}
                className={SECONDARY_BUTTON}
              >
                {t('incidents.dispatchStep.later')}
              </button>
            )}
            <button
              onClick={() => onOpenLiveMap(incidentId)}
              disabled={busy || !available}
              className={SECONDARY_BUTTON}
            >
              <MapIcon className="w-4 h-4" />
              {t('incidents.dispatchStep.openLiveMap')}
            </button>
            {activeCount > 0 && (
              <button
                onClick={onClose}
                disabled={busy}
                className="ml-auto flex items-center justify-center gap-2 px-6 py-3 min-w-[14rem] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
              >
                <CircleCheck className="w-4 h-4" />
                {t('incidents.dispatchStep.finish')}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
