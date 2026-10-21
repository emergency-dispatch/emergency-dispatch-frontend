import type { StationTeam } from '../types/stationTeam';

// Nhân sự & tổ mẫu, khớp ID trạm/xe/nhân sự với liveMapMock và data/admin.
// Demo: st-1 có tổ thiếu người (Tổ 3 chỉ 1 người, rs-15 chưa vào tổ); st-4 có xe veh-9 chưa có tổ.
// rs-25 … rs-28 chưa thuộc trạm nào.

/** Trạm hiển thị khi tài khoản Operator chưa được gắn làm Trưởng trạm (chế độ demo). */
export const DEMO_STATION_ID = 'st-1';

export const STATION_STAFF_SEED: Record<string, string[]> = {
  'st-1': ['rs-1', 'rs-2', 'rs-3', 'rs-13', 'rs-14', 'rs-15'],
  'st-2': ['rs-4', 'rs-5', 'rs-16', 'rs-17', 'rs-18', 'rs-19'],
  'st-3': ['rs-6', 'rs-7', 'rs-11', 'rs-12', 'rs-20', 'rs-21'],
  'st-4': ['rs-8', 'rs-9', 'rs-10', 'rs-22', 'rs-23', 'rs-24'],
};

export const STATION_TEAM_SEED: StationTeam[] = [
  {
    id: 'team-1', stationId: 'st-1', name: 'Tổ 1 – Chữa cháy', vehicleId: 'veh-1',
    members: [{ staffId: 'rs-1', crewRole: 'commander' }, { staffId: 'rs-13', crewRole: 'firefighter' }],
  },
  {
    id: 'team-2', stationId: 'st-1', name: 'Tổ 2 – Chữa cháy', vehicleId: 'veh-2',
    members: [{ staffId: 'rs-2', crewRole: 'driver' }, { staffId: 'rs-14', crewRole: 'firefighter' }],
  },
  {
    id: 'team-3', stationId: 'st-1', name: 'Tổ 3 – Cứu hộ', vehicleId: 'veh-3',
    members: [{ staffId: 'rs-3', crewRole: 'driver' }],
  },
  {
    id: 'team-4', stationId: 'st-2', name: 'Tổ 1 – Cấp cứu', vehicleId: 'veh-4',
    members: [{ staffId: 'rs-4', crewRole: 'driver' }, { staffId: 'rs-16', crewRole: 'medic' }],
  },
  {
    id: 'team-5', stationId: 'st-2', name: 'Tổ 2 – Cấp cứu', vehicleId: 'veh-5',
    members: [{ staffId: 'rs-5', crewRole: 'driver' }, { staffId: 'rs-17', crewRole: 'medic' }],
  },
  {
    id: 'team-6', stationId: 'st-2', name: 'Tổ trực trạm', vehicleId: null,
    members: [{ staffId: 'rs-18', crewRole: 'commander' }, { staffId: 'rs-19', crewRole: 'medic' }],
  },
  {
    id: 'team-7', stationId: 'st-3', name: 'Tổ 1 – Chữa cháy', vehicleId: 'veh-6',
    members: [{ staffId: 'rs-6', crewRole: 'commander' }, { staffId: 'rs-20', crewRole: 'firefighter' }],
  },
  {
    id: 'team-8', stationId: 'st-3', name: 'Tổ 2 – Cấp cứu', vehicleId: 'veh-7',
    members: [{ staffId: 'rs-7', crewRole: 'driver' }, { staffId: 'rs-11', crewRole: 'medic' }],
  },
  {
    id: 'team-9', stationId: 'st-3', name: 'Tổ trực trạm', vehicleId: null,
    members: [{ staffId: 'rs-21', crewRole: 'rescuer' }, { staffId: 'rs-12', crewRole: 'firefighter' }],
  },
  {
    id: 'team-10', stationId: 'st-4', name: 'Tổ 1 – Cứu hộ', vehicleId: 'veh-8',
    members: [{ staffId: 'rs-8', crewRole: 'commander' }, { staffId: 'rs-22', crewRole: 'rescuer' }],
  },
  {
    id: 'team-11', stationId: 'st-4', name: 'Tổ 2 – Chữa cháy', vehicleId: 'veh-10',
    members: [{ staffId: 'rs-10', crewRole: 'driver' }, { staffId: 'rs-24', crewRole: 'firefighter' }],
  },
];
