import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';
import { createIncidentQueueMock } from '../data/incidentQueueMock';
import type { ApiResponse } from '../types/auth';
import { SOFT_LOCK_DURATION_MS } from '../data/incidentMock';
import type { BlockDuration, IncidentResponseDto, VerifyIncidentRequestDto } from '../types/incident';

// Mock mode (VITE_USE_MOCK_INCIDENTS=true): giữ hàng đợi trong bộ nhớ để duyệt/từ chối
// xong thì sự cố biến mất khỏi các lần poll tiếp theo, giống backend thật.
let mockQueue: IncidentResponseDto[] | null = null;
const getMockQueue = () => (mockQueue ??= createIncidentQueueMock());

const mockResponse = <T>(data: T, message = 'OK', success = true): Promise<ApiResponse<T>> =>
  new Promise((resolve) => setTimeout(() => resolve({ success, message, data }), 400));

export interface LockResultDto {
  lockedByOperatorId: string;
  lockedByOperatorName: string;
  lockExpiresAt: string;
}

const takeFromMockQueue = (id: string): IncidentResponseDto => {
  const queue = getMockQueue();
  const incident = queue.find((i) => i.id === id)!;
  mockQueue = queue.filter((i) => i.id !== id);
  return incident;
};

export const incidentService = {
  /**
   * Hàng đợi sự cố chờ Operator xác minh (Pending + AiProcessed), đã sắp xếp
   * ưu tiên sẵn ở backend (Unclassified/Severity giảm dần, cùng mức thì FIFO).
   */
  async getQueue(): Promise<ApiResponse<IncidentResponseDto[]>> {
    if (API_CONFIG.USE_MOCK_INCIDENTS) return mockResponse([...getMockQueue()]);
    const response = await apiClient.get<ApiResponse<IncidentResponseDto[]>>('/Incidents/queue');
    return response.data;
  },

  /**
   * Human-in-the-loop: Operator xác minh sự cố, có thể giữ nguyên hoặc ghi đè severity AI đề xuất.
   */
  async verify(id: string, dto: VerifyIncidentRequestDto): Promise<ApiResponse<IncidentResponseDto>> {
    if (API_CONFIG.USE_MOCK_INCIDENTS) {
      const incident = takeFromMockQueue(id);
      return mockResponse({ ...incident, status: 'Verified', severity: dto.confirmedSeverity });
    }
    const response = await apiClient.put<ApiResponse<IncidentResponseDto>>(`/Incidents/${id}/verify`, dto);
    return response.data;
  },

  /**
   * Hủy sự cố (báo sai/trùng lặp). Backend nhận thẳng một JSON string làm lý do.
   */
  async cancel(id: string, reason: string): Promise<ApiResponse<IncidentResponseDto>> {
    if (API_CONFIG.USE_MOCK_INCIDENTS) {
      // Sự cố đã duyệt (hủy từ Dispatch Panel) không còn trong hàng đợi mock.
      const incident = getMockQueue().find((i) => i.id === id) ? takeFromMockQueue(id) : ({ id } as IncidentResponseDto);
      return mockResponse({ ...incident, status: 'Cancelled', operatorNotes: reason });
    }
    const response = await apiClient.put<ApiResponse<IncidentResponseDto>>(`/Incidents/${id}/cancel`, reason);
    return response.data;
  },

  // -------------------------------------------------------------------------
  // TODO(backend): các endpoint dưới đây chưa có — tạm xử lý cục bộ ở frontend,
  // hàng đợi mock giữ trạng thái khóa để mô phỏng nhiều Operator cùng mở ca.
  // -------------------------------------------------------------------------

  /** Khóa mềm 2 phút (LockedByOperatorId). Ca đang bị người khác giữ → success: false (HTTP 409). */
  async lock(id: string, operator: { id: string; name: string }): Promise<ApiResponse<LockResultDto | null>> {
    const incident = getMockQueue().find((i) => i.id === id);
    const heldByOther =
      incident?.lockedByOperatorId &&
      incident.lockedByOperatorId !== operator.id &&
      new Date(incident.lockExpiresAt ?? 0).getTime() > Date.now();
    if (heldByOther) {
      return mockResponse(null, `Ca đang được xử lý bởi ${incident.lockedByOperatorName}.`, false);
    }

    const lock: LockResultDto = {
      lockedByOperatorId: operator.id,
      lockedByOperatorName: operator.name,
      lockExpiresAt: new Date(Date.now() + SOFT_LOCK_DURATION_MS).toISOString(),
    };
    if (incident) Object.assign(incident, lock);
    return mockResponse(lock);
  },

  async unlock(id: string): Promise<ApiResponse<null>> {
    const incident = getMockQueue().find((i) => i.id === id);
    if (incident) {
      delete incident.lockedByOperatorId;
      delete incident.lockedByOperatorName;
      delete incident.lockExpiresAt;
    }
    return mockResponse(null);
  },

  /** Ghi vết mỗi lần Operator bấm "Hiện số" (Audit Trail). */
  async logPhoneReveal(id: string): Promise<ApiResponse<null>> {
    return mockResponse(null, `Đã ghi vết xem số điện thoại của sự cố ${id}.`);
  },

  /** Đưa số điện thoại báo khống vào BlockedPhoneNumberList. */
  async blockReporterPhone(id: string, duration: BlockDuration): Promise<ApiResponse<null>> {
    return mockResponse(null, `Đã chặn số điện thoại của sự cố ${id} (${duration}).`);
  },
};
