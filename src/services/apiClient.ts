import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/api';
import type { ApiResponse, AuthResponseDto } from '../types/auth';

export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(API_CONFIG.TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Token Refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 Unauthorized and not already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthEndpoint = originalRequest.url?.includes('/Auth/login') ||
        originalRequest.url?.includes('/Auth/refresh') ||
        originalRequest.url?.includes('/Auth/register');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const currentRefreshToken = localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY);

      if (!currentRefreshToken) {
        isRefreshing = false;
        handleAuthFailure();
        return Promise.reject(error);
      }

      try {
        // Direct call to avoid circular interceptor loop
        const response = await axios.post<ApiResponse<AuthResponseDto>>(
          `${API_CONFIG.BASE_URL}/Auth/refresh`,
          { refreshToken: currentRefreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAuthData = response.data.data;
        if (newAuthData?.accessToken) {
          localStorage.setItem(API_CONFIG.TOKEN_KEY, newAuthData.accessToken);
          if (newAuthData.refreshToken) {
            localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, newAuthData.refreshToken);
          }
          if (newAuthData.user) {
            localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(newAuthData.user));
          }

          processQueue(null, newAuthData.accessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAuthData.accessToken}`;
          }
          return apiClient(originalRequest);
        } else {
          throw new Error('No access token returned from refresh endpoint');
        }
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        handleAuthFailure();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function handleAuthFailure() {
  localStorage.removeItem(API_CONFIG.TOKEN_KEY);
  localStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY);
  localStorage.removeItem(API_CONFIG.USER_KEY);
  
  // Only redirect if not already on an auth page
  if (
    !window.location.pathname.startsWith('/login') &&
    !window.location.pathname.startsWith('/register') &&
    !window.location.pathname.startsWith('/forgot-password')
  ) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
}

/**
 * Utility to extract a clean user-facing error message from Axios errors
 */
export function getApiErrorMessage(error: unknown, fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiResponse<unknown> | undefined;
    if (apiError?.message) {
      return apiError.message;
    }
    if (apiError?.errors && apiError.errors.length > 0) {
      return apiError.errors.join(', ');
    }
    if (error.message === 'Network Error') {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và backend.';
    }
    if (error.response?.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.';
    }
    if (error.response?.status === 404) {
      return 'Không tìm thấy dữ liệu yêu cầu.';
    }
  } else if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}
