import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/auth';

export interface MediaUploadResult {
  url: string;
  publicId?: string;
  mediaType?: number | 'Photo' | 'Video' | 'Audio';
  fileSizeBytes?: number;
  mimeType?: string;
  durationSeconds?: number | null;
  transcript?: string | null;
  transcriptionStatus?: string | null;
  uploadToken?: string | null;
  isSuccess: boolean;
  errorMessage?: string;
}

export interface AudioPlaybackUrlDto {
  url: string;
  expiresAt: string;
}

export const mediaService = {
  /**
   * Tải ảnh, video hoặc audio hiện trường lên BE (/api/media/upload).
   * Audio trả về uploadToken dùng một lần (không gửi URL audio vào mediaUrls).
   */
  async uploadAsset(file: File): Promise<MediaUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ApiResponse<MediaUploadResult>>('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data.success || !response.data.data?.url) {
      throw new Error(response.data.message || 'Không thể tải tệp tin lên.');
    }

    return response.data.data;
  },

  /**
   * Tải ảnh hoặc video hiện trường / avatar lên Cloudinary qua /api/Media/upload
   */
  async upload(file: File): Promise<string> {
    const data = await this.uploadAsset(file);
    return data.url;
  },

  async getAudioPreviewUrl(uploadToken: string): Promise<AudioPlaybackUrlDto> {
    const response = await apiClient.post<ApiResponse<AudioPlaybackUrlDto>>('/media/audio/preview-url', {
      uploadToken,
    });
    if (!response.data.success || !response.data.data?.url) {
      throw new Error(response.data.message || 'Không thể mở bản ghi âm xem trước.');
    }
    return response.data.data;
  },
};
