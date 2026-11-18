import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import type { CompletionReportFilter, CompletionReportHistoryItemDto } from '../../types/report';
import type { PageParams } from './listUtils';
import i18n from '../../i18n';

const startOfDay = (ymd: string) => new Date(`${ymd}T00:00:00`).toISOString();
const endOfDay = (ymd: string) => new Date(`${ymd}T23:59:59.999`).toISOString();

/** Tổ của trạm (chỉ id + tên) cho ô lọc theo tổ. */
export interface TeamOption {
  id: string;
  name: string;
}

/** §36: lịch sử báo cáo nghiệm thu — chỉ đọc. Backend giới hạn 100 dòng / trang, mới nhất trước. */
export const completionReportAdminService = {
  async list(
    filter: CompletionReportFilter,
    page: PageParams = {}
  ): Promise<PaginatedResultDto<CompletionReportHistoryItemDto>> {
    if (filter.fromDate && filter.toDate && filter.fromDate > filter.toDate) {
      throw new Error(i18n.t('admin.common.invalidDateRange'));
    }
    return unwrapApi(
      apiClient.get<ApiResponse<PaginatedResultDto<CompletionReportHistoryItemDto>>>('/dispatch/completion-reports', {
        params: {
          from: filter.fromDate ? startOfDay(filter.fromDate) : undefined,
          to: filter.toDate ? endOfDay(filter.toDate) : undefined,
          stationId: filter.stationId || undefined,
          teamId: filter.teamId || undefined,
          incidentId: filter.incidentId || undefined,
          search: filter.search?.trim() || undefined,
          pageIndex: page.pageIndex ?? 1,
          pageSize: page.pageSize ?? 20,
        },
      })
    );
  },

  /** Tổ hiện có của một trạm (tổ đã giải thể không còn trong danh sách — lọc theo tổ chỉ áp cho tổ đang có). */
  async listTeams(stationId: string): Promise<TeamOption[]> {
    const teams = await unwrapApi(
      apiClient.get<ApiResponse<{ id: string; name: string }[]>>(`/stations/${stationId}/teams`)
    );
    return teams.map((t) => ({ id: t.id, name: t.name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  },
};
