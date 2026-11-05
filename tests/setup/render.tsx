import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';

/** Render trong MemoryRouter (trang dùng useSearchParams / Link / useNavigate). */
export function renderWithRouter(ui: ReactElement, url = '/') {
  return render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);
}

/** Dịch key i18n theo ngôn ngữ đang dùng trong test (mặc định vi). */
export const t = (key: string, opts?: Record<string, unknown>) => (i18n.t as unknown as (k: string, o?: object) => string)(key, opts);

/** Trang kết quả phân trang tối giản. */
export const page = <T,>(items: T[], extra: Partial<{ pageIndex: number; totalPages: number; totalCount: number }> = {}) => ({
  items,
  pageIndex: 1,
  pageSize: 10,
  totalCount: items.length,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
  ...extra,
});
