import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VehiclesPage from '@/pages/admin/VehiclesPage';
import { vehicleAdminService } from '@/services/admin/vehicleAdminService';
import { stationAdminService } from '@/services/admin/stationAdminService';
import { incidentHubService } from '@/services/realtime/incidentHubService';
import { page, renderWithRouter, t } from '../../setup/render';
import type { RescueUnitResponseDto } from '@/types/rescueUnit';

vi.mock('@/services/admin/vehicleAdminService', async (orig) => ({
  ...(await orig<typeof import('@/services/admin/vehicleAdminService')>()),
  vehicleAdminService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/services/admin/stationAdminService', () => ({ stationAdminService: { list: vi.fn() } }));

const veh = vi.mocked(vehicleAdminService);

const unit = (o: Partial<RescueUnitResponseDto>): RescueUnitResponseDto => ({
  id: 'u',
  plateNumber: '51A',
  unitType: 'FireTruck',
  unitTypeName: '',
  status: 'Available',
  statusName: '',
  currentLat: 0,
  currentLng: 0,
  lastLocationUpdateAt: null,
  stationId: 's1',
  stationName: 'Trạm A',
  createdAt: '',
  updatedAt: null,
  ...o,
});

const handlers = new Map<string, () => void>();

beforeEach(() => {
  vi.clearAllMocks();
  handlers.clear();
  vi.spyOn(incidentHubService, 'on').mockImplementation(((e: string, cb: () => void) => {
    handlers.set(e, cb);
    return () => {};
  }) as typeof incidentHubService.on);
  vi.spyOn(incidentHubService, 'onReconnected').mockReturnValue(() => {});
  vi.spyOn(incidentHubService, 'start').mockResolvedValue(true);
  vi.spyOn(incidentHubService, 'stop').mockResolvedValue();
  vi.mocked(stationAdminService.list).mockResolvedValue(
    page([
      { id: 's1', name: 'Trạm A', isActive: true },
      { id: 's2', name: 'Trạm B', isActive: false },
    ]) as never,
  );
  veh.list.mockResolvedValue(
    page([
      unit({ id: 'a', plateNumber: '51A-001' }),
      unit({ id: 'b', plateNumber: '51A-002', status: 'OnScene' }),
      unit({ id: 'c', plateNumber: '51A-003', status: 'Maintenance', unitType: 'Ambulance' }),
    ]) as never,
  );
});

const row = (plate: string) => screen.getByText(plate).closest('tr')!;

describe('Admin VehiclesPage', () => {
  it('danh sách + bộ lọc từ URL + khóa thao tác theo trạng thái', async () => {
    renderWithRouter(<VehiclesPage />, '/admin/vehicles?status=on_mission&type=Ambulance&stationId=s1');
    await screen.findByText('51A-001');
    expect(veh.list).toHaveBeenCalledWith({ search: '', stationId: 's1', type: 'Ambulance', status: 'on_mission', pageIndex: 1, pageSize: 10 });
    expect(within(row('51A-002')).getByRole('button', { name: t('admin.vehicles.table.toMaintenance') })).toBeDisabled();
    expect(within(row('51A-002')).getByRole('button', { name: t('admin.vehicles.table.delete') })).toBeDisabled();
    expect(within(row('51A-003')).getByRole('button', { name: t('admin.vehicles.table.toAvailable') })).toBeEnabled();
    expect(incidentHubService.start).toHaveBeenCalled();
  });

  it('chuyển bảo trì → thông báo + tải lại', async () => {
    veh.setStatus.mockResolvedValue(unit({}));
    renderWithRouter(<VehiclesPage />);
    await screen.findByText('51A-001');
    await userEvent.click(within(row('51A-001')).getByRole('button', { name: t('admin.vehicles.table.toMaintenance') }));
    expect(veh.setStatus).toHaveBeenCalledWith('a', 'Maintenance');
    expect(await screen.findByRole('status')).toHaveTextContent(
      t('admin.vehicles.statusChanged', { plate: '51A-001', status: t('enums.unitStatus.Maintenance') }),
    );
    await waitFor(() => expect(veh.list).toHaveBeenCalledTimes(2));
  });

  it('đổi trạng thái lỗi → thông báo lỗi', async () => {
    veh.setStatus.mockRejectedValue(new Error('Đang có lượt phân công'));
    renderWithRouter(<VehiclesPage />);
    await screen.findByText('51A-001');
    await userEvent.click(within(row('51A-003')).getByRole('button', { name: t('admin.vehicles.table.toAvailable') }));
    expect(veh.setStatus).toHaveBeenCalledWith('c', 'Available');
    expect(await screen.findByRole('alert')).toHaveTextContent('Đang có lượt phân công');
  });

  it('xóa xe', async () => {
    veh.remove.mockResolvedValue();
    renderWithRouter(<VehiclesPage />);
    await screen.findByText('51A-001');
    await userEvent.click(within(row('51A-001')).getByRole('button', { name: t('admin.vehicles.table.delete') }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('admin.vehicles.deleteDialog.confirm') }));
    expect(veh.remove).toHaveBeenCalledWith('a');
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.vehicles.deleted', { plate: '51A-001' }));
  });

  it('thêm xe: mặc định trạm đầu tiên, chọn loại', async () => {
    veh.create.mockResolvedValue(unit({ plateNumber: '51B-999' }));
    renderWithRouter(<VehiclesPage />);
    await screen.findByText('51A-001');
    await userEvent.click(screen.getByRole('button', { name: t('admin.vehicles.add') }));
    const drawer = screen.getByRole('heading', { name: t('admin.vehicles.form.addTitle') }).closest('aside')!;
    const save = within(drawer).getByRole('button', { name: t('admin.vehicles.form.save') });
    expect(save).toBeDisabled();
    await userEvent.type(within(drawer).getByPlaceholderText(t('admin.vehicles.form.platePlaceholder')), '  51B-999 ');
    await userEvent.click(within(drawer).getByText(t('enums.unitType.Ambulance')));
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);
    expect(veh.create).toHaveBeenCalledWith({ plateNumber: '51B-999', unitType: 'Ambulance', stationId: 's1', status: undefined });
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.vehicles.added', { plate: '51B-999' }));
  });

  it('sửa xe đang làm nhiệm vụ: khóa trạm và trạng thái', async () => {
    veh.update.mockResolvedValue(unit({ plateNumber: '51A-002' }));
    renderWithRouter(<VehiclesPage />);
    await screen.findByText('51A-002');
    await userEvent.click(within(row('51A-002')).getByRole('button', { name: t('admin.vehicles.table.edit') }));
    const drawer = screen.getByRole('heading', { name: t('admin.vehicles.form.editTitle', { plate: '51A-002' }) }).closest('aside')!;
    const [stationSelect, statusSelect] = within(drawer).getAllByRole('combobox');
    expect(stationSelect).toBeDisabled();
    expect(statusSelect).toBeDisabled();
    expect(within(drawer).getByText(t('admin.vehicles.form.stationLockedOnMission'))).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole('button', { name: t('admin.vehicles.form.save') }));
    expect(veh.update).toHaveBeenCalledWith('b', { plateNumber: '51A-002', unitType: 'FireTruck', stationId: 's1', status: undefined });
  });

  it('sửa xe rảnh: đổi trạng thái → chỉ gửi khi khác', async () => {
    veh.update.mockResolvedValue(unit({ plateNumber: '51A-001' }));
    renderWithRouter(<VehiclesPage />);
    await screen.findByText('51A-001');
    await userEvent.click(within(row('51A-001')).getByRole('button', { name: t('admin.vehicles.table.edit') }));
    const drawer = screen.getByRole('heading', { name: t('admin.vehicles.form.editTitle', { plate: '51A-001' }) }).closest('aside')!;
    const statusSelect = within(drawer).getAllByRole('combobox')[1];
    await userEvent.selectOptions(statusSelect, 'OutOfService');
    await userEvent.click(within(drawer).getByRole('button', { name: t('admin.vehicles.form.save') }));
    expect(veh.update).toHaveBeenCalledWith('a', expect.objectContaining({ status: 'OutOfService' }));
  });

  it('sự kiện realtime đổi trạng thái xe → tải lại (gom trong 500ms)', async () => {
    renderWithRouter(<VehiclesPage />);
    await screen.findByText('51A-001');
    vi.useFakeTimers();
    act(() => {
      handlers.get('ReceiveRescueUnitStatus')!();
      handlers.get('ReceiveRescueUnitStatus')!();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    vi.useRealTimers();
    await waitFor(() => expect(veh.list).toHaveBeenCalledTimes(2));
  });
});
