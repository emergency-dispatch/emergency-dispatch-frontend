import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { apiClient } from '@/services/apiClient';
import { apiOk } from '../../setup/fixtures';
import {
  SERVICE_AREA_RADIUS_KM,
  adminSettingsService,
  validateDispatchSettings,
  validateEscalationSettings,
  validateServiceArea,
  type DispatchSettings,
  type EscalationSettings,
  type ServiceAreaSettings,
} from '@/services/admin/adminSettingsService';
import { reportAdminService } from '@/services/admin/reportAdminService';
import { searchAddress, searchAddressInArea } from '@/services/admin/geocodeService';

vi.mock('@/services/apiClient', async (importOriginal) => (await import('../../setup/mockApiClient')).mockApiClientModule(importOriginal));

const api = apiClient as unknown as { get: Mock; put: Mock };

beforeEach(() => {
  api.get.mockReset();
  api.put.mockReset();
});

describe('validateDispatchSettings', () => {
  const ok: DispatchSettings = { weights: { distance: 0.5, stationLoad: 0.3, activeMissions: 0.2 }, radiusStepsKm: [3, 5, 10], recoveryMinutes: 15 };

  it('hợp lệ → không lỗi', () => {
    expect(validateDispatchSettings(ok, 30)).toEqual({});
  });

  it('trọng số', () => {
    expect(validateDispatchSettings({ ...ok, weights: { distance: 0, stationLoad: 0.5, activeMissions: 0.5 } }, 30).weights).toBe(
      'Mỗi trọng số phải lớn hơn 0.',
    );
    expect(validateDispatchSettings({ ...ok, weights: { distance: 0.5, stationLoad: 0.5, activeMissions: 0.5 } }, 30).weights).toBe(
      'Tổng ba trọng số phải bằng 1.',
    );
    // sai số dấu phẩy động nằm trong ngưỡng cho phép
    expect(validateDispatchSettings({ ...ok, weights: { distance: 0.1, stationLoad: 0.2, activeMissions: 0.7000001 } }, 30)).toEqual({});
  });

  it('các nấc bán kính', () => {
    expect(validateDispatchSettings({ ...ok, radiusStepsKm: [] }, 30).radiusStepsKm).toBe('Cần ít nhất 1 nấc bán kính.');
    expect(validateDispatchSettings({ ...ok, radiusStepsKm: [3, -1] }, 30).radiusStepsKm).toBe('Mỗi nấc bán kính phải lớn hơn 0.');
    expect(validateDispatchSettings({ ...ok, radiusStepsKm: [5, 5] }, 30).radiusStepsKm).toBe('Các nấc bán kính phải tăng dần.');
    expect(validateDispatchSettings({ ...ok, radiusStepsKm: [5, 40] }, 30).radiusStepsKm).toContain('(30 km)');
  });

  it('thời gian hồi sức', () => {
    expect(validateDispatchSettings({ ...ok, recoveryMinutes: 0 }, 30).recoveryMinutes).toBe('Phải lớn hơn 0.');
    expect(validateDispatchSettings({ ...ok, recoveryMinutes: Number.NaN }, 30).recoveryMinutes).toBe('Phải lớn hơn 0.');
  });
});

describe('validateEscalationSettings', () => {
  const ok: EscalationSettings = {
    dayThresholdMinutes: 5,
    nightThresholdMinutes: 2.5,
    nightStart: '22:00',
    nightEnd: '06:00',
    radiusMultiplier: 2,
    maxRadiusKm: 30,
  };

  it('hợp lệ', () => {
    expect(validateEscalationSettings(ok, [3, 5, 10])).toEqual({});
    expect(validateEscalationSettings(ok, [])).toEqual({});
  });

  it('ngưỡng phải dương và theo bước 0.5', () => {
    const e = validateEscalationSettings({ ...ok, dayThresholdMinutes: 0, nightThresholdMinutes: 2.3 }, []);
    expect(e.dayThresholdMinutes).toBe('Phải lớn hơn 0.');
    expect(e.nightThresholdMinutes).toBe('Chỉ nhận bước 0.5 phút (VD 2, 2.5, 3).');
  });

  it('giờ ca đêm', () => {
    expect(validateEscalationSettings({ ...ok, nightStart: '24:00' }, []).nightStart).toBe('Giờ không hợp lệ.');
    expect(validateEscalationSettings({ ...ok, nightEnd: '6:00' }, []).nightEnd).toBe('Giờ không hợp lệ.');
    expect(validateEscalationSettings({ ...ok, nightEnd: '22:00' }, []).nightEnd).toBe('Giờ kết thúc phải khác giờ bắt đầu.');
  });

  it('hệ số và bán kính tối đa', () => {
    expect(validateEscalationSettings({ ...ok, radiusMultiplier: -1 }, []).radiusMultiplier).toBe('Phải lớn hơn 0.');
    expect(validateEscalationSettings({ ...ok, maxRadiusKm: 0 }, []).maxRadiusKm).toBe('Phải lớn hơn 0.');
    expect(validateEscalationSettings({ ...ok, maxRadiusKm: 8 }, [3, 10, 5]).maxRadiusKm).toContain('(10 km)');
  });
});

describe('validateServiceArea', () => {
  const ok: ServiceAreaSettings = { enabled: true, name: 'SHTP', centerLat: 10.8, centerLng: 106.8, radiusKm: 5 };

  it('hợp lệ', () => {
    expect(validateServiceArea(ok)).toEqual({});
  });

  it('tên, tâm và bán kính', () => {
    expect(validateServiceArea({ ...ok, name: '  ' }).name).toBe('Vui lòng nhập tên khu vực.');
    expect(validateServiceArea({ ...ok, centerLat: 0, centerLng: 0 }).centerLat).toBe('Vui lòng chọn tâm khu vực trên bản đồ.');
    expect(validateServiceArea({ ...ok, enabled: false, centerLat: 0, centerLng: 0 }).centerLat).toBeUndefined();
    expect(validateServiceArea({ ...ok, radiusKm: SERVICE_AREA_RADIUS_KM.max + 1 }).radiusKm).toBe('Bán kính phải từ 1 đến 100 km.');
    expect(validateServiceArea({ ...ok, radiusKm: 0.5 }).radiusKm).toBeDefined();
    expect(validateServiceArea({ ...ok, radiusKm: Number.NaN }).radiusKm).toBeDefined();
  });
});

describe('adminSettingsService', () => {
  it.each([
    ['getDispatchSettings', '/settings/dispatch'],
    ['getEscalationSettings', '/settings/escalation'],
    ['getServiceArea', '/settings/service-area'],
    ['getDefaults', '/settings/defaults'],
  ] as const)('%s → GET %s', async (method, url) => {
    api.get.mockResolvedValue(apiOk({ values: 1 }));
    await expect(adminSettingsService[method]()).resolves.toEqual({ values: 1 });
    expect(api.get).toHaveBeenCalledWith(url);
  });

  it.each([
    ['updateDispatchSettings', '/settings/dispatch'],
    ['updateEscalationSettings', '/settings/escalation'],
    ['updateServiceArea', '/settings/service-area'],
  ] as const)('%s → PUT %s', async (method, url) => {
    api.put.mockResolvedValue(apiOk({ values: 2 }));
    const body = { a: 1 } as never;
    await adminSettingsService[method](body);
    expect(api.put).toHaveBeenCalledWith(url, body);
  });
});

describe('reportAdminService', () => {
  it('listIncidents gửi bộ lọc, bỏ status All', async () => {
    api.get.mockResolvedValue(apiOk({ items: [] }));
    await reportAdminService.listIncidents({ status: 'All', search: '  cháy ', stationId: '', severity: 'Level2' });
    expect(api.get).toHaveBeenCalledWith('/reports/incidents', {
      params: { from: undefined, to: undefined, stationId: undefined, status: undefined, severity: 'Level2', search: 'cháy', pageIndex: 1, pageSize: 20 },
    });
  });

  it('getSummary với khoảng ngày', async () => {
    api.get.mockResolvedValue(apiOk({ total: 3 }));
    await reportAdminService.getSummary({ fromDate: '2026-01-01', toDate: '2026-01-31', status: 'Completed' });
    const params = api.get.mock.calls[0][1].params;
    expect(params.status).toBe('Completed');
    expect(params.from).toBe(new Date('2026-01-01T00:00:00').toISOString());
  });

  it('khoảng ngày ngược → lỗi', async () => {
    await expect(reportAdminService.getSummary({ fromDate: '2026-02-01', toDate: '2026-01-01' })).rejects.toThrow(
      'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.',
    );
  });

  describe('exportIncidents', () => {
    let click: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    it('lấy tên file từ Content-Disposition (UTF-8)', async () => {
      api.get.mockResolvedValue({
        data: new Blob(['a']),
        headers: { 'content-disposition': `attachment; filename*=UTF-8''b%C3%A1o-c%C3%A1o.pdf` },
      });
      await expect(reportAdminService.exportIncidents({}, 'Pdf')).resolves.toBe('báo-cáo.pdf');
      expect(api.get.mock.calls[0][1]).toMatchObject({ responseType: 'blob', params: { format: 'Pdf' } });
      expect(click).toHaveBeenCalled();
    });

    it('không có header → tên mặc định theo định dạng', async () => {
      api.get.mockResolvedValue({ data: new Blob(['a']), headers: {} });
      await expect(reportAdminService.exportIncidents({}, 'Csv')).resolves.toBe('bao-cao-su-co.csv');
      await expect(reportAdminService.exportIncidents({}, 'Pdf')).resolves.toBe('bao-cao-su-co.pdf');
    });

    const blobError = (body: string) =>
      new AxiosError('Bad', '400', undefined, undefined, {
        data: new Blob([body]),
        status: 400,
        statusText: 'Bad',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

    it('lỗi dạng Blob JSON → ném message của backend', async () => {
      api.get.mockRejectedValue(blobError('{"message":"Quá 5000 dòng"}'));
      await expect(reportAdminService.exportIncidents({}, 'Csv')).rejects.toThrow('Quá 5000 dòng');
    });

    it('lỗi Blob không phải JSON → ném lỗi gốc', async () => {
      const err = blobError('<html>');
      api.get.mockRejectedValue(err);
      await expect(reportAdminService.exportIncidents({}, 'Csv')).rejects.toBe(err);
    });
  });
});

describe('geocodeService', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const json = (body: unknown, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

  it('searchAddress dùng Mapbox khi có kết quả', async () => {
    fetchMock.mockReturnValueOnce(json({ features: [{ place_name: 'Đường D1', center: [106.8, 10.84] }] }));
    const res = await searchAddress('D1', new AbortController().signal);
    expect(res).toEqual([{ label: 'Đường D1', lng: 106.8, lat: 10.84 }]);
    expect(fetchMock.mock.calls[0][0]).toContain('api.mapbox.com/geocoding');
    expect(fetchMock.mock.calls[0][0]).toContain('access_token=test-mapbox-token');
  });

  it('searchAddress fallback sang Nominatim khi Mapbox rỗng / lỗi', async () => {
    fetchMock
      .mockReturnValueOnce(json({ features: [] }))
      .mockReturnValueOnce(json([{ display_name: 'OSM', lat: '10.1', lon: '106.2' }]));
    expect(await searchAddress('x', new AbortController().signal)).toEqual([{ label: 'OSM', lat: 10.1, lng: 106.2 }]);

    fetchMock.mockReturnValueOnce(json({}, false, 500)).mockReturnValueOnce(json([]));
    expect(await searchAddress('x', new AbortController().signal)).toEqual([]);
    expect(fetchMock.mock.calls[3][0]).toContain('nominatim.openstreetmap.org');
  });

  it('searchAddress huỷ → ném lỗi, không fallback', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    await expect(searchAddress('x', ctrl.signal)).rejects.toThrow('aborted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('searchAddress Nominatim lỗi → ném lỗi', async () => {
    fetchMock.mockReturnValueOnce(json({ features: [] })).mockReturnValueOnce(json([], false, 503));
    await expect(searchAddress('x', new AbortController().signal)).rejects.toThrow('Nominatim 503');
  });

  describe('searchAddressInArea', () => {
    const area = { lat: 10.84, lng: 106.8, radiusKm: 3 };

    it('gộp Mapbox + OSM, bỏ trùng tên, lọc ngoài vùng', async () => {
      fetchMock.mockImplementation((url: string) =>
        url.includes('searchbox')
          ? json({
              features: [
                { geometry: { coordinates: [106.801, 10.841] }, properties: { feature_type: 'poi', name: 'ĐH FPT', full_address: 'Lô E2a' } },
                { geometry: { coordinates: [106.802, 10.842] }, properties: { feature_type: 'street', place_formatted: 'Đường D1, Thủ Đức' } },
                { geometry: { coordinates: [107.5, 11.5] }, properties: { name: 'Xa quá' } },
              ],
            })
          : json([
              { display_name: 'đường d1, khác', lat: '10.84', lon: '106.8' },
              { display_name: 'Công viên', lat: '10.843', lon: '106.803' },
            ]),
      );
      const res = await searchAddressInArea('x', area, new AbortController().signal);
      expect(res.map((r) => r.label)).toEqual(['ĐH FPT, Lô E2a', 'Đường D1, Thủ Đức', 'Công viên']);
      const osmUrl = fetchMock.mock.calls.find((c) => String(c[0]).includes('nominatim'))![0];
      expect(osmUrl).toContain('bounded=1');
    });

    it('một nguồn lỗi vẫn dùng nguồn còn lại', async () => {
      fetchMock.mockImplementation((url: string) =>
        url.includes('searchbox') ? Promise.reject(new Error('down')) : json([{ display_name: 'A', lat: '10.84', lon: '106.8' }]),
      );
      expect((await searchAddressInArea('x', area, new AbortController().signal)).map((r) => r.label)).toEqual(['A']);
    });

    it('cả hai nguồn lỗi → ném lỗi', async () => {
      fetchMock.mockImplementation(() => json({}, false, 500));
      await expect(searchAddressInArea('x', area, new AbortController().signal)).rejects.toThrow('Mapbox Search Box 500');
    });
  });
});
