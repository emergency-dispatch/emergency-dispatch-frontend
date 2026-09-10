import { apiClient } from './apiClient';
import type {
  ApiResponse,
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../types/auth';

export const authService = {
  /**
   * Đăng nhập bằng Email và Password
   */
  async login(dto: LoginRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>('/Auth/login', dto);
    return response.data;
  },

  /**
   * Đăng nhập bằng Google ID Token
   */
  async googleLogin(idToken: string): Promise<ApiResponse<AuthResponseDto>> {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>('/Auth/google', { idToken });
    return response.data;
  },

  /**
   * Đăng ký tài khoản người dân (Citizen)
   */
  async register(dto: RegisterRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    const response = await apiClient.post<ApiResponse<AuthResponseDto>>('/Auth/register', dto);
    return response.data;
  },

  /**
   * Xác thực tài khoản bằng mã OTP gửi về email
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<ApiResponse<boolean>> {
    const response = await apiClient.post<ApiResponse<boolean>>('/Auth/verify-email', dto);
    return response.data;
  },

  /**
   * Gửi lại mã OTP xác thực email
   */
  async resendVerification(dto: ResendVerificationDto): Promise<ApiResponse<boolean>> {
    const response = await apiClient.post<ApiResponse<boolean>>('/Auth/resend-verification', dto);
    return response.data;
  },

  /**
   * Yêu cầu mã OTP đặt lại mật khẩu qua email
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<ApiResponse<boolean>> {
    const response = await apiClient.post<ApiResponse<boolean>>('/Auth/forgot-password', dto);
    return response.data;
  },

  /**
   * Đặt lại mật khẩu mới với mã OTP
   */
  async resetPassword(dto: ResetPasswordDto): Promise<ApiResponse<boolean>> {
    const response = await apiClient.post<ApiResponse<boolean>>('/Auth/reset-password', dto);
    return response.data;
  },

  /**
   * Đổi mật khẩu (cần đăng nhập)
   */
  async changePassword(dto: ChangePasswordDto): Promise<ApiResponse<object>> {
    const response = await apiClient.post<ApiResponse<object>>('/Auth/change-password', dto);
    return response.data;
  },

  /**
   * Đăng xuất và thu hồi Refresh Token
   */
  async logout(refreshToken?: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.post<ApiResponse<boolean>>('/Auth/logout', {
        refreshToken: refreshToken || '',
      });
      return response.data;
    } catch {
      // Even if backend fails or token is expired, return a fallback so client can clear state
      return {
        success: true,
        message: 'Đăng xuất thành công',
        data: true,
      };
    }
  },
};
