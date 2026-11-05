import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { apiClient } from '@/services/apiClient';
import { apiFail, apiOk } from '../../setup/fixtures';
import { normalizeText, paginate } from '@/services/admin/listUtils';
import { normalizeText as legacyNormalizeText } from '@/services/admin/adminMock';
import { EMAIL_PATTERN, PASSWORD_MIN_LENGTH, PHONE_PATTERN, REASON_MIN_LENGTH } from '@/services/admin/validation';
import { citizenAdminService } from '@/services/admin/citizenAdminService';
import { blockedNumberService } from '@/services/admin/blockedNumberService';
import { HOTLINE_PATTERN, stationAdminService } from '@/services/admin/stationAdminService';
import { accountAdminService } from '@/services/admin/accountAdminService';
import { isOffMission, vehicleAdminService } from '@/services/admin/vehicleAdminService';
import { DESCRIPTION_MAX_LENGTH, escalationService, validateEscalationRule } from '@/services/admin/escalationService';
import { GUID_PATTERN, auditTrailService } from '@/services/admin/auditTrailService';
import { LONG_MAINTENANCE_DAYS, overviewAdminService } from '@/services/admin/overviewAdminService';
import { UserRole, UserStatus } from '@/types/auth';
import type { RescueUnitResponseDto } from '@/types/rescueUnit';
import type { StationResponseDto } from '@/types/station';

vi.mock('@/services/apiClient', async (importOriginal) => (await import('../../setup/mockApiClient')).mockApiClientModule(importOriginal));

const api = apiClient as unknown as { get: Mock; post: Mock; put: Mock; delete: Mock };

const page = <T,>(items: T[], totalPages = 1, totalCount = items.length) => ({
  items,
  pageIndex: 1,
  pageSize: items.length,
  totalCount,
  totalPages,
  hasPreviousPage: false,
  hasNextPage: totalPages > 1,
});

const station = (o: Partial<StationResponseDto> = {}): StationResponseDto => ({
  id: 's1',
  name: 'Trạm A',
  address: 'Đường D1',
  latitude: 10.84,
  longitude: 106.8,
  phoneNumber: '114',
  isActive: true,
  coverageRadiusKm: 5,
  headOperatorId: null,
  headOperatorName: null,
  headOperatorPhone: null,
  activeUnitsCount: 1,
  totalUnitsCount: 2,
  staffCount: 3,
  rescueUnits: [],
  staffMembers: [],
  createdAt: '2026-01-01T00:00:00Z',
  ...o,
});

const unit = (o: Partial<RescueUnitResponseDto> = {}): RescueUnitResponseDto => ({
  id: 'u1',
  plateNumber: '51A-11111',
  unitType: 'FireTruck',
  unitTypeName: 'Xe cứu hỏa',
  status: 'Available',
  statusName: 'Sẵn sàng',
  currentLat: 10.84,
  currentLng: 106.8,
  lastLocationUpdateAt: null,
  stationId: 's1',
  stationName: 'Trạm A',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  ...o,
});

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.put.mockReset();
  api.delete.mockReset();
});

describe('listUtils', () => {
  it('paginate chia trang và kẹp chỉ số trang', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(paginate(items, { pageIndex: 2, pageSize: 10 })).toMatchObject({
      items: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      pageIndex: 2,
      totalCount: 25,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
    });
    expect(paginate(items, { pageIndex: 99, pageSize: 10 }).pageIndex).toBe(3);
    expect(paginate(items, { pageIndex: -1, pageSize: 10 }).pageIndex).toBe(1);
    expect(paginate(items, {}).items).toHaveLength(10);
  });

  it('paginate danh sách rỗng vẫn có 1 trang', () => {
    expect(paginate([], {})).toMatchObject({ items: [], totalPages: 1, pageIndex: 1, hasNextPage: false });
  });

  it('normalizeText bỏ dấu tiếng Việt', () => {
    expect(normalizeText('  Đường Lê Văn Việt  ')).toBe('duong le van viet');
    expect(normalizeText('ĐĂNG')).toBe('dang');
    expect(legacyNormalizeText).toBe(normalizeText);
  });
});

describe('validation', () => {
  it('các hằng số và regex', () => {
    expect(REASON_MIN_LENGTH).toBe(5);
    expect(PASSWORD_MIN_LENGTH).toBe(6);
    expect(EMAIL_PATTERN.test('a@b.vn')).toBe(true);
    expect(EMAIL_PATTERN.test('a@b')).toBe(false);
    expect(EMAIL_PATTERN.test('a b@c.vn')).toBe(false);
    expect(PHONE_PATTERN.test('0981234567')).toBe(true);
    expect(PHONE_PATTERN.test('981234567')).toBe(false);
    expect(PHONE_PATTERN.test('09812345678')).toBe(false);
    expect(HOTLINE_PATTERN.test('114')).toBe(true);
    expect(HOTLINE_PATTERN.test('11')).toBe(false);
    expect(HOTLINE_PATTERN.test('028-123')).toBe(false);
    expect(GUID_PATTERN.test('3fa85f64-5717-4562-b3fc-2c963f66afa6')).toBe(true);
    expect(GUID_PATTERN.test('3fa85f64')).toBe(false);
  });
});

describe('citizenAdminService', () => {
  it('list gửi role Citizen và giá trị mặc định', async () => {
    api.get.mockResolvedValue(apiOk(page([])));
    await citizenAdminService.list({ search: '  an  ' });
    expect(api.get).toHaveBeenCalledWith('/users', {
      params: { role: UserRole.Citizen, status: undefined, search: 'an', pageIndex: 1, pageSize: 10 },
    });
  });

  it('search rỗng → undefined', async () => {
    api.get.mockResolvedValue(apiOk(page([])));
    await citizenAdminService.list({ search: '   ', pageIndex: 3, pageSize: 5, status: UserStatus.Suspended });
    expect(api.get.mock.calls[0][1].params).toMatchObject({ search: undefined, pageIndex: 3, pageSize: 5, status: 'Suspended' });
  });

  it('lock / unlock uỷ quyền cho accountAdminService', async () => {
    api.post.mockResolvedValue(apiOk({ id: 'c1' }));
    await citizenAdminService.lock('c1', '  spam  ');
    expect(api.post).toHaveBeenCalledWith('/users/c1/lock', { reason: 'spam' });
    await citizenAdminService.unlock('c1');
    expect(api.post).toHaveBeenLastCalledWith('/users/c1/unlock');
  });

  it('ApiResponse success=false ném lỗi với message', async () => {
    api.get.mockResolvedValue(apiFail('Không có quyền'));
    await expect(citizenAdminService.list()).rejects.toThrow('Không có quyền');
  });
});

describe('blockedNumberService', () => {
  it('list / unblock / extend', async () => {
    api.get.mockResolvedValue(apiOk(page([])));
    await blockedNumberService.list({ status: 'Active' as never });
    expect(api.get).toHaveBeenCalledWith('/blocked-numbers', {
      params: { status: 'Active', search: undefined, pageIndex: 1, pageSize: 10 },
    });

    api.post.mockResolvedValue(apiOk({ id: 'b1' }));
    await expect(blockedNumberService.unblock('b1', ' nhầm số ')).resolves.toEqual({ id: 'b1' });
    expect(api.post).toHaveBeenCalledWith('/blocked-numbers/b1/unblock', { reason: 'nhầm số' });

    await blockedNumberService.extend('b1', '30d' as never, ' tái phạm ');
    expect(api.post).toHaveBeenLastCalledWith('/blocked-numbers/b1/extend', { duration: '30d', reason: 'tái phạm' });
  });
});

describe('stationAdminService', () => {
  it('list lọc, tìm không dấu, sắp xếp và phân trang phía client', async () => {
    api.get.mockResolvedValue(
      apiOk([
        station({ id: 'b', name: 'Trạm Bình', isActive: true }),
        station({ id: 'a', name: 'Trạm An', isActive: true, address: 'Đường Lê Văn Việt' }),
        station({ id: 'c', name: 'Trạm Cũ', isActive: false }),
      ]),
    );
    const all = await stationAdminService.list();
    expect(all.items.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(api.get).toHaveBeenCalledWith('/stations');

    const active = await stationAdminService.list({ status: 'active' });
    expect(active.items.map((s) => s.id)).toEqual(['a', 'b']);

    const inactive = await stationAdminService.list({ status: 'inactive' });
    expect(inactive.items.map((s) => s.id)).toEqual(['c']);

    const search = await stationAdminService.list({ search: 'le van viet' });
    expect(search.items.map((s) => s.id)).toEqual(['a']);
  });

  it('CRUD + gán nhân sự gọi đúng endpoint', async () => {
    api.get.mockResolvedValue(apiOk(station()));
    api.post.mockResolvedValue(apiOk(station()));
    api.put.mockResolvedValue(apiOk(station()));
    api.delete.mockResolvedValue(apiOk(null));
    const input = { name: 'X' } as never;

    await stationAdminService.getById('s1');
    expect(api.get).toHaveBeenCalledWith('/stations/s1');
    await stationAdminService.create(input);
    expect(api.post).toHaveBeenCalledWith('/stations', input);
    await stationAdminService.update('s1', input);
    expect(api.put).toHaveBeenCalledWith('/stations/s1', input);
    await stationAdminService.assignStaff('u1', null);
    expect(api.put).toHaveBeenLastCalledWith('/users/u1/assign-station-team', { stationId: null });
    await expect(stationAdminService.remove('s1')).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/stations/s1');
  });
});

describe('accountAdminService', () => {
  const user = (id: string, role: UserRole) => ({ id, role, fullName: id, status: UserStatus.Active });

  it('lọc theo 1 vai trò → phân trang ở backend', async () => {
    api.get.mockResolvedValue(apiOk(page([user('o1', UserRole.Operator)])));
    const res = await accountAdminService.listAccounts({ role: UserRole.Operator as never, pageIndex: 2, search: ' x ' });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get.mock.calls[0][1].params).toEqual({
      pageIndex: 2,
      pageSize: 10,
      search: 'x',
      role: 'Operator',
      status: undefined,
    });
    expect(res.items).toHaveLength(1);
  });

  it('không lọc vai trò → gom mọi trang và chỉ giữ Operator + RescueStaff', async () => {
    api.get
      .mockResolvedValueOnce(apiOk(page([user('o1', UserRole.Operator), user('c1', UserRole.Citizen)], 3)))
      .mockResolvedValueOnce(apiOk(page([user('r1', UserRole.RescueStaff)], 3)))
      .mockResolvedValueOnce(apiOk(page([user('a1', UserRole.Admin), user('r2', UserRole.RescueStaff)], 3)));
    const res = await accountAdminService.listAccounts();
    expect(api.get).toHaveBeenCalledTimes(3);
    expect(api.get.mock.calls.map((c) => c[1].params.pageIndex)).toEqual([1, 2, 3]);
    expect(api.get.mock.calls[0][1].params.pageSize).toBe(100);
    expect(res.items.map((u) => u.id)).toEqual(['o1', 'r1', 'r2']);
    expect(res.totalCount).toBe(3);
  });

  it('backend trả totalPages = 0 → không gọi thêm', async () => {
    api.get.mockResolvedValue(apiOk(page([], 0)));
    const res = await accountAdminService.listAccounts();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(res.items).toEqual([]);
  });

  it('countByRole đọc totalCount', async () => {
    api.get.mockResolvedValue(apiOk(page([], 1, 42)));
    await expect(accountAdminService.countByRole(UserRole.Citizen)).resolves.toBe(42);
    expect(api.get.mock.calls[0][1].params).toEqual({ pageIndex: 1, pageSize: 1, role: 'Citizen' });
  });

  it('create chuẩn hóa SĐT rỗng thành null', async () => {
    api.post.mockResolvedValue(apiOk({ id: 'n' }));
    await accountAdminService.create({ fullName: 'A', email: 'a@b.vn', password: '123456', phoneNumber: '', role: 'Operator' } as never);
    expect(api.post.mock.calls[0][1]).toMatchObject({ phoneNumber: null, email: 'a@b.vn' });
  });

  it('update đọc bản mới nhất rồi PUT đầy đủ, giữ trạm hiện tại', async () => {
    api.get.mockResolvedValue(
      apiOk({ id: 'u1', fullName: 'Cũ', phoneNumber: '0981234567', role: 'Operator', status: 'Active', stationId: 'st-9' }),
    );
    api.put.mockResolvedValue(apiOk({ id: 'u1' }));
    await accountAdminService.update('u1', { fullName: 'Mới', phoneNumber: '', role: 'RescueStaff' } as never);
    expect(api.get).toHaveBeenCalledWith('/users/u1');
    expect(api.put).toHaveBeenCalledWith('/users/u1', {
      fullName: 'Mới',
      phoneNumber: null,
      role: 'RescueStaff',
      status: 'Active',
      stationId: 'st-9',
    });
  });

  it('update khi chưa có trạm → stationId null', async () => {
    api.get.mockResolvedValue(apiOk({ id: 'u1', fullName: 'A', role: 'Operator', status: 'Active' }));
    api.put.mockResolvedValue(apiOk({ id: 'u1' }));
    await accountAdminService.update('u1', { fullName: 'A' } as never);
    expect(api.put.mock.calls[0][1].stationId).toBeNull();
  });

  it('remove', async () => {
    api.delete.mockResolvedValue(apiOk(null));
    await accountAdminService.remove('u1');
    expect(api.delete).toHaveBeenCalledWith('/users/u1');
  });
});

describe('vehicleAdminService', () => {
  it('isOffMission', () => {
    expect(isOffMission('Available')).toBe(true);
    expect(isOffMission('Maintenance')).toBe(true);
    expect(isOffMission('Dispatched')).toBe(false);
    expect(isOffMission('OnScene')).toBe(false);
    expect(isOffMission('Returning')).toBe(false);
  });

  it('list lọc theo trạm, loại, trạng thái (kể cả on_mission) và tìm biển số', async () => {
    api.get.mockResolvedValue(
      apiOk([
        unit({ id: '1', plateNumber: '51A-2', stationName: 'Trạm B', stationId: 'sB' }),
        unit({ id: '2', plateNumber: '51A-1', stationName: 'Trạm B', stationId: 'sB', status: 'OnScene' }),
        unit({ id: '3', plateNumber: '51C-9', stationName: 'Trạm A', unitType: 'Ambulance', status: 'Returning' }),
      ]),
    );
    expect((await vehicleAdminService.list()).items.map((u) => u.id)).toEqual(['3', '2', '1']);
    expect((await vehicleAdminService.list({ stationId: 'sB' })).items.map((u) => u.id)).toEqual(['2', '1']);
    expect((await vehicleAdminService.list({ type: 'Ambulance' })).items.map((u) => u.id)).toEqual(['3']);
    expect((await vehicleAdminService.list({ status: 'on_mission' })).items.map((u) => u.id)).toEqual(['3', '2']);
    expect((await vehicleAdminService.list({ status: 'Available' })).items.map((u) => u.id)).toEqual(['1']);
    expect((await vehicleAdminService.list({ search: '51c' })).items.map((u) => u.id)).toEqual(['3']);
    expect(api.get).toHaveBeenCalledWith('/rescue-units');
  });

  it('update giữ nguyên trạng thái hiện tại khi không đổi', async () => {
    api.get.mockResolvedValue(apiOk(unit({ status: 'CoolDown' })));
    api.put.mockResolvedValue(apiOk(unit()));
    await vehicleAdminService.update('u1', { plateNumber: '51A-1', unitType: 'FireTruck', stationId: 's1' });
    expect(api.put).toHaveBeenCalledWith('/rescue-units/u1', {
      plateNumber: '51A-1',
      unitType: 'FireTruck',
      stationId: 's1',
      status: 'CoolDown',
    });
  });

  it('update chặn trạng thái Admin không được đặt', async () => {
    api.get.mockResolvedValue(apiOk(unit()));
    await expect(
      vehicleAdminService.update('u1', { plateNumber: 'x', unitType: 'FireTruck', stationId: 's1', status: 'OnScene' }),
    ).rejects.toThrow('Admin chỉ đặt được Sẵn sàng, Bảo trì hoặc Ngừng hoạt động.');
    expect(api.put).not.toHaveBeenCalled();
  });

  it('update chặn đổi trạng thái / đổi trạm khi xe đang làm nhiệm vụ', async () => {
    api.get.mockResolvedValue(apiOk(unit({ status: 'Dispatched', plateNumber: '51A-9' })));
    await expect(
      vehicleAdminService.update('u1', { plateNumber: 'x', unitType: 'FireTruck', stationId: 's1', status: 'Maintenance' }),
    ).rejects.toThrow('Xe 51A-9 đang làm nhiệm vụ — trạng thái tự cập nhật theo tiến độ nhiệm vụ.');
    await expect(
      vehicleAdminService.update('u1', { plateNumber: 'x', unitType: 'FireTruck', stationId: 's2' }),
    ).rejects.toThrow('Xe 51A-9 đang làm nhiệm vụ, không thể đổi trạm trực thuộc.');
    expect(api.put).not.toHaveBeenCalled();
  });

  it('setStatus / create / remove', async () => {
    api.get.mockResolvedValue(apiOk(unit()));
    api.put.mockResolvedValue(apiOk(unit({ status: 'Maintenance' })));
    await vehicleAdminService.setStatus('u1', 'Maintenance');
    expect(api.put).toHaveBeenCalledWith('/rescue-units/u1/status', { status: 'Maintenance' });
    await expect(vehicleAdminService.setStatus('u1', 'Dispatched')).rejects.toThrow();

    api.post.mockResolvedValue(apiOk(unit()));
    const dto = { plateNumber: 'x', unitType: 'FireTruck' as const, stationId: 's1' };
    await vehicleAdminService.create(dto);
    expect(api.post).toHaveBeenCalledWith('/rescue-units', dto);

    api.delete.mockResolvedValue(apiOk(null));
    await vehicleAdminService.remove('u1');
    expect(api.delete).toHaveBeenCalledWith('/rescue-units/u1');
  });
});

describe('escalationService', () => {
  const input = { minSeverityLevel: 'Level3' as const, notifyRoles: ['Admin' as const], isActive: true, description: '  mô tả ' };

  it('validateEscalationRule', () => {
    expect(validateEscalationRule(input)).toEqual({});
    expect(validateEscalationRule({ ...input, notifyRoles: [] }).notifyRoles).toBe('Chọn ít nhất 1 vai trò nhận cảnh báo.');
    expect(validateEscalationRule({ ...input, description: 'x'.repeat(DESCRIPTION_MAX_LENGTH + 1) }).description).toBe(
      `Mô tả tối đa ${DESCRIPTION_MAX_LENGTH} ký tự.`,
    );
  });

  it('listRules sắp xếp: bật trước, cấp cao trước', async () => {
    api.get.mockResolvedValue(
      apiOk([
        { id: 'a', isActive: false, minSeverityLevel: 'Level3' },
        { id: 'b', isActive: true, minSeverityLevel: 'Level1' },
        { id: 'c', isActive: true, minSeverityLevel: 'Level3' },
      ]),
    );
    expect((await escalationService.listRules()).map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('createRule / updateRule tuần tự hóa notifyRoles và trim mô tả', async () => {
    api.post.mockResolvedValue(apiOk({ id: 'r' }));
    api.put.mockResolvedValue(apiOk({ id: 'r' }));
    await escalationService.createRule(input);
    expect(api.post).toHaveBeenCalledWith('/escalation/rules', { ...input, notifyRoles: '["Admin"]', description: 'mô tả' });
    await escalationService.updateRule('r', input);
    expect(api.put).toHaveBeenCalledWith('/escalation/rules/r', expect.objectContaining({ notifyRoles: '["Admin"]' }));
  });

  it('createRule ném lỗi validate, không gọi API', async () => {
    await expect(escalationService.createRule({ ...input, notifyRoles: [] })).rejects.toThrow('Chọn ít nhất');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('setActive / deleteRule / triggerCheck', async () => {
    api.put.mockResolvedValue(apiOk({}));
    await escalationService.setActive('r', false);
    expect(api.put).toHaveBeenCalledWith('/escalation/rules/r', { isActive: false });
    api.delete.mockResolvedValue(apiOk(true));
    await escalationService.deleteRule('r');
    expect(api.delete).toHaveBeenCalledWith('/escalation/rules/r');
    api.post.mockResolvedValue(apiOk(4));
    await expect(escalationService.triggerCheck()).resolves.toBe(4);
  });

  it('listLogs hỏi thêm 1 bản ghi để biết còn trang sau', async () => {
    api.get.mockImplementation((_url: string, { params }: { params: { pageSize: number } }) =>
      Promise.resolve(apiOk(params.pageSize === 1 ? [{ id: 'next' }] : [{ id: 'l1' }])),
    );
    const res = await escalationService.listLogs(2, 10);
    expect(res).toEqual({ items: [{ id: 'l1' }], hasNextPage: true });
    expect(api.get).toHaveBeenCalledWith('/escalation/logs', { params: { page: 2, pageSize: 10 } });
    expect(api.get).toHaveBeenCalledWith('/escalation/logs', { params: { page: 21, pageSize: 1 } });

    api.get.mockImplementation(() => Promise.resolve(apiOk([])));
    expect((await escalationService.listLogs()).hasNextPage).toBe(false);
  });
});

describe('auditTrailService', () => {
  it('list chuyển ngày thành ISO đầu/cuối ngày', async () => {
    api.get.mockResolvedValue(apiOk(page([])));
    await auditTrailService.list({ fromDate: '2026-10-01', toDate: '2026-10-02', action: 'Created' as never });
    const params = api.get.mock.calls[0][1].params;
    expect(api.get.mock.calls[0][0]).toBe('/audit-trail');
    expect(params.from).toBe(new Date('2026-10-01T00:00:00').toISOString());
    expect(params.to).toBe(new Date('2026-10-02T23:59:59.999').toISOString());
    expect(params).toMatchObject({ action: 'Created', incidentId: undefined, pageIndex: 1, pageSize: 20 });
  });

  it('list chặn khoảng ngày ngược và mã sự cố không phải GUID', async () => {
    await expect(auditTrailService.list({ fromDate: '2026-10-05', toDate: '2026-10-01' })).rejects.toThrow(
      'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.',
    );
    await expect(auditTrailService.list({ incidentId: 'abc' })).rejects.toThrow('Mã sự cố phải là mã đầy đủ');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('listSystem', async () => {
    api.get.mockResolvedValue(apiOk(page([])));
    await auditTrailService.listSystem({ entityType: 'Station' as never, entityId: 'e1' }, { pageIndex: 2, pageSize: 50 });
    expect(api.get).toHaveBeenCalledWith('/audit-trail/system', {
      params: { entityType: 'Station', entityId: 'e1', action: undefined, from: undefined, to: undefined, pageIndex: 2, pageSize: 50 },
    });
    await expect(auditTrailService.listSystem({ fromDate: '2026-10-05', toDate: '2026-10-01' })).rejects.toThrow();
  });
});

describe('overviewAdminService', () => {
  it('tổng hợp số liệu trạm, xe, tài khoản và việc cần xử lý', async () => {
    const old = new Date(Date.now() - (LONG_MAINTENANCE_DAYS + 1.5) * 86400_000).toISOString();
    const recent = new Date(Date.now() - 86400_000).toISOString();
    api.get.mockImplementation((url: string, config?: { params?: { role?: string } }) => {
      if (url === '/stations')
        return Promise.resolve(
          apiOk([
            station({ id: 's1', name: 'A', activeUnitsCount: 0, totalUnitsCount: 2 }),
            station({ id: 's2', name: 'B', activeUnitsCount: 3 }),
            station({ id: 's3', name: 'C', isActive: false, activeUnitsCount: 0 }),
          ]),
        );
      if (url === '/rescue-units')
        return Promise.resolve(
          apiOk([
            unit({ id: 'a' }),
            unit({ id: 'b', status: 'Dispatched' }),
            unit({ id: 'c', status: 'OnScene' }),
            unit({ id: 'd', status: 'CoolDown' }),
            unit({ id: 'e', status: 'Maintenance', updatedAt: old, plateNumber: 'M-1' }),
            unit({ id: 'f', status: 'Maintenance', updatedAt: recent }),
            unit({ id: 'g', status: 'OutOfService', plateNumber: 'O-1' }),
          ]),
        );
      const counts: Record<string, number> = { Operator: 4, RescueStaff: 12, Citizen: 300 };
      return Promise.resolve(apiOk(page([], 1, counts[config?.params?.role ?? ''])));
    });

    const o = await overviewAdminService.getOverview();
    expect(o.vehicleCounts).toEqual({ Available: 1, on_mission: 2, CoolDown: 1, Maintenance: 2, OutOfService: 1 });
    expect(o.activeStationCount).toBe(2);
    expect(o.accountCounts).toEqual({ Operator: 4, RescueStaff: 12 });
    expect(o.citizenCount).toBe(300);
    expect(o.actionItems.stationsWithoutAvailableVehicle).toEqual([{ id: 's1', name: 'A', vehicleCount: 2 }]);
    expect(o.actionItems.longMaintenanceVehicles).toEqual([
      { id: 'e', plate: 'M-1', stationName: 'Trạm A', maintenanceSince: old, days: LONG_MAINTENANCE_DAYS + 1 },
    ]);
    expect(o.actionItems.outOfServiceVehicles).toEqual([{ id: 'g', plate: 'O-1', stationName: 'Trạm A' }]);
  });
});
