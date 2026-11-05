import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchProvider, useDispatchStore } from '@/context/DispatchContext';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { incidentService } from '@/services/incidentService';
import { dispatchService } from '@/services/dispatchService';
import { liveMapService } from '@/services/liveMapService';
import { staffAudioService } from '@/services/staffAudioService';
import { incidentHubService, trackingHubService } from '@/services/realtime/incidentHubService';
import { stationTeamService } from '@/services/stationTeamService';
import type { IncidentResponseDto } from '@/types/incident';
import type { DispatchAssignmentResponseDto } from '@/types/dispatch';
import type { RescueUnitResponseDto } from '@/types/rescueUnit';

vi.mock('@/services/incidentService', () => ({
  incidentService: {
    getQueue: vi.fn(),
    getDispatchBoard: vi.fn(),
    getById: vi.fn(),
    verify: vi.fn(),
    updateTrafficJamStatus: vi.fn(),
    cancel: vi.fn(),
    blockReporterPhone: vi.fn(),
    transfer: vi.fn(),
    lock: vi.fn(),
    unlock: vi.fn(),
    createByOperator: vi.fn(),
    revealPhone: vi.fn(),
  },
}));
vi.mock('@/services/dispatchService', () => ({
  dispatchService: { getAssignmentsByIncident: vi.fn(), getActiveAssignments: vi.fn(), assignUnit: vi.fn(), updateAssignmentStatus: vi.fn() },
}));
vi.mock('@/services/liveMapService', async (orig) => ({
  ...(await orig<typeof import('@/services/liveMapService')>()),
  liveMapService: {
    getStations: vi.fn(),
    getActiveTrafficJams: vi.fn(),
    getEscalationSettings: vi.fn(),
    getServiceArea: vi.fn(),
    getRescueUnits: vi.fn(),
    getRescueUnit: vi.fn(),
    setRescueUnitStatus: vi.fn(),
    updateRescueUnit: vi.fn(),
    createRescueUnit: vi.fn(),
    resolveTrafficJam: vi.fn(),
  },
}));
vi.mock('@/services/staffAudioService', () => ({
  staffAudioService: { playPriorityBeep: vi.fn(), playEmergencySiren: vi.fn(), stopEmergencySiren: vi.fn() },
}));
vi.mock('@/services/stationTeamService', () => ({
  stationTeamService: { loadTeams: vi.fn(), reloadStationTeams: vi.fn(), loadStaff: vi.fn() },
}));

const inc = vi.mocked(incidentService);
const disp = vi.mocked(dispatchService);
const live = vi.mocked(liveMapService);

const ok = <T,>(data: T) => ({ success: true, message: '', data });
const fail = (message: string) => ({ success: false, message, data: null as never });

const dto = (o: Partial<IncidentResponseDto> = {}): IncidentResponseDto => ({
  id: 'i1',
  title: 'Cháy kho',
  description: '',
  latitude: 10.84,
  longitude: 106.8,
  locationAddress: 'D1',
  status: 'AiProcessed',
  severity: 'Level2',
  createdAt: '2026-10-01T08:00:00Z',
  mediaItems: [],
  ...o,
});

const unit = (o: Partial<RescueUnitResponseDto> = {}): RescueUnitResponseDto => ({
  id: 'u1',
  plateNumber: '51A-1',
  unitType: 'FireTruck',
  unitTypeName: '',
  status: 'Available',
  statusName: '',
  currentLat: 10.84,
  currentLng: 106.8,
  lastLocationUpdateAt: null,
  stationId: 's1',
  stationName: 'Trạm 1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  ...o,
});

const assignment = (o: Partial<DispatchAssignmentResponseDto> = {}): DispatchAssignmentResponseDto => ({
  id: 'a1',
  incidentId: 'i2',
  incidentTitle: 'Tai nạn',
  incidentAddress: '',
  incidentLat: 0,
  incidentLng: 0,
  incidentSeverity: 'Level2',
  rescueUnitId: 'u2',
  dispatchedAt: new Date().toISOString(),
  status: 'EnRoute',
  estimatedArrivalMinutes: 8,
  ...o,
});

const conflict = () =>
  new AxiosError('Conflict', '409', undefined, undefined, {
    status: 409,
    data: { message: 'Đã bị người khác xử lý' },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

// Bắt listener SignalR để giả lập sự kiện realtime.
const hubHandlers = new Map<string, (p: unknown) => void>();
const logout = vi.fn().mockResolvedValue(undefined);

const authValue = {
  user: { id: 'op1', fullName: 'Điều phối 1', stationId: 's1' },
  logout,
} as unknown as AuthContextType;

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <AuthContext.Provider value={authValue}>
      <DispatchProvider>{children}</DispatchProvider>
    </AuthContext.Provider>
  </MemoryRouter>
);

async function renderStore() {
  const hook = renderHook(() => useDispatchStore(), { wrapper });
  await waitFor(() => expect(hook.result.current.incidentsLoading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  hubHandlers.clear();
  for (const hub of [incidentHubService, trackingHubService]) {
    vi.spyOn(hub, 'on').mockImplementation((event: string, cb: (p: never) => void) => {
      hubHandlers.set(event, cb as (p: unknown) => void);
      return () => {};
    });
    vi.spyOn(hub, 'onReconnected').mockReturnValue(() => {});
    vi.spyOn(hub, 'start').mockResolvedValue(true);
    vi.spyOn(hub, 'stop').mockResolvedValue();
    vi.spyOn(hub, 'setCulture').mockImplementation(() => {});
  }
  inc.getQueue.mockResolvedValue(ok([dto({ id: 'i1', severity: 'Level1' }), dto({ id: 'i3', severity: 'Level3', createdAt: '2026-10-01T09:00:00Z' })]) as never);
  inc.getDispatchBoard.mockResolvedValue([dto({ id: 'i2', status: 'Dispatched', title: 'Tai nạn', verifiedAt: 'x' })]);
  disp.getAssignmentsByIncident.mockResolvedValue(ok([assignment()]) as never);
  disp.getActiveAssignments.mockResolvedValue(ok([]) as never);
  live.getStations.mockResolvedValue([{ id: 's1', name: 'Trạm 1', address: '', lat: 0, lng: 0, coverageRadiusKm: 5, vehicleIds: [] }]);
  live.getActiveTrafficJams.mockResolvedValue([{ id: 'j1', area: 'Ngã tư', lat: 0, lng: 0, note: '', reportedAt: '', mediaUrl: null }]);
  live.getEscalationSettings.mockResolvedValue({ dayThresholdMinutes: 7, nightThresholdMinutes: 3, nightStart: '22:00', nightEnd: '06:00', radiusMultiplier: 2, maxRadiusKm: 30 });
  live.getServiceArea.mockResolvedValue({ enabled: true, name: 'SHTP', centerLat: 1, centerLng: 2, radiusKm: 4.5 });
  live.getRescueUnits.mockResolvedValue([
    unit(),
    unit({ id: 'u2', plateNumber: '51A-2', status: 'Dispatched' }),
    unit({ id: 'u3', plateNumber: '51A-3', unitType: 'PolicePatrol' }),
    unit({ id: 'u4', plateNumber: '51A-4', unitType: 'Ambulance', status: 'Maintenance' }),
  ]);
  vi.mocked(stationTeamService.loadTeams).mockResolvedValue();
});

describe('DispatchProvider – tải dữ liệu', () => {
  it('useDispatchStore ngoài provider → lỗi', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useDispatchStore())).toThrow('useDispatchStore must be used within DispatchProvider');
  });

  it('gộp hàng đợi + bảng điều phối, sắp xếp ưu tiên, ghép lượt điều phối', async () => {
    const { result } = await renderStore();
    const s = result.current;
    expect(s.currentOperatorId).toBe('op1');
    // Hàng đợi chờ duyệt: Cấp 3 trước Cấp 1; bảng điều phối chứa sự cố đã duyệt
    expect(s.incidents.filter((i) => i.status === 'pending').map((i) => i.id)).toEqual(['i3', 'i1']);
    expect(s.incidents.filter((i) => i.status === 'approved').map((i) => i.id)).toEqual(['i2']);
    expect(s.incidents.find((i) => i.id === 'i2')!.assignedVehicleIds).toEqual(['u2']);
    expect(s.incidentsError).toBeNull();
    expect(disp.getAssignmentsByIncident).toHaveBeenCalledWith('i2');
    await waitFor(() => expect(result.current.stations).toHaveLength(1));
    expect(result.current.trafficJams).toHaveLength(1);
    expect(result.current.escalationSettings.dayThresholdMinutes).toBe(7);
    expect(result.current.serviceArea?.name).toBe('SHTP');
    expect(stationTeamService.loadTeams).toHaveBeenCalledWith(['s1']);
    expect(incidentHubService.start).toHaveBeenCalled();
    expect(trackingHubService.start).toHaveBeenCalled();
  });

  it('xe: map trạng thái theo lượt điều phối, ẩn xe tuần tra, tính ETA', async () => {
    const { result } = await renderStore();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(3));
    const byId = Object.fromEntries(result.current.vehicles.map((v) => [v.id, v]));
    expect(byId.u1).toMatchObject({ status: 'available', type: 'fire_truck', incidentId: null });
    expect(byId.u2).toMatchObject({ status: 'en_route', incidentId: 'i2', assignmentId: 'a1', etaMinutes: 8 });
    expect(byId.u4).toMatchObject({ status: 'unavailable', type: 'ambulance' });
    expect(byId.u3).toBeUndefined();
  });

  it('403 → stationNotAssigned thay vì lỗi tải', async () => {
    inc.getQueue.mockRejectedValue(
      new AxiosError('Forbidden', '403', undefined, undefined, { status: 403, data: { message: 'Chưa gán trạm' }, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } }),
    );
    const { result } = await renderStore();
    expect(result.current.stationNotAssigned).toBe('Chưa gán trạm');
    expect(result.current.incidentsError).toBeNull();
  });

  it('lỗi khác → incidentsError', async () => {
    inc.getQueue.mockResolvedValue(fail('Hàng đợi lỗi') as never);
    const { result } = await renderStore();
    expect(result.current.incidentsError).toBe('Hàng đợi lỗi');
  });
});

describe('DispatchProvider – thao tác sự cố', () => {
  it('approveIncident gửi cấp + loại + ùn tắc và cập nhật sự cố', async () => {
    inc.verify.mockResolvedValue(ok(dto({ id: 'i1', status: 'Verified', verifiedAt: 'now' })) as never);
    const { result } = await renderStore();
    let res;
    await act(async () => {
      res = await result.current.approveIncident('i1', 3, 'ghi chú', 'fire', 'Confirmed');
    });
    expect(res).toEqual({ ok: true });
    expect(inc.verify).toHaveBeenCalledWith('i1', {
      confirmedSeverity: 'Level3',
      confirmedEventType: 'FireExplosion',
      operatorNotes: 'ghi chú',
      confirmedTrafficJamStatus: 'Confirmed',
    });
    expect(result.current.incidents.find((i) => i.id === 'i1')!.status).toBe('approved');
  });

  it('approveIncident thất bại / 409 → tải lại bảng', async () => {
    const { result } = await renderStore();
    inc.verify.mockResolvedValueOnce(fail('') as never);
    await expect(result.current.approveIncident('i1', 1)).resolves.toMatchObject({ ok: false });
    inc.verify.mockRejectedValueOnce(conflict());
    inc.getQueue.mockClear();
    let res;
    await act(async () => {
      res = await result.current.approveIncident('i1', 1, undefined, 'unknown');
    });
    expect(res).toEqual({ ok: false, message: 'Đã bị người khác xử lý' });
    expect(inc.getQueue).toHaveBeenCalled();
    expect(inc.verify.mock.calls[1][1].confirmedEventType).toBeUndefined();
  });

  it('rejectIncident gỡ sự cố, chặn số khi có thời hạn', async () => {
    inc.cancel.mockResolvedValue(ok(dto()) as never);
    inc.blockReporterPhone.mockResolvedValue(fail('Số đã bị chặn') as never);
    const { result } = await renderStore();
    let res;
    await act(async () => {
      res = await result.current.rejectIncident('i1', 'Báo khống', '30d', 'FalseReport');
    });
    expect(res).toEqual({ ok: true });
    expect(inc.cancel).toHaveBeenCalledWith('i1', 'Báo khống', 'FalseReport');
    expect(inc.blockReporterPhone).toHaveBeenCalledWith('i1', '30d', 'Báo khống');
    expect(result.current.incidents.some((i) => i.id === 'i1')).toBe(false);
    expect(result.current.incidentsError).toContain('Số đã bị chặn');
  });

  it('rejectIncident không chặn số khi không có thời hạn', async () => {
    inc.cancel.mockResolvedValue(ok(dto()) as never);
    const { result } = await renderStore();
    await act(async () => {
      await result.current.rejectIncident('i1', 'Trùng');
    });
    expect(inc.cancel).toHaveBeenCalledWith('i1', 'Trùng', 'FalseReport');
    expect(inc.blockReporterPhone).not.toHaveBeenCalled();
  });

  it('transferIncident / reviewTrafficJam', async () => {
    inc.transfer.mockResolvedValue(ok(dto()) as never);
    inc.updateTrafficJamStatus.mockResolvedValue(ok(dto({ id: 'i2', status: 'Dispatched' })) as never);
    const { result } = await renderStore();
    await act(async () => {
      await result.current.transferIncident('i3', 's2', 'Quá tải trạm');
    });
    expect(result.current.incidents.some((i) => i.id === 'i3')).toBe(false);
    await act(async () => {
      await result.current.reviewTrafficJam('i2', 'Dismissed', '');
    });
    expect(inc.updateTrafficJamStatus).toHaveBeenCalledWith('i2', { status: 'Dismissed', notes: undefined });
  });

  it('lockIncident / releaseIncident chỉ nhả khóa của mình', async () => {
    const expires = new Date(Date.now() + 120_000).toISOString();
    inc.lock.mockResolvedValue(ok({ incidentId: 'i1', lockedByOperatorId: 'op1', lockedByOperatorName: 'Tôi', lockExpiresAt: expires }) as never);
    inc.unlock.mockResolvedValue(ok(true) as never);
    const { result } = await renderStore();
    await act(async () => {
      await result.current.lockIncident('i1');
    });
    expect(result.current.incidents.find((i) => i.id === 'i1')!.lock?.operatorId).toBe('op1');
    act(() => result.current.releaseIncident('i1'));
    expect(inc.unlock).toHaveBeenCalledWith('i1');
    expect(result.current.incidents.find((i) => i.id === 'i1')!.lock).toBeNull();
    act(() => result.current.releaseIncident('i3'));
    expect(inc.unlock).toHaveBeenCalledTimes(1);
  });

  it('lockIncident bị người khác giữ (409) → báo lỗi', async () => {
    inc.lock.mockRejectedValue(conflict());
    const { result } = await renderStore();
    await expect(result.current.lockIncident('i1')).resolves.toEqual({ ok: false, message: 'Đã bị người khác xử lý' });
  });

  it('createOperatorIncident: thành công kèm điều xe / lỗi validate', async () => {
    inc.createByOperator.mockResolvedValueOnce(
      ok({ incident: dto({ id: 'new', status: 'Verified', source: 'PhoneCall' }), assignments: [assignment({ id: 'a9', incidentId: 'new', rescueUnitId: 'u1' })], dispatchSucceeded: true, dispatchMessage: null }) as never,
    );
    const { result } = await renderStore();
    let res;
    await act(async () => {
      res = await result.current.createOperatorIncident({} as never);
    });
    expect(res).toMatchObject({ ok: true, incidentId: 'new', dispatchSucceeded: true });
    expect(result.current.incidents.find((i) => i.id === 'new')!.assignedVehicleIds).toEqual(['u1']);

    inc.createByOperator.mockRejectedValueOnce(
      new AxiosError('Bad', '400', undefined, undefined, { status: 400, data: { errors: ['Thiếu địa chỉ', 3] }, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } }),
    );
    await expect(result.current.createOperatorIncident({} as never)).resolves.toMatchObject({ ok: false, errors: ['Thiếu địa chỉ'] });
  });

  it('revealReporterPhone', async () => {
    const { result } = await renderStore();
    inc.revealPhone.mockResolvedValueOnce(ok({ incidentId: 'i1', phoneNumber: '0981234567' }) as never);
    await expect(result.current.revealReporterPhone('i1')).resolves.toBe('0981234567');
    inc.revealPhone.mockRejectedValueOnce(new Error('x'));
    await expect(result.current.revealReporterPhone('i1')).resolves.toBeNull();
  });
});

describe('DispatchProvider – điều xe', () => {
  it('assignVehicle: kiểm tra xe sẵn sàng và giới hạn số xe', async () => {
    const { result } = await renderStore();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(3));
    await expect(result.current.assignVehicle('zzz', 'i1')).resolves.toMatchObject({ ok: false });
    await expect(result.current.assignVehicle('u4', 'i1')).resolves.toMatchObject({ ok: false, message: expect.stringContaining('51A-4') });
    // i2 (Cấp 2) đã có 1 xe → không giao thêm nếu không có lý do
    await expect(result.current.assignVehicle('u1', 'i2')).resolves.toMatchObject({ ok: false });
    expect(disp.assignUnit).not.toHaveBeenCalled();
  });

  it('assignVehicle thành công / giao thêm có lý do', async () => {
    disp.assignUnit.mockResolvedValue(ok([assignment({ id: 'a2', incidentId: 'i2', rescueUnitId: 'u1', status: 'Dispatched' })]) as never);
    const { result } = await renderStore();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(3));
    let res;
    await act(async () => {
      res = await result.current.assignVehicle('u1', 'i2', 'load_aware', { allowExtraUnits: true, notes: '  cần thêm  ' });
    });
    expect(res).toEqual({ ok: true });
    expect(disp.assignUnit).toHaveBeenCalledWith({ incidentId: 'i2', rescueUnitId: 'u1', algorithm: 'LoadAware', allowExtraUnits: true, notes: 'cần thêm' });
    expect(result.current.vehicles.find((v) => v.id === 'u1')!.status).toBe('awaiting_ack');
  });

  it('assignVehicle lỗi 409 → tải lại xe và bảng', async () => {
    disp.assignUnit.mockRejectedValue(conflict());
    const { result } = await renderStore();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(3));
    live.getRescueUnits.mockClear();
    let res: unknown;
    await act(async () => {
      res = await result.current.assignVehicle('u1', 'i1');
    });
    expect(res).toEqual({ ok: false, message: 'Đã bị người khác xử lý (51A-1)' });
    expect(live.getRescueUnits).toHaveBeenCalled();
  });

  it('cancelAssignment', async () => {
    disp.updateAssignmentStatus.mockResolvedValue(ok(assignment({ status: 'Cancelled' })) as never);
    const { result } = await renderStore();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(3));
    await expect(result.current.cancelAssignment('u1')).resolves.toMatchObject({ ok: false });
    await act(async () => {
      await result.current.cancelAssignment('u2');
    });
    expect(disp.updateAssignmentStatus).toHaveBeenCalledWith('a1', { status: 'Cancelled', notes: 'Điều phối viên hủy giao xe.' });
  });

  it('setVehicleStatus / saveVehicle / resolveTrafficJam', async () => {
    live.setRescueUnitStatus.mockResolvedValue(unit({ status: 'Maintenance' }));
    live.getRescueUnit.mockResolvedValue(unit({ status: 'CoolDown', stationId: 's1' }));
    live.updateRescueUnit.mockResolvedValue(unit({ plateNumber: '51A-NEW' }));
    live.createRescueUnit.mockResolvedValue(unit({ id: 'u9', plateNumber: '51A-9' }));
    live.resolveTrafficJam.mockResolvedValue();
    const { result } = await renderStore();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(3));

    await act(async () => {
      await result.current.setVehicleStatus('u1', 'Maintenance');
    });
    expect(result.current.vehicles.find((v) => v.id === 'u1')!.status).toBe('unavailable');

    await act(async () => {
      await result.current.saveVehicle({ plateNumber: '51A-NEW', unitType: 'FireTruck', stationId: 's1' } as never, 'u1');
    });
    expect(live.updateRescueUnit).toHaveBeenCalledWith('u1', { plateNumber: '51A-NEW', unitType: 'FireTruck', status: 'CoolDown', stationId: 's1' });

    await act(async () => {
      await result.current.saveVehicle({ plateNumber: '51A-9', unitType: 'FireTruck', stationId: 's1' } as never);
    });
    expect(result.current.vehicles.some((v) => v.id === 'u9')).toBe(true);

    await waitFor(() => expect(result.current.trafficJams).toHaveLength(1));
    await act(async () => {
      await result.current.resolveTrafficJam('j1');
    });
    expect(result.current.trafficJams).toEqual([]);
  });
});

describe('DispatchProvider – realtime', () => {
  it('sự cố mới → thêm vào hàng đợi, bíp, hiện thông báo', async () => {
    const { result } = await renderStore();
    act(() => hubHandlers.get('ReceiveNewIncident')!(dto({ id: 'n1', title: 'Mới' })));
    expect(result.current.incidents.some((i) => i.id === 'n1')).toBe(true);
    expect(result.current.highlightIncidentIds.has('n1')).toBe(true);
    expect(result.current.incomingIncidents.map((i) => i.id)).toEqual(['n1']);
    expect(staffAudioService.playPriorityBeep).toHaveBeenCalled();
    act(() => result.current.dismissIncomingIncident('n1'));
    expect(result.current.incomingIncidents).toEqual([]);
  });

  it('sự cố bị hủy qua cập nhật → gỡ khỏi bảng', async () => {
    const { result } = await renderStore();
    act(() => hubHandlers.get('ReceiveIncidentUpdate')!(dto({ id: 'i1', status: 'Cancelled' })));
    expect(result.current.incidents.some((i) => i.id === 'i1')).toBe(false);
  });

  it('leo thang cấp 2 → còi; cấp 1 → bíp', async () => {
    inc.getById.mockResolvedValue(ok(dto({ id: 'i1', status: 'Escalated' })) as never);
    const { result } = await renderStore();
    act(() => hubHandlers.get('ReceiveEscalationAlert')!({ incidentId: 'i1', tier: 2 }));
    expect(staffAudioService.playEmergencySiren).toHaveBeenCalled();
    expect(result.current.escalationTiers.get('i1')).toBe(2);
    act(() => hubHandlers.get('ReceiveEscalationAlert')!({ incidentId: 'i3' }));
    expect(result.current.escalationTiers.get('i3')).toBe(1);
    await waitFor(() => expect(result.current.escalatedIncidentIds.has('i1')).toBe(true));
  });

  it('vị trí GPS realtime và trạng thái xe', async () => {
    const { result } = await renderStore();
    await waitFor(() => expect(result.current.vehicles).toHaveLength(3));
    act(() => hubHandlers.get('ReceiveRescueUnitLocation')!({ rescueUnitId: 'u2', latitude: 11, longitude: 107, headingDegrees: 90, timestampUtc: 't' }));
    expect(result.current.vehicles.find((v) => v.id === 'u2')).toMatchObject({ lat: 11, lng: 107, heading: 90, hasLiveGps: true });
    act(() => hubHandlers.get('ReceiveRescueUnitStatus')!({ rescueUnitId: 'u1', stationId: 's1', status: 'Maintenance' }));
    expect(result.current.vehicles.find((v) => v.id === 'u1')!.status).toBe('unavailable');
    act(() => hubHandlers.get('ReceiveRescueUnitStatus')!({ rescueUnitId: 'u1', stationId: 's1', status: 'x', isDeleted: true }));
    expect(result.current.vehicles.some((v) => v.id === 'u1')).toBe(false);
  });

  it('điểm ùn tắc realtime', async () => {
    const { result } = await renderStore();
    await waitFor(() => expect(result.current.trafficJams).toHaveLength(1));
    const hotspot = { id: 'j2', title: 'Kẹt', description: null, latitude: 0, longitude: 0, locationAddress: 'A', congestionLevelName: '', mediaUrl: null, createdAt: '', expiresAt: '', isActive: true };
    act(() => hubHandlers.get('ReceiveTrafficHotspot')!(hotspot));
    expect(result.current.trafficJams.map((j) => j.id)).toEqual(['j1', 'j2']);
    act(() => hubHandlers.get('ReceiveTrafficHotspot')!({ ...hotspot, id: 'j1', isActive: false }));
    expect(result.current.trafficJams.map((j) => j.id)).toEqual(['j2']);
  });

  it('chuyển trạm đi → gỡ sự cố + cảnh báo; cảnh báo ngoài vùng', async () => {
    const { result } = await renderStore();
    act(() => hubHandlers.get('ReceiveIncidentTransferred')!({ incidentId: 'i1', incidentTitle: 'Cháy', toStationId: 's2', toStationName: 'Trạm 2', reason: 'Gần hơn' }));
    expect(result.current.incidents.some((i) => i.id === 'i1')).toBe(false);
    expect(result.current.operatorAlerts[0]).toMatchObject({ kind: 'transferred', incidentId: 'i1' });

    act(() => hubHandlers.get('ReceiveOutOfAreaAlert')!({ incidentId: 'i3', incidentTitle: 'X', locationAddress: 'Y', distanceOutsideAreaKm: 1.25 }));
    expect(result.current.operatorAlerts[0]).toMatchObject({ kind: 'out_of_area', incidentId: 'i3' });
    act(() => result.current.dismissOperatorAlert(result.current.operatorAlerts[0].id));
    expect(result.current.operatorAlerts).toHaveLength(1);
  });

  it('chuyển trạm tới mình → ghi chú chuyển trạm cho tin báo mới', async () => {
    const { result } = await renderStore();
    act(() => hubHandlers.get('ReceiveIncidentTransferred')!({ incidentId: 'n2', incidentTitle: 'Cháy', toStationId: 's1', fromStationName: 'Trạm 3', reason: 'Quá tải' }));
    expect(result.current.incomingTransferNotes.get('n2')).toMatchObject({ fromStationName: 'Trạm 3', reason: 'Quá tải' });
  });

  it('đội từ chối → thông báo phản hồi, đóng được', async () => {
    const { result } = await renderStore();
    act(() =>
      hubHandlers.get('ReceiveAssignmentStatus')!(
        assignment({ id: 'r1', status: 'Rejected', rejectionReason: 'TooFar', rejectionNotes: 'kẹt cầu', rescueUnit: { plateNumber: '51A-2' } as never }),
      ),
    );
    const notice = result.current.incidents.find((i) => i.id === 'i2')!.responseNotices[0];
    expect(notice).toMatchObject({ id: 'r1', kind: 'rejected', plate: '51A-2', reason: 'Quá xa vùng tiếp cận — kẹt cầu' });
    act(() => result.current.dismissResponseNotice('i2', 'r1'));
    expect(result.current.incidents.find((i) => i.id === 'i2')!.responseNotices).toEqual([]);
  });

  it('ForceLogout → dừng hub và đăng xuất', async () => {
    await renderStore();
    act(() => hubHandlers.get('ForceLogout')!({ reason: 'Tài khoản bị khóa' }));
    expect(incidentHubService.stop).toHaveBeenCalled();
    expect(logout).toHaveBeenCalledWith('/login');
  });
});
