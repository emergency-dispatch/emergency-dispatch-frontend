import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import type { IncidentResponseDto, OperatorCancellationCode, PaginatedResultDto } from '../../types/incident';

/** Trạng thái sự cố còn mở (khớp cách DashboardService đếm "Tổng đang mở"). */
export const OPEN_INCIDENT_STATUSES = [
  'Pending',
  'AiProcessing',
  'AiProcessed',
  'Verified',
  'Dispatched',
  'InProgress',
  'Escalated',
] as const;
export type OpenIncidentStatus = (typeof OPEN_INCIDENT_STATUSES)[number];

/**
 * Sự cố đang mở toàn hệ thống cho Admin (GET /Incidents, Admin không bị giới hạn trạm) và hủy sự cố
 * (PUT /Incidents/{id}/cancel — backend cho Admin hủy, ghi audit). Dùng để dọn ca "mồ côi" (trạm phụ trách đã bị xóa).
 */
export const openIncidentAdminService = {
  async list(statuses: readonly OpenIncidentStatus[] = OPEN_INCIDENT_STATUSES): Promise<IncidentResponseDto[]> {
    const page = await unwrapApi(
      apiClient.get<ApiResponse<PaginatedResultDto<IncidentResponseDto>>>('/Incidents', {
        params: { statuses: statuses.join(','), pageIndex: 1, pageSize: 200 },
      })
    );
    return [...page.items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async cancel(id: string, reasonCode: OperatorCancellationCode, reason: string): Promise<void> {
    await unwrapApi(apiClient.put<ApiResponse<IncidentResponseDto>>(`/Incidents/${id}/cancel`, { reasonCode, reason }));
  },
};
