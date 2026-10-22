import { apiClient, unwrapApi } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type { TrafficJamReport } from '../types/incident';
import type { RescueUnitResponseDto } from '../types/rescueUnit';
import type { StationResponseDto } from '../types/station';
import type { Station } from '../types/vehicle';

/** Mirror TrafficHotspotResponseDto. */
export interface TrafficHotspotResponseDto {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  locationAddress: string;
  congestionLevelName: string;
  mediaUrl: string | null;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

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

  /** Toàn bộ xe chưa xóa (backend không phân trang). */
  async getRescueUnits(): Promise<RescueUnitResponseDto[]> {
    return unwrapApi(apiClient.get<ApiResponse<RescueUnitResponseDto[]>>('/rescue-units'));
  },

  async getActiveTrafficJams(): Promise<TrafficJamReport[]> {
    const hotspots = await unwrapApi(apiClient.get<ApiResponse<TrafficHotspotResponseDto[]>>('/traffic/active'));
    return hotspots.map(mapTrafficHotspot);
  },

  async resolveTrafficJam(id: string): Promise<void> {
    await unwrapApi(apiClient.put<ApiResponse<unknown>>(`/traffic/${id}/resolve`));
  },

  /** Backend bọc cấu hình trong SettingsRecordDto { values, updatedAt, updatedByName }. */
  async getEscalationSettings(): Promise<EscalationSettingsDto> {
    const record = await unwrapApi(
      apiClient.get<ApiResponse<{ values: EscalationSettingsDto }>>('/settings/escalation')
    );
    return { ...DEFAULT_ESCALATION_SETTINGS, ...record.values };
  },
};
