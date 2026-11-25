import { useMemo } from 'react';
import { useDispatchStore } from '../context/DispatchContext';
import { useStationTeams } from './useStationTeams';
import type { Incident } from '../types/incident';

/**
 * Đầu vào cho `useDispatchRecommendations`, dùng chung Live Map và bước "Điều xe" của Hàng đợi:
 * - `neededTypes`: chức năng sự cố còn cần theo kế hoạch điều xe, trừ các tổ đang làm; kế hoạch đã đủ mà Operator vẫn
 *   giao thêm → xét lại mọi chức năng. Yêu cầu chi viện chỉ định loại xe (`preferredType`) → chỉ xét loại đó (có thể
 *   nằm ngoài kế hoạch, backend vẫn cho giao).
 * - `refreshKey`: đổi khi danh sách gợi ý có thể đổi (xe được giao / Sẵn sàng trở lại, tổ đổi người / xe, leo thang).
 */
export function useDispatchNeeds(
  incident: Incident | null,
  preferredType: string | null = null
): { neededTypes: string[]; refreshKey: string } {
  const { vehicles, escalatedIncidentIds, vehicleLimitFor } = useDispatchStore();
  const { teams } = useStationTeams();

  const resourceKey = useMemo(() => {
    const available = vehicles.filter((v) => v.status === 'available').map((v) => v.id);
    const teamStates = teams.map((team) => `${team.id}:${team.canBeAssigned}:${team.vehicleIds.join('+')}`);
    return `${available.sort().join(',')}|${teamStates.sort().join(',')}`;
  }, [vehicles, teams]);

  if (!incident) return { neededTypes: [], refreshKey: '' };

  const refreshKey = `${incident.assignedVehicleIds.join(',')}|${escalatedIncidentIds.has(incident.id)}|${resourceKey}`;
  if (preferredType) return { neededTypes: [preferredType], refreshKey };

  const { planUnits } = vehicleLimitFor(incident);
  const activeTypes = incident.assignedVehicleIds
    .filter((id) => !incident.reportedVehicleIds.includes(id))
    .map((id) => vehicles.find((v) => v.id === id)?.unitType);
  const remaining = planUnits.filter(
    (u) => u.quantity > activeTypes.filter((type) => type === u.unitTypeCode).length
  );
  const units = remaining.length > 0 ? remaining : planUnits;
  return { neededTypes: [...new Set(units.map((u) => u.unitTypeCode))], refreshKey };
}
