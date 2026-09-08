import React, { useMemo, useState } from 'react';
import { Route } from 'lucide-react';
import { DispatchPanel } from '../../../components/dashboard/livemap/DispatchPanel';
import { LiveMapView } from '../../../components/dashboard/livemap/LiveMapView';
import { VehiclePanel } from '../../../components/dashboard/livemap/VehiclePanel';
import { useDispatchStore } from '../../../context/DispatchContext';
import type { VehicleFilters } from '../../../types/vehicle';

const DEFAULT_FILTERS: VehicleFilters = { type: 'all', status: 'all', area: 'all' };

export const LiveMapPage: React.FC = () => {
  const { vehicles, incidents } = useDispatchStore();
  const [filters, setFilters] = useState<VehicleFilters>(DEFAULT_FILTERS);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [dispatchMode, setDispatchMode] = useState(false);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filters.type !== 'all' && v.type !== filters.type) return false;
      if (filters.status !== 'all' && v.status !== filters.status) return false;
      if (filters.area !== 'all' && v.area !== filters.area) return false;
      return true;
    });
  }, [vehicles, filters]);

  const dispatchIncidents = useMemo(() => incidents.filter((i) => i.status === 'approved'), [incidents]);
  const pendingDispatchCount = useMemo(
    () => dispatchIncidents.filter((i) => !i.assignedVehicleId).length,
    [dispatchIncidents]
  );
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId((current) => (current === id ? null : id));
  };

  return (
    <div className="h-full flex">
      <div className="flex-[7] min-w-0 h-full relative">
        <LiveMapView
          vehicles={filteredVehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={handleSelectVehicle}
          dispatchIncidents={dispatchMode ? dispatchIncidents : []}
          vehiclesById={vehiclesById}
        />

        <button
          onClick={() => setDispatchMode((v) => !v)}
          className={`absolute top-4 right-4 z-[1000] flex items-center gap-2 px-3.5 py-2.5 rounded-xl border shadow-lg transition-colors ${
            dispatchMode
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'cad-glass border-slate-700/80 text-slate-300 hover:text-white'
          }`}
        >
          <Route className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold whitespace-nowrap">Chế độ điều phối</span>
          {pendingDispatchCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold shrink-0">
              {pendingDispatchCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-[3] min-w-[320px] max-w-[420px] h-full">
        {dispatchMode ? (
          <DispatchPanel />
        ) : (
          <VehiclePanel
            vehicles={filteredVehicles}
            filters={filters}
            onFiltersChange={setFilters}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={handleSelectVehicle}
          />
        )}
      </div>
    </div>
  );
};
