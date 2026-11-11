import { apiClient, unwrapApi } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type { TrafficCongestionLevel, TrafficJamReport } from '../types/incident';
import type { CreateRescueUnitDto, RescueUnitResponseDto, UpdateRescueUnitDto } from '../types/rescueUnit';
import type { StationResponseDto } from '../types/station';
import type { Station } from '../types/vehicle';

/** Mirror TrafficHotspotResponseDto (§20, §24). */
export interface TrafficHotspotResponseDto {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  locationAddress: string;
  congestionLevel?: TrafficCongestionLevel;
  congestionLevelName: string;
  mediaUrl: string | null;
  createdAt: string;
  expiresAt: string;
  /** true khi Active (chưa hết hạn) hoặc Assigned. */
  isActive: boolean;
  status?: 'Active' | 'Assigned' | 'Resolved' | 'Expired';
  responsibleStationId?: string | null;
  responsibleStationName?: string | null;
  assignedRescueUnitId?: string | null;
  assignedUnitPlate?: string | null;
  assignedUnitStationId?: string | null;
  assignedAt?: string | null;
  escalatedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  sourceIncidentId?: string | null;
}

/** Mirror TrafficTaskEventDto — sự kiện ReceiveTrafficTaskAssigned. */
export interface TrafficTaskEventDto {
  action: 'Assigned' | 'Unassigned' | 'Resolved';
  rescueUnitId: string;
  plateNumber?: string | null;
  unitStationId: string;
  notes?: string | null;
  hotspot: TrafficHotspotResponseDto;
  changedAt: string;
}

/** Mirror ReportTrafficHotspotDto (POST /api/traffic/report). */
export interface ReportTrafficHotspotDto {
  title: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  locationAddress: string;
  congestionLevel?: TrafficCongestionLevel;
  mediaUrl?: string | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  ttlMinutes?: number;
}

const CONGESTION_LEVELS: readonly TrafficCongestionLevel[] = ['Low', 'Moderate', 'Severe', 'Blocked'];

/** Mirror EscalationSettingsDto (GET /api/settings/escalation). */
export interface EscalationSettingsDto {
  dayThresholdMinutes: number;
  nightThresholdMinutes: number;
  /** "HH:mm" */
  nightStart: string;
  nightEnd: string;
  radiusMultiplier: number;
  maxRadiusKm: number;
}

/** Khu vực phục vụ (GET /api/settings/service-area — công khai). */
export interface ServiceAreaDto {
  enabled: boolean;
  name: string | null;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

export const DEFAULT_ESCALATION_SETTINGS: EscalationSettingsDto = {
  dayThresholdMinutes: 5,
  nightThresholdMinutes: 2.5,
  nightStart: '22:00',
  nightEnd: '06:00',
  radiusMultiplier: 2,
  maxRadiusKm: 30,
};

export function mapStation(dto: StationResponseDto): Station {
  return {
    id: dto.id,
    name: dto.name,
    address: dto.address,
    lat: dto.latitude,
    lng: dto.longitude,
    coverageRadiusKm: dto.coverageRadiusKm,
    vehicleIds: dto.rescueUnits.map((u) => u.id),
  };
}

export function mapTrafficHotspot(dto: TrafficHotspotResponseDto): TrafficJamReport {
  return {
    id: dto.id,
    area: dto.locationAddress || dto.title,
    lat: dto.latitude,
    lng: dto.longitude,
    note: dto.description || dto.title,
    reportedAt: dto.createdAt,
    mediaUrl: dto.mediaUrl,
    // Backend cũ chưa có `status` → suy từ xe được giao.
    status: (dto.status ?? (dto.assignedRescueUnitId ? 'Assigned' : 'Active')) === 'Assigned' ? 'assigned' : 'active',
    congestionLevel:
      dto.congestionLevel ??
      (CONGESTION_LEVELS.find((l) => l === dto.congestionLevelName) as TrafficCongestionLevel | undefined) ??
      null,
    expiresAt: dto.expiresAt,
    responsibleStationId: dto.responsibleStationId ?? null,
    responsibleStationName: dto.responsibleStationName ?? null,
    assignedUnitId: dto.assignedRescueUnitId ?? null,
    assignedUnitPlate: dto.assignedUnitPlate ?? null,
    assignedAt: dto.assignedAt ?? null,
    escalatedAt: dto.escalatedAt ?? null,
  };
}

export const liveMapService = {
  async getStations(): Promise<Station[]> {
    const stations = await unwrapApi(
      apiClient.get<ApiResponse<StationResponseDto[]>>('/stations', { params: { activeOnly: true } })
    );
    return stations.map(mapStation);
  },

  async getStation(id: string): Promise<StationResponseDto> {
    return unwrapApi(apiClient.get<ApiResponse<StationResponseDto>>(`/stations/${id}`));
  },

  /**
   * Xe chưa xóa (backend không phân trang). Không lọc → xe mọi trạm (Live Map cần để điều xe hỗ trợ);
   * `stationId` / `status` → chỉ tải đúng phần cần (VD một trạm vừa có xe mới).
   */
  async getRescueUnits(filter: { stationId?: string; status?: string } = {}): Promise<RescueUnitResponseDto[]> {
    return unwrapApi(apiClient.get<ApiResponse<RescueUnitResponseDto[]>>('/rescue-units', { params: filter }));
  },

  async getRescueUnit(id: string): Promise<RescueUnitResponseDto> {
    return unwrapApi(apiClient.get<ApiResponse<RescueUnitResponseDto>>(`/rescue-units/${id}`));
  },

  /** Xe mới ở trạng thái Sẵn sàng, đặt tại tọa độ trạm. Operator chỉ thêm được vào trạm mình (khác → 403). */
  async createRescueUnit(input: CreateRescueUnitDto): Promise<RescueUnitResponseDto> {
    return unwrapApi(apiClient.post<ApiResponse<RescueUnitResponseDto>>('/rescue-units', input));
  },

  /**
   * PUT bắt buộc gửi đủ trạng thái và trạm. Operator không được đổi trạm (chỉ Admin) nên luôn gửi lại đúng
   * trạm / trạng thái hiện tại của xe.
   */
  async updateRescueUnit(id: string, input: UpdateRescueUnitDto): Promise<RescueUnitResponseDto> {
    return unwrapApi(apiClient.put<ApiResponse<RescueUnitResponseDto>>(`/rescue-units/${id}`, input));
  },

  /** Operator chỉ đặt thủ công Sẵn sàng ⇄ Bảo trì; các trạng thái khác do luồng điều phối tự đặt. */
  async setRescueUnitStatus(id: string, status: 'Available' | 'Maintenance'): Promise<RescueUnitResponseDto> {
    return unwrapApi(apiClient.put<ApiResponse<RescueUnitResponseDto>>(`/rescue-units/${id}/status`, { status }));
  },

  async getActiveTrafficJams(): Promise<TrafficJamReport[]> {
    const hotspots = await unwrapApi(apiClient.get<ApiResponse<TrafficHotspotResponseDto[]>>('/traffic/active'));
    return hotspots.map(mapTrafficHotspot);
  },

  /** §20 & §6.1: Báo cáo điểm nghẽn giao thông hoặc chướng ngại vật nội khu (POST /api/traffic/report) */
  async reportTrafficHotspot(input: ReportTrafficHotspotDto): Promise<TrafficHotspotResponseDto> {
    return unwrapApi(apiClient.post<ApiResponse<TrafficHotspotResponseDto>>('/traffic/report', input));
  },

  /** Ghi chú tùy chọn (≤ 500 ký tự). Điểm đang có đội: chỉ trạm phụ trách / đội được giao (khác → 403). */
  async resolveTrafficJam(id: string, note?: string): Promise<TrafficHotspotResponseDto> {
    return unwrapApi(
      apiClient.put<ApiResponse<TrafficHotspotResponseDto>>(`/traffic/${id}/resolve`, { note: note || undefined })
    );
  },

  /**
   * §20: giao một xe Sẵn sàng của trạm xuống giải tỏa điểm ùn tắc Active → Assigned.
   * 409: điểm đã có xe / xe vừa bận; 400: điểm đã giải tỏa / hết hạn.
   */
  async assignTrafficJam(id: string, rescueUnitId: string, notes?: string): Promise<TrafficHotspotResponseDto> {
    return unwrapApi(
      apiClient.put<ApiResponse<TrafficHotspotResponseDto>>(`/traffic/${id}/assign`, {
        rescueUnitId,
        notes: notes || undefined,
      })
    );
  },

  /** §20: rút xe khỏi điểm ùn tắc (lý do ≥ 5 ký tự) → điểm về Active, xe về Sẵn sàng. */
  async unassignTrafficJam(id: string, reason: string): Promise<TrafficHotspotResponseDto> {
    return unwrapApi(apiClient.put<ApiResponse<TrafficHotspotResponseDto>>(`/traffic/${id}/unassign`, { reason }));
  },

  /** Có thể bọc trong SettingsRecordDto { values } như các cấu hình khác → đọc được cả hai dạng. */
  async getServiceArea(): Promise<ServiceAreaDto> {
    const data = await unwrapApi(
      apiClient.get<ApiResponse<ServiceAreaDto | { values: ServiceAreaDto }>>('/settings/service-area')
    );
    return 'values' in data ? data.values : data;
  },

  /** Backend bọc cấu hình trong SettingsRecordDto { values, updatedAt, updatedByName }. */
  async getEscalationSettings(): Promise<EscalationSettingsDto> {
    const record = await unwrapApi(
      apiClient.get<ApiResponse<{ values: EscalationSettingsDto }>>('/settings/escalation')
    );
    return { ...DEFAULT_ESCALATION_SETTINGS, ...record.values };
  },
};
