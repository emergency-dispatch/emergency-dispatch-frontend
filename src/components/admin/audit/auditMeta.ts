import {
  Ban,
  Building2,
  ClipboardList,
  FileDown,
  EyeOff,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Settings,
  ShieldAlert,
  Siren,
  Trash2,
  TriangleAlert,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AuditAction, SystemAuditAction, SystemAuditEntityType } from '../../../types/auditTrail';

// Nhóm chỉ để tô màu / gắn icon — backend lọc theo từng hành động, không theo nhóm.
type AuditGroup = 'incident' | 'dispatch' | 'escalation' | 'privacy';

const GROUP_META: Record<AuditGroup, { icon: LucideIcon; badgeClass: string }> = {
  incident: { icon: Siren, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  dispatch: { icon: ClipboardList, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  escalation: { icon: TriangleAlert, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  privacy: { icon: EyeOff, badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const ACTION_META: Record<AuditAction, { label: string; group: AuditGroup }> = {
  Created: { label: 'Tạo sự cố', group: 'incident' },
  AiAnalyzed: { label: 'AI phân tích', group: 'incident' },
  Verified: { label: 'Xác nhận kết quả AI', group: 'incident' },
  SeverityOverridden: { label: 'Ghi đè cấp độ AI', group: 'incident' },
  StatusChanged: { label: 'Đổi trạng thái', group: 'incident' },
  Cancelled: { label: 'Hủy sự cố', group: 'incident' },
  Completed: { label: 'Hoàn thành', group: 'incident' },
  Closed: { label: 'Đóng sự cố', group: 'incident' },
  Dispatched: { label: 'Điều xe', group: 'dispatch' },
  ReDispatched: { label: 'Điều xe lại', group: 'dispatch' },
  AssignmentAccepted: { label: 'Đội nhận nhiệm vụ', group: 'dispatch' },
  AssignmentRejected: { label: 'Đội từ chối nhiệm vụ', group: 'dispatch' },
  Escalated: { label: 'Leo thang', group: 'escalation' },
  DeEscalated: { label: 'Hạ thang', group: 'escalation' },
  PhoneRevealed: { label: 'Bấm "Hiện số"', group: 'privacy' },
  ReporterBlocked: { label: 'Chặn số người báo', group: 'privacy' },
  TransferredStation: { label: 'Chuyển trạm phụ trách', group: 'dispatch' },
  OutOfServiceArea: { label: 'SOS ngoài khu vực', group: 'escalation' },
};

/** Nhãn + icon + màu của một hành động; hành động lạ (backend thêm sau) hiện nguyên tên. */
export function auditActionMeta(action: string): { label: string; icon: LucideIcon; badgeClass: string } {
  const meta = ACTION_META[action as AuditAction];
  const group = GROUP_META[meta?.group ?? 'incident'];
  return { label: meta?.label ?? action, ...group };
}

// ---------------------------------------------------------------------------
// Nhật ký quản trị (GET /api/audit-trail/system)
// ---------------------------------------------------------------------------

const SYSTEM_ACTION_META: Record<SystemAuditAction, { label: string; icon: LucideIcon; badgeClass: string }> = {
  Created: { label: 'Tạo mới', icon: Plus, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Updated: { label: 'Cập nhật', icon: Pencil, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  Deleted: { label: 'Xóa', icon: Trash2, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  StatusChanged: { label: 'Đổi trạng thái', icon: ClipboardList, badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' },
  Locked: { label: 'Khóa tài khoản', icon: Lock, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  Unlocked: { label: 'Mở khóa tài khoản', icon: LockOpen, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  StationAssigned: { label: 'Phân công trạm / tổ', icon: Building2, badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
  SettingsUpdated: { label: 'Đổi cấu hình', icon: Settings, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  Unblocked: { label: 'Gỡ chặn số', icon: LockOpen, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  BlockExtended: { label: 'Gia hạn chặn số', icon: Ban, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  Exported: { label: 'Xuất báo cáo', icon: FileDown, badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' },
};

/** Nhãn + icon + màu của một hành động quản trị; hành động lạ (backend thêm sau) hiện nguyên tên. */
export function systemActionMeta(action: string): { label: string; icon: LucideIcon; badgeClass: string } {
  return (
    SYSTEM_ACTION_META[action as SystemAuditAction] ?? {
      label: action,
      icon: ClipboardList,
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    }
  );
}

const ENTITY_TYPE_META: Record<SystemAuditEntityType, { label: string; icon: LucideIcon }> = {
  Station: { label: 'Trạm cứu hộ', icon: Building2 },
  RescueUnit: { label: 'Xe', icon: Truck },
  User: { label: 'Tài khoản', icon: UserCog },
  StationTeam: { label: 'Tổ làm việc', icon: Users },
  Settings: { label: 'Cấu hình', icon: Settings },
  EscalationRule: { label: 'Quy tắc leo thang', icon: ShieldAlert },
  BlockedNumber: { label: 'Số bị chặn', icon: Ban },
  Report: { label: 'Báo cáo', icon: FileDown },
};

export function entityTypeMeta(type: string): { label: string; icon: LucideIcon } {
  return ENTITY_TYPE_META[type as SystemAuditEntityType] ?? { label: type, icon: ClipboardList };
}

// Khóa cấu hình ghi trong entityName của bản ghi Settings.
const SETTINGS_KEY_LABEL: Record<string, string> = {
  dispatch: 'Tham số điều phối',
  escalation: 'Leo thang',
  serviceArea: 'Khu vực phục vụ',
};

/** Tên đối tượng dễ đọc (cấu hình thì đổi khóa "dispatch" → "Tham số điều phối"). */
export const entityDisplayName = (type: string, name: string | null) =>
  (type === 'Settings' && name ? SETTINGS_KEY_LABEL[name] : undefined) ?? name ?? '—';

const ACTOR_ROLE_LABEL: Record<string, string> = {
  Admin: 'Quản trị viên',
  Operator: 'Điều phối viên',
  RescueStaff: 'Đội cứu hộ',
  Citizen: 'Người dân',
  AI_Worker: 'AI',
  System: 'Hệ thống',
};

export const actorRoleLabel = (role: string | null) => (role ? ACTOR_ROLE_LABEL[role] ?? role : '—');

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

export interface StateChange {
  field: string;
  from: string | null;
  to: string | null;
}

const formatValue = (value: unknown): string =>
  value === null || value === undefined
    ? '—'
    : typeof value === 'boolean'
      ? value
        ? 'Có'
        : 'Không'
      : Array.isArray(value)
        ? value.map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))).join(', ') || '—'
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

/** Object lồng → khóa dạng "weights.distance" để so sánh từng trường (mảng giữ nguyên). */
function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(acc, flatten(value as Record<string, unknown>, path));
    else acc[path] = value;
    return acc;
  }, {});
}

function parseState(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? flatten(parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return { value: json };
  }
}

/**
 * Ghép oldStateJson / newStateJson thành danh sách "trường: cũ → mới". Trường chỉ có ở một phía thì phía kia là null
 * (VD "Hiện số" chỉ ghi trạng thái mới).
 */
export function stateChanges(oldJson: string | null, newJson: string | null): StateChange[] {
  const before = parseState(oldJson);
  const after = parseState(newJson);
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return fields
    .map((field) => ({
      field,
      from: field in before ? formatValue(before[field]) : null,
      to: field in after ? formatValue(after[field]) : null,
    }))
    .filter((c) => c.from !== c.to);
}

// Nhãn tiếng Việt cho các trường hay gặp trong ảnh chụp trước/sau; trường lạ hiện nguyên tên khóa.
const FIELD_LABEL: Record<string, string> = {
  name: 'Tên',
  fullName: 'Họ tên',
  email: 'Email',
  phoneNumber: 'Số điện thoại',
  role: 'Vai trò',
  status: 'Trạng thái',
  stationId: 'Trạm (mã)',
  stationName: 'Trạm',
  teamName: 'Tổ',
  lockReason: 'Lý do khóa',
  address: 'Địa chỉ',
  latitude: 'Vĩ độ',
  longitude: 'Kinh độ',
  isActive: 'Đang hoạt động',
  coverageRadiusKm: 'Bán kính phủ sóng (km)',
  headOperatorId: 'Operator phụ trách (mã)',
  plateNumber: 'Biển số',
  unitType: 'Loại xe',
  rescueUnitId: 'Xe (mã)',
  members: 'Thành viên',
  enabled: 'Bật',
  centerLat: 'Vĩ độ tâm',
  centerLng: 'Kinh độ tâm',
  radiusKm: 'Bán kính (km)',
  'weights.distance': 'Trọng số khoảng cách',
  'weights.stationLoad': 'Trọng số tải trạm',
  'weights.activeMissions': 'Trọng số nhiệm vụ đang chạy',
  radiusStepsKm: 'Nấc bán kính (km)',
  recoveryMinutes: 'Hồi sức (phút)',
  dayThresholdMinutes: 'Ngưỡng ban ngày (phút)',
  nightThresholdMinutes: 'Ngưỡng ban đêm (phút)',
  nightStart: 'Bắt đầu ca đêm',
  nightEnd: 'Kết thúc ca đêm',
  radiusMultiplier: 'Hệ số nhân bán kính',
  maxRadiusKm: 'Bán kính tối đa (km)',
  minSeverityLevel: 'Cấp tối thiểu',
  notifyRoles: 'Vai trò nhận cảnh báo',
  description: 'Mô tả',
  phone: 'Số điện thoại',
  reason: 'Lý do',
  expiresAt: 'Hết hạn',
  duration: 'Thời hạn',
  format: 'Định dạng',
};

export const fieldLabel = (field: string) => FIELD_LABEL[field] ?? field;

export interface StateComparisonRow {
  field: string;
  before: string | null;
  after: string | null;
  changed: boolean;
}

/**
 * So sánh oldValueJson / newValueJson theo từng trường (object lồng đã làm phẳng). Phía không có ảnh chụp
 * (VD Tạo mới không có "trước", Xóa không có "sau") trả null.
 */
export function compareStates(oldJson: string | null, newJson: string | null): StateComparisonRow[] {
  const before = oldJson ? parseState(oldJson) : null;
  const after = newJson ? parseState(newJson) : null;
  const fields = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  return fields.map((field) => {
    const b = before ? formatValue(before[field]) : null;
    const a = after ? formatValue(after[field]) : null;
    return { field, before: b, after: a, changed: !!before && !!after && b !== a };
  });
}
