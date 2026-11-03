import type { Incident } from '@/types/incident';

/** Sự cố mẫu cho test — ghi đè trường cần thiết qua `overrides`. */
export function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 'inc-1',
    title: 'Cháy kho hàng',
    description: 'Khói đen bốc lên từ kho',
    category: 'fire',
    source: 'CitizenApp',
    needsEventType: false,
    hazardTags: ['fire'],
    severity: 2,
    confidenceScore: 87,
    aiPending: false,
    aiFailed: false,
    aiSummary: null,
    aiSummaryIsFallback: false,
    aiEngine: null,
    aiFlags: { preliminaryYolo: false, engineDisagreement: false },
    trafficJam: null,
    status: 'pending',
    escalated: false,
    aiUnclassified: false,
    area: 'Khu Công nghệ cao',
    lat: 10.8441,
    lng: 106.8089,
    responsibleStationId: 'st-1',
    responsibleStationName: 'Trạm 1',
    isOutOfServiceArea: false,
    distanceOutsideAreaKm: null,
    reporterName: 'Nguyễn Văn A',
    reporterPhone: '0981234456',
    createdAt: new Date().toISOString(),
    mediaType: 'image',
    mediaUrl: null,
    media: [],
    reporterMedical: null,
    emergencySmsLog: null,
    assignedVehicleIds: [],
    reportedVehicleIds: [],
    responseNotices: [],
    lock: null,
    ...overrides,
  };
}

/** Giả lập AxiosResponse bọc ApiResponse<T> của backend. */
export function apiOk<T>(data: T, message = 'OK') {
  return { data: { success: true, message, data } };
}

export function apiFail(message = 'Lỗi') {
  return { data: { success: false, message, data: null } };
}
