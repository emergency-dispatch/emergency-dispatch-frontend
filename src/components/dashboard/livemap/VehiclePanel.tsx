import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META, stations } from '../../../data/liveMapMock';
import type { Vehicle, VehicleFilters } from '../../../types/vehicle';

type PanelTab = 'vehicles' | 'stations';

const AREAS = Array.from(new Set(stations.map((s) => s.area)));

interface VehiclePanelProps {
  vehicles: Vehicle[];
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
}

export const VehiclePanel: React.FC<VehiclePanelProps> = ({
  vehicles,
  filters,
  onFiltersChange,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  const [tab, setTab] = useState<PanelTab>('vehicles');

  return (
    <aside className="h-full w-full flex flex-col bg-white border-l border-slate-200">
      {/* Tabs */}
      <div className="flex shrink-0 border-b border-slate-200">
        <button
          onClick={() => setTab('vehicles')}
          className={`flex-1 py-3 text-xs font-mono-data uppercase tracking-wider font-bold transition-colors ${
            tab === 'vehicles'
              ? 'text-slate-900 border-b-2 border-red-500 bg-slate-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Vehicles ({vehicles.length})
        </button>
        <button
          onClick={() => setTab('stations')}
          className={`flex-1 py-3 text-xs font-mono-data uppercase tracking-wider font-bold transition-colors ${
            tab === 'stations'
              ? 'text-slate-900 border-b-2 border-red-500 bg-slate-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Stations ({stations.length})
        </button>
      </div>

      {tab === 'vehicles' ? (
        <>
          {/* Quick filters */}
          <div className="shrink-0 p-3 space-y-2 border-b border-slate-200">
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as VehicleFilters['status'] })}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(VEHICLE_STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as VehicleFilters['type'] })}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="all">Tất cả loại xe</option>
              {Object.entries(VEHICLE_TYPE_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <select
              value={filters.area}
              onChange={(e) => onFiltersChange({ ...filters, area: e.target.value })}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:border-red-500"
            >
              <option value="all">Tất cả khu vực</option>
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {vehicles.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">Không có xe khớp bộ lọc</div>
            )}
            {vehicles.map((vehicle) => {
              const statusMeta = VEHICLE_STATUS_META[vehicle.status];
              const typeMeta = VEHICLE_TYPE_META[vehicle.type];
              const TypeIcon = typeMeta.icon;
              const isSelected = vehicle.id === selectedVehicleId;

              return (
                <button
                  key={vehicle.id}
                  onClick={() => onSelectVehicle(vehicle.id)}
                  className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
                    isSelected
                      ? 'bg-red-50 border-red-500'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 font-mono-data">{vehicle.plate}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusMeta.color }} />
                      <span className="text-[10px] font-mono-data text-slate-500 whitespace-nowrap">
                        {statusMeta.label}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                    <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{typeMeta.label}</span>
                    <span className="text-slate-300 shrink-0">•</span>
                    <span className="truncate">{vehicle.area}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="text-[11px] text-slate-400 truncate">{vehicle.driver}</span>
                    {vehicle.etaMinutes !== null && (
                      <span className="text-[11px] font-mono-data text-red-600 font-semibold shrink-0">
                        ETA {vehicle.etaMinutes}m
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {stations.map((station) => (
            <div key={station.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-sm font-semibold text-slate-900">{station.name}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{station.area}</div>
              <div className="text-[11px] font-mono-data text-slate-400 mt-1">
                {station.vehicleIds.length} phương tiện
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};
