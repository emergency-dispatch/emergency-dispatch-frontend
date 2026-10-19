import type { PaginatedResultDto } from '../../types/incident';
import type { InternalAccount, InternalRole } from '../../types/internalAccount';
import { adminStore } from './adminStore';
import { clone, mockDelay, normalizeText, paginate, type PageParams } from './adminMock';

export interface AccountListParams extends PageParams {
  role?: InternalRole;
  search?: string;
}

// Giai đoạn này mới có hàm đọc (phục vụ chọn trưởng trạm / nhân sự xe). Màn Tài khoản nội bộ làm sau.
export const accountAdminService = {
  // TODO(backend): GET /api/Users?role=&search=&pageIndex=&pageSize=
  async listAccounts(params: AccountListParams = {}): Promise<PaginatedResultDto<InternalAccount>> {
    await mockDelay();
    const q = normalizeText(params.search ?? '');
    const items = adminStore.accounts.filter(
      (a) =>
        (!params.role || a.role === params.role) &&
        (!q || normalizeText(`${a.fullName} ${a.email} ${a.phoneNumber}`).includes(q))
    );
    return clone(paginate(items, params));
  },
};
