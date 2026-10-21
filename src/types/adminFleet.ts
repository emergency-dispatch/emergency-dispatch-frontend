/**
 * Trạm mock của Operator (data/stationSeed.ts) — chỉ màn Trạm & Tổ dùng.
 * Admin đã dùng API thật (types/station.ts, types/rescueUnit.ts).
 */
export interface AdminStation {
  id: string;
  name: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  coverageRadiusKm: number;
  hotline: string;
  /** Trưởng trạm = một Operator được gán vào trạm (HeadOperatorId), tối đa 1. */
  headOperatorId: string | null;
  isDeleted: boolean;
}
