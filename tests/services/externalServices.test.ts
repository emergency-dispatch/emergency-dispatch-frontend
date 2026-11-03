import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { routingService as RoutingService } from '@/services/routingService';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_DARK_STYLE, MAPBOX_LIGHT_STYLE, MAPBOX_STREETS_STYLE, MAPBOX_STYLE, MAPBOX_REALISTIC_STYLE, mapboxService } from '@/services/mapboxService';

const fetchMock = vi.fn();
const json = (body: unknown, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe('routingService', () => {
  let routing: typeof RoutingService;
  beforeEach(async () => {
    vi.resetModules(); // xóa cache tuyến đường
    routing = (await import('@/services/routingService')).routingService;
  });

  const osrm = (steps: unknown[]) => ({
    code: 'Ok',
    routes: [
      {
        distance: 2345.6,
        duration: 301.4,
        geometry: { coordinates: [[106.8, 10.84], [106.81, 10.85]] },
        legs: [{ steps }],
      },
    ],
  });

  it('gọi OSRM với lng,lat và chuyển polyline sang [lat, lng]', async () => {
    fetchMock.mockReturnValue(
      json(
        osrm([
          { name: 'D1', distance: 100.4, duration: 10.6, maneuver: { type: 'depart', location: [106.8, 10.84] } },
          { name: 'D2', distance: 200, duration: 20, maneuver: { type: 'turn', modifier: 'right', location: [106.805, 10.845] } },
          { name: '', distance: 50, duration: 5, maneuver: { type: 'turn', modifier: 'slight left' } },
          { name: ' ', distance: 0, duration: 0, maneuver: { type: 'arrive', location: [106.81, 10.85] } },
        ]),
      ),
    );
    const r = await routing.calculateDrivingRoute([10.84, 106.8], [10.85, 106.81]);
    expect(fetchMock.mock.calls[0][0]).toContain('/route/v1/driving/106.8,10.84;106.81,10.85');
    expect(r.polyline).toEqual([[10.84, 106.8], [10.85, 106.81]]);
    expect(r.totalDistanceMeters).toBe(2346);
    expect(r.totalDurationSeconds).toBe(301);
    expect(r.steps.map((s) => s.maneuver)).toEqual(['straight', 'turn_right', 'slight_left', 'arrive']);
    expect(r.steps[0]).toMatchObject({ id: 'step-1', instruction: 'Xuất phát từ vị trí kíp trực, di chuyển vào D1', distanceMeters: 100, durationSeconds: 11 });
    expect(r.steps[1].instruction).toBe('Rẽ phải vào D2');
    expect(r.steps[2]).toMatchObject({ roadName: 'Tuyến đường tác chiến', instruction: 'Chếch sang trái vào Tuyến đường tác chiến', lat: 10.84, lng: 106.8 });
    expect(r.steps[3]).toMatchObject({ roadName: 'Khu vực hiện trường', instruction: 'Đã tiếp cận mục tiêu hiện trường sự cố (Khu vực hiện trường)' });
  });

  it.each([
    ['left', 'turn_left', 'Rẽ trái vào X'],
    ['sharp left', 'turn_left', 'Rẽ trái vào X'],
    ['sharp right', 'turn_right', 'Rẽ phải vào X'],
    ['slight right', 'slight_right', 'Chếch sang phải vào X'],
    ['uturn', 'u_turn', 'Quay đầu xe trên X'],
  ])('rẽ %s', async (modifier, maneuver, instruction) => {
    fetchMock.mockReturnValue(json(osrm([{ name: 'A', maneuver: {} }, { name: 'X', maneuver: { type: 'turn', modifier } }, { name: 'B', maneuver: { type: 'arrive' } }])));
    const r = await routing.calculateDrivingRoute([1, 2], [3, 4]);
    expect(r.steps[1]).toMatchObject({ maneuver, instruction });
  });

  it('vòng xuyến và đi thẳng', async () => {
    fetchMock.mockReturnValue(
      json(osrm([{ name: 'A', maneuver: {} }, { name: 'R', maneuver: { type: 'roundabout' } }, { name: 'S', maneuver: { type: 'continue' } }, { name: 'B', maneuver: {} }])),
    );
    const r = await routing.calculateDrivingRoute([1, 2], [3, 4]);
    expect(r.steps[1]).toMatchObject({ maneuver: 'roundabout', instruction: 'Vào vòng xuyến, đi theo lối ra vào R' });
    expect(r.steps[2]).toMatchObject({ maneuver: 'straight', instruction: 'Tiếp tục đi thẳng trên S' });
  });

  it('không có step → tự sinh 2 mốc 70/30', async () => {
    fetchMock.mockReturnValue(json({ code: 'Ok', routes: [{ distance: 1000, duration: 100, geometry: { coordinates: [[2, 1]] } }] }));
    const r = await routing.calculateDrivingRoute([1, 2], [3, 4]);
    expect(r.steps).toHaveLength(2);
    expect(r.steps[0]).toMatchObject({ distanceMeters: 700, durationSeconds: 70, lat: 1, lng: 2 });
    expect(r.steps[1]).toMatchObject({ maneuver: 'arrive', distanceMeters: 300, lat: 3, lng: 4 });
  });

  it('kết quả được cache theo cặp tọa độ', async () => {
    fetchMock.mockReturnValue(json(osrm([])));
    const a = await routing.calculateDrivingRoute([1, 2], [3, 4]);
    const b = await routing.calculateDrivingRoute([1.000001, 2], [3, 4]);
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['HTTP lỗi', () => json({}, false, 429)],
    ['mạng lỗi', () => Promise.reject(new Error('offline'))],
    ['không có tuyến', () => json({ code: 'NoRoute', routes: [] })],
  ])('%s → tuyến dự phòng', async (_n, impl) => {
    fetchMock.mockImplementation(impl);
    const r = await routing.calculateDrivingRoute([10, 106], [12, 108]);
    expect(r).toEqual(routing.createFallbackRoute([10, 106], [12, 108]));
  });

  it('createFallbackRoute đi qua điểm giữa', () => {
    const r = routing.createFallbackRoute([10, 106], [12, 108]);
    expect(r.polyline).toEqual([[10, 106], [11, 106], [11, 107], [12, 107], [12, 108]]);
    expect(r.steps.map((s) => s.maneuver)).toEqual(['straight', 'turn_right', 'arrive']);
    expect(r.totalDistanceMeters).toBe(1500);
    expect(r.totalDurationSeconds).toBe(180);
  });
});

describe('mapboxService', () => {
  it('token và các style raster', () => {
    expect(MAPBOX_ACCESS_TOKEN).toBe('test-mapbox-token');
    expect(MAPBOX_STYLE).toBe(MAPBOX_REALISTIC_STYLE);
    expect(MAPBOX_LIGHT_STYLE).toBe(MAPBOX_STREETS_STYLE);
    for (const style of [MAPBOX_REALISTIC_STYLE, MAPBOX_DARK_STYLE, MAPBOX_STREETS_STYLE]) {
      expect(style.version).toBe(8);
      expect(style.layers.length).toBeGreaterThan(0);
      for (const layer of style.layers) expect(style.sources).toHaveProperty((layer as { source: string }).source);
    }
  });

  describe('reverseGeocode', () => {
    it('Mapbox có kết quả', async () => {
      fetchMock.mockReturnValue(json({ features: [{ place_name: 'Đường D1, Thủ Đức' }] }));
      await expect(mapboxService.reverseGeocode(106.8, 10.84)).resolves.toBe('Đường D1, Thủ Đức');
      expect(fetchMock.mock.calls[0][0]).toContain('mapbox.places/106.8,10.84.json');
    });

    it('Mapbox rỗng → OSM', async () => {
      fetchMock.mockReturnValueOnce(json({ features: [] })).mockReturnValueOnce(json({ display_name: 'OSM addr' }));
      await expect(mapboxService.reverseGeocode(106.8, 10.84)).resolves.toBe('OSM addr');
      expect(fetchMock.mock.calls[1][0]).toContain('nominatim.openstreetmap.org/reverse?lat=10.84&lon=106.8');
    });

    it('cả hai lỗi → chuỗi tọa độ', async () => {
      fetchMock.mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('y'));
      await expect(mapboxService.reverseGeocode(106.80001, 10.84449)).resolves.toBe('Tọa độ (10.8445, 106.8000)');
    });

    it('OSM không có display_name → chuỗi tọa độ', async () => {
      fetchMock.mockReturnValueOnce(json({}, false, 500)).mockReturnValueOnce(json({}));
      await expect(mapboxService.reverseGeocode(1, 2)).resolves.toBe('Tọa độ (2.0000, 1.0000)');
    });
  });

  describe('forwardGeocode', () => {
    it('chuỗi rỗng → null', async () => {
      await expect(mapboxService.forwardGeocode('   ')).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('khớp nhanh tỉnh/thành offline (không dấu, không phân biệt hoa thường)', async () => {
      await expect(mapboxService.forwardGeocode('Đà Nẵng')).resolves.toEqual({ lat: 16.0544, lng: 108.2022, address: 'Đà Nẵng' });
      await expect(mapboxService.forwardGeocode('Quận 1, HA NOI')).resolves.toMatchObject({ lat: 21.0285, address: 'Quận 1, HA NOI' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('tên ngắn ≤ 3 ký tự dùng tên tỉnh chuẩn', async () => {
      await expect(mapboxService.forwardGeocode('bmt')).resolves.toEqual({ lat: 12.6667, lng: 108.05, address: 'Đắk Lắk' });
    });

    it('Mapbox → kết quả đầu tiên', async () => {
      fetchMock.mockReturnValue(json({ features: [{ center: [106.8, 10.84], place_name: 'SHTP' }] }));
      await expect(mapboxService.forwardGeocode('Khu cong nghe cao')).resolves.toEqual({ lat: 10.84, lng: 106.8, address: 'SHTP' });
    });

    it('Mapbox lỗi → OSM', async () => {
      fetchMock.mockRejectedValueOnce(new Error('x')).mockReturnValueOnce(json([{ lat: '10.5', lon: '106.5', display_name: '' }]));
      await expect(mapboxService.forwardGeocode('abc xyz')).resolves.toEqual({ lat: 10.5, lng: 106.5, address: 'abc xyz' });
    });

    it('không tìm thấy → null', async () => {
      fetchMock.mockReturnValueOnce(json({ features: [] })).mockReturnValueOnce(json([]));
      await expect(mapboxService.forwardGeocode('không tồn tại')).resolves.toBeNull();
    });
  });
});
