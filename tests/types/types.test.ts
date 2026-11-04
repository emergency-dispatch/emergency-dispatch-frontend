import { describe, expect, it } from 'vitest';
import {
  EVENT_TYPE_FROM_CATEGORY,
  inferCategoryFromTitle,
  isAiFallbackTag,
  mapIncidentResponseToIncident,
  normalizeHazardTag,
  severityToBackend,
  toOperatorStatus,
  type IncidentResponseDto,
} from '@/types/incident';
import { parseNotifyRoles } from '@/types/escalation';
import { AUDIT_ACTIONS, SYSTEM_AUDIT_ACTIONS, SYSTEM_AUDIT_ENTITY_TYPES } from '@/types/auditTrail';
import { COVERAGE_RADIUS_KM } from '@/types/station';
import { CREW_ROLES, CREW_ROLE_LABEL } from '@/types/stationTeam';
import { ADMIN_SETTABLE_UNIT_STATUSES, ON_MISSION_UNIT_STATUSES, RESCUE_UNIT_STATUSES } from '@/types/rescueUnit';

const dto = (o: Partial<IncidentResponseDto> = {}): IncidentResponseDto => ({
  id: 'i1',
  title: 'SOS',
  description: 'mô tả',
  latitude: 10.84,
  longitude: 106.8,
  locationAddress: 'Đường D1',
  status: 'Pending',
  severity: 'Level2',
  createdAt: '2026-10-01T00:00:00Z',
  mediaItems: [],
  ...o,
});

const ai = (o: Partial<NonNullable<IncidentResponseDto['aiClassification']>> = {}) => ({
  hazardTags: [],
  severityScore: 0.5,
  isSuccess: true,
  processingDurationMs: 100,
  ...o,
});

describe('incident helpers', () => {
  it('inferCategoryFromTitle', () => {
    expect(inferCategoryFromTitle('Hỏa hoạn & Khói tại kho')).toBe('fire');
    expect(inferCategoryFromTitle('EXPLOSION')).toBe('fire');
    expect(inferCategoryFromTitle('Tai nạn & Va chạm')).toBe('accident');
    expect(inferCategoryFromTitle('Car crash')).toBe('accident');
    expect(inferCategoryFromTitle('Cần trợ giúp')).toBeNull();
  });

  it('severityToBackend / EVENT_TYPE_FROM_CATEGORY', () => {
    expect([1, 2, 3].map((s) => severityToBackend(s as 1 | 2 | 3))).toEqual(['Level1', 'Level2', 'Level3']);
    expect(EVENT_TYPE_FROM_CATEGORY).toEqual({ fire: 'FireExplosion', accident: 'TrafficAccident' });
  });

  it('normalizeHazardTag / isAiFallbackTag', () => {
    expect(normalizeHazardTag('#Fire ')).toBe('fire');
    expect(normalizeHazardTag(' Accident')).toBe('accident');
    expect(normalizeHazardTag('#Traffic_Jam')).toBe('traffic_jam');
    expect(isAiFallbackTag('#NeedsHumanReview')).toBe(true);
    expect(isAiFallbackTag('Unclassified')).toBe(true);
    expect(isAiFallbackTag('SuspectedTrafficJam')).toBe(true);
    expect(isAiFallbackTag('#Fire')).toBe(false);
  });

  it.each([
    ['Cancelled', undefined, null],
    // BR-07: báo cáo đã gộp vào sự cố gốc không phải ca riêng → không vào hàng đợi / bảng điều phối.
    ['Linked', undefined, null],
    ['Completed', undefined, 'completed'],
    ['Verified', undefined, 'approved'],
    ['Dispatched', undefined, 'approved'],
    ['InProgress', undefined, 'approved'],
    ['Escalated', '2026-10-01', 'approved'],
    ['Escalated', undefined, 'pending'],
    ['Pending', undefined, 'pending'],
    ['AiProcessing', undefined, 'pending'],
    ['AiProcessed', undefined, 'pending'],
  ] as const)('toOperatorStatus(%s, verifiedAt=%s) → %s', (status, verifiedAt, expected) => {
    expect(toOperatorStatus({ status, verifiedAt })).toBe(expected);
  });
});

describe('mapIncidentResponseToIncident', () => {
  it('giá trị mặc định khi thiếu dữ liệu', () => {
    const i = mapIncidentResponseToIncident(dto());
    expect(i).toMatchObject({
      id: 'i1',
      category: 'unknown',
      source: 'CitizenApp',
      needsEventType: true,
      hazardTags: [],
      severity: 2,
      confidenceScore: 0,
      aiPending: true,
      aiFailed: false,
      aiSummary: null,
      aiEngine: null,
      trafficJam: null,
      status: 'pending',
      escalated: false,
      aiUnclassified: false,
      area: 'Đường D1',
      responsibleStationId: null,
      isOutOfServiceArea: false,
      distanceOutsideAreaKm: null,
      reporterName: 'Không rõ danh tính',
      reporterPhone: '—',
      mediaType: 'image',
      mediaUrl: null,
      media: [],
      reporterMedical: null,
      emergencySmsLog: null,
      lock: null,
      linkedReportCount: 0,
    });
    expect(mapIncidentResponseToIncident(dto({ linkedReportCount: 3 })).linkedReportCount).toBe(3);
  });

  it('loại sự cố: eventType backend > AI > tiêu đề', () => {
    expect(mapIncidentResponseToIncident(dto({ eventType: 'TrafficAccident', title: 'cháy' }))).toMatchObject({
      category: 'accident',
      needsEventType: false,
    });
    expect(mapIncidentResponseToIncident(dto({ aiClassification: ai({ eventType: 'FireExplosion' }) }))).toMatchObject({
      category: 'fire',
      needsEventType: true,
    });
    // AI thất bại → bỏ qua eventType của AI, suy theo tiêu đề
    expect(
      mapIncidentResponseToIncident(dto({ title: 'Tai nạn', aiClassification: ai({ eventType: 'FireExplosion', isSuccess: false }) })).category,
    ).toBe('accident');
  });

  it('tag AI: lọc tag hệ thống, gắn cờ engine', () => {
    const i = mapIncidentResponseToIncident(
      dto({ aiClassification: ai({ hazardTags: ['#Fire', 'NeedsHumanReview', 'PreliminaryYoloDetection', 'EngineDisagreement'] }) }),
    );
    expect(i.hazardTags).toEqual(['fire']);
    expect(i.aiFlags).toEqual({ preliminaryYolo: true, engineDisagreement: true });
  });

  it('độ tin cậy, AI lỗi, tóm tắt theo ngôn ngữ', () => {
    const base = dto({
      status: 'AiProcessed',
      aiClassification: ai({ confidenceScore: 0.876, summary: 'chung', summaryVi: 'tiếng Việt', summaryEn: 'English', summaryEnIsFallback: true }),
    });
    expect(mapIncidentResponseToIncident(base)).toMatchObject({ confidenceScore: 88, aiPending: false, aiSummary: 'tiếng Việt', aiSummaryIsFallback: false });
    expect(mapIncidentResponseToIncident(base, 'en')).toMatchObject({ aiSummary: 'English', aiSummaryIsFallback: true });
    expect(mapIncidentResponseToIncident(dto({ aiClassification: ai({ summary: 'chung' }) }), 'en').aiSummary).toBe('chung');
    expect(mapIncidentResponseToIncident(dto({ aiClassification: ai({ isSuccess: false }) })).aiFailed).toBe(true);
  });

  it.each([
    ['Dual-Engine (Qwen-VL + YOLO)', 'dual'],
    ['Dual-Engine (Qwen-VL + YOLO jam only)', 'dualJamOnly'],
    ['Dual-Engine (both failed)', 'bothFailed'],
    ['YOLO only', 'yoloOnly'],
    ['Qwen-VL only', 'qwenOnly'],
    ['gpt-4o', 'legacy'],
  ])('aiEngine "%s" → %s', (modelName, mode) => {
    expect(mapIncidentResponseToIncident(dto({ aiClassification: ai({ modelName }) })).aiEngine).toEqual({ mode, modelName });
  });

  it('ùn tắc giao thông', () => {
    expect(mapIncidentResponseToIncident(dto({ aiClassification: ai({ trafficJamStatus: 'NoEvidence' }) })).trafficJam).toBeNull();
    const suspected = mapIncidentResponseToIncident(
      dto({ aiClassification: ai({ trafficJamStatus: 'Suspected', trafficJamEvidenceVi: 'Xe dồn ứ', trafficJamEvidenceEn: 'Queue' }) }),
      'en',
    );
    expect(suspected.trafficJam).toEqual({ status: 'Suspected', evidence: 'Queue', reviewed: false, verifiedByUserId: null, verifiedAt: null });
    const confirmed = mapIncidentResponseToIncident(
      dto({ aiClassification: ai({ trafficJamStatus: 'Confirmed', trafficJamVerifiedByUserId: 'op', trafficJamVerifiedAt: 't' }) }),
    );
    expect(confirmed.trafficJam).toMatchObject({ reviewed: true, evidence: null, verifiedByUserId: 'op', verifiedAt: 't' });
  });

  it('trạng thái, leo thang, chưa phân loại, ngoài vùng', () => {
    const i = mapIncidentResponseToIncident(
      dto({ status: 'Escalated', verifiedAt: 'x', severity: 'Unclassified', isOutOfServiceArea: true, distanceOutsideAreaKm: 1.2, source: 'PhoneCall' }),
    );
    expect(i).toMatchObject({ status: 'approved', escalated: true, aiUnclassified: true, severity: 1, isOutOfServiceArea: true, distanceOutsideAreaKm: 1.2, source: 'PhoneCall' });
    expect(mapIncidentResponseToIncident(dto({ status: 'Cancelled' })).status).toBe('pending');
  });

  it('media: ảnh/video, media đầu tiên làm thumbnail', () => {
    const i = mapIncidentResponseToIncident(
      dto({
        mediaItems: [
          { id: 'm1', mediaUrl: 'v.mp4', mediaType: 'Video' },
          { id: 'm2', mediaUrl: 'p.jpg', mediaType: 'Photo' },
        ],
      }),
    );
    expect(i.mediaType).toBe('video');
    expect(i.mediaUrl).toBe('v.mp4');
    expect(i.media).toEqual([
      { url: 'v.mp4', type: 'video' },
      { url: 'p.jpg', type: 'image' },
    ]);
  });

  it('khóa mềm chỉ khi còn hạn', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(mapIncidentResponseToIncident(dto({ lockedByOperatorId: 'op2', lockExpiresAt: future })).lock).toEqual({
      operatorId: 'op2',
      operatorName: 'Điều phối viên khác',
      expiresAt: future,
    });
    expect(mapIncidentResponseToIncident(dto({ lockedByOperatorId: 'op2', lockedByOperatorName: 'B', lockExpiresAt: future })).lock?.operatorName).toBe('B');
    expect(mapIncidentResponseToIncident(dto({ lockedByOperatorId: 'op2', lockExpiresAt: past })).lock).toBeNull();
    expect(mapIncidentResponseToIncident(dto({ lockExpiresAt: future })).lock).toBeNull();
  });

  it('thông tin người báo', () => {
    const i = mapIncidentResponseToIncident(dto({ reporterName: 'An', reporterPhone: '098', emergencySmsDispatchLog: 'đã gửi' }));
    expect(i).toMatchObject({ reporterName: 'An', reporterPhone: '098', emergencySmsLog: 'đã gửi' });
  });
});

describe('escalation.parseNotifyRoles', () => {
  it('đọc JSON an toàn, lọc vai trò lạ', () => {
    expect(parseNotifyRoles('["Admin","Operator","Hacker"]')).toEqual(['Admin', 'Operator']);
    expect(parseNotifyRoles(null)).toEqual([]);
    expect(parseNotifyRoles('')).toEqual([]);
    expect(parseNotifyRoles('{bad')).toEqual([]);
    expect(parseNotifyRoles('{"a":1}')).toEqual([]);
  });
});

describe('hằng số enum', () => {
  it('không trùng lặp', () => {
    for (const list of [AUDIT_ACTIONS, SYSTEM_AUDIT_ACTIONS, SYSTEM_AUDIT_ENTITY_TYPES, CREW_ROLES, RESCUE_UNIT_STATUSES]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('quan hệ giữa các tập trạng thái xe', () => {
    for (const s of [...ADMIN_SETTABLE_UNIT_STATUSES, ...ON_MISSION_UNIT_STATUSES]) expect(RESCUE_UNIT_STATUSES).toContain(s);
    expect(ADMIN_SETTABLE_UNIT_STATUSES.some((s) => ON_MISSION_UNIT_STATUSES.includes(s))).toBe(false);
  });

  it('nhãn vai trò tổ và bán kính phủ sóng', () => {
    for (const r of CREW_ROLES) expect(CREW_ROLE_LABEL[r]).toBeTruthy();
    expect(COVERAGE_RADIUS_KM.min).toBeLessThanOrEqual(COVERAGE_RADIUS_KM.default);
    expect(COVERAGE_RADIUS_KM.default).toBeLessThanOrEqual(COVERAGE_RADIUS_KM.max);
  });
});
