import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from '@/hooks/useNow';
import { useSosCooldown } from '@/hooks/useSosCooldown';
import { useAuth } from '@/hooks/useAuth';
import { useStationTeams, useTeamByVehicle } from '@/hooks/useStationTeams';
import { useNotifications } from '@/hooks/useNotifications';
import { useDispatchRoutes } from '@/hooks/useDispatchRoutes';
import { notificationService } from '@/services/notificationService';
import { incidentHubService } from '@/services/realtime/incidentHubService';
import { incidentService } from '@/services/incidentService';
import { stationTeamService } from '@/services/stationTeamService';
import { makeIncident } from '../setup/fixtures';
import type { Vehicle } from '@/types/vehicle';

vi.mock('@/services/notificationService', () => ({
  notificationService: { list: vi.fn(), unreadCount: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));
vi.mock('@/services/incidentService', () => ({ incidentService: { getTracking: vi.fn() } }));

describe('useNow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('cập nhật theo chu kỳ', () => {
    vi.setSystemTime(1_000_000);
    const { result } = renderHook(() => useNow(500));
    expect(result.current).toBe(1_000_000);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(1_000_500);
  });
});

describe('useSosCooldown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mặc định không bị khóa', () => {
    const { result } = renderHook(() => useSosCooldown());
    expect(result.current).toMatchObject({ isCooldown: false, cooldownSeconds: 0, cooldownLabel: '0:00' });
  });

  it('đọc thời điểm báo gần nhất từ localStorage', () => {
    vi.setSystemTime(10_000_000);
    localStorage.setItem('resq_last_reported_time', String(10_000_000 - 60_000));
    const { result } = renderHook(() => useSosCooldown());
    expect(result.current.cooldownSeconds).toBe(120);
    expect(result.current.cooldownLabel).toBe('2:00');
  });

  it('trigger → đếm ngược 3 phút, hết hạn thì mở', () => {
    vi.setSystemTime(new Date("2026-10-01T08:00:00Z"));
    const { result } = renderHook(() => useSosCooldown());
    act(() => result.current.triggerCooldown());
    expect(result.current.cooldownSeconds).toBe(180);
    expect(result.current.cooldownLabel).toBe('3:00');
    act(() => {
      vi.advanceTimersByTime(171_000);
    });
    expect(result.current.cooldownLabel).toBe('0:09');
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.isCooldown).toBe(false);
  });

  it('đồng bộ giữa các hook qua sự kiện và clearCooldown', () => {
    vi.setSystemTime(new Date("2026-10-01T08:00:00Z"));
    const a = renderHook(() => useSosCooldown());
    const b = renderHook(() => useSosCooldown());
    act(() => a.result.current.triggerCooldown());
    expect(b.result.current.isCooldown).toBe(true);
    act(() => b.result.current.clearCooldown());
    expect(a.result.current.isCooldown).toBe(false);
    expect(localStorage.getItem('resq_last_reported_time')).toBeNull();
  });
});

describe('useAuth', () => {
  it('ngoài AuthProvider → ném lỗi', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
  });
});

describe('useStationTeams / useTeamByVehicle', () => {
  it('đọc snapshot từ store và map tổ theo xe', () => {
    const teams = [
      { id: 't1', stationId: 's', name: 'A', vehicleIds: ['v1', 'v3'], vehiclePlates: ['P1', 'P3'], members: [] },
      { id: 't2', stationId: 's', name: 'B', vehicleIds: [], vehiclePlates: [], members: [] },
    ];
    vi.spyOn(stationTeamService, 'getSnapshot').mockReturnValue({ staff: [], teams });
    expect(renderHook(() => useStationTeams()).result.current.teams).toBe(teams);
    const map = renderHook(() => useTeamByVehicle()).result.current;
    // Tổ nhiều xe: mỗi xe đều trỏ về cùng tổ; tổ không có xe không xuất hiện.
    expect([...map.keys()]).toEqual(['v1', 'v3']);
    expect(map.get('v1')!.id).toBe('t1');
    expect(map.get('v3')!.id).toBe('t1');
  });
});

describe('useNotifications', () => {
  const n = (id: string, isRead = false) => ({ id, isRead, title: id, message: '', type: 'System', incidentId: null, dataJson: null, readAt: null, createdAt: '' });
  const handlers = new Map<string, (p: unknown) => void>();
  let reconnected: (() => void) | undefined;

  beforeEach(() => {
    handlers.clear();
    vi.spyOn(incidentHubService, 'on').mockImplementation((event: string, cb: (p: never) => void) => {
      handlers.set(event, cb as (p: unknown) => void);
      return () => handlers.delete(event);
    });
    vi.spyOn(incidentHubService, 'onReconnected').mockImplementation((cb) => {
      reconnected = cb;
      return () => {};
    });
    vi.mocked(notificationService.list).mockResolvedValue({ items: [n('a'), n('b', true)] } as never);
    vi.mocked(notificationService.unreadCount).mockResolvedValue(1);
    vi.mocked(notificationService.markRead).mockResolvedValue();
    vi.mocked(notificationService.markAllRead).mockResolvedValue();
  });

  it('tải danh sách và số chưa đọc', async () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('lỗi tải → error', async () => {
    vi.mocked(notificationService.list).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Không tải được thông báo.');
  });

  it('nhận thông báo realtime (bỏ trùng) và đồng bộ đã đọc', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => handlers.get('ReceiveNotification')!(n('c')));
    act(() => handlers.get('ReceiveNotification')!(n('a', true)));
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'c', 'b']);
    expect(result.current.unreadCount).toBe(2);

    act(() => handlers.get('ReceiveNotificationRead')!({ notificationIds: ['c'], all: false, unreadCount: 0 }));
    expect(result.current.items.find((i) => i.id === 'c')!.isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);

    act(() => handlers.get('ReceiveNotificationRead')!({ notificationIds: [], all: true, unreadCount: 0 }));
    expect(result.current.items.every((i) => i.isRead)).toBe(true);
  });

  it('markRead cập nhật lạc quan; đã đọc thì bỏ qua', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.markRead('a'));
    expect(result.current.unreadCount).toBe(0);
    expect(notificationService.markRead).toHaveBeenCalledWith('a');
    act(() => result.current.markRead('b'));
    act(() => result.current.markRead('zzz'));
    expect(notificationService.markRead).toHaveBeenCalledTimes(1);
  });

  it('markAllRead lỗi → tải lại', async () => {
    vi.mocked(notificationService.markAllRead).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.markAllRead());
    expect(result.current.unreadCount).toBe(0);
    await waitFor(() => expect(notificationService.list).toHaveBeenCalledTimes(2));
  });

  it('kết nối lại → tải lại; unmount → hủy đăng ký', async () => {
    const { result, unmount } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => reconnected!());
    expect(notificationService.list).toHaveBeenCalledTimes(2);
    unmount();
    expect(handlers.size).toBe(0);
  });
});

describe('useDispatchRoutes', () => {
  const vehicle = (o: Partial<Vehicle> = {}): Vehicle => ({
    id: 'v1',
    plate: '51A',
    type: 'fire_truck',
    unitType: 'FireTruck',
    status: 'en_route',
    stationId: 's1',
    stationName: 'Trạm',
    unitStatus: 'Dispatched',
    lat: 10.84,
    lng: 106.8,
    heading: 0,
    etaMinutes: 5,
    incidentId: 'inc-1',
    lastUpdated: '',
    assignmentId: 'as1',
    hasLiveGps: false,
    ...o,
  });
  const tracking = (units: unknown[]) => ({ success: true, data: { units } });
  const route = [
    { latitude: 10.84, longitude: 106.8 },
    { latitude: 10.845, longitude: 106.8 },
    { latitude: 10.85, longitude: 106.8 },
  ];

  beforeEach(() => vi.mocked(incidentService.getTracking).mockReset());

  it('không có xe đang chạy → không gọi API', () => {
    const { result } = renderHook(() => useDispatchRoutes([makeIncident({ status: 'approved' })], [vehicle({ status: 'on_scene' })]));
    expect(result.current).toEqual([]);
    expect(incidentService.getTracking).not.toHaveBeenCalled();
  });

  it('chỉ lấy tuyến cho sự cố đã duyệt có xe đang tới', async () => {
    vi.mocked(incidentService.getTracking).mockResolvedValue(
      tracking([
        { assignmentId: 'as1', rescueUnitId: 'v1', routeTrajectory: route, isApproximateRoute: true },
        { assignmentId: 'as2', rescueUnitId: 'other', routeTrajectory: route },
        { assignmentId: 'as3', rescueUnitId: 'v1', routeTrajectory: [route[0]] },
      ]) as never,
    );
    const incidents = [makeIncident({ status: 'approved' }), makeIncident({ id: 'inc-2', status: 'pending' })];
    const { result } = renderHook(() => useDispatchRoutes(incidents, [vehicle(), vehicle({ id: 'v2', incidentId: 'inc-2' })]));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(incidentService.getTracking).toHaveBeenCalledTimes(1);
    expect(incidentService.getTracking).toHaveBeenCalledWith('inc-1');
    expect(result.current[0]).toEqual({
      id: 'as1',
      vehicleId: 'v1',
      status: 'en_route',
      approximate: true,
      coordinates: [[106.8, 10.84], [106.8, 10.845], [106.8, 10.85]],
    });
  });

  it('xe có GPS thật → cắt phần tuyến đã đi qua', async () => {
    vi.mocked(incidentService.getTracking).mockResolvedValue(tracking([{ assignmentId: 'as1', rescueUnitId: 'v1', routeTrajectory: route }]) as never);
    const v = vehicle({ hasLiveGps: true, lat: 10.846, lng: 106.8 });
    const { result } = renderHook(() => useDispatchRoutes([makeIncident({ status: 'approved' })], [v]));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].coordinates).toEqual([[106.8, 10.846], [106.8, 10.85]]);
  });

  it('xe lệch tuyến quá 150m → giữ nguyên tuyến', async () => {
    vi.mocked(incidentService.getTracking).mockResolvedValue(tracking([{ assignmentId: 'as1', rescueUnitId: 'v1', routeTrajectory: route }]) as never);
    const v = vehicle({ hasLiveGps: true, lat: 10.846, lng: 106.81 });
    const { result } = renderHook(() => useDispatchRoutes([makeIncident({ status: 'approved' })], [v]));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].coordinates).toHaveLength(3);
  });

  it('API lỗi / success=false → bỏ qua', async () => {
    vi.mocked(incidentService.getTracking).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ success: false } as never);
    const incidents = [makeIncident({ status: 'approved' }), makeIncident({ id: 'inc-2', status: 'approved' })];
    const { result } = renderHook(() => useDispatchRoutes(incidents, [vehicle(), vehicle({ id: 'v2', incidentId: 'inc-2' })]));
    await waitFor(() => expect(incidentService.getTracking).toHaveBeenCalledTimes(2));
    expect(result.current).toEqual([]);
  });

  it('làm mới mỗi 30 giây', async () => {
    vi.useFakeTimers();
    vi.mocked(incidentService.getTracking).mockResolvedValue(tracking([]) as never);
    const { unmount } = renderHook(() => useDispatchRoutes([makeIncident({ status: 'approved' })], [vehicle()]));
    expect(incidentService.getTracking).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(incidentService.getTracking).toHaveBeenCalledTimes(2);
    unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(incidentService.getTracking).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
