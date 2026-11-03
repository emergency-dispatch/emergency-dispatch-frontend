import { vi } from 'vitest';

/**
 * Dùng trong `vi.mock('<đường dẫn>/apiClient', () => mockApiClientModule())` — giữ nguyên unwrapApi /
 * getApiErrorMessage thật, chỉ thay các hàm HTTP bằng vi.fn().
 */
export async function mockApiClientModule(importOriginal: () => Promise<Record<string, unknown>>) {
  const actual = await importOriginal();
  const fn = Object.assign(vi.fn(), {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  });
  return { ...actual, apiClient: fn };
}
