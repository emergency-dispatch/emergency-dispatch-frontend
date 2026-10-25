import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import type {
  AuditAction,
  AuditTrailEntryDto,
  SystemAuditAction,
  SystemAuditEntityType,
  SystemAuditLogDto,
} from '../../types/auditTrail';
import type { PageParams } from './listUtils';

export interface AuditTrailFilter {
  /** Mã sự cố đầy đủ (GUID) — backend lọc khớp chính xác. */
  incidentId?: string;
  action?: AuditAction;
  /** "yyyy-MM-dd" theo giờ địa phương, tính trọn ngày. */
  fromDate?: string;
  toDate?: string;
}

export interface SystemAuditFilter {
  entityType?: SystemAuditEntityType;
  /** Mọi bản ghi của một đối tượng (mở từ drawer chi tiết). */
  entityId?: string;
  action?: SystemAuditAction;
  /** "yyyy-MM-dd" theo giờ địa phương, tính trọn ngày. */
  fromDate?: string;
  toDate?: string;
}

export const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const startOfDay = (ymd: string) => new Date(`${ymd}T00:00:00`).toISOString();
const endOfDay = (ymd: string) => new Date(`${ymd}T23:59:59.999`).toISOString();

// Chỉ đọc: backend tự ghi nhật ký trong từng nghiệp vụ, không có API sửa hay xóa.
export const auditTrailService = {
  async list(filter: AuditTrailFilter = {}, page: PageParams = {}): Promise<PaginatedResultDto<AuditTrailEntryDto>> {
    if (filter.fromDate && filter.toDate && filter.fromDate > filter.toDate) {
      throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
    }
    // Backend ràng buộc incidentId kiểu Guid — chuỗi sai định dạng sẽ bị từ chối, nên chặn trước.
    if (filter.incidentId && !GUID_PATTERN.test(filter.incidentId)) {
      throw new Error('Mã sự cố phải là mã đầy đủ (GUID), VD 3fa85f64-5717-4562-b3fc-2c963f66afa6.');
    }
    return unwrapApi(
      apiClient.get<ApiResponse<PaginatedResultDto<AuditTrailEntryDto>>>('/audit-trail', {
        params: {
          incidentId: filter.incidentId || undefined,
          action: filter.action,
          from: filter.fromDate ? startOfDay(filter.fromDate) : undefined,
          to: filter.toDate ? endOfDay(filter.toDate) : undefined,
          pageIndex: page.pageIndex ?? 1,
          pageSize: page.pageSize ?? 20,
        },
      })
    );
  },

  /** Nhật ký thao tác quản trị (backend tự ghi khi thao tác thành công). Backend giới hạn 100 dòng / trang. */
  async listSystem(filter: SystemAuditFilter = {}, page: PageParams = {}): Promise<PaginatedResultDto<SystemAuditLogDto>> {
    if (filter.fromDate && filter.toDate && filter.fromDate > filter.toDate) {
      throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
    }
    return unwrapApi(
      apiClient.get<ApiResponse<PaginatedResultDto<SystemAuditLogDto>>>('/audit-trail/system', {
        params: {
          entityType: filter.entityType,
          entityId: filter.entityId,
          action: filter.action,
          from: filter.fromDate ? startOfDay(filter.fromDate) : undefined,
          to: filter.toDate ? endOfDay(filter.toDate) : undefined,
          pageIndex: page.pageIndex ?? 1,
          pageSize: page.pageSize ?? 20,
        },
      })
    );
  },
};
