import { AxiosError, type AxiosResponse } from 'axios';
import { API_CONFIG } from '../../config/api';
import type { ApiResponse, UserDto } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';

// Tiện ích chung cho các service Admin chạy mock (backend chưa có API quản trị).

/** Giả lập độ trễ mạng 200–500ms. */
export const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));

/**
 * Ném lỗi có hình dạng giống AxiosError của backend thật ({ success, message } + HTTP status),
 * để UI dùng chung getApiErrorMessage — khi đổi sang API thật không phải sửa UI.
 */
export function mockApiError(status: 400 | 404 | 409, message: string): AxiosError<ApiResponse<null>> {
  const response = {
    status,
    statusText: String(status),
    data: { success: false, message, data: null },
    headers: {},
    config: {},
  } as AxiosResponse<ApiResponse<null>>;
  return new AxiosError(message, `ERR_${status}`, undefined, undefined, response);
}

export interface PageParams {
  pageIndex?: number;
  pageSize?: number;
}

export function paginate<T>(items: T[], { pageIndex = 1, pageSize = 10 }: PageParams): PaginatedResultDto<T> {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(1, pageIndex), totalPages);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    pageIndex: page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

export const normalizeText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

/** Người thao tác hiện tại — backend thật lấy từ JWT. */
export function getMockActor(): { id: string; name: string } {
  try {
    const user = JSON.parse(localStorage.getItem(API_CONFIG.USER_KEY) ?? 'null') as UserDto | null;
    if (user) return { id: user.id, name: user.fullName };
  } catch {
    // ignore — dữ liệu localStorage hỏng
  }
  return { id: 'local-admin', name: 'Quản trị viên' };
}

/** Bản sao sâu để UI không sửa trực tiếp được store trong bộ nhớ. */
export const clone = <T>(value: T): T => structuredClone(value);
