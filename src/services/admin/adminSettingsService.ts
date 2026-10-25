import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';

// Mirror EmergencyDispatch.Application.DTOs.Settings. Backend đọc các cấu hình này ở mỗi lần gợi ý điều phối
// và mỗi lượt quét leo thang, nên Admin lưu là có tác dụng ngay.

/** Tham số gợi ý điều phối (FR-OP-04) — chỉnh cho thí nghiệm RQ2 mà không cần sửa code. */
export interface DispatchSettings {
  weights: { distance: number; stationLoad: number; activeMissions: number };
  radiusStepsKm: number[];
  recoveryMinutes: number;
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
}

/**
 * Khu vực phục vụ (tâm + bán kính). SOS ngoài vùng vẫn được nhận nhưng gắn cờ "ngoài khu vực" và báo realtime cho
 * Operator / Admin. Tắt (enabled = false) thì backend không kiểm tra.
 */
export interface ServiceAreaSettings {
  enabled: boolean;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

/** Giới hạn bán kính của StationAssignment.ValidateServiceArea. */
export const SERVICE_AREA_RADIUS_KM = { min: 1, max: 100 };

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

// Cùng quy tắc với SystemSettingsService.ValidateDispatch / ValidateEscalation ở backend,
// để form báo lỗi theo từng ô trước khi gửi.

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
    errors.radiusStepsKm = `Nấc cuối không được vượt bán kính tối đa của cấu hình leo thang (${maxRadiusKm} km).`;
  }

  if (!isPositive(s.recoveryMinutes)) errors.recoveryMinutes = 'Phải lớn hơn 0.';

  return stripEmpty(errors);
}

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

  const lastStep = dispatchStepsKm.length > 0 ? Math.max(...dispatchStepsKm) : 0;
  if (!isPositive(s.maxRadiusKm)) errors.maxRadiusKm = 'Phải lớn hơn 0.';
  else if (s.maxRadiusKm < lastStep) {
    errors.maxRadiusKm = `Không được nhỏ hơn nấc bán kính cuối của tham số điều phối (${lastStep} km).`;
  }

  return stripEmpty(errors);
}

export function validateServiceArea(s: ServiceAreaSettings): SettingsErrors<ServiceAreaSettings> {
  const errors: SettingsErrors<ServiceAreaSettings> = {};
  if (!s.name.trim()) errors.name = 'Vui lòng nhập tên khu vực.';
  if (s.enabled && s.centerLat === 0 && s.centerLng === 0) errors.centerLat = 'Vui lòng chọn tâm khu vực trên bản đồ.';
  if (!(s.radiusKm >= SERVICE_AREA_RADIUS_KM.min && s.radiusKm <= SERVICE_AREA_RADIUS_KM.max)) {
    errors.radiusKm = `Bán kính phải từ ${SERVICE_AREA_RADIUS_KM.min} đến ${SERVICE_AREA_RADIUS_KM.max} km.`;
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

  /** Giá trị mặc định theo SRS cho nút "Khôi phục mặc định" (điền vào form, Admin vẫn phải bấm Lưu). */
  async getDefaults(): Promise<{ escalation: EscalationSettings; dispatch: DispatchSettings }> {
    return unwrapApi(
      apiClient.get<ApiResponse<{ escalation: EscalationSettings; dispatch: DispatchSettings }>>('/settings/defaults')
    );
  },
};
