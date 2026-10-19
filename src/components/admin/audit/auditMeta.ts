import {
  Ban,
  Building2,
  ClipboardList,
  Settings2,
  Siren,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '../../../types/auth';
import type { AuditAction, AuditActionGroup, AuditActorRole, AuditTrailEntry } from '../../../types/auditTrail';

export const AUDIT_GROUPS: AuditActionGroup[] = ['incident', 'dispatch', 'account', 'fleet', 'blocked_number', 'settings'];

export const AUDIT_GROUP_META: Record<AuditActionGroup, { label: string; icon: LucideIcon; badgeClass: string }> = {
  incident: { label: 'Sự cố', icon: Siren, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  dispatch: { label: 'Điều phối', icon: ClipboardList, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  account: { label: 'Tài khoản', icon: UserCog, badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
  fleet: { label: 'Đội xe & trạm', icon: Building2, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  blocked_number: { label: 'Số bị chặn', icon: Ban, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  settings: { label: 'Cấu hình', icon: Settings2, badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  incident_status_changed: 'Đổi trạng thái sự cố',
  ai_confirmed: 'Xác nhận kết quả AI',
  ai_overridden: 'Ghi đè cấp độ AI',
  incident_cancelled_false_report: 'Hủy ca báo khống',
  phone_revealed: 'Bấm "Hiện số"',
  vehicle_assigned: 'Giao xe',
  vehicle_released: 'Nhả xe',
  handover_completed: 'Bàn giao nạn nhân',
  number_blocked: 'Chặn số',
  number_unblocked: 'Gỡ chặn số',
  number_block_extended: 'Gia hạn chặn số',
  account_locked: 'Khóa tài khoản',
  account_unlocked: 'Mở khóa tài khoản',
  station_deleted: 'Xóa trạm',
  vehicle_status_changed: 'Đổi trạng thái xe',
  vehicle_station_changed: 'Chuyển trạm xe',
  vehicle_deleted: 'Xóa xe',
  settings_changed: 'Thay đổi cấu hình',
};

export const ACTOR_ROLE_LABEL: Record<AuditActorRole, string> = {
  [UserRole.Admin]: 'Quản trị viên',
  [UserRole.Operator]: 'Điều phối viên',
  [UserRole.RescueStaff]: 'Đội cứu hộ',
  System: 'Hệ thống',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** dd/MM/yyyy HH:mm:ss theo giờ địa phương. */
export function formatAuditTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** yyyy-MM-dd theo giờ địa phương (giá trị của <input type="date">). */
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const stripSuffix = (label: string) => label.replace(/\s*\(.*\)\s*$/, '');

/** Link sang màn quản lý đối tượng (ô tìm kiếm điền sẵn). Sự cố không có màn Admin → null. */
export function auditTargetLink(entry: AuditTrailEntry): string | null {
  const q = (value: string) => encodeURIComponent(value);
  switch (entry.targetType) {
    case 'station':
      return `/admin/stations?search=${q(entry.targetLabel)}&includeDeleted=true`;
    case 'vehicle':
      return `/admin/vehicles?search=${q(entry.targetLabel)}&includeDeleted=true`;
    case 'account':
      return `/admin/accounts?search=${q(stripSuffix(entry.targetLabel))}`;
    case 'citizen':
      return `/admin/citizens?search=${q(stripSuffix(entry.targetLabel))}`;
    case 'blocked_number':
      return `/admin/blocked-numbers?search=${q(entry.targetLabel.slice(-3))}&status=all`;
    case 'settings':
      return entry.targetId === 'dispatch' ? '/admin/settings/dispatch' : '/admin/settings/escalation';
    case 'incident':
      return null;
  }
}
