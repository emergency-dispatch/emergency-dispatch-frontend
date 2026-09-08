import React, { useMemo, useState } from 'react';
import { LiveMapView } from '../../../components/dashboard/livemap/LiveMapView';
import { VehiclePanel } from '../../../components/dashboard/livemap/VehiclePanel';
import { useLiveVehicles } from '../../../hooks/useLiveVehicles';
import type { VehicleFilters } from '../../../types/vehicle';

const DEFAULT_FILTERS: VehicleFilters = { type: 'all', status: 'all', area: 'all' };

export const LiveMapPage: React.FC = () => {
  const vehicles = useLiveVehicles();
  const [filters, setFilters] = useState<VehicleFilters>(DEFAULT_FILTERS);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filters.type !== 'all' && v.type !== filters.type) return false;
      if (filters.status !== 'all' && v.status !== filters.status) return false;
      if (filters.area !== 'all' && v.area !== filters.area) return false;
      return true;
    });
  }, [vehicles, filters]);

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId((current) => (current === id ? null : id));
  };

  return (
    <div className="h-full flex">
      <div className="flex-[7] min-w-0 h-full">
        <LiveMapView
          vehicles={filteredVehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={handleSelectVehicle}
        />
      </div>
      <div className="flex-[3] min-w-[320px] max-w-[420px] h-full">
        <VehiclePanel
          vehicles={filteredVehicles}
          filters={filters}
          onFiltersChange={setFilters}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={handleSelectVehicle}
        />
      </div>
    </div>
  );
};
