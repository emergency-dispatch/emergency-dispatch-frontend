import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchIncidentList } from '@/components/operator/livemap/DispatchIncidentList';
import { useTeamByVehicle } from '@/hooks/useStationTeams';
import { makeDispatchStore, mockStore } from '../../../setup/dispatchStore';
import { makeIncident } from '../../../setup/fixtures';
import { t } from '../../../setup/render';
import type { Vehicle } from '@/types/vehicle';

vi.mock('@/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }));
vi.mock('@/hooks/useStationTeams', () => ({ useTeamByVehicle: vi.fn() }));

const v = (o: Partial<Vehicle>): Vehicle =>
  ({ id: 'v', plate: 'X', type: 'fire_truck', unitType: 'FireTruck', status: 'en_route', stationId: 'st-1', stationName: 'Trạm 1', incidentId: 'i1', assignmentId: 'as', etaMinutes: 4, lat: 0, lng: 0, ...o }) as Vehicle;

const props = () => ({
  selectedIncidentId: null as string | null,
  onSelectIncident: vi.fn(),
  panelError: null as string | null,
  onClearError: vi.fn(),
  cancellingVehicleId: null,
  cancellingIncidentId: null,
  onCancelVehicle: vi.fn(),
  onCancelIncident: vi.fn(),
  onDismissNotice: vi.fn(),
});

beforeEach(() => {
  vi.mocked(useTeamByVehicle).mockReturnValue(
    new Map([['v1', { id: 't', stationId: 'st-1', name: 'Tổ Alpha', vehicleIds: ['v1'], vehiclePlates: ['51A-1'], members: [{ staffId: 'a', crewRole: 'commander', fullName: 'Tuấn' }, { staffId: 'b', crewRole: 'driver' }] }]]),
  );
  mockStore.current = makeDispatchStore({
    vehicles: [v({ id: 'v1', plate: '51A-1' }), v({ id: 'v2', plate: '51A-2', status: 'on_scene' }), v({ id: 'v3', plate: '51A-3', incidentId: null, assignmentId: null })],
    incidents: [
      makeIncident({ id: 'i1', title: 'Cháy xưởng', status: 'approved', severity: 3, assignedVehicleIds: ['v1', 'v2'], isOutOfServiceArea: true }),
      makeIncident({ id: 'i2', title: 'Va chạm nhẹ', status: 'approved', severity: 1, category: 'accident' }),
      makeIncident({ id: 'i3', title: 'Đã xong', status: 'completed', assignedVehicleIds: ['v3'], reportedVehicleIds: ['v3'] }),
      makeIncident({ id: 'i4', title: 'Chờ duyệt', status: 'pending' }),
    ],
    escalatedIncidentIds: new Set(['i1']),
    escalationTiers: new Map([['i1', 2]]),
  });
});

const card = (title: string) => screen.getByText(title).closest('button')!.parentElement!;

describe('DispatchIncidentList', () => {
  it('chỉ sự cố đã duyệt / hoàn tất; đang mở trước, cấp cao trước', () => {
    render(<DispatchIncidentList {...props()} />);
    const titles = ['Cháy xưởng', 'Va chạm nhẹ', 'Đã xong'].map((x) => screen.getByText(x));
    expect(titles[0].compareDocumentPosition(titles[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(titles[1].compareDocumentPosition(titles[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Chờ duyệt')).not.toBeInTheDocument();
  });

  it('nhãn leo thang cấp 2, ngoài vùng, số xe đã giao', () => {
    render(<DispatchIncidentList {...props()} />);
    const c = card('Cháy xưởng');
    expect(c).toHaveTextContent(t('liveMap.incidentList.escalatedTier2'));
    expect(c).toHaveTextContent(t('liveMap.incidentList.outOfArea'));
    expect(c).toHaveTextContent(t('liveMap.incidentList.assignedTeams', { active: 2, max: 5 }));
    expect(c).toHaveTextContent('Tổ Alpha');
    expect(c).toHaveTextContent(t('liveMap.incidentList.vehicleNoTeam'));
    expect(within(card('Va chạm nhẹ')).getByText(t('liveMap.incidentList.noTeamAssigned'))).toBeInTheDocument();
    expect(card('Đã xong')).toHaveTextContent(t('liveMap.incidentList.closed', { count: 1 }));
  });

  it('chọn / bỏ chọn sự cố', async () => {
    const p = props();
    const { rerender } = render(<DispatchIncidentList {...p} />);
    await userEvent.click(screen.getByText('Va chạm nhẹ'));
    expect(p.onSelectIncident).toHaveBeenCalledWith('i2');
    rerender(<DispatchIncidentList {...p} selectedIncidentId="i2" />);
    await userEvent.click(screen.getByText('Va chạm nhẹ'));
    expect(p.onSelectIncident).toHaveBeenLastCalledWith(null);
  });

  it('thu hồi xe chưa tới hiện trường', async () => {
    const p = props();
    render(<DispatchIncidentList {...p} />);
    const recall = within(card('Cháy xưởng')).getAllByTitle(t('liveMap.incidentList.recallTitle'));
    expect(recall).toHaveLength(1); // xe tại hiện trường không thu hồi được
    await userEvent.click(recall[0]);
    expect(p.onCancelVehicle).toHaveBeenCalledWith('v1');
  });

  it('hủy sự cố có chọn lý do', async () => {
    const p = props();
    render(<DispatchIncidentList {...p} />);
    await userEvent.click(within(card('Va chạm nhẹ')).getByTitle(t('liveMap.incidentList.cancelIncidentTitle')));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: t('liveMap.incidentList.cancelReason') }), 'Duplicate');
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.incidentList.confirm') }));
    expect(p.onCancelIncident).toHaveBeenCalledWith('i2', 'Duplicate');
  });

  it('thông báo đội từ chối + lỗi panel', async () => {
    mockStore.current = {
      ...mockStore.current,
      incidents: [makeIncident({ id: 'i9', title: 'Có phản hồi', status: 'approved', responseNotices: [{ id: 'n1', vehicleId: 'v1', plate: '51A-1', kind: 'rejected', reason: '', at: '' }] })],
    };
    const p = props();
    render(<DispatchIncidentList {...p} panelError="Không giao được xe" />);
    expect(screen.getByText(t('liveMap.incidentList.noticeRejected'), { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByText('51A-1').parentElement!.nextElementSibling as HTMLElement);
    expect(p.onDismissNotice).toHaveBeenCalledWith('i9', 'n1');
    expect(screen.getByText('Không giao được xe')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.incidentList.dismissError') }));
    expect(p.onClearError).toHaveBeenCalled();
  });

  it('danh sách trống', () => {
    mockStore.current = makeDispatchStore();
    render(<DispatchIncidentList {...props()} />);
    expect(screen.getByText(t('liveMap.incidentList.empty'))).toBeInTheDocument();
  });
});
