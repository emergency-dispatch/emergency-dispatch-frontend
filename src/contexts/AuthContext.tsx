import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_CONFIG } from '../config/api';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import type {
  UserDto,
  UserResponseDto,
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  VerifyEmailDto,
  UpdateProfileDto,
} from '../types/auth';

export interface AuthContextType {
  user: UserDto | UserResponseDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LoginRequestDto) => Promise<AuthResponseDto>;
  googleLogin: (idToken: string) => Promise<AuthResponseDto>;
  register: (dto: RegisterRequestDto) => Promise<AuthResponseDto>;
  verifyEmail: (dto: VerifyEmailDto) => Promise<boolean>;
  resendVerification: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserResponseDto | null>;
  updateProfile: (dto: UpdateProfileDto) => Promise<UserResponseDto>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | UserResponseDto | null>(() => {
    try {
      const cached = localStorage.getItem(API_CONFIG.USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveAuthSession = (authData: AuthResponseDto) => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, authData.accessToken);
    if (authData.refreshToken) {
      localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, authData.refreshToken);
    }
    if (authData.user) {
      localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(authData.user));
      setUser(authData.user);
    }
  };

  const clearAuthSession = () => {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.USER_KEY);
    setUser(null);
  };

  const refreshProfile = useCallback(async (): Promise<UserResponseDto | null> => {
    const token = localStorage.getItem(API_CONFIG.TOKEN_KEY);
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const response = await userService.getMe();
      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(response.data));
        return response.data;
      }
      return null;
    } catch (err) {
      // If token is invalid or user not found, clear auth session to prevent continuous 500/401 loops
      clearAuthSession();
      return null;
    }
  }, []);

  // Hydrate user session on app start
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(API_CONFIG.TOKEN_KEY);
      if (token) {
        await refreshProfile();
      } else {
        clearAuthSession();
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshProfile]);

  const login = async (dto: LoginRequestDto): Promise<AuthResponseDto> => {
    const res = await authService.login(dto);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Đăng nhập không thành công');
    }
    saveAuthSession(res.data);
    // Optionally fetch full profile
    try {
      await refreshProfile();
    } catch {
      // Keep basic user data if getMe fails temporarily
    }
    return res.data;
  };

  const googleLogin = async (idToken: string): Promise<AuthResponseDto> => {
    const res = await authService.googleLogin(idToken);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Đăng nhập bằng Google không thành công');
    }
    saveAuthSession(res.data);
    try {
      await refreshProfile();
    } catch {
      // Ignore
    }
    return res.data;
  };

  const register = async (dto: RegisterRequestDto): Promise<AuthResponseDto> => {
    const res = await authService.register(dto);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Đăng ký tài khoản không thành công');
    }
    // Note: Backend might issue tokens or require verify-email before full access
    if (res.data.accessToken) {
      saveAuthSession(res.data);
    }
    return res.data;
  };

  const verifyEmail = async (dto: VerifyEmailDto): Promise<boolean> => {
    const res = await authService.verifyEmail(dto);
    if (!res.success) {
      throw new Error(res.message || 'Mã xác thực không hợp lệ');
    }
    // Update isEmailVerified if user is already in state
    if (user) {
      const updated = { ...user, isEmailVerified: true };
      setUser(updated);
      localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(updated));
    }
    return true;
  };

  const resendVerification = async (email: string): Promise<boolean> => {
    const res = await authService.resendVerification({ email });
    if (!res.success) {
      throw new Error(res.message || 'Không thể gửi lại mã xác thực');
    }
    return true;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY) || undefined;
    try {
      await authService.logout(refreshToken);
    } catch {
      // Always succeed locally
    } finally {
      clearAuthSession();
    }
  };

  const updateProfile = async (dto: UpdateProfileDto): Promise<UserResponseDto> => {
    const res = await userService.updateProfile(dto);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Cập nhật hồ sơ không thành công');
    }
    setUser(res.data);
    localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(res.data));
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!localStorage.getItem(API_CONFIG.TOKEN_KEY),
        isLoading,
        login,
        googleLogin,
        register,
        verifyEmail,
        resendVerification,
        logout,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
