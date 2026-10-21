// Vòng đời nhiệm vụ của xe phía Command Center: giao xe → đội có 120s xác nhận →
// Accepted → EnRoute → OnScene → nộp báo cáo → hồi sức → Available.
// 'unavailable' = xe Bảo trì / Ngừng hoạt động (Admin đặt), không điều được.
export type VehicleStatus =
  | 'available'
  | 'awaiting_ack'
  | 'accepted'
  | 'en_route'
  | 'on_scene'
  | 'recovering'
  | 'unavailable';

// 'police' chỉ còn để Admin/Staff dùng; bối cảnh KCN/Khu CNC của Operator không điều xe cảnh sát.
export type VehicleType = 'ambulance' | 'fire_truck' | 'police' | 'rescue';

export type DispatchVehicleType = Exclude<VehicleType, 'police'>;

export interface Vehicle {
  id: string;
  plate: string;
  type: DispatchVehicleType;
  status: VehicleStatus;
  stationId: string;
  stationName: string;
  lat: number;
  lng: number;
  heading: number;
  etaMinutes: number | null;
  incidentId: string | null;
  lastUpdated: string;
  /** Hạn chót đội cứu hộ phải Chấp nhận/Từ chối (trạng thái awaiting_ack). */
  ackDeadline?: string | null;
  /** Lượt điều phối đang chạy của xe — dùng để hủy giao xe. */
  assignmentId: string | null;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  vehicleIds: string[];
}

export type DispatchAlgorithm = 'nearest' | 'load_aware';

/** Một xe trong gợi ý điều phối của backend (GET /api/dispatch/recommend). */
export interface DispatchCandidate {
  vehicleId: string;
  km: number;
  etaMinutes: number;
  /** Chỉ có ý nghĩa với Load-Aware (càng thấp càng ưu tiên). */
  cost: number;
  /** Tỷ lệ xe đang bận của trạm (0–1). */
  stationLoad: number;
}

export interface DispatchSuggestion {
  radiusKm: number;
  expanded: boolean;
  candidates: DispatchCandidate[];
}

export interface VehicleFilters {
  type: DispatchVehicleType | 'all';
  status: VehicleStatus | 'all';
  stationId: string | 'all';
}
