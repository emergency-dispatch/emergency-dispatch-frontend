import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { apiClient } from '@/services/apiClient';
import { apiFail, apiOk } from '../setup/fixtures';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import { mediaService } from '@/services/mediaService';
import { notificationService } from '@/services/notificationService';
import { incidentService } from '@/services/incidentService';
import { dispatchService } from '@/services/dispatchService';
import { DEFAULT_ESCALATION_SETTINGS, liveMapService, mapStation, mapTrafficHotspot } from '@/services/liveMapService';

vi.mock('@/services/apiClient', async (importOriginal) => (await import('../setup/mockApiClient')).mockApiClientModule(importOriginal));

const api = apiClient as unknown as { get: Mock; post: Mock; put: Mock; delete: Mock };

beforeEach(() => {
  for (const m of [api.get, api.post, api.put, api.delete]) {
    m.mockReset();
    m.mockResolvedValue(apiOk('payload'));
  }
});

type Case = [name: string, call: () => Promise<unknown>, method: 'get' | 'post' | 'put' | 'delete', args: unknown[]];

/** Các service mỏng: kiểm tra đúng method / URL / body và trả `response.data`. */
function runWrapperCases(cases: Case[]) {
  it.each(cases)('%s', async (_name, call, method, args) => {
    const result = await call();
    expect(api[method]).toHaveBeenCalledWith(...args);
    expect(result).toEqual(apiOk('payload').data);
  });
}

describe('authService', () => {
  const dto = { email: 'a@b.vn', password: 'x' };
  runWrapperCases([
    ['login', () => authService.login(dto), 'post', ['/Auth/login', dto]],
    ['googleLogin', () => authService.googleLogin('id-tok'), 'post', ['/Auth/google', { idToken: 'id-tok' }]],
    ['register', () => authService.register(dto as never), 'post', ['/Auth/register', dto]],
    ['verifyEmail', () => authService.verifyEmail(dto as never), 'post', ['/Auth/verify-email', dto]],
    ['resendVerification', () => authService.resendVerification(dto), 'post', ['/Auth/resend-verification', dto]],
    ['forgotPassword', () => authService.forgotPassword(dto), 'post', ['/Auth/forgot-password', dto]],
    ['resetPassword', () => authService.resetPassword(dto as never), 'post', ['/Auth/reset-password', dto]],
    ['changePassword', () => authService.changePassword(dto as never), 'post', ['/Auth/change-password', dto]],
    ['logout', () => authService.logout('rt'), 'post', ['/Auth/logout', { refreshToken: 'rt' }]],
  ]);

  it('logout không có refresh token gửi chuỗi rỗng', async () => {
    await authService.logout();
    expect(api.post).toHaveBeenCalledWith('/Auth/logout', { refreshToken: '' });
  });

  it('logout lỗi vẫn trả thành công để client xóa phiên', async () => {
    api.post.mockRejectedValue(new Error('offline'));
    await expect(authService.logout('rt')).resolves.toEqual({ success: true, message: 'Đăng xuất thành công', data: true });
  });
});

describe('userService', () => {
  const dto = { name: 'x' };
  runWrapperCases([
    ['getMe', () => userService.getMe(), 'get', ['/Users/me']],
    ['getMyTeam', () => userService.getMyTeam(), 'get', ['/users/my-team']],
    ['updateProfile', () => userService.updateProfile(dto as never), 'put', ['/Users/me', dto]],
    ['updateFcmToken', () => userService.updateFcmToken('f'), 'put', ['/Users/fcm-token', { fcmToken: 'f' }]],
    ['getIceContacts', () => userService.getIceContacts(), 'get', ['/Users/ice-contacts']],
    ['createIceContact', () => userService.createIceContact(dto as never), 'post', ['/Users/ice-contacts', dto]],
    ['updateIceContact', () => userService.updateIceContact('c1', dto as never), 'put', ['/Users/ice-contacts/c1', dto]],
    ['deleteIceContact', () => userService.deleteIceContact('c1'), 'delete', ['/Users/ice-contacts/c1']],
  ]);
});

describe('mediaService.upload', () => {
  it('gửi multipart và trả URL', async () => {
    api.post.mockResolvedValue(apiOk({ url: 'https://cdn/x.jpg', isSuccess: true }));
    const file = new File(['abc'], 'x.jpg', { type: 'image/jpeg' });
    await expect(mediaService.upload(file)).resolves.toBe('https://cdn/x.jpg');
    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toBe('/media/upload');
    expect((body as FormData).get('file')).toBe(file);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });

  it('thất bại hoặc thiếu URL → ném lỗi', async () => {
    api.post.mockResolvedValue(apiFail('Quá dung lượng'));
    await expect(mediaService.upload(new File([], 'a'))).rejects.toThrow('Quá dung lượng');
    api.post.mockResolvedValue({ data: { success: true, message: '', data: { url: '' } } });
    await expect(mediaService.upload(new File([], 'a'))).rejects.toThrow('Không thể tải tệp tin lên.');
  });
});

describe('notificationService', () => {
  it('list / unreadCount / markRead / markAllRead', async () => {
    api.get.mockResolvedValueOnce(apiOk({ items: [] })).mockResolvedValueOnce(apiOk(7));
    await notificationService.list(5);
    expect(api.get).toHaveBeenCalledWith('/notifications', { params: { pageIndex: 1, pageSize: 5 } });
    await expect(notificationService.unreadCount()).resolves.toBe(7);
    api.put.mockResolvedValue(apiOk(true));
    await notificationService.markRead('n1');
    expect(api.put).toHaveBeenCalledWith('/notifications/n1/read');
    await notificationService.markAllRead();
    expect(api.put).toHaveBeenLastCalledWith('/notifications/read-all');
  });

  it('list mặc định 20', async () => {
    api.get.mockResolvedValue(apiOk({ items: [] }));
    await notificationService.list();
    expect(api.get.mock.calls[0][1].params.pageSize).toBe(20);
  });
});

describe('incidentService', () => {
  const dto = { a: 1 };
  runWrapperCases([
    ['createIncident', () => incidentService.createIncident(dto as never), 'post', ['/Incidents', dto]],
    ['createByOperator', () => incidentService.createByOperator(dto as never), 'post', ['/Incidents/operator', dto]],
    ['getIncidents', () => incidentService.getIncidents({ pageIndex: 2 }), 'get', ['/Incidents', { params: { pageIndex: 2 } }]],
    ['getMyReports', () => incidentService.getMyReports({ status: 1 }), 'get', ['/Incidents/my-reports', { params: { status: 1 } }]],
    ['getQueue', () => incidentService.getQueue(), 'get', ['/Incidents/queue']],
    ['verify', () => incidentService.verify('i1', dto as never), 'put', ['/Incidents/i1/verify', dto]],
    [
      'updateTrafficJamStatus',
      () => incidentService.updateTrafficJamStatus('i1', dto as never),
      'put',
      ['/Incidents/i1/traffic-jam-status', dto],
    ],
    ['cancel (Operator)', () => incidentService.cancel('i1', 'lý do', 'Duplicate'), 'put', ['/Incidents/i1/cancel', { reason: 'lý do', reasonCode: 'Duplicate' }]],
    ['cancel (Citizen)', () => incidentService.cancel('i1', 'lý do'), 'put', ['/Incidents/i1/cancel', { reason: 'lý do' }]],
    ['transfer', () => incidentService.transfer('i1', 's2', 'quá tải'), 'post', ['/Incidents/i1/transfer', { stationId: 's2', reason: 'quá tải' }]],
    ['getTracking', () => incidentService.getTracking('i1'), 'get', ['/dispatch/tracking/incident/i1']],
    ['getById', () => incidentService.getById('i1'), 'get', ['/Incidents/i1']],
    ['lock', () => incidentService.lock('i1'), 'put', ['/Incidents/i1/lock']],
    ['unlock', () => incidentService.unlock('i1'), 'delete', ['/Incidents/i1/lock']],
    ['revealPhone', () => incidentService.revealPhone('i1'), 'post', ['/Incidents/i1/reveal-phone']],
  ]);

  it.each([
    ['7d', 'SevenDays'],
    ['30d', 'ThirtyDays'],
    ['1y', 'OneYear'],
    ['permanent', 'Permanent'],
  ] as const)('blockReporterPhone %s → %s', async (duration, backend) => {
    await incidentService.blockReporterPhone('i1', duration, 'báo khống');
    expect(api.post).toHaveBeenCalledWith('/Incidents/i1/block-reporter', { duration: backend, reason: 'báo khống' });
  });

  it('getDispatchBoard tải hết các trang', async () => {
    api.get
      .mockResolvedValueOnce(apiOk({ items: [{ id: 1 }], hasNextPage: true }))
      .mockResolvedValueOnce(apiOk({ items: [{ id: 2 }], hasNextPage: false }));
    await expect(incidentService.getDispatchBoard()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(api.get).toHaveBeenNthCalledWith(1, '/Incidents', {
      params: { statuses: 'Verified,Dispatched,InProgress,Escalated', pageIndex: 1, pageSize: 200 },
    });
    expect(api.get.mock.calls[1][1].params.pageIndex).toBe(2);
  });

  it('getDispatchBoard lỗi', async () => {
    api.get.mockResolvedValue(apiFail(''));
    await expect(incidentService.getDispatchBoard()).rejects.toThrow('Không thể tải sự cố đang điều phối.');
  });

  it('getAuditTrail', async () => {
    api.get.mockResolvedValue(apiOk({ items: ['x'] }));
    await expect(incidentService.getAuditTrail('i1')).resolves.toEqual({ items: ['x'] });
    expect(api.get).toHaveBeenCalledWith('/Incidents/i1/audit-trail', { params: { pageIndex: 1, pageSize: 50 } });
    api.get.mockResolvedValue(apiFail('Cấm'));
    await expect(incidentService.getAuditTrail('i1', 2, 10)).rejects.toThrow('Cấm');
  });
});

describe('dispatchService', () => {
  const dto = { b: 2 };
  runWrapperCases([
    ['getMyAssignments', () => dispatchService.getMyAssignments(), 'get', ['/dispatch/my-assignments']],
    ['getAssignmentById', () => dispatchService.getAssignmentById('a1'), 'get', ['/dispatch/assignments/a1']],
    ['getActiveAssignments', () => dispatchService.getActiveAssignments(), 'get', ['/dispatch/assignments/active']],
    ['getAssignmentsByIncident', () => dispatchService.getAssignmentsByIncident('i1'), 'get', ['/dispatch/assignments/incident/i1']],
    ['updateAssignmentStatus', () => dispatchService.updateAssignmentStatus('a1', dto as never), 'put', ['/dispatch/assignments/a1/status', dto]],
    ['rejectAssignment', () => dispatchService.rejectAssignment('a1', dto as never), 'post', ['/dispatch/assignments/a1/reject', dto]],
    ['resolveAssignment', () => dispatchService.resolveAssignment('a1', dto as never), 'post', ['/dispatch/assignments/a1/resolve', dto]],
    ['assignUnit', () => dispatchService.assignUnit(dto as never), 'post', ['/dispatch/assign', dto]],
    [
      'getRecommendations (mặc định NearestAvailable)',
      () => dispatchService.getRecommendations('i1'),
      'get',
      ['/dispatch/recommend', { params: { incidentId: 'i1', algorithm: 'NearestAvailable' } }],
    ],
    [
      'getRecommendations (LoadAware)',
      () => dispatchService.getRecommendations('i1', 'LoadAware' as never),
      'get',
      ['/dispatch/recommend', { params: { incidentId: 'i1', algorithm: 'LoadAware' } }],
    ],
  ]);
});

describe('liveMapService', () => {
  it('mapStation / mapTrafficHotspot', () => {
    expect(
      mapStation({ id: 's', name: 'A', address: 'D1', latitude: 1, longitude: 2, coverageRadiusKm: 5, rescueUnits: [{ id: 'u1' }, { id: 'u2' }] } as never),
    ).toEqual({ id: 's', name: 'A', address: 'D1', lat: 1, lng: 2, coverageRadiusKm: 5, vehicleIds: ['u1', 'u2'] });

    const base = { id: 'h', title: 'Kẹt', latitude: 1, longitude: 2, createdAt: 't', mediaUrl: null };
    expect(mapTrafficHotspot({ ...base, locationAddress: 'Ngã tư', description: 'Kẹt xe' } as never)).toEqual({
      id: 'h',
      area: 'Ngã tư',
      lat: 1,
      lng: 2,
      note: 'Kẹt xe',
      reportedAt: 't',
      mediaUrl: null,
    });
    expect(mapTrafficHotspot({ ...base, locationAddress: '', description: null } as never)).toMatchObject({ area: 'Kẹt', note: 'Kẹt' });
  });

  it('getStations chỉ lấy trạm hoạt động và map', async () => {
    api.get.mockResolvedValue(apiOk([{ id: 's', name: 'A', latitude: 1, longitude: 2, rescueUnits: [] }]));
    const res = await liveMapService.getStations();
    expect(api.get).toHaveBeenCalledWith('/stations', { params: { activeOnly: true } });
    expect(res[0]).toMatchObject({ id: 's', lat: 1, lng: 2, vehicleIds: [] });
  });

  it('các API xe / trạm / ùn tắc', async () => {
    api.get.mockResolvedValue(apiOk([]));
    await liveMapService.getRescueUnits({ stationId: 's1' });
    expect(api.get).toHaveBeenCalledWith('/rescue-units', { params: { stationId: 's1' } });
    await liveMapService.getRescueUnits();
    expect(api.get).toHaveBeenLastCalledWith('/rescue-units', { params: {} });
    await liveMapService.getStation('s1');
    expect(api.get).toHaveBeenLastCalledWith('/stations/s1');
    await liveMapService.getRescueUnit('u1');
    expect(api.get).toHaveBeenLastCalledWith('/rescue-units/u1');
    await liveMapService.getActiveTrafficJams();
    expect(api.get).toHaveBeenLastCalledWith('/traffic/active');

    api.post.mockResolvedValue(apiOk({}));
    await liveMapService.createRescueUnit({ plateNumber: 'x' } as never);
    expect(api.post).toHaveBeenCalledWith('/rescue-units', { plateNumber: 'x' });

    api.put.mockResolvedValue(apiOk({}));
    await liveMapService.updateRescueUnit('u1', { plateNumber: 'y' } as never);
    expect(api.put).toHaveBeenCalledWith('/rescue-units/u1', { plateNumber: 'y' });
    await liveMapService.setRescueUnitStatus('u1', 'Maintenance');
    expect(api.put).toHaveBeenLastCalledWith('/rescue-units/u1/status', { status: 'Maintenance' });
    await liveMapService.resolveTrafficJam('h1');
    expect(api.put).toHaveBeenLastCalledWith('/traffic/h1/resolve');
  });

  it('getServiceArea đọc cả dạng bọc { values } và dạng phẳng', async () => {
    const area = { enabled: true, name: 'A', centerLat: 1, centerLng: 2, radiusKm: 3 };
    api.get.mockResolvedValueOnce(apiOk({ values: area })).mockResolvedValueOnce(apiOk(area));
    await expect(liveMapService.getServiceArea()).resolves.toEqual(area);
    await expect(liveMapService.getServiceArea()).resolves.toEqual(area);
  });

  it('getEscalationSettings gộp với mặc định', async () => {
    api.get.mockResolvedValue(apiOk({ values: { dayThresholdMinutes: 8 } }));
    await expect(liveMapService.getEscalationSettings()).resolves.toEqual({ ...DEFAULT_ESCALATION_SETTINGS, dayThresholdMinutes: 8 });
  });
});
