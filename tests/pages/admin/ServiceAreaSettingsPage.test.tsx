import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceAreaSettingsPage from '@/pages/admin/ServiceAreaSettingsPage';
import { adminSettingsService } from '@/services/admin/adminSettingsService';
import { searchAdministrativeBoundaries } from '@/services/admin/geocodeService';
import { stationAdminService } from '@/services/admin/stationAdminService';
import { FakeMap } from '../../setup/mapboxGlMock';
import { page, renderWithRouter, t } from '../../setup/render';

vi.mock('@/services/admin/geocodeService', async (orig) => {
  const actual = await orig<typeof import('@/services/admin/geocodeService')>();
  return { ...actual, searchAdministrativeBoundaries: vi.fn() };
});
vi.mock('@/components/admin/settings/serviceAreaDraw', () => ({
  createBoundaryDraw: () => ({ add: vi.fn(), changeMode: vi.fn(), getAll: () => ({ type: 'FeatureCollection', features: [] }) }),
  polygonsFromDraw: () => [],
}));

vi.mock('@/services/admin/adminSettingsService', async (orig) => {
  const actual = await orig<typeof import('@/services/admin/adminSettingsService')>();
  return {
    ...actual,
    adminSettingsService: {
      ...actual.adminSettingsService,
      getServiceArea: vi.fn(),
      updateServiceArea: vi.fn(),
      getDuplicateDetection: vi.fn().mockResolvedValue({ values: { enabled: false, duplicateRadiusMeters: 500, duplicateWindowMinutes: 30 }, updatedAt: null, updatedByName: null }),
      getCitizenIncidentAlerts: vi.fn().mockResolvedValue({ values: { enabled: false, enabledFromUtc: null, reportCooldownMinutes: 3 }, updatedAt: null, updatedByName: null }),
      updateCitizenIncidentAlerts: vi.fn(),
    },
  };
});
vi.mock('@/services/admin/stationAdminService', () => ({ stationAdminService: { list: vi.fn() } }));

const svc = vi.mocked(adminSettingsService);
const area = { enabled: true, rejectOutside: false, name: 'SHTP', centerLat: 10.84, centerLng: 106.8, radiusKm: 5 };

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
    const warning = await screen.findByText((_, el) => el?.tagName === 'STRONG' && el?.textContent === 'Trạm Xa');
    expect(warning).toBeInTheDocument();
    const alertBox = warning.closest('div');
    expect(alertBox).not.toHaveTextContent('Trạm Gần');

    const radius = screen.getAllByRole('spinbutton')[0];
    await userEvent.clear(radius);
    await userEvent.type(radius, '20');
    expect(screen.queryByText((_, el) => el?.tagName === 'STRONG' && el?.textContent === 'Trạm Xa')).not.toBeInTheDocument();
  });

  it('bán kính ngoài 1–100 và tên trống → không lưu được', async () => {
    renderWithRouter(<ServiceAreaSettingsPage />);
    await screen.findByText((_, el) => el?.tagName === 'STRONG' && el?.textContent === 'Trạm Xa');
    fireEvent.change(screen.getByRole('slider', { name: t('admin.settings.serviceArea.radiusAria') }), { target: { value: '100' } });
    const radiusInput = screen.getAllByRole('spinbutton')[0];
    expect(radiusInput).toHaveValue(100);
    await userEvent.clear(radiusInput);
    await userEvent.type(radiusInput, '150');
    expect(screen.getByText(t('admin.settings.validation.areaRadiusRange', { min: 1, max: 100 }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('admin.common.settings.save') })).toBeDisabled();
  });

  it('đổi tâm trên bản đồ + tắt kiểm tra → lưu', async () => {
    svc.updateServiceArea.mockResolvedValue({ values: area, updatedAt: 'x', updatedByName: null });
    renderWithRouter(<ServiceAreaSettingsPage />);
    await screen.findByText((_, el) => el?.tagName === 'STRONG' && el?.textContent === 'Trạm Xa');
    const map = FakeMap.instances.slice(-1)[0]!;
    act(() => map.fire('click', { lngLat: { lat: 10.9, lng: 106.85 } }));
    expect(screen.getByText('10.90000, 106.85000')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.settings.save') }));
    expect(svc.updateServiceArea).toHaveBeenCalledWith({ enabled: false, rejectOutside: false, name: 'SHTP', centerLat: 10.9, centerLng: 106.85, radiusKm: 5, boundaryGeoJson: null });
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

  it('tìm ranh giới theo tên khu vực → tự chuyển sang đa giác và nạp GeoJSON', async () => {
    vi.mocked(searchAdministrativeBoundaries).mockResolvedValue([
      {
        label: 'Phường Thảo Điền, Thành phố Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam',
        shortName: 'Phường Thảo Điền',
        lat: 10.804,
        lng: 106.733,
        geojson: {
          type: 'Polygon',
          coordinates: [[[106.72, 10.79], [106.74, 10.79], [106.74, 10.81], [106.72, 10.81], [106.72, 10.79]]],
        },
      },
    ]);
    svc.updateServiceArea.mockResolvedValue({ values: area, updatedAt: 'x', updatedByName: null });

    renderWithRouter(<ServiceAreaSettingsPage />);
    const nameInput = await screen.findByLabelText(t('admin.settings.serviceArea.name'));
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Phường Thảo Điền');
    await userEvent.click(screen.getByRole('button', { name: t('admin.settings.serviceArea.boundarySearch.button') }));

    expect(searchAdministrativeBoundaries).toHaveBeenCalledWith('Phường Thảo Điền', expect.any(AbortSignal));
    expect(await screen.findByText(t('admin.settings.serviceArea.polygonSummary', { vertices: 4, parts: 1 }))).toBeInTheDocument();
    expect(nameInput).toHaveValue('Phường Thảo Điền');
    expect(svc.updateServiceArea).not.toHaveBeenCalled();
  });

  it('nhiều kết quả ranh giới → hiện danh sách để chọn và áp dụng lên bản đồ', async () => {
    vi.mocked(searchAdministrativeBoundaries).mockResolvedValue([
      {
        label: 'Phường 1, Quận 3, Thành phố Hồ Chí Minh, Việt Nam',
        shortName: 'Phường 1',
        lat: 10.77,
        lng: 106.68,
        geojson: {
          type: 'Polygon',
          coordinates: [[[106.67, 10.76], [106.69, 10.76], [106.69, 10.78], [106.67, 10.78], [106.67, 10.76]]],
        },
      },
      {
        label: 'Trạm y tế Phường 1, Quận 3, Thành phố Hồ Chí Minh, Việt Nam',
        shortName: 'Trạm y tế Phường 1',
        lat: 10.771,
        lng: 106.681,
      },
    ]);

    renderWithRouter(<ServiceAreaSettingsPage />);
    const nameInput = await screen.findByLabelText(t('admin.settings.serviceArea.name'));
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Phường 1{Enter}');

    expect(await screen.findByText(t('admin.settings.serviceArea.boundarySearch.resultsTitle', { count: 2 }))).toBeInTheDocument();
    await userEvent.click(screen.getByText('Phường 1, Quận 3, Thành phố Hồ Chí Minh, Việt Nam'));

    expect(await screen.findByText(t('admin.settings.serviceArea.polygonSummary', { vertices: 4, parts: 1 }))).toBeInTheDocument();
    expect(nameInput).toHaveValue('Phường 1');
  });

  it('tab Thông báo: cấu hình giới hạn chờ gửi SOS gộp chung với thông báo khu vực', async () => {
    svc.updateCitizenIncidentAlerts.mockResolvedValue({
      values: { enabled: false, enabledFromUtc: null, reportCooldownMinutes: 5 },
      updatedAt: 'x',
      updatedByName: 'Admin',
    });
    renderWithRouter(<ServiceAreaSettingsPage />);
    await screen.findByRole('tab', { name: t('admin.settings.serviceArea.tabs.alerts') });
    await userEvent.click(screen.getByRole('tab', { name: t('admin.settings.serviceArea.tabs.alerts') }));

    const cooldownInput = await screen.findByLabelText(t('admin.settings.citizenAlerts.cooldownTitle'));
    expect(cooldownInput).toHaveValue(3);
    await userEvent.clear(cooldownInput);
    await userEvent.type(cooldownInput, '5');
    await userEvent.click(within(cooldownInput.closest('form')!).getByRole('button', { name: t('admin.common.settings.save') }));

    expect(svc.updateCitizenIncidentAlerts).toHaveBeenCalledWith({ enabled: false, reportCooldownMinutes: 5 });
  });
});
