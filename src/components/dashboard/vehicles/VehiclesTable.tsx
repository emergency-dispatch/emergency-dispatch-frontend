import React from 'react';
import { Eye } from 'lucide-react';
import { MAINTENANCE_META, getMaintenanceStatus } from '../../../data/stationMock';
import { VEHICLE_TYPE_META } from '../../../data/liveMapMock';
import type { VehicleRecord } from '../../../types/vehicleRecord';

interface VehiclesTableProps {
  vehicles: VehicleRecord[];
  stationNameById: Map<string, string>;
  onViewDetail: (vehicle: VehicleRecord) => void;
}

export const VehiclesTable: React.FC<VehiclesTableProps> = ({ vehicles, stationNameById, onViewDetail }) => {
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="bg-slate-900/70 border-b border-slate-800 text-left">
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Loại xe
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Biển số
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Trạm trực thuộc
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Bảo dưỡng kế tiếp
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold text-right">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {vehicles.map((vehicle) => {
            const typeMeta = VEHICLE_TYPE_META[vehicle.type];
            const TypeIcon = typeMeta.icon;
            const maintenanceStatus = getMaintenanceStatus(vehicle.nextMaintenanceDate);
            const maintenanceMeta = MAINTENANCE_META[maintenanceStatus];

            return (
              <tr
                key={vehicle.id}
                onClick={() => onViewDetail(vehicle)}
                className="cursor-pointer transition-colors hover:bg-slate-900/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <TypeIcon className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="whitespace-nowrap">{typeMeta.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-white font-mono-data whitespace-nowrap">
                  {vehicle.plate}
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                  {stationNameById.get(vehicle.stationId) ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${
                      vehicle.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-700/60'
                        : 'bg-amber-500/15 text-amber-400 border-amber-700/60'
                    }`}
                  >
                    {vehicle.status === 'active' ? 'Active' : 'Maintenance'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${maintenanceMeta.badgeClass}`}
                  >
                    {maintenanceMeta.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail(vehicle);
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 transition-colors"
                      aria-label="Xem chi tiết"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
