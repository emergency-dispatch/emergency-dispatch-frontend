export type VehicleStatus = 'available' | 'en_route' | 'on_scene';

// 'police' chỉ còn để Admin/Staff dùng; bối cảnh KCN/Khu CNC của Operator không điều xe cảnh sát.
export type VehicleType = 'ambulance' | 'fire_truck' | 'police' | 'rescue';

export type DispatchVehicleType = Exclude<VehicleType, 'police'>;

export interface Vehicle {
  id: string;
  plate: string;
  type: DispatchVehicleType;
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
  type: DispatchVehicleType | 'all';
  status: VehicleStatus | 'all';
  area: string | 'all';
}
