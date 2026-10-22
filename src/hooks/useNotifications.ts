import { useCallback, useEffect, useState } from 'react';
import { notificationService, type NotificationDto } from '../services/notificationService';
import { HubEvents, incidentHubService } from '../services/realtime/incidentHubService';

const PAGE_SIZE = 20;

/**
 * Thông báo của tài khoản đang đăng nhập: tải từ /api/notifications, nhận thêm qua
 * SignalR ReceiveNotification (hub do DispatchProvider mở). Đánh dấu đã đọc cập nhật lạc quan.
 */
export function useNotifications() {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [page, count] = await Promise.all([notificationService.list(PAGE_SIZE), notificationService.unreadCount()]);
      setItems(page.items);
      setUnreadCount(count);
      setError(null);
    } catch {
      setError('Không tải được thông báo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const unsubscribers = [
      incidentHubService.on<NotificationDto>(HubEvents.ReceiveNotification, (notification) => {
        setItems((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)].slice(0, PAGE_SIZE));
        if (!notification.isRead) setUnreadCount((c) => c + 1);
      }),
      incidentHubService.onReconnected(reload),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [reload]);

  const markRead = useCallback(
    (id: string) => {
      const target = items.find((n) => n.id === id);
      if (!target || target.isRead) return;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      notificationService.markRead(id).catch(reload);
    },
    [items, reload]
  );

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    notificationService.markAllRead().catch(reload);
  }, [reload]);

  return { items, unreadCount, loading, error, markRead, markAllRead };
}
