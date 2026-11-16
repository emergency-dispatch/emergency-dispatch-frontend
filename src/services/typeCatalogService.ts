import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import type {
  IncidentTypeDto,
  RescueUnitTypeDto,
  UpdateDispatchPlanDto,
  UpsertIncidentTypeDto,
  UpsertRescueUnitTypeDto,
} from '../../types/typeCatalog';

// Danh mục loại xe / loại sự cố (FE_MOBILE_HANDOFF §31–32). Backend trả nguyên danh sách (không phân trang);
// FE xếp lại giống backend (TypeCatalogRepository): displayOrder rồi tên tiếng Việt.
// Xóa: loại hệ thống → 400; loại đang được dùng → 409 (gợi ý Admin ẩn bằng isActive = false).

const byDisplayOrder = <T extends { displayOrder: number; nameVi: string }>(items: T[]) =>
  [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.nameVi.localeCompare(b.nameVi, 'vi'));

export const typeCatalogService = {
  /** includeInactive = true (Admin) để thấy cả loại đã ẩn — xe cũ vẫn có thể mang loại đó. */
  async listUnitTypes(includeInactive = true): Promise<RescueUnitTypeDto[]> {
    const items = await unwrapApi(
      apiClient.get<ApiResponse<RescueUnitTypeDto[]>>('/rescue-unit-types', { params: { includeInactive } })
    );
    return byDisplayOrder(items);
  },

  async createUnitType(input: UpsertRescueUnitTypeDto): Promise<RescueUnitTypeDto> {
    return unwrapApi(apiClient.post<ApiResponse<RescueUnitTypeDto>>('/rescue-unit-types', input));
  },

  async updateUnitType(id: string, input: UpsertRescueUnitTypeDto): Promise<RescueUnitTypeDto> {
    return unwrapApi(apiClient.put<ApiResponse<RescueUnitTypeDto>>(`/rescue-unit-types/${id}`, input));
  },

  async removeUnitType(id: string): Promise<void> {
    await unwrapApi(apiClient.delete<ApiResponse<null>>(`/rescue-unit-types/${id}`));
  },

  async listIncidentTypes(includeInactive = true): Promise<IncidentTypeDto[]> {
    const items = await unwrapApi(
      apiClient.get<ApiResponse<IncidentTypeDto[]>>('/incident-types', { params: { includeInactive } })
    );
    return byDisplayOrder(items);
  },

  async createIncidentType(input: UpsertIncidentTypeDto): Promise<IncidentTypeDto> {
    return unwrapApi(apiClient.post<ApiResponse<IncidentTypeDto>>('/incident-types', input));
  },

  async updateIncidentType(id: string, input: UpsertIncidentTypeDto): Promise<IncidentTypeDto> {
    return unwrapApi(apiClient.put<ApiResponse<IncidentTypeDto>>(`/incident-types/${id}`, input));
  },

  async removeIncidentType(id: string): Promise<void> {
    await unwrapApi(apiClient.delete<ApiResponse<null>>(`/incident-types/${id}`));
  },

  /** Thay toàn bộ kế hoạch điều xe theo mức (Level1–3) của một loại sự cố. */
  async updateDispatchPlan(id: string, input: UpdateDispatchPlanDto): Promise<IncidentTypeDto> {
    return unwrapApi(apiClient.put<ApiResponse<IncidentTypeDto>>(`/incident-types/${id}/dispatch-plan`, input));
  },
};
