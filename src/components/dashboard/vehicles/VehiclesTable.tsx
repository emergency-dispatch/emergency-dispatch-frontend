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
    <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto bg-white shadow-xs">
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Loại xe
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Biển số
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Trạm trực thuộc
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Bảo dưỡng kế tiếp
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold text-right">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vehicles.map((vehicle) => {
            const typeMeta = VEHICLE_TYPE_META[vehicle.type];
            const TypeIcon = typeMeta.icon;
            const maintenanceStatus = getMaintenanceStatus(vehicle.nextMaintenanceDate);
            const maintenanceMeta = MAINTENANCE_META[maintenanceStatus];

            return (
              <tr
                key={vehicle.id}
                onClick={() => onViewDetail(vehicle)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-700">
                    <TypeIcon className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="whitespace-nowrap">{typeMeta.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 font-mono-data whitespace-nowrap">
                  {vehicle.plate}
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {stationNameById.get(vehicle.stationId) ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${
                      vehicle.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
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
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
