export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  TIMEOUT_MS: 30000,
  TOKEN_KEY: 'resq_access_token',
  REFRESH_TOKEN_KEY: 'resq_refresh_token',
  USER_KEY: 'resq_user_data',
};
