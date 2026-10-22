import { UserRole } from '../../types/auth';
import { ON_MISSION_UNIT_STATUSES } from '../../types/rescueUnit';
import type { InternalRole } from '../../types/internalAccount';
import { accountAdminService } from './accountAdminService';
import { stationAdminService } from './stationAdminService';
import { vehicleAdminService } from './vehicleAdminService';

/** Xe ở trạng thái Bảo trì lâu hơn ngưỡng này thì đưa vào khối "Cần xử lý". */
export const LONG_MAINTENANCE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Nhóm trạng thái xe trên thẻ số liệu (Đang làm nhiệm vụ = Đã điều động + Tại hiện trường + Đang quay về). */
export type OverviewVehicleGroup = 'Available' | 'on_mission' | 'CoolDown' | 'Maintenance' | 'OutOfService';

export interface AdminOverview {
  generatedAt: string;
  vehicleCounts: Record<OverviewVehicleGroup, number>;
  activeStationCount: number;
  accountCounts: Record<InternalRole, number>;
  citizenCount: number;
  actionItems: {
    stationsWithoutAvailableVehicle: { id: string; name: string; vehicleCount: number }[];
    /** Backend chưa lưu thời điểm bắt đầu bảo trì → ước lượng bằng lần cập nhật cuối của xe. */
    longMaintenanceVehicles: { id: string; plate: string; stationName: string; maintenanceSince: string; days: number }[];
    /** Xe ngừng hoạt động (thường do trạm cũ bị xóa) — cần chuyển sang trạm mới. */
    outOfServiceVehicles: { id: string; plate: string; stationName: string }[];
  };
}

export const overviewAdminService = {
  /** Ảnh chụp trạng thái hiện tại (trạm, xe, số tài khoản) — không có số liệu lịch sử. */
  async getOverview(): Promise<AdminOverview> {
    const [stationPage, units, operators, rescueStaff, citizens] = await Promise.all([
      stationAdminService.list({ pageIndex: 1, pageSize: 1000 }),
      vehicleAdminService.listAll(),
      accountAdminService.countByRole(UserRole.Operator),
      accountAdminService.countByRole(UserRole.RescueStaff),
      accountAdminService.countByRole(UserRole.Citizen),
    ]);
    const now = Date.now();
    const stations = stationPage.items;
    const countStatus = (match: (u: (typeof units)[number]) => boolean) => units.filter(match).length;

    return {
      generatedAt: new Date(now).toISOString(),
      vehicleCounts: {
        Available: countStatus((u) => u.status === 'Available'),
        on_mission: countStatus((u) => ON_MISSION_UNIT_STATUSES.includes(u.status)),
        CoolDown: countStatus((u) => u.status === 'CoolDown'),
        Maintenance: countStatus((u) => u.status === 'Maintenance'),
        OutOfService: countStatus((u) => u.status === 'OutOfService'),
      },
      activeStationCount: stations.filter((s) => s.isActive).length,
      accountCounts: {
        [UserRole.Operator]: operators,
        [UserRole.RescueStaff]: rescueStaff,
      },
      citizenCount: citizens,
      actionItems: {
        stationsWithoutAvailableVehicle: stations
          .filter((s) => s.isActive && s.activeUnitsCount === 0)
          .map((s) => ({ id: s.id, name: s.name, vehicleCount: s.totalUnitsCount })),

        longMaintenanceVehicles: units.flatMap((u) => {
          const since = u.updatedAt ?? u.createdAt;
          if (u.status !== 'Maintenance' || !since) return [];
          const days = (now - new Date(since).getTime()) / DAY_MS;
          return days > LONG_MAINTENANCE_DAYS
            ? [{ id: u.id, plate: u.plateNumber, stationName: u.stationName, maintenanceSince: since, days: Math.floor(days) }]
            : [];
        }),

        outOfServiceVehicles: units
          .filter((u) => u.status === 'OutOfService')
          .map((u) => ({ id: u.id, plate: u.plateNumber, stationName: u.stationName })),
      },
    };
  },
};
