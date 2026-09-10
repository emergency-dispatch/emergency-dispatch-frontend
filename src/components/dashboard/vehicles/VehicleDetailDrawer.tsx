import React from 'react';
import { Calendar, X } from 'lucide-react';
import { EquipmentChecklist } from './EquipmentChecklist';
import { MaintenanceTimeline } from './MaintenanceTimeline';
import { VEHICLE_TYPE_META } from '../../../data/liveMapMock';
import type { VehicleOperationalStatus, VehicleRecord } from '../../../types/vehicleRecord';

interface VehicleDetailDrawerProps {
  vehicle: VehicleRecord;
  stationName: string;
  onClose: () => void;
  onToggleEquipment: (itemId: string) => void;
  onChangeStatus: (status: VehicleOperationalStatus) => void;
}

export const VehicleDetailDrawer: React.FC<VehicleDetailDrawerProps> = ({
  vehicle,
  stationName,
  onClose,
  onToggleEquipment,
  onChangeStatus,
}) => {
  const typeMeta = VEHICLE_TYPE_META[vehicle.type];
  const TypeIcon = typeMeta.icon;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />

      <aside className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <TypeIcon className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 font-mono-data truncate">{vehicle.plate}</h2>
              <p className="text-xs text-slate-500 truncate">
                {typeMeta.label} · {stationName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-500 font-semibold">
              Trạng thái vận hành
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChangeStatus('active')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  vehicle.status === 'active'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'border-slate-300 text-slate-500 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => onChangeStatus('maintenance')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  vehicle.status === 'maintenance'
                    ? 'bg-amber-50 border-amber-500 text-amber-700'
                    : 'border-slate-300 text-slate-500 hover:text-slate-900'
                }`}
              >
                Maintenance
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
              Lịch bảo dưỡng
            </div>
            <MaintenanceTimeline lastDate={vehicle.lastMaintenanceDate} nextDate={vehicle.nextMaintenanceDate} />
          </div>

          <EquipmentChecklist items={vehicle.equipmentChecklist} onToggle={onToggleEquipment} />
        </div>
      </aside>
    </>
  );
};
