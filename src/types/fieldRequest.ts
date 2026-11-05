// §21.2 Yêu cầu từ hiện trường — mirror EmergencyDispatch.Application.DTOs.Incident (FollowUpDtos.cs).
import type { BackendSeverityLevel } from './incident';
import type { RescueUnitType } from './rescueUnit';

/** Backup = cần thêm xe; Other = vấn đề khác (mô tả bắt buộc). */
export type FieldRequestType = 'Backup' | 'Other';

export type FieldRequestStatus = 'Open' | 'Acknowledged' | 'Fulfilled' | 'Declined' | 'Cancelled';

/** Mirror FieldRequestDto (GET /api/field-requests, payload ReceiveFieldRequest). */
export interface FieldRequestDto {
  id: string;
  incidentId: string;
  incidentTitle?: string | null;
  incidentAddress?: string | null;
  incidentSeverity?: BackendSeverityLevel | null;
  responsibleStationId?: string | null;
  assignmentId: string;
  rescueUnitId: string;
  plateNumber?: string | null;
  unitStationId: string;
  requestedByUserId: string;
  requestedByName?: string | null;
  type: FieldRequestType;
  status: FieldRequestStatus;
  /** (Backup) loại xe đội xin thêm; null = để Operator chọn. */
  requestedUnitType?: RescueUnitType | null;
  /** (Backup) số xe 1–5. */
  quantity: number;
  description?: string | null;
  createdAt: string;
  acknowledgedByUserId?: string | null;
  acknowledgedAt?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  responseNote?: string | null;
  /** Quá ngưỡng chờ (escalation.fieldRequestThresholdMinutes) mà chưa xử lý; null = chưa quá hạn. */
  escalatedAt?: string | null;
  ageMinutes?: number;
}

export type FieldRequestAction = 'Created' | 'Acknowledged' | 'Fulfilled' | 'Declined' | 'Cancelled' | 'Escalated';

/** Mirror FieldRequestEventDto — sự kiện ReceiveFieldRequest. */
export interface FieldRequestEventDto {
  action: FieldRequestAction;
  request: FieldRequestDto;
  changedAt: string;
}

/** Còn chờ Operator xử lý (panel "Yêu cầu từ hiện trường" chỉ hiện các yêu cầu này). */
export const isOpenFieldRequest = (r: Pick<FieldRequestDto, 'status'>) =>
  r.status === 'Open' || r.status === 'Acknowledged';
