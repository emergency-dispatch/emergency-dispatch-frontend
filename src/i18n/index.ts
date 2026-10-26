import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { vi } from './locales/vi';

// Song ngữ vi / en cho Command Center của Operator và trang Admin. Chữ giao diện dịch ở đây; câu thông báo từ API
// do backend dịch theo header Accept-Language (services/operatorAdminLanguage.ts) và ?culture= của SignalR.

export type AppLanguage = 'vi' | 'en';

export const LANGUAGE_OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: 'vi', label: 'VI' },
  { value: 'en', label: 'EN' },
];

const STORAGE_KEY = 'resq.language';

function readStoredLanguage(): AppLanguage {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: readStoredLanguage(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

export const getLanguage = (): AppLanguage => (i18n.language === 'en' ? 'en' : 'vi');

export function setLanguage(language: AppLanguage) {
  i18n.changeLanguage(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Không lưu được (chế độ riêng tư…) → chỉ đổi trong phiên này.
  }
}

/** Hiển thị ngôn ngữ đã lưu khi vào Command Center / Admin (các trang khác có thể đã đổi ngôn ngữ hiển thị). */
export const restoreStoredLanguage = () => {
  const stored = readStoredLanguage();
  if (i18n.language !== stored) i18n.changeLanguage(stored);
};

/** Locale cho toLocaleString / toLocaleTimeString theo ngôn ngữ đang chọn. */
export const dateLocale = (): string => (getLanguage() === 'en' ? 'en-US' : 'vi-VN');

export { useTranslation, Trans } from 'react-i18next';
export default i18n;
