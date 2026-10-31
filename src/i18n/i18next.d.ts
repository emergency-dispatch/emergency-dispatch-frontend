import 'i18next';
import type { ViTranslations } from './locales/vi';

// Kiểm tra key dịch lúc biên dịch: gõ sai key → lỗi TypeScript.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: ViTranslations };
  }
}
