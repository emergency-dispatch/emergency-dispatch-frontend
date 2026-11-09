import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import i18n from '../../i18n';

// Mirror EmergencyDispatch.Application.DTOs.Settings. Backend đọc các cấu hình này ở mỗi lần gợi ý điều phối
// và mỗi lượt quét leo thang, nên Admin lưu là có tác dụng ngay.
// Lưu ý: PUT ghi đè CẢ object — trường nào FE không gửi sẽ bị backend đặt về mặc định, nên interface phải đủ trường.

/** Tham số gợi ý điều phối (FR-OP-04) — chỉnh cho thí nghiệm RQ2 mà không cần sửa code. */
export interface DispatchSettings {
  weights: { distance: number; stationLoad: number; activeMissions: number };
  radiusStepsKm: number[];
  recoveryMinutes: number;
  /** Sự cố chưa được xác minh quá số giờ này thì tự hủy (AutoExpired). Backend: 1–168. */
  autoExpireHours: number;
}

/** Cấu hình Escalation Daemon (FR-SYS-02): ngưỡng chờ và mở rộng bán kính khi leo thang. */
export interface EscalationSettings {
  dayThresholdMinutes: number;
  nightThresholdMinutes: number;
  /** "HH:mm" giờ Việt Nam, khung có thể qua nửa đêm (VD 22:00 → 06:00). */
  nightStart: string;
  nightEnd: string;
  radiusMultiplier: number;
  maxRadiusKm: number;
  /** §21.2: yêu cầu từ hiện trường chưa xử lý quá số phút này → báo Admin + Operator trạm. Bước 0.5 phút. */
  fieldRequestThresholdMinutes: number;
}

/**
 * Khu vực phục vụ (tâm + bán kính), §22. SOS của người dân ngoài vùng: `rejectOutside` = true → bị từ chối;
 * false → vẫn nhận nhưng gắn cờ "ngoài khu vực" và báo realtime cho Operator / Admin.
 * Tắt (enabled = false) thì backend không kiểm tra.
 */
export interface ServiceAreaSettings {
  enabled: boolean;
  rejectOutside: boolean;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

/** Giới hạn bán kính của StationAssignment.ValidateServiceArea. */
export const SERVICE_AREA_RADIUS_KM = { min: 1, max: 100 };

/**
 * BR-07 — tự gộp SOS trùng của người dân vào sự cố đang mở (DuplicateDetectionSettingsDto).
 * Tắt (enabled = false) thì mọi SOS vào hàng đợi như sự cố riêng.
 */
export interface DuplicateDetectionSettings {
  enabled: boolean;
  /** Khoảng cách tối đa tới sự cố gốc (m). */
  radiusMeters: number;
  /** Khung thời gian (phút) tính từ lần báo gần nhất của sự cố gốc. */
  windowMinutes: number;
}

/**
 * Giới hạn của SystemSettingsService.ValidateDuplicateDetection (backend không có API trả giới hạn) —
 * lặp lại để báo lỗi theo ô; backend vẫn kiểm tra lại khi lưu.
 */
export const DUPLICATE_DETECTION_LIMITS = {
  radiusMeters: { min: 20, max: 2000 },
  windowMinutes: { min: 1, max: 120 },
} as const;

export interface SettingsRecord<T> {
  values: T;
  /** null = chưa ai chỉnh, đang dùng giá trị mặc định. */
  updatedAt: string | null;
  updatedByName: string | null;
}

export type SettingsErrors<T> = Partial<Record<keyof T, string>>;

/** Mirror SettingsDefaultsDto (GET /api/settings/defaults). */
export interface SettingsDefaults {
  escalation: EscalationSettings;
  dispatch: DispatchSettings;
  serviceArea: ServiceAreaSettings;
  duplicateDetection: DuplicateDetectionSettings;
}

export const WEIGHT_SUM_TOLERANCE = 0.001;
/** Giới hạn của SystemSettingsService.ValidateDispatch. */
export const AUTO_EXPIRE_HOURS = { min: 1, max: 168 };
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isPositive = (n: number) => Number.isFinite(n) && n > 0;
const isHalfStep = (n: number) => Number.isInteger(n * 2);

// Cùng quy tắc với SystemSettingsService.ValidateDispatch / ValidateEscalation ở backend,
// để form báo lỗi theo từng ô trước khi gửi.

export function validateDispatchSettings(s: DispatchSettings, maxRadiusKm: number): SettingsErrors<DispatchSettings> {
  const errors: SettingsErrors<DispatchSettings> = {};
  const { distance, stationLoad, activeMissions } = s.weights;

  if (![distance, stationLoad, activeMissions].every(isPositive)) {
    errors.weights = i18n.t('admin.settings.validation.weightsPositive');
  } else if (Math.abs(distance + stationLoad + activeMissions - 1) > WEIGHT_SUM_TOLERANCE) {
    errors.weights = i18n.t('admin.settings.validation.weightsSum');
  }

  if (s.radiusStepsKm.length === 0) errors.radiusStepsKm = i18n.t('admin.settings.validation.stepsRequired');
  else if (!s.radiusStepsKm.every(isPositive)) errors.radiusStepsKm = i18n.t('admin.settings.validation.stepsPositive');
  else if (s.radiusStepsKm.some((r, i) => i > 0 && r <= s.radiusStepsKm[i - 1])) {
    errors.radiusStepsKm = i18n.t('admin.settings.validation.stepsIncreasing');
  } else if (s.radiusStepsKm[s.radiusStepsKm.length - 1] > maxRadiusKm) {
    errors.radiusStepsKm = i18n.t('admin.settings.validation.stepsExceedMax', { km: maxRadiusKm });
  }

  if (!isPositive(s.recoveryMinutes)) errors.recoveryMinutes = i18n.t('admin.common.settings.mustBePositive');
  if (!(s.autoExpireHours >= AUTO_EXPIRE_HOURS.min && s.autoExpireHours <= AUTO_EXPIRE_HOURS.max)) {
    errors.autoExpireHours = i18n.t('admin.settings.validation.autoExpireRange', AUTO_EXPIRE_HOURS);
  }

  return stripEmpty(errors);
}

export function validateEscalationSettings(
  s: EscalationSettings,
  dispatchStepsKm: number[]
): SettingsErrors<EscalationSettings> {
  const errors: SettingsErrors<EscalationSettings> = {};
  const threshold = (n: number) =>
    !isPositive(n)
      ? i18n.t('admin.common.settings.mustBePositive')
      : !isHalfStep(n)
        ? i18n.t('admin.settings.validation.halfStep')
        : undefined;

  errors.dayThresholdMinutes = threshold(s.dayThresholdMinutes);
  errors.nightThresholdMinutes = threshold(s.nightThresholdMinutes);
  errors.fieldRequestThresholdMinutes = threshold(s.fieldRequestThresholdMinutes);
  if (!TIME_PATTERN.test(s.nightStart)) errors.nightStart = i18n.t('admin.settings.validation.invalidTime');
  if (!TIME_PATTERN.test(s.nightEnd)) errors.nightEnd = i18n.t('admin.settings.validation.invalidTime');
  else if (s.nightStart === s.nightEnd) errors.nightEnd = i18n.t('admin.settings.validation.sameStartEnd');
  if (!isPositive(s.radiusMultiplier)) errors.radiusMultiplier = i18n.t('admin.common.settings.mustBePositive');

  const lastStep = dispatchStepsKm.length > 0 ? Math.max(...dispatchStepsKm) : 0;
  if (!isPositive(s.maxRadiusKm)) errors.maxRadiusKm = i18n.t('admin.common.settings.mustBePositive');
  else if (s.maxRadiusKm < lastStep) {
    errors.maxRadiusKm = i18n.t('admin.settings.validation.maxBelowLastStep', { km: lastStep });
  }

  return stripEmpty(errors);
}

export function validateServiceArea(s: ServiceAreaSettings): SettingsErrors<ServiceAreaSettings> {
  const errors: SettingsErrors<ServiceAreaSettings> = {};
  if (!s.name.trim()) errors.name = i18n.t('admin.settings.validation.areaNameRequired');
  if (s.enabled && s.centerLat === 0 && s.centerLng === 0) errors.centerLat = i18n.t('admin.settings.validation.areaCenterRequired');
  if (!(s.radiusKm >= SERVICE_AREA_RADIUS_KM.min && s.radiusKm <= SERVICE_AREA_RADIUS_KM.max)) {
    errors.radiusKm = i18n.t('admin.settings.validation.areaRadiusRange', SERVICE_AREA_RADIUS_KM);
  }
  return stripEmpty(errors);
}

export function validateDuplicateDetection(s: DuplicateDetectionSettings): SettingsErrors<DuplicateDetectionSettings> {
  const errors: SettingsErrors<DuplicateDetectionSettings> = {};
  const { radiusMeters: radius, windowMinutes: window } = DUPLICATE_DETECTION_LIMITS;
  // NaN (ô trống) cũng rơi vào nhánh lỗi.
  if (!(s.radiusMeters >= radius.min && s.radiusMeters <= radius.max)) {
    errors.radiusMeters = i18n.t('admin.settings.validation.duplicateRadiusRange', radius);
  }
  if (!(s.windowMinutes >= window.min && s.windowMinutes <= window.max)) {
    errors.windowMinutes = i18n.t('admin.settings.validation.duplicateWindowRange', window);
  }
  return stripEmpty(errors);
}

function stripEmpty<T>(errors: SettingsErrors<T>): SettingsErrors<T> {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as SettingsErrors<T>;
}

export const adminSettingsService = {
  async getDispatchSettings(): Promise<SettingsRecord<DispatchSettings>> {
    return unwrapApi(apiClient.get<ApiResponse<SettingsRecord<DispatchSettings>>>('/settings/dispatch'));
  },

  async updateDispatchSettings(values: DispatchSettings): Promise<SettingsRecord<DispatchSettings>> {
    return unwrapApi(apiClient.put<ApiResponse<SettingsRecord<DispatchSettings>>>('/settings/dispatch', values));
  },

  async getEscalationSettings(): Promise<SettingsRecord<EscalationSettings>> {
    return unwrapApi(apiClient.get<ApiResponse<SettingsRecord<EscalationSettings>>>('/settings/escalation'));
  },

  async updateEscalationSettings(values: EscalationSettings): Promise<SettingsRecord<EscalationSettings>> {
    return unwrapApi(apiClient.put<ApiResponse<SettingsRecord<EscalationSettings>>>('/settings/escalation', values));
  },

  async getServiceArea(): Promise<SettingsRecord<ServiceAreaSettings>> {
    return unwrapApi(apiClient.get<ApiResponse<SettingsRecord<ServiceAreaSettings>>>('/settings/service-area'));
  },

  async updateServiceArea(values: ServiceAreaSettings): Promise<SettingsRecord<ServiceAreaSettings>> {
    return unwrapApi(apiClient.put<ApiResponse<SettingsRecord<ServiceAreaSettings>>>('/settings/service-area', values));
  },

  async getDuplicateDetection(): Promise<SettingsRecord<DuplicateDetectionSettings>> {
    return unwrapApi(apiClient.get<ApiResponse<SettingsRecord<DuplicateDetectionSettings>>>('/settings/duplicate-detection'));
  },

  async updateDuplicateDetection(values: DuplicateDetectionSettings): Promise<SettingsRecord<DuplicateDetectionSettings>> {
    return unwrapApi(
      apiClient.put<ApiResponse<SettingsRecord<DuplicateDetectionSettings>>>('/settings/duplicate-detection', values)
    );
  },

  /** Giá trị mặc định theo SRS cho nút "Khôi phục mặc định" (điền vào form, Admin vẫn phải bấm Lưu). */
  async getDefaults(): Promise<SettingsDefaults> {
    return unwrapApi(apiClient.get<ApiResponse<SettingsDefaults>>('/settings/defaults'));
  },
};
