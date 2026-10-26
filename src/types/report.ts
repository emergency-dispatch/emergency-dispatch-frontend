import type { BackendIncidentStatus, BackendSeverityLevel, CancellationReasonCode } from './incident';

// Mirror EmergencyDispatch.Application.DTOs.Report (enum trả về dạng chuỗi). Chỉ Admin dùng (Operator gọi bị 403).

/** Nhóm trạng thái của sự cố đã đóng. */
export type ClosedIncidentFilter = 'All' | 'Completed' | 'Cancelled';

export type ReportFormat = 'Csv' | 'Pdf';

/** Bộ lọc chung của /reports/incidents, /summary và /export. */
export interface IncidentReportFilter {
  /** "yyyy-MM-dd" theo giờ địa phương, lọc theo thời điểm báo cáo, tính trọn ngày. */
  fromDate?: string;
  toDate?: string;
  /** Trạm có xe tham gia xử lý. */
  stationId?: string;
  status?: ClosedIncidentFilter;
  severity?: BackendSeverityLevel;
  /** Tìm theo tiêu đề hoặc địa chỉ. */
  search?: string;
}

export interface IncidentHistoryItemDto {
  id: string;
  title: string;
  locationAddress: string;
  severity: BackendSeverityLevel;
  aiSeverityScore: number | null;
  status: BackendIncidentStatus;
  cancellationReason: CancellationReasonCode | null;
  resolutionSummary: string | null;
  reportedAt: string;
  verifiedAt: string | null;
  firstDispatchedAt: string | null;
  firstArrivedAt: string | null;
  closedAt: string | null;
  /** Từ lúc báo đến khi xe đầu tiên tới hiện trường (phút). */
  responseMinutes: number | null;
  /** Từ lúc báo đến khi đóng sự cố (phút). */
  resolutionMinutes: number | null;
  verifiedByName: string | null;
  closedByName: string | null;
  stations: string[];
  /** Biển số các xe tham gia. */
  units: string[];
}

export interface IncidentReportSummaryDto {
  total: number;
  completed: number;
  cancelled: number;
  /** Khóa là tên mức độ backend ("Unclassified", "Level1"…). */
  bySeverity: Record<string, number>;
  avgResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}
