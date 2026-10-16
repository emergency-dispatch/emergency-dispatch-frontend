// Vòng đời nhiệm vụ của xe phía Command Center: giao xe → đội có 120s xác nhận →
// Accepted → EnRoute → OnScene → nộp báo cáo → hồi sức 5 phút → Available.
export type VehicleStatus = 'available' | 'awaiting_ack' | 'accepted' | 'en_route' | 'on_scene' | 'recovering';

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
  /** Hạn chót đội cứu hộ phải Chấp nhận/Từ chối (trạng thái awaiting_ack). */
  ackDeadline?: string | null;
  /** Kết thúc thời gian hồi sức sau nhiệm vụ (trạng thái recovering). */
  recoveryUntil?: string | null;
}

export interface Station {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  vehicleIds: string[];
}

export type DispatchAlgorithm = 'nearest' | 'load_aware';

export interface DispatchCandidate {
  vehicle: Vehicle;
  km: number;
  etaMinutes: number;
  /** Chỉ có ý nghĩa với Load-Aware (càng thấp càng ưu tiên). */
  cost: number;
  stationLoad: number;
  activeMissions: number;
}

export interface DispatchSuggestion {
  radiusKm: number;
  expanded: boolean;
  candidates: DispatchCandidate[];
}

export interface VehicleFilters {
  type: DispatchVehicleType | 'all';
  status: VehicleStatus | 'all';
  area: string | 'all';
}
