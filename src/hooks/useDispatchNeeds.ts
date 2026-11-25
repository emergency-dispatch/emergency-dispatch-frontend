import { useMemo } from 'react';
import { useDispatchStore } from '../context/DispatchContext';
import { usePlanProgress } from './usePlanProgress';
import { useStationTeams } from './useStationTeams';
import type { Incident } from '../types/incident';

/**
 * Đầu vào cho `useDispatchRecommendations`, dùng chung Live Map và bước "Điều xe" của Hàng đợi:
 * - `neededTypes`: chức năng sự cố còn cần theo kế hoạch điều xe, trừ các tổ đã giao; kế hoạch đã đủ mà Operator vẫn
 *   giao thêm → xét lại mọi chức năng. Yêu cầu chi viện chỉ định loại xe (`preferredType`) → chỉ xét loại đó (có thể
 *   nằm ngoài kế hoạch, backend vẫn cho giao).
 * - `refreshKey`: đổi khi danh sách gợi ý có thể đổi (xe được giao / Sẵn sàng trở lại, tổ đổi người / xe, leo thang).
 */
export function useDispatchNeeds(
  incident: Incident | null,
  preferredType: string | null = null
): { neededTypes: string[]; refreshKey: string } {
  const { vehicles, escalatedIncidentIds } = useDispatchStore();
  const progressOf = usePlanProgress();
  const { teams } = useStationTeams();

  const resourceKey = useMemo(() => {
    // Kèm tọa độ làm tròn ~1 km: backend lọc theo GPS lưu nên xe rảnh đổi chỗ thì gợi ý cũng đổi.
    const available = vehicles
      .filter((v) => v.status === 'available')
      .map((v) => `${v.id}@${v.lat.toFixed(2)},${v.lng.toFixed(2)}`);
    const teamStates = teams.map((team) => `${team.id}:${team.canBeAssigned}:${team.vehicleIds.join('+')}`);
    return `${available.sort().join(',')}|${teamStates.sort().join(',')}`;
  }, [vehicles, teams]);

  if (!incident) return { neededTypes: [], refreshKey: '' };

  const refreshKey = `${incident.assignedVehicleIds.join(',')}|${escalatedIncidentIds.has(incident.id)}|${resourceKey}`;
  if (preferredType) return { neededTypes: [preferredType], refreshKey };

  const { items } = progressOf(incident);
  const remaining = items.filter((item) => item.missing > 0);
  return { neededTypes: (remaining.length > 0 ? remaining : items).map((item) => item.unitType), refreshKey };
}
