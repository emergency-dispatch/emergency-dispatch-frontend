import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchRecommendPanel } from '@/components/operator/livemap/DispatchRecommendPanel';
import { useTeamByVehicle } from '@/hooks/useStationTeams';
import { dispatchService } from '@/services/dispatchService';
import { incidentService } from '@/services/incidentService';
import { makeDispatchStore, mockStore } from '../../../setup/dispatchStore';
import { makeIncident } from '../../../setup/fixtures';
import { t } from '../../../setup/render';
import type { RecommendedUnitResponseDto } from '@/types/dispatch';
import type { Vehicle } from '@/types/vehicle';

vi.mock('@/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }));
vi.mock('@/hooks/useStationTeams', () => ({ useTeamByVehicle: vi.fn() }));
vi.mock('@/services/dispatchService', () => ({ dispatchService: { getRecommendations: vi.fn() } }));
vi.mock('@/services/incidentService', () => ({ incidentService: { getAuditTrail: vi.fn() } }));

const rec = vi.mocked(dispatchService.getRecommendations);

const v = (o: Partial<Vehicle>): Vehicle =>
  ({ id: 'v', plate: 'X', type: 'fire_truck', unitType: 'FireTruck', status: 'available', stationId: 'st-1', stationName: 'Trạm 1', incidentId: null, assignmentId: null, lat: 0, lng: 0, ...o }) as Vehicle;

const unit = (o: Partial<RecommendedUnitResponseDto>): RecommendedUnitResponseDto =>
  ({ rescueUnitId: 'v1', stationName: 'Trạm 1', distanceKm: 2.04, roadDistanceKm: 2.6, estimatedEtaMinutes: 4.4, cost: 0.31, stationLoad: 0.25, searchRadiusKm: 10, radiusExpanded: false, ...o }) as RecommendedUnitResponseDto;

const team = (vehicleId: string, name: string) => ({ id: `t-${vehicleId}`, stationId: 'st-1', name, vehicleIds: [vehicleId], vehiclePlates: [vehicleId], members: [{ staffId: 'a', crewRole: 'commander' as const }, { staffId: 'b', crewRole: 'driver' as const }] });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useTeamByVehicle).mockReturnValue(new Map([['v1', team('v1', 'Tổ Alpha')], ['v4', team('v4', 'Tổ Delta')]]));
  vi.mocked(incidentService.getAuditTrail).mockResolvedValue({ items: [], totalCount: 0 } as never);
  mockStore.current = makeDispatchStore({
    vehicles: [v({ id: 'v1', plate: '51A-1' }), v({ id: 'v2', plate: '51A-2' }), v({ id: 'v3', plate: '99H-3', stationId: 'st-9', stationName: 'Trạm Bạn' }), v({ id: 'v4', plate: '51A-4' })],
    incidents: [
      makeIncident({ id: 'i1', title: 'Cháy xưởng', status: 'approved', severity: 3, source: 'PhoneCall' }),
      makeIncident({ id: 'i2', title: 'Va chạm', status: 'approved', severity: 1, assignedVehicleIds: ['vx'] }),
      makeIncident({ id: 'i3', title: 'Xong', status: 'completed' }),
    ],
    escalatedIncidentIds: new Set(['i1']),
  });
  rec.mockResolvedValue({
    success: true,
    message: '',
    data: [unit({}), unit({ rescueUnitId: 'v2' }), unit({ rescueUnitId: 'v3', isSupportUnit: true, stationName: 'Trạm Bạn', roadDistanceKm: null, searchRadiusKm: 20, radiusExpanded: true })],
  } as never);
});

describe('DispatchRecommendPanel', () => {
  it('chưa chọn sự cố → hướng dẫn, không gọi API', () => {
    render(<DispatchRecommendPanel selectedIncidentId={null} assigningVehicleId={null} onAssign={vi.fn()} />);
    expect(screen.getByText(t('liveMap.recommend.emptyLine1'), { exact: false })).toBeInTheDocument();
    expect(rec).not.toHaveBeenCalled();
    // tổ sẵn sàng để kéo thả vẫn hiện
    expect(screen.getByText(t('liveMap.recommend.readyTeams', { count: 2 }))).toBeInTheDocument();
  });

  it('gợi ý: chỉ xe có tổ hoặc xe hỗ trợ; quãng đường, ETA, ước lượng', async () => {
    render(<DispatchRecommendPanel selectedIncidentId="i1" assigningVehicleId={null} onAssign={vi.fn()} />);
    expect(rec).toHaveBeenCalledWith('i1', 'NearestAvailable');
    const assign = await screen.findAllByRole('button', { name: t('liveMap.recommend.assign') });
    expect(assign).toHaveLength(2);
    expect(screen.getByText(t('liveMap.recommend.withoutTeam', { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(t('liveMap.recommend.supportUnit', { station: 'Trạm Bạn' }))).toBeInTheDocument();
    expect(screen.getByText(t('liveMap.recommend.escalated'))).toBeInTheDocument();
    expect(screen.getByText(t('liveMap.recommend.radiusDoubled'))).toBeInTheDocument();
  });

  it('đổi thuật toán Load-Aware → tải lại và giao theo thuật toán', async () => {
    const onAssign = vi.fn();
    render(<DispatchRecommendPanel selectedIncidentId="i1" assigningVehicleId={null} onAssign={onAssign} />);
    await screen.findAllByRole('button', { name: t('liveMap.recommend.assign') });
    await userEvent.click(screen.getByRole('button', { name: t('enums.algorithm.load_aware.label') }));
    await waitFor(() => expect(rec).toHaveBeenLastCalledWith('i1', 'LoadAware'));
    const [first] = await screen.findAllByRole('button', { name: t('liveMap.recommend.assign') });
    await userEvent.click(first);
    expect(onAssign).toHaveBeenCalledWith('v1', 'load_aware', undefined);
  });

  it('Cấp 1 đã đủ xe → giao thêm cần lý do', async () => {
    const onAssign = vi.fn();
    render(<DispatchRecommendPanel selectedIncidentId="i2" assigningVehicleId={null} onAssign={onAssign} />);
    expect(screen.getByText(t('liveMap.recommend.maxReached', { max: 1 }))).toBeInTheDocument();
    expect(rec).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.recommend.addExtra') }));
    const [first] = await screen.findAllByRole('button', { name: t('liveMap.recommend.assign') });
    expect(first).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(t('liveMap.recommend.extraPlaceholder')), '  Cần thêm xe thang ');
    await userEvent.click(first);
    expect(onAssign).toHaveBeenCalledWith('v1', 'nearest', { allowExtraUnits: true, notes: 'Cần thêm xe thang' });
  });

  it('sự cố đã đóng; lỗi tải gợi ý', async () => {
    const { rerender } = render(<DispatchRecommendPanel selectedIncidentId="i3" assigningVehicleId={null} onAssign={vi.fn()} />);
    expect(screen.getByText(t('liveMap.recommend.incidentClosed'))).toBeInTheDocument();
    rec.mockRejectedValue(new Error('Máy chủ lỗi'));
    rerender(<DispatchRecommendPanel selectedIncidentId="i1" assigningVehicleId={null} onAssign={vi.fn()} />);
    expect(await screen.findByText('Máy chủ lỗi')).toBeInTheDocument();
  });

  it('lịch sử xử lý (dialog)', async () => {
    render(<DispatchRecommendPanel selectedIncidentId="i1" assigningVehicleId={null} onAssign={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.recommend.history') }));
    const dialog = screen.getByRole('dialog', { name: t('liveMap.recommend.historyDialog') });
    expect(await within(dialog).findByText(t('incidents.audit.empty'))).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: t('common.close') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('kéo tổ sẵn sàng đặt mã xe vào dataTransfer', () => {
    render(<DispatchRecommendPanel selectedIncidentId={null} assigningVehicleId={null} onAssign={vi.fn()} />);
    const item = screen.getByText('Tổ Delta').closest('[draggable=true]')!;
    const setData = vi.fn();
    fireEvent.dragStart(item, { dataTransfer: { setData, effectAllowed: '' } });
    expect(setData).toHaveBeenCalledWith('application/x-resq-vehicle-id', 'v4');
  });
});
