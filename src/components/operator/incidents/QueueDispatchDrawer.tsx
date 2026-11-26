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
import { RecommendedTeamLabel } from '../teams/RecommendedTeamLabel';
import { CaseSteps } from './CaseSteps';
import { DispatchMiniMap } from './DispatchMiniMap';
import { IncidentThumbnail } from './IncidentThumbnail';
import { SeverityBadge } from './SeverityBadge';
import { SourceChip } from './SourceChip';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { DISPATCH_ALGORITHM_META } from '../../../data/dispatchConfig';
import { DispatchPlanHint } from '../livemap/DispatchPlanHint';
import { DispatchShortages } from '../livemap/DispatchShortages';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useDispatchNeeds } from '../../../hooks/useDispatchNeeds';
import { useDispatchRecommendations } from '../../../hooks/useDispatchRecommendations';
import { useAssignmentTeam, useTeamByVehicle } from '../../../hooks/useStationTeams';
import { findVehicleAssignment } from '../completion/completionGroups';
import type { DispatchAlgorithm, DispatchCandidate, DispatchTeamCandidate } from '../../../types/vehicle';
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
  const { incidents, vehicles, stations, escalatedIncidentIds, assignTeam, vehicleLimitFor, assignmentsByIncident } =
    useDispatchStore();
  const assignmentTeam = useAssignmentTeam();
  const teamByVehicle = useTeamByVehicle();
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const { unitTypeLabel } = useDispatchStore();
  const [algorithm, setAlgorithm] = useState<DispatchAlgorithm>('nearest');
  const [assigningTeamId, setAssigningTeamId] = useState<string | null>(null);
  // §34: chức năng Operator chọn cho từng tổ có nhiều chức năng (teamId → mã loại xe).
  const [optionByTeam, setOptionByTeam] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  // Tổ đang được rê chuột ở danh sách / bấm trên bản đồ nhỏ — đồng bộ hai bên.
  const [highlightedVehicleId, setHighlightedVehicleId] = useState<string | null>(null);

  const incident = useMemo(() => incidents.find((i) => i.id === incidentId) ?? null, [incidents, incidentId]);
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  // Sự cố bị hủy / chuyển trạm / hoàn tất trong lúc đang mở → không điều xe được nữa.
  const available = !!incident && incident.status === 'approved';
  // BR-14 theo kế hoạch điều xe của loại sự cố (§32).
  const vehicleLimit = incident ? vehicleLimitFor(incident) : null;
  const maxVehicles = vehicleLimit?.max ?? 1;
  const activeVehicleIds = incident
    ? incident.assignedVehicleIds.filter((id) => !incident.reportedVehicleIds.includes(id))
    : [];
  const activeCount = activeVehicleIds.length;
  const isFull = activeCount >= maxVehicles;
  const isEscalated = escalatedIncidentIds.has(incidentId);

  const { neededTypes, refreshKey } = useDispatchNeeds(incident);
  const { suggestion, loading, error: suggestionError } = useDispatchRecommendations(
    incidentId,
    available && !isFull,
    algorithm,
    refreshKey,
    neededTypes
  );

  // §34: backend chỉ gợi ý tổ có nhân viên đang hoạt động, không bận và có xe đúng chức năng đang Sẵn sàng.
  const teams = suggestion?.teams ?? [];
  const optionOf = (team: DispatchTeamCandidate): DispatchCandidate =>
    team.options.find((o) => o.unitType === optionByTeam[team.teamId]) ?? team.options[0];

  const handleAssign = async (team: DispatchTeamCandidate) => {
    setAssigningTeamId(team.teamId);
    setError(null);
    const result = await assignTeam(
      { teamId: team.teamId, teamName: team.teamName, unitType: optionOf(team).unitType },
      incidentId,
      algorithm
    );
    setAssigningTeamId(null);
    if (!result.ok) setError(result.message ?? t('context.assignFailed'));
  };

  const category = incident ? INCIDENT_CATEGORY_META[incident.category] : null;
  const busy = !!assigningTeamId;

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
                {incidentKindLabel(incident)}
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
                {/* Ảnh thu nhỏ cạnh tóm tắt AI để nhường chỗ cho bản đồ — thứ cần nhất khi chọn xe */}
                <div className="flex items-start gap-3">
                  <IncidentThumbnail incident={incident} className="w-28 aspect-[4/3] shrink-0" />
                  {incident.aiSummary && (
                    <p
                      className="text-sm text-slate-700 leading-relaxed break-words line-clamp-4"
                      title={incident.aiSummary}
                    >
                      {incident.aiSummary}
                    </p>
                  )}
                </div>
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="break-words">{incident.area}</span>
                </p>
                <DispatchMiniMap
                  incident={incident}
                  candidates={teams.map((team, index) => {
                    const option = optionOf(team);
                    return { vehicleId: option.vehicleId, lat: option.lat, lng: option.lng, stationId: option.stationId, rank: index + 1 };
                  })}
                  assigned={activeVehicleIds.flatMap((id) => {
                    const v = vehiclesById.get(id);
                    return v
                      ? [{ vehicleId: v.id, lat: v.lat, lng: v.lng, type: v.type, status: v.status, stationId: v.stationId, heading: v.heading }]
                      : [];
                  })}
                  stations={stations}
                  highlightedVehicleId={highlightedVehicleId}
                  onSelectCandidate={(vehicleId) => {
                    setHighlightedVehicleId(vehicleId);
                    const team = teams.find((tm) => optionOf(tm).vehicleId === vehicleId);
                    if (team)
                      document
                        .getElementById(`queue-candidate-${team.teamId}`)
                        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                  }}
                />

                <section className="border-t border-slate-100 pt-4">
                  <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
                    {t('incidents.dispatchStep.assignedHeading', { count: activeCount, max: maxVehicles })}
                  </h3>
                  {vehicleLimit && <DispatchPlanHint limit={vehicleLimit} className="-mt-1 mb-2" />}
                  {activeCount === 0 ? (
                    <p className="text-sm text-slate-400">{t('incidents.dispatchStep.noneAssigned')}</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {activeVehicleIds.map((vehicleId) => {
                        const vehicle = vehiclesById.get(vehicleId);
                        if (!vehicle) return null;
                        const team = assignmentTeam(
                          vehicleId,
                          findVehicleAssignment(assignmentsByIncident.get(incidentId), vehicleId, vehicle.assignmentId)
                        );
                        return (
                          <li key={vehicleId} className="flex items-center gap-2.5 py-2">
                            <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="min-w-0 flex-1">
                              {team?.team ? (
                                <DispatchTeamLabel team={team.team} name={team.name} vehicle={vehicle} />
                              ) : (
                                // Tổ trạm khác đi hỗ trợ → tên tổ + loại xe; lượt cũ xe chưa có tổ → loại xe.
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {team ? `${team.name} · ` : ''}
                                  {unitTypeLabel(vehicle.unitType)}{' '}
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
                        {suggestion && suggestion.radiusKm > 0 && (
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

                    {/* Danh sách xếp hạng: số thứ tự là thứ hạng gợi ý thật, không phải trang trí */}
                    <ol className={`divide-y divide-slate-100 ${teams.length > 0 ? 'border-y border-slate-100' : ''}`}>
                      {teams.map((team, index) => {
                        const option = optionOf(team);
                        const leader = teamByVehicle
                          .get(option.vehicleId)
                          ?.members.find((m) => m.crewRole === 'commander');
                        const distanceLabel = (
                          <>
                            {t('liveMap.recommend.distance', { km: option.km.toFixed(1) })}
                            {option.isApproximate && t('liveMap.recommend.approximate')}
                            {t('liveMap.recommend.etaShort', { count: option.etaMinutes })}
                            {algorithm === 'load_aware' && ` · ${option.cost.toFixed(2)}`}
                          </>
                        );
                        return (
                          <li
                            key={team.teamId}
                            id={`queue-candidate-${team.teamId}`}
                            // Rê chuột lên tổ → ghim xe tổ mang theo trên bản đồ nhỏ phóng to (và ngược lại khi bấm ghim).
                            onMouseEnter={() => setHighlightedVehicleId(option.vehicleId)}
                            onMouseLeave={() => setHighlightedVehicleId(null)}
                            className={`flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg transition-colors ${
                              highlightedVehicleId === option.vehicleId ? 'bg-slate-100' : ''
                            }`}
                            title={
                              algorithm === 'load_aware'
                                ? t('liveMap.recommend.costTitle', { load: Math.round(option.stationLoad * 100) })
                                : undefined
                            }
                          >
                            <span
                              className={`w-6 text-center text-sm font-bold shrink-0 ${index === 0 ? 'text-red-600' : 'text-slate-300'}`}
                            >
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              {team.isSupportUnit && (
                                <span className="inline-flex items-center gap-0.5 mb-0.5 px-1.5 py-px rounded bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700">
                                  <HandHelping className="w-3 h-3" />
                                  {t('liveMap.recommend.supportUnit', { station: team.stationName })}
                                </span>
                              )}
                              <RecommendedTeamLabel
                                team={team}
                                selected={option}
                                onSelectOption={(unitType) =>
                                  setOptionByTeam((prev) => ({ ...prev, [team.teamId]: unitType }))
                                }
                                leaderName={leader?.fullName}
                                disabled={busy}
                                detail={distanceLabel}
                              />
                            </div>
                            <button
                              onClick={() => handleAssign(team)}
                              disabled={busy}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold shrink-0 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-red-500 ${
                                index === 0
                                  ? 'bg-red-600 hover:bg-red-500 text-white'
                                  : 'border border-red-200 text-red-700 hover:bg-red-50'
                              }`}
                            >
                              {assigningTeamId === team.teamId ? (
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

                    {suggestion && <DispatchShortages shortages={suggestion.shortages} incidentId={incidentId} />}
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
