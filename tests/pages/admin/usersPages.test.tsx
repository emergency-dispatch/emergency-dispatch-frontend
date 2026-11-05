import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountsPage from '@/pages/admin/AccountsPage';
import CitizensPage from '@/pages/admin/CitizensPage';
import { accountAdminService } from '@/services/admin/accountAdminService';
import { citizenAdminService } from '@/services/admin/citizenAdminService';
import { stationAdminService } from '@/services/admin/stationAdminService';
import { UserRole, UserStatus, type UserResponseDto } from '@/types/auth';
import { page, renderWithRouter, t } from '../../setup/render';

vi.mock('@/services/admin/accountAdminService', () => ({
  accountAdminService: { listAccounts: vi.fn(), create: vi.fn(), update: vi.fn(), lock: vi.fn(), unlock: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/services/admin/citizenAdminService', () => ({ citizenAdminService: { list: vi.fn() } }));
vi.mock('@/services/admin/stationAdminService', () => ({ stationAdminService: { list: vi.fn(), assignStaff: vi.fn() } }));

const acc = vi.mocked(accountAdminService);

const user = (o: Partial<UserResponseDto>): UserResponseDto =>
  ({ email: `${o.id}@resq.vn`, isEmailVerified: true, createdAt: '2026-01-15T00:00:00Z', status: UserStatus.Active, ...o }) as UserResponseDto;

const operator = user({ id: 'op', fullName: 'Lan Operator', role: UserRole.Operator, phoneNumber: '0981234567', stationName: 'Trạm A' });
const rescuer = user({ id: 'rs', fullName: 'Hùng Cứu Hộ', role: UserRole.RescueStaff, status: UserStatus.Suspended, isEmailVerified: false });

beforeEach(() => {
  vi.clearAllMocks();
  acc.listAccounts.mockResolvedValue(page([operator, rescuer], { totalCount: 12, totalPages: 2 }) as never);
});

describe('AccountsPage', () => {
  it('hiện danh sách, che SĐT, đọc bộ lọc ban đầu từ URL', async () => {
    renderWithRouter(<AccountsPage />, '/admin/accounts?role=RescueStaff&status=bad&search=hung');
    expect(await screen.findByText('Lan Operator')).toBeInTheDocument();
    expect(acc.listAccounts).toHaveBeenCalledWith({ search: 'hung', role: 'RescueStaff', status: undefined, pageIndex: 1, pageSize: 10 });
    expect(screen.getByText('098***567')).toBeInTheDocument();
    expect(screen.getByText(t('admin.users.unverified'))).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('nút theo vai trò / trạng thái: chỉ RescueStaff có điều chuyển, bị khóa thì có mở khóa', async () => {
    renderWithRouter(<AccountsPage />);
    const opRow = (await screen.findByText('Lan Operator')).closest('tr')!;
    const rsRow = screen.getByText('Hùng Cứu Hộ').closest('tr')!;
    expect(within(opRow).queryByRole('button', { name: t('admin.users.table.transfer') })).not.toBeInTheDocument();
    expect(within(opRow).getByRole('button', { name: t('admin.users.table.lock') })).toBeInTheDocument();
    expect(within(rsRow).getByRole('button', { name: t('admin.users.table.transfer') })).toBeInTheDocument();
    expect(within(rsRow).getByRole('button', { name: t('admin.users.table.unlock') })).toBeInTheDocument();
  });

  it('lọc theo vai trò → gọi lại từ trang 1; chuyển trang', async () => {
    renderWithRouter(<AccountsPage />);
    await screen.findByText('Lan Operator');
    await userEvent.click(screen.getByRole('button', { name: t('common.nextPage') }));
    await waitFor(() => expect(acc.listAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ pageIndex: 2 })));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: t('admin.users.accounts.filterByRole') }), 'Operator');
    await waitFor(() => expect(acc.listAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'Operator', pageIndex: 1 })));
  });

  it('khóa tài khoản → thông báo thành công và tải lại', async () => {
    acc.lock.mockResolvedValue(operator);
    renderWithRouter(<AccountsPage />);
    const row = (await screen.findByText('Lan Operator')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: t('admin.users.table.lock') }));
    await userEvent.type(screen.getByRole('dialog').querySelector('textarea')!, 'Vi phạm quy định');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('admin.users.action.lock.confirm') }));
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.users.done.lock', { name: 'Lan Operator' }));
    expect(acc.listAccounts).toHaveBeenCalledTimes(2);
  });

  it('mở drawer tạo mới và đóng', async () => {
    renderWithRouter(<AccountsPage />);
    await screen.findByText('Lan Operator');
    await userEvent.click(screen.getByRole('button', { name: t('admin.users.accounts.create') }));
    expect(screen.getByRole('heading', { name: t('admin.users.form.addTitle') })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('common.close') }));
    expect(screen.queryByRole('heading', { name: t('admin.users.form.addTitle') })).not.toBeInTheDocument();
  });

  it('sửa tài khoản → thông báo cập nhật', async () => {
    acc.update.mockResolvedValue({ ...operator, fullName: 'Lan Mới' });
    renderWithRouter(<AccountsPage />);
    const row = (await screen.findByText('Lan Operator')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: t('admin.users.table.edit') }));
    await userEvent.click(screen.getByRole('button', { name: t('admin.users.form.saveChanges') }));
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.users.accounts.updated', { name: 'Lan Mới' }));
  });

  it('điều chuyển trạm', async () => {
    vi.mocked(stationAdminService.list).mockResolvedValue(page([{ id: 's2', name: 'Trạm B', isActive: true }]) as never);
    vi.mocked(stationAdminService.assignStaff).mockResolvedValue();
    renderWithRouter(<AccountsPage />);
    const row = (await screen.findByText('Hùng Cứu Hộ')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: t('admin.users.table.transfer') }));
    const select = screen.getByRole('combobox', { name: t('admin.users.transfer.newStation') });
    await waitFor(() => expect(within(select).getByRole('option', { name: 'Trạm B' })).toBeInTheDocument());
    await userEvent.selectOptions(select, 's2');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('admin.users.transfer.confirm') }));
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.users.accounts.transferred', { name: 'Hùng Cứu Hộ', station: 'Trạm B' }));
  });

  it('lỗi tải danh sách', async () => {
    acc.listAccounts.mockRejectedValue(new Error('Mất kết nối'));
    renderWithRouter(<AccountsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    expect(screen.getByText(t('admin.users.table.empty'))).toBeInTheDocument();
  });
});

describe('CitizensPage', () => {
  it('danh sách người dân, mở khóa', async () => {
    vi.mocked(citizenAdminService.list).mockResolvedValue(
      page([user({ id: 'c1', fullName: 'Dân A', role: UserRole.Citizen, status: UserStatus.Suspended, phoneNumber: '0909123456' })]) as never,
    );
    acc.unlock.mockResolvedValue(operator);
    renderWithRouter(<CitizensPage />, '/admin/citizens?status=Suspended');
    expect(await screen.findByText('Dân A')).toBeInTheDocument();
    expect(citizenAdminService.list).toHaveBeenCalledWith({ search: '', status: 'Suspended', pageIndex: 1, pageSize: 10 });
    expect(screen.getByText('090***456')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('admin.users.citizens.unlock') }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('admin.users.action.unlock.confirm') }));
    expect(acc.unlock).toHaveBeenCalledWith('c1');
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.users.done.unlock', { name: 'Dân A' }));
  });

  it('lọc trạng thái', async () => {
    vi.mocked(citizenAdminService.list).mockResolvedValue(page([]) as never);
    renderWithRouter(<CitizensPage />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: t('admin.common.filterByStatus') }), 'Inactive');
    await waitFor(() => expect(citizenAdminService.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Inactive' })));
  });
});
