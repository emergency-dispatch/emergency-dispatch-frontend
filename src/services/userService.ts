import { apiClient } from './apiClient';
import type {
  ApiResponse,
  UserResponseDto,
  UpdateProfileDto,
  UpdateFcmTokenDto,
  IceContactDto,
  CreateIceContactDto,
  UpdateIceContactDto,
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
    const response = await apiClient.put<ApiResponse<boolean>>('/Users/fcm-token', { fcmToken } as UpdateFcmTokenDto);
    return response.data;
  },

  /**
   * Lấy danh bạ người thân khẩn cấp (ICE) của người dùng hiện tại
   */
  async getIceContacts(): Promise<ApiResponse<IceContactDto[]>> {
    const response = await apiClient.get<ApiResponse<IceContactDto[]>>('/Users/ice-contacts');
    return response.data;
  },

  /**
   * Thêm người thân khẩn cấp mới vào danh bạ ICE
   */
  async createIceContact(dto: CreateIceContactDto): Promise<ApiResponse<IceContactDto>> {
    const response = await apiClient.post<ApiResponse<IceContactDto>>('/Users/ice-contacts', dto);
    return response.data;
  },

  /**
   * Cập nhật thông tin người thân khẩn cấp
   */
  async updateIceContact(contactId: string, dto: UpdateIceContactDto): Promise<ApiResponse<IceContactDto>> {
    const response = await apiClient.put<ApiResponse<IceContactDto>>(`/Users/ice-contacts/${contactId}`, dto);
    return response.data;
  },

  /**
   * Xóa một người thân khỏi danh bạ khẩn cấp ICE
   */
  async deleteIceContact(contactId: string): Promise<ApiResponse<object>> {
    const response = await apiClient.delete<ApiResponse<object>>(`/Users/ice-contacts/${contactId}`);
    return response.data;
  },
};

