import type { AuditTrailEntry } from '../../types/auditTrail';
import { adminStore } from './adminStore';
import { getMockActor } from './adminMock';

export const auditTrailService = {
  /**
   * Chỉ dùng trong mock: backend thật tự ghi Audit Trail bên trong từng nghiệp vụ,
   * frontend không có endpoint ghi. Các service Admin mock gọi hàm này sau mỗi thao tác cần ghi vết.
   */
  record(entry: Omit<AuditTrailEntry, 'id' | 'at' | 'actorId' | 'actorName' | 'incidentId'> & { incidentId?: string | null }) {
    const actor = getMockActor();
    adminStore.auditTrail.unshift({
      id: `audit-${Date.now()}-${adminStore.auditTrail.length}`,
      at: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      incidentId: null,
      ...entry,
    });
  },
};
