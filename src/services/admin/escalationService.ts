import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import type { EscalationLogDto, EscalationRuleDto, EscalationRuleInput } from '../../types/escalation';

// Giới hạn của backend (CreateEscalationRuleDto / UpdateEscalationRuleDto).
export const TIMEOUT_MINUTES_RANGE = { min: 1, max: 60 };
export const EXPAND_RADIUS_PERCENT_RANGE = { min: 0, max: 200 };
export const DESCRIPTION_MAX_LENGTH = 500;

export type EscalationRuleErrors = Partial<Record<keyof EscalationRuleInput, string>>;

/** Dùng chung cho form (báo lỗi theo trường) và service (chặn trước khi gửi). */
export function validateEscalationRule(input: EscalationRuleInput): EscalationRuleErrors {
  const errors: EscalationRuleErrors = {};
  const { min: tMin, max: tMax } = TIMEOUT_MINUTES_RANGE;
  const { min: rMin, max: rMax } = EXPAND_RADIUS_PERCENT_RANGE;

  if (!Number.isInteger(input.timeoutMinutes) || input.timeoutMinutes < tMin || input.timeoutMinutes > tMax) {
    errors.timeoutMinutes = `Nhập số phút nguyên từ ${tMin} đến ${tMax}.`;
  }
  if (!Number.isInteger(input.expandRadiusPercent) || input.expandRadiusPercent < rMin || input.expandRadiusPercent > rMax) {
    errors.expandRadiusPercent = `Nhập số nguyên từ ${rMin} đến ${rMax}%.`;
  }
  // Backend bỏ qua NotifyRoles rỗng khi cập nhật → bắt buộc chọn ít nhất 1 vai trò.
  if (input.notifyRoles.length === 0) errors.notifyRoles = 'Chọn ít nhất 1 vai trò nhận cảnh báo.';
  if (input.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Mô tả tối đa ${DESCRIPTION_MAX_LENGTH} ký tự.`;
  }
  return errors;
}

const toBody = (input: EscalationRuleInput) => {
  const first = Object.values(validateEscalationRule(input))[0];
  if (first) throw new Error(first);
  return { ...input, notifyRoles: JSON.stringify(input.notifyRoles), description: input.description.trim() };
};

export const escalationService = {
  async listRules(): Promise<EscalationRuleDto[]> {
    const rules = await unwrapApi(apiClient.get<ApiResponse<EscalationRuleDto[]>>('/escalation/rules'));
    // Đang bật trước, cấp cao trước — giống thứ tự worker xét quy tắc.
    return [...rules].sort(
      (a, b) => Number(b.isActive) - Number(a.isActive) || b.minSeverityLevel.localeCompare(a.minSeverityLevel)
    );
  },

  async createRule(input: EscalationRuleInput): Promise<EscalationRuleDto> {
    return unwrapApi(apiClient.post<ApiResponse<EscalationRuleDto>>('/escalation/rules', toBody(input)));
  },

  async updateRule(id: string, input: EscalationRuleInput): Promise<EscalationRuleDto> {
    return unwrapApi(apiClient.put<ApiResponse<EscalationRuleDto>>(`/escalation/rules/${id}`, toBody(input)));
  },

  /** Chỉ bật/tắt — các trường khác bỏ trống thì backend giữ nguyên. */
  async setActive(id: string, isActive: boolean): Promise<EscalationRuleDto> {
    return unwrapApi(apiClient.put<ApiResponse<EscalationRuleDto>>(`/escalation/rules/${id}`, { isActive }));
  },

  async deleteRule(id: string): Promise<void> {
    await unwrapApi(apiClient.delete<ApiResponse<boolean>>(`/escalation/rules/${id}`));
  },

  /**
   * Nhật ký mới nhất trước. Backend phân trang (Skip/Take) nhưng không trả tổng số → hỏi thêm đúng 1 bản ghi
   * đứng sau trang hiện tại (page = page × pageSize + 1, pageSize = 1) để biết còn trang sau không.
   */
  async listLogs(page = 1, pageSize = 20): Promise<{ items: EscalationLogDto[]; hasNextPage: boolean }> {
    const getLogs = (params: { page: number; pageSize: number }) =>
      unwrapApi(apiClient.get<ApiResponse<EscalationLogDto[]>>('/escalation/logs', { params }));
    const [items, next] = await Promise.all([
      getLogs({ page, pageSize }),
      getLogs({ page: page * pageSize + 1, pageSize: 1 }),
    ]);
    return { items, hasNextPage: next.length > 0 };
  },

  /** Chạy ngay một lượt quét (không chờ chu kỳ 30s của worker). Trả về số sự cố vừa leo thang. */
  async triggerCheck(): Promise<number> {
    return unwrapApi(apiClient.post<ApiResponse<number>>('/escalation/trigger-check'));
  },
};
