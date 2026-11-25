import { useCallback } from 'react';
import { useDispatchStore } from '../context/DispatchContext';
import { planProgress, type PlanProgressItem } from '../utils/dispatchPlan';
import type { Incident } from '../types/incident';

export interface IncidentPlanProgress {
  /** Mọi chức năng trong kế hoạch, theo thứ tự ưu tiên; rỗng = chưa có kế hoạch. */
  items: PlanProgressItem[];
  /**
   * Chức năng còn thiếu tổ và vẫn còn chỗ trong giới hạn BR-14. Đã đủ số tổ (kể cả Operator cố ý giao tổ ngoài kế
   * hoạch, có ghi lý do) thì không coi là thiếu nữa.
   */
  missing: PlanProgressItem[];
}

/** Kế hoạch điều xe của một ca đã được đáp ứng tới đâu — dùng chung Chi tiết ca, Theo dõi ca và gợi ý tổ. */
export function usePlanProgress(): (incident: Incident) => IncidentPlanProgress {
  const { vehicleLimitFor, assignmentsByIncident } = useDispatchStore();
  return useCallback(
    (incident) => {
      const limit = vehicleLimitFor(incident);
      const counted = new Set(incident.assignedVehicleIds);
      // Lấy loại xe từ lượt điều xe: có cả xe trạm khác, xe đã xóa, loại xe không vẽ trên bản đồ.
      const assignedTypes = (assignmentsByIncident.get(incident.id) ?? [])
        .filter((a) => counted.has(a.rescueUnitId) && a.status !== 'Rejected' && a.status !== 'Cancelled')
        .flatMap((a) => (a.rescueUnit ? [a.rescueUnit.unitType] : []));
      const items = planProgress(limit.planUnits, assignedTypes);
      const hasRoom = incident.assignedVehicleIds.length < limit.max;
      return { items, missing: hasRoom ? items.filter((item) => item.missing > 0) : [] };
    },
    [vehicleLimitFor, assignmentsByIncident]
  );
}
