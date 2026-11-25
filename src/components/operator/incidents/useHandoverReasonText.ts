import { useDispatchStore } from '../../../context/DispatchContext';
import type { Incident } from '../../../types/incident';
import type { HandoverReason } from './autoDispatchVerdict';
import { useTranslation } from '../../../i18n';

/** Câu đầy đủ "vì sao AI chuyển ca cho người" — modal tin báo mới, panel thẩm định, tooltip thẻ ca. */
export function useHandoverReasonText(): (incident: Incident, reason: HandoverReason, threshold: number | null) => string {
  const { t } = useTranslation();
  const { currentOperatorId } = useDispatchStore();
  return (incident, reason, threshold) => {
    const backendNote =
      reason === 'skipped' ? incident.autoDispatch?.note : reason === 'other' ? incident.autoDispatchNotEligibleNote : null;
    if (backendNote) return backendNote;
    const lockName =
      incident.lock?.operatorId === currentOperatorId
        ? t('layout.incomingIncident.you')
        : incident.lock?.operatorName || t('layout.incomingIncident.anotherOperator');
    // §35: lý do "đang giữ ca" do backend lưu có thể đến sau khi khóa đã nhả → không biết ai giữ.
    const reasonKey = reason === 'operatorHandling' && !incident.lock ? 'operatorHandlingNoName' : reason;
    return t(`layout.incomingIncident.reasons.${reasonKey}`, {
      confidence: incident.confidenceScore,
      threshold: threshold ?? 0,
      name: lockName,
    });
  };
}
