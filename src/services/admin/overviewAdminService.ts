import { apiClient, unwrapApi } from '../apiClient';
import { UserRole, type ApiResponse } from '../../types/auth';
import { ON_MISSION_UNIT_STATUSES } from '../../types/rescueUnit';
import type { InternalRole } from '../../types/internalAccount';
import type { AdminDashboardStatsDto, RecentIncidentSummaryDto } from '../../types/adminDashboard';
import { stationAdminService } from './stationAdminService';
import { vehicleAdminService } from './vehicleAdminService';
import { equipmentService } from '../equipmentService';

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
  /** Thiết bị mọi trạm (§25); null = không tải được — chỉ là số phụ, không chặn cả trang. */
  equipment: { total: number; maintenance: number } | null;
  /**
   * Sự cố đang mở lúc tải (GET /dashboard/stats). `verified` = đã duyệt, chưa điều xe
   * (= đang mở − chờ duyệt − đang xử lý − leo thang).
   */
  incidents: { active: number; pending: number; verified: number; dispatched: number; escalated: number };
  recentIncidents: RecentIncidentSummaryDto[];
  actionItems: {
    stationsWithoutAvailableVehicle: { id: string; name: string; vehicleCount: number }[];
    /** Backend chưa lưu thời điểm bắt đầu bảo trì → ước lượng bằng lần cập nhật cuối của xe. */
    longMaintenanceVehicles: { id: string; plate: string; stationName: string; maintenanceSince: string; days: number }[];
    /** Xe ngừng hoạt động (thường do trạm cũ bị xóa) — cần chuyển sang trạm mới. */
    outOfServiceVehicles: { id: string; plate: string; stationName: string }[];
  };
}

export const overviewAdminService = {
  /**
   * Ảnh chụp trạng thái hiện tại (sự cố đang mở, trạm, xe, số tài khoản). Số liệu lịch sử (tỉ lệ hoàn thành,
   * thời gian phản ứng…) xem ở Báo cáo sự cố — có lọc theo thời gian, không dùng số cộng dồn của /dashboard/stats.
   * Xe vẫn đếm từ danh sách vì stats không tách Hồi sức / Ngừng hoạt động.
   */
  async getOverview(): Promise<AdminOverview> {
    const [stationPage, units, stats, equipment] = await Promise.all([
      stationAdminService.list({ pageIndex: 1, pageSize: 1000 }),
      vehicleAdminService.listAll(),
      unwrapApi(apiClient.get<ApiResponse<AdminDashboardStatsDto>>('/dashboard/stats')),
      equipmentService.list().catch(() => null),
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
        [UserRole.Operator]: stats.totalOperators,
        [UserRole.RescueStaff]: stats.totalRescueStaff,
      },
      citizenCount: stats.totalCitizens,
      equipment: equipment && {
        total: equipment.length,
        maintenance: equipment.filter((e) => e.status === 'Maintenance').length,
      },
      incidents: {
        active: stats.activeIncidents,
        pending: stats.pendingIncidents,
        verified: Math.max(
          0,
          stats.activeIncidents - stats.pendingIncidents - stats.dispatchedIncidents - stats.escalatedIncidents
        ),
        dispatched: stats.dispatchedIncidents,
        escalated: stats.escalatedIncidents,
      },
      recentIncidents: stats.recentIncidents,
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
