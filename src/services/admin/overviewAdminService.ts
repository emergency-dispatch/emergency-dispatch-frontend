import { UserRole } from '../../types/auth';
import { ON_MISSION_UNIT_STATUSES } from '../../types/rescueUnit';
import type { InternalRole } from '../../types/internalAccount';
import { adminStore } from './adminStore';
import { mockDelay } from './adminMock';
import { stationAdminService } from './stationAdminService';
import { vehicleAdminService } from './vehicleAdminService';

/** Xe ở trạng thái Bảo trì lâu hơn ngưỡng này thì đưa vào khối "Cần xử lý". */
export const LONG_MAINTENANCE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Nhóm trạng thái xe trên thẻ số liệu (Đang làm nhiệm vụ = Đã điều động + Tại hiện trường). */
export type OverviewVehicleGroup = 'Available' | 'on_mission' | 'Returning' | 'Maintenance';

export interface AdminOverview {
  generatedAt: string;
  vehicleCounts: Record<OverviewVehicleGroup, number>;
  activeStationCount: number;
  accountCounts: Record<InternalRole, number>;
  citizenCount: number;
  actionItems: {
    stationsWithoutAvailableVehicle: { id: string; name: string; vehicleCount: number }[];
    failedLoginAccounts: { id: string; fullName: string; email: string; role: InternalRole; lockedUntil: string }[];
    /** Backend chưa lưu thời điểm bắt đầu bảo trì → ước lượng bằng lần cập nhật cuối của xe. */
    longMaintenanceVehicles: { id: string; plate: string; stationName: string; maintenanceSince: string; days: number }[];
  };
}

export const overviewAdminService = {
  /**
   * Ảnh chụp trạng thái hiện tại. Trạm & xe đọc từ API thật; tài khoản & Citizen vẫn là mock.
   * TODO(backend): tài khoản / Citizen chuyển sang /api/users khi nối màn Tài khoản.
   */
  async getOverview(): Promise<AdminOverview> {
    const [stationPage, units] = await Promise.all([
      stationAdminService.list({ pageIndex: 1, pageSize: 1000 }),
      vehicleAdminService.listAll(),
      mockDelay(),
    ]);
    const now = Date.now();
    const stations = stationPage.items;
    const countStatus = (match: (u: (typeof units)[number]) => boolean) => units.filter(match).length;

    return {
      generatedAt: new Date(now).toISOString(),
      vehicleCounts: {
        Available: countStatus((u) => u.status === 'Available'),
        on_mission: countStatus((u) => ON_MISSION_UNIT_STATUSES.includes(u.status)),
        Returning: countStatus((u) => u.status === 'Returning'),
        Maintenance: countStatus((u) => u.status === 'Maintenance'),
      },
      activeStationCount: stations.filter((s) => s.isActive).length,
      accountCounts: {
        [UserRole.Operator]: adminStore.accounts.filter((a) => a.role === UserRole.Operator).length,
        [UserRole.RescueStaff]: adminStore.accounts.filter((a) => a.role === UserRole.RescueStaff).length,
      },
      citizenCount: adminStore.citizens.length,
      actionItems: {
        stationsWithoutAvailableVehicle: stations
          .filter((s) => s.isActive && s.activeUnitsCount === 0)
          .map((s) => ({ id: s.id, name: s.name, vehicleCount: s.totalUnitsCount })),

        // Khóa tạm đã hết hạn thì không tính.
        failedLoginAccounts: adminStore.accounts.flatMap((a) =>
          a.lock.kind === 'failed_login' && new Date(a.lock.until).getTime() > now
            ? [{ id: a.id, fullName: a.fullName, email: a.email, role: a.role, lockedUntil: a.lock.until }]
            : []
        ),

        longMaintenanceVehicles: units.flatMap((u) => {
          const since = u.updatedAt ?? u.createdAt;
          if (u.status !== 'Maintenance' || !since) return [];
          const days = (now - new Date(since).getTime()) / DAY_MS;
          return days > LONG_MAINTENANCE_DAYS
            ? [{ id: u.id, plate: u.plateNumber, stationName: u.stationName, maintenanceSince: since, days: Math.floor(days) }]
            : [];
        }),
      },
    };
  },
};
