import { apiClient } from './apiClient';
import type {
  ApiResponse,
  UserResponseDto,
  UpdateProfileDto,
  UpdateFcmTokenDto,
} from '../types/auth';

export const userService = {
  /**
   * Lấy thông tin chi tiết người dùng đang đăng nhập
   */
  async getMe(): Promise<ApiResponse<UserResponseDto>> {
    const response = await apiClient.get<ApiResponse<UserResponseDto>>('/Users/me');
    return response.data;
  },

  /**
   * Cập nhật thông tin hồ sơ cá nhân, y tế, liên hệ khẩn cấp
   */
  async updateProfile(dto: UpdateProfileDto): Promise<ApiResponse<UserResponseDto>> {
    const response = await apiClient.put<ApiResponse<UserResponseDto>>('/Users/me', dto);
    return response.data;
  },

  /**
   * Cập nhật Firebase Cloud Messaging (FCM) Token để nhận thông báo thời gian thực
   */
  async updateFcmToken(fcmToken: string): Promise<ApiResponse<boolean>> {
    const response = await apiClient.put<ApiResponse<boolean>>('/Users/me/fcm-token', { fcmToken } as UpdateFcmTokenDto);
    return response.data;
  },
};
