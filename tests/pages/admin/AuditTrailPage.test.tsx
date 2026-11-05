import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditTrailPage from '@/pages/admin/AuditTrailPage';
import { auditTrailService } from '@/services/admin/auditTrailService';
import { page, renderWithRouter, t } from '../../setup/render';
import type { AuditTrailEntryDto, SystemAuditLogDto } from '@/types/auditTrail';

vi.mock('@/services/admin/auditTrailService', async (orig) => ({
  ...(await orig<typeof import('@/services/admin/auditTrailService')>()),
  auditTrailService: { list: vi.fn(), listSystem: vi.fn() },
}));

const svc = vi.mocked(auditTrailService);
const GUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

const entry = (o: Partial<AuditTrailEntryDto>): AuditTrailEntryDto => ({
  id: 'e1',
  incidentId: GUID,
  incidentTitle: 'Cháy kho',
  actorId: 'op1',
  actorName: 'Op Lan',
  actorRole: 'Operator',
  action: 'Verified',
  description: 'Xác minh Cấp 3',
  oldStateJson: '{"status":"Pending"}',
  newStateJson: '{"status":"Verified"}',
  timestamp: '2026-10-01T01:02:03Z',
  ...o,
});

const sysLog = (o: Partial<SystemAuditLogDto>): SystemAuditLogDto => ({
  id: 'x1',
  actorId: 'ad',
  actorName: 'Admin',
  actorRole: 'Admin',
  action: 'Updated',
  entityType: 'Station',
  entityId: 'st-1',
  entityName: 'Trạm A',
  description: 'Sửa trạm',
  oldValueJson: '{"name":"Trạm A","radius":5,"phone":"114"}',
  newValueJson: '{"name":"Trạm A2","radius":5,"phone":"114"}',
  ipAddress: '10.0.0.1',
  timestamp: '2026-10-01T01:00:00Z',
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  svc.list.mockResolvedValue(page([entry({})]) as never);
  svc.listSystem.mockResolvedValue(page([sysLog({})]) as never);
});

describe('AuditTrailPage – tab sự cố', () => {
  it('mặc định tab sự cố; mã sự cố từ URL', async () => {
    renderWithRouter(<AuditTrailPage />, `/admin/audit-trail?incident=${GUID}&action=Verified`);
    expect(screen.getByRole('tab', { name: t('admin.monitoring.audit.tabs.incident') })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Xác minh Cấp 3')).toBeInTheDocument();
    expect(svc.list).toHaveBeenCalledWith({ incidentId: GUID, action: 'Verified', fromDate: undefined, toDate: undefined }, { pageIndex: 1, pageSize: 20 });
  });

  it('mã sự cố gõ dở → nhắc và chưa lọc', async () => {
    renderWithRouter(<AuditTrailPage />);
    await screen.findByText('Xác minh Cấp 3');
    await userEvent.type(screen.getByPlaceholderText(t('admin.monitoring.audit.incidentIdPlaceholder')), '3fa85f64');
    expect(await screen.findByText(t('admin.monitoring.audit.incidentIdInvalid'))).toBeInTheDocument();
    expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ incidentId: undefined }), expect.anything());
  });

  it('drawer chi tiết: trước → sau, lọc theo sự cố', async () => {
    renderWithRouter(<AuditTrailPage />);
    await userEvent.click(await screen.findByText('Xác minh Cấp 3'));
    const drawer = screen.getByRole('dialog', { name: t('admin.monitoring.audit.detailTitle') });
    expect(within(drawer).getByText('Pending')).toBeInTheDocument();
    expect(within(drawer).getByText('Verified')).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole('button', { name: t('admin.monitoring.audit.viewIncidentRecords') }));
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ incidentId: GUID }), expect.anything()));
  });

  it('thẩm định ùn tắc hiện đúng nhãn', async () => {
    svc.list.mockResolvedValue(page([entry({ action: 'StatusChanged', newStateJson: '{"trafficJamStatus":"Dismissed"}', description: 'Ùn tắc' })]) as never);
    renderWithRouter(<AuditTrailPage />);
    expect(await screen.findByText(t('admin.monitoring.audit.trafficJamAction.Dismissed'))).toBeInTheDocument();
  });

  it('lỗi tải', async () => {
    svc.list.mockRejectedValue(new Error('Không có quyền'));
    renderWithRouter(<AuditTrailPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không có quyền');
  });
});

describe('AuditTrailPage – tab quản trị', () => {
  it('chuyển tab → tải nhật ký quản trị', async () => {
    renderWithRouter(<AuditTrailPage />);
    await screen.findByText('Xác minh Cấp 3');
    await userEvent.click(screen.getByRole('tab', { name: t('admin.monitoring.audit.tabs.system') }));
    expect(await screen.findByText('Sửa trạm')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: t('admin.monitoring.audit.tabs.system') })).toHaveAttribute('aria-selected', 'true');
  });

  it('drawer so sánh trước/sau, ẩn trường không đổi, lọc theo đối tượng', async () => {
    renderWithRouter(<AuditTrailPage />, '/admin/audit-trail?tab=system&entityType=Station');
    await userEvent.click(await screen.findByText('Sửa trạm'));
    expect(svc.listSystem).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'Station' }), expect.anything());
    const drawer = screen.getByRole('dialog', { name: t('admin.monitoring.audit.system.detailTitle') });
    expect(within(drawer).getByText('10.0.0.1')).toBeInTheDocument();
    expect(within(drawer).getByText('Trạm A2')).toBeInTheDocument();
    const toggle = within(drawer).getByRole('button', { name: t('admin.monitoring.audit.system.showUnchanged', { count: 2 }) });
    await userEvent.click(toggle);
    expect(within(drawer).getAllByText('114').length).toBeGreaterThan(0);
    await userEvent.click(within(drawer).getByRole('button', { name: t('admin.monitoring.audit.system.viewEntityRecords') }));
    await waitFor(() => expect(svc.listSystem).toHaveBeenLastCalledWith(expect.objectContaining({ entityId: 'st-1' }), expect.anything()));
    await userEvent.click(screen.getByRole('button', { name: t('admin.monitoring.audit.system.clearEntity') }));
    await waitFor(() => expect(svc.listSystem).toHaveBeenLastCalledWith(expect.objectContaining({ entityId: undefined }), expect.anything()));
  });

  it('bản ghi tạo mới chỉ có "sau"', async () => {
    svc.listSystem.mockResolvedValue(page([sysLog({ action: 'Created', oldValueJson: null, description: 'Tạo trạm' })]) as never);
    renderWithRouter(<AuditTrailPage />, '/admin/audit-trail?tab=system');
    await userEvent.click(await screen.findByText('Tạo trạm'));
    expect(screen.getByText(t('admin.monitoring.audit.system.afterOnly'))).toBeInTheDocument();
  });
});
