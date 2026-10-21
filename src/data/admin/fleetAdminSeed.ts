import { stations } from '../liveMapMock';
import type { AdminStation } from '../../types/adminFleet';

// Trạm mock (id 'st-1'…) khớp Live Map — chỉ còn màn Tài khoản (trưởng trạm) và Trạm & Tổ của Operator dùng.
// Trang Trạm cứu hộ / Đội xe của Admin đã dùng API thật.

const STATION_EXTRAS: Record<
  string,
  Pick<AdminStation, 'address' | 'coverageRadiusKm' | 'hotline' | 'headOperatorId'>
> = {
  'st-1': { address: 'Lô I-1, Đường D1, Phân khu 1', coverageRadiusKm: 5, hotline: '02837301111', headOperatorId: 'op-3' },
  'st-2': { address: 'Lô T2, Đường D2, Phân khu 2', coverageRadiusKm: 4.5, hotline: '02837302222', headOperatorId: 'op-4' },
  'st-3': { address: 'Lô E2, Đường D3, Phân khu 3', coverageRadiusKm: 5, hotline: '02837303333', headOperatorId: null },
  'st-4': { address: 'Đường Võ Chí Công, Phân khu 4', coverageRadiusKm: 4, hotline: '02837304444', headOperatorId: 'op-5' },
};

export function buildStationSeed(): AdminStation[] {
  return stations.map((s) => ({
    id: s.id,
    name: s.name,
    area: s.area,
    lat: s.lat,
    lng: s.lng,
    ...(STATION_EXTRAS[s.id] ?? { address: '', coverageRadiusKm: 5, hotline: '', headOperatorId: null }),
    isDeleted: false,
  }));
}
