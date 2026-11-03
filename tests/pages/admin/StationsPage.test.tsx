import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StationsPage from '@/pages/admin/StationsPage';
import { stationAdminService } from '@/services/admin/stationAdminService';
import { accountAdminService } from '@/services/admin/accountAdminService';
import { searchAddress } from '@/services/admin/geocodeService';
import { mapboxService } from '@/services/mapboxService';
import { FakeMap } from '../../setup/mapboxGlMock';
import { page, renderWithRouter, t } from '../../setup/render';
import type { StationResponseDto } from '@/types/station';

vi.mock('@/services/admin/stationAdminService', async (orig) => ({
  ...(await orig<typeof import('@/services/admin/stationAdminService')>()),
  stationAdminService: { list: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/services/admin/accountAdminService', () => ({ accountAdminService: { listAccounts: vi.fn() } }));
vi.mock('@/services/admin/geocodeService', () => ({ searchAddress: vi.fn() }));
vi.mock('@/services/mapboxService', async (orig) => ({
  ...(await orig<typeof import('@/services/mapboxService')>()),
  mapboxService: { reverseGeocode: vi.fn() },
}));

const st = vi.mocked(stationAdminService);

const station = (o: Partial<StationResponseDto> = {}): StationResponseDto => ({
  id: 's1',
  name: 'Trạm Thủ Đức',
  address: 'Đường D1',
  latitude: 10.84,
  longitude: 106.8,
  phoneNumber: '114',
  isActive: true,
  coverageRadiusKm: 10,
  headOperatorId: 'op1',
  headOperatorName: 'Chị Lan',
  headOperatorPhone: '0981234567',
  activeUnitsCount: 2,
  totalUnitsCount: 3,
  staffCount: 5,
  rescueUnits: [],
  staffMembers: [],
  createdAt: '',
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  FakeMap.instances.length = 0;
  st.list.mockResolvedValue(page([station(), station({ id: 's2', name: 'Trạm Cũ', isActive: false, headOperatorId: null, headOperatorName: null })]) as never);
  vi.mocked(accountAdminService.listAccounts).mockResolvedValue(
    page([
      { id: 'op1', fullName: 'Chị Lan', email: 'lan@resq.vn' },
      { id: 'op2', fullName: 'Anh Minh', email: 'minh@resq.vn' },
    ]) as never,
  );
});

describe('StationsPage', () => {
  it('danh sách trạm với trạng thái và Operator phụ trách', async () => {
    renderWithRouter(<StationsPage />, '/admin/stations?status=active');
    expect(await screen.findByText('Trạm Thủ Đức')).toBeInTheDocument();
    expect(st.list).toHaveBeenCalledWith({ search: '', status: 'active', pageIndex: 1, pageSize: 10 });
    expect(screen.getAllByText('Chị Lan').length).toBeGreaterThan(0);
    expect(screen.getByText(t('admin.stations.table.noHeadOperator'))).toBeInTheDocument();
    expect(within(screen.getByText('Trạm Cũ').closest('tr')!).getByText(t('admin.stations.table.inactive'))).toBeInTheDocument();
  });

  it('tạo trạm: kiểm tra hotline / bán kính, chọn địa chỉ gợi ý, chọn Operator', async () => {
    st.create.mockResolvedValue(station({ id: 'new', name: 'Trạm Mới' }));
    vi.mocked(searchAddress).mockResolvedValue([{ label: 'Lô E2a, Khu CNC', lat: 10.85, lng: 106.81 }]);
    renderWithRouter(<StationsPage />);
    await screen.findByText('Trạm Thủ Đức');
    await userEvent.click(screen.getByRole('button', { name: t('admin.stations.add') }));
    const drawer = screen.getByRole('heading', { name: t('admin.stations.form.addTitle') }).closest('aside')!;
    const save = within(drawer).getByRole('button', { name: t('admin.stations.form.save') });
    expect(save).toBeDisabled();

    const [nameInput, addressInput] = within(drawer).getAllByRole('textbox');
    await userEvent.type(nameInput, 'Trạm Mới');
    await userEvent.type(addressInput, 'Lô E2a');
    const suggestion = await within(drawer).findByText('Lô E2a, Khu CNC');
    fireEvent.mouseDown(suggestion.closest('button')!);

    const hotline = drawer.querySelector('input[inputmode=tel]') as HTMLInputElement;
    await userEvent.type(hotline, '11');
    expect(within(drawer).getByText(t('admin.stations.form.hotlineInvalid'))).toBeInTheDocument();
    await userEvent.type(hotline, '4');

    const radius = drawer.querySelector('input[type=number]') as HTMLInputElement;
    await userEvent.clear(radius);
    await userEvent.type(radius, '99');
    expect(save).toBeDisabled();
    await userEvent.clear(radius);
    await userEvent.type(radius, '12');

    // Operator đã phụ trách trạm khác (op1 – Trạm Thủ Đức) không có trong danh sách
    const headSelect = within(drawer).getAllByRole('combobox')[0];
    await waitFor(() => expect(within(headSelect).getByRole('option', { name: /Anh Minh/ })).toBeInTheDocument());
    expect(within(headSelect).queryByRole('option', { name: /Chị Lan/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(headSelect, 'op2');

    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(st.create).toHaveBeenCalledWith({
      name: 'Trạm Mới',
      address: 'Lô E2a, Khu CNC',
      latitude: 10.85,
      longitude: 106.81,
      phoneNumber: '114',
      isActive: true,
      coverageRadiusKm: 12,
      headOperatorId: 'op2',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.stations.added', { name: 'Trạm Mới' }));
  });

  it('bấm bản đồ → tra địa chỉ; không tìm thấy thì giữ địa chỉ cũ', async () => {
    vi.mocked(mapboxService.reverseGeocode).mockResolvedValueOnce('Số 1 Võ Văn Ngân').mockResolvedValueOnce('Tọa độ (1, 2)');
    renderWithRouter(<StationsPage />);
    const row = (await screen.findByText('Trạm Thủ Đức')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: t('admin.stations.table.edit') }));
    const drawer = screen.getByRole('heading', { name: t('admin.stations.form.editTitle') }).closest('aside')!;
    const map = FakeMap.instances[FakeMap.instances.length - 1];
    await act(async () => map.fire('click', { lngLat: { lat: 10.9, lng: 106.9 } }));
    expect(mapboxService.reverseGeocode).toHaveBeenCalledWith(106.9, 10.9);
    expect(within(drawer).getByDisplayValue('Số 1 Võ Văn Ngân')).toBeInTheDocument();
    expect(within(drawer).getByText('10.90000, 106.90000')).toBeInTheDocument();
    await act(async () => map.fire('click', { lngLat: { lat: 1, lng: 2 } }));
    expect(within(drawer).getByText(t('admin.stations.form.addressNotFound'))).toBeInTheDocument();
    expect(within(drawer).getByDisplayValue('Số 1 Võ Văn Ngân')).toBeInTheDocument();
  });

  it('sửa trạm → update', async () => {
    st.update.mockResolvedValue(station());
    renderWithRouter(<StationsPage />);
    const row = (await screen.findByText('Trạm Thủ Đức')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: t('admin.stations.table.edit') }));
    await userEvent.click(screen.getByRole('button', { name: t('admin.stations.form.save') }));
    expect(st.update).toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'Trạm Thủ Đức', headOperatorId: 'op1', coverageRadiusKm: 10 }));
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.stations.updated', { name: 'Trạm Thủ Đức' }));
  });

  it('xóa trạm còn xe đang làm nhiệm vụ → chặn', async () => {
    st.getById.mockResolvedValue(station({ rescueUnits: [{ id: 'u', plateNumber: '51A-9', status: 'OnScene' }] as never }));
    renderWithRouter(<StationsPage />);
    const row = (await screen.findByText('Trạm Thủ Đức')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: t('admin.stations.table.delete') }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText(t('admin.stations.deleteDialog.busy', { count: 1, plates: '51A-9' }))).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: t('admin.stations.deleteDialog.confirm') })).toBeDisabled();
  });

  it('xóa trạm → thông báo kèm số xe / nhân sự bị ảnh hưởng', async () => {
    st.getById.mockResolvedValue(
      station({ rescueUnits: [{ id: 'u', plateNumber: '51A-1', status: 'Available', statusName: 'Sẵn sàng' }] as never, staffMembers: [{ id: 'x' }, { id: 'y' }] as never }),
    );
    st.remove.mockResolvedValue();
    renderWithRouter(<StationsPage />);
    const row = (await screen.findByText('Trạm Thủ Đức')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: t('admin.stations.table.delete') }));
    const dialog = screen.getByRole('dialog');
    await within(dialog).findByText('51A-1');
    await userEvent.click(within(dialog).getByRole('button', { name: t('admin.stations.deleteDialog.confirm') }));
    expect(st.remove).toHaveBeenCalledWith('s1');
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(t('admin.stations.deleted', { name: 'Trạm Thủ Đức' }));
    expect(status).toHaveTextContent(t('admin.stations.deletedUnits', { count: 1 }));
    expect(status).toHaveTextContent(t('admin.stations.deletedStaff', { count: 2 }));
  });

  it('xóa trạm trống', async () => {
    st.getById.mockResolvedValue(station());
    renderWithRouter(<StationsPage />);
    const row = (await screen.findByText('Trạm Thủ Đức')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: t('admin.stations.table.delete') }));
    expect(await screen.findByText(t('admin.stations.deleteDialog.empty'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('common.cancel') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
