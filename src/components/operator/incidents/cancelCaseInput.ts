import type { BlockDuration, Incident, OperatorCancellationCode } from '../../../types/incident';

/** Nội dung phần nhập "Hủy ca" (`CancelCaseFields`). */
export interface CancelCaseInput {
  code: OperatorCancellationCode;
  note: string;
  block: boolean;
  blockDuration: BlockDuration;
}

export const EMPTY_CANCEL_INPUT: CancelCaseInput = { code: 'FalseReport', note: '', block: false, blockDuration: '30d' };

export const hasReporterPhone = (incident: Incident) => /\d/.test(incident.reporterPhone);

/** Thời hạn chặn gửi đi: null = không chặn (không tích, hoặc sự cố không có số để chặn). */
export const blockDurationOf = (incident: Incident, input: CancelCaseInput): BlockDuration | null =>
  hasReporterPhone(incident) && input.block ? input.blockDuration : null;
