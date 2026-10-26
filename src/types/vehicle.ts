// Vòng đời nhiệm vụ của xe phía Command Center: giao xe → chờ đội Chấp nhận / Từ chối (không giới hạn giờ) →
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
  /** Trạng thái gốc của backend (RescueUnitStatus) — phân biệt Bảo trì / Ngừng hoạt động, Quay về / Hồi sức. */
  unitStatus: string;
  lat: number;
  lng: number;
  heading: number;
  etaMinutes: number | null;
  incidentId: string | null;
  lastUpdated: string;
  /** Lượt điều phối đang chạy của xe — dùng để hủy giao xe. */
  assignmentId: string | null;
  /**
   * Có vị trí GPS thật cho nhiệm vụ hiện tại (realtime, hoặc cập nhật sau lúc được giao).
   * false → chưa có GPS mới, bản đồ đặt xe tại trạm thay vì tọa độ cũ trong DB.
   */
  hasLiveGps: boolean;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Bán kính phủ sóng (km) — backend chọn trạm phụ trách SOS theo vòng này. */
  coverageRadiusKm: number;
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
  /** Quãng đường / ETA là ước lượng (máy chủ chỉ đường lỗi). */
  isApproximate: boolean;
  /** Xe của trạm khác (điều hỗ trợ). */
  isSupportUnit: boolean;
  stationName: string;
}

export interface DispatchSuggestion {
  radiusKm: number;
  expanded: boolean;
  candidates: DispatchCandidate[];
}
