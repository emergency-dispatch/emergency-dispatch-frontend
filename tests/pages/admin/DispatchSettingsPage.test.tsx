import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DispatchSettingsPage from '@/pages/admin/DispatchSettingsPage';
import { adminSettingsService } from '@/services/admin/adminSettingsService';
import { renderWithRouter, t } from '../../setup/render';

vi.mock('@/services/admin/adminSettingsService', async (orig) => ({
  ...(await orig<typeof import('@/services/admin/adminSettingsService')>()),
  adminSettingsService: { getDispatchSettings: vi.fn(), getEscalationSettings: vi.fn(), updateDispatchSettings: vi.fn(), getDefaults: vi.fn() },
}));

const svc = vi.mocked(adminSettingsService);
const dispatch = { weights: { distance: 0.5, stationLoad: 0.3, activeMissions: 0.2 }, radiusStepsKm: [10, 15], recoveryMinutes: 5 };

beforeEach(() => {
  vi.clearAllMocks();
  svc.getDispatchSettings.mockResolvedValue({ values: dispatch, updatedAt: '2026-10-01T03:00:00Z', updatedByName: 'Admin A' });
  svc.getEscalationSettings.mockResolvedValue({ values: { maxRadiusKm: 30 } as never, updatedAt: null, updatedByName: null });
});

const weightInputs = () => screen.getAllByRole('spinbutton').slice(0, 3);

describe('DispatchSettingsPage', () => {
  it('đang tải → form; lưu bị khóa khi chưa đổi', async () => {
    renderWithRouter(<DispatchSettingsPage />);
    expect(screen.getByText(t('admin.common.settings.loading'))).toBeInTheDocument();
    expect(await screen.findByText(t('admin.settings.dispatch.weightsTitle'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('admin.common.settings.save') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('admin.common.settings.discard') })).toBeDisabled();
    expect(screen.getByText(/Admin A/)).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });

  it('tổng trọng số ≠ 1 → báo lỗi, không lưu được; hủy thay đổi', async () => {
    renderWithRouter(<DispatchSettingsPage />);
    await screen.findByText(t('admin.settings.dispatch.weightsTitle'));
    const [distance] = weightInputs();
    await userEvent.clear(distance);
    await userEvent.type(distance, '0.6');
    expect(screen.getByText('1.1 / 1')).toBeInTheDocument();
    expect(screen.getByText(t('admin.settings.validation.weightsSum'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('admin.common.settings.save') })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.settings.discard') }));
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });

  it('thêm / bỏ nấc bán kính, lưu', async () => {
    svc.updateDispatchSettings.mockResolvedValue({ values: dispatch, updatedAt: 'x', updatedByName: null });
    renderWithRouter(<DispatchSettingsPage />);
    // Sau khi lưu, backend trả updatedAt mới → form dựng lại kèm thông báo "đã lưu".
    svc.getDispatchSettings.mockResolvedValue({ values: { ...dispatch, radiusStepsKm: [15, 20] }, updatedAt: '2026-10-02T00:00:00Z', updatedByName: 'Admin A' });
    await screen.findByText(t('admin.settings.dispatch.weightsTitle'));
    await userEvent.click(screen.getByRole('button', { name: t('admin.settings.dispatch.addStep') }));
    expect(screen.getByRole('spinbutton', { name: t('admin.settings.dispatch.stepLabel', { n: 3 }) })).toHaveValue(20);
    await userEvent.click(screen.getByRole('button', { name: t('admin.settings.dispatch.removeStep', { n: 1 }) }));
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.settings.save') }));
    expect(svc.updateDispatchSettings).toHaveBeenCalledWith({ ...dispatch, radiusStepsKm: [15, 20] });
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.settings.dispatch.saved'));
  });

  it('nấc cuối vượt bán kính tối đa → lỗi', async () => {
    renderWithRouter(<DispatchSettingsPage />);
    await screen.findByText(t('admin.settings.dispatch.weightsTitle'));
    const step2 = screen.getByRole('spinbutton', { name: t('admin.settings.dispatch.stepLabel', { n: 2 }) });
    await userEvent.clear(step2);
    await userEvent.type(step2, '45');
    expect(screen.getByText(t('admin.settings.validation.stepsExceedMax', { km: 30 }))).toBeInTheDocument();
  });

  it('khôi phục mặc định (có xác nhận)', async () => {
    svc.getDefaults.mockResolvedValue({
      dispatch: { ...dispatch, recoveryMinutes: 10 },
      escalation: {} as never,
      serviceArea: {} as never,
      duplicateDetection: {} as never,
    });
    renderWithRouter(<DispatchSettingsPage />);
    await screen.findByText(t('admin.settings.dispatch.weightsTitle'));
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.settings.restoreDefaults') }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('admin.common.settings.restoreConfirm') }));
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.common.settings.defaultsFilled'));
    await waitFor(() => expect(screen.getByRole('button', { name: t('admin.common.settings.save') })).toBeEnabled());
  });

  it('lỗi lưu / lỗi tải', async () => {
    svc.updateDispatchSettings.mockRejectedValue(new Error('Cấu hình không hợp lệ'));
    const { unmount } = renderWithRouter(<DispatchSettingsPage />);
    await screen.findByText(t('admin.settings.dispatch.weightsTitle'));
    const recovery = screen.getAllByRole('spinbutton').slice(-1)[0]!;
    await userEvent.clear(recovery);
    await userEvent.type(recovery, '7');
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.settings.save') }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cấu hình không hợp lệ');
    unmount();

    svc.getDispatchSettings.mockRejectedValue(new Error('403'));
    renderWithRouter(<DispatchSettingsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('403');
  });
});
