import type { VehicleType } from './vehicle';

export type VehicleOperationalStatus = 'active' | 'maintenance';

export interface EquipmentChecklistItem {
  id: string;
  name: string;
  equipped: boolean;
}

export interface VehicleRecord {
  id: string;
  plate: string;
  type: VehicleType;
  stationId: string;
  status: VehicleOperationalStatus;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  equipmentChecklist: EquipmentChecklistItem[];
}
