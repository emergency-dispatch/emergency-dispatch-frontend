import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  GripVertical,
  Loader2,
  Radar,
  Route,
  Siren,
  X,
} from 'lucide-react';
import { SeverityBadge } from '../incidents/SeverityBadge';
import { DispatchTeamLabel } from '../teams/DispatchTeamLabel';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { DISPATCH_ALGORITHM_META, MAX_VEHICLES_BY_LEVEL } from '../../../data/dispatchConfig';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useNow } from '../../../hooks/useNow';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { getApiErrorMessage } from '../../../services/apiClient';
import { dispatchService } from '../../../services/dispatchService';
import type { Incident } from '../../../types/incident';
import type { StationTeam } from '../../../types/stationTeam';
import type { DispatchAlgorithm, DispatchSuggestion, Vehicle } from '../../../types/vehicle';

const DRAG_MIME = 'application/x-resq-vehicle-id';
const BACKEND_ALGORITHM = { nearest: 'NearestAvailable', load_aware: 'LoadAware' } as const;

/**
 * Gợi ý xe từ backend (khớp loại xe theo nhánh sự cố, bán kính tự mở rộng, Nearest / Load-Aware).
 * Tải lại khi đổi thuật toán hoặc số xe đã giao thay đổi.
 */
function useRecommendations(incidentId: string, enabled: boolean, algorithm: DispatchAlgorithm, refreshKey: string) {
  const [state, setState] = useState<{ suggestion: DispatchSuggestion | null; loading: boolean; error: string | null }>({
    suggestion: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
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
              km: u.distanceKm,
              etaMinutes: Math.max(1, Math.round(u.estimatedEtaMinutes)),
              cost: u.cost,
              stationLoad: u.stationLoad,
            })),
          },
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ suggestion: null, loading: false, error: getApiErrorMessage(err, 'Không tải được gợi ý xe.') });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [incidentId, enabled, algorithm, refreshKey]);

  return state;
}

interface DispatchIncidentCardProps {
  incident: Incident;
  vehiclesById: Map<string, Vehicle>;
  /** Tổ phụ trách theo xe (màn Trạm & Tổ). */
  teamByVehicle: Map<string, StationTeam>;
  algorithm: DispatchAlgorithm;
  isSelected: boolean;
  isEscalated: boolean;
  now: number;
  assigningVehicleId: string | null;
  isCancelling: boolean;
  onSelect: () => void;
  onAssign: (vehicleId: string) => void;
  onCancelVehicle: (vehicleId: string) => void;
  cancellingVehicleId: string | null;
  onCancelIncident: () => void;
  onDismissNotice: (noticeId: string) => void;
}

const DispatchIncidentCard: React.FC<DispatchIncidentCardProps> = ({
  incident,
  vehiclesById,
  teamByVehicle,
  algorithm,
  isSelected,
  isEscalated,
  now,
  assigningVehicleId,
  isCancelling,
  onSelect,
  onAssign,
  onCancelVehicle,
  cancellingVehicleId,
  onCancelIncident,
  onDismissNotice,
}) => {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const maxVehicles = MAX_VEHICLES_BY_LEVEL[incident.severity];
  const assigned = incident.assignedVehicleIds.map((id) => vehiclesById.get(id)).filter((v): v is Vehicle => !!v);
  const activeCount = assigned.filter((v) => !incident.reportedVehicleIds.includes(v.id)).length;
  const isFull = activeCount >= maxVehicles;
  const isCompleted = incident.status === 'completed';
  const waitMinutes = Math.max(0, Math.round((now - new Date(incident.createdAt).getTime()) / 60000));

  const { suggestion, loading: suggestionLoading, error: suggestionError } = useRecommendations(
    incident.id,
    isSelected && !isFull && !isCompleted,
    algorithm,
    `${incident.assignedVehicleIds.join(',')}|${isEscalated}`
  );
  // Gợi ý chỉ còn xe đang Sẵn sàng (trạng thái xe có thể đổi sau khi backend trả gợi ý) và có tổ phụ trách —
  // điều động theo tổ, xe chưa có tổ không hiện.
  const readyCandidates = (suggestion?.candidates ?? []).filter(
    (c) => vehiclesById.get(c.vehicleId)?.status === 'available'
  );
  const candidates = readyCandidates.filter((c) => teamByVehicle.has(c.vehicleId));
  const vehiclesWithoutTeam = readyCandidates.length - candidates.length;

  const handleDragOver = (e: React.DragEvent) => {
    if (isFull || isCompleted || !e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const vehicleId = e.dataTransfer.getData(DRAG_MIME);
    if (vehicleId && !isFull) onAssign(vehicleId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-lg border transition-colors ${isDragOver
          ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
          : isCompleted
            ? 'border-emerald-200 bg-emerald-50/50'
            : isEscalated
              ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
              : confirmingCancel
                ? 'border-red-300 bg-red-50/40'
                : isSelected
                  ? 'border-red-300 bg-white shadow-sm'
                  : 'border-slate-200 bg-slate-50/60'
        }`}
    >
      <button onClick={onSelect} className="w-full text-left p-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0" style={{ color: category.color }}>
              <CategoryIcon className="w-3.5 h-3.5" />
              {category.label}
            </span>
            <SeverityBadge severity={incident.severity} />
            {isEscalated && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-[9px] font-bold text-white uppercase animate-pulse shrink-0">
                <Siren className="w-3 h-3" />
                Leo thang
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono-data text-slate-400 whitespace-nowrap">{waitMinutes} phút</span>
        </div>
        <p className="text-xs font-semibold text-slate-900 truncate">{incident.title}</p>
        <p className="text-[10px] text-slate-500 truncate mt-0.5">{incident.area}</p>
      </button>

      <div className="px-3 pb-3 space-y-2">
        {incident.responseNotices.map((notice) => (
          <div
            key={notice.id}
            className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="flex-1">
              <strong className="font-mono-data">{notice.plate}</strong>{' '}
              {notice.kind === 'rejected' ? 'từ chối nhiệm vụ' : 'không phản hồi'}: {notice.reason}. Nhiệm vụ đã trả về
              trung tâm — vui lòng giao xe khác.
            </span>
            <button onClick={() => onDismissNotice(notice.id)} aria-label="Đóng thông báo" className="shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {isCompleted ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã đóng sự cố — {incident.reportedVehicleIds.length} xe đã nộp báo cáo kết thúc
          </div>
        ) : confirmingCancel ? (
          <div className="space-y-2">
            <p className="text-[11px] text-red-600 leading-snug">
              Hủy sự cố này khỏi bản đồ? Chỉ hủy nếu nghi ngờ AI phân loại sai hoặc báo khống — các xe đã giao sẽ được
              trả về trạng thái sẵn sàng.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setConfirmingCancel(false)}
                disabled={isCancelling}
                className="py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                onClick={onCancelIncident}
                disabled={isCancelling}
                className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-colors disabled:opacity-60"
              >
                {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                Xác nhận hủy
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
                Tổ đã giao ({activeCount}/{maxVehicles})
              </span>
              <button
                onClick={() => setConfirmingCancel(true)}
                disabled={isCancelling}
                className="p-1 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                aria-label="Hủy sự cố (AI phân loại sai)"
                title="Hủy sự cố — AI phân loại sai / báo khống"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            </div>

            {assigned.map((vehicle) => {
              const statusMeta = VEHICLE_STATUS_META[vehicle.status];
              const hasReported = incident.reportedVehicleIds.includes(vehicle.id);
              const canRecall = !hasReported && !!vehicle.assignmentId && vehicle.status !== 'on_scene';
              const team = teamByVehicle.get(vehicle.id);
              const progress = (
                <>
                  {' · '}
                  {hasReported ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                      <FileCheck2 className="w-3 h-3" />
                      Đã nộp báo cáo
                    </span>
                  ) : (
                    <span style={{ color: statusMeta.color }} className="font-semibold">
                      {statusMeta.label}
                    </span>
                  )}
                  {!hasReported && vehicle.etaMinutes !== null && vehicle.status !== 'awaiting_ack' &&
                    ` · ETA ${vehicle.etaMinutes} phút`}
                </>
              );
              return (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-2"
                >
                  {team ? (
                    <DispatchTeamLabel team={team} vehicle={vehicle} detail={progress} />
                  ) : (
                    // Xe giao trước khi có tổ (hoặc tổ đã bị xóa) — vẫn theo dõi được tiến độ.
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-700 truncate">Xe chưa có tổ phụ trách</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        <span className="font-mono-data">{vehicle.plate}</span>
                        {progress}
                      </p>
                    </div>
                  )}
                  {canRecall && (
                    <button
                      onClick={() => onCancelVehicle(vehicle.id)}
                      disabled={!!cancellingVehicleId}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 transition-colors disabled:opacity-50"
                      aria-label="Hủy giao tổ"
                      title="Hủy giao — trả tổ về trạng thái sẵn sàng"
                    >
                      {cancellingVehicleId === vehicle.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}

            {assigned.length === 0 && (
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="text-[11px] font-semibold">Chưa giao tổ — chọn từ gợi ý hoặc kéo-thả tổ vào đây</span>
              </div>
            )}

            {!isSelected && !isFull && !isCompleted && (
              <button
                onClick={onSelect}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-red-300 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Radar className="w-3.5 h-3.5" />
                Gợi ý tổ phù hợp
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}

            {isFull && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã đủ số tổ tối đa cho {incident.severity === 3 ? 'Cấp 3' : 'Cấp 1–2'}
              </div>
            )}

            {suggestionLoading && !suggestion && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Đang tìm tổ phù hợp…
              </div>
            )}

            {suggestionError && <p className="text-[11px] text-red-600 px-1">{suggestionError}</p>}

            {suggestion && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
                    <Radar className="w-3 h-3" />
                    TỔ PHÙ HỢP · bán kính {suggestion.radiusKm} km
                  </span>
                  {isEscalated ? (
                    <span className="text-[10px] font-bold text-red-600 whitespace-nowrap">Nhân đôi (leo thang)</span>
                  ) : (
                    suggestion.expanded && (
                      <span className="text-[10px] font-bold text-amber-600 whitespace-nowrap">Đã mở rộng</span>
                    )
                  )}
                </div>

                {candidates.length === 0 ? (
                  <p className="text-[11px] text-red-600 py-1">
                    Không còn tổ phù hợp{suggestion.radiusKm > 0 && ` trong bán kính ${suggestion.radiusKm} km`}.
                  </p>
                ) : (
                  candidates.map((candidate, index) => {
                    const vehicle = vehiclesById.get(candidate.vehicleId)!;
                    const team = teamByVehicle.get(vehicle.id)!;
                    const isAssigning = assigningVehicleId === vehicle.id;
                    return (
                      <div
                        key={vehicle.id}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2 py-1.5"
                        title={
                          algorithm === 'load_aware'
                            ? `Cost = khoảng cách + tải trạm (${Math.round(candidate.stationLoad * 100)}%) + nhiệm vụ đang chạy (trọng số theo cấu hình Admin)`
                            : undefined
                        }
                      >
                        <span className="w-4 text-[10px] font-mono-data font-bold text-slate-400 text-center shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <DispatchTeamLabel
                            team={team}
                            vehicle={vehicle}
                            detail={
                              <>
                                {` · ${candidate.km.toFixed(1)} km · ETA ${candidate.etaMinutes} phút`}
                                {algorithm === 'load_aware' && ` · cost ${candidate.cost.toFixed(2)}`}
                              </>
                            }
                          />
                        </div>
                        <button
                          onClick={() => onAssign(vehicle.id)}
                          disabled={!!assigningVehicleId}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold shrink-0 transition-colors disabled:opacity-60"
                        >
                          {isAssigning && <Loader2 className="w-3 h-3 animate-spin" />}
                          Giao
                        </button>
                      </div>
                    );
                  })
                )}
                {vehiclesWithoutTeam > 0 && (
                  <p className="text-[10px] text-amber-700 px-0.5">
                    {vehiclesWithoutTeam} xe phù hợp chưa có tổ phụ trách — chia tổ ở màn Station Teams để điều động.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface DispatchPanelProps {
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
}

export const DispatchPanel: React.FC<DispatchPanelProps> = ({ selectedIncidentId, onSelectIncident }) => {
  const {
    vehicles,
    incidents,
    escalatedIncidentIds,
    assignVehicle,
    cancelAssignment,
    rejectIncident,
    dismissResponseNotice,
  } = useDispatchStore();
  const now = useNow();
  const [algorithm, setAlgorithm] = useState<DispatchAlgorithm>('nearest');
  const [assigningVehicleId, setAssigningVehicleId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellingVehicleId, setCancellingVehicleId] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  const dispatchIncidents = useMemo(
    () =>
      incidents
        .filter((i) => i.status === 'approved' || i.status === 'completed')
        // Sự cố đang mở xếp trước (Cấp cao trước), sự cố đã đóng xuống cuối.
        .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || b.severity - a.severity),
    [incidents]
  );
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const teamByVehicle = useTeamByVehicle();
  // Tổ sẵn sàng = tổ có xe đang Sẵn sàng. Kéo-thả tổ = giao xe của tổ đó.
  const readyTeams = useMemo(
    () =>
      vehicles
        .filter((v) => v.status === 'available' && teamByVehicle.has(v.id))
        .map((v) => ({ vehicle: v, team: teamByVehicle.get(v.id)! }))
        .sort((a, b) => a.team.name.localeCompare(b.team.name, 'vi')),
    [vehicles, teamByVehicle]
  );

  // Mở chế độ điều phối mà chưa chọn sự cố → tự chọn sự cố ưu tiên nhất còn thiếu xe để gợi ý hiện ngay.
  // Nếu Operator chủ động bỏ chọn thì không tự chọn lại.
  const userClearedRef = useRef(false);
  const firstNeedingVehicles = dispatchIncidents.find(
    (i) =>
      i.status === 'approved' &&
      i.assignedVehicleIds.length - i.reportedVehicleIds.length < MAX_VEHICLES_BY_LEVEL[i.severity]
  );
  useEffect(() => {
    if (selectedIncidentId || userClearedRef.current || !firstNeedingVehicles) return;
    onSelectIncident(firstNeedingVehicles.id);
  }, [selectedIncidentId, firstNeedingVehicles?.id]);

  const handleToggleIncident = (id: string) => {
    const next = id === selectedIncidentId ? null : id;
    userClearedRef.current = next === null;
    onSelectIncident(next);
  };

  const handleAssign = async (incidentId: string, vehicleId: string) => {
    setAssigningVehicleId(vehicleId);
    setPanelError(null);
    const result = await assignVehicle(vehicleId, incidentId, algorithm);
    setAssigningVehicleId(null);
    if (!result.ok) setPanelError(result.message ?? 'Giao xe thất bại.');
  };

  const handleCancelVehicle = async (vehicleId: string) => {
    setCancellingVehicleId(vehicleId);
    setPanelError(null);
    const result = await cancelAssignment(vehicleId);
    setCancellingVehicleId(null);
    if (!result.ok) setPanelError(result.message ?? 'Hủy giao xe thất bại.');
  };

  const handleCancelIncident = async (incidentId: string) => {
    setCancellingId(incidentId);
    setPanelError(null);
    const result = await rejectIncident(
      incidentId,
      'Điều phối viên hủy sự cố đã duyệt (nghi ngờ AI phân loại sai hoặc báo khống).'
    );
    if (!result.ok) setPanelError(result.message ?? 'Hủy sự cố thất bại. Vui lòng thử lại.');
    else if (selectedIncidentId === incidentId) onSelectIncident(null);
    setCancellingId(null);
  };

  return (
    <div className="h-full w-full flex flex-col bg-white border-l border-slate-200">
      <div className="shrink-0 px-4 py-3.5 border-b border-slate-200 space-y-2.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Route className="w-4 h-4 text-red-600 shrink-0" />
            Điều phối sự cố
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Chọn sự cố để xem tổ phù hợp, bấm "Giao" hoặc kéo-thả tổ vào sự cố
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100">
          {(Object.keys(DISPATCH_ALGORITHM_META) as DispatchAlgorithm[]).map((key) => (
            <button
              key={key}
              onClick={() => setAlgorithm(key)}
              title={DISPATCH_ALGORITHM_META[key].description}
              className={`py-1.5 rounded-md text-[11px] font-bold transition-colors ${algorithm === key ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {DISPATCH_ALGORITHM_META[key].label}
            </button>
          ))}
        </div>
      </div>

      {panelError && (
        <div className="shrink-0 mx-3 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="flex-1">{panelError}</span>
          <button onClick={() => setPanelError(null)} aria-label="Đóng thông báo" className="shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {dispatchIncidents.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8">Chưa có sự cố nào được duyệt</div>
        ) : (
          dispatchIncidents.map((incident) => (
            <DispatchIncidentCard
              key={incident.id}
              incident={incident}
              vehiclesById={vehiclesById}
              teamByVehicle={teamByVehicle}
              algorithm={algorithm}
              isSelected={incident.id === selectedIncidentId}
              isEscalated={escalatedIncidentIds.has(incident.id)}
              now={now}
              assigningVehicleId={assigningVehicleId}
              isCancelling={cancellingId === incident.id}
              onSelect={() => handleToggleIncident(incident.id)}
              onAssign={(vehicleId) => handleAssign(incident.id, vehicleId)}
              onCancelVehicle={handleCancelVehicle}
              cancellingVehicleId={cancellingVehicleId}
              onCancelIncident={() => handleCancelIncident(incident.id)}
              onDismissNotice={(noticeId) => dismissResponseNotice(incident.id, noticeId)}
            />
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 max-h-[35%] flex flex-col">
        <div className="px-4 py-2.5 shrink-0 flex items-center justify-between">
          <h3 className="text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
            Tổ sẵn sàng ({readyTeams.length})
          </h3>
          <span className="text-[10px] text-slate-400">Kéo thả vào sự cố</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
          {readyTeams.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-3">
              Không còn tổ sẵn sàng — tổ cần gắn xe ở màn Station Teams mới điều động được.
            </p>
          ) : (
            readyTeams.map(({ vehicle, team }) => {
              return (
                <div
                  key={vehicle.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_MIME, vehicle.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-white cursor-grab active:cursor-grabbing hover:border-slate-300"
                >
                  <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <DispatchTeamLabel team={team} vehicle={vehicle} detail={` · ${vehicle.stationName}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
