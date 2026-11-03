import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { DEFAULT_AVATAR, getAvatarUrl } from '@/utils/avatar';
import { escalationThresholdMinutes, isNightShift } from '@/utils/escalation';
import {
  formatCitizenIncidentStatus,
  formatCountdown,
  formatDateTime,
  formatWaitDuration,
  getIncidentVisualMeta,
  maskPhone,
} from '@/utils/incidentFormat';
import { DUPLICATE_RADIUS_M, DUPLICATE_WINDOW_MINUTES, findNearbyIncidents } from '@/utils/nearbyIncidents';
import { getDefaultRouteForRole, isRouteAllowedForRole } from '@/utils/routeUtils';
import {
  DEFAULT_SERVICE_AREA,
  KCN_RADIUS_KM,
  distanceOutsideAreaKm,
  haversineDistanceKm,
  resolveServiceArea,
} from '@/utils/serviceArea';
import { trafficJamAuditDecision } from '@/utils/trafficJamAudit';
import { UserRole } from '@/types/auth';
import { DEFAULT_ESCALATION_SETTINGS } from '@/services/liveMapService';
import { makeIncident } from '../setup/fixtures';

describe('avatar.getAvatarUrl', () => {
  it('trả lại URL hợp lệ nguyên vẹn', () => {
    expect(getAvatarUrl('https://cdn/a.png', 'An')).toBe('https://cdn/a.png');
  });

  it.each([undefined, null, '', '   ', 'null', 'undefined'])('URL rỗng (%s) + có tên → SVG chữ cái đầu', (url) => {
    const result = getAvatarUrl(url as string | null | undefined, ' bình ');
    expect(result.startsWith('data:image/svg+xml')).toBe(true);
    expect(result).toContain(`>${encodeURIComponent('B')}</text>`);
  });

  it('không có URL và không có tên → ảnh mặc định', () => {
    expect(getAvatarUrl(null)).toBe(DEFAULT_AVATAR);
    expect(getAvatarUrl('', '   ')).toBe(DEFAULT_AVATAR);
  });
});

describe('escalation', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 1, h, m).getTime();

  it('ca đêm vắt qua nửa đêm (22:00–06:00)', () => {
    expect(isNightShift(at(23), DEFAULT_ESCALATION_SETTINGS)).toBe(true);
    expect(isNightShift(at(3), DEFAULT_ESCALATION_SETTINGS)).toBe(true);
    expect(isNightShift(at(22, 0), DEFAULT_ESCALATION_SETTINGS)).toBe(true);
    expect(isNightShift(at(6, 0), DEFAULT_ESCALATION_SETTINGS)).toBe(false);
    expect(isNightShift(at(12), DEFAULT_ESCALATION_SETTINGS)).toBe(false);
  });

  it('ca đêm không vắt qua nửa đêm', () => {
    const settings = { ...DEFAULT_ESCALATION_SETTINGS, nightStart: '01:00', nightEnd: '05:30' };
    expect(isNightShift(at(0, 59), settings)).toBe(false);
    expect(isNightShift(at(1), settings)).toBe(true);
    expect(isNightShift(at(5, 29), settings)).toBe(true);
    expect(isNightShift(at(5, 30), settings)).toBe(false);
  });

  it('chuỗi giờ lỗi được coi là 0', () => {
    const settings = { ...DEFAULT_ESCALATION_SETTINGS, nightStart: 'x', nightEnd: '06:00' };
    expect(isNightShift(at(0), settings)).toBe(true);
  });

  it('ngưỡng leo thang theo ca', () => {
    expect(escalationThresholdMinutes(at(12), DEFAULT_ESCALATION_SETTINGS)).toBe(5);
    expect(escalationThresholdMinutes(at(23), DEFAULT_ESCALATION_SETTINGS)).toBe(2.5);
  });
});

describe('incidentFormat', () => {
  it('maskPhone che giữa số điện thoại', () => {
    expect(maskPhone('0981234456')).toBe('098***456');
    expect(maskPhone('+84 98-123-4456')).toBe('849***456');
    expect(maskPhone('12345')).toBe('12345');
  });

  it('formatCountdown làm tròn lên và không âm', () => {
    expect(formatCountdown(105_000)).toBe('1:45');
    expect(formatCountdown(1)).toBe('0:01');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5000)).toBe('0:00');
    expect(formatCountdown(600_000)).toBe('10:00');
  });

  it('formatWaitDuration tiếng Việt', () => {
    expect(formatWaitDuration(45_000)).toBe('Vừa xong');
    expect(formatWaitDuration(-1)).toBe('Vừa xong');
    expect(formatWaitDuration(12 * 60_000)).toBe('12 phút');
    expect(formatWaitDuration(3 * 3600_000)).toBe('3 giờ');
    expect(formatWaitDuration((3 * 60 + 5) * 60_000)).toBe('3 giờ 5 phút');
    expect(formatWaitDuration(2 * 86400_000)).toBe('2 ngày');
    expect(formatWaitDuration((3 * 24 + 11) * 3600_000)).toBe('3 ngày 11 giờ');
  });

  it('formatWaitDuration theo ngôn ngữ đang chọn', async () => {
    await i18n.changeLanguage('en');
    expect(formatWaitDuration(12 * 60_000)).toBe(i18n.t('common.duration.minutes', { m: 12 }));
    expect(formatWaitDuration(12 * 60_000)).not.toContain('phút');
  });

  it('formatDateTime có ngày/tháng/năm và giờ', () => {
    const iso = new Date(2026, 9, 22, 23, 41).toISOString();
    const text = formatDateTime(iso);
    expect(text).toContain('22');
    expect(text).toContain('10');
    expect(text).toContain('2026');
    expect(text).toContain('23');
    expect(text).toContain('41');
  });

  describe('getIncidentVisualMeta', () => {
    it('không có sự cố → Tín hiệu SOS', () => {
      expect(getIncidentVisualMeta(null)).toMatchObject({ category: 'other', label: 'Tín hiệu SOS' });
      expect(getIncidentVisualMeta(undefined).category).toBe('other');
    });

    it('ưu tiên eventType từ backend', () => {
      expect(getIncidentVisualMeta({ eventType: 'FireExplosion' })).toMatchObject({ category: 'fire', label: 'Hỏa hoạn & Cháy nổ' });
      expect(getIncidentVisualMeta({ eventType: 'TrafficAccident' })).toMatchObject({
        category: 'accident',
        label: 'Tai nạn giao thông',
      });
    });

    it('dùng eventType / incidentType trong aiClassification', () => {
      expect(getIncidentVisualMeta({ aiClassification: { eventType: 'FireExplosion' } }).category).toBe('fire');
      expect(getIncidentVisualMeta({ aiClassification: { incidentType: 'fire' } }).category).toBe('fire');
      expect(getIncidentVisualMeta({ aiClassification: { incidentType: 'accident' } }).category).toBe('accident');
    });

    it('suy từ hazardTags khi AI thành công', () => {
      expect(getIncidentVisualMeta({ aiClassification: { isSuccess: true, hazardTags: ['SMOKE'] } }).category).toBe('fire');
      expect(getIncidentVisualMeta({ aiClassification: { isSuccess: true, hazardTags: ['Tai nạn'] } }).category).toBe(
        'accident',
      );
      expect(getIncidentVisualMeta({ aiClassification: { isSuccess: true, hazardTags: null } }).category).toBe('other');
    });

    it('bỏ qua hazardTags khi AI thất bại', () => {
      expect(getIncidentVisualMeta({ aiClassification: { isSuccess: false, hazardTags: ['fire'] } }).category).toBe('other');
    });
  });

  it.each([
    ['Dispatched', 'Xe đang đến'],
    ['InProgress', 'Đang cứu hộ'],
    ['Verified', 'Đã tiếp nhận'],
    ['Completed', 'Đã hoàn thành'],
    ['Resolved', 'Đã hoàn thành'],
    ['Cancelled', 'Đã hủy'],
    ['Pending', 'Chờ tiếp nhận'],
    ['AiProcessing', 'Chờ tiếp nhận'],
    ['AiProcessed', 'Chờ tiếp nhận'],
    [null, 'Chờ tiếp nhận'],
    ['Weird', 'Chờ tiếp nhận'],
  ])('formatCitizenIncidentStatus(%s) → %s', (status, label) => {
    expect(formatCitizenIncidentStatus(status)).toBe(label);
  });
});

describe('nearbyIncidents.findNearbyIncidents', () => {
  const now = new Date('2026-10-01T10:00:00Z').getTime();
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  const point = { lat: 10.8441, lng: 106.8089 };

  it('lọc theo bán kính, thời gian, trạng thái và sắp xếp gần nhất trước', () => {
    const far = makeIncident({ id: 'far', lat: 10.86, lng: 106.8089, createdAt: minutesAgo(5) });
    const near = makeIncident({ id: 'near', lat: 10.8442, lng: 106.8089, createdAt: minutesAgo(10) });
    const mid = makeIncident({ id: 'mid', lat: 10.847, lng: 106.8089, createdAt: minutesAgo(1) });
    const old = makeIncident({ id: 'old', createdAt: minutesAgo(DUPLICATE_WINDOW_MINUTES + 1) });
    const done = makeIncident({ id: 'done', status: 'completed', createdAt: minutesAgo(1) });
    const approved = makeIncident({ id: 'approved', status: 'approved', lat: 10.8443, createdAt: minutesAgo(2) });

    const result = findNearbyIncidents([far, near, mid, old, done, approved], point, now);
    expect(result.map((r) => r.incident.id)).toEqual(['near', 'approved', 'mid']);
    expect(result[0].distanceM).toBeLessThanOrEqual(DUPLICATE_RADIUS_M);
    expect(result[0].minutesAgo).toBe(10);
  });

  it('sự cố ở tương lai có minutesAgo = 0', () => {
    const future = makeIncident({ createdAt: new Date(now + 60_000).toISOString() });
    expect(findNearbyIncidents([future], point, now)[0].minutesAgo).toBe(0);
  });

  it('danh sách rỗng', () => {
    expect(findNearbyIncidents([], point, now)).toEqual([]);
  });
});

describe('routeUtils', () => {
  it.each([
    [UserRole.RescueStaff, '/staff'],
    [UserRole.Operator, '/dashboard/command-center/live-map'],
    [UserRole.Admin, '/admin/overview'],
    [UserRole.Citizen, '/'],
    [undefined, '/'],
  ])('getDefaultRouteForRole(%s) → %s', (role, path) => {
    expect(getDefaultRouteForRole(role)).toBe(path);
  });

  it('trang gốc / rỗng luôn được phép', () => {
    expect(isRouteAllowedForRole(undefined)).toBe(true);
    expect(isRouteAllowedForRole('')).toBe(true);
    expect(isRouteAllowedForRole('/', UserRole.Citizen)).toBe(true);
  });

  it.each(['/login', '/register', '/signup', '/forgot-password', '/unauthorized', '/login/x'])(
    'không redirect về trang auth %s',
    (path) => {
      expect(isRouteAllowedForRole(path, UserRole.Admin)).toBe(false);
    },
  );

  it('/loginx không bị coi là trang auth', () => {
    expect(isRouteAllowedForRole('/loginx', UserRole.Citizen)).toBe(true);
  });

  it('phân quyền theo vùng', () => {
    expect(isRouteAllowedForRole('/dashboard/x', UserRole.Operator)).toBe(true);
    expect(isRouteAllowedForRole('/dashboard/x', UserRole.Admin)).toBe(false);
    expect(isRouteAllowedForRole('/admin/stations', UserRole.Admin)).toBe(true);
    expect(isRouteAllowedForRole('/admin/stations', UserRole.Operator)).toBe(false);
    expect(isRouteAllowedForRole('/staff', UserRole.RescueStaff)).toBe(true);
    expect(isRouteAllowedForRole('/staff', UserRole.Admin)).toBe(true);
    expect(isRouteAllowedForRole('/staff', UserRole.Citizen)).toBe(false);
    expect(isRouteAllowedForRole('/profile', UserRole.Citizen)).toBe(true);
  });
});

describe('serviceArea', () => {
  it('resolveServiceArea dùng mặc định khi thiếu cấu hình', () => {
    expect(resolveServiceArea(null)).toEqual({
      name: DEFAULT_SERVICE_AREA.name,
      lat: DEFAULT_SERVICE_AREA.centerLat,
      lng: DEFAULT_SERVICE_AREA.centerLng,
      radiusKm: KCN_RADIUS_KM,
    });
  });

  it('resolveServiceArea lấy tâm từ Admin nhưng bán kính luôn cố định', () => {
    const area = resolveServiceArea({ enabled: true, name: 'X', centerLat: 10, centerLng: 106, radiusKm: 99 });
    expect(area).toEqual({ name: 'X', lat: 10, lng: 106, radiusKm: KCN_RADIUS_KM });
  });

  it('resolveServiceArea coi tọa độ 0 là chưa cấu hình', () => {
    const area = resolveServiceArea({ enabled: true, name: null, centerLat: 0, centerLng: 0, radiusKm: 1 });
    expect(area.lat).toBe(DEFAULT_SERVICE_AREA.centerLat);
    expect(area.name).toBe(DEFAULT_SERVICE_AREA.name);
  });

  it('haversineDistanceKm', () => {
    expect(haversineDistanceKm(10, 106, 10, 106)).toBe(0);
    // 1 độ vĩ ≈ 111.19 km
    expect(haversineDistanceKm(10, 106, 11, 106)).toBeCloseTo(111.19, 1);
  });

  it('distanceOutsideAreaKm', () => {
    const area = resolveServiceArea();
    expect(distanceOutsideAreaKm({ lat: area.lat, lng: area.lng }, area)).toBe(0);
    // ~5.56 km về phía bắc → ngoài ~1.1 km
    expect(distanceOutsideAreaKm({ lat: area.lat + 0.05, lng: area.lng }, area)).toBeCloseTo(1.1, 1);
    // vừa chớm ra ngoài → tối thiểu 0.1
    const justOutside = area.lat + (KCN_RADIUS_KM + 0.001) / 111.19;
    expect(distanceOutsideAreaKm({ lat: justOutside, lng: area.lng }, area)).toBe(0.1);
  });
});

describe('trafficJamAuditDecision', () => {
  it('đọc quyết định ùn tắc từ newStateJson', () => {
    expect(trafficJamAuditDecision('StatusChanged', '{"trafficJamStatus":"Confirmed"}')).toBe('Confirmed');
    expect(trafficJamAuditDecision('StatusChanged', '{"trafficJamStatus":"Dismissed"}')).toBe('Dismissed');
  });

  it('trả null cho các trường hợp khác', () => {
    expect(trafficJamAuditDecision('Verified', '{"trafficJamStatus":"Confirmed"}')).toBeNull();
    expect(trafficJamAuditDecision('StatusChanged', null)).toBeNull();
    expect(trafficJamAuditDecision('StatusChanged', undefined)).toBeNull();
    expect(trafficJamAuditDecision('StatusChanged', '{"trafficJamStatus":"Suspected"}')).toBeNull();
    expect(trafficJamAuditDecision('StatusChanged', 'not json')).toBeNull();
    expect(trafficJamAuditDecision('StatusChanged', 'null')).toBeNull();
    expect(trafficJamAuditDecision('StatusChanged', '"str"')).toBeNull();
  });
});
