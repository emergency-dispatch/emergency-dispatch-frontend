import type { CompletionReportDto } from './dispatch';
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
  /** §38: mã sự cố hiển thị SC-yyMMdd-NNNN. */
  code?: string;
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

/** §36: bộ lọc GET /api/dispatch/completion-reports (Admin xem toàn bộ, lọc trạm tùy chọn). */
export interface CompletionReportFilter {
  /** "yyyy-MM-dd" theo giờ địa phương, lọc theo thời điểm nộp báo cáo, tính trọn ngày. */
  fromDate?: string;
  toDate?: string;
  stationId?: string;
  teamId?: string;
  incidentId?: string;
  /** Nội dung xử lý, tiêu đề, địa chỉ hoặc mã sự cố. */
  search?: string;
}

/** §36: một xe / lượt điều phối được báo cáo hoàn tất. */
export interface CompletionReportUnitDto {
  assignmentId: string;
  rescueUnitId: string;
  plateNumber: string;
  unitType: string;
  dispatchedAt: string;
  arrivedAt: string | null;
  completedAt: string | null;
}

/** §36: CompletionReportDto + sự cố + trạm + người nộp + các xe được hoàn tất. */
export interface CompletionReportHistoryItemDto extends CompletionReportDto {
  incidentId: string;
  incidentCode: string;
  incidentTitle: string;
  incidentAddress: string;
  incidentStatus: BackendIncidentStatus | null;
  incidentSeverity: BackendSeverityLevel | null;
  incidentClosedAt: string | null;
  stationId: string | null;
  stationName: string | null;
  submittedByName: string | null;
  units: CompletionReportUnitDto[];
}
