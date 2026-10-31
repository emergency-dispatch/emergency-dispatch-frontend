import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type {
  BackendIncidentStatus,
  BlockDuration,
  CreateIncidentDto,
  CreateOperatorIncidentDto,
  OperatorIncidentResultDto,
  IncidentAuditEntryDto,
  IncidentResponseDto,
  OperatorCancellationCode,
  PaginatedResultDto,
  VerifyIncidentRequestDto,
  MyReportDto,
} from '../types/incident';

const BLOCK_DURATION_TO_BACKEND: Record<BlockDuration, string> = {
  '7d': 'SevenDays',
  '30d': 'ThirtyDays',
  '1y': 'OneYear',
  permanent: 'Permanent',
};

// Sự cố đã duyệt còn cần điều phối / theo dõi trên Live Map.
const DISPATCH_BOARD_STATUSES: BackendIncidentStatus[] = ['Verified', 'Dispatched', 'InProgress', 'Escalated'];
// Lọc nhiều trạng thái (`statuses=`) cho phép pageSize tối đa 200.
const DISPATCH_BOARD_PAGE_SIZE = 200;

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
  /** Mọi xe đang được giao cho sự cố (Cấp 3 có thể nhiều xe); các trường đơn ở trên là xe đầu tiên. */
  units?: TrackedUnitDto[];
  /** Đánh dấu lộ trình là đường thẳng ước lượng (khi OSRM định tuyến đường bộ không khả dụng). */
  isApproximateRoute?: boolean;
}

export interface TrackedUnitDto {
  assignmentId: string;
  rescueUnitId: string;
  plateNumber?: string;
  vehicleLat: number;
  vehicleLng: number;
  routeTrajectory: RoutePoint[];
  distanceKm: number;
  estimatedArrivalMinutes: number;
  dispatchStatus: string;
  /** Máy chủ chỉ đường lỗi → tuyến chỉ là đoạn thẳng 2 điểm (vẽ nét đứt). */
  isApproximateRoute?: boolean;
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
   * Operator tự tạo sự cố khi biết tin từ bên ngoài (điện thoại, bộ đàm, camera…) — POST /api/incidents/operator.
   * Sự cố được xác minh ngay, thuộc trạm của Operator.
   */
  async createByOperator(dto: CreateOperatorIncidentDto): Promise<ApiResponse<OperatorIncidentResultDto>> {
    const response = await apiClient.post<ApiResponse<OperatorIncidentResultDto>>('/Incidents/operator', dto);
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
   * Lịch sử báo cáo sự cố của người dân (GET /api/Incidents/my-reports)
   * Phân quyền dành riêng cho Citizen, không bị 403 Forbidden như /api/Incidents
   */
  async getMyReports(params?: {
    status?: number;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResultDto<MyReportDto>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResultDto<MyReportDto>>>('/Incidents/my-reports', { params });
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

  /**
   * Hủy sự cố. Body: CancelIncidentDto { reason, reasonCode }. `reasonCode` chỉ Operator / Admin gửi;
   * Citizen tự hủy thì backend tự đặt CitizenCancelled.
   */
  async cancel(id: string, reason: string, reasonCode?: OperatorCancellationCode): Promise<ApiResponse<IncidentResponseDto>> {
    const response = await apiClient.put<ApiResponse<IncidentResponseDto>>(`/Incidents/${id}/cancel`, {
      reason,
      ...(reasonCode ? { reasonCode } : {}),
    });
    return response.data;
  },

  /** Chuyển sự cố sang trạm khác phụ trách (lý do ≥ 5 ký tự). Khóa mềm được nhả. */
  async transfer(id: string, stationId: string, reason: string): Promise<ApiResponse<IncidentResponseDto>> {
    const response = await apiClient.post<ApiResponse<IncidentResponseDto>>(`/Incidents/${id}/transfer`, {
      stationId,
      reason,
    });
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
   * Sự cố đã duyệt còn đang điều phối (Verified/Dispatched/InProgress/Escalated) của trạm mình —
   * một request lọc nhiều trạng thái (`statuses=`), tải tiếp trang sau nếu còn.
   */
  async getDispatchBoard(): Promise<IncidentResponseDto[]> {
    const items: IncidentResponseDto[] = [];
    for (let pageIndex = 1; ; pageIndex++) {
      const res = await apiClient.get<ApiResponse<PaginatedResultDto<IncidentResponseDto>>>('/Incidents', {
        params: { statuses: DISPATCH_BOARD_STATUSES.join(','), pageIndex, pageSize: DISPATCH_BOARD_PAGE_SIZE },
      });
      if (!res.data.success) throw new Error(res.data.message || 'Không thể tải sự cố đang điều phối.');
      items.push(...res.data.data.items);
      if (!res.data.data.hasNextPage) return items;
    }
  },

  /** Nhật ký thao tác trên sự cố (Operator trạm phụ trách / Admin). */
  async getAuditTrail(id: string, pageIndex = 1, pageSize = 50): Promise<PaginatedResultDto<IncidentAuditEntryDto>> {
    const res = await apiClient.get<ApiResponse<PaginatedResultDto<IncidentAuditEntryDto>>>(`/Incidents/${id}/audit-trail`, {
      params: { pageIndex, pageSize },
    });
    if (!res.data.success) throw new Error(res.data.message || 'Không tải được lịch sử xử lý.');
    return res.data.data;
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
