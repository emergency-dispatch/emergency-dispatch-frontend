import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, getApiErrorMessage, unwrapApi } from '@/services/apiClient';
import '@/services/operatorAdminLanguage';
import { API_CONFIG } from '@/config/api';
import i18n from '@/i18n';

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data?: unknown };

/** Thay adapter HTTP của apiClient để chạy interceptor thật mà không cần mạng. */
function useAdapter(handler: Handler) {
  const calls: InternalAxiosRequestConfig[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    const { status, data } = handler(config);
    const response = { data, status, statusText: String(status), headers: {}, config, request: {} };
    if (status >= 400) throw new AxiosError('Request failed', String(status), config, {}, response);
    return response;
  };
  return calls;
}

const originalAdapter = apiClient.defaults.adapter;

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  window.history.pushState({}, '', '/');
});

describe('apiClient – request interceptor', () => {
  it('gắn Bearer token khi có', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok-1');
    const calls = useAdapter(() => ({ status: 200, data: {} }));
    await apiClient.get('/x');
    expect(calls[0].headers.Authorization).toBe('Bearer tok-1');
  });

  it('không có token → không gắn header', async () => {
    const calls = useAdapter(() => ({ status: 200, data: {} }));
    await apiClient.get('/x');
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it('baseURL lấy từ VITE_API_URL', () => {
    expect(apiClient.defaults.baseURL).toBe('http://api.test/api');
  });
});

describe('operatorAdminLanguage – Accept-Language', () => {
  it.each(['/dashboard', '/dashboard/command-center', '/admin', '/admin/stations'])('gửi ngôn ngữ ở %s', async (path) => {
    window.history.pushState({}, '', path);
    await i18n.changeLanguage('en');
    const calls = useAdapter(() => ({ status: 200, data: {} }));
    await apiClient.get('/x');
    expect(calls[0].headers['Accept-Language']).toBe('en');
  });

  it.each(['/', '/staff', '/dashboardx', '/administrator'])('không gửi ở %s', async (path) => {
    window.history.pushState({}, '', path);
    const calls = useAdapter(() => ({ status: 200, data: {} }));
    await apiClient.get('/x');
    expect(calls[0].headers['Accept-Language']).toBeUndefined();
  });

  it('không ghi đè Accept-Language có sẵn', async () => {
    window.history.pushState({}, '', '/admin');
    const calls = useAdapter(() => ({ status: 200, data: {} }));
    await apiClient.get('/x', { headers: { 'Accept-Language': 'fr' } });
    expect(calls[0].headers['Accept-Language']).toBe('fr');
  });
});

describe('apiClient – làm mới token khi 401', () => {
  beforeEach(() => {
    // Đang ở trang /login → handleAuthFailure không điều hướng (jsdom không hỗ trợ navigation).
    window.history.pushState({}, '', '/login');
  });

  it('refresh thành công → lưu token mới và gửi lại request', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'old');
    localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, 'refresh-1');
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { success: true, data: { accessToken: 'new', refreshToken: 'refresh-2', user: { id: 'u1' } } },
    });
    let n = 0;
    const calls = useAdapter(() => (n++ === 0 ? { status: 401 } : { status: 200, data: { ok: true } }));

    const res = await apiClient.get('/protected');
    expect(res.data).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith('http://api.test/api/Auth/refresh', { refreshToken: 'refresh-1' }, expect.anything());
    expect(calls).toHaveLength(2);
    expect(calls[1].headers.Authorization).toBe('Bearer new');
    expect(localStorage.getItem(API_CONFIG.TOKEN_KEY)).toBe('new');
    expect(localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY)).toBe('refresh-2');
    expect(JSON.parse(localStorage.getItem(API_CONFIG.USER_KEY)!)).toEqual({ id: 'u1' });
  });

  it('nhiều request 401 cùng lúc chỉ refresh 1 lần', async () => {
    localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, 'r');
    let resolveRefresh!: (v: unknown) => void;
    const post = vi.spyOn(axios, 'post').mockReturnValue(new Promise((r) => (resolveRefresh = r)) as never);
    useAdapter((config) => (config.headers.Authorization === 'Bearer fresh' ? { status: 200, data: config.url } : { status: 401 }));

    const p1 = apiClient.get('/a');
    const p2 = apiClient.get('/b');
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    // chờ request thứ hai vào hàng đợi
    await new Promise((r) => setTimeout(r, 0));
    resolveRefresh({ data: { data: { accessToken: 'fresh' } } });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect([r1.data, r2.data]).toEqual(['/a', '/b']);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('không có refresh token → xóa phiên và trả lỗi', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'old');
    localStorage.setItem(API_CONFIG.USER_KEY, '{}');
    const post = vi.spyOn(axios, 'post');
    useAdapter(() => ({ status: 401 }));
    await expect(apiClient.get('/p')).rejects.toBeInstanceOf(AxiosError);
    expect(post).not.toHaveBeenCalled();
    expect(localStorage.getItem(API_CONFIG.TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(API_CONFIG.USER_KEY)).toBeNull();
  });

  it('refresh không trả token → xóa phiên', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'old');
    localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, 'r');
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: null } });
    useAdapter(() => ({ status: 401 }));
    await expect(apiClient.get('/p')).rejects.toThrow('No access token returned from refresh endpoint');
    expect(localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('401 ở endpoint đăng nhập không refresh', async () => {
    localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, 'r');
    const post = vi.spyOn(axios, 'post');
    useAdapter(() => ({ status: 401 }));
    await expect(apiClient.post('/Auth/login', {})).rejects.toBeInstanceOf(AxiosError);
    expect(post).not.toHaveBeenCalled();
    expect(localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY)).toBe('r');
  });

  it('lỗi khác 401 trả nguyên', async () => {
    useAdapter(() => ({ status: 500 }));
    await expect(apiClient.get('/p')).rejects.toMatchObject({ response: { status: 500 } });
  });
});

describe('unwrapApi', () => {
  it('trả data khi success', async () => {
    await expect(unwrapApi(Promise.resolve({ data: { success: true, message: '', data: 5 } } as never))).resolves.toBe(5);
  });

  it('ném Error(message) khi success=false', async () => {
    await expect(unwrapApi(Promise.resolve({ data: { success: false, message: 'Hỏng', data: null } } as never))).rejects.toThrow('Hỏng');
    await expect(unwrapApi(Promise.resolve({ data: { success: false, message: '', data: null } } as never))).rejects.toThrow(
      'Yêu cầu không thành công.',
    );
  });
});

describe('getApiErrorMessage', () => {
  const axiosErr = (status: number | undefined, data?: unknown, url = '/x', message = 'Request failed') =>
    new AxiosError(
      message,
      undefined,
      { url, headers: new AxiosHeaders() },
      {},
      status === undefined ? undefined : { status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } },
    );

  it('ưu tiên message của backend', () => {
    expect(getApiErrorMessage(axiosErr(400, { message: 'Sai dữ liệu' }))).toBe('Sai dữ liệu');
  });

  it('gộp errors dạng mảng và dạng object', () => {
    expect(getApiErrorMessage(axiosErr(400, { errors: ['a', 'b'] }))).toBe('a, b');
    expect(getApiErrorMessage(axiosErr(400, { errors: { Email: ['x'], Name: ['y', 'z'] } }))).toBe('x, y, z');
  });

  it('errors rỗng → dùng title', () => {
    expect(getApiErrorMessage(axiosErr(400, { errors: [], title: 'One or more validation errors' }))).toBe(
      'One or more validation errors',
    );
  });

  it('lỗi mạng', () => {
    expect(getApiErrorMessage(axiosErr(undefined, undefined, '/x', 'Network Error'))).toContain('Không thể kết nối đến máy chủ');
  });

  it('401 ở đăng nhập vs. hết phiên', () => {
    expect(getApiErrorMessage(axiosErr(401, {}, '/Auth/login'))).toBe('Email hoặc mật khẩu không chính xác.');
    expect(getApiErrorMessage(axiosErr(401, {}, '/incidents'))).toBe('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  });

  it.each([
    [403, 'Bạn không có quyền thực hiện thao tác này.'],
    [404, 'Không tìm thấy dữ liệu yêu cầu.'],
    [500, 'Lỗi hệ thống máy chủ (500). Vui lòng kiểm tra log backend.'],
  ])('mã %i', (status, msg) => {
    expect(getApiErrorMessage(axiosErr(status, {}))).toBe(msg);
  });

  it('mã khác → fallback', () => {
    expect(getApiErrorMessage(axiosErr(418, {}), 'Mặc định')).toBe('Mặc định');
  });

  it('Error thường và giá trị lạ', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe('boom');
    expect(getApiErrorMessage('???')).toBe('Đã có lỗi xảy ra. Vui lòng thử lại.');
    expect(getApiErrorMessage(null, 'F')).toBe('F');
  });
});
