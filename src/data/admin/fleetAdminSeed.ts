import { stations, vehicleSeeds } from '../liveMapMock';
import { internalAccountSeed } from './internalAccountSeed';
import type { AdminStation, AdminVehicle } from '../../types/adminFleet';

// Trạm & xe của Admin dùng CHUNG nguồn với Live Map (liveMapMock): cùng id, tên, tọa độ,
// biển số, loại xe, trạm trực thuộc. File này chỉ bổ sung các trường Live Map không có.

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

// Trạng thái lấy theo ảnh chụp lúc khởi tạo của Live Map (Live Map tự mô phỏng tiếp trong DispatchContext).
export function buildVehicleSeed(): AdminVehicle[] {
  const staffIdByName = new Map(internalAccountSeed.map((a) => [a.fullName, a.id]));
  return vehicleSeeds.map((v) => ({
    id: v.id,
    plate: v.plate,
    type: v.type,
    stationId: v.stationId,
    status: v.status,
    crewMemberId: staffIdByName.get(v.driver) ?? null,
    isDeleted: false,
  }));
}
