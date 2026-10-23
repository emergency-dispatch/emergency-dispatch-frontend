import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/auth';

export interface MediaUploadResult {
  url: string;
  publicId?: string;
  mediaType?: number;
  fileSizeBytes?: number;
  mimeType?: string;
  isSuccess: boolean;
  errorMessage?: string;
}

export const mediaService = {
  /**
   * Tải ảnh hoặc video hiện trường / avatar lên Cloudinary qua /api/Media/upload
   */
  async upload(file: File): Promise<string> {
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

    return response.data.data.url;
  },
};
