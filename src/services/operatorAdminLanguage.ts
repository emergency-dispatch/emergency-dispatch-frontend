import { apiClient } from './apiClient';

// Backend chọn ngôn ngữ thông báo theo Accept-Language; không gửi thì trình duyệt tự gửi ngôn ngữ của nó
// (VD en-US) → lỗi trả về tiếng Anh trong khi giao diện là tiếng Việt.
// Chỉ áp dụng khi đang ở Command Center (/dashboard) hoặc Admin (/admin) — các role khác giữ nguyên hành vi.
// Đăng ký lúc nạp module (không đợi layout mount) để cả các request đầu tiên của DispatchProvider cũng có header.
const OPERATOR_ADMIN_PATH = /^\/(dashboard|admin)(\/|$)/;

apiClient.interceptors.request.use((config) => {
  if (OPERATOR_ADMIN_PATH.test(window.location.pathname) && !config.headers.has('Accept-Language')) {
    config.headers.set('Accept-Language', 'vi');
  }
  return config;
});
