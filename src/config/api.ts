const getNormalizedBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) {
    return 'http://localhost:5000/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export const API_CONFIG = {
  BASE_URL: getNormalizedBaseUrl(),
  TIMEOUT_MS: 30000,
  TOKEN_KEY: 'resq_access_token',
  REFRESH_TOKEN_KEY: 'resq_refresh_token',
  USER_KEY: 'resq_user_data',
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN,
};
