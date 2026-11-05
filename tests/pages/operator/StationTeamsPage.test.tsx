import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StationTeamsPage } from '@/pages/operator/StationTeamsPage';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { liveMapService } from '@/services/liveMapService';
import { stationTeamService } from '@/services/stationTeamService';
import { useStationTeams } from '@/hooks/useStationTeams';
import { makeDispatchStore, mockStore } from '../../setup/dispatchStore';
import { t } from '../../setup/render';
import type { StationStaff, StationTeam } from '@/types/stationTeam';
import type { Vehicle } from '@/types/vehicle';

vi.mock('@/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }));
vi.mock('@/hooks/useStationTeams', () => ({ useStationTeams: vi.fn() }));
vi.mock('@/services/liveMapService', async (orig) => ({
  ...(await orig<typeof import('@/services/liveMapService')>()),
  liveMapService: { getStation: vi.fn() },
}));
vi.mock('@/services/stationTeamService', () => ({
  stationTeamService: { loadStaff: vi.fn(), reloadStationTeams: vi.fn(), addStaff: vi.fn(), removeStaff: vi.fn(), deleteTeam: vi.fn(), saveTeam: vi.fn(), createStaff: vi.fn() },
}));

const svc = vi.mocked(stationTeamService);
const refreshProfile = vi.fn();

const staff = (o: Partial<StationStaff>): StationStaff => ({ id: 's', fullName: 'X', phoneNumber: '', isLocked: false, stationId: 'st-1', teamId: null, ...o });
const vehicle = (o: Partial<Vehicle>): Vehicle =>
  ({ id: 'v1', plate: '51A-1', type: 'fire_truck', status: 'available', stationId: 'st-1', ...o }) as Vehicle;

const staffList: StationStaff[] = [
  staff({ id: 'a', fullName: 'Anh Tuấn', teamId: 't1' }),
  staff({ id: 'b', fullName: 'Bình An', teamId: 't1' }),
  staff({ id: 'c', fullName: 'Chí Thanh' }),
  staff({ id: 'd', fullName: 'Dũng Rảnh', stationId: null }),
  staff({ id: 'e', fullName: 'Em Khóa', stationId: null, isLocked: true }),
];
const teams: StationTeam[] = [
  { id: 't1', stationId: 'st-1', name: 'Tổ Alpha', vehicleId: 'v1', members: [{ staffId: 'a', crewRole: 'commander' }, { staffId: 'b', crewRole: 'driver' }] },
];

const renderPage = (stationId: string | null = 'st-1') =>
  render(
    <AuthContext.Provider value={{ user: { id: 'op1', stationId }, refreshProfile } as unknown as AuthContextType}>
      <MemoryRouter>
        <StationTeamsPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockStore.current = makeDispatchStore({ vehicles: [vehicle({}), vehicle({ id: 'v2', plate: '51A-2', type: 'ambulance' })] });
  vi.mocked(useStationTeams).mockReturnValue({ staff: staffList, teams });
  vi.mocked(liveMapService.getStation).mockResolvedValue({ id: 'st-1', name: 'Trạm Thủ Đức', address: 'D1', phoneNumber: '114' } as never);
  svc.loadStaff.mockResolvedValue();
  svc.reloadStationTeams.mockResolvedValue();
});

describe('StationTeamsPage', () => {
  it('chưa có trạm → thông báo không phải trưởng trạm', async () => {
    renderPage(null);
    expect(await screen.findByText(t('teams.page.notHead'))).toBeInTheDocument();
    expect(refreshProfile).toHaveBeenCalled();
  });

  it('lỗi tải trạm', async () => {
    vi.mocked(liveMapService.getStation).mockRejectedValue(new Error('403 Forbidden'));
    renderPage();
    expect(await screen.findByText('403 Forbidden')).toBeInTheDocument();
  });

  it('hiện nhân sự, tổ, xe chưa có tổ', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Trạm Thủ Đức' })).toBeInTheDocument();
    expect(svc.reloadStationTeams).toHaveBeenCalledWith('st-1');
    expect(screen.getAllByText('Tổ Alpha').length).toBeGreaterThan(0);
    expect(screen.getByText(t('teams.page.vehiclesWithoutTeam'), { exact: false })).toHaveTextContent('51A-2');
    expect(screen.getAllByText('Chí Thanh').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dũng Rảnh')).not.toBeInTheDocument();
  });

  it('thêm nhân sự chưa thuộc trạm (bỏ người bị khóa)', async () => {
    svc.addStaff.mockResolvedValue();
    renderPage();
    await screen.findByRole('heading', { name: 'Trạm Thủ Đức' });
    await userEvent.click(screen.getByRole('button', { name: t('teams.staff.add') }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Dũng Rảnh')).toBeInTheDocument();
    expect(within(dialog).queryByText('Em Khóa')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('checkbox'));
    await userEvent.click(within(dialog).getByRole('button', { name: t('teams.addStaff.confirmCount', { count: 1 }) }));
    expect(svc.addStaff).toHaveBeenCalledWith('st-1', ['d']);
    expect(await screen.findByRole('status')).toHaveTextContent(t('teams.page.staffAdded', { count: 1 }));
  });

  it('gỡ nhân sự khỏi trạm', async () => {
    svc.removeStaff.mockResolvedValue();
    renderPage();
    await screen.findByRole('heading', { name: 'Trạm Thủ Đức' });
    await userEvent.click(screen.getByRole('button', { name: t('teams.staff.removeLabel', { name: 'Chí Thanh' }) }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('teams.page.removeConfirm') }));
    expect(svc.removeStaff).toHaveBeenCalledWith('st-1', 'c');
  });

  it('xe của tổ đang làm nhiệm vụ → khóa gỡ thành viên', async () => {
    mockStore.current = makeDispatchStore({ vehicles: [vehicle({ status: 'en_route' })] });
    renderPage();
    await screen.findByRole('heading', { name: 'Trạm Thủ Đức' });
    expect(screen.getByRole('button', { name: t('teams.staff.removeLabel', { name: 'Anh Tuấn' }) })).toBeDisabled();
  });

  it('xóa tổ lỗi → thông báo lỗi', async () => {
    svc.deleteTeam.mockRejectedValue(new Error('Tổ đang làm nhiệm vụ'));
    renderPage();
    await screen.findByRole('heading', { name: 'Trạm Thủ Đức' });
    await userEvent.click(screen.getByRole('button', { name: t('teams.card.deleteLabel', { name: 'Tổ Alpha' }) }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('teams.page.deleteConfirm') }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tổ đang làm nhiệm vụ');
  });

  it('tạo tổ: chọn xe, thành viên, tổ trưởng', async () => {
    svc.saveTeam.mockResolvedValue({ ...teams[0], id: 't2', name: 'Tổ 2' });
    renderPage();
    await screen.findByRole('heading', { name: 'Trạm Thủ Đức' });
    await userEvent.click(screen.getByRole('button', { name: t('teams.page.createTeam') }));
    const drawer = screen.getByRole('heading', { name: t('teams.form.createTitle') }).closest('aside')!;
    const vehicleSelect = within(drawer).getAllByRole('combobox')[0];
    // xe v1 đã có tổ Alpha → bị khóa
    expect(within(vehicleSelect).getByRole('option', { name: /51A-1/ })).toBeDisabled();
    await userEvent.selectOptions(vehicleSelect, 'v2');
    await userEvent.click(within(drawer).getByRole('checkbox', { name: /Chí Thanh/ }));
    await userEvent.selectOptions(within(drawer).getByRole('combobox', { name: t('teams.form.roleOf', { name: 'Chí Thanh' }) }), 'commander');
    await userEvent.click(within(drawer).getByRole('button', { name: t('teams.form.save') }));
    expect(svc.saveTeam).toHaveBeenCalledWith('st-1', { name: t('teams.form.defaultName', { index: 2 }), vehicleId: 'v2', members: [{ staffId: 'c', crewRole: 'commander' }] }, null);
    expect(await screen.findByRole('status')).toHaveTextContent(t('teams.page.teamCreated', { name: 'Tổ 2' }));
  });

  it('sửa tổ: 2 tổ trưởng → lỗi', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Trạm Thủ Đức' });
    await userEvent.click(screen.getByRole('button', { name: t('teams.card.editLabel', { name: 'Tổ Alpha' }) }));
    const drawer = screen.getByRole('heading', { name: t('teams.form.editTitle', { name: 'Tổ Alpha' }) }).closest('aside')!;
    await userEvent.selectOptions(within(drawer).getByRole('combobox', { name: t('teams.form.roleOf', { name: 'Bình An' }) }), 'commander');
    expect(within(drawer).getByRole('button', { name: t('teams.form.save') })).toBeDisabled();
  });

  it('tạo tài khoản cứu hộ: báo lỗi từng ô khi bấm tạo', async () => {
    svc.createStaff.mockResolvedValue({ id: 'n', fullName: 'Mới Toanh' } as never);
    renderPage();
    await screen.findByRole('heading', { name: 'Trạm Thủ Đức' });
    await userEvent.click(screen.getByRole('button', { name: t('teams.staff.create') }));
    const drawer = screen.getByRole('heading', { name: t('teams.createStaff.title') }).closest('aside')!;
    await userEvent.click(within(drawer).getByRole('button', { name: t('teams.createStaff.submit') }));
    expect(within(drawer).getByText(t('teams.createStaff.nameRequired'))).toBeInTheDocument();
    expect(within(drawer).getByText(t('teams.createStaff.emailRequired'))).toBeInTheDocument();
    expect(svc.createStaff).not.toHaveBeenCalled();

    const [name] = within(drawer).getAllByRole('textbox');
    await userEvent.type(name, 'Mới Toanh');
    await userEvent.type(drawer.querySelector('input[type=email]')!, 'MOI@resq.vn');
    await userEvent.type(drawer.querySelector('input[type=password]')!, '123456');
    await userEvent.click(within(drawer).getByRole('button', { name: t('teams.createStaff.submit') }));
    expect(svc.createStaff).toHaveBeenCalledWith({ fullName: 'Mới Toanh', email: 'moi@resq.vn', password: '123456', phoneNumber: '' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(t('teams.createStaff.created', { name: 'Mới Toanh' })));
  });
});
