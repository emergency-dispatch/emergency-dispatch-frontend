import { describe, expect, it } from 'vitest';
import { TrafficCone } from 'lucide-react';
import { UserRole, UserStatus, type UserResponseDto } from '@/types/auth';
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_META, INTERNAL_ROLES, ROLE_META, canUnlockUser, tempLockoutEnd } from '@/components/admin/accounts/accountMeta';
import { adminNavGroups, findAdminNavItem } from '@/components/admin/adminNav';
import { BLOCK_DURATIONS, BLOCK_STATUSES, BLOCK_STATUS_META, extendedExpiry, formatExpiry, isLaterExpiry } from '@/components/admin/blocked/blockedMeta';
import { escalationSeverityMeta, severityLabel } from '@/components/admin/escalation/escalationMeta';
import { RESCUE_UNIT_STATUS_META, RESCUE_UNIT_TYPE_META } from '@/components/admin/fleetMeta';
import { REPORT_SEVERITIES, cancellationLabel, formatDateTime, formatMinutes, severityMeta } from '@/components/admin/reports/reportMeta';
import { dispatchToDraft, draftToDispatch, draftToEscalation, escalationToDraft, sameSettings, toNumber } from '@/components/admin/settings/settingsDraft';
import {
  actorRoleLabel,
  auditActionMeta,
  compareStates,
  entityDisplayName,
  entityTypeMeta,
  fieldLabel,
  formatAuditTime,
  stateChanges,
  systemActionMeta,
} from '@/components/admin/audit/auditMeta';
import { MAP_VISIBLE_VEHICLE_STATUSES, incidentMarkerHtml, stationMarkerHtml, trafficJamMarkerHtml, vehicleMarkerHtml } from '@/components/operator/livemap/mapIcons';
import { TEAM_FUNCTION_META } from '@/components/operator/teams/teamFunction';
import { QUEUE_COLUMNS } from '@/components/operator/incidents/queueColumns';
import { SEVERITY_LEVEL_COLOR, SEVERITY_LEVEL_META, CANCELLATION_REASON_LABEL, CANCELLATION_REASON_OPTIONS } from '@/data/incidentMock';
import { DISPATCH_VEHICLE_TYPES, VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '@/data/liveMapMeta';
import { INCIDENT_SOURCE_ICON } from '@/data/incidentSourceMeta';
import { MAX_VEHICLES_BY_LEVEL, SEARCH_RADII_KM, LOAD_AWARE_WEIGHTS, MIN_TEAM_SIZE, MAX_TEAM_SIZE } from '@/data/dispatchConfig';
import { RESCUE_UNIT_STATUSES, RESCUE_UNIT_TYPES } from '@/types/rescueUnit';
import { OPERATOR_INCIDENT_SOURCES } from '@/types/incident';

describe('accountMeta', () => {
  const user = (o: Partial<UserResponseDto> & { lockoutEndUtc?: string | null } = {}) =>
    ({ id: 'u', status: UserStatus.Active, ...o }) as UserResponseDto;

  it('bảng màu phủ đủ vai trò và trạng thái', () => {
    expect(INTERNAL_ROLES).toEqual([UserRole.Operator, UserRole.RescueStaff]);
    for (const r of INTERNAL_ROLES) expect(ROLE_META[r].badgeClass).toBeTruthy();
    for (const s of ACCOUNT_STATUSES) expect(ACCOUNT_STATUS_META[s].badgeClass).toBeTruthy();
  });

  it('tempLockoutEnd chỉ trả khi còn hiệu lực', () => {
    const now = Date.parse('2026-10-01T00:00:00Z');
    expect(tempLockoutEnd(user({ lockoutEndUtc: '2026-10-01T00:10:00Z' }), now)).toBe('2026-10-01T00:10:00Z');
    expect(tempLockoutEnd(user({ lockoutEndUtc: '2026-09-30T00:00:00Z' }), now)).toBeNull();
    expect(tempLockoutEnd(user({ lockoutEndUtc: null }), now)).toBeNull();
    expect(tempLockoutEnd(user(), now)).toBeNull();
  });

  it('canUnlockUser', () => {
    expect(canUnlockUser(user({ status: UserStatus.Suspended }))).toBe(true);
    expect(canUnlockUser(user({ status: UserStatus.Inactive }))).toBe(true);
    expect(canUnlockUser(user())).toBe(false);
    expect(canUnlockUser(user({ lockoutEndUtc: new Date(Date.now() + 60_000).toISOString() }))).toBe(true);
  });
});

describe('adminNav', () => {
  it('đường dẫn duy nhất, đều dưới /admin', () => {
    const paths = adminNavGroups.flatMap((g) => g.items.map((i) => i.path));
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((p) => p.startsWith('/admin/'))).toBe(true);
  });

  it('findAdminNavItem khớp chính xác hoặc trang con', () => {
    expect(findAdminNavItem('/admin/stations')?.key).toBe('stations');
    expect(findAdminNavItem('/admin/stations/abc')?.key).toBe('stations');
    expect(findAdminNavItem('/admin/settings/dispatch')?.key).toBe('dispatch');
    expect(findAdminNavItem('/admin/stationsx')).toBeNull();
    expect(findAdminNavItem('/admin')).toBeNull();
  });
});

describe('blockedMeta', () => {
  it('hằng số', () => {
    expect(BLOCK_DURATIONS).toEqual(['SevenDays', 'ThirtyDays', 'OneYear', 'Permanent']);
    for (const s of BLOCK_STATUSES) expect(BLOCK_STATUS_META[s].badgeClass).toBeTruthy();
  });

  it('formatExpiry', () => {
    expect(formatExpiry(null)).toBe('Vĩnh viễn');
    expect(formatExpiry('2026-10-05T12:00:00')).toContain('2026');
  });

  it('extendedExpiry', () => {
    const from = new Date('2026-02-28T10:00:00Z');
    expect(extendedExpiry('SevenDays', from)).toBe('2026-03-07T10:00:00.000Z');
    expect(extendedExpiry('ThirtyDays', from)).toBe('2026-03-30T10:00:00.000Z');
    expect(new Date(extendedExpiry('OneYear', from)!).getFullYear()).toBe(2027);
    expect(extendedExpiry('Permanent', from)).toBeNull();
  });

  it('isLaterExpiry', () => {
    expect(isLaterExpiry('2026-12-01', null)).toBe(false);
    expect(isLaterExpiry(null, null)).toBe(false);
    expect(isLaterExpiry(null, '2026-01-01')).toBe(true);
    expect(isLaterExpiry('2026-12-01', '2026-01-01')).toBe(true);
    expect(isLaterExpiry('2026-01-01', '2026-12-01')).toBe(false);
    expect(isLaterExpiry('2026-01-01', '2026-01-01')).toBe(false);
  });
});

describe('escalationMeta', () => {
  it('escalationSeverityMeta', () => {
    expect(escalationSeverityMeta('Level3')).toEqual({ label: 'Cấp 3 · Nghiêm trọng', badgeClass: SEVERITY_LEVEL_META[3].badgeClass });
    expect(escalationSeverityMeta('Level1').label).toBe('Cấp 1 · Nhẹ');
  });

  it('severityLabel gộp cấp cũ > 3 về Cấp 3', () => {
    expect(severityLabel('Unclassified')).toBe('Chưa phân loại');
    expect(severityLabel('Level2')).toBe('Cấp 2');
    expect(severityLabel('Level5' as never)).toBe('Cấp 3');
  });
});

describe('fleetMeta / liveMapMeta / teamFunction / sources', () => {
  it('phủ đủ enum backend', () => {
    for (const t of RESCUE_UNIT_TYPES) expect(RESCUE_UNIT_TYPE_META[t].label).toBeTruthy();
    for (const s of RESCUE_UNIT_STATUSES) expect(RESCUE_UNIT_STATUS_META[s].color).toMatch(/^#[0-9A-F]{6}$/i);
    for (const t of DISPATCH_VEHICLE_TYPES) {
      expect(VEHICLE_TYPE_META[t].icon).toBeTruthy();
      expect(TEAM_FUNCTION_META[t].label).toBeTruthy();
    }
    expect(DISPATCH_VEHICLE_TYPES).not.toContain('police');
    for (const s of ['CitizenApp', ...OPERATOR_INCIDENT_SOURCES] as const) expect(INCIDENT_SOURCE_ICON[s]).toBeTruthy();
    expect(Object.keys(QUEUE_COLUMNS)).toEqual(['thumbnail', 'ai', 'wait']);
  });

  it('dispatchConfig hợp lệ', () => {
    expect(SEARCH_RADII_KM).toEqual([...SEARCH_RADII_KM].sort((a, b) => a - b));
    expect(MAX_VEHICLES_BY_LEVEL).toEqual({ 1: 1, 2: 1, 3: 5 });
    expect(LOAD_AWARE_WEIGHTS.distance + LOAD_AWARE_WEIGHTS.stationLoad + LOAD_AWARE_WEIGHTS.activeMissions).toBeCloseTo(1);
    expect(MIN_TEAM_SIZE).toBeLessThan(MAX_TEAM_SIZE);
  });

  it('lý do hủy của Operator nằm trong bảng nhãn', () => {
    for (const o of CANCELLATION_REASON_OPTIONS) expect(CANCELLATION_REASON_LABEL[o.value]).toBe(o.label);
  });
});

describe('reportMeta', () => {
  it('severityMeta', () => {
    expect(REPORT_SEVERITIES).toContain('Unclassified');
    expect(severityMeta('Level2')).toEqual({ label: 'Cấp 2 · Trung bình', badgeClass: SEVERITY_LEVEL_META[2].badgeClass });
    expect(severityMeta('Unclassified').label).toBe('Chưa phân loại');
    expect(severityMeta('Level4' as never).label).toBe('Chưa phân loại');
  });

  it('cancellationLabel', () => {
    expect(cancellationLabel('Duplicate')).toBe('Trùng sự cố khác');
    expect(cancellationLabel(null)).toBeNull();
    expect(cancellationLabel('NewCode' as never)).toBe('NewCode');
  });

  it('formatMinutes', () => {
    expect(formatMinutes(null)).toBe('—');
    expect(formatMinutes(12.4)).toBe('12 phút');
    expect(formatMinutes(75.4)).toBe('1 giờ 15 phút');
    expect(formatMinutes(120)).toBe('2 giờ');
  });

  it('formatDateTime', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(new Date(2026, 0, 5, 7, 3).toISOString())).toBe('05/01/2026 07:03');
  });
});

describe('settingsDraft', () => {
  it('toNumber: ô trống → NaN', () => {
    expect(toNumber(' ')).toBeNaN();
    expect(toNumber('2.5')).toBe(2.5);
    expect(toNumber('abc')).toBeNaN();
  });

  it('chuyển qua lại dispatch / escalation', () => {
    const dispatch = { weights: { distance: 0.5, stationLoad: 0.3, activeMissions: 0.2 }, radiusStepsKm: [10, 15], recoveryMinutes: 5 };
    const draft = dispatchToDraft(dispatch);
    expect(draft).toEqual({ distance: '0.5', stationLoad: '0.3', activeMissions: '0.2', radiusStepsKm: ['10', '15'], recoveryMinutes: '5' });
    expect(draftToDispatch(draft)).toEqual(dispatch);

    const esc = { dayThresholdMinutes: 5, nightThresholdMinutes: 2.5, nightStart: '22:00', nightEnd: '06:00', radiusMultiplier: 2, maxRadiusKm: 30 };
    expect(draftToEscalation(escalationToDraft(esc))).toEqual(esc);
  });

  it('sameSettings so sánh theo giá trị số', () => {
    const a = draftToDispatch({ distance: '0.5', stationLoad: '0.3', activeMissions: '0.2', radiusStepsKm: ['10'], recoveryMinutes: '5.0' });
    const b = draftToDispatch({ distance: '0.50', stationLoad: '0.3', activeMissions: '0.2', radiusStepsKm: ['10'], recoveryMinutes: '5' });
    expect(sameSettings(a, b)).toBe(true);
    expect(sameSettings(a, { ...b, recoveryMinutes: 6 })).toBe(false);
  });
});

describe('auditMeta', () => {
  it('auditActionMeta: hành động biết / lạ / thẩm định ùn tắc', () => {
    expect(auditActionMeta('Created').label).toBe('Tạo sự cố');
    expect(auditActionMeta('NewThing')).toMatchObject({ label: 'NewThing' });
    const jam = auditActionMeta('StatusChanged', '{"trafficJamStatus":"Confirmed"}');
    expect(jam).toMatchObject({ label: 'Xác nhận ùn tắc giao thông', icon: TrafficCone });
    expect(jam.badgeClass).toContain('red');
    expect(auditActionMeta('StatusChanged', '{"trafficJamStatus":"Dismissed"}').badgeClass).toContain('emerald');
  });

  it('systemActionMeta / entityTypeMeta', () => {
    expect(systemActionMeta('Created').label).toBe('Tạo mới');
    expect(systemActionMeta('Weird').label).toBe('Weird');
    expect(entityTypeMeta('Station').label).toBe('Trạm cứu hộ');
    expect(entityTypeMeta('Alien').label).toBe('Alien');
  });

  it('entityDisplayName / actorRoleLabel / fieldLabel', () => {
    expect(entityDisplayName('Settings', 'dispatch')).toBe('Tham số điều phối');
    expect(entityDisplayName('Settings', 'unknownKey')).toBe('unknownKey');
    expect(entityDisplayName('Station', 'Trạm A')).toBe('Trạm A');
    expect(entityDisplayName('Station', null)).toBe('—');
    expect(actorRoleLabel(null)).toBe('—');
    expect(actorRoleLabel('Admin')).toBe('Quản trị viên');
    expect(actorRoleLabel('Robot')).toBe('Robot');
    expect(fieldLabel('status')).toBe('Trạng thái');
    expect(fieldLabel('weights.distance')).toBe('Trọng số khoảng cách');
    expect(fieldLabel('zzz')).toBe('zzz');
  });

  it('formatAuditTime', () => {
    expect(formatAuditTime(new Date(2026, 9, 3, 4, 5, 6).toISOString())).toBe('03/10/2026 04:05:06');
  });

  it('stateChanges chỉ trả trường thay đổi, làm phẳng object lồng', () => {
    const changes = stateChanges(
      '{"status":"Active","weights":{"distance":0.5},"tags":["a"],"same":1}',
      '{"status":"Suspended","weights":{"distance":0.6},"tags":["a","b"],"same":1,"locked":true}',
    );
    expect(changes).toEqual([
      { field: 'status', from: 'Active', to: 'Suspended' },
      { field: 'weights.distance', from: '0.5', to: '0.6' },
      { field: 'tags', from: 'a', to: 'a, b' },
      { field: 'locked', from: null, to: 'Có' },
    ]);
  });

  it('stateChanges với JSON lỗi, giá trị nguyên thủy, null', () => {
    expect(stateChanges(null, 'not json')).toEqual([{ field: 'value', from: null, to: 'not json' }]);
    expect(stateChanges('5', '6')).toEqual([{ field: 'value', from: '5', to: '6' }]);
    expect(stateChanges('{"a":null,"b":[]}', '{"a":false,"b":[{"x":1}]}')).toEqual([
      { field: 'a', from: '—', to: 'Không' },
      { field: 'b', from: '—', to: '{"x":1}' },
    ]);
    expect(stateChanges(null, null)).toEqual([]);
  });

  it('compareStates', () => {
    expect(compareStates(null, '{"name":"A"}')).toEqual([{ field: 'name', before: null, after: 'A', changed: false }]);
    expect(compareStates('{"name":"A","x":1}', '{"name":"B","x":1}')).toEqual([
      { field: 'name', before: 'A', after: 'B', changed: true },
      { field: 'x', before: '1', after: '1', changed: false },
    ]);
    expect(compareStates('{"name":"A"}', null)).toEqual([{ field: 'name', before: 'A', after: null, changed: false }]);
  });
});

describe('mapIcons', () => {
  it('chỉ vẽ xe đang tới hiện trường', () => {
    expect(MAP_VISIBLE_VEHICLE_STATUSES).toEqual(['accepted', 'en_route']);
  });

  it('vehicleMarkerHtml: màu theo trạng thái, kích thước khi chọn, vòng sáng khi đang chạy', () => {
    const html = vehicleMarkerHtml('fire_truck', 'en_route', true);
    expect(html).toContain(`background:${VEHICLE_STATUS_META.en_route.color}`);
    expect(html).toContain('width:30px');
    expect(html).toContain('animate-ping');
    expect(html).toContain('<svg');
    const idle = vehicleMarkerHtml('ambulance', 'accepted', false);
    expect(idle).toContain('width:22px');
    expect(idle).not.toContain('animate-ping');
  });

  it('incidentMarkerHtml: huy hiệu cấp độ', () => {
    const html = incidentMarkerHtml('accident', 3, false);
    expect(html).toContain(SEVERITY_LEVEL_COLOR[3]);
    expect(html).toMatch(/>\s*3\s*<\/span>/);
    expect(incidentMarkerHtml('fire', 1, true)).toContain('width:34px');
  });

  it('trafficJamMarkerHtml / stationMarkerHtml', () => {
    expect(trafficJamMarkerHtml()).toContain('#2563EB');
    expect(stationMarkerHtml()).toContain('#1E293B');
    expect(stationMarkerHtml(true)).toContain('#B91C1C');
  });
});
