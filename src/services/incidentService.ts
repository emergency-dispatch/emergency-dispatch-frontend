import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type {
  BackendIncidentStatus,
  BlockDuration,
  CreateIncidentDto,
  IncidentResponseDto,
  PaginatedResultDto,
  VerifyIncidentRequestDto,
} from '../types/incident';

const BLOCK_DURATION_TO_BACKEND: Record<BlockDuration, string> = {
  '7d': 'SevenDays',
  '30d': 'ThirtyDays',
  '1y': 'OneYear',
  permanent: 'Permanent',
};

// Sự cố đã duyệt còn cần điều phối / theo dõi trên Live Map.
const DISPATCH_BOARD_STATUSES: BackendIncidentStatus[] = ['Verified', 'Dispatched', 'InProgress', 'Escalated'];
// Backend tự cắt pageSize về tối đa 50 (PaginationParamsDto) → tải lần lượt từng trang.
const DISPATCH_BOARD_PAGE_SIZE = 50;

export interface LockResultDto {
  incidentId: string;
  lockedByOperatorId: string;
  lockedByOperatorName: string;
  lockExpiresAt: string;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface CitizenTrackingDto {
  incidentId: string;
  incidentTitle: string;
  incidentAddress: string;
  incidentLat: number;
  incidentLng: number;
  incidentStatus: string;
  incidentSeverity: string;
  rescueUnitId?: string;
  plateNumber?: string;
  unitTypeName?: string;
  stationName?: string;
  stationPhoneNumber?: string;
  vehicleLat?: number;
  vehicleLng?: number;
  lastLocationUpdateAt?: string;
  routeTrajectory: RoutePoint[];
  distanceKm: number;
  estimatedArrivalMinutes: number;
  dispatchStatus: 'PendingDispatch' | 'Dispatched' | 'Accepted' | 'EnRoute' | 'OnScene' | 'Completed' | 'Cancelled';
  dispatchedAt?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface RevealPhoneDto {
  incidentId: string;
  phoneNumber: string | null;
}

export const incidentService = {
  /**
   * Phát tín hiệu cứu nạn khẩn cấp SOS / Gửi báo cáo sự cố hiện trường
   * Hỗ trợ cả công dân đã đăng nhập lẫn khách vãng lai
   */
  async createIncident(dto: CreateIncidentDto): Promise<ApiResponse<IncidentResponseDto>> {
    const response = await apiClient.post<ApiResponse<IncidentResponseDto>>('/Incidents', dto);
    return response.data;
  },

  /**
   * Lấy danh sách sự cố có phân trang và bộ lọc (hỗ trợ Citizen xem lịch sử báo cáo)
   */
  async getIncidents(params?: {
    pageIndex?: number;
    pageSize?: number;
    status?: string;
    severity?: string;
    searchTerm?: string;
  }): Promise<ApiResponse<PaginatedResultDto<IncidentResponseDto>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResultDto<IncidentResponseDto>>>('/Incidents', { params });
    return response.data;
  },

  /**
   * Hàng đợi sự cố chờ Operator xác minh (Pending + AiProcessed), đã sắp xếp
   * ưu tiên sẵn ở backend (Unclassified/Severity giảm dần, cùng mức thì FIFO).
   */
  async getQueue(): Promise<ApiResponse<IncidentResponseDto[]>> {
    const response = await apiClient.get<ApiResponse<IncidentResponseDto[]>>('/Incidents/queue');
    return response.data;
  },

  /**
   * Human-in-the-loop: Operator xác minh sự cố, có thể giữ nguyên hoặc ghi đè severity AI đề xuất.
   */
  async verify(id: string, dto: VerifyIncidentRequestDto): Promise<ApiResponse<IncidentResponseDto>> {
    const response = await apiClient.put<ApiResponse<IncidentResponseDto>>(`/Incidents/${id}/verify`, dto);
    return response.data;
  },

  /** Hủy sự cố (báo sai/trùng lặp). Body: CancelIncidentDto { reason }. */
  async cancel(id: string, reason: string): Promise<ApiResponse<IncidentResponseDto>> {
    const response = await apiClient.put<ApiResponse<IncidentResponseDto>>(`/Incidents/${id}/cancel`, { reason });
    return response.data;
  },

  /**
   * GET /api/dispatch/tracking/incident/{incidentId}
   * Công dân theo dõi trực tiếp vị trí xe cứu hộ, lộ trình và thời gian dự kiến (ETA)
   */
  async getTracking(incidentId: string): Promise<ApiResponse<CitizenTrackingDto>> {
    const response = await apiClient.get<ApiResponse<CitizenTrackingDto>>(`/dispatch/tracking/incident/${incidentId}`);
    return response.data;
  },

  async getById(id: string): Promise<ApiResponse<IncidentResponseDto>> {
    const response = await apiClient.get<ApiResponse<IncidentResponseDto>>(`/Incidents/${id}`);
    return response.data;
  },

  /**
   * Sự cố đã duyệt còn đang điều phối (Verified/Dispatched/InProgress/Escalated).
   * Backend chỉ lọc được một trạng thái mỗi lần → gọi song song từng trạng thái.
   */
  async getDispatchBoard(): Promise<IncidentResponseDto[]> {
    const fetchStatus = async (status: BackendIncidentStatus) => {
      const items: IncidentResponseDto[] = [];
      for (let pageIndex = 1; ; pageIndex++) {
        const res = await apiClient.get<ApiResponse<PaginatedResultDto<IncidentResponseDto>>>('/Incidents', {
          params: { status, pageIndex, pageSize: DISPATCH_BOARD_PAGE_SIZE },
        });
        if (!res.data.success) throw new Error(res.data.message || 'Không thể tải sự cố đang điều phối.');
        items.push(...res.data.data.items);
        if (!res.data.data.hasNextPage) return items;
      }
    };
    return (await Promise.all(DISPATCH_BOARD_STATUSES.map(fetchStatus))).flat();
  },

  /** Giữ / gia hạn khóa mềm 2 phút. Operator khác đang giữ → HTTP 409. */
  async lock(id: string): Promise<ApiResponse<LockResultDto>> {
    const response = await apiClient.put<ApiResponse<LockResultDto>>(`/Incidents/${id}/lock`);
    return response.data;
  },

  async unlock(id: string): Promise<ApiResponse<boolean>> {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/Incidents/${id}/lock`);
    return response.data;
  },

  /** Lấy số điện thoại đầy đủ của người báo — backend ghi vết vào Audit Trail. */
  async revealPhone(id: string): Promise<ApiResponse<RevealPhoneDto>> {
    const response = await apiClient.post<ApiResponse<RevealPhoneDto>>(`/Incidents/${id}/reveal-phone`);
    return response.data;
  },

  /** Đưa số điện thoại báo khống vào danh sách chặn (lý do tối thiểu 5 ký tự). */
  async blockReporterPhone(id: string, duration: BlockDuration, reason: string): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post<ApiResponse<unknown>>(`/Incidents/${id}/block-reporter`, {
      duration: BLOCK_DURATION_TO_BACKEND[duration],
      reason,
    });
    return response.data;
  },
};
