import { UserRole } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import {
  AUDIT_ACTION_GROUP,
  type AuditAction,
  type AuditActionGroup,
  type AuditActorRole,
  type AuditTrailEntry,
} from '../../types/auditTrail';
import { adminStore } from './adminStore';
import { clone, getMockActor, mockApiError, mockDelay, normalizeText, paginate, type PageParams } from './adminMock';

export interface AuditTrailFilter {
  incidentId?: string;
  actorId?: string;
  group?: AuditActionGroup;
  action?: AuditAction;
  /** "yyyy-MM-dd" theo giờ địa phương, tính trọn ngày. */
  fromDate?: string;
  toDate?: string;
}

export interface AuditActor {
  id: string;
  name: string;
  role: AuditActorRole;
}

const startOfDay = (ymd: string) => new Date(`${ymd}T00:00:00`).getTime();
const endOfDay = (ymd: string) => new Date(`${ymd}T23:59:59.999`).getTime();

type RecordInput = Omit<AuditTrailEntry, 'id' | 'at' | 'actorId' | 'actorName' | 'actorRole' | 'incidentId' | 'changes' | 'reason'> &
  Partial<Pick<AuditTrailEntry, 'incidentId' | 'changes' | 'reason'>>;

// Chỉ đọc: không có hàm sửa hay xóa bản ghi (Immutable Audit Trail).
export const auditTrailService = {
  /**
   * Chỉ dùng trong mock: backend thật tự ghi Audit Trail bên trong từng nghiệp vụ,
   * frontend không có endpoint ghi. Các service Admin mock gọi hàm này sau mỗi thao tác cần ghi vết.
   */
  record(entry: RecordInput) {
    const actor = getMockActor();
    adminStore.auditTrail.unshift({
      id: `audit-${Date.now()}-${adminStore.auditTrail.length}`,
      at: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      actorRole: UserRole.Admin,
      incidentId: null,
      changes: [],
      reason: null,
      ...entry,
    });
  },

  // TODO(backend): GET /api/AuditTrail?incidentId=&actorId=&group=&action=&from=&to=&pageIndex=&pageSize=
  async list(filter: AuditTrailFilter = {}, page: PageParams = {}): Promise<PaginatedResultDto<AuditTrailEntry>> {
    await mockDelay();
    if (filter.fromDate && filter.toDate && filter.fromDate > filter.toDate) {
      throw mockApiError(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
    }
    const incidentQ = normalizeText(filter.incidentId ?? '');
    const from = filter.fromDate ? startOfDay(filter.fromDate) : -Infinity;
    const to = filter.toDate ? endOfDay(filter.toDate) : Infinity;

    const items = adminStore.auditTrail
      .filter((e) => !incidentQ || normalizeText(e.incidentId ?? '').includes(incidentQ))
      .filter((e) => !filter.actorId || e.actorId === filter.actorId)
      .filter((e) => !filter.group || AUDIT_ACTION_GROUP[e.action] === filter.group)
      .filter((e) => !filter.action || e.action === filter.action)
      .filter((e) => {
        const t = new Date(e.at).getTime();
        return t >= from && t <= to;
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return clone(paginate(items, page));
  },

  /** Danh sách người thao tác có trong nhật ký (cho bộ lọc). */
  // TODO(backend): GET /api/AuditTrail/actors
  async listActors(): Promise<AuditActor[]> {
    await mockDelay();
    const actors = new Map<string, AuditActor>();
    adminStore.auditTrail.forEach((e) => actors.set(e.actorId, { id: e.actorId, name: e.actorName, role: e.actorRole }));
    return clone([...actors.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
  },
};
