import type { BackendDispatchStatus, CompletionReportDto, DispatchAssignmentResponseDto } from '../../../types/dispatch';
import type { Incident } from '../../../types/incident';
import type { StationTeam } from '../../../types/stationTeam';
import type { VehicleStatus } from '../../../types/vehicle';

/**
 * §26.2 Nghiệm thu theo tổ: một thành viên ký → backend hoàn tất mọi xe của tổ trong sự cố và trả **cùng một**
 * `completionReport.id` cho các xe đó. Sự cố chỉ Completed khi tổ cuối cùng nộp. Xe chưa gán tổ nghiệm thu riêng.
 */

/** Lượt còn đang làm (chưa nộp nghiệm thu). */
export const ACTIVE_STATUSES: BackendDispatchStatus[] = ['Dispatched', 'Accepted', 'EnRoute', 'OnScene'];

/** Trạng thái lượt điều phối → trạng thái xe (nhãn `enums.vehicleStatus.*`, màu VEHICLE_STATUS_META). */
export const ASSIGNMENT_VEHICLE_STATUS: Partial<Record<BackendDispatchStatus, VehicleStatus>> = {
  Dispatched: 'awaiting_ack',
  Accepted: 'accepted',
  EnRoute: 'en_route',
  OnScene: 'on_scene',
};

export interface CompletionGroup {
  /** report id (đã nộp) | `team:<id>` | `unit:<rescueUnitId>` (chờ nộp). */
  key: string;
  state: 'submitted' | 'pending';
  teamId: string | null;
  /** null = xe chưa gán tổ (nhóm theo biển số). */
  teamName: string | null;
  report: CompletionReportDto | null;
  /** Lượt điều phối của các xe trong nhóm (đã bỏ lượt bị hủy / từ chối). */
  assignments: DispatchAssignmentResponseDto[];
}

const isActive = (a: DispatchAssignmentResponseDto) => ACTIVE_STATUSES.includes(a.status);
const time = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

/** Thời điểm tổ ký (báo cáo cũ trước khi bắt buộc ký thì lấy lúc nộp). */
export const reportTime = (report: CompletionReportDto | null) => report?.signedAt ?? report?.submittedAt ?? null;

/**
 * Nhóm lượt điều phối của một sự cố theo tổ. Tổ chờ nghiệm thu xếp trước (giao sớm nhất trước), rồi tổ đã nộp
 * (ký gần nhất trước). Lượt bị hủy / từ chối không thuộc nghiệm thu nên bị bỏ.
 */
export function groupCompletion(
  assignments: DispatchAssignmentResponseDto[],
  teamByVehicle: Map<string, StationTeam>
): CompletionGroup[] {
  const groups = new Map<string, CompletionGroup>();
  const add = (key: string, init: Omit<CompletionGroup, 'key' | 'assignments'>, a: DispatchAssignmentResponseDto) => {
    const group = groups.get(key) ?? { key, ...init, assignments: [] };
    group.assignments.push(a);
    groups.set(key, group);
  };

  for (const a of assignments) {
    const team = teamByVehicle.get(a.rescueUnitId) ?? null;
    if (a.status === 'Completed') {
      const report = a.completionReport ?? null;
      add(
        report ? `report:${report.id}` : `done:${a.id}`,
        {
          state: 'submitted',
          // Tên tổ lúc nộp (backend) ưu tiên hơn tổ hiện tại — tổ có thể đã đổi tên / đổi xe sau đó.
          teamId: report?.stationTeamId ?? team?.id ?? null,
          teamName: report?.stationTeamName ?? (report?.stationTeamId ? team?.name ?? null : null),
          report,
        },
        a
      );
    } else if (isActive(a)) {
      add(
        team ? `team:${team.id}` : `unit:${a.rescueUnitId}`,
        { state: 'pending', teamId: team?.id ?? null, teamName: team?.name ?? null, report: null },
        a
      );
    }
  }

  const earliestDispatch = (g: CompletionGroup) => Math.min(...g.assignments.map((a) => time(a.dispatchedAt)));
  return [...groups.values()].sort((a, b) => {
    if (a.state !== b.state) return a.state === 'pending' ? -1 : 1;
    return a.state === 'pending'
      ? earliestDispatch(a) - earliestDispatch(b)
      : time(reportTime(b.report)) - time(reportTime(a.report));
  });
}

export interface CompletionProgress {
  done: number;
  total: number;
}

export const progressOf = (groups: CompletionGroup[]): CompletionProgress => ({
  done: groups.filter((g) => g.state === 'submitted').length,
  total: groups.length,
});

/** Sự cố còn xe chưa nghiệm thu (badge sidebar, mục "Chờ nghiệm thu"). */
export const hasPendingCompletion = (assignments: DispatchAssignmentResponseDto[] | undefined) =>
  !!assignments?.some(isActive);

/** Mốc thời gian của sự cố rút từ các lượt điều phối (backend không trả các mốc này trên sự cố). */
export function completionMilestones(assignments: DispatchAssignmentResponseDto[]) {
  const relevant = assignments.filter((a) => a.status === 'Completed' || isActive(a));
  const min = (values: (string | null | undefined)[]) => {
    const ts = values.map(time).filter((v) => v > 0);
    return ts.length ? new Date(Math.min(...ts)).toISOString() : null;
  };
  const allDone = relevant.length > 0 && relevant.every((a) => a.status === 'Completed');
  const doneTimes = relevant.map((a) => time(a.completedAt ?? a.completionReport?.submittedAt));
  return {
    dispatchedAt: min(relevant.map((a) => a.dispatchedAt)),
    arrivedAt: min(relevant.map((a) => a.arrivedAt)),
    completedAt: allDone && doneTimes.every((v) => v > 0) ? new Date(Math.max(...doneTimes)).toISOString() : null,
  };
}

/** Ảnh / video bằng chứng: backend chỉ trả URL → đoán loại theo đuôi tệp. */
export const isVideoUrl = (url: string) => /\.(mp4|mov|webm|m4v|3gp)(\?|#|$)/i.test(url);

// ---------- Màn Nghiệm thu: kiểu dùng chung giữa trang và danh sách ----------

export type CompletionTab = 'pending' | 'done';
export type CompletionRange = 'd1' | 'd7' | 'd30' | 'all';
export const COMPLETION_RANGES: CompletionRange[] = ['d1', 'd7', 'd30', 'all'];

export interface CompletionRow {
  incident: Incident;
  /** null = chưa tải lượt điều phối (sự cố đã hoàn tất lấy từ API danh sách). */
  groups: CompletionGroup[] | null;
  completedAt: string | null;
}
