import { DEFAULT_DISPATCH_SETTINGS, DEFAULT_ESCALATION_SETTINGS } from '../../data/admin/settingsDefaults';
import type { AuditChange } from '../../types/auditTrail';
import { adminStore } from './adminStore';
import { auditTrailService } from './auditTrailService';
import { clone, getMockActor, mockApiError, mockDelay } from './adminMock';

/** Cấu hình Escalation Daemon (FR-SYS-02) — chỉ áp dụng cho sự cố Cấp 3. */
export interface EscalationSettings {
  dayThresholdMinutes: number;
  nightThresholdMinutes: number;
  /** "HH:mm". Khung có thể qua nửa đêm (VD 22:00 → 06:00). */
  nightStart: string;
  nightEnd: string;
  /** Sự cố leo thang: bán kính tìm xe × hệ số này, không vượt maxRadiusKm. */
  radiusMultiplier: number;
  maxRadiusKm: number;
}

/** Tham số gợi ý điều phối (FR-OP-04) — chỉnh cho thí nghiệm RQ2 mà không cần sửa code. */
export interface DispatchSettings {
  weights: { distance: number; stationLoad: number; activeMissions: number };
  radiusStepsKm: number[];
  crewAckTimeoutSeconds: number;
  recoveryMinutes: number;
}

export interface SettingsRecord<T> {
  values: T;
  /** null = chưa ai chỉnh, đang dùng giá trị mặc định. */
  updatedAt: string | null;
  updatedByName: string | null;
}

export type SettingsErrors<T> = Partial<Record<keyof T, string>>;

export const WEIGHT_SUM_TOLERANCE = 0.001;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isPositive = (n: number) => Number.isFinite(n) && n > 0;
const isHalfStep = (n: number) => Number.isInteger(n * 2);

// Dùng chung cho UI (báo lỗi theo trường) và service (ném 400) để hai bên luôn khớp nhau.

export function validateEscalationSettings(
  s: EscalationSettings,
  dispatchStepsKm: number[]
): SettingsErrors<EscalationSettings> {
  const errors: SettingsErrors<EscalationSettings> = {};
  const threshold = (n: number) =>
    !isPositive(n) ? 'Phải lớn hơn 0.' : !isHalfStep(n) ? 'Chỉ nhận bước 0.5 phút (VD 2, 2.5, 3).' : undefined;

  errors.dayThresholdMinutes = threshold(s.dayThresholdMinutes);
  errors.nightThresholdMinutes = threshold(s.nightThresholdMinutes);
  if (!TIME_PATTERN.test(s.nightStart)) errors.nightStart = 'Giờ không hợp lệ.';
  if (!TIME_PATTERN.test(s.nightEnd)) errors.nightEnd = 'Giờ không hợp lệ.';
  else if (s.nightStart === s.nightEnd) errors.nightEnd = 'Giờ kết thúc phải khác giờ bắt đầu.';
  if (!isPositive(s.radiusMultiplier)) errors.radiusMultiplier = 'Phải lớn hơn 0.';

  const lastStep = dispatchStepsKm[dispatchStepsKm.length - 1] ?? 0;
  if (!isPositive(s.maxRadiusKm)) errors.maxRadiusKm = 'Phải lớn hơn 0.';
  else if (s.maxRadiusKm < lastStep) {
    errors.maxRadiusKm = `Không được nhỏ hơn nấc bán kính cuối của Tham số điều phối (${lastStep} km).`;
  }

  return stripEmpty(errors);
}

export function validateDispatchSettings(s: DispatchSettings, maxRadiusKm: number): SettingsErrors<DispatchSettings> {
  const errors: SettingsErrors<DispatchSettings> = {};
  const { distance, stationLoad, activeMissions } = s.weights;

  if (![distance, stationLoad, activeMissions].every(isPositive)) {
    errors.weights = 'Mỗi trọng số phải lớn hơn 0.';
  } else if (Math.abs(distance + stationLoad + activeMissions - 1) > WEIGHT_SUM_TOLERANCE) {
    errors.weights = 'Tổng ba trọng số phải bằng 1.';
  }

  if (s.radiusStepsKm.length === 0) errors.radiusStepsKm = 'Cần ít nhất 1 nấc bán kính.';
  else if (!s.radiusStepsKm.every(isPositive)) errors.radiusStepsKm = 'Mỗi nấc bán kính phải lớn hơn 0.';
  else if (s.radiusStepsKm.some((r, i) => i > 0 && r <= s.radiusStepsKm[i - 1])) {
    errors.radiusStepsKm = 'Các nấc bán kính phải tăng dần.';
  } else if (s.radiusStepsKm[s.radiusStepsKm.length - 1] > maxRadiusKm) {
    errors.radiusStepsKm = `Nấc cuối không được vượt bán kính tối đa của Cấu hình leo thang (${maxRadiusKm} km).`;
  }

  if (!isPositive(s.crewAckTimeoutSeconds)) errors.crewAckTimeoutSeconds = 'Phải lớn hơn 0.';
  else if (!Number.isInteger(s.crewAckTimeoutSeconds)) errors.crewAckTimeoutSeconds = 'Nhập số giây nguyên.';
  if (!isPositive(s.recoveryMinutes)) errors.recoveryMinutes = 'Phải lớn hơn 0.';

  return stripEmpty(errors);
}

function stripEmpty<T>(errors: SettingsErrors<T>): SettingsErrors<T> {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as SettingsErrors<T>;
}

function throwIfInvalid<T>(errors: SettingsErrors<T>) {
  const first = Object.values(errors)[0];
  if (first) throw mockApiError(400, first as string);
}

// Nhãn và định dạng cho Audit Trail (giá trị cũ → mới của từng trường thay đổi).
const ESCALATION_FIELDS: { label: string; format: (s: EscalationSettings) => string }[] = [
  { label: 'Ngưỡng chờ ban ngày', format: (s) => `${s.dayThresholdMinutes} phút` },
  { label: 'Ngưỡng chờ ban đêm', format: (s) => `${s.nightThresholdMinutes} phút` },
  { label: 'Bắt đầu khung đêm', format: (s) => s.nightStart },
  { label: 'Kết thúc khung đêm', format: (s) => s.nightEnd },
  { label: 'Hệ số mở rộng bán kính', format: (s) => `×${s.radiusMultiplier}` },
  { label: 'Bán kính tối đa', format: (s) => `${s.maxRadiusKm} km` },
];

const DISPATCH_FIELDS: { label: string; format: (s: DispatchSettings) => string }[] = [
  { label: 'Trọng số khoảng cách', format: (s) => String(s.weights.distance) },
  { label: 'Trọng số tải trạm', format: (s) => String(s.weights.stationLoad) },
  { label: 'Trọng số nhiệm vụ đang chạy', format: (s) => String(s.weights.activeMissions) },
  { label: 'Nấc bán kính', format: (s) => `${s.radiusStepsKm.join(' → ')} km` },
  { label: 'Thời gian chờ đội phản hồi', format: (s) => `${s.crewAckTimeoutSeconds} giây` },
  { label: 'Thời gian hồi sức', format: (s) => `${s.recoveryMinutes} phút` },
];

function diff<T>(fields: { label: string; format: (s: T) => string }[], before: T, after: T): AuditChange[] {
  return fields
    .map((f) => ({ field: f.label, from: f.format(before), to: f.format(after) }))
    .filter((c) => c.from !== c.to);
}

function save<T>(record: SettingsRecord<T>, values: T, changes: AuditChange[], targetId: string, targetLabel: string) {
  if (changes.length === 0) return clone(record);
  const actor = getMockActor();
  record.values = clone(values);
  record.updatedAt = new Date().toISOString();
  record.updatedByName = actor.name;
  auditTrailService.record({
    action: 'settings_changed',
    targetType: 'settings',
    targetId,
    targetLabel,
    detail: `Thay đổi ${changes.length} tham số: ${changes.map((c) => c.field.toLowerCase()).join(', ')}.`,
    changes,
  });
  return clone(record);
}

export const adminSettingsService = {
  // TODO(backend): GET /api/Settings/escalation
  async getEscalationSettings(): Promise<SettingsRecord<EscalationSettings>> {
    await mockDelay();
    return clone(adminStore.settings.escalation);
  },

  // TODO(backend): PUT /api/Settings/escalation
  async updateEscalationSettings(values: EscalationSettings): Promise<SettingsRecord<EscalationSettings>> {
    await mockDelay();
    throwIfInvalid(validateEscalationSettings(values, adminStore.settings.dispatch.values.radiusStepsKm));
    const record = adminStore.settings.escalation;
    return save(record, values, diff(ESCALATION_FIELDS, record.values, values), 'escalation', 'Cấu hình leo thang');
  },

  // TODO(backend): GET /api/Settings/dispatch
  async getDispatchSettings(): Promise<SettingsRecord<DispatchSettings>> {
    await mockDelay();
    return clone(adminStore.settings.dispatch);
  },

  // TODO(backend): PUT /api/Settings/dispatch
  async updateDispatchSettings(values: DispatchSettings): Promise<SettingsRecord<DispatchSettings>> {
    await mockDelay();
    throwIfInvalid(validateDispatchSettings(values, adminStore.settings.escalation.values.maxRadiusKm));
    const record = adminStore.settings.dispatch;
    return save(record, values, diff(DISPATCH_FIELDS, record.values, values), 'dispatch', 'Tham số điều phối');
  },

  /** Giá trị mặc định cho nút "Khôi phục mặc định" (điền vào form, Admin vẫn phải bấm Lưu). */
  // TODO(backend): GET /api/Settings/defaults
  async getDefaults(): Promise<{ escalation: EscalationSettings; dispatch: DispatchSettings }> {
    await mockDelay();
    return clone({ escalation: DEFAULT_ESCALATION_SETTINGS, dispatch: DEFAULT_DISPATCH_SETTINGS });
  },
};
