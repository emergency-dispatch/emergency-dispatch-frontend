import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveMapView } from '@/components/operator/livemap/LiveMapView';
import { MapLegend } from '@/components/operator/livemap/MapLegend';
import { MapLayerToggle, applyTileMode, baseLayerId, createBaseMapStyle } from '@/components/operator/livemap/MapLayerToggle';
import { circlePolygon } from '@/components/operator/livemap/MapServiceAreaLayer';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { useTeamByVehicle } from '@/hooks/useStationTeams';
import { FakeMap } from '../../../setup/mapboxGlMock';
import { makeIncident } from '../../../setup/fixtures';
import { t } from '../../../setup/render';
import { haversineDistanceKm } from '@/utils/serviceArea';
import type { Station, Vehicle } from '@/types/vehicle';

vi.mock('@/hooks/useStationTeams', () => ({ useTeamByVehicle: vi.fn() }));

const station = (o: Partial<Station>): Station => ({ id: 'st-1', name: 'Trạm 1', address: '', lat: 10.84, lng: 106.8, coverageRadiusKm: 5, vehicleIds: [], ...o });
const v = (o: Partial<Vehicle>): Vehicle =>
  ({ id: 'v', plate: 'X', type: 'fire_truck', unitType: 'FireTruck', status: 'available', unitStatus: 'Available', stationId: 'st-1', stationName: 'Trạm 1', incidentId: null, assignmentId: null, lat: 10.85, lng: 106.81, heading: 0, etaMinutes: null, hasLiveGps: false, lastUpdated: '', ...o }) as Vehicle;

const baseProps = () => {
  const vehicles = [
    v({ id: 'moving', plate: '51A-1', status: 'en_route', incidentId: 'i1', hasLiveGps: true, etaMinutes: 3 }),
    v({ id: 'parked', plate: '51A-2' }),
    v({ id: 'acc', plate: '51A-3', status: 'accepted', incidentId: 'i1' }),
  ];
  const incidents = [makeIncident({ id: 'i1', status: 'approved', lat: 10.86, lng: 106.82 })];
  return {
    vehicles,
    selectedVehicleId: null as string | null,
    onSelectVehicle: vi.fn(),
    dispatchIncidents: incidents,
    selectedIncidentId: null as string | null,
    onSelectIncident: vi.fn(),
    stations: [station({}), station({ id: 'st-2', name: 'Trạm 2', lat: 10.9 })],
    trafficJams: [{ id: 'j1', area: 'Ngã tư', lat: 10.87, lng: 106.83, note: 'Kẹt', reportedAt: '', mediaUrl: null }],
    onResolveTrafficJam: vi.fn(),
    routes: [],
    vehiclesById: new Map(vehicles.map((x) => [x.id, x])),
    incidentsById: new Map(incidents.map((x) => [x.id, x])),
    serviceArea: { enabled: true, name: 'SHTP', centerLat: 10.84, centerLng: 106.8, radiusKm: 4.5 },
    pickLocation: null,
    nearbyIncidents: [],
  };
};

const renderMap = (props = baseProps()) =>
  render(
    <AuthContext.Provider value={{ user: { id: 'op1', stationId: 'st-1' } } as unknown as AuthContextType}>
      <LiveMapView {...(props as React.ComponentProps<typeof LiveMapView>)} />
    </AuthContext.Provider>,
  );

const lastMap = () => FakeMap.instances.slice(-1)[0]!;
const markers = () => [...lastMap().container.children].filter((el) => el.tagName === 'DIV');

beforeEach(() => {
  FakeMap.instances.length = 0;
  vi.mocked(useTeamByVehicle).mockReturnValue(new Map());
});

describe('LiveMapView', () => {
  it('tạo bản đồ, vẽ trạm + ùn tắc + xe đang tới + sự cố (không vẽ xe đậu)', () => {
    renderMap();
    expect(FakeMap.instances).toHaveLength(1);
    // 2 trạm + 1 ùn tắc + 2 xe (en_route, accepted) + 1 sự cố
    expect(markers()).toHaveLength(6);
    expect(lastMap().sources.size).toBeGreaterThan(0);
  });

  it('bấm marker sự cố → chọn sự cố', async () => {
    vi.useFakeTimers();
    const props = baseProps();
    renderMap(props);
    const incidentMarker = markers().find((m) => m.innerHTML.includes('animate-ping') && m.innerHTML.includes('>\n        2\n'));
    fireEvent.click(incidentMarker ?? markers().slice(-1)[0]!);
    await act(async () => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
    expect(props.onSelectIncident).toHaveBeenCalledWith('i1');
  });

  it('nút chỉ đường cần chọn xe; mở Google Maps tới sự cố', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { rerender } = renderMap();
    expect(screen.getByRole('button', { name: t('liveMap.map.directions') })).toBeDisabled();
    const props = { ...baseProps(), selectedVehicleId: 'moving' };
    rerender(
      <AuthContext.Provider value={{ user: { id: 'op1', stationId: 'st-1' } } as unknown as AuthContextType}>
        <LiveMapView {...(props as React.ComponentProps<typeof LiveMapView>)} />
      </AuthContext.Provider>,
    );
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.map.directions') }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('destination=10.86,106.82'), '_blank', 'noopener,noreferrer');
    expect(lastMap().flyTo).toHaveBeenCalled();
  });

  it('bật/tắt vòng phủ sóng (nhớ localStorage), 2D/3D, định vị', async () => {
    renderMap();
    const coverage = screen.getByRole('button', { name: t('liveMap.map.hideCoverage') });
    expect(coverage).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(coverage);
    expect(localStorage.getItem('resq.liveMap.showStationCoverage')).toBe('0');
    expect(screen.getByRole('button', { name: t('liveMap.map.showCoverage') })).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(screen.getByRole('button', { name: t('liveMap.layers.view2d') }));
    expect(lastMap().easeTo).toHaveBeenCalledWith({ pitch: 0, duration: 600 });
    expect(screen.getByRole('button', { name: t('liveMap.layers.view3d') })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: t('liveMap.map.recenter') }));
    expect(lastMap().fitBounds).toHaveBeenCalled();
  });

  it('chế độ chọn vị trí: bấm bản đồ → onPick', () => {
    const onPick = vi.fn();
    renderMap({ ...baseProps(), pickLocation: { position: null, onPick, flyKey: 0 } } as never);
    expect(screen.getByText(t('liveMap.create.pickHint'))).toBeInTheDocument();
    act(() => lastMap().fire('click', { lngLat: { lat: 10.845, lng: 106.805 }, originalEvent: { target: document.body } }));
    expect(onPick).toHaveBeenCalledWith({ lat: 10.845, lng: 106.805 });
  });

  it('unmount → xóa bản đồ', () => {
    const { unmount } = renderMap();
    const map = lastMap();
    unmount();
    expect(map.remove).toHaveBeenCalled();
  });
});

describe('MapLayerToggle / MapLegend / helpers', () => {
  it('đổi lớp nền', async () => {
    const onChange = vi.fn();
    render(<MapLayerToggle mode="satellite" onChange={onChange} />);
    const group = screen.getByRole('group', { name: t('liveMap.layers.toggle') });
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
    await userEvent.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith('dark');
  });

  it('createBaseMapStyle / applyTileMode', () => {
    const style = createBaseMapStyle('dark');
    expect(style.layers.find((l) => l.id === baseLayerId('dark'))!.layout).toEqual({ visibility: 'visible' });
    expect(style.layers.find((l) => l.id === baseLayerId('light'))!.layout).toEqual({ visibility: 'none' });
    const map = { setLayoutProperty: vi.fn() };
    applyTileMode(map as never, 'light');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('base-light', 'visibility', 'visible');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('base-dark', 'visibility', 'none');
  });

  it('circlePolygon: các điểm cách tâm đúng bán kính, khép kín', () => {
    const pts = circlePolygon(10.84, 106.8, 4.5);
    expect(pts[0]).toEqual(pts.slice(-1)[0]);
    for (const [lng, lat] of pts) expect(haversineDistanceKm(10.84, 106.8, lat, lng)).toBeCloseTo(4.5, 2);
  });

  it('chú thích mở / thu gọn', async () => {
    render(<MapLegend />);
    const toggle = () => screen.queryByRole('button', { name: t('liveMap.legend.collapse') });
    if (!toggle()) await userEvent.click(screen.getByText(t('liveMap.legend.open')));
    expect(screen.getByText(t('liveMap.legend.serviceArea'))).toBeInTheDocument();
    await userEvent.click(toggle()!);
    expect(screen.getByText(t('liveMap.legend.open'))).toBeInTheDocument();
  });
});
