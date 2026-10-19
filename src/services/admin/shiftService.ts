import { mockShiftLeaveRequests } from '../../data/staffMock';
import { UserRole } from '../../types/auth';
import { isVehicleBusy, type AdminVehicleStatus } from '../../types/adminFleet';
import type { AuditChange } from '../../types/auditTrail';
import type { ShiftScheduleItem } from '../../types/staff';
import {
  CREW_ROLE_LABEL,
  DUTY_SHIFT_TYPES,
  SHIFT_DEFINITIONS,
  addDays,
  shiftInterval,
  toShiftScheduleItem,
  toYmd,
  weekStartOf,
  type CrewRole,
  type DutyShiftType,
  type ShiftAssignment,
  type ShiftLookup,
} from '../../types/shift';
import { adminStore } from './adminStore';
import { auditTrailService } from './auditTrailService';
import { clone, mockApiError, mockDelay } from './adminMock';

// Ngưỡng cảnh báo (không chặn).
export const MIN_CREW_SIZE = 2;
export const MIN_REST_HOURS = 12;
export const MAX_WEEKLY_HOURS = 48;

const HOUR_MS = 60 * 60 * 1000;
export const STATION_DUTY_ROW = 'station';

export interface ShiftCellRef {
  stationId: string;
  vehicleId: string | null;
  date: string;
  shiftType: DutyShiftType;
}

export interface ShiftAssignmentView extends ShiftAssignment {
  staffName: string;
  staffLocked: boolean;
}

export interface ShiftWeekRow {
  key: string;
  vehicleId: string | null;
  label: string;
  sublabel: string;
  vehicleStatus: AdminVehicleStatus | null;
}

export interface ShiftStaffSummary {
  staffId: string;
  staffName: string;
  /** Số ca trong tuần tại trạm đang xem. */
  shiftsAtStation: number;
  /** Tổng giờ trong tuần, tính cả ca ở trạm khác. */
  weeklyHours: number;
  warnings: string[];
}

export interface ShiftWeekView {
  stationId: string;
  stationName: string;
  weekStart: string;
  days: string[];
  rows: ShiftWeekRow[];
  assignments: ShiftAssignmentView[];
  /** key = cellKey(row, date, shift). */
  cellWarnings: Record<string, string[]>;
  staffSummaries: ShiftStaffSummary[];
}

export interface ShiftCandidate {
  staffId: string;
  staffName: string;
  /** Lý do không xếp được (409), null = xếp được. */
  blockReason: string | null;
  warnings: string[];
}

export interface CopyWeekResult {
  copied: number;
  alreadyPresent: number;
  skipped: { date: string; shiftType: DutyShiftType; rowLabel: string; staffName: string; reason: string }[];
}

export const cellKey = (rowKey: string, date: string, shiftType: DutyShiftType) => `${rowKey}|${date}|${shiftType}`;

const formatDate = (ymd: string) => {
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
};

// ---------------------------------------------------------------------------
// Tra cứu
// ---------------------------------------------------------------------------

const accountOf = (id: string) => adminStore.accounts.find((a) => a.id === id);
const isLocked = (staffId: string) => accountOf(staffId)?.lock.kind === 'admin';
const staffName = (id: string) => accountOf(id)?.fullName ?? id;
const stationName = (id: string) => adminStore.stations.find((s) => s.id === id)?.name ?? id;
const vehicleOf = (id: string | null) => (id ? adminStore.vehicles.find((v) => v.id === id) : undefined);
const rowLabel = (vehicleId: string | null) => (vehicleId ? vehicleOf(vehicleId)?.plate ?? vehicleId : 'Trực tại trạm');

const intervalOf = (a: Pick<ShiftAssignment, 'date' | 'shiftType'>) => shiftInterval(a.date, a.shiftType);
const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

function crewOf(cell: ShiftCellRef) {
  return adminStore.shifts.filter(
    (s) =>
      s.date === cell.date &&
      s.shiftType === cell.shiftType &&
      s.stationId === cell.stationId &&
      s.vehicleId === cell.vehicleId
  );
}

/**
 * Nghỉ phép ĐÃ DUYỆT: đọc từ mock Staff (map theo tên, vì Staff dùng staffId riêng 'staff-901')
 * + nghỉ phép bổ sung cho demo trong store Admin.
 * TODO(backend): GET /api/Leaves?status=approved&from=&to=
 */
function approvedLeaves(): { staffId: string; startDate: string; endDate: string }[] {
  const idByName = new Map(adminStore.accounts.map((a) => [a.fullName, a.id]));
  const fromStaff = mockShiftLeaveRequests.flatMap((l) => {
    const id = idByName.get(l.staffName.replace(/^Đ\/c\s+/, ''));
    return id ? [{ ...l, staffId: id }] : [];
  });
  return [...fromStaff, ...adminStore.leaveSupplement]
    .filter((l) => l.status === 'approved')
    .map((l) => ({ staffId: l.staffId, startDate: l.startDate, endDate: l.endDate }));
}

// ---------------------------------------------------------------------------
// Ràng buộc: CHẶN (409) và CẢNH BÁO
// ---------------------------------------------------------------------------

/** Lý do chặn xếp `staffId` vào ca (null = được). Dùng chung cho UI (danh sách ứng viên) và service. */
function blockReason(staffId: string, cell: ShiftCellRef): string | null {
  const account = accountOf(staffId);
  if (!account || account.role !== UserRole.RescueStaff) return 'Chỉ xếp được tài khoản RescueStaff.';
  if (account.lock.kind === 'admin') return 'Tài khoản đang bị Admin khóa.';

  const leave = approvedLeaves().find((l) => l.staffId === staffId && cell.date >= l.startDate && cell.date <= l.endDate);
  if (leave) return `Đang nghỉ phép đã duyệt (${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}).`;

  const target = intervalOf(cell);
  const clash = adminStore.shifts.find((s) => s.staffId === staffId && overlaps(intervalOf(s), target));
  if (clash) {
    const where = clash.stationId === cell.stationId ? rowLabel(clash.vehicleId) : stationName(clash.stationId);
    return `Trùng giờ: đã có ${SHIFT_DEFINITIONS[clash.shiftType].label} ${formatDate(clash.date)} (${where}).`;
  }
  return null;
}

function weeklyHours(staffId: string, weekStart: string, extra = 0): number {
  const weekEnd = addDays(weekStart, 6);
  const count = adminStore.shifts.filter((s) => s.staffId === staffId && s.date >= weekStart && s.date <= weekEnd).length;
  return (count + extra) * 8;
}

/** Các khoảng nghỉ < MIN_REST_HOURS giữa hai ca liên tiếp của một người (có thể kèm ca giả định). */
function shortRests(staffId: string, hypothetical?: ShiftCellRef) {
  const items = adminStore.shifts
    .filter((s) => s.staffId === staffId)
    .map((s) => ({ date: s.date, shiftType: s.shiftType, ...intervalOf(s) }));
  if (hypothetical) items.push({ date: hypothetical.date, shiftType: hypothetical.shiftType, ...intervalOf(hypothetical) });
  items.sort((a, b) => a.start - b.start);
  const result: { from: (typeof items)[number]; to: (typeof items)[number]; hours: number }[] = [];
  for (let i = 1; i < items.length; i++) {
    const hours = (items[i].start - items[i - 1].end) / HOUR_MS;
    if (hours >= 0 && hours < MIN_REST_HOURS) result.push({ from: items[i - 1], to: items[i], hours });
  }
  return result;
}

const describeRest = (r: ReturnType<typeof shortRests>[number]) =>
  `Nghỉ ${r.hours} giờ giữa ${SHIFT_DEFINITIONS[r.from.shiftType].label} ${formatDate(r.from.date)} và ${
    SHIFT_DEFINITIONS[r.to.shiftType].label
  } ${formatDate(r.to.date)} (< ${MIN_REST_HOURS} giờ).`;

/** Cảnh báo khi thêm `staffId` vào ca (không chặn). */
function candidateWarnings(staffId: string, cell: ShiftCellRef): string[] {
  const warnings: string[] = [];
  const hours = weeklyHours(staffId, weekStartOf(cell.date), 1);
  if (hours > MAX_WEEKLY_HOURS) warnings.push(`Tổng tuần sẽ là ${hours} giờ (> ${MAX_WEEKLY_HOURS} giờ).`);
  shortRests(staffId, cell)
    .filter((r) => (r.from.date === cell.date && r.from.shiftType === cell.shiftType) || (r.to.date === cell.date && r.to.shiftType === cell.shiftType))
    .forEach((r) => warnings.push(describeRest(r)));
  return warnings;
}

function cellWarningsOf(cell: ShiftCellRef): string[] {
  const crew = crewOf(cell);
  if (crew.length === 0) return [];
  const warnings: string[] = [];
  const vehicle = vehicleOf(cell.vehicleId);
  if (vehicle?.status === 'maintenance') warnings.push('Xe đang Bảo trì.');
  // Người bị Admin khóa không tính là có mặt — chỉ áp cho ca chưa kết thúc (khóa là trạng thái hiện tại,
  // ca đã qua thì người đó vẫn đã trực).
  const ended = intervalOf(cell).end <= Date.now();
  const locked = ended ? [] : crew.filter((s) => isLocked(s.staffId));
  const present = crew.length - locked.length;
  if (present < MIN_CREW_SIZE) {
    warnings.push(`Kíp chỉ có ${present} người có mặt (tối thiểu ${MIN_CREW_SIZE}).`);
  }
  if (locked.length > 0) warnings.push(`${locked.map((s) => staffName(s.staffId)).join(', ')} đang bị khóa.`);
  return warnings;
}

function assertEditable(cell: ShiftCellRef) {
  if (intervalOf(cell).end <= Date.now()) throw mockApiError(409, 'Ca đã kết thúc, không thể chỉnh sửa.');
}

function assertCell(cell: ShiftCellRef) {
  const station = adminStore.stations.find((s) => s.id === cell.stationId && !s.isDeleted);
  if (!station) throw mockApiError(400, 'Trạm không tồn tại hoặc đã bị xóa.');
  if (!DUTY_SHIFT_TYPES.includes(cell.shiftType)) throw mockApiError(400, 'Loại ca không hợp lệ.');
  if (cell.vehicleId) {
    const vehicle = vehicleOf(cell.vehicleId);
    if (!vehicle || vehicle.isDeleted || vehicle.stationId !== cell.stationId) {
      throw mockApiError(400, 'Xe không thuộc trạm này hoặc đã bị xóa.');
    }
  }
}

const cellLabel = (cell: ShiftCellRef) =>
  `${SHIFT_DEFINITIONS[cell.shiftType].label} ${formatDate(cell.date)} · ${stationName(cell.stationId)} · ${rowLabel(cell.vehicleId)}`;

const crewNames = (crew: ShiftAssignment[]) => (crew.length ? crew.map((s) => staffName(s.staffId)).join(', ') : '(trống)');

function statusFor(cell: ShiftCellRef, now: number): ShiftAssignment['status'] {
  return intervalOf(cell).start <= now ? 'checked_in' : 'scheduled';
}

// ---------------------------------------------------------------------------
// Dùng chung cho service khác (Tổng quan, Tài khoản)
// ---------------------------------------------------------------------------

/** Trạm (chưa xóa) có ít nhất một ca hôm nay không ai trực (người bị Admin khóa không tính), kèm các ca trống. */
export function stationsMissingShiftsToday(now = Date.now()): { id: string; name: string; missing: DutyShiftType[] }[] {
  const today = toYmd(new Date(now));
  return adminStore.stations
    .filter((s) => !s.isDeleted)
    .map((s) => ({
      id: s.id,
      name: s.name,
      missing: DUTY_SHIFT_TYPES.filter(
        (t) =>
          !adminStore.shifts.some(
            (a) => a.stationId === s.id && a.date === today && a.shiftType === t && !isLocked(a.staffId)
          )
      ),
    }))
    .filter((s) => s.missing.length > 0);
}

export interface LockedStaffShift {
  assignmentId: string;
  staffName: string;
  stationId: string;
  stationName: string;
  rowLabel: string;
  date: string;
  shiftType: DutyShiftType;
}

/** Ca chưa kết thúc, bắt đầu trong `days` ngày tới, có người đang bị Admin khóa. */
export function upcomingShiftsWithLockedStaff(now = Date.now(), days = 7): LockedStaffShift[] {
  const until = now + days * 24 * HOUR_MS;
  return adminStore.shifts
    .filter((s) => {
      const { start, end } = intervalOf(s);
      return isLocked(s.staffId) && end > now && start < until;
    })
    .sort((a, b) => intervalOf(a).start - intervalOf(b).start)
    .map((s) => ({
      assignmentId: s.id,
      staffName: staffName(s.staffId),
      stationId: s.stationId,
      stationName: stationName(s.stationId),
      rowLabel: rowLabel(s.vehicleId),
      date: s.date,
      shiftType: s.shiftType,
    }));
}

/** Xe đang làm nhiệm vụ / hồi sức mà người này đang trong kíp ca hiện tại (chặn khóa tài khoản). */
export function currentShiftBusyVehicle(staffId: string, now = Date.now()): { plate: string } | null {
  for (const s of adminStore.shifts) {
    if (s.staffId !== staffId || !s.vehicleId) continue;
    const { start, end } = intervalOf(s);
    if (start > now || end <= now) continue;
    const vehicle = vehicleOf(s.vehicleId);
    if (vehicle && !vehicle.isDeleted && isVehicleBusy(vehicle.status)) return { plate: vehicle.plate };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const shiftService = {
  /** Lịch một tuần của một trạm: hàng = các xe + "Trực tại trạm", cột = 7 ngày × 3 ca. */
  // TODO(backend): GET /api/Shifts?stationId=&weekStart=
  async getWeek(stationId: string, weekStartInput: string): Promise<ShiftWeekView> {
    await mockDelay();
    const station = adminStore.stations.find((s) => s.id === stationId && !s.isDeleted);
    if (!station) throw mockApiError(404, 'Không tìm thấy trạm hoặc trạm đã bị xóa.');

    const weekStart = weekStartOf(weekStartInput);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekEnd = days[6];
    const inWeek = adminStore.shifts.filter((s) => s.stationId === stationId && s.date >= weekStart && s.date <= weekEnd);

    const vehicles = adminStore.vehicles.filter((v) => v.stationId === stationId && !v.isDeleted);
    // Xe đã xóa nhưng còn ca trong tuần vẫn hiện để không "mất" bản ghi.
    const orphanIds = [...new Set(inWeek.map((s) => s.vehicleId).filter((id): id is string => !!id && !vehicles.some((v) => v.id === id)))];
    const rows: ShiftWeekRow[] = [
      ...vehicles.map((v) => ({ key: v.id, vehicleId: v.id, label: v.plate, sublabel: '', vehicleStatus: v.status })),
      ...orphanIds.map((id) => ({ key: id, vehicleId: id, label: rowLabel(id), sublabel: 'Xe đã xóa', vehicleStatus: null })),
      { key: STATION_DUTY_ROW, vehicleId: null, label: 'Trực tại trạm', sublabel: 'Không theo xe', vehicleStatus: null },
    ];

    const cellWarnings: Record<string, string[]> = {};
    for (const row of rows) {
      for (const date of days) {
        for (const shiftType of DUTY_SHIFT_TYPES) {
          const w = cellWarningsOf({ stationId, vehicleId: row.vehicleId, date, shiftType });
          if (w.length) cellWarnings[cellKey(row.key, date, shiftType)] = w;
        }
      }
    }

    const staffIds = [...new Set(inWeek.map((s) => s.staffId))];
    const staffSummaries: ShiftStaffSummary[] = staffIds
      .map((id) => {
        const hours = weeklyHours(id, weekStart);
        const warnings: string[] = [];
        if (hours > MAX_WEEKLY_HOURS) warnings.push(`${hours} giờ trong tuần (> ${MAX_WEEKLY_HOURS} giờ).`);
        shortRests(id)
          .filter((r) => r.to.date >= weekStart && r.to.date <= weekEnd)
          .forEach((r) => warnings.push(describeRest(r)));
        if (isLocked(id)) warnings.push('Tài khoản đang bị khóa.');
        return {
          staffId: id,
          staffName: staffName(id),
          shiftsAtStation: inWeek.filter((s) => s.staffId === id).length,
          weeklyHours: hours,
          warnings,
        };
      })
      .sort((a, b) => b.weeklyHours - a.weeklyHours || a.staffName.localeCompare(b.staffName, 'vi'));

    return clone({
      stationId,
      stationName: station.name,
      weekStart,
      days,
      rows,
      assignments: inWeek.map((s) => ({
        ...s,
        staffName: staffName(s.staffId),
        staffLocked: isLocked(s.staffId),
      })),
      cellWarnings,
      staffSummaries,
    });
  },

  /** RescueStaff có thể xếp vào ô (kèm lý do chặn và cảnh báo) — để UI hiển thị trước khi lưu. */
  // TODO(backend): GET /api/Shifts/candidates?stationId=&vehicleId=&date=&shiftType=
  async listCandidates(cell: ShiftCellRef): Promise<ShiftCandidate[]> {
    await mockDelay();
    return clone(
      adminStore.accounts
        .filter((a) => a.role === UserRole.RescueStaff)
        .map((a) => {
          const reason = blockReason(a.id, cell);
          return { staffId: a.id, staffName: a.fullName, blockReason: reason, warnings: reason ? [] : candidateWarnings(a.id, cell) };
        })
        .sort((a, b) => Number(!!a.blockReason) - Number(!!b.blockReason) || a.staffName.localeCompare(b.staffName, 'vi'))
    );
  },

  // TODO(backend): POST /api/Shifts { stationId, vehicleId, date, shiftType, staffId, crewRole }
  async assign(cell: ShiftCellRef, staffId: string, crewRole: CrewRole): Promise<ShiftAssignment> {
    await mockDelay();
    assertCell(cell);
    assertEditable(cell);
    const reason = blockReason(staffId, cell);
    if (reason) throw mockApiError(409, reason);

    const before = crewOf(cell);
    const assignment: ShiftAssignment = {
      id: `shf-${cell.date}-${cell.shiftType}-${staffId}-${Date.now()}`,
      ...cell,
      staffId,
      crewRole,
      isOvertime: weeklyHours(staffId, weekStartOf(cell.date), 1) > MAX_WEEKLY_HOURS,
      status: statusFor(cell, Date.now()),
    };
    adminStore.shifts.push(assignment);
    auditTrailService.record({
      action: 'shift_assigned',
      targetType: 'shift',
      targetId: `${cell.stationId}|${cell.date}`,
      targetLabel: cellLabel(cell),
      detail: `Xếp ${staffName(staffId)} (${CREW_ROLE_LABEL[crewRole]}) vào kíp.`,
      changes: [{ field: 'Kíp', from: crewNames(before), to: crewNames(crewOf(cell)) }],
    });
    return clone(assignment);
  },

  // TODO(backend): DELETE /api/Shifts/{id}
  async unassign(assignmentId: string): Promise<void> {
    await mockDelay();
    const assignment = adminStore.shifts.find((s) => s.id === assignmentId);
    if (!assignment) throw mockApiError(404, 'Không tìm thấy ca.');
    assertEditable(assignment);

    const cell: ShiftCellRef = assignment;
    const before = crewOf(cell);
    adminStore.shifts = adminStore.shifts.filter((s) => s.id !== assignmentId);
    auditTrailService.record({
      action: 'shift_unassigned',
      targetType: 'shift',
      targetId: `${cell.stationId}|${cell.date}`,
      targetLabel: cellLabel(cell),
      detail: `Bỏ ${staffName(assignment.staffId)} khỏi kíp.`,
      changes: [{ field: 'Kíp', from: crewNames(before), to: crewNames(crewOf(cell)) }],
    });
  },

  /**
   * Sao chép lịch tuần trước (của trạm) sang tuần đang xem. Bỏ qua: người bị khóa, đang nghỉ phép,
   * trùng giờ, xe không còn thuộc trạm, ca đã kết thúc. Ca đã có sẵn y hệt thì không tính là bỏ qua.
   */
  // TODO(backend): POST /api/Shifts/copy-week { stationId, targetWeekStart }
  async copyPreviousWeek(stationId: string, targetWeekInput: string): Promise<CopyWeekResult> {
    await mockDelay();
    const station = adminStore.stations.find((s) => s.id === stationId && !s.isDeleted);
    if (!station) throw mockApiError(404, 'Không tìm thấy trạm hoặc trạm đã bị xóa.');

    const targetWeek = weekStartOf(targetWeekInput);
    const sourceWeek = addDays(targetWeek, -7);
    const source = adminStore.shifts.filter(
      (s) => s.stationId === stationId && s.date >= sourceWeek && s.date <= addDays(sourceWeek, 6)
    );
    if (source.length === 0) throw mockApiError(400, 'Tuần trước của trạm này chưa có ca nào để sao chép.');

    const result: CopyWeekResult = { copied: 0, alreadyPresent: 0, skipped: [] };
    const now = Date.now();
    for (const s of [...source].sort((a, b) => a.date.localeCompare(b.date))) {
      const cell: ShiftCellRef = { stationId, vehicleId: s.vehicleId, date: addDays(s.date, 7), shiftType: s.shiftType };
      const skip = (reason: string) =>
        result.skipped.push({ date: cell.date, shiftType: cell.shiftType, rowLabel: rowLabel(cell.vehicleId), staffName: staffName(s.staffId), reason });

      const exists = crewOf(cell).some((a) => a.staffId === s.staffId);
      if (exists) {
        result.alreadyPresent += 1;
        continue;
      }
      if (intervalOf(cell).end <= now) {
        skip('Ca đã kết thúc.');
        continue;
      }
      const vehicle = vehicleOf(cell.vehicleId);
      if (cell.vehicleId && (!vehicle || vehicle.isDeleted || vehicle.stationId !== stationId)) {
        skip('Xe không còn thuộc trạm.');
        continue;
      }
      const reason = blockReason(s.staffId, cell);
      if (reason) {
        skip(reason);
        continue;
      }
      adminStore.shifts.push({
        id: `shf-${cell.date}-${cell.shiftType}-${s.staffId}-${now}-${result.copied}`,
        ...cell,
        staffId: s.staffId,
        crewRole: s.crewRole,
        isOvertime: false,
        status: statusFor(cell, now),
      });
      result.copied += 1;
    }

    const changes: AuditChange[] = [
      { field: 'Số ca thêm mới', from: '0', to: String(result.copied) },
      ...(result.skipped.length ? [{ field: 'Số ca bỏ qua', from: '0', to: String(result.skipped.length) }] : []),
    ];
    auditTrailService.record({
      action: 'shift_week_copied',
      targetType: 'shift',
      targetId: `${stationId}|${targetWeek}`,
      targetLabel: `${station.name} · tuần ${formatDate(targetWeek)} – ${formatDate(addDays(targetWeek, 6))}`,
      detail: `Sao chép từ tuần ${formatDate(sourceWeek)}: thêm ${result.copied} ca, bỏ qua ${result.skipped.length}, đã có sẵn ${result.alreadyPresent}.`,
      changes,
    });
    return clone(result);
  },

  /** Lịch của một nhân sự theo đúng định dạng Staff portal đang hiển thị. */
  // TODO(backend): GET /api/Shifts/my?from=&to= (Staff portal)
  async getStaffSchedule(staffId: string, from: string, to: string): Promise<ShiftScheduleItem[]> {
    await mockDelay();
    const lookup: ShiftLookup = {
      stationName,
      vehiclePlate: (id) => vehicleOf(id)?.plate ?? id,
      staff: (id) => ({ name: staffName(id), phone: accountOf(id)?.phoneNumber ?? '' }),
      crewOf: (a) => crewOf(a),
    };
    return clone(
      adminStore.shifts
        .filter((s) => s.staffId === staffId && s.date >= from && s.date <= to)
        .sort((a, b) => intervalOf(a).start - intervalOf(b).start)
        .map((s) => toShiftScheduleItem(s, lookup))
    );
  },
};
