import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { GripVertical, Route, Target, X } from 'lucide-react';
import { SEVERITY_META } from '../../../data/incidentMock';
import { VEHICLE_TYPE_META } from '../../../data/liveMapMock';
import { useDispatchStore } from '../../../context/DispatchContext';
import type { Incident } from '../../../types/incident';
import type { Vehicle } from '../../../types/vehicle';

interface DraggableVehicleChipProps {
  vehicle: Vehicle;
}

const DraggableVehicleChip: React.FC<DraggableVehicleChipProps> = ({ vehicle }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: vehicle.id });
  const typeMeta = VEHICLE_TYPE_META[vehicle.type];
  const TypeIcon = typeMeta.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border touch-none select-none cursor-grab active:cursor-grabbing transition-colors ${
        isDragging ? 'opacity-30 border-blue-600' : 'border-slate-800 bg-slate-900/70 hover:border-blue-600/60'
      }`}
    >
      <TypeIcon className="w-4 h-4 text-emerald-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white font-mono-data truncate">{vehicle.plate}</p>
        <p className="text-[10px] text-slate-500 truncate">
          {typeMeta.label} · {vehicle.area}
        </p>
      </div>
      <GripVertical className="w-3.5 h-3.5 text-slate-600 shrink-0" />
    </div>
  );
};

interface DroppableIncidentCardProps {
  incident: Incident;
  assignedVehicle: Vehicle | null;
  onAutoAssign: (incident: Incident) => void;
  onCancel: (vehicleId: string) => void;
}

const DroppableIncidentCard: React.FC<DroppableIncidentCardProps> = ({
  incident,
  assignedVehicle,
  onAutoAssign,
  onCancel,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: incident.id, disabled: !!assignedVehicle });
  const severityMeta = SEVERITY_META[incident.severity];

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-3 transition-colors ${
        isOver ? 'border-blue-500 bg-blue-600/10' : 'border-slate-800 bg-slate-900/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${severityMeta.badgeClass}`}
        >
          {severityMeta.label}
        </span>
        <span className="text-[10px] font-mono-data text-slate-500 shrink-0">{incident.area}</span>
      </div>
      <p className="text-xs font-semibold text-white truncate mb-2">{incident.title}</p>

      {assignedVehicle ? (
        <div className="flex items-center justify-between gap-2 bg-slate-800/60 rounded-md px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[11px] font-mono-data text-blue-400 font-bold truncate">{assignedVehicle.plate}</p>
            <p className="text-[10px] text-slate-500">ETA {assignedVehicle.etaMinutes ?? '--'} phút</p>
          </div>
          <button
            onClick={() => onCancel(assignedVehicle.id)}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-950/40 shrink-0 transition-colors"
            aria-label="Hủy gán"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onAutoAssign(incident)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md bg-blue-600/15 hover:bg-blue-600/25 border border-blue-800/60 text-blue-400 text-[11px] font-bold transition-colors"
        >
          <Target className="w-3.5 h-3.5" />
          Gán xe gần nhất
        </button>
      )}
    </div>
  );
};

export const DispatchPanel: React.FC = () => {
  const { vehicles, incidents, assignVehicle, cancelAssignment, findNearestAvailableVehicle } = useDispatchStore();
  const [activeDragVehicle, setActiveDragVehicle] = useState<Vehicle | null>(null);

  const dispatchIncidents = useMemo(
    () => incidents.filter((i) => i.status === 'approved').sort((a, b) => b.severity - a.severity),
    [incidents]
  );
  const availableVehicles = useMemo(() => vehicles.filter((v) => v.status === 'available'), [vehicles]);
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragVehicle(vehiclesById.get(String(event.active.id)) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragVehicle(null);
    if (event.over) assignVehicle(String(event.active.id), String(event.over.id));
  };

  const handleAutoAssign = (incident: Incident) => {
    const nearest = findNearestAvailableVehicle(incident);
    if (nearest) assignVehicle(nearest.id, incident.id);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full w-full flex flex-col bg-[#0B0F19] border-l border-slate-800">
        <div className="shrink-0 px-4 py-3.5 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Route className="w-4 h-4 text-blue-400 shrink-0" />
            Điều phối sự cố
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Kéo xe vào thẻ sự cố hoặc bấm gán tự động</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
          {dispatchIncidents.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-8">Chưa có sự cố nào được duyệt</div>
          ) : (
            dispatchIncidents.map((incident) => (
              <DroppableIncidentCard
                key={incident.id}
                incident={incident}
                assignedVehicle={incident.assignedVehicleId ? vehiclesById.get(incident.assignedVehicleId) ?? null : null}
                onAutoAssign={handleAutoAssign}
                onCancel={cancelAssignment}
              />
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-slate-800 max-h-[40%] flex flex-col">
          <div className="px-4 py-2.5 shrink-0">
            <h3 className="text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Xe sẵn sàng ({availableVehicles.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
            {availableVehicles.length === 0 ? (
              <p className="text-[11px] text-slate-600 text-center py-3">Không còn xe trống</p>
            ) : (
              availableVehicles.map((vehicle) => <DraggableVehicleChip key={vehicle.id} vehicle={vehicle} />)
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDragVehicle && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-blue-500 bg-slate-900 shadow-2xl shadow-black/60">
            <span className="text-xs font-bold text-white font-mono-data">{activeDragVehicle.plate}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
