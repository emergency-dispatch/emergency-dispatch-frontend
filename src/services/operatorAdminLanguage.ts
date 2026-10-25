import { apiClient } from './apiClient';
import { getLanguage } from '../i18n';

// Backend chọn ngôn ngữ thông báo theo Accept-Language; không gửi thì trình duyệt tự gửi ngôn ngữ của nó
// (VD en-US) → lỗi trả về tiếng Anh trong khi giao diện là tiếng Việt.
// Chỉ áp dụng khi đang ở Command Center (/dashboard) hoặc Admin (/admin) — các role khác giữ nguyên hành vi.
// Đăng ký lúc nạp module (không đợi layout mount) để cả các request đầu tiên của DispatchProvider cũng có header.
// Command Center gửi ngôn ngữ người dùng chọn (nút VI / EN); Admin chưa song ngữ nên luôn gửi 'vi'.
const OPERATOR_PATH = /^\/dashboard(\/|$)/;
const ADMIN_PATH = /^\/admin(\/|$)/;

apiClient.interceptors.request.use((config) => {
  const path = window.location.pathname;
  const language = OPERATOR_PATH.test(path) ? getLanguage() : ADMIN_PATH.test(path) ? 'vi' : null;
  if (language && !config.headers.has('Accept-Language')) {
    config.headers.set('Accept-Language', language);
  }
  return config;
});
