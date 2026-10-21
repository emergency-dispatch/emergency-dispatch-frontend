import type { PaginatedResultDto } from '../../types/incident';

// Lọc / phân trang phía client cho các API backend trả nguyên danh sách (VD GET /api/stations).

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

/** Bỏ dấu tiếng Việt + chữ thường để tìm kiếm không phân biệt dấu. */
export const normalizeText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
