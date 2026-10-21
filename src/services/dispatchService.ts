import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';
import type { ApiResponse } from '../types/auth';
import type {
  DispatchAssignmentResponseDto,
  UpdateAssignmentStatusDto,
  ResolveDispatchDto,
  AssignDispatchDto,
  RecommendedUnitResponseDto,
} from '../types/dispatch';

// Mock mode for local concurrency simulation when backend is in mock mode
const MOCK_CONFLICT_VEHICLE_IDS = new Set(['veh-10']);

const respond = <T>(data: T, success = true, message = 'OK'): Promise<ApiResponse<T>> =>
  new Promise((resolve) => setTimeout(() => resolve({ success, message, data }), 300));

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
   * Phát lệnh điều phối xe cứu hộ tới hiện trường sự cố (POST /api/dispatch/assign)
   */
  async assignUnit(dto: AssignDispatchDto): Promise<ApiResponse<DispatchAssignmentResponseDto>> {
    const response = await apiClient.post<ApiResponse<DispatchAssignmentResponseDto>>(
      '/dispatch/assign',
      dto
    );
    return response.data;
  },

  /**
   * Lấy gợi ý xe tối ưu bằng thuật toán AI / Recommender (GET /api/dispatch/recommend)
   */
  async getRecommendations(
    incidentId: string,
    algorithm = 0,
    unitType?: string,
    maxDistanceKm = 15.0
  ): Promise<ApiResponse<RecommendedUnitResponseDto[]>> {
    const params = new URLSearchParams({
      incidentId,
      algorithm: algorithm.toString(),
      maxDistanceKm: maxDistanceKm.toString(),
    });
    if (unitType) params.append('unitType', unitType);

    const response = await apiClient.get<ApiResponse<RecommendedUnitResponseDto[]>>(
      `/dispatch/recommend?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Backward-compatible helper for DispatchContext: local/mock or backend assignment
   */
  async assignVehicle(incidentId: string, vehicleId: string): Promise<ApiResponse<{ conflict: boolean } | null>> {
    if (API_CONFIG.USE_MOCK_INCIDENTS && MOCK_CONFLICT_VEHICLE_IDS.has(vehicleId)) {
      MOCK_CONFLICT_VEHICLE_IDS.delete(vehicleId);
      return respond({ conflict: true }, false, 'Xe vừa được điều phối viên khác giao cho sự cố khác.');
    }

    try {
      // Try backend assignment first if not using mock
      if (!API_CONFIG.USE_MOCK_INCIDENTS) {
        const res = await this.assignUnit({ incidentId, rescueUnitId: vehicleId });
        return {
          success: res.success,
          message: res.message,
          data: { conflict: false },
        };
      }
    } catch {
      // Fallback to local respond if mock or demo
    }

    return respond({ conflict: false }, true, `Đã giao xe ${vehicleId} cho sự cố ${incidentId}.`);
  },

  /**
   * Backward-compatible helper for DispatchContext: release vehicle
   */
  async releaseVehicle(vehicleId: string): Promise<ApiResponse<null>> {
    return respond(null, true, `Đã nhả xe ${vehicleId}.`);
  },
};
