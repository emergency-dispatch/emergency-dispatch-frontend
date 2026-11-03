import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '@/pages/HomePage';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { incidentService } from '@/services/incidentService';
import { liveMapService } from '@/services/liveMapService';
import { mapboxService } from '@/services/mapboxService';
import { incidentHubService, trackingHubService } from '@/services/realtime/incidentHubService';
import { UserRole } from '@/types/auth';
import { t } from '../setup/render';

// Modal Citizen đã có test riêng → thay bằng bản giả để kiểm tra trang mở đúng modal.
vi.mock('@/components/citizen', () => ({
  SosModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog">sos-modal</div> : null),
  CitizenReportsModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog">reports-modal</div> : null),
  CitizenPhoneModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog">phone-modal</div> : null),
}));
vi.mock('@/components/profile/UserProfileModal', () => ({
  UserProfileModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog">profile-modal</div> : null),
}));
vi.mock('@/services/incidentService', () => ({ incidentService: { getById: vi.fn(), getMyReports: vi.fn(), getTracking: vi.fn() } }));
vi.mock('@/services/liveMapService', async (orig) => ({
  ...(await orig<typeof import('@/services/liveMapService')>()),
  liveMapService: { getStations: vi.fn(), getRescueUnits: vi.fn(), getServiceArea: vi.fn() },
}));
vi.mock('@/services/mapboxService', async (orig) => ({
  ...(await orig<typeof import('@/services/mapboxService')>()),
  mapboxService: { reverseGeocode: vi.fn() },
}));

const logout = vi.fn().mockResolvedValue(undefined);
const renderHome = (user: Partial<AuthContextType['user']> | null = null) =>
  render(
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, logout } as unknown as AuthContextType}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(liveMapService.getStations).mockResolvedValue([]);
  vi.mocked(liveMapService.getRescueUnits).mockResolvedValue([]);
  vi.mocked(liveMapService.getServiceArea).mockResolvedValue({ enabled: true, name: 'SHTP', centerLat: 10.84, centerLng: 106.8, radiusKm: 4.5 });
  vi.mocked(incidentService.getMyReports).mockResolvedValue({ success: true, message: '', data: { items: [] } } as never);
  for (const hub of [incidentHubService, trackingHubService]) {
    vi.spyOn(hub, 'start').mockResolvedValue(false);
    vi.spyOn(hub, 'stop').mockResolvedValue();
    vi.spyOn(hub, 'on').mockReturnValue(() => {});
    vi.spyOn(hub, 'invoke').mockResolvedValue(null);
  }
});

describe('HomePage', () => {
  it('khách: hiện landing, nút đăng nhập, không có cảnh báo SĐT', () => {
    renderHome();
    expect(screen.getAllByText(t('citizen.layout.signIn')).length).toBeGreaterThan(0);
    expect(screen.getByText(t('citizen.landing.heroSubtitle'))).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Cảnh báo bổ sung số điện thoại' })).not.toBeInTheDocument();
  });

  it('nút SOS mở modal SOS', async () => {
    renderHome();
    await userEvent.click(screen.getByText(t('citizen.landing.mobileSosBtn')));
    expect(screen.getByRole('dialog')).toHaveTextContent('sos-modal');
  });

  it('Citizen chưa có SĐT → cảnh báo, mở modal bổ sung SĐT', async () => {
    renderHome({ id: 'c', fullName: 'Dân A', role: UserRole.Citizen, phoneNumber: '', email: 'a@b' });
    const aside = screen.getByRole('complementary', { name: 'Cảnh báo bổ sung số điện thoại' });
    await userEvent.click(within(aside).getByRole('button'));
    expect(screen.getByRole('dialog')).toHaveTextContent('phone-modal');
  });

  it('Operator không thấy cảnh báo SĐT; menu người dùng có đăng xuất', async () => {
    renderHome({ id: 'o', fullName: 'Op Lan', role: UserRole.Operator, phoneNumber: '', email: 'op@resq.vn' });
    expect(screen.queryByRole('complementary', { name: 'Cảnh báo bổ sung số điện thoại' })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByText('Op Lan')[0]);
    await userEvent.click(screen.getAllByText(t('citizen.layout.signOut'))[0]);
    expect(logout).toHaveBeenCalled();
  });

  it('lấy vị trí GPS khi mở trang và lưu kèm địa chỉ', async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 10.85, longitude: 106.81 } } as GeolocationPosition));
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
    vi.mocked(mapboxService.reverseGeocode).mockResolvedValue('Lô E2a');
    renderHome();
    await waitFor(() => expect(JSON.parse(localStorage.getItem('resq_citizen_coords') ?? '{}')).toMatchObject({ lat: 10.85, lng: 106.81, address: 'Lô E2a' }));
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  });
});
