import React, { useMemo, useState } from 'react';
import { AlertTriangle, Ban, Loader2, Route, X } from 'lucide-react';
import { SEVERITY_META } from '../../../data/incidentMock';
import { VEHICLE_TYPE_META } from '../../../data/liveMapMock';
import { useDispatchStore } from '../../../context/DispatchContext';
import type { Incident } from '../../../types/incident';
import type { Vehicle } from '../../../types/vehicle';

interface DispatchIncidentCardProps {
  incident: Incident;
  assignedVehicle: Vehicle | null;
  onCancelVehicle: (vehicleId: string) => void;
  onCancelIncident: (incidentId: string) => void;
  isCancelling: boolean;
}

const DispatchIncidentCard: React.FC<DispatchIncidentCardProps> = ({
  incident,
  assignedVehicle,
  onCancelVehicle,
  onCancelIncident,
  isCancelling,
}) => {
  const severityMeta = SEVERITY_META[incident.severity];
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        confirmingCancel ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${severityMeta.badgeClass}`}
        >
          {severityMeta.label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono-data text-slate-500">{incident.area}</span>
          {!confirmingCancel && (
            <button
              onClick={() => setConfirmingCancel(true)}
              disabled={isCancelling}
              className="p-1 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              aria-label="Hủy sự cố (AI phân loại sai)"
              title="Hủy sự cố — AI phân loại sai / báo khống"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-900 truncate mb-2">{incident.title}</p>

      {confirmingCancel ? (
        <div className="space-y-2">
          <p className="text-[11px] text-red-600 leading-snug">
            Hủy sự cố này khỏi bản đồ? AI đã tự động duyệt lên đây — chỉ hủy nếu nghi ngờ phân loại sai hoặc báo khống.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setConfirmingCancel(false)}
              disabled={isCancelling}
              className="py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Giữ lại
            </button>
            <button
              onClick={() => onCancelIncident(incident.id)}
              disabled={isCancelling}
              className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-colors disabled:opacity-60"
            >
              {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
              Xác nhận hủy
            </button>
          </div>
        </div>
      ) : assignedVehicle ? (
        <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[11px] font-mono-data text-red-600 font-bold truncate">{assignedVehicle.plate}</p>
            <p className="text-[10px] text-slate-500">
              {VEHICLE_TYPE_META[assignedVehicle.type].label} · ETA {assignedVehicle.etaMinutes ?? '--'} phút
            </p>
          </div>
          <button
            onClick={() => onCancelVehicle(assignedVehicle.id)}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 transition-colors"
            aria-label="Hủy gán xe"
            title="Hủy gán — trả xe về trạng thái Available"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="text-[11px] font-semibold">Đang chờ hệ thống tự động gán xe...</span>
        </div>
      )}
    </div>
  );
};

export const DispatchPanel: React.FC = () => {
  const { vehicles, incidents, cancelAssignment, rejectIncident } = useDispatchStore();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const dispatchIncidents = useMemo(
    () => incidents.filter((i) => i.status === 'approved').sort((a, b) => b.severity - a.severity),
    [incidents]
  );
  const availableVehicles = useMemo(() => vehicles.filter((v) => v.status === 'available'), [vehicles]);
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const handleCancelIncident = async (incidentId: string) => {
    setCancellingId(incidentId);
    setCancelError(null);

    const target = dispatchIncidents.find((i) => i.id === incidentId);
    const ok = await rejectIncident(
      incidentId,
      'Điều phối viên hủy sự cố đã tự động duyệt (nghi ngờ AI phân loại sai hoặc báo khống).'
    );

    if (ok) {
      // Free up the vehicle already dispatched to this incident, if any (mock — no Vehicle API yet).
      if (target?.assignedVehicleId) {
        cancelAssignment(target.assignedVehicleId);
      }
    } else {
      setCancelError('Hủy sự cố thất bại. Vui lòng thử lại.');
    }
    setCancellingId(null);
  };

  return (
    <div className="h-full w-full flex flex-col bg-white border-l border-slate-200">
      <div className="shrink-0 px-4 py-3.5 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Route className="w-4 h-4 text-red-600 shrink-0" />
          Điều phối sự cố
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Hệ thống tự động gán xe gần nhất — chỉ can thiệp khi cần hủy
        </p>
      </div>

      {cancelError && (
        <div className="shrink-0 mx-3 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{cancelError}</span>
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
              assignedVehicle={incident.assignedVehicleId ? vehiclesById.get(incident.assignedVehicleId) ?? null : null}
              onCancelVehicle={cancelAssignment}
              onCancelIncident={handleCancelIncident}
              isCancelling={cancellingId === incident.id}
            />
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 max-h-[40%] flex flex-col">
        <div className="px-4 py-2.5 shrink-0">
          <h3 className="text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
            Xe sẵn sàng ({availableVehicles.length})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
          {availableVehicles.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-3">Không còn xe trống</p>
          ) : (
            availableVehicles.map((vehicle) => {
              const typeMeta = VEHICLE_TYPE_META[vehicle.type];
              const TypeIcon = typeMeta.icon;
              return (
                <div
                  key={vehicle.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <TypeIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 font-mono-data truncate">{vehicle.plate}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {typeMeta.label} · {vehicle.area}
                    </p>
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
