import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { apiClient } from '@/services/apiClient';
import { apiFail, apiOk } from '../setup/fixtures';
import type { stationTeamService as Service } from '@/services/stationTeamService';

vi.mock('@/services/apiClient', async (importOriginal) => (await import('../setup/mockApiClient')).mockApiClientModule(importOriginal));

const api = apiClient as unknown as { get: Mock; post: Mock; put: Mock; delete: Mock };

const teamDto = (id: string, stationId: string, members: Array<[string, string]> = []) => ({
  id,
  stationId,
  name: `Tổ ${id}`,
  rescueUnitId: null,
  rescueUnitPlate: null,
  members: members.map(([staffId, crewRole]) => ({ staffId, fullName: staffId, phoneNumber: null, crewRole })),
  isUnderstaffed: false,
});

let svc: typeof Service;

beforeEach(async () => {
  // Store ở cấp module → nạp lại module cho mỗi test để trạng thái sạch.
  vi.resetModules();
  svc = (await import('@/services/stationTeamService')).stationTeamService;
  for (const m of [api.get, api.post, api.put, api.delete]) m.mockReset();
});

describe('stationTeamService', () => {
  it('snapshot ban đầu rỗng', () => {
    expect(svc.getSnapshot()).toEqual({ staff: [], teams: [] });
  });

  it('loadTeams bỏ qua trạm lỗi (403) và map vai trò', async () => {
    api.get.mockImplementation((url: string) =>
      url === '/stations/s1/teams'
        ? Promise.resolve(apiOk([teamDto('t1', 's1', [['u1', 'Commander'], ['u2', 'Medic']])]))
        : Promise.reject(new Error('403')),
    );
    const listener = vi.fn();
    svc.subscribe(listener);
    await svc.loadTeams(['s1', 's2']);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(svc.getSnapshot().teams).toEqual([
      {
        id: 't1',
        stationId: 's1',
        name: 'Tổ t1',
        vehicleId: null,
        members: [
          { staffId: 'u1', crewRole: 'commander', fullName: 'u1' },
          { staffId: 'u2', crewRole: 'medic', fullName: 'u2' },
        ],
      },
    ]);
  });

  it('loadStaff tải mọi trang và gắn teamId / isLocked', async () => {
    api.get.mockImplementation((url: string, config?: { params: { pageIndex: number } }) => {
      if (url.endsWith('/teams')) return Promise.resolve(apiOk([teamDto('t1', 's1', [['u2', 'Driver']])]));
      return Promise.resolve(
        apiOk(
          config!.params.pageIndex === 1
            ? { items: [{ id: 'u1', fullName: 'A', status: 'Suspended', stationId: 's1' }], hasNextPage: true }
            : { items: [{ id: 'u2', fullName: 'B', status: 'Active', phoneNumber: '098' }], hasNextPage: false },
        ),
      );
    });
    await svc.loadTeams(['s1']);
    await svc.loadStaff();
    expect(api.get).toHaveBeenCalledWith('/users', { params: { role: 'RescueStaff', pageIndex: 2, pageSize: 100 } });
    expect(svc.getSnapshot().staff).toEqual([
      { id: 'u1', fullName: 'A', phoneNumber: '', isLocked: true, stationId: 's1', teamId: null },
      { id: 'u2', fullName: 'B', phoneNumber: '098', isLocked: false, stationId: null, teamId: 't1' },
    ]);
  });

  it('loadUnassignedStaff tải mọi trang và gộp vào staff (không trùng người)', async () => {
    api.get.mockImplementation((url: string, config?: { params: { pageIndex: number } }) => {
      if (url === '/users') {
        return Promise.resolve(apiOk({ items: [{ id: 'u1', fullName: 'A', status: 'Active', stationId: 's1' }], hasNextPage: false }));
      }
      return Promise.resolve(
        apiOk(
          config!.params.pageIndex === 1
            ? { items: [{ id: 'u2', fullName: 'B', status: 'Active', stationId: null }], hasNextPage: true }
            : { items: [{ id: 'u1', fullName: 'A (cũ)', status: 'Active', stationId: null }], hasNextPage: false },
        ),
      );
    });
    await svc.loadStaff();
    await svc.loadUnassignedStaff();
    expect(api.get).toHaveBeenCalledWith('/users/unassigned-staff', { params: { pageIndex: 2, pageSize: 100 } });
    expect(svc.getSnapshot().staff).toEqual([
      { id: 'u1', fullName: 'A', phoneNumber: '', isLocked: false, stationId: 's1', teamId: null },
      { id: 'u2', fullName: 'B', phoneNumber: '', isLocked: false, stationId: null, teamId: null },
    ]);
  });

  it('addStaff gán từng người rồi tải lại cả 2 danh sách kể cả khi lỗi', async () => {
    api.put.mockResolvedValueOnce(apiOk({})).mockResolvedValueOnce(apiFail('Đã khóa'));
    api.get.mockResolvedValue(apiOk({ items: [], hasNextPage: false }));
    await expect(svc.addStaff('s1', ['u1', 'u2'])).rejects.toThrow('Đã khóa');
    expect(api.put).toHaveBeenNthCalledWith(1, '/users/u1/assign-station-team', { stationId: 's1', teamName: null });
    expect(api.get).toHaveBeenCalledWith('/users', expect.anything());
    expect(api.get).toHaveBeenCalledWith('/users/unassigned-staff', expect.anything());
  });

  it('createStaff gửi role RescueStaff, SĐT rỗng → null', async () => {
    api.post.mockResolvedValue(apiOk({ id: 'n1' }));
    api.get.mockResolvedValue(apiOk({ items: [], hasNextPage: false }));
    await expect(svc.createStaff({ fullName: 'A', email: 'a@b.vn', password: '123456', phoneNumber: '' })).resolves.toEqual({ id: 'n1' });
    expect(api.post).toHaveBeenCalledWith('/users', {
      fullName: 'A',
      email: 'a@b.vn',
      password: '123456',
      phoneNumber: null,
      role: 'RescueStaff',
    });
  });

  it('removeStaff gỡ trạm và tải lại nhân sự + tổ của trạm', async () => {
    api.put.mockResolvedValue(apiOk({}));
    api.get.mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/teams') ? apiOk([]) : apiOk({ items: [], hasNextPage: false })),
    );
    await svc.removeStaff('s1', 'u1');
    expect(api.put).toHaveBeenCalledWith('/users/u1/assign-station-team', { stationId: null, teamName: null });
    expect(api.get).toHaveBeenCalledWith('/stations/s1/teams');
  });

  it('reloadStationTeams chỉ thay tổ của trạm đó', async () => {
    api.get
      .mockResolvedValueOnce(apiOk([teamDto('a', 's1')]))
      .mockResolvedValueOnce(apiOk([teamDto('b', 's2')]))
      .mockResolvedValueOnce(apiOk([teamDto('a2', 's1')]));
    await svc.loadTeams(['s1', 's2']);
    await svc.reloadStationTeams('s1');
    expect(svc.getSnapshot().teams.map((t) => t.id)).toEqual(['b', 'a2']);
  });

  it('saveTeam tạo mới (POST) và cập nhật (PUT)', async () => {
    const input = { name: '  Tổ 1  ', vehicleId: 'v1', members: [{ staffId: 'u1', crewRole: 'firefighter' as const }] };
    api.post.mockResolvedValue(apiOk(teamDto('t1', 's1', [['u1', 'Firefighter']])));
    const created = await svc.saveTeam('s1', input, null);
    expect(api.post).toHaveBeenCalledWith('/stations/s1/teams', {
      name: 'Tổ 1',
      rescueUnitId: 'v1',
      members: [{ staffId: 'u1', crewRole: 'Firefighter' }],
    });
    expect(created.members[0].crewRole).toBe('firefighter');
    expect(svc.getSnapshot().teams).toHaveLength(1);

    api.put.mockResolvedValue(apiOk({ ...teamDto('t1', 's1'), name: 'Đổi tên' }));
    await svc.saveTeam('s1', input, 't1');
    expect(api.put).toHaveBeenCalledWith('/stations/s1/teams/t1', expect.anything());
    expect(svc.getSnapshot().teams).toEqual([expect.objectContaining({ id: 't1', name: 'Đổi tên' })]);
  });

  it('deleteTeam xóa khỏi store; hủy đăng ký thì không nhận thông báo', async () => {
    api.post.mockResolvedValue(apiOk(teamDto('t1', 's1')));
    await svc.saveTeam('s1', { name: 'x', vehicleId: null, members: [] }, null);
    const listener = vi.fn();
    const unsubscribe = svc.subscribe(listener);
    api.delete.mockResolvedValue(apiOk(true));
    await svc.deleteTeam('s1', 't1');
    expect(api.delete).toHaveBeenCalledWith('/stations/s1/teams/t1');
    expect(svc.getSnapshot().teams).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await svc.deleteTeam('s1', 't1');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
