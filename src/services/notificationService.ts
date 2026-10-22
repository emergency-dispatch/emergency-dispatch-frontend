import { apiClient, unwrapApi } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type { PaginatedResultDto } from '../types/incident';

/** Mirror NotificationDto (GET /api/notifications, SignalR ReceiveNotification). */
export interface NotificationDto {
  id: string;
  type: 'NewIncident' | 'JobAssigned' | 'StatusUpdate' | 'Escalation' | 'System';
  title: string;
  message: string;
  incidentId: string | null;
  dataJson: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const notificationService = {
  async list(pageSize = 20): Promise<PaginatedResultDto<NotificationDto>> {
    return unwrapApi(
      apiClient.get<ApiResponse<PaginatedResultDto<NotificationDto>>>('/notifications', {
        params: { pageIndex: 1, pageSize },
      })
    );
  },

  async unreadCount(): Promise<number> {
    return unwrapApi(apiClient.get<ApiResponse<number>>('/notifications/unread-count'));
  },

  async markRead(id: string): Promise<void> {
    await unwrapApi(apiClient.put<ApiResponse<boolean>>(`/notifications/${id}/read`));
  },

  async markAllRead(): Promise<void> {
    await unwrapApi(apiClient.put<ApiResponse<number>>('/notifications/read-all'));
  },
};
