import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { SourceChip } from '@/components/operator/incidents/SourceChip';
import { StationNotAssigned } from '@/components/operator/StationNotAssigned';
import { ConfidenceBadge } from '@/components/operator/incidents/ConfidenceBadge';
import { SeverityBadge } from '@/components/operator/incidents/SeverityBadge';
import { IncidentThumbnail } from '@/components/operator/incidents/IncidentThumbnail';
import { HazardTagBadge } from '@/components/common/HazardTagBadge';
import { BackToTop } from '@/components/common/BackToTop';
import { FireTruckIcon } from '@/components/common/FireTruckIcon';
import { AccountStatusCell } from '@/components/admin/accounts/AccountStatusCell';
import { DispatchTeamLabel } from '@/components/operator/teams/DispatchTeamLabel';
import { ConfirmModal, DrawerFooter, DrawerShell, FormField, LockableButton, Notice, Pagination, VehicleStatusBadge } from '@/components/admin/common/ui';
import { ReasonModal } from '@/components/admin/common/ReasonModal';
import { DateRangeFilter, YMD_PATTERN } from '@/components/admin/common/DateRangeFilter';
import { makeIncident } from '../setup/fixtures';
import { UserStatus } from '@/types/auth';
import type { Vehicle } from '@/types/vehicle';

const t = (key: string, opts?: Record<string, unknown>) => (i18n.t as unknown as (k: string, o?: object) => string)(key, opts);

describe('SourceChip', () => {
  it('SOS người dân → không hiện', () => {
    const { container } = render(<SourceChip source="CitizenApp" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Operator tạo → hiện kênh', () => {
    render(<SourceChip source="PhoneCall" />);
    expect(screen.getByText(t('liveMap.source.operatorCreated', { channel: t('enums.incidentSource.PhoneCall') }))).toBeInTheDocument();
  });
});

describe('StationNotAssigned', () => {
  it('hiện tiêu đề, thông báo và hướng dẫn', () => {
    render(<StationNotAssigned message="Chưa gán trạm" />);
    expect(screen.getByRole('heading', { name: t('layout.stationNotAssigned.title') })).toBeInTheDocument();
    expect(screen.getByText('Chưa gán trạm')).toBeInTheDocument();
    expect(screen.getByText(t('layout.stationNotAssigned.help'))).toBeInTheDocument();
  });
});

describe('ConfidenceBadge', () => {
  it.each([
    [90, 'text-emerald-700', false],
    [65, 'text-slate-600', false],
    [30, 'text-amber-700', true],
  ])('score %i', (score, cls, low) => {
    render(<ConfidenceBadge score={score} />);
    const el = screen.getByText(t('incidents.badge.confidence', { score }));
    expect(el).toHaveClass(cls);
    expect(el).toHaveAttribute('title', low ? t('incidents.badge.lowConfidence') : t('incidents.badge.confidenceTitle', { score }));
    expect(el.querySelector('svg') !== null).toBe(low);
  });
});

describe('SeverityBadge', () => {
  it('hiện cấp độ', () => {
    render(<SeverityBadge severity={3} />);
    expect(screen.getByText('Cấp 3 · Nghiêm trọng')).toBeInTheDocument();
  });

  it('chưa phân loại', () => {
    render(<SeverityBadge severity={1} unclassified />);
    expect(screen.getByText(t('incidents.badge.unclassified'))).toBeInTheDocument();
    expect(screen.queryByText('Cấp 1 · Nhẹ')).not.toBeInTheDocument();
  });
});

describe('HazardTagBadge', () => {
  it('không có tag → không hiện', () => {
    const { container } = render(<HazardTagBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tag biết trước (chuẩn hóa #, hoa thường)', () => {
    render(<HazardTagBadge tag="#Fire" size="md" />);
    expect(screen.getByText('#Fire')).toHaveStyle({ color: '#DC2626' });
  });

  it('tag cũ và tag lạ', () => {
    render(<HazardTagBadge tagKey="flooding" />);
    expect(screen.getByText('#Flooding')).toBeInTheDocument();
    render(<HazardTagBadge tag="heavy_smoke" />);
    expect(screen.getByText('#heavy_smoke')).toBeInTheDocument();
  });
});

describe('IncidentThumbnail', () => {
  it('có ảnh → <img> + số lượng media', () => {
    render(
      <IncidentThumbnail
        incident={makeIncident({ mediaUrl: 'a.jpg', media: [{ url: 'a.jpg', type: 'image' }, { url: 'b.jpg', type: 'image' }] })}
      />,
    );
    expect(screen.getByRole('img', { name: 'Cháy kho hàng' })).toHaveAttribute('src', 'a.jpg');
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('video → <video>', () => {
    const { container } = render(<IncidentThumbnail incident={makeIncident({ mediaUrl: 'v.mp4', mediaType: 'video' })} />);
    expect(container.querySelector('video')).toHaveAttribute('src', 'v.mp4');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('không có media → icon theo loại sự cố', () => {
    const { container } = render(<IncidentThumbnail incident={makeIncident({ category: 'accident' })} />);
    expect(container.querySelector('img, video')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('BackToTop', () => {
  it('hiện khi cuộn quá 350px và cuộn lên đầu khi bấm', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(<BackToTop />);
    const wrapper = screen.getByRole('button', { name: 'Back to top' }).parentElement!;
    expect(wrapper).toHaveClass('opacity-0');
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
    fireEvent.scroll(window);
    expect(wrapper).toHaveClass('opacity-100');
    fireEvent.click(screen.getByRole('button', { name: 'Back to top' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    fireEvent.scroll(window);
    expect(wrapper).toHaveClass('opacity-0');
  });
});

describe('FireTruckIcon', () => {
  it('render SVG', () => {
    const { container } = render(<FireTruckIcon width={20} height={20} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('AccountStatusCell', () => {
  it('hiện trạng thái và lý do khóa khi Suspended', () => {
    render(<AccountStatusCell user={{ id: 'u', status: UserStatus.Suspended, lockReason: 'Spam SOS' } as never} />);
    expect(screen.getByText(t('admin.users.accountStatus.Suspended'))).toBeInTheDocument();
    expect(screen.getByText('Spam SOS')).toBeInTheDocument();
  });

  it('không hiện lý do khi Active; hiện hạn khóa tạm', () => {
    const end = new Date(Date.now() + 10 * 60_000).toISOString();
    render(<AccountStatusCell user={{ id: 'u', status: UserStatus.Active, lockReason: 'x', lockoutEndUtc: end } as never} />);
    expect(screen.queryByText('x')).not.toBeInTheDocument();
    expect(screen.getByText(/./, { selector: '.text-amber-700' })).toBeInTheDocument();
  });
});

describe('DispatchTeamLabel', () => {
  const vehicle = { id: 'v', plate: '51A-123', type: 'fire_truck' } as Vehicle;

  it('tổ đủ người có tổ trưởng', () => {
    render(
      <DispatchTeamLabel
        team={{ id: 't', stationId: 's', name: 'Tổ 1', vehicleIds: ['v'], vehiclePlates: ['51A-1'], members: [{ staffId: 'a', crewRole: 'commander', fullName: 'Bình' }, { staffId: 'b', crewRole: 'driver' }] }}
        vehicle={vehicle}
        detail={<span> · 2 km</span>}
      />,
    );
    expect(screen.getByText('Tổ 1')).toBeInTheDocument();
    expect(screen.getByText(t('enums.teamFunction.fire_truck'))).toBeInTheDocument();
    expect(screen.getByText(`Bình · ${t('liveMap.teamLabel.members', { count: 2 })}`)).toBeInTheDocument();
    expect(screen.getByText('51A-123')).toBeInTheDocument();
    expect(screen.getByText('· 2 km')).toBeInTheDocument();
  });

  it('tổ thiếu người → cảnh báo', () => {
    render(<DispatchTeamLabel team={{ id: 't', stationId: 's', name: 'Tổ 2', vehicleIds: ['v'], vehiclePlates: ['51A-1'], members: [{ staffId: 'a', crewRole: 'driver' }] }} vehicle={vehicle} />);
    expect(screen.getByText(t('liveMap.teamLabel.understaffed', { size: 1, min: 2 }))).toBeInTheDocument();
    expect(screen.queryByText(/\(\+/)).not.toBeInTheDocument();
  });

  it('tổ nhiều xe → hiện biển số các xe còn lại của tổ', () => {
    render(
      <DispatchTeamLabel
        team={{ id: 't', stationId: 's', name: 'Tổ 3', vehicleIds: ['v', 'v2', 'v3'], vehiclePlates: ['51A-123', '51A-2', '51A-3'], members: [] }}
        vehicle={vehicle}
      />,
    );
    const others = screen.getByText(t('liveMap.teamLabel.sameTeam', { plates: '51A-2, 51A-3' }));
    expect(others).toHaveAttribute('title', t('liveMap.teamLabel.sameTeamTitle', { plates: '51A-2, 51A-3' }));
  });
});

describe('admin/common/ui', () => {
  it('FormField: bắt buộc, hint, lỗi', () => {
    const { rerender } = render(
      <FormField label="Tên" required hint="Gợi ý">
        <input />
      </FormField>,
    );
    expect(screen.getByText('Tên *')).toBeInTheDocument();
    expect(screen.getByText('Gợi ý')).toBeInTheDocument();
    rerender(
      <FormField label="Tên" hint="Gợi ý" error="Bắt buộc">
        <input />
      </FormField>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Bắt buộc');
    expect(screen.queryByText('Gợi ý')).not.toBeInTheDocument();
  });

  it('Notice: null / thành công / lỗi + đóng', async () => {
    const { container, rerender } = render(<Notice notice={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<Notice notice={{ kind: 'success', message: 'OK' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('OK');
    const onClose = vi.fn();
    rerender(<Notice notice={{ kind: 'error', message: 'Lỗi' }} onClose={onClose} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Lỗi');
    await userEvent.click(screen.getByRole('button', { name: t('common.dismissNotice') }));
    expect(onClose).toHaveBeenCalled();
  });

  it('LockableButton: khóa khi có lý do, tooltip lý do', () => {
    const { rerender } = render(<LockableButton lockedReason="Đang nhiệm vụ">Xóa</LockableButton>);
    expect(screen.getByRole('button', { name: 'Xóa' })).toBeDisabled();
    expect(screen.getByRole('button').parentElement).toHaveAttribute('title', 'Đang nhiệm vụ');
    rerender(<LockableButton title="Xóa xe">Xóa</LockableButton>);
    expect(screen.getByRole('button')).toBeEnabled();
    expect(screen.getByRole('button').parentElement).toHaveAttribute('title', 'Xóa xe');
  });

  it('Pagination', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Pagination pageIndex={1} totalPages={3} totalCount={25} onChange={onChange} />);
    expect(screen.getByText(t('common.recordCount', { count: 25 }))).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('common.previousPage') })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: t('common.nextPage') }));
    expect(onChange).toHaveBeenCalledWith(2);
    rerender(<Pagination pageIndex={3} totalPages={3} totalCount={25} onChange={onChange} />);
    expect(screen.getByRole('button', { name: t('common.nextPage') })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: t('common.previousPage') }));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('DrawerShell + DrawerFooter', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { rerender } = render(
      <DrawerShell title="Sửa trạm" onClose={onClose} onSubmit={onSubmit} footer={<DrawerFooter onCancel={onClose} submitLabel="Lưu" submitting={false} canSubmit />}>
        <input aria-label="tên" />
      </DrawerShell>,
    );
    expect(screen.getByRole('heading', { name: 'Sửa trạm' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onSubmit).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: t('common.cancel') }));
    await userEvent.click(screen.getByRole('button', { name: t('common.close') }));
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(
      <DrawerShell title="x" onClose={onClose} onSubmit={onSubmit} footer={<DrawerFooter onCancel={onClose} submitLabel="Lưu" submitting canSubmit />}>
        {null}
      </DrawerShell>,
    );
    expect(screen.getByRole('button', { name: t('common.saving') })).toBeDisabled();
  });

  it('ConfirmModal', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <ConfirmModal title="Xóa?" confirmLabel="Xóa" onCancel={onCancel} onConfirm={onConfirm}>
        Không hoàn tác được
      </ConfirmModal>,
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('Không hoàn tác được');
    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    await userEvent.click(screen.getByRole('button', { name: t('common.cancel') }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    rerender(
      <ConfirmModal title="Xóa?" confirmLabel="Xóa" submitting onCancel={onCancel} onConfirm={onConfirm}>
        x
      </ConfirmModal>,
    );
    expect(screen.getByRole('button', { name: t('common.processing') })).toBeDisabled();
  });

  it('VehicleStatusBadge', () => {
    render(<VehicleStatusBadge label="Sẵn sàng" color="#10B981" />);
    expect(screen.getByText('Sẵn sàng')).toHaveStyle({ color: '#10B981' });
  });
});

describe('ReasonModal', () => {
  it('chỉ cho xác nhận khi lý do ≥ 5 ký tự (không tính khoảng trắng)', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ReasonModal title="Khóa" confirmLabel="Khóa" reasonLabel="Lý do" onCancel={() => {}} onConfirm={onConfirm} />);
    const button = screen.getByRole('button', { name: 'Khóa' });
    const box = screen.getByRole('textbox');
    expect(button).toBeDisabled();
    await userEvent.type(box, '  abc   ');
    expect(button).toBeDisabled();
    expect(screen.getByText(t('common.reason.counter', { length: 3, min: 5 }))).toBeInTheDocument();
    await userEvent.type(box, 'de');
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(onConfirm).toHaveBeenCalledWith('  abc   de');
  });

  it('extraValid = false → khóa nút', async () => {
    render(<ReasonModal title="T" confirmLabel="OK" reasonLabel="L" extraValid={false} onCancel={() => {}} onConfirm={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox'), 'đủ dài rồi');
    expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled();
  });

  it('lỗi từ service hiện trong hộp thoại và cho thử lại', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Không có quyền'));
    render(<ReasonModal title="T" confirmLabel="OK" reasonLabel="L" onCancel={() => {}} onConfirm={onConfirm} />);
    await userEvent.type(screen.getByRole('textbox'), 'lý do hợp lệ');
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không có quyền');
    expect(screen.getByRole('button', { name: 'OK' })).toBeEnabled();
  });
});

describe('DateRangeFilter', () => {
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return ymd(d);
  };

  it('YMD_PATTERN', () => {
    expect(YMD_PATTERN.test('2026-10-01')).toBe(true);
    expect(YMD_PATTERN.test('01/10/2026')).toBe(false);
  });

  it('nút chọn nhanh và đánh dấu khoảng đang chọn', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<DateRangeFilter fromDate="" toDate="" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.dateRange.last7Days') }));
    expect(onChange).toHaveBeenCalledWith(daysAgo(6), daysAgo(0));
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.dateRange.today') }));
    expect(onChange).toHaveBeenLastCalledWith(daysAgo(0), daysAgo(0));

    rerender(<DateRangeFilter fromDate={daysAgo(29)} toDate={daysAgo(0)} onChange={onChange} />);
    expect(screen.getByRole('button', { name: t('admin.common.dateRange.last30Days') })).toHaveClass('bg-red-50');
    expect(screen.getByRole('button', { name: t('admin.common.dateRange.today') })).not.toHaveClass('bg-red-50');
  });

  it('đổi từng đầu ngày', () => {
    const onChange = vi.fn();
    render(
      <DateRangeFilter fromDate="2026-10-01" toDate="2026-10-05" onChange={onChange}>
        <button>Xóa lọc</button>
      </DateRangeFilter>,
    );
    const from = screen.getByLabelText(t('admin.common.dateRange.from'));
    const to = screen.getByLabelText(t('admin.common.dateRange.to'));
    expect(from).toHaveAttribute('max', '2026-10-05');
    expect(to).toHaveAttribute('min', '2026-10-01');
    fireEvent.change(from, { target: { value: '2026-10-02' } });
    expect(onChange).toHaveBeenCalledWith('2026-10-02', '2026-10-05');
    fireEvent.change(to, { target: { value: '2026-10-09' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-10-01', '2026-10-09');
    expect(screen.getByRole('button', { name: 'Xóa lọc' })).toBeInTheDocument();
  });
});
