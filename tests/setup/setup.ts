import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

// mapbox-gl cần WebGL → dùng bản giả cho mọi test (xem test/mapboxGlMock.ts).
vi.mock('mapbox-gl', async () => {
  const mod = await import('./mapboxGlMock');
  return { ...mod, default: mod.default };
});
import { cleanup } from '@testing-library/react';
import i18n from '@/i18n';

// Mặc định test chạy bằng tiếng Việt (giống ngôn ngữ mặc định của app).
beforeEach(async () => {
  if (i18n.language !== 'vi') await i18n.changeLanguage('vi');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// jsdom thiếu một số API trình duyệt mà component dùng.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
if (!window.scrollTo) window.scrollTo = () => {};
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.scrollTo ??= function scrollTo() {};
if (!('ResizeObserver' in window)) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
