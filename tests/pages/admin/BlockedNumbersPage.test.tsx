import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BlockedNumbersPage from '@/pages/admin/BlockedNumbersPage';
import { blockedNumberService } from '@/services/admin/blockedNumberService';
import { page, renderWithRouter, t } from '../../setup/render';
import type { BlockedNumberDto } from '@/types/blockedNumber';

vi.mock('@/services/admin/blockedNumberService', () => ({
  blockedNumberService: { list: vi.fn(), unblock: vi.fn(), extend: vi.fn() },
}));

const svc = vi.mocked(blockedNumberService);
const in10Days = new Date(Date.now() + 10 * 86400_000).toISOString();

const item = (o: Partial<BlockedNumberDto>): BlockedNumberDto => ({
  id: 'b',
  maskedPhone: '098***456',
  duration: 'ThirtyDays',
  status: 'Active',
  blockedAt: '2026-10-01T00:00:00Z',
  expiresAt: in10Days,
  reason: 'Báo khống',
  incidentId: null,
  blockedByName: 'Operator A',
  lastExtendedAt: null,
  removedAt: null,
  removedByName: null,
  removeReason: null,
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  svc.list.mockResolvedValue(
    page([
      item({ id: 'b1' }),
      item({ id: 'b2', maskedPhone: '090***111', duration: 'Permanent', expiresAt: null }),
      item({ id: 'b3', maskedPhone: '091***222', status: 'Removed' }),
    ]) as never,
  );
});

const row = (phone: string) => screen.getByText(phone).closest('tr')!;

describe('BlockedNumbersPage', () => {
  it('mặc định lọc Active; status=all → tất cả', async () => {
    const { unmount } = renderWithRouter(<BlockedNumbersPage />);
    await screen.findByText('098***456');
    expect(svc.list).toHaveBeenLastCalledWith({ search: '', status: 'Active', pageIndex: 1, pageSize: 10 });
    unmount();
    renderWithRouter(<BlockedNumbersPage />, '/admin/blocked-numbers?status=all');
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined })));
  });

  it('khóa thao tác: đã gỡ không gỡ được; vĩnh viễn không gia hạn được', async () => {
    renderWithRouter(<BlockedNumbersPage />);
    await screen.findByText('098***456');
    expect(within(row('091***222')).getByRole('button', { name: t('admin.users.blocked.table.unblock') })).toBeDisabled();
    expect(within(row('090***111')).getByRole('button', { name: t('admin.users.blocked.table.extend') })).toBeDisabled();
    expect(within(row('098***456')).getByRole('button', { name: t('admin.users.blocked.table.extend') })).toBeEnabled();
  });

  it('gỡ chặn kèm lý do', async () => {
    svc.unblock.mockResolvedValue(item({}));
    renderWithRouter(<BlockedNumbersPage />);
    await screen.findByText('098***456');
    await userEvent.click(within(row('098***456')).getByRole('button', { name: t('admin.users.blocked.table.unblock') }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Người dân khiếu nại hợp lệ');
    await userEvent.click(within(dialog).getByRole('button', { name: t('admin.users.blocked.unblock.confirm') }));
    expect(svc.unblock).toHaveBeenCalledWith('b1', 'Người dân khiếu nại hợp lệ');
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.users.blocked.unblock.done', { phone: '098***456' }));
  });

  it('gia hạn: thời hạn ngắn hơn hạn hiện tại bị khóa, cần chọn thời hạn + lý do', async () => {
    svc.extend.mockResolvedValue(item({ expiresAt: null }));
    renderWithRouter(<BlockedNumbersPage />);
    await screen.findByText('098***456');
    await userEvent.click(within(row('098***456')).getByRole('button', { name: t('admin.users.blocked.table.extend') }));
    const dialog = screen.getByRole('dialog');
    // Hạn hiện tại còn 10 ngày → 7 ngày không phải gia hạn
    expect(within(dialog).getByRole('button', { name: t('admin.users.blocked.duration.SevenDays') })).toBeDisabled();
    await userEvent.type(within(dialog).getByRole('textbox'), 'Tái phạm nhiều lần');
    const confirm = within(dialog).getByRole('button', { name: t('admin.users.blocked.extend.confirm') });
    expect(confirm).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('button', { name: t('admin.users.blocked.duration.Permanent') }));
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(svc.extend).toHaveBeenCalledWith('b1', 'Permanent', 'Tái phạm nhiều lần');
    expect(await screen.findByRole('status')).toHaveTextContent(
      t('admin.users.blocked.extend.done', { phone: '098***456', expiry: t('admin.users.blocked.permanent') }),
    );
  });

  it('tìm kiếm (debounce) về trang 1', async () => {
    renderWithRouter(<BlockedNumbersPage />);
    await screen.findByText('098***456');
    await userEvent.type(screen.getByPlaceholderText(t('admin.users.blocked.searchPlaceholder')), '0981');
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: '0981', pageIndex: 1 })));
  });
});
