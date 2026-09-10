import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type { IncidentResponseDto, VerifyIncidentRequestDto } from '../types/incident';

export const incidentService = {
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
   * Hủy sự cố (báo sai/trùng lặp). Backend nhận thẳng một JSON string làm lý do.
   */
  async cancel(id: string, reason: string): Promise<ApiResponse<IncidentResponseDto>> {
    const response = await apiClient.put<ApiResponse<IncidentResponseDto>>(`/Incidents/${id}/cancel`, reason);
    return response.data;
  },
};
