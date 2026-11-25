import type { DispatchPlanUnitDto } from '../types/typeCatalog';

/** Tiến độ một chức năng trong kế hoạch điều xe của sự cố (§32, `quantity` = số tổ). */
export interface PlanProgressItem {
  unitType: string;
  /** Tên backend trả kèm kế hoạch — dùng khi loại xe không còn trong danh mục. */
  unitTypeName?: string | null;
  quantity: number;
  assigned: number;
  missing: number;
}

/** `assignedTypes`: loại xe của các lượt đang chạy + đã nghiệm thu (tổ làm xong vẫn tính là đã đáp ứng kế hoạch). */
export function planProgress(planUnits: readonly DispatchPlanUnitDto[], assignedTypes: readonly string[]): PlanProgressItem[] {
  return planUnits.map((u) => {
    const assigned = assignedTypes.filter((type) => type === u.unitTypeCode).length;
    return {
      unitType: u.unitTypeCode,
      unitTypeName: u.unitTypeName,
      quantity: u.quantity,
      assigned,
      missing: Math.max(0, u.quantity - assigned),
    };
  });
}

/** Giá trị `assigningTeamId` khi đang giao nhiều tổ một lệnh. */
export const ASSIGNING_MANY = '__many__';
