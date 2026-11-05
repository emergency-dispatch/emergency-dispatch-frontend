import { apiClient, unwrapApi } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type { FieldRequestDto } from '../types/fieldRequest';

/**
 * §21.2 Yêu cầu từ hiện trường (Operator). Đội gửi / hủy yêu cầu ở cổng Staff; Operator tiếp nhận, đáp ứng,
 * từ chối hoặc giao thêm xe kèm `fieldRequestId` (POST /dispatch/assign — yêu cầu tự chuyển Fulfilled).
 */
export const fieldRequestService = {
  /** Yêu cầu đang mở (Open / Acknowledged) của sự cố trạm mình và của xe trạm mình đi hỗ trợ, cũ nhất trước. */
  async getOpen(): Promise<FieldRequestDto[]> {
    return unwrapApi(apiClient.get<ApiResponse<FieldRequestDto[]>>('/field-requests'));
  },

  /** Toàn bộ yêu cầu của một sự cố (mọi trạng thái). */
  async getByIncident(incidentId: string): Promise<FieldRequestDto[]> {
    return unwrapApi(apiClient.get<ApiResponse<FieldRequestDto[]>>(`/incidents/${incidentId}/field-requests`));
  },

  async acknowledge(id: string): Promise<FieldRequestDto> {
    return unwrapApi(apiClient.put<ApiResponse<FieldRequestDto>>(`/field-requests/${id}/acknowledge`));
  },

  /** Ghi chú tùy chọn (≤ 500 ký tự). */
  async fulfill(id: string, note?: string): Promise<FieldRequestDto> {
    return unwrapApi(apiClient.put<ApiResponse<FieldRequestDto>>(`/field-requests/${id}/fulfill`, { note: note || undefined }));
  },

  /** Lý do bắt buộc ≥ 5 ký tự. */
  async decline(id: string, note: string): Promise<FieldRequestDto> {
    return unwrapApi(apiClient.put<ApiResponse<FieldRequestDto>>(`/field-requests/${id}/decline`, { note }));
  },
};
