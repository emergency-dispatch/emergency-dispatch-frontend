import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VehiclesPage } from '@/pages/operator/VehiclesPage';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { liveMapService } from '@/services/liveMapService';
import { useTeamByVehicle } from '@/hooks/useStationTeams';
import { makeDispatchStore, mockStore } from '../../setup/dispatchStore';
import { makeIncident } from '../../setup/fixtures';
import { t } from '../../setup/render';
import type { Vehicle } from '@/types/vehicle';

vi.mock('@/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }));
vi.mock('@/hooks/useStationTeams', () => ({ useTeamByVehicle: vi.fn() }));
vi.mock('@/services/liveMapService', async (orig) => ({
  ...(await orig<typeof import('@/services/liveMapService')>()),
  liveMapService: { getRescueUnit: vi.fn() },
}));

const v = (o: Partial<Vehicle>): Vehicle =>
  ({ id: 'v', plate: 'X', type: 'fire_truck', unitType: 'FireTruck', status: 'available', unitStatus: 'Available', stationId: 'st-1', stationName: 'Trạm 1', incidentId: null, assignmentId: null, lat: 0, lng: 0, ...o }) as Vehicle;

const vehicles = [
  v({ id: 'a', plate: '51A-001' }),
  v({ id: 'b', plate: '51A-002', status: 'en_route', unitStatus: 'Dispatched', incidentId: 'inc-1', assignmentId: 'as' }),
  v({ id: 'c', plate: '51A-003', status: 'unavailable', unitStatus: 'Maintenance' }),
  v({ id: 'd', plate: '51A-004', unitType: 'LadderTruck', status: 'recovering', unitStatus: 'CoolDown' }),
  v({ id: 'e', plate: '51A-005', status: 'unavailable', unitStatus: 'OutOfService' }),
  v({ id: 'z', plate: '99Z-999', stationId: 'st-2' }),
];

function Probe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + JSON.stringify(loc.state ?? null)}</div>;
}

const renderPage = (stationId: string | null = 'st-1') =>
  render(
    <AuthContext.Provider value={{ user: { id: 'op1', stationId, stationName: 'Trạm 1' }, refreshProfile: vi.fn() } as unknown as AuthContextType}>
      <MemoryRouter initialEntries={['/dashboard/command-center/vehicles']}>
        <Routes>
          <Route path="/dashboard/command-center/vehicles" element={<VehiclesPage />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

const row = (plate: string) => screen.getByText(plate).closest('tr')!;

beforeEach(() => {
  vi.clearAllMocks();
  mockStore.current = makeDispatchStore({ vehicles, incidents: [makeIncident({ id: 'inc-1', title: 'Cháy xưởng', status: 'approved' })] });
  vi.mocked(useTeamByVehicle).mockReturnValue(
    new Map([['a', { id: 't1', stationId: 'st-1', name: 'Tổ Alpha', vehicleIds: ['a'], vehiclePlates: ['51A-1'], members: [{ staffId: 'x', crewRole: 'commander', fullName: 'Tuấn' }] }]]),
  );
  vi.mocked(liveMapService.getRescueUnit).mockResolvedValue({ unitType: 'LadderTruck' } as never);
});

describe('Operator VehiclesPage', () => {
  it('chưa có trạm → hướng dẫn', () => {
    renderPage(null);
    expect(screen.getByText(t('vehicles.page.noStation'))).toBeInTheDocument();
  });

  it('chỉ xe trạm mình; tổ phụ trách; nhiệm vụ đang chạy', async () => {
    renderPage();
    expect(screen.queryByText('99Z-999')).not.toBeInTheDocument();
    expect(within(row('51A-001')).getByText('Tổ Alpha')).toBeInTheDocument();
    expect(within(row('51A-003')).getByText(t('vehicles.page.noTeam'))).toBeInTheDocument();
    await userEvent.click(within(row('51A-002')).getByText('Cháy xưởng'));
    expect(screen.getByTestId('loc')).toHaveTextContent('/dashboard/command-center/live-map{"focusIncidentId":"inc-1"}');
  });

  it('hiện đúng loại xe gốc: xe thang không bị ghi thành xe chữa cháy', () => {
    renderPage();
    expect(within(row('51A-004')).getByText(t('enums.unitType.LadderTruck'), { exact: false })).toBeInTheDocument();
    expect(within(row('51A-004')).queryByText(t('enums.unitType.FireTruck'), { exact: false })).not.toBeInTheDocument();
    // Chức năng vẫn theo nhóm: xe thang thuộc nhóm chữa cháy
    expect(within(row('51A-004')).getByText(t('enums.teamFunction.fire_truck'), { exact: false })).toBeInTheDocument();
    expect(within(row('51A-001')).getByText(t('enums.unitType.FireTruck'), { exact: false })).toBeInTheDocument();
  });

  it('bộ lọc trạng thái + tìm kiếm', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t('vehicles.filters.on_mission')) }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t('vehicles.filters.no_team')) }));
    expect(screen.queryByText('51A-001')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t('vehicles.filters.all')) }));
    await userEvent.type(screen.getByPlaceholderText(t('vehicles.page.search')), 'alpha');
    expect(screen.getByText('51A-001')).toBeInTheDocument();
    expect(screen.queryByText('51A-003')).not.toBeInTheDocument();
    await userEvent.clear(screen.getByPlaceholderText(t('vehicles.page.search')));
    await userEvent.type(screen.getByPlaceholderText(t('vehicles.page.search')), 'zzz');
    expect(screen.getByText(t('vehicles.page.noMatch'))).toBeInTheDocument();
  });

  it('nút đổi trạng thái theo tình trạng xe', () => {
    renderPage();
    expect(within(row('51A-001')).getByRole('button', { name: t('vehicles.page.setMaintenance') })).toBeEnabled();
    expect(within(row('51A-003')).getByRole('button', { name: t('vehicles.page.setAvailable') })).toBeEnabled();
    for (const plate of ['51A-002', '51A-004', '51A-005']) {
      expect(within(row(plate)).getByRole('button', { name: t('vehicles.page.setMaintenance') })).toBeDisabled();
    }
  });

  it('đặt bảo trì có xác nhận', async () => {
    renderPage();
    await userEvent.click(within(row('51A-001')).getByRole('button', { name: t('vehicles.page.setMaintenance') }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getAllByRole('button').slice(-1)[0]!);
    expect(mockStore.current.setVehicleStatus).toHaveBeenCalledWith('a', 'Maintenance');
    expect(await screen.findByRole('status')).toHaveTextContent(t('vehicles.page.setMaintenanceDone', { plate: '51A-001' }));
  });

  it('đổi trạng thái thất bại', async () => {
    vi.mocked(mockStore.current.setVehicleStatus).mockResolvedValue({ ok: false, message: 'Có lượt phân công' });
    renderPage();
    await userEvent.click(within(row('51A-003')).getByRole('button', { name: t('vehicles.page.setAvailable') }));
    await userEvent.click(within(screen.getByRole('dialog')).getAllByRole('button').slice(-1)[0]!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Có lượt phân công');
  });

  it('thêm xe (không có xe tuần tra) → thông báo', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: t('vehicles.page.add') }));
    const drawer = screen.getByRole('heading', { name: t('vehicles.form.createTitle') }).closest('aside')!;
    expect(within(drawer).queryByText(t('enums.unitType.PolicePatrol'))).not.toBeInTheDocument();
    await userEvent.type(within(drawer).getByPlaceholderText(t('vehicles.form.platePlaceholder')), '51c-777');
    await userEvent.click(within(drawer).getByRole('button', { name: t('vehicles.form.save') }));
    expect(mockStore.current.saveVehicle).toHaveBeenCalledWith({ plateNumber: '51c-777', unitType: 'FireTruck', stationId: 'st-1' }, undefined);
    expect(await screen.findByRole('status')).toHaveTextContent(t('vehicles.page.created', { plate: '51C-777' }));
  });

  it('sửa xe: đọc chủng loại gốc; biển số trùng hiện dưới ô', async () => {
    vi.mocked(mockStore.current.saveVehicle).mockResolvedValue({ ok: false, message: "Biển số '51A-001' đã tồn tại" });
    renderPage();
    await userEvent.click(within(row('51A-001')).getByRole('button', { name: t('vehicles.page.editLabel', { plate: '51A-001' }) }));
    const drawer = screen.getByRole('heading', { name: t('vehicles.form.editTitle', { plate: '51A-001' }) }).closest('aside')!;
    await waitFor(() => expect(liveMapService.getRescueUnit).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(within(drawer).getByRole('button', { name: t('vehicles.form.save') })).toBeEnabled());
    await userEvent.click(within(drawer).getByRole('button', { name: t('vehicles.form.save') }));
    expect(mockStore.current.saveVehicle).toHaveBeenCalledWith({ plateNumber: '51A-001', unitType: 'LadderTruck', stationId: 'st-1' }, 'a');
    expect(await within(drawer).findByText(t('vehicles.form.plateDuplicate', { plate: '51A-001' }))).toBeInTheDocument();
  });

  it('biển số trống → báo lỗi khi bấm lưu', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: t('vehicles.page.add') }));
    const drawer = screen.getByRole('heading', { name: t('vehicles.form.createTitle') }).closest('aside')!;
    const plate = within(drawer).getByPlaceholderText(t('vehicles.form.platePlaceholder'));
    await userEvent.type(plate, ' ');
    expect(within(drawer).getByRole('button', { name: t('vehicles.form.save') })).toBeDisabled();
  });
});
