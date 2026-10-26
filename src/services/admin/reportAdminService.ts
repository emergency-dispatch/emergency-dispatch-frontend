import { isAxiosError } from 'axios';
import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import type {
  IncidentHistoryItemDto,
  IncidentReportFilter,
  IncidentReportSummaryDto,
  ReportFormat,
} from '../../types/report';
import type { PageParams } from './listUtils';
import i18n from '../../i18n';

const startOfDay = (ymd: string) => new Date(`${ymd}T00:00:00`).toISOString();
const endOfDay = (ymd: string) => new Date(`${ymd}T23:59:59.999`).toISOString();

/** Tham số query chung của ba API báo cáo. */
function toParams(filter: IncidentReportFilter) {
  if (filter.fromDate && filter.toDate && filter.fromDate > filter.toDate) {
    throw new Error(i18n.t('admin.common.invalidDateRange'));
  }
  return {
    from: filter.fromDate ? startOfDay(filter.fromDate) : undefined,
    to: filter.toDate ? endOfDay(filter.toDate) : undefined,
    stationId: filter.stationId || undefined,
    status: filter.status && filter.status !== 'All' ? filter.status : undefined,
    severity: filter.severity,
    search: filter.search?.trim() || undefined,
  };
}

/** Tên file từ Content-Disposition (ưu tiên filename* dạng UTF-8). */
function fileNameFrom(disposition: string | undefined, fallback: string) {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(disposition ?? '');
  return match ? decodeURIComponent(match[1]) : fallback;
}

export const reportAdminService = {
  /** Lịch sử sự cố đã đóng (Hoàn thành / Đã hủy). Backend giới hạn 100 dòng / trang. */
  async listIncidents(filter: IncidentReportFilter, page: PageParams = {}): Promise<PaginatedResultDto<IncidentHistoryItemDto>> {
    return unwrapApi(
      apiClient.get<ApiResponse<PaginatedResultDto<IncidentHistoryItemDto>>>('/reports/incidents', {
        params: { ...toParams(filter), pageIndex: page.pageIndex ?? 1, pageSize: page.pageSize ?? 20 },
      })
    );
  },

  async getSummary(filter: IncidentReportFilter): Promise<IncidentReportSummaryDto> {
    return unwrapApi(
      apiClient.get<ApiResponse<IncidentReportSummaryDto>>('/reports/incidents/summary', { params: toParams(filter) })
    );
  },

  /**
   * Tải file CSV / PDF (tối đa 5000 dòng, PDF có ghi chú nếu bị cắt). Phải gửi token nên tải qua apiClient rồi
   * tạo link tạm, không dùng <a href>. Backend tự ghi nhật ký quản trị "Xuất báo cáo".
   */
  async exportIncidents(filter: IncidentReportFilter, format: ReportFormat): Promise<string> {
    try {
      const res = await apiClient.get<Blob>('/reports/incidents/export', {
        params: { ...toParams(filter), format },
        responseType: 'blob',
      });
      const name = fileNameFrom(res.headers['content-disposition'], `bao-cao-su-co.${format === 'Pdf' ? 'pdf' : 'csv'}`);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      return name;
    } catch (err) {
      // responseType blob → lỗi 400 của backend cũng về dạng Blob; đọc lại để lấy `message`.
      if (isAxiosError(err) && err.response?.data instanceof Blob) {
        let message: string | undefined;
        try {
          message = (JSON.parse(await err.response.data.text()) as { message?: string }).message;
        } catch {
          // Không phải JSON → giữ lỗi gốc.
        }
        if (message) throw new Error(message);
      }
      throw err;
    }
  },
};
