import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { IncidentRow } from '@/components/operator/incidents/IncidentRow';
import { IncidentQueueList } from '@/components/operator/incidents/IncidentQueueList';
import { TrafficJamReview } from '@/components/operator/incidents/TrafficJamReview';
import { IncidentMediaGallery } from '@/components/operator/incidents/IncidentMediaGallery';
import { ReporterMedicalCard } from '@/components/operator/incidents/ReporterMedicalCard';
import { makeIncident } from '../../../setup/fixtures';
import type { IncidentTrafficJam, ReporterMedicalProfile } from '@/types/incident';

const t = (key: string, opts?: Record<string, unknown>) => (i18n.t as unknown as (k: string, o?: object) => string)(key, opts);
const NOW = Date.parse('2026-10-01T10:00:00Z');
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe('IncidentRow', () => {
  const renderRow = (overrides: Parameters<typeof makeIncident>[0] = {}, props: Partial<React.ComponentProps<typeof IncidentRow>> = {}) =>
    render(
      <IncidentRow
        incident={makeIncident({ createdAt: minutesAgo(12), ...overrides })}
        isNew={false}
        isSelected={false}
        isEscalated={false}
        now={NOW}
        currentOperatorId="op1"
        onClick={() => {}}
        {...props}
      />,
    );

  it('hiện tiêu đề, khu vực, loại, thời gian chờ, cấp và % AI', () => {
    renderRow();
    const row = screen.getByRole('button');
    expect(row).toHaveTextContent('Cháy kho hàng');
    expect(row).toHaveTextContent('Khu Công nghệ cao');
    expect(row).toHaveTextContent(t('enums.category.fire'));
    expect(row).toHaveTextContent('12 phút');
    expect(row).toHaveTextContent(t('incidents.row.waiting'));
    expect(screen.getAllByText('Cấp 2 · Trung bình').length).toBeGreaterThan(0);
    expect(screen.getByText(t('incidents.badge.confidence', { score: 87 }))).toBeInTheDocument();
  });

  it('bấm → onClick; được chọn → aria-current; mới → hiệu ứng', async () => {
    const onClick = vi.fn();
    renderRow({}, { onClick, isSelected: true, isNew: true });
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button')).toHaveClass('animate-queue-enter');
  });

  it('AI đang phân tích → không hiện cấp độ', () => {
    renderRow({ aiPending: true });
    expect(screen.getByText(t('incidents.row.aiAnalyzing'))).toBeInTheDocument();
    expect(screen.queryByText('Cấp 2 · Trung bình')).not.toBeInTheDocument();
  });

  it('chưa phân loại → không hiện % tin cậy', () => {
    renderRow({ aiUnclassified: true });
    expect(screen.getAllByText(t('incidents.badge.unclassified')).length).toBeGreaterThan(0);
    expect(screen.queryByText(t('incidents.badge.confidence', { score: 87 }))).not.toBeInTheDocument();
  });

  it('leo thang, ngoài vùng, tag nguy cơ (ẩn tag hệ thống)', () => {
    renderRow({ isOutOfServiceArea: true, hazardTags: ['fire', 'needshumanreview'] }, { isEscalated: true });
    expect(screen.getByText(t('incidents.row.escalated'))).toBeInTheDocument();
    expect(screen.getByText(t('incidents.row.outOfArea'))).toBeInTheDocument();
    expect(screen.getByText('#Fire')).toBeInTheDocument();
    expect(screen.queryByText(/needshumanreview/i)).not.toBeInTheDocument();
  });

  it.each([
    ['Suspected', 'incidents.row.trafficSuspected'],
    ['Disputed', 'incidents.row.trafficDisputed'],
    ['Confirmed', 'incidents.row.trafficConfirmed'],
  ] as const)('ùn tắc %s → chip', (status, key) => {
    renderRow({ trafficJam: { status, evidence: null, reviewed: false, verifiedAt: null, verifiedByUserId: null } });
    expect(screen.getByText(t(key))).toBeInTheDocument();
  });

  it('BR-07: có báo cáo trùng đang gộp → badge "+N người cùng báo"; không có → ẩn', () => {
    const { unmount } = renderRow({ linkedReportCount: 2 });
    expect(screen.getByText(t('incidents.row.linkedReports', { count: 2 }))).toBeInTheDocument();
    unmount();
    renderRow();
    expect(screen.queryByText(t('incidents.row.linkedReports', { count: 0 }))).not.toBeInTheDocument();
  });

  it('ùn tắc đã bác bỏ → không hiện chip', () => {
    renderRow({ trafficJam: { status: 'Dismissed', evidence: null, reviewed: true, verifiedAt: null, verifiedByUserId: null } });
    expect(screen.queryByText(t('incidents.row.trafficConfirmed'))).not.toBeInTheDocument();
  });

  it('khóa mềm của mình / người khác / đã hết hạn', () => {
    const lock = (operatorId: string, sec: number) => ({ operatorId, operatorName: 'Chị Lan', expiresAt: new Date(NOW + sec * 1000).toISOString() });
    const { unmount } = renderRow({ lock: lock('op1', 90) });
    expect(screen.getByRole('button')).toHaveTextContent(`${t('incidents.row.youHandling')} 1:30`);
    unmount();

    const second = renderRow({ lock: lock('op2', 30) });
    expect(screen.getByRole('button')).toHaveTextContent('Chị Lan 0:30');
    expect(screen.getByRole('button')).toHaveClass('opacity-60');
    second.unmount();

    renderRow({ lock: lock('op2', -5) });
    expect(screen.getByRole('button')).not.toHaveTextContent('Chị Lan');
  });
});

describe('IncidentQueueList', () => {
  const base = {
    highlightIds: new Set<string>(),
    escalatedIds: new Set<string>(),
    selectedId: null,
    currentOperatorId: 'op1',
    onSelect: () => {},
  };

  it('đang tải', () => {
    render(<IncidentQueueList {...base} incidents={[]} isLoading />);
    expect(screen.getByText(t('incidents.queue.loading'))).toBeInTheDocument();
  });

  it('rỗng + lỗi tải', () => {
    render(<IncidentQueueList {...base} incidents={[]} loadError="Mất kết nối" />);
    expect(screen.getByText(t('incidents.queue.empty'))).toBeInTheDocument();
    expect(screen.getByText('Mất kết nối')).toBeInTheDocument();
  });

  it('không có ca leo thang → danh sách phẳng, chọn được', async () => {
    const onSelect = vi.fn();
    render(<IncidentQueueList {...base} onSelect={onSelect} incidents={[makeIncident({ id: 'a', title: 'A' }), makeIncident({ id: 'b', title: 'B' })]} />);
    expect(screen.getByText(t('incidents.queue.columnIncident'))).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('B'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('tách nhóm leo thang lên đầu', () => {
    render(
      <IncidentQueueList
        {...base}
        escalatedIds={new Set(['b'])}
        incidents={[makeIncident({ id: 'a', title: 'A' }), makeIncident({ id: 'b', title: 'B' }), makeIncident({ id: 'c', title: 'C' })]}
      />,
    );
    const escalated = screen.getByRole('region', { name: t('incidents.queue.escalatedSection') });
    const waiting = screen.getByRole('region', { name: t('incidents.queue.waitingSection') });
    expect(within(escalated).getAllByRole('button').map((b) => b.textContent)).toEqual([expect.stringContaining('B')]);
    expect(within(waiting).getAllByRole('button')).toHaveLength(2);
  });

  it('chỉ có ca leo thang → không có nhóm chờ', () => {
    render(<IncidentQueueList {...base} escalatedIds={new Set(['a'])} incidents={[makeIncident({ id: 'a' })]} />);
    expect(screen.queryByRole('region', { name: t('incidents.queue.waitingSection') })).not.toBeInTheDocument();
  });
});

describe('TrafficJamReview', () => {
  const jam = (o: Partial<IncidentTrafficJam> = {}): IncidentTrafficJam => ({
    status: 'Suspected',
    evidence: 'Xe dồn ứ 200m',
    reviewed: false,
    verifiedAt: null,
    verifiedByUserId: null,
    ...o,
  });

  it('chưa thẩm định: hiện căn cứ và gợi ý, chọn quyết định', async () => {
    const onDecisionChange = vi.fn();
    render(<TrafficJamReview trafficJam={jam()} currentOperatorId="op1" decision={null} onDecisionChange={onDecisionChange} />);
    expect(screen.getByText('Xe dồn ứ 200m')).toBeInTheDocument();
    expect(screen.getByText(t('incidents.traffic.status.Suspected'))).toBeInTheDocument();
    expect(screen.getByText(t('incidents.traffic.needsReview'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('incidents.traffic.confirm') }));
    expect(onDecisionChange).toHaveBeenCalledWith('Confirmed');
  });

  it('bấm lại quyết định đang chọn → bỏ chọn; hiện thông báo lưu khi duyệt', async () => {
    const onDecisionChange = vi.fn();
    render(<TrafficJamReview trafficJam={jam()} currentOperatorId="op1" decision="Dismissed" onDecisionChange={onDecisionChange} />);
    const dismiss = screen.getByRole('button', { name: t('incidents.traffic.dismiss') });
    expect(dismiss).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(t('incidents.traffic.savedOnApprove', { decision: t('incidents.traffic.status.Dismissed') }))).toBeInTheDocument();
    await userEvent.click(dismiss);
    expect(onDecisionChange).toHaveBeenCalledWith(null);
  });

  it('Unverified → gợi ý riêng', () => {
    render(<TrafficJamReview trafficJam={jam({ status: 'Unverified' })} currentOperatorId="op1" decision={null} onDecisionChange={() => {}} />);
    expect(screen.getByText(t('incidents.traffic.unverifiedHint'))).toBeInTheDocument();
  });

  it('đã thẩm định: ai thẩm định, nút đúng trạng thái đang bật, chọn lại không có thông báo', () => {
    const verifiedAt = '2026-10-01T03:04:00Z';
    const { rerender } = render(
      <TrafficJamReview trafficJam={jam({ status: 'Confirmed', reviewed: true, verifiedAt, verifiedByUserId: 'op1' })} currentOperatorId="op1" decision={null} onDecisionChange={() => {}} />,
    );
    expect(screen.getByText(/./, { selector: 'p.text-\\[11px\\].text-slate-500' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('incidents.traffic.confirm') })).toHaveAttribute('aria-pressed', 'true');
    rerender(
      <TrafficJamReview trafficJam={jam({ status: 'Confirmed', reviewed: true, verifiedAt, verifiedByUserId: 'op1' })} currentOperatorId="op1" decision="Confirmed" onDecisionChange={() => {}} />,
    );
    expect(screen.queryByText(/savedOnApprove/)).not.toBeInTheDocument();
  });

  it('readOnly → ẩn nút', () => {
    render(<TrafficJamReview trafficJam={jam()} currentOperatorId="op1" decision={null} onDecisionChange={() => {}} readOnly />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('IncidentMediaGallery', () => {
  it('không có media', () => {
    render(<IncidentMediaGallery media={[]} title="X" />);
    expect(screen.getByText(t('incidents.media.none'))).toBeInTheDocument();
  });

  it('1 ảnh → không có nút chuyển', () => {
    render(<IncidentMediaGallery media={[{ url: 'a.jpg', type: 'image' }]} title="X" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'a.jpg');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('nhiều media → chuyển vòng tròn và chọn thumbnail', async () => {
    const { container } = render(
      <IncidentMediaGallery
        media={[
          { url: 'a.jpg', type: 'image' },
          { url: 'b.mp4', type: 'video' },
          { url: 'c.jpg', type: 'image' },
        ]}
        title="Cháy"
      />,
    );
    expect(screen.getByAltText('Cháy (1/3)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('incidents.media.previous') }));
    expect(screen.getByAltText('Cháy (3/3)')).toHaveAttribute('src', 'c.jpg');
    await userEvent.click(screen.getByRole('button', { name: t('incidents.media.next') }));
    await userEvent.click(screen.getByRole('button', { name: t('incidents.media.next') }));
    expect(container.querySelector('video[controls]')).toHaveAttribute('src', 'b.mp4');
    await userEvent.click(screen.getByRole('button', { name: t('incidents.media.view', { index: 1 }) }));
    expect(screen.getByAltText('Cháy (1/3)')).toBeInTheDocument();
  });
});

describe('ReporterMedicalCard', () => {
  const profile = (o: Partial<ReporterMedicalProfile> = {}): ReporterMedicalProfile => ({
    bloodType: null,
    medicalNotes: null,
    chronicConditions: [],
    allergies: [],
    currentMedications: [],
    mobilityLimitations: [],
    preferredLanguage: null,
    dependentsNote: null,
    householdMembersCount: 0,
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelationship: null,
    ...o,
  });

  it('không có hồ sơ và SMS → không hiện', () => {
    const { container } = render(<ReporterMedicalCard profile={null} smsLog={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hồ sơ rỗng → thông báo trống', () => {
    render(<ReporterMedicalCard profile={profile({ bloodType: 'Unknown' })} smsLog={null} />);
    expect(screen.getByText(t('incidents.medical.empty'))).toBeInTheDocument();
  });

  it('hiện nhóm máu, danh sách, số người, liên hệ khẩn cấp, SMS', () => {
    render(
      <ReporterMedicalCard
        profile={profile({
          bloodType: 'AB_Negative',
          allergies: ['Penicillin', 'Tôm'],
          householdMembersCount: 4,
          emergencyContactName: 'Mẹ',
          emergencyContactRelationship: 'Mẹ ruột',
          emergencyContactPhone: '0909',
        })}
        smsLog="Đã gửi SMS cho Mẹ"
      />,
    );
    expect(screen.getByText('AB−')).toBeInTheDocument();
    expect(screen.getByText('Penicillin, Tôm')).toBeInTheDocument();
    expect(screen.getByText(t('incidents.medical.householdCount', { count: 4 }))).toBeInTheDocument();
    expect(screen.getByText(t('incidents.medical.ice'))).toBeInTheDocument();
    expect(screen.getByText('(Mẹ ruột)')).toBeInTheDocument();
    expect(screen.getByText('0909')).toBeInTheDocument();
    expect(screen.getByText('Đã gửi SMS cho Mẹ')).toBeInTheDocument();
    expect(screen.queryByText(t('incidents.medical.chronicConditions'))).not.toBeInTheDocument();
  });

  it('chỉ có SMS', () => {
    render(<ReporterMedicalCard profile={null} smsLog="SMS" />);
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.queryByText(t('incidents.medical.empty'))).not.toBeInTheDocument();
  });

  it('nhóm máu dương', () => {
    render(<ReporterMedicalCard profile={profile({ bloodType: 'O_Positive' })} smsLog={null} />);
    expect(screen.getByText('O+')).toBeInTheDocument();
  });
});
