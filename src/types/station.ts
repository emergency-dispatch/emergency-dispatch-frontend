export type StationStatus = 'active' | 'inactive';

export type MaintenanceStatus = 'ok' | 'expiring_soon' | 'overdue';

export type AssetCategory = 'vehicle' | 'equipment';

export interface StationRecord {
  id: string;
  name: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  coverageRadiusKm: number;
  status: StationStatus;
}

export interface StationAsset {
  id: string;
  stationId: string;
  name: string;
  category: AssetCategory;
  type: string;
  maintenanceDueDate: string;
}
