import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type {
  BackendDispatchAlgorithm,
  DispatchAssignmentResponseDto,
  UpdateAssignmentStatusDto,
  RejectAssignmentDto,
  ResolveDispatchDto,
  AssignDispatchDto,
  RecommendedUnitResponseDto,
} from '../types/dispatch';

export const dispatchService = {
  /**
   * Lấy danh sách toàn bộ nhiệm vụ của xe/trạm thuộc tài khoản Staff đang đăng nhập
   * (GET /api/dispatch/my-assignments)
   */
  async getMyAssignments(): Promise<ApiResponse<DispatchAssignmentResponseDto[]>> {
    const response = await apiClient.get<ApiResponse<DispatchAssignmentResponseDto[]>>(
      '/dispatch/my-assignments'
    );
    return response.data;
  },

  /**
   * Lấy chi tiết lượt điều phối theo ID (GET /api/dispatch/assignments/{id})
   */
  async getAssignmentById(id: string): Promise<ApiResponse<DispatchAssignmentResponseDto>> {
    const response = await apiClient.get<ApiResponse<DispatchAssignmentResponseDto>>(
      `/dispatch/assignments/${id}`
    );
    return response.data;
  },

  /**
   * Lấy danh sách các lượt điều phối của một sự cố (GET /api/dispatch/assignments/incident/{incidentId})
   */
  /** Mọi lượt Dispatched / Accepted / EnRoute / OnScene của sự cố trạm mình hoặc xe trạm mình (Operator). */
  async getActiveAssignments(): Promise<ApiResponse<DispatchAssignmentResponseDto[]>> {
    const response = await apiClient.get<ApiResponse<DispatchAssignmentResponseDto[]>>('/dispatch/assignments/active');
    return response.data;
  },

  async getAssignmentsByIncident(incidentId: string): Promise<ApiResponse<DispatchAssignmentResponseDto[]>> {
    const response = await apiClient.get<ApiResponse<DispatchAssignmentResponseDto[]>>(
      `/dispatch/assignments/incident/${incidentId}`
    );
    return response.data;
  },

  /**
   * Cập nhật tiến độ nhiệm vụ (Accepted -> EnRoute -> OnScene -> Cancelled)
   * (PUT /api/dispatch/assignments/{id}/status)
   */
  async updateAssignmentStatus(
    id: string,
    dto: UpdateAssignmentStatusDto
  ): Promise<ApiResponse<DispatchAssignmentResponseDto>> {
    const response = await apiClient.put<ApiResponse<DispatchAssignmentResponseDto>>(
      `/dispatch/assignments/${id}/status`,
      dto
    );
    return response.data;
  },

  /**
   * Đội cứu hộ từ chối lệnh điều phối kèm lý do bắt buộc (FR-RS-01, BR-22)
   * (POST /api/dispatch/assignments/{id}/reject)
   */
  async rejectAssignment(
    id: string,
    dto: RejectAssignmentDto
  ): Promise<ApiResponse<DispatchAssignmentResponseDto>> {
    const response = await apiClient.post<ApiResponse<DispatchAssignmentResponseDto>>(
      `/dispatch/assignments/${id}/reject`,
      dto
    );
    return response.data;
  },

  /**
   * Nghiệm thu hiện trường, nộp báo cáo kết thúc và đóng sự cố
   * (POST /api/dispatch/assignments/{id}/resolve)
   */
  async resolveAssignment(
    id: string,
    dto: ResolveDispatchDto
  ): Promise<ApiResponse<DispatchAssignmentResponseDto>> {
    const response = await apiClient.post<ApiResponse<DispatchAssignmentResponseDto>>(
      `/dispatch/assignments/${id}/resolve`,
      dto
    );
    return response.data;
  },

  /**
   * Phát lệnh điều phối xe cứu hộ tới hiện trường sự cố (POST /api/dispatch/assign).
   * Backend trả danh sách lượt phân công; xe vừa bị Operator khác giao → HTTP 409.
   */
  async assignUnit(dto: AssignDispatchDto): Promise<ApiResponse<DispatchAssignmentResponseDto[]>> {
    const response = await apiClient.post<ApiResponse<DispatchAssignmentResponseDto[]>>('/dispatch/assign', dto);
    return response.data;
  },

  /**
   * Gợi ý xe theo Nearest-Available / Load-Aware (GET /api/dispatch/recommend).
   * Không truyền maxDistanceKm → backend tự mở rộng bán kính 10 → 15 → 22.5 → 30 km
   * (sự cố Escalated được nhân bán kính theo cấu hình leo thang).
   */
  async getRecommendations(
    incidentId: string,
    algorithm: BackendDispatchAlgorithm = 'NearestAvailable'
  ): Promise<ApiResponse<RecommendedUnitResponseDto[]>> {
    const response = await apiClient.get<ApiResponse<RecommendedUnitResponseDto[]>>('/dispatch/recommend', {
      params: { incidentId, algorithm },
    });
    return response.data;
  },
};
