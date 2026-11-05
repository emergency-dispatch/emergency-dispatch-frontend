import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EscalationSettingsPage from '@/pages/admin/EscalationSettingsPage';
import { escalationService } from '@/services/admin/escalationService';
import { adminSettingsService } from '@/services/admin/adminSettingsService';
import { renderWithRouter, t } from '../../setup/render';
import type { EscalationLogDto, EscalationRuleDto } from '@/types/escalation';

vi.mock('@/services/admin/escalationService', async (orig) => ({
  ...(await orig<typeof import('@/services/admin/escalationService')>()),
  escalationService: { listRules: vi.fn(), listLogs: vi.fn(), createRule: vi.fn(), updateRule: vi.fn(), setActive: vi.fn(), deleteRule: vi.fn(), triggerCheck: vi.fn() },
}));
vi.mock('@/services/admin/adminSettingsService', async (orig) => ({
  ...(await orig<typeof import('@/services/admin/adminSettingsService')>()),
  adminSettingsService: { getEscalationSettings: vi.fn(), getDispatchSettings: vi.fn(), updateEscalationSettings: vi.fn(), getDefaults: vi.fn() },
}));

const esc = vi.mocked(escalationService);
const settings = vi.mocked(adminSettingsService);
const escValues = { dayThresholdMinutes: 5, nightThresholdMinutes: 2.5, nightStart: '22:00', nightEnd: '06:00', radiusMultiplier: 2, maxRadiusKm: 30 };

const rule = (o: Partial<EscalationRuleDto>): EscalationRuleDto => ({
  id: 'r',
  minSeverityLevel: 'Level3',
  timeoutMinutes: 5,
  notifyRoles: '["Operator","Admin"]',
  expandRadiusPercent: 0,
  isActive: true,
  description: 'Cấp 3 cần báo ngay',
  createdAt: '',
  updatedAt: null,
  ...o,
});

const log = (o: Partial<EscalationLogDto>): EscalationLogDto => ({
  id: 'l',
  incidentId: 'abcdef12-0000',
  incidentTitle: 'Cháy xưởng',
  incidentSeverity: 'Level3',
  incidentStatus: 'Escalated',
  escalationRuleId: 'r',
  escalationLevel: 1,
  notifiedRoles: null,
  notifiedUserIds: null,
  actionTaken: 'Mở rộng bán kính',
  triggerTime: '2026-10-01T03:00:00Z',
  resolvedAt: null,
  resolutionTimeMs: null,
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  settings.getEscalationSettings.mockResolvedValue({ values: escValues, updatedAt: null, updatedByName: null });
  settings.getDispatchSettings.mockResolvedValue({ values: { radiusStepsKm: [10, 15] } as never, updatedAt: null, updatedByName: null });
  esc.listRules.mockResolvedValue([rule({ id: 'r1' }), rule({ id: 'r2', minSeverityLevel: 'Level1', isActive: false, notifyRoles: '[]', description: null })]);
  esc.listLogs.mockResolvedValue({ items: [log({ id: 'l1' }), log({ id: 'l2', incidentTitle: null, resolvedAt: '2026-10-01T03:10:00Z', resolutionTimeMs: 600000 })], hasNextPage: true });
});

const ruleRow = (text: string) => screen.getByText(text).closest('tr')!;

describe('EscalationSettingsSection', () => {
  it('cấu hình ngưỡng: mô tả ca đêm qua nửa đêm, lỗi bước 0.5, lưu', async () => {
    settings.updateEscalationSettings.mockResolvedValue({ values: escValues, updatedAt: 'x', updatedByName: null });
    renderWithRouter(<EscalationSettingsPage />);
    expect(await screen.findByText(t('admin.settings.escalation.nightOvernight', { start: '22:00', end: '06:00' }))).toBeInTheDocument();
    const [day] = screen.getAllByRole('spinbutton');
    await userEvent.clear(day);
    await userEvent.type(day, '3.3');
    expect(screen.getByText(t('admin.settings.validation.halfStep'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('admin.common.settings.save') })).toBeDisabled();
    await userEvent.clear(day);
    await userEvent.type(day, '3.5');
    fireEvent.change(screen.getByLabelText(t('admin.settings.escalation.nightStart')), { target: { value: '01:00' } });
    expect(screen.getByText(t('admin.settings.escalation.nightSameDay', { start: '01:00', end: '06:00' }))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.settings.save') }));
    expect(settings.updateEscalationSettings).toHaveBeenCalledWith({ ...escValues, dayThresholdMinutes: 3.5, nightStart: '01:00' });
  });

  it('bán kính tối đa nhỏ hơn nấc điều phối cuối → lỗi', async () => {
    renderWithRouter(<EscalationSettingsPage />);
    await screen.findByText(t('admin.settings.escalation.radiusTitle'));
    const max = screen.getAllByRole('spinbutton')[3];
    await userEvent.clear(max);
    await userEvent.type(max, '12');
    expect(screen.getByText(t('admin.settings.validation.maxBelowLastStep', { km: 15 }))).toBeInTheDocument();
  });
});

describe('EscalationSettingsPage – quy tắc', () => {
  it('liệt kê quy tắc và vai trò nhận cảnh báo', async () => {
    renderWithRouter(<EscalationSettingsPage />);
    expect(await screen.findByText('Cấp 3 cần báo ngay')).toBeInTheDocument();
    expect(screen.getByText(t('admin.settings.escalation.rules.activeCount', { active: 1, total: 2 }))).toBeInTheDocument();
    expect(
      screen.getByText([t('admin.settings.escalation.notifyRole.Operator'), t('admin.settings.escalation.notifyRole.Admin')].join(', ')),
    ).toBeInTheDocument();
  });

  it('bật / tắt quy tắc', async () => {
    esc.setActive.mockResolvedValue(rule({}));
    renderWithRouter(<EscalationSettingsPage />);
    await screen.findByText('Cấp 3 cần báo ngay');
    await userEvent.click(within(ruleRow('Cấp 3 cần báo ngay')).getByRole('button', { name: t('admin.settings.escalation.rules.disable') }));
    expect(esc.setActive).toHaveBeenCalledWith('r1', false);
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.settings.escalation.rules.disabled'));
  });

  it('xóa quy tắc đang bật duy nhất → cảnh báo', async () => {
    esc.deleteRule.mockResolvedValue();
    renderWithRouter(<EscalationSettingsPage />);
    await screen.findByText('Cấp 3 cần báo ngay');
    await userEvent.click(within(ruleRow('Cấp 3 cần báo ngay')).getByRole('button', { name: t('admin.settings.escalation.rules.delete') }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(t('admin.settings.escalation.rules.deleteLastActive'))).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: t('admin.settings.escalation.rules.delete') }));
    expect(esc.deleteRule).toHaveBeenCalledWith('r1');
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.settings.escalation.rules.deleted'));
  });

  it('quét ngay', async () => {
    esc.triggerCheck.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    renderWithRouter(<EscalationSettingsPage />);
    await screen.findByText('Cấp 3 cần báo ngay');
    await userEvent.click(screen.getByRole('button', { name: t('admin.settings.escalation.rules.scanNow') }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('admin.settings.escalation.rules.scanNow') }));
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.settings.escalation.rules.scanResult', { count: 3 }));
    await userEvent.click(screen.getByRole('button', { name: t('admin.settings.escalation.rules.scanNow') }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('admin.settings.escalation.rules.scanNow') }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(t('admin.settings.escalation.rules.scanNone')));
  });

  it('thêm quy tắc: bắt buộc chọn vai trò', async () => {
    esc.createRule.mockResolvedValue(rule({}));
    renderWithRouter(<EscalationSettingsPage />);
    await screen.findByText('Cấp 3 cần báo ngay');
    await userEvent.click(screen.getByRole('button', { name: t('admin.settings.escalation.rules.add') }));
    const drawer = screen.getByRole('heading', { name: t('admin.settings.escalation.ruleForm.addTitle') }).closest('aside')!;
    const save = within(drawer).getByRole('button', { name: t('admin.settings.escalation.ruleForm.save') });
    const [operator, admin] = within(drawer).getAllByRole('checkbox');
    await userEvent.click(operator);
    await userEvent.click(admin);
    expect(save).toBeDisabled();
    expect(within(drawer).getByText(t('admin.settings.validation.notifyRolesRequired'))).toBeInTheDocument();
    await userEvent.click(admin);
    await userEvent.type(within(drawer).getByRole('textbox'), 'Báo Admin');
    await userEvent.click(save);
    expect(esc.createRule).toHaveBeenCalledWith({ minSeverityLevel: 'Level3', notifyRoles: ['Admin'], isActive: true, description: 'Báo Admin' });
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.settings.escalation.rules.added'));
  });

  it('sửa quy tắc', async () => {
    esc.updateRule.mockResolvedValue(rule({}));
    renderWithRouter(<EscalationSettingsPage />);
    await screen.findByText('Cấp 3 cần báo ngay');
    await userEvent.click(within(ruleRow('Cấp 3 cần báo ngay')).getByRole('button', { name: t('admin.settings.escalation.rules.edit') }));
    await userEvent.click(screen.getByRole('button', { name: t('admin.settings.escalation.ruleForm.save') }));
    expect(esc.updateRule).toHaveBeenCalledWith('r1', expect.objectContaining({ notifyRoles: ['Operator', 'Admin'] }));
  });
});

describe('EscalationSettingsPage – nhật ký', () => {
  it('hiện nhật ký, chưa giải quyết / đã giải quyết, phân trang', async () => {
    renderWithRouter(<EscalationSettingsPage />);
    expect(await screen.findByText('Cháy xưởng')).toBeInTheDocument();
    expect(screen.getByText(t('admin.monitoring.incident.missing'))).toBeInTheDocument();
    expect(screen.getByText(t('admin.settings.escalation.logs.notYet'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t('admin.settings.escalation.logs.resolvedAfter', { minutes: 10 }).trim()))).toBeInTheDocument();
    expect(screen.getByText(t('admin.settings.escalation.logs.range', { from: 1, to: 2 }))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('common.nextPage') }));
    await waitFor(() => expect(esc.listLogs).toHaveBeenLastCalledWith(2, 10));
  });

  it('trang trống sau trang 1', async () => {
    esc.listLogs.mockResolvedValueOnce({ items: [log({})], hasNextPage: true }).mockResolvedValue({ items: [], hasNextPage: false });
    renderWithRouter(<EscalationSettingsPage />);
    await screen.findByText('Cháy xưởng');
    await userEvent.click(screen.getByRole('button', { name: t('common.nextPage') }));
    expect(await screen.findByText(t('admin.settings.escalation.logs.emptyPage'))).toBeInTheDocument();
  });
});
