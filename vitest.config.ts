import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Unit test (Vitest + Testing Library). Test nằm trong tests/ (cấu trúc thư mục giống src/),
// helper dùng chung ở tests/setup/. Import code nguồn qua alias '@/'.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
      env: {
        VITE_API_URL: 'http://api.test/api',
        VITE_MAPBOX_TOKEN: 'test-mapbox-token',
      },
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/i18n/locales/**', 'src/**/*.d.ts', 'src/main.tsx'],
        reporter: ['text-summary', 'html'],
      },
    },
  }),
);
