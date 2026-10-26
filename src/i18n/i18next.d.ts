import type { vi } from './locales/vi';

// Kiểm tra key dịch lúc biên dịch: gõ sai key → lỗi TypeScript.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof vi };
  }
}
