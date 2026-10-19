import { UserRole } from '../../types/auth';
import { ON_MISSION_VEHICLE_STATUSES } from '../../types/adminFleet';
import type { InternalRole } from '../../types/internalAccount';
import type { DutyShiftType } from '../../types/shift';
import { adminStore } from './adminStore';
import { stationsMissingShiftsToday, upcomingShiftsWithLockedStaff, type LockedStaffShift } from './shiftService';
import { clone, mockDelay } from './adminMock';

/** Xe ở trạng thái Bảo trì lâu hơn ngưỡng này thì đưa vào khối "Cần xử lý". */
export const LONG_MAINTENANCE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Nhóm trạng thái xe trên thẻ số liệu (Đang làm nhiệm vụ gộp chờ xác nhận → tại hiện trường). */
export type OverviewVehicleGroup = 'available' | 'on_mission' | 'recovering' | 'maintenance' | 'out_of_service';

export interface AdminOverview {
  generatedAt: string;
  vehicleCounts: Record<OverviewVehicleGroup, number>;
  activeStationCount: number;
  accountCounts: Record<InternalRole, number>;
  citizenCount: number;
  actionItems: {
    stationsWithoutAvailableVehicle: { id: string; name: string; vehicleCount: number }[];
    stationsWithoutHead: { id: string; name: string }[];
    failedLoginAccounts: { id: string; fullName: string; email: string; role: InternalRole; lockedUntil: string }[];
    longMaintenanceVehicles: { id: string; plate: string; stationName: string; maintenanceSince: string; days: number }[];
    vehiclesWithoutCrew: { id: string; plate: string; stationName: string }[];
    outOfServiceVehicles: { id: string; plate: string; formerStationName: string }[];
    stationsMissingShiftsToday: { id: string; name: string; missing: DutyShiftType[] }[];
    upcomingShiftsWithLockedStaff: LockedStaffShift[];
  };
}

export const overviewAdminService = {
  /** Ảnh chụp trạng thái hiện tại — không có số liệu lịch sử. */
  // TODO(backend): GET /api/Admin/overview
  async getOverview(): Promise<AdminOverview> {
    await mockDelay();
    const now = Date.now();
    const stations = adminStore.stations.filter((s) => !s.isDeleted);
    const vehicles = adminStore.vehicles.filter((v) => !v.isDeleted);
    const stationName = (id: string) => adminStore.stations.find((s) => s.id === id)?.name ?? '—';
    const countStatus = (match: (status: string) => boolean) => vehicles.filter((v) => match(v.status)).length;

    const overview: AdminOverview = {
      generatedAt: new Date(now).toISOString(),
      vehicleCounts: {
        available: countStatus((s) => s === 'available'),
        on_mission: vehicles.filter((v) => ON_MISSION_VEHICLE_STATUSES.includes(v.status)).length,
        recovering: countStatus((s) => s === 'recovering'),
        maintenance: countStatus((s) => s === 'maintenance'),
        out_of_service: countStatus((s) => s === 'out_of_service'),
      },
      activeStationCount: stations.length,
      accountCounts: {
        [UserRole.Operator]: adminStore.accounts.filter((a) => a.role === UserRole.Operator).length,
        [UserRole.RescueStaff]: adminStore.accounts.filter((a) => a.role === UserRole.RescueStaff).length,
      },
      citizenCount: adminStore.citizens.length,
      actionItems: {
        stationsWithoutAvailableVehicle: stations
          .map((s) => ({ station: s, list: vehicles.filter((v) => v.stationId === s.id) }))
          .filter(({ list }) => !list.some((v) => v.status === 'available'))
          .map(({ station, list }) => ({ id: station.id, name: station.name, vehicleCount: list.length })),

        stationsWithoutHead: stations.filter((s) => !s.headOperatorId).map((s) => ({ id: s.id, name: s.name })),

        // Khóa tạm đã hết hạn thì không tính.
        failedLoginAccounts: adminStore.accounts.flatMap((a) =>
          a.lock.kind === 'failed_login' && new Date(a.lock.until).getTime() > now
            ? [{ id: a.id, fullName: a.fullName, email: a.email, role: a.role, lockedUntil: a.lock.until }]
            : []
        ),

        longMaintenanceVehicles: vehicles.flatMap((v) => {
          if (v.status !== 'maintenance' || !v.maintenanceSince) return [];
          const days = (now - new Date(v.maintenanceSince).getTime()) / DAY_MS;
          return days > LONG_MAINTENANCE_DAYS
            ? [{ id: v.id, plate: v.plate, stationName: stationName(v.stationId), maintenanceSince: v.maintenanceSince, days: Math.floor(days) }]
            : [];
        }),

        vehiclesWithoutCrew: vehicles
          .filter((v) => !v.crewMemberId && v.status !== 'out_of_service')
          .map((v) => ({ id: v.id, plate: v.plate, stationName: stationName(v.stationId) })),

        outOfServiceVehicles: vehicles
          .filter((v) => v.status === 'out_of_service')
          .map((v) => ({ id: v.id, plate: v.plate, formerStationName: stationName(v.stationId) })),

        stationsMissingShiftsToday: stationsMissingShiftsToday(now),
        upcomingShiftsWithLockedStaff: upcomingShiftsWithLockedStaff(now),
      },
    };
    return clone(overview);
  },
};
