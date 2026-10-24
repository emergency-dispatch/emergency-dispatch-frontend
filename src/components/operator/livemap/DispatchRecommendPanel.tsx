import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  GripVertical,
  HandHelping,
  Loader2,
  Plus,
  Radar,
} from 'lucide-react';
import { DispatchTeamLabel } from '../teams/DispatchTeamLabel';
import { INCIDENT_CATEGORY_META, OVERRIDE_REASON_MIN_LENGTH } from '../../../data/incidentMock';
import { VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import { DISPATCH_ALGORITHM_META, MAX_VEHICLES_BY_LEVEL } from '../../../data/dispatchConfig';
import { useDispatchStore, type AssignOptions } from '../../../context/DispatchContext';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { getApiErrorMessage } from '../../../services/apiClient';
import { dispatchService } from '../../../services/dispatchService';
import type { DispatchAlgorithm, DispatchSuggestion, Vehicle } from '../../../types/vehicle';

const DRAG_MIME = 'application/x-resq-vehicle-id';
const BACKEND_ALGORITHM = { nearest: 'NearestAvailable', load_aware: 'LoadAware' } as const;

function useRecommendations(
  incidentId: string | null,
  enabled: boolean,
  algorithm: DispatchAlgorithm,
  refreshKey: string
) {
  const [state, setState] = useState<{ suggestion: DispatchSuggestion | null; loading: boolean; error: string | null }>({
    suggestion: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !incidentId) {
      setState({ suggestion: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    dispatchService
      .getRecommendations(incidentId, BACKEND_ALGORITHM[algorithm])
      .then((res) => {
        if (cancelled) return;
        if (!res.success) throw new Error(res.message);
        const first = res.data[0];
        setState({
          loading: false,
          error: null,
          suggestion: {
            radiusKm: first?.searchRadiusKm ?? 0,
            expanded: first?.radiusExpanded ?? false,
            candidates: res.data.map((u) => ({
              vehicleId: u.rescueUnitId,
              // Quãng đường đường bộ (OSRM); thiếu thì dùng đường chim bay và coi là ước lượng.
              km: u.roadDistanceKm ?? u.distanceKm,
              etaMinutes: Math.max(1, Math.round(u.estimatedEtaMinutes)),
              cost: u.cost,
              stationLoad: u.stationLoad,
              isApproximate: !!u.isApproximate || u.roadDistanceKm == null,
              isSupportUnit: !!u.isSupportUnit,
              stationName: u.stationName,
            })),
          },
        });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ suggestion: null, loading: false, error: getApiErrorMessage(err, 'Không tải được gợi ý xe.') });
      });
    return () => { cancelled = true; };
  }, [incidentId, enabled, algorithm, refreshKey]);

  return state;
}

interface DispatchRecommendPanelProps {
  selectedIncidentId: string | null;
  assigningVehicleId: string | null;
  /** vehicleId + algorithm đang chọn — để LiveMapPage gọi đúng thuật toán; options khi giao thêm tổ cho Cấp 1–2. */
  onAssign: (vehicleId: string, algorithm: DispatchAlgorithm, options?: AssignOptions) => void;
}

export const DispatchRecommendPanel: React.FC<DispatchRecommendPanelProps> = ({
  selectedIncidentId,
  assigningVehicleId,
  onAssign,
}) => {
  const { vehicles, incidents, escalatedIncidentIds } = useDispatchStore();
  const [algorithm, setAlgorithm] = useState<DispatchAlgorithm>('nearest');
  // Cấp 1–2 đã đủ 1 tổ: backend cho giao thêm khi có lý do ≥ 5 ký tự.
  const [extraMode, setExtraMode] = useState(false);
  const [extraReason, setExtraReason] = useState('');
  const teamByVehicle = useTeamByVehicle();

  useEffect(() => {
    setExtraMode(false);
    setExtraReason('');
  }, [selectedIncidentId]);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  );
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const maxVehicles = selectedIncident ? MAX_VEHICLES_BY_LEVEL[selectedIncident.severity] : 1;
  const activeCount = selectedIncident
    ? selectedIncident.assignedVehicleIds.length - selectedIncident.reportedVehicleIds.length
    : 0;
  const isFull = activeCount >= maxVehicles;
  const isCompleted = selectedIncident?.status === 'completed';
  const canAddExtra = isFull && !isCompleted && !!selectedIncident && selectedIncident.severity !== 3;
  const extraReasonValid = extraReason.trim().length >= OVERRIDE_REASON_MIN_LENGTH;
  const showSuggestions = !isCompleted && (!isFull || (canAddExtra && extraMode));
  const isEscalated = selectedIncident ? escalatedIncidentIds.has(selectedIncident.id) : false;
  const category = selectedIncident ? INCIDENT_CATEGORY_META[selectedIncident.category] : null;

  const refreshKey = selectedIncident
    ? `${selectedIncident.assignedVehicleIds.join(',')}|${isEscalated}`
    : '';

  const { suggestion, loading: suggestionLoading, error: suggestionError } = useRecommendations(
    selectedIncidentId,
    !!selectedIncidentId && showSuggestions,
    algorithm,
    refreshKey
  );

  const readyCandidates = (suggestion?.candidates ?? []).filter(
    (c) => vehiclesById.get(c.vehicleId)?.status === 'available'
  );
  // Điều phối theo tổ: xe trạm mình phải có tổ. Xe hỗ trợ của trạm khác thì Operator không xem được tổ (403) →
  // vẫn cho giao, hiện theo xe.
  const candidates = readyCandidates.filter((c) => teamByVehicle.has(c.vehicleId) || c.isSupportUnit);
  const vehiclesWithoutTeam = readyCandidates.length - candidates.length;
  const assignOptions: AssignOptions | undefined =
    isFull && extraMode ? { allowExtraUnits: true, notes: extraReason.trim() } : undefined;
  const assignBlocked = isFull && extraMode && !extraReasonValid;

  // Tổ sẵn sàng để kéo thả
  const readyTeams = useMemo(
    () =>
      vehicles
        .filter((v) => v.status === 'available' && teamByVehicle.has(v.id))
        .map((v) => ({ vehicle: v, team: teamByVehicle.get(v.id)! }))
        .sort((a, b) => a.team.name.localeCompare(b.team.name, 'vi')),
    [vehicles, teamByVehicle]
  );

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header: sự cố đang chọn */}
      <div className="shrink-0 px-4 py-3.5 border-b border-slate-200">
        {selectedIncident && category ? (
          <>
            <div className="flex items-center gap-1.5 mb-1">
              <category.icon className="w-3.5 h-3.5 shrink-0" style={{ color: category.color }} />
              <span className="text-[10px] font-bold" style={{ color: category.color }}>{category.label}</span>
              {isEscalated && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600 text-[9px] font-bold text-white uppercase animate-pulse">
                  Leo thang
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-900 truncate leading-snug">{selectedIncident.title}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{selectedIncident.area}</p>
          </>
        ) : (
          <>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Radar className="w-4 h-4 text-red-600 shrink-0" />
              Điều Phối Xe
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Chọn sự cố ở bảng bên trái</p>
          </>
        )}
      </div>

      {/* Algorithm toggle */}
      {selectedIncident && (
        <div className="shrink-0 px-3 py-2 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100">
            {(Object.keys(DISPATCH_ALGORITHM_META) as DispatchAlgorithm[]).map((key) => (
              <button
                key={key}
                onClick={() => setAlgorithm(key)}
                title={DISPATCH_ALGORITHM_META[key].description}
                className={`py-1.5 rounded-md text-[11px] font-bold transition-colors ${algorithm === key ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {DISPATCH_ALGORITHM_META[key].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0 space-y-2">
        {!selectedIncident ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 pb-8">
            <Radar className="w-10 h-10 text-slate-200" />
            <p className="text-xs text-center leading-relaxed">
              Chọn một sự cố từ bảng bên trái<br />để xem tổ phù hợp
            </p>
          </div>
        ) : !showSuggestions ? (
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              {isCompleted ? 'Sự cố đã đóng' : `Đã đủ ${maxVehicles} tổ tối đa`}
            </div>
            {canAddExtra && (
              <button
                onClick={() => setExtraMode(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-slate-300 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Giao thêm tổ (cần lý do)
              </button>
            )}
          </div>
        ) : (
          <>
            {isFull && extraMode && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 space-y-1.5 mb-1">
                <p className="text-[11px] text-amber-800">
                  Sự cố Cấp {selectedIncident.severity} đã có {activeCount} tổ. Ghi lý do giao thêm (lưu nhật ký):
                </p>
                <textarea
                  value={extraReason}
                  onChange={(e) => setExtraReason(e.target.value)}
                  rows={2}
                  placeholder="Vd: Có nhiều nạn nhân, cần thêm xe cứu thương…"
                  className="w-full rounded border border-amber-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-300"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-700">
                    {extraReasonValid ? '' : `Tối thiểu ${OVERRIDE_REASON_MIN_LENGTH} ký tự`}
                  </span>
                  <button
                    onClick={() => {
                      setExtraMode(false);
                      setExtraReason('');
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    Thôi, không giao thêm
                  </button>
                </div>
              </div>
            )}
            {/* Tiêu đề gợi ý */}
            {(suggestionLoading || suggestion) && (
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="flex items-center gap-1 text-[10px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
                  <Radar className="w-3 h-3" />
                  Tổ phù hợp
                  {suggestion && ` · ${suggestion.radiusKm} km`}
                </span>
                {isEscalated ? (
                  <span className="text-[10px] font-bold text-red-600">Nhân đôi bán kính</span>
                ) : suggestion?.expanded ? (
                  <span className="text-[10px] font-bold text-amber-600">Đã mở rộng</span>
                ) : null}
              </div>
            )}

            {suggestionLoading && !suggestion && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Đang tìm tổ phù hợp…
              </div>
            )}

            {suggestionError && <p className="text-[11px] text-red-600">{suggestionError}</p>}

            {suggestion && candidates.length === 0 && (
              <p className="text-[11px] text-red-600 py-1">
                Không còn tổ phù hợp{suggestion.radiusKm > 0 && ` trong ${suggestion.radiusKm} km`}.
              </p>
            )}

            {candidates.map((candidate, index) => {
              const vehicle = vehiclesById.get(candidate.vehicleId)!;
              const team = teamByVehicle.get(vehicle.id);
              const isAssigning = assigningVehicleId === vehicle.id;
              const distanceLabel = (
                <>
                  {` · ${candidate.km.toFixed(1)} km${candidate.isApproximate ? ' (ước lượng)' : ''} · ETA ${
                    candidate.etaMinutes
                  }ph`}
                  {algorithm === 'load_aware' && ` · ${candidate.cost.toFixed(2)}`}
                </>
              );
              return (
                <div
                  key={vehicle.id}
                  className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-red-200 hover:bg-red-50/30 transition-colors"
                  title={
                    algorithm === 'load_aware'
                      ? `Cost: khoảng cách + tải trạm (${Math.round(candidate.stationLoad * 100)}%) + nhiệm vụ`
                      : undefined
                  }
                >
                  <span className="w-5 text-[10px] font-mono-data font-bold text-slate-300 text-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {candidate.isSupportUnit && (
                      <span className="inline-flex items-center gap-0.5 mb-0.5 px-1.5 py-px rounded bg-blue-50 border border-blue-200 text-[9px] font-bold text-blue-700">
                        <HandHelping className="w-2.5 h-2.5" />
                        Xe hỗ trợ · {candidate.stationName}
                      </span>
                    )}
                    {team ? (
                      <DispatchTeamLabel team={team} vehicle={vehicle} detail={distanceLabel} />
                    ) : (
                      // Xe hỗ trợ trạm khác: không xem được tổ → hiện theo xe.
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {VEHICLE_TYPE_META[vehicle.type].label}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          <span className="font-mono-data">{vehicle.plate}</span>
                          {distanceLabel}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onAssign(vehicle.id, algorithm, assignOptions)}
                    disabled={!!assigningVehicleId || assignBlocked}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold shrink-0 transition-colors disabled:opacity-60"
                  >
                    {isAssigning && <Loader2 className="w-3 h-3 animate-spin" />}
                    Giao
                  </button>
                </div>
              );
            })}

            {vehiclesWithoutTeam > 0 && (
              <p className="text-[10px] text-amber-600 px-0.5">
                {vehiclesWithoutTeam} xe phù hợp chưa có tổ — vào Station Teams để chia tổ.
              </p>
            )}
          </>
        )}
      </div>

      {/* Tổ sẵn sàng — kéo thả */}
      <div className="shrink-0 border-t border-slate-200 max-h-[38%] flex flex-col">
        <div className="px-4 py-2.5 shrink-0 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-[10px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
            Tổ sẵn sàng ({readyTeams.length})
          </h3>
          <span className="text-[9px] text-slate-400">Kéo thả vào sự cố</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2 space-y-1.5 min-h-0">
          {readyTeams.length === 0 ? (
            <p className="text-[10px] text-slate-400 text-center py-3">
              Không còn tổ sẵn sàng
            </p>
          ) : (
            readyTeams.map(({ vehicle, team }) => (
              <div
                key={vehicle.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_MIME, vehicle.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 bg-white cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <div className="min-w-0 flex-1">
                  <DispatchTeamLabel team={team} vehicle={vehicle} detail={` · ${vehicle.stationName}`} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
