import type { ShiftScheduleItem, ShiftType } from './staff';

// Kiểu dữ liệu ca trực DÙNG CHUNG giữa Admin (xếp ca) và Staff portal (xem lịch).
// Nguồn gốc là ShiftAssignment do Admin tạo: mỗi người × mỗi ca = 1 bản ghi; kíp = các bản ghi
// cùng ngày, cùng ca, cùng trạm, cùng xe. Staff portal đọc qua toShiftScheduleItem(), không phải
// sửa giao diện. Không lưu ngày nghỉ ('off'): ngày không có bản ghi = nghỉ.

/** 3 ca cố định (khớp giờ bên Staff). Không dùng ca 24h ('full_day'). */
export type DutyShiftType = Extract<ShiftType, 'morning' | 'afternoon' | 'night'>;

export const DUTY_SHIFT_TYPES: DutyShiftType[] = ['morning', 'afternoon', 'night'];

export const SHIFT_DEFINITIONS: Record<
  DutyShiftType,
  { label: string; shortLabel: string; start: string; end: string; hours: number; endsNextDay: boolean }
> = {
  morning: { label: 'Ca Sáng', shortLabel: 'S', start: '06:00', end: '14:00', hours: 8, endsNextDay: false },
  afternoon: { label: 'Ca Chiều', shortLabel: 'C', start: '14:00', end: '22:00', hours: 8, endsNextDay: false },
  night: { label: 'Ca Đêm', shortLabel: 'Đ', start: '22:00', end: '06:00', hours: 8, endsNextDay: true },
};

export type CrewRole = 'commander' | 'driver' | 'firefighter' | 'rescuer' | 'medic';

export const CREW_ROLES: CrewRole[] = ['commander', 'driver', 'firefighter', 'rescuer', 'medic'];

export const CREW_ROLE_LABEL: Record<CrewRole, string> = {
  commander: 'Chỉ huy kíp',
  driver: 'Lái xe',
  firefighter: 'Chiến sĩ cứu hỏa',
  rescuer: 'Chiến sĩ cứu hộ',
  medic: 'Y sĩ cấp cứu',
};

/** Trạng thái giống ShiftScheduleItem['status'] của Staff. */
export type ShiftAssignmentStatus = ShiftScheduleItem['status'];

/** Mirror dự kiến của ShiftAssignmentDto (backend chưa có). */
export interface ShiftAssignment {
  id: string;
  /** Ngày BẮT ĐẦU ca, 'YYYY-MM-DD' (ca đêm 22:00 → 06:00 tính theo ngày bắt đầu). */
  date: string;
  shiftType: DutyShiftType;
  stationId: string;
  /** null = trực tại trạm, không theo xe. */
  vehicleId: string | null;
  /** RescueStaff (id tài khoản nội bộ). */
  staffId: string;
  crewRole: CrewRole;
  isOvertime: boolean;
  status: ShiftAssignmentStatus;
  /** ISO. */
  checkInAt?: string;
  checkOutAt?: string;
  note?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' theo giờ địa phương. */
export const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

/** Thứ Hai của tuần chứa ngày `ymd`. */
export function weekStartOf(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  const offset = (d.getDay() + 6) % 7; // Thứ Hai = 0
  return addDays(ymd, -offset);
}

/** Thời điểm bắt đầu / kết thúc thật của ca (ms, giờ địa phương). */
export function shiftInterval(date: string, shiftType: DutyShiftType): { start: number; end: number } {
  const def = SHIFT_DEFINITIONS[shiftType];
  const start = new Date(`${date}T${def.start}:00`).getTime();
  const end = new Date(`${def.endsNextDay ? addDays(date, 1) : date}T${def.end}:00`).getTime();
  return { start, end };
}

/** Tra cứu tên/biển số/đồng đội — Admin dùng store mock, Staff portal sau này dùng API. */
export interface ShiftLookup {
  stationName: (stationId: string) => string;
  vehiclePlate: (vehicleId: string) => string;
  staff: (staffId: string) => { name: string; phone: string };
  /** Các bản ghi cùng ngày, cùng ca, cùng trạm, cùng xe (gồm cả chính nó). */
  crewOf: (assignment: ShiftAssignment) => ShiftAssignment[];
}

const formatTime = (iso?: string) => (iso ? new Date(iso).toTimeString().slice(0, 5) : undefined);

/** Sinh đúng ShiftScheduleItem mà Staff portal đang hiển thị (góc nhìn của người được xếp ca). */
export function toShiftScheduleItem(assignment: ShiftAssignment, lookup: ShiftLookup): ShiftScheduleItem {
  const def = SHIFT_DEFINITIONS[assignment.shiftType];
  const weekday = new Date(`${assignment.date}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'long' });
  return {
    id: assignment.id,
    date: assignment.date,
    dayOfWeek: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    shiftType: assignment.shiftType,
    startTime: def.start,
    // Cùng định dạng chữ với mock Staff ('06:00 (Sáng hôm sau)').
    endTime: def.endsNextDay ? `${def.end} (Sáng hôm sau)` : def.end,
    stationName: lookup.stationName(assignment.stationId),
    vehiclePlate: assignment.vehicleId ? lookup.vehiclePlate(assignment.vehicleId) : 'Trực tại trạm',
    role: CREW_ROLE_LABEL[assignment.crewRole],
    teamMembers: lookup
      .crewOf(assignment)
      .filter((a) => a.staffId !== assignment.staffId)
      .map((a) => ({ ...lookup.staff(a.staffId), role: CREW_ROLE_LABEL[a.crewRole] })),
    status: assignment.status,
    checkInTime: formatTime(assignment.checkInAt),
    checkOutTime: formatTime(assignment.checkOutAt),
    note: assignment.note,
    dutyHours: def.hours,
    isOvertime: assignment.isOvertime,
  };
}
