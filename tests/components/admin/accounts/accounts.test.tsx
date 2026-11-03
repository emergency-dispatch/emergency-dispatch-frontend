import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { AccountFormDrawer } from '@/components/admin/accounts/AccountFormDrawer';
import { AccountActionDialog } from '@/components/admin/accounts/AccountActionDialog';
import { TransferStationDialog } from '@/components/admin/accounts/TransferStationDialog';
import { accountAdminService } from '@/services/admin/accountAdminService';
import { stationAdminService } from '@/services/admin/stationAdminService';
import { UserRole, UserStatus, type UserResponseDto } from '@/types/auth';

vi.mock('@/services/admin/accountAdminService', () => ({
  accountAdminService: { create: vi.fn(), update: vi.fn(), lock: vi.fn(), unlock: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/services/admin/stationAdminService', () => ({
  stationAdminService: { list: vi.fn(), assignStaff: vi.fn() },
}));

const t = (key: string, opts?: Record<string, unknown>) => (i18n.t as unknown as (k: string, o?: object) => string)(key, opts);
const acc = vi.mocked(accountAdminService);
const st = vi.mocked(stationAdminService);

const account = (o: Partial<UserResponseDto> = {}): UserResponseDto =>
  ({
    id: 'u1',
    fullName: 'Nguyễn An',
    email: 'an@resq.vn',
    phoneNumber: '0981234567',
    role: UserRole.Operator,
    status: UserStatus.Active,
    isEmailVerified: true,
    createdAt: '',
    ...o,
  }) as UserResponseDto;

beforeEach(() => vi.clearAllMocks());

describe('AccountFormDrawer', () => {
  const fields = (c: HTMLElement) => ({
    name: c.querySelector('input:not([type])') as HTMLInputElement,
    email: c.querySelector('input[type=email]') as HTMLInputElement,
    password: c.querySelector('input[type=password]') as HTMLInputElement,
    phone: c.querySelector('input[inputmode=tel]') as HTMLInputElement,
  });

  it('tạo mới: kiểm tra hợp lệ rồi gửi email chữ thường, SĐT bỏ ký tự phân cách', async () => {
    acc.create.mockResolvedValue(account({ id: 'new' }));
    const onSaved = vi.fn();
    const { baseElement } = render(<AccountFormDrawer initialAccount={null} onClose={() => {}} onSaved={onSaved} />);
    const f = fields(baseElement);
    const submit = screen.getByRole('button', { name: t('admin.users.form.create') });
    expect(screen.getByRole('heading', { name: t('admin.users.form.addTitle') })).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await userEvent.type(f.name, '  Trần Bình ');
    await userEvent.type(f.email, 'BINH@ResQ');
    expect(screen.getByText(t('admin.users.form.emailInvalid'))).toBeInTheDocument();
    await userEvent.type(f.email, '.vn');
    await userEvent.type(f.password, '12345');
    expect(submit).toBeDisabled();
    await userEvent.type(f.password, '6');
    await userEvent.type(f.phone, '098 123');
    expect(screen.getByText(t('admin.users.form.phoneInvalid'))).toBeInTheDocument();
    expect(submit).toBeDisabled();
    await userEvent.type(f.phone, '-4567');
    await userEvent.click(screen.getByText(t('admin.users.roles.RescueStaff.label')));
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    expect(acc.create).toHaveBeenCalledWith({
      fullName: 'Trần Bình',
      phoneNumber: '0981234567',
      role: UserRole.RescueStaff,
      email: 'binh@resq.vn',
      password: '123456',
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'new' })));
  });

  it('sửa: khóa email, không có mật khẩu, gọi update', async () => {
    acc.update.mockResolvedValue(account());
    const { baseElement } = render(
      <AccountFormDrawer initialAccount={account({ role: UserRole.RescueStaff, stationName: 'Trạm A' })} onClose={() => {}} onSaved={() => {}} />,
    );
    const f = fields(baseElement);
    expect(f.email).toBeDisabled();
    expect(f.password).toBeNull();
    expect(screen.getByText(t('admin.users.form.emailLocked'))).toBeInTheDocument();
    expect(screen.getByText(/Trạm A/)).toBeInTheDocument();
    await userEvent.clear(f.name);
    await userEvent.type(f.name, 'Tên mới');
    await userEvent.click(screen.getByRole('button', { name: t('admin.users.form.saveChanges') }));
    expect(acc.update).toHaveBeenCalledWith('u1', { fullName: 'Tên mới', phoneNumber: '0981234567', role: UserRole.RescueStaff });
  });

  it('lỗi từ server hiện trong drawer', async () => {
    acc.update.mockRejectedValue(new Error('Email đã tồn tại'));
    render(<AccountFormDrawer initialAccount={account()} onClose={() => {}} onSaved={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: t('admin.users.form.saveChanges') }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email đã tồn tại');
  });
});

describe('AccountActionDialog', () => {
  it('khóa: cần lý do ≥ 5 ký tự', async () => {
    acc.lock.mockResolvedValue(account());
    const onDone = vi.fn();
    render(<AccountActionDialog account={account({ stationName: 'Trạm A' })} mode="lock" onCancel={() => {}} onDone={onDone} />);
    expect(screen.getByText(/Trạm A/)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: t('admin.users.action.lock.confirm') });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox'), 'Spam liên tục');
    await userEvent.click(confirm);
    expect(acc.lock).toHaveBeenCalledWith('u1', 'Spam liên tục');
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it.each([
    [UserStatus.Inactive, undefined, 'admin.users.action.activate'],
    [UserStatus.Suspended, undefined, 'admin.users.action.unlock.confirm'],
    [UserStatus.Active, new Date(Date.now() + 60_000).toISOString(), 'admin.users.action.removeTempLock'],
  ])('mở khóa trạng thái %s → nhãn phù hợp', async (status, lockoutEndUtc, key) => {
    acc.unlock.mockResolvedValue(account());
    render(<AccountActionDialog account={account({ status, lockoutEndUtc } as never)} mode="unlock" onCancel={() => {}} onDone={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: t(key) }));
    expect(acc.unlock).toHaveBeenCalledWith('u1');
  });

  it('xóa lỗi → hiện lỗi', async () => {
    acc.remove.mockRejectedValue(new Error('Không xóa được'));
    const onCancel = vi.fn();
    render(<AccountActionDialog account={account()} mode="delete" onCancel={onCancel} onDone={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: t('admin.users.action.delete.confirm') }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không xóa được');
    await userEvent.click(screen.getByRole('button', { name: t('common.cancel') }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('TransferStationDialog', () => {
  const stations = {
    items: [
      { id: 's1', name: 'Trạm A', isActive: true },
      { id: 's2', name: 'Trạm B', isActive: true },
      { id: 's3', name: 'Trạm C', isActive: false },
    ],
  };

  it('liệt kê trạm khác đang hoạt động và chuyển', async () => {
    st.list.mockResolvedValue(stations as never);
    st.assignStaff.mockResolvedValue();
    const onDone = vi.fn();
    render(<TransferStationDialog account={account({ stationId: 's1', stationName: 'Trạm A' })} onCancel={() => {}} onDone={onDone} />);
    const select = screen.getByRole('combobox', { name: t('admin.users.transfer.newStation') });
    await waitFor(() => expect(select).toBeEnabled());
    const options = [...(select as HTMLSelectElement).options].map((o) => o.textContent);
    expect(options).toEqual([t('admin.users.transfer.choose'), 'Trạm B', t('admin.users.transfer.removeOption')]);
    expect(screen.getByRole('button', { name: t('admin.users.transfer.confirm') })).toBeDisabled();
    await userEvent.selectOptions(select, 's2');
    await userEvent.click(screen.getByRole('button', { name: t('admin.users.transfer.confirm') }));
    expect(st.assignStaff).toHaveBeenCalledWith('u1', 's2');
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Trạm B'));
  });

  it('gỡ khỏi trạm', async () => {
    st.list.mockResolvedValue(stations as never);
    st.assignStaff.mockResolvedValue();
    const onDone = vi.fn();
    render(<TransferStationDialog account={account({ stationId: 's1' })} onCancel={() => {}} onDone={onDone} />);
    const select = screen.getByRole('combobox');
    await waitFor(() => expect(select).toBeEnabled());
    await userEvent.selectOptions(select, 'none');
    await userEvent.click(screen.getByRole('button', { name: t('admin.users.transfer.remove') }));
    expect(st.assignStaff).toHaveBeenCalledWith('u1', null);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
  });

  it('chưa thuộc trạm → không có lựa chọn gỡ; lỗi tải trạm', async () => {
    st.list.mockRejectedValue(new Error('Lỗi tải trạm'));
    render(<TransferStationDialog account={account()} onCancel={() => {}} onDone={() => {}} />);
    expect(await screen.findByText('Lỗi tải trạm')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: t('admin.users.transfer.removeOption') })).not.toBeInTheDocument();
  });
});
