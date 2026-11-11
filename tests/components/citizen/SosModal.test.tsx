import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SosModal } from '@/components/citizen/SosModal';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { incidentService } from '@/services/incidentService';
import { mediaService } from '@/services/mediaService';
import { mapboxService } from '@/services/mapboxService';
import { liveMapService } from '@/services/liveMapService';
import { UserRole } from '@/types/auth';
import { t } from '../../setup/render';

vi.mock('@/components/common/MapboxLocationPicker', () => ({ MapboxLocationPicker: () => <div data-testid="picker" /> }));
vi.mock('@/services/incidentService', () => ({ incidentService: { createIncident: vi.fn(), cancel: vi.fn() } }));
vi.mock('@/services/mediaService', () => ({ mediaService: { upload: vi.fn() } }));
vi.mock('@/services/mapboxService', async (orig) => ({
  ...(await orig<typeof import('@/services/mapboxService')>()),
  mapboxService: { reverseGeocode: vi.fn(), forwardGeocode: vi.fn() },
}));
vi.mock('@/services/liveMapService', async (orig) => ({
  ...(await orig<typeof import('@/services/liveMapService')>()),
  liveMapService: { getServiceArea: vi.fn() },
}));

const inside = { lat: 10.8441, lng: 106.8089, address: 'Đường D1, Khu CNC' };

const cacheCoords = (c: { lat: number; lng: number; address: string } = inside) =>
  localStorage.setItem('resq_citizen_coords', JSON.stringify({ ...c, updatedAt: Date.now() }));

const defaultCitizen: Partial<AuthContextType['user']> = {
  id: 'c1',
  fullName: 'Dân A',
  role: UserRole.Citizen,
  phoneNumber: '0912345678',
};

const renderModal = (user: Partial<AuthContextType['user']> | null = defaultCitizen, extra: Partial<AuthContextType> = {}) =>
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, isAuthenticated: !!user, updateProfile: vi.fn().mockResolvedValue({}), ...extra } as unknown as AuthContextType}>
        <SosModal isOpen onClose={vi.fn()} onOpenReports={vi.fn()} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

const attachPhoto = async (container: HTMLElement = document.body) => {
  const input = container.querySelector('input[type=file]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files: [new File(['x'], 'scene.jpg', { type: 'image/jpeg' })] } });
  });
};

const submit = () => fireEvent.submit(screen.getByRole('button', { name: new RegExp(t('citizen.sos.submitAlertBtn')) }).closest('form')!);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(liveMapService.getServiceArea).mockResolvedValue({ enabled: true, name: 'SHTP', centerLat: inside.lat, centerLng: inside.lng, radiusKm: 4.5 });
  vi.mocked(mapboxService.forwardGeocode).mockResolvedValue(null);
  vi.mocked(mediaService.upload).mockResolvedValue('https://cdn/scene.jpg');
  vi.mocked(incidentService.createIncident).mockResolvedValue({ success: true, message: '', data: { id: 'sos-1', status: 'Pending', createdAt: new Date().toISOString(), locationAddress: inside.address } } as never);
});

describe('SosModal', () => {
  it('không lấy được vị trí → yêu cầu chọn vị trí', async () => {
    renderModal();
    expect(screen.getByText(t('citizen.sos.headerTitle'))).toBeInTheDocument();
    submit();
    expect(await screen.findByText(t('citizen.sos.locationRequiredError'))).toBeInTheDocument();
    expect(incidentService.createIncident).not.toHaveBeenCalled();
  });

  it('SĐT sai định dạng', async () => {
    cacheCoords();
    renderModal({ ...defaultCitizen, phoneNumber: '' });
    await userEvent.type(screen.getByPlaceholderText(/09/), '0123');
    submit();
    expect(await screen.findByText(t('citizen.sos.invalidPhoneError'))).toBeInTheDocument();
  });

  it('chưa có ảnh và trình duyệt không mở được camera → báo lỗi quyền camera', async () => {
    cacheCoords();
    renderModal();
    submit();
    expect(await screen.findByText(t('citizen.sos.camPermissionError'))).toBeInTheDocument();
  });

  it('ngoài khu vực phục vụ → khóa nút gửi', async () => {
    cacheCoords({ lat: 10.95, lng: 106.8089, address: 'Dĩ An' });
    renderModal();
    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(t('citizen.sos.outOfAreaTitle')) })).toBeDisabled());
  });

  it('gửi SOS thành công: tải ảnh, lưu mã sự cố, bật cooldown; hủy bấm nhầm', async () => {
    cacheCoords();
    vi.mocked(incidentService.cancel).mockResolvedValue({ success: true, message: '', data: {} } as never);
    renderModal({ id: 'c1', fullName: 'Dân A', role: UserRole.Citizen, phoneNumber: '0912345678' });
    await attachPhoto();
    expect(screen.getByText(t('citizen.sos.photoReady'))).toBeInTheDocument();
    submit();
    await waitFor(() => expect(incidentService.createIncident).toHaveBeenCalled());
    expect(incidentService.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: inside.lat,
        longitude: inside.lng,
        locationAddress: inside.address,
        reporterName: 'Dân A',
        reporterPhone: '0912345678',
        mediaUrls: ['https://cdn/scene.jpg'],
      }),
    );
    expect(await screen.findByText(t('citizen.sos.dispatchedTitle'))).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('resq_my_reported_incident_ids')!)).toEqual(['sos-1']);
    expect(localStorage.getItem('resq_last_reported_time')).not.toBeNull();

    await userEvent.click(screen.getByText(t('citizen.sos.cancelAccidentalBtn')));
    await userEvent.click(screen.getByText(t('citizen.sos.cancelConfirmAction')));
    expect(incidentService.cancel).toHaveBeenCalledWith('sos-1', 'Người dân bấm nhầm nút SOS trên Web');
    expect(await screen.findByText(t('citizen.sos.cancelSuccessNotice'))).toBeInTheDocument();
    expect(localStorage.getItem('resq_last_reported_time')).toBeNull();
  });

  it('lưu SĐT vào hồ sơ khi Citizen chưa có số', async () => {
    cacheCoords();
    const updateProfile = vi.fn().mockResolvedValue({});
    renderModal({ id: 'c1', fullName: 'Dân A', role: UserRole.Citizen, phoneNumber: '' }, { updateProfile });
    await userEvent.type(screen.getByPlaceholderText(/09/), '0987654321');
    await attachPhoto();
    submit();
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: '0987654321' })));
  });

  it('đang trong cooldown 3 phút → không gửi được', async () => {
    cacheCoords();
    localStorage.setItem('resq_last_reported_time_c1', String(Date.now()));
    localStorage.setItem('resq_last_reported_time', String(Date.now()));
    renderModal();
    expect(screen.getByRole('button', { name: /3:00|2:59/ })).toBeDisabled();
  });

  it('API lỗi → hiện lỗi, quay về form', async () => {
    cacheCoords();
    vi.mocked(incidentService.createIncident).mockRejectedValue(new Error('Số điện thoại đã bị chặn'));
    renderModal();
    await attachPhoto();
    submit();
    expect(await screen.findByText('Số điện thoại đã bị chặn')).toBeInTheDocument();
  });
});
