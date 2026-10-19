import type { ShiftLeaveRequest } from '../../types/staff';
import {
  addDays,
  shiftInterval,
  toYmd,
  weekStartOf,
  type CrewRole,
  type DutyShiftType,
  type ShiftAssignment,
} from '../../types/shift';

// Lịch ca mẫu cho tuần trước và tuần hiện tại (tính theo ngày mở trang), khớp ID trạm/xe/nhân sự Admin.
// Mỗi trạm có 3 kíp × 2 người, mỗi kíp cố định một ca và một xe (hoặc trực tại trạm).
// Người thứ nhất nghỉ Chủ Nhật, người thứ hai nghỉ Thứ Bảy → 6 ca × 8 giờ = 48 giờ/tuần.

interface CrewPlan {
  stationId: string;
  shiftType: DutyShiftType;
  vehicleId: string | null;
  members: [{ staffId: string; role: CrewRole }, { staffId: string; role: CrewRole }];
}

const CREWS: CrewPlan[] = [
  // Trạm PCCC Khu Công nghệ cao
  { stationId: 'st-1', shiftType: 'morning', vehicleId: 'veh-1', members: [{ staffId: 'rs-1', role: 'commander' }, { staffId: 'rs-13', role: 'firefighter' }] },
  { stationId: 'st-1', shiftType: 'afternoon', vehicleId: 'veh-2', members: [{ staffId: 'rs-2', role: 'driver' }, { staffId: 'rs-14', role: 'firefighter' }] },
  { stationId: 'st-1', shiftType: 'night', vehicleId: 'veh-3', members: [{ staffId: 'rs-3', role: 'driver' }, { staffId: 'rs-15', role: 'rescuer' }] },
  // Trạm Y tế – Cấp cứu Khu CNC
  { stationId: 'st-2', shiftType: 'morning', vehicleId: 'veh-4', members: [{ staffId: 'rs-4', role: 'driver' }, { staffId: 'rs-16', role: 'medic' }] },
  { stationId: 'st-2', shiftType: 'afternoon', vehicleId: 'veh-5', members: [{ staffId: 'rs-5', role: 'driver' }, { staffId: 'rs-17', role: 'medic' }] },
  { stationId: 'st-2', shiftType: 'night', vehicleId: null, members: [{ staffId: 'rs-18', role: 'commander' }, { staffId: 'rs-19', role: 'medic' }] },
  // Trạm PCCC & CNCH Long Thạnh Mỹ — rs-12 bị khóa từ hôm qua nên chỉ có trong tuần trước
  { stationId: 'st-3', shiftType: 'morning', vehicleId: 'veh-6', members: [{ staffId: 'rs-6', role: 'commander' }, { staffId: 'rs-20', role: 'firefighter' }] },
  { stationId: 'st-3', shiftType: 'afternoon', vehicleId: 'veh-7', members: [{ staffId: 'rs-7', role: 'driver' }, { staffId: 'rs-11', role: 'medic' }] },
  { stationId: 'st-3', shiftType: 'night', vehicleId: null, members: [{ staffId: 'rs-21', role: 'rescuer' }, { staffId: 'rs-12', role: 'firefighter' }] },
  // Trạm Cứu hộ Tăng Nhơn Phú
  { stationId: 'st-4', shiftType: 'morning', vehicleId: 'veh-8', members: [{ staffId: 'rs-8', role: 'commander' }, { staffId: 'rs-22', role: 'rescuer' }] },
  { stationId: 'st-4', shiftType: 'afternoon', vehicleId: 'veh-9', members: [{ staffId: 'rs-9', role: 'driver' }, { staffId: 'rs-23', role: 'medic' }] },
  { stationId: 'st-4', shiftType: 'night', vehicleId: 'veh-10', members: [{ staffId: 'rs-10', role: 'driver' }, { staffId: 'rs-24', role: 'firefighter' }] },
];

const LOCKED_STAFF_IN_CURRENT_WEEK = 'rs-12';

function statusAt(date: string, shiftType: DutyShiftType, now: number): Pick<ShiftAssignment, 'status' | 'checkInAt' | 'checkOutAt'> {
  const { start, end } = shiftInterval(date, shiftType);
  const checkInAt = new Date(start - 5 * 60 * 1000).toISOString();
  if (end <= now) return { status: 'completed', checkInAt, checkOutAt: new Date(end + 3 * 60 * 1000).toISOString() };
  if (start <= now) return { status: 'checked_in', checkInAt };
  return { status: 'scheduled' };
}

export function buildShiftSeed(now = Date.now()): ShiftAssignment[] {
  const today = toYmd(new Date(now));
  const thisWeek = weekStartOf(today);
  const result: ShiftAssignment[] = [];

  for (const weekStart of [addDays(thisWeek, -7), thisWeek]) {
    for (let day = 0; day < 7; day++) {
      const date = addDays(weekStart, day);
      for (const crew of CREWS) {
        crew.members.forEach((member, i) => {
          if ((i === 0 && day === 6) || (i === 1 && day === 5)) return; // ngày nghỉ
          if (weekStart === thisWeek && member.staffId === LOCKED_STAFF_IN_CURRENT_WEEK) return;
          // Demo "Trạm chưa có ca trực hôm nay": Long Thạnh Mỹ chưa xếp ca đêm hôm nay.
          if (date === today && crew.stationId === 'st-3' && crew.shiftType === 'night') return;
          result.push({
            id: `shf-${date}-${crew.shiftType}-${member.staffId}`,
            date,
            shiftType: crew.shiftType,
            stationId: crew.stationId,
            vehicleId: crew.vehicleId,
            staffId: member.staffId,
            crewRole: member.role,
            isOvertime: false,
            ...statusAt(date, crew.shiftType, now),
          });
        });
      }
    }
  }
  return result;
}

/**
 * Nghỉ phép đã duyệt bổ sung cho demo (mock Staff chỉ có nghỉ phép tháng 9–10/2026 của một người).
 * Cùng kiểu ShiftLeaveRequest của Staff; staffId dùng ID tài khoản nội bộ.
 */
export function buildLeaveSupplement(now = Date.now()): ShiftLeaveRequest[] {
  const nextWeek = addDays(weekStartOf(toYmd(new Date(now))), 7);
  return [
    {
      id: 'leave-admin-demo-1',
      staffId: 'rs-14',
      staffName: 'Vũ Đức Nam',
      leaveType: 'annual',
      startDate: addDays(nextWeek, 2),
      endDate: addDays(nextWeek, 4),
      totalDays: 3,
      reason: 'Nghỉ phép năm về quê',
      status: 'approved',
      createdAt: new Date(now).toISOString(),
      approvedBy: 'Trưởng trạm PCCC Khu CNC',
    },
  ];
}
