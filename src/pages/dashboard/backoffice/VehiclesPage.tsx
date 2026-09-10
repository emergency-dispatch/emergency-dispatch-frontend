import React, { useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import { VehicleDetailDrawer } from '../../../components/dashboard/vehicles/VehicleDetailDrawer';
import { VehiclesTable } from '../../../components/dashboard/vehicles/VehiclesTable';
import { stationRecordsSeed } from '../../../data/stationMock';
import { vehicleRecordsSeed } from '../../../data/vehicleRecordMock';
import type { VehicleOperationalStatus, VehicleRecord } from '../../../types/vehicleRecord';

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(vehicleRecordsSeed);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stationNameById = useMemo(
    () => new Map(stationRecordsSeed.map((s) => [s.id, s.name])),
    []
  );
  const selectedVehicle = vehicles.find((v) => v.id === selectedId) ?? null;

  const handleToggleEquipment = (itemId: string) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id !== selectedId
          ? v
          : {
              ...v,
              equipmentChecklist: v.equipmentChecklist.map((item) =>
                item.id === itemId ? { ...item, equipped: !item.equipped } : item
              ),
            }
      )
    );
  };

  const handleChangeStatus = (status: VehicleOperationalStatus) => {
    setVehicles((prev) => prev.map((v) => (v.id === selectedId ? { ...v, status } : v)));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
          <Truck className="w-5 h-5 text-red-600" />
          Vehicle & Equipment Management
        </h1>
      </div>

      <VehiclesTable vehicles={vehicles} stationNameById={stationNameById} onViewDetail={(v) => setSelectedId(v.id)} />

      {selectedVehicle && (
        <VehicleDetailDrawer
          vehicle={selectedVehicle}
          stationName={stationNameById.get(selectedVehicle.stationId) ?? '—'}
          onClose={() => setSelectedId(null)}
          onToggleEquipment={handleToggleEquipment}
          onChangeStatus={handleChangeStatus}
        />
      )}
    </div>
  );
};
