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
import i18n from '../../../i18n';
import { adminMonitoringVi } from '../../../i18n/locales/vi/admin/monitoring';

// Nhóm chỉ để tô màu / gắn icon — backend lọc theo từng hành động, không theo nhóm.
type AuditGroup = 'incident' | 'dispatch' | 'escalation' | 'privacy';

const GROUP_META: Record<AuditGroup, { icon: LucideIcon; badgeClass: string }> = {
  incident: { icon: Siren, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  dispatch: { icon: ClipboardList, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  escalation: { icon: TriangleAlert, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  privacy: { icon: EyeOff, badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
};

// Nhãn dịch theo admin.monitoring.audit.* (incidentAction, systemAction, entityType, settingsKey, actorRole, field).
const ACTION_GROUP: Record<AuditAction, AuditGroup> = {
  Created: 'incident',
  AiAnalyzed: 'incident',
  Verified: 'incident',
  SeverityOverridden: 'incident',
  StatusChanged: 'incident',
  Cancelled: 'incident',
  Completed: 'incident',
  Closed: 'incident',
  Dispatched: 'dispatch',
  ReDispatched: 'dispatch',
  AssignmentAccepted: 'dispatch',
  AssignmentRejected: 'dispatch',
  Escalated: 'escalation',
  DeEscalated: 'escalation',
  PhoneRevealed: 'privacy',
  ReporterBlocked: 'privacy',
  TransferredStation: 'dispatch',
  OutOfServiceArea: 'escalation',
};

const has = <T extends object>(obj: T, key: string): key is Extract<keyof T, string> => Object.prototype.hasOwnProperty.call(obj, key);

/** Nhãn + icon + màu của một hành động; hành động lạ (backend thêm sau) hiện nguyên tên. */
export function auditActionMeta(action: string): { label: string; icon: LucideIcon; badgeClass: string } {
  const known = has(ACTION_GROUP, action);
  const group = GROUP_META[known ? ACTION_GROUP[action] : 'incident'];
  return { label: known ? i18n.t(`admin.monitoring.audit.incidentAction.${action}`) : action, ...group };
}

// ---------------------------------------------------------------------------
// Nhật ký quản trị (GET /api/audit-trail/system)
// ---------------------------------------------------------------------------

const SYSTEM_ACTION_META: Record<SystemAuditAction, { icon: LucideIcon; badgeClass: string }> = {
  Created: { icon: Plus, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Updated: { icon: Pencil, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  Deleted: { icon: Trash2, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  StatusChanged: { icon: ClipboardList, badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' },
  Locked: { icon: Lock, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  Unlocked: { icon: LockOpen, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  StationAssigned: { icon: Building2, badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
  SettingsUpdated: { icon: Settings, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  Unblocked: { icon: LockOpen, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  BlockExtended: { icon: Ban, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  Exported: { icon: FileDown, badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' },
};

/** Nhãn + icon + màu của một hành động quản trị; hành động lạ (backend thêm sau) hiện nguyên tên. */
export function systemActionMeta(action: string): { label: string; icon: LucideIcon; badgeClass: string } {
  if (has(SYSTEM_ACTION_META, action)) {
    return { label: i18n.t(`admin.monitoring.audit.systemAction.${action}`), ...SYSTEM_ACTION_META[action] };
  }
  return { label: action, icon: ClipboardList, badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' };
}

const ENTITY_TYPE_ICON: Record<SystemAuditEntityType, LucideIcon> = {
  Station: Building2,
  RescueUnit: Truck,
  User: UserCog,
  StationTeam: Users,
  Settings: Settings,
  EscalationRule: ShieldAlert,
  BlockedNumber: Ban,
  Report: FileDown,
};

export function entityTypeMeta(type: string): { label: string; icon: LucideIcon } {
  return has(ENTITY_TYPE_ICON, type)
    ? { label: i18n.t(`admin.monitoring.audit.entityType.${type}`), icon: ENTITY_TYPE_ICON[type] }
    : { label: type, icon: ClipboardList };
}

/** Tên đối tượng dễ đọc (cấu hình thì đổi khóa "dispatch" → "Tham số điều phối"). */
export const entityDisplayName = (type: string, name: string | null) =>
  type === 'Settings' && name && has(adminMonitoringVi.audit.settingsKey, name)
    ? i18n.t(`admin.monitoring.audit.settingsKey.${name}`)
    : (name ?? '—');

export const actorRoleLabel = (role: string | null) =>
  !role ? '—' : has(adminMonitoringVi.audit.actorRole, role) ? i18n.t(`admin.monitoring.audit.actorRole.${role}`) : role;

const pad = (n: number) => String(n).padStart(2, '0');

/** dd/MM/yyyy HH:mm:ss theo giờ địa phương. */
export function formatAuditTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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
        ? i18n.t('admin.monitoring.audit.yes')
        : i18n.t('admin.monitoring.audit.no')
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

// Nhãn cho các trường hay gặp trong ảnh chụp trước/sau; trường lạ hiện nguyên tên khóa.
export const fieldLabel = (field: string) => {
  const key = field.replace('.', '_');
  return has(adminMonitoringVi.audit.field, key) ? i18n.t(`admin.monitoring.audit.field.${key}`) : field;
};

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
