import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Route,
  Siren,
  X,
} from 'lucide-react';
import { SeverityBadge } from '../incidents/SeverityBadge';
import { DispatchTeamLabel } from '../teams/DispatchTeamLabel';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { MAX_VEHICLES_BY_LEVEL } from '../../../data/dispatchConfig';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useNow } from '../../../hooks/useNow';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { getApiErrorMessage } from '../../../services/apiClient';
import type { Incident } from '../../../types/incident';
import type { StationTeam } from '../../../types/stationTeam';
import type { Vehicle } from '../../../types/vehicle';

interface IncidentCardProps {
  incident: Incident;
  vehiclesById: Map<string, Vehicle>;
  teamByVehicle: Map<string, StationTeam>;
  isSelected: boolean;
  isEscalated: boolean;
  now: number;
  isCancelling: boolean;
  cancellingVehicleId: string | null;
  onSelect: () => void;
  onCancelVehicle: (vehicleId: string) => void;
  onCancelIncident: () => void;
  onDismissNotice: (noticeId: string) => void;
}

const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  vehiclesById,
  teamByVehicle,
  isSelected,
  isEscalated,
  now,
  isCancelling,
  cancellingVehicleId,
  onSelect,
  onCancelVehicle,
  onCancelIncident,
  onDismissNotice,
}) => {
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const maxVehicles = MAX_VEHICLES_BY_LEVEL[incident.severity];
  const assigned = incident.assignedVehicleIds.map((id) => vehiclesById.get(id)).filter((v): v is Vehicle => !!v);
  const activeCount = assigned.filter((v) => !incident.reportedVehicleIds.includes(v.id)).length;
  const isCompleted = incident.status === 'completed';
  const waitMinutes = Math.max(0, Math.round((now - new Date(incident.createdAt).getTime()) / 60000));

  const borderClass = isEscalated
    ? 'border-l-[3px] border-l-red-500 border-red-200 bg-red-50/60 ring-1 ring-red-200'
    : isSelected
    ? 'border-l-[3px] border-l-red-500 border-slate-200 bg-white shadow-sm'
    : isCompleted
    ? 'border-l-[3px] border-l-emerald-400 border-slate-200 bg-emerald-50/40'
    : confirmingCancel
    ? 'border-l-[3px] border-l-red-400 border-red-100 bg-red-50/30'
    : 'border-l-[3px] border-l-transparent border-slate-200 bg-white hover:border-l-slate-300 hover:shadow-sm';

  return (
    <div className={`rounded-lg border transition-all duration-150 ${borderClass}`}>
      {/* Header row — bấm để chọn sự cố */}
      <button onClick={onSelect} className="w-full text-left px-3 pt-3 pb-2">
        {/* Dòng 1: category + thời gian */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold shrink-0" style={{ color: category.color }}>
              <CategoryIcon className="w-3 h-3" />
              {category.label}
            </span>
            <div className="min-w-0 overflow-hidden">
              <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
            </div>
          </div>
          <span className="text-[10px] font-mono-data text-slate-400 whitespace-nowrap shrink-0">{waitMinutes}ph</span>
        </div>
        {/* Dòng 2: badge leo thang (chỉ hiện khi cần, không làm tràn) */}
        {isEscalated && (
          <div className="mb-1">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600 text-[9px] font-bold text-white uppercase animate-pulse">
              <Siren className="w-2.5 h-2.5" />
              Leo thang — chưa có đơn vị nhận
            </span>
          </div>
        )}
        <p className="text-xs font-semibold text-slate-900 truncate leading-snug">{incident.title}</p>
        <p className="text-[10px] text-slate-500 truncate mt-0.5">{incident.area}</p>
      </button>

      {/* Body */}
      <div className="px-3 pb-3 space-y-2">
        {/* Notices */}
        {incident.responseNotices.map((notice) => (
          <div
            key={notice.id}
            className="flex items-start gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700"
          >
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">
              <strong className="font-mono-data">{notice.plate}</strong>{' '}
              {notice.kind === 'rejected' ? 'từ chối' : 'không phản hồi'} — giao xe khác.
            </span>
            <button onClick={() => onDismissNotice(notice.id)} className="shrink-0 text-amber-400 hover:text-amber-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {isCompleted ? (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã đóng — {incident.reportedVehicleIds.length} xe nộp báo cáo
          </div>
        ) : confirmingCancel ? (
          <div className="space-y-2">
            <p className="text-[10px] text-red-600 leading-snug">
              Hủy sự cố này? Xe đã giao sẽ trả về sẵn sàng.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setConfirmingCancel(false)}
                disabled={isCancelling}
                className="py-1 rounded border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                onClick={onCancelIncident}
                disabled={isCancelling}
                className="flex items-center justify-center gap-1 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold transition-colors disabled:opacity-60"
              >
                {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                Xác nhận hủy
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header xe đã giao */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
                Tổ đã giao ({activeCount}/{maxVehicles})
              </span>
              <button
                onClick={() => setConfirmingCancel(true)}
                disabled={isCancelling}
                className="p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Hủy sự cố — AI phân loại sai / báo khống"
              >
                <Ban className="w-3 h-3" />
              </button>
            </div>

            {/* Danh sách xe đã giao */}
            {assigned.length === 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                <span className="text-[10px] font-semibold">Chưa giao tổ</span>
              </div>
            ) : (
              assigned.map((vehicle) => {
                const statusMeta = VEHICLE_STATUS_META[vehicle.status];
                const hasReported = incident.reportedVehicleIds.includes(vehicle.id);
                const canRecall = !hasReported && !!vehicle.assignmentId && vehicle.status !== 'on_scene';
                const team = teamByVehicle.get(vehicle.id);
                const progressEl = (
                  <>
                    {' · '}
                    {hasReported ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                        <FileCheck2 className="w-2.5 h-2.5" />
                        Đã nộp
                      </span>
                    ) : (
                      <span style={{ color: statusMeta.color }} className="font-semibold">
                        {statusMeta.label}
                      </span>
                    )}
                    {!hasReported && vehicle.etaMinutes !== null && vehicle.status !== 'awaiting_ack' &&
                      ` · ETA ${vehicle.etaMinutes}ph`}
                  </>
                );

                return (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between gap-1.5 bg-slate-50 border border-slate-100 rounded px-2 py-1.5"
                  >
                    {team ? (
                      <DispatchTeamLabel team={team} vehicle={vehicle} detail={progressEl} />
                    ) : (
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-amber-700 truncate">Xe chưa có tổ</p>
                        <p className="text-[9px] text-slate-400 truncate">
                          <span className="font-mono-data">{vehicle.plate}</span>
                          {progressEl}
                        </p>
                      </div>
                    )}
                    {canRecall && (
                      <button
                        onClick={() => onCancelVehicle(vehicle.id)}
                        disabled={!!cancellingVehicleId}
                        className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors disabled:opacity-40"
                        title="Hủy giao tổ"
                      >
                        {cancellingVehicleId === vehicle.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <X className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface DispatchIncidentListProps {
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  panelError: string | null;
  onClearError: () => void;
  cancellingVehicleId: string | null;
  cancellingIncidentId: string | null;
  onCancelVehicle: (vehicleId: string) => void;
  onCancelIncident: (incidentId: string) => void;
  onDismissNotice: (incidentId: string, noticeId: string) => void;
}

export const DispatchIncidentList: React.FC<DispatchIncidentListProps> = ({
  selectedIncidentId,
  onSelectIncident,
  panelError,
  onClearError,
  cancellingVehicleId,
  cancellingIncidentId,
  onCancelVehicle,
  onCancelIncident,
  onDismissNotice,
}) => {
  const { vehicles, incidents, escalatedIncidentIds } = useDispatchStore();
  const now = useNow();
  const teamByVehicle = useTeamByVehicle();

  const dispatchIncidents = useMemo(
    () =>
      incidents
        .filter((i) => i.status === 'approved' || i.status === 'completed')
        .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || b.severity - a.severity),
    [incidents]
  );
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const handleToggle = (id: string) => {
    onSelectIncident(id === selectedIncidentId ? null : id);
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      {/* Header */}
      <div className="shrink-0 px-4 py-3.5 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Route className="w-4 h-4 text-red-600 shrink-0" />
          Điều phối sự cố
        </h2>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Chọn sự cố để xem gợi ý tổ phù hợp
        </p>
      </div>

      {/* Error banner */}
      {panelError && (
        <div className="shrink-0 mx-3 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="flex-1">{panelError}</span>
          <button onClick={onClearError} className="shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Incident cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {dispatchIncidents.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-10">Chưa có sự cố nào được duyệt</div>
        ) : (
          dispatchIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              vehiclesById={vehiclesById}
              teamByVehicle={teamByVehicle}
              isSelected={incident.id === selectedIncidentId}
              isEscalated={escalatedIncidentIds.has(incident.id)}
              now={now}
              isCancelling={cancellingIncidentId === incident.id}
              cancellingVehicleId={cancellingVehicleId}
              onSelect={() => handleToggle(incident.id)}
              onCancelVehicle={onCancelVehicle}
              onCancelIncident={() => onCancelIncident(incident.id)}
              onDismissNotice={(noticeId) => onDismissNotice(incident.id, noticeId)}
            />
          ))
        )}
      </div>
    </div>
  );
};
