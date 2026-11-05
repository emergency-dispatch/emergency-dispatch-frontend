import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateIncidentPanel } from '@/components/operator/livemap/CreateIncidentPanel';
import { mapboxService } from '@/services/mapboxService';
import { mediaService } from '@/services/mediaService';
import { searchAddressInArea } from '@/services/admin/geocodeService';
import { DEFAULT_SERVICE_AREA } from '@/utils/serviceArea';
import { makeDispatchStore, mockStore } from '../../../setup/dispatchStore';
import { makeIncident } from '../../../setup/fixtures';
import { t } from '../../../setup/render';

vi.mock('@/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }));
vi.mock('@/services/mapboxService', async (orig) => ({
  ...(await orig<typeof import('@/services/mapboxService')>()),
  mapboxService: { reverseGeocode: vi.fn() },
}));
vi.mock('@/services/mediaService', () => ({ mediaService: { upload: vi.fn() } }));
vi.mock('@/services/admin/geocodeService', () => ({ searchAddressInArea: vi.fn(), searchAddress: vi.fn() }));

const inside = { lat: DEFAULT_SERVICE_AREA.centerLat, lng: DEFAULT_SERVICE_AREA.centerLng };

const props = (o: Partial<React.ComponentProps<typeof CreateIncidentPanel>> = {}) => ({
  position: null,
  onLocate: vi.fn(),
  nearby: [],
  onViewIncident: vi.fn(),
  onClose: vi.fn(),
  onCreated: vi.fn(),
  ...o,
});

const fillRequired = async () => {
  await userEvent.click(screen.getByRole('button', { name: t('enums.incidentSource.Cctv') }));
  await userEvent.click(screen.getByRole('button', { name: t('enums.category.fire') }));
  await userEvent.click(screen.getByRole('button', { name: t('enums.severity.level2') }));
  await userEvent.type(screen.getByPlaceholderText(t('liveMap.create.notesPlaceholder')), 'Camera thấy khói');
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStore.current = makeDispatchStore();
  vi.mocked(mapboxService.reverseGeocode).mockResolvedValue('Đường D1, Khu CNC');
});

describe('CreateIncidentPanel', () => {
  it('bấm tạo khi trống → báo lỗi từng mục, không gọi API', async () => {
    render(<CreateIncidentPanel {...props()} />);
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.create.submit') }));
    for (const key of ['requiredLocation', 'requiredSource', 'requiredType', 'requiredSeverity']) {
      expect(screen.getByText(t(`liveMap.create.${key}`))).toBeInTheDocument();
    }
    expect(mockStore.current.createOperatorIncident).not.toHaveBeenCalled();
  });

  it('có ghim → tra ngược địa chỉ; tạo thành công', async () => {
    const p = props({ position: inside });
    render(<CreateIncidentPanel {...p} />);
    expect(await screen.findByDisplayValue('Đường D1, Khu CNC')).toBeInTheDocument();
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.create.submit') }));
    expect(mockStore.current.createOperatorIncident).toHaveBeenCalledWith({
      title: undefined,
      description: undefined,
      latitude: inside.lat,
      longitude: inside.lng,
      locationAddress: 'Đường D1, Khu CNC',
      source: 'Cctv',
      eventType: 'FireExplosion',
      severity: 'Level2',
      operatorNotes: 'Camera thấy khói',
      reporterName: undefined,
      reporterPhone: undefined,
      mediaUrls: [],
    });
    await waitFor(() => expect(p.onCreated).toHaveBeenCalledWith(expect.objectContaining({ incidentId: 'new', title: 'Đường D1, Khu CNC' })));
  });

  it('ghim ngoài khu vực → cảnh báo và khóa nút tạo', async () => {
    render(<CreateIncidentPanel {...props({ position: { lat: inside.lat + 0.1, lng: inside.lng } })} />);
    expect(screen.getAllByText(t('liveMap.create.outOfAreaTitle')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: t('liveMap.create.submit') })).toBeDisabled();
  });

  it('chọn Điện thoại → mở mục người báo; SĐT sai định dạng', async () => {
    render(<CreateIncidentPanel {...props({ position: inside })} />);
    await userEvent.click(screen.getByRole('button', { name: t('enums.incidentSource.PhoneCall') }));
    const phone = screen.getByRole('textbox', { name: t('liveMap.create.reporterPhone') });
    await userEvent.type(phone, '01234567890');
    expect(screen.getByText(t('liveMap.create.phoneInvalid'))).toBeInTheDocument();
    await userEvent.clear(phone);
    await userEvent.type(phone, '0981-234-567');
    expect(phone).toHaveValue('0981234567');
    expect(screen.queryByText(t('liveMap.create.phoneInvalid'))).not.toBeInTheDocument();
  });

  it('cảnh báo trùng sự cố gần đó: xem / không trùng', async () => {
    const p = props({ position: inside, nearby: [{ incident: makeIncident({ id: 'dup', title: 'SOS cũ' }), distanceM: 120, minutesAgo: 8 }] });
    render(<CreateIncidentPanel {...p} />);
    expect(screen.getByText(t('liveMap.create.duplicateTitle', { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(t('liveMap.create.duplicateMeta', { distance: 120, minutes: 8 }), { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.create.viewIncident') }));
    expect(p.onViewIncident).toHaveBeenCalledWith('dup');
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.create.notDuplicate') }));
    expect(screen.queryByText(t('liveMap.create.duplicateTitle', { count: 1 }))).not.toBeInTheDocument();
  });

  it('chọn gợi ý địa chỉ → dời ghim', async () => {
    vi.mocked(searchAddressInArea).mockResolvedValue([{ label: 'ĐH FPT, Lô E2a', lat: 10.84, lng: 106.81 }]);
    const p = props();
    render(<CreateIncidentPanel {...p} />);
    await userEvent.type(screen.getByPlaceholderText(t('liveMap.create.addressPlaceholder')), 'FPT');
    const suggestion = await screen.findByText('ĐH FPT, Lô E2a');
    fireEvent.mouseDown(suggestion.closest('button')!);
    expect(p.onLocate).toHaveBeenCalledWith({ lat: 10.84, lng: 106.81 });
    expect(screen.getByDisplayValue('ĐH FPT, Lô E2a')).toBeInTheDocument();
  });

  it('tải ảnh hiện trường và xóa', async () => {
    vi.mocked(mediaService.upload).mockResolvedValue('https://cdn/a.jpg');
    const { container } = render(<CreateIncidentPanel {...props()} />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t('liveMap.create.more')) }));
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
    });
    expect(mediaService.upload).toHaveBeenCalled();
    expect(screen.getByText(t('liveMap.create.media', { count: 1, max: 5 }))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.create.removeMedia') }));
    expect(screen.getByText(t('liveMap.create.media', { count: 0, max: 5 }))).toBeInTheDocument();
  });

  it('tải ảnh lỗi', async () => {
    vi.mocked(mediaService.upload).mockRejectedValue(new Error('File quá lớn'));
    const { container } = render(<CreateIncidentPanel {...props()} />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t('liveMap.create.more')) }));
    await act(async () => {
      fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['x'], 'a.jpg')] } });
    });
    expect(screen.getByText('File quá lớn')).toBeInTheDocument();
  });

  it('lỗi từ server hiện danh sách lỗi', async () => {
    vi.mocked(mockStore.current.createOperatorIncident).mockResolvedValue({ ok: false, message: 'Không hợp lệ', errors: ['Thiếu ghi chú'] });
    render(<CreateIncidentPanel {...props({ position: inside })} />);
    await screen.findByDisplayValue('Đường D1, Khu CNC');
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.create.submit') }));
    const alert = await screen.findByText('Không hợp lệ');
    expect(alert.closest('[role=alert]')).toHaveTextContent('Thiếu ghi chú');
  });

  it('đóng khi đang nhập → xác nhận bỏ; trống → đóng ngay; Esc', async () => {
    const p = props();
    const { unmount } = render(<CreateIncidentPanel {...p} />);
    await userEvent.click(screen.getByRole('button', { name: t('common.close') }));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    unmount();

    const p2 = props();
    render(<CreateIncidentPanel {...p2} />);
    await userEvent.click(screen.getByRole('button', { name: t('enums.category.accident') }));
    await userEvent.click(screen.getByRole('button', { name: t('common.close') }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: t('liveMap.create.keepEditing') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('liveMap.create.discard') }));
    expect(p2.onClose).toHaveBeenCalled();
  });
});
