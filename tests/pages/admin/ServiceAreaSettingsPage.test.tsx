import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceAreaSettingsPage from '@/pages/admin/ServiceAreaSettingsPage';
import { adminSettingsService } from '@/services/admin/adminSettingsService';
import { stationAdminService } from '@/services/admin/stationAdminService';
import { FakeMap } from '../../setup/mapboxGlMock';
import { page, renderWithRouter, t } from '../../setup/render';

vi.mock('@/services/admin/adminSettingsService', async (orig) => ({
  ...(await orig<typeof import('@/services/admin/adminSettingsService')>()),
  adminSettingsService: { getServiceArea: vi.fn(), updateServiceArea: vi.fn() },
}));
vi.mock('@/services/admin/stationAdminService', () => ({ stationAdminService: { list: vi.fn() } }));

const svc = vi.mocked(adminSettingsService);
const area = { enabled: true, name: 'SHTP', centerLat: 10.84, centerLng: 106.8, radiusKm: 5 };

beforeEach(() => {
  vi.clearAllMocks();
  FakeMap.instances.length = 0;
  svc.getServiceArea.mockResolvedValue({ values: area, updatedAt: '2026-10-01T00:00:00Z', updatedByName: 'Admin' });
  vi.mocked(stationAdminService.list).mockResolvedValue(
    page([
      { id: 's1', name: 'Trạm Gần', latitude: 10.845, longitude: 106.8 },
      { id: 's2', name: 'Trạm Xa', latitude: 10.95, longitude: 106.8 },
    ]) as never,
  );
});

describe('ServiceAreaSettingsPage', () => {
  it('cảnh báo trạm nằm ngoài vùng; tăng bán kính thì hết', async () => {
    renderWithRouter(<ServiceAreaSettingsPage />);
    expect(await screen.findByText('Trạm Xa')).toBeInTheDocument();
    expect(screen.queryByText(/Trạm Gần/)).not.toBeInTheDocument();
    const radius = screen.getByRole('spinbutton');
    await userEvent.clear(radius);
    await userEvent.type(radius, '20');
    expect(screen.queryByText('Trạm Xa')).not.toBeInTheDocument();
  });

  it('bán kính ngoài 1–100 và tên trống → không lưu được', async () => {
    renderWithRouter(<ServiceAreaSettingsPage />);
    await screen.findByText('Trạm Xa');
    fireEvent.change(screen.getByRole('slider', { name: t('admin.settings.serviceArea.radiusAria') }), { target: { value: '100' } });
    expect(screen.getByRole('spinbutton')).toHaveValue(100);
    await userEvent.clear(screen.getByRole('spinbutton'));
    await userEvent.type(screen.getByRole('spinbutton'), '150');
    expect(screen.getByText(t('admin.settings.validation.areaRadiusRange', { min: 1, max: 100 }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('admin.common.settings.save') })).toBeDisabled();
  });

  it('đổi tâm trên bản đồ + tắt kiểm tra → lưu', async () => {
    svc.updateServiceArea.mockResolvedValue({ values: area, updatedAt: 'x', updatedByName: null });
    renderWithRouter(<ServiceAreaSettingsPage />);
    await screen.findByText('Trạm Xa');
    const map = FakeMap.instances.slice(-1)[0]!;
    act(() => map.fire('click', { lngLat: { lat: 10.9, lng: 106.85 } }));
    expect(screen.getByText('10.90000, 106.85000')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.settings.save') }));
    expect(svc.updateServiceArea).toHaveBeenCalledWith({ enabled: false, name: 'SHTP', centerLat: 10.9, centerLng: 106.85, radiusKm: 5 });
  });

  it('chưa cấu hình → tâm mặc định ở giữa các trạm', async () => {
    svc.getServiceArea.mockResolvedValue({ values: { ...area, centerLat: 0, centerLng: 0 }, updatedAt: null, updatedByName: null });
    renderWithRouter(<ServiceAreaSettingsPage />);
    expect(await screen.findByText('10.89750, 106.80000')).toBeInTheDocument();
    expect(screen.getByText(t('admin.common.settings.neverUpdated'))).toBeInTheDocument();
  });

  it('lỗi tải', async () => {
    svc.getServiceArea.mockRejectedValue(new Error('Lỗi máy chủ'));
    renderWithRouter(<ServiceAreaSettingsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Lỗi máy chủ');
  });
});
