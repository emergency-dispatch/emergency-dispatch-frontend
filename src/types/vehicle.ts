export type VehicleStatus = 'available' | 'en_route' | 'on_scene';

export type VehicleType = 'ambulance' | 'fire_truck' | 'police' | 'rescue';

export interface Vehicle {
  id: string;
  plate: string;
  type: VehicleType;
  status: VehicleStatus;
  driver: string;
  stationId: string;
  area: string;
  lat: number;
  lng: number;
  heading: number;
  etaMinutes: number | null;
  incidentId: string | null;
  lastUpdated: string;
}

export interface Station {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  vehicleIds: string[];
}

export interface VehicleFilters {
  type: VehicleType | 'all';
  status: VehicleStatus | 'all';
  area: string | 'all';
}
