import { Ambulance, Flame, ShieldCheck, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Station, Vehicle, VehicleStatus, VehicleType } from '../types/vehicle';

export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; color: string }> = {
  available: { label: 'Available', color: '#10B981' },
  en_route: { label: 'En route', color: '#2563EB' },
  on_scene: { label: 'On scene', color: '#F97316' },
};

export const VEHICLE_TYPE_META: Record<VehicleType, { label: string; icon: LucideIcon }> = {
  ambulance: { label: 'Xe cứu thương', icon: Ambulance },
  fire_truck: { label: 'Xe cứu hỏa', icon: Flame },
  police: { label: 'Xe cảnh sát', icon: ShieldCheck },
  rescue: { label: 'Xe cứu hộ', icon: Truck },
};

export const stations: Station[] = [
  { id: 'st-1', name: 'Trạm PCCC Quận 1', area: 'Quận 1', lat: 10.7769, lng: 106.7009, vehicleIds: ['veh-1', 'veh-2'] },
  { id: 'st-2', name: 'Trạm Cứu thương Quận 3', area: 'Quận 3', lat: 10.7843, lng: 106.6907, vehicleIds: ['veh-3', 'veh-4'] },
  { id: 'st-3', name: 'Trạm PCCC Quận 5', area: 'Quận 5', lat: 10.7546, lng: 106.6633, vehicleIds: ['veh-5', 'veh-6'] },
  { id: 'st-4', name: 'Trạm CSGT Quận 7', area: 'Quận 7', lat: 10.7325, lng: 106.7217, vehicleIds: ['veh-7', 'veh-8'] },
  { id: 'st-5', name: 'Trạm Cứu hộ Bình Thạnh', area: 'Bình Thạnh', lat: 10.8105, lng: 106.7091, vehicleIds: ['veh-9', 'veh-10'] },
];

// `target` simulates the incident coordinate an en-route vehicle is streaming toward over Socket.io.
export interface VehicleSeed extends Vehicle {
  target?: { lat: number; lng: number };
}

export const vehicleSeeds: VehicleSeed[] = [
  {
    id: 'veh-1', plate: '51D-123.45', type: 'fire_truck', status: 'on_scene', driver: 'Nguyễn Văn An',
    stationId: 'st-1', area: 'Quận 1', lat: 10.7725, lng: 106.6980, heading: 45, etaMinutes: null,
    incidentId: 'inc-1042', lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-2', plate: '51D-123.46', type: 'fire_truck', status: 'available', driver: 'Trần Văn Bình',
    stationId: 'st-1', area: 'Quận 1', lat: 10.7769, lng: 106.7009, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-3', plate: '51B-234.56', type: 'ambulance', status: 'en_route', driver: 'Lê Thị Cẩm',
    stationId: 'st-2', area: 'Quận 3', lat: 10.7820, lng: 106.6920, heading: 120, etaMinutes: 6,
    incidentId: 'inc-1039', lastUpdated: new Date().toISOString(),
    target: { lat: 10.7715, lng: 106.6985 },
  },
  {
    id: 'veh-4', plate: '51B-234.57', type: 'ambulance', status: 'available', driver: 'Phạm Thị Dung',
    stationId: 'st-2', area: 'Quận 3', lat: 10.7843, lng: 106.6907, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-5', plate: '51D-345.67', type: 'rescue', status: 'en_route', driver: 'Hoàng Văn Em',
    stationId: 'st-3', area: 'Quận 5', lat: 10.7560, lng: 106.6660, heading: 200, etaMinutes: 9,
    incidentId: 'inc-1039', lastUpdated: new Date().toISOString(),
    target: { lat: 10.7715, lng: 106.6985 },
  },
  {
    id: 'veh-6', plate: '51D-345.68', type: 'fire_truck', status: 'available', driver: 'Vũ Thị Giang',
    stationId: 'st-3', area: 'Quận 5', lat: 10.7546, lng: 106.6633, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-7', plate: '51A-456.78', type: 'police', status: 'on_scene', driver: 'Đặng Văn Hải',
    stationId: 'st-4', area: 'Quận 7', lat: 10.7290, lng: 106.7180, heading: 300, etaMinutes: null,
    incidentId: 'inc-1035', lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-8', plate: '51A-456.79', type: 'police', status: 'available', driver: 'Bùi Thị Kim',
    stationId: 'st-4', area: 'Quận 7', lat: 10.7325, lng: 106.7217, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-9', plate: '51D-567.89', type: 'rescue', status: 'en_route', driver: 'Ngô Văn Long',
    stationId: 'st-5', area: 'Bình Thạnh', lat: 10.8060, lng: 106.7050, heading: 150, etaMinutes: 4,
    incidentId: 'inc-1042', lastUpdated: new Date().toISOString(),
    target: { lat: 10.7725, lng: 106.6980 },
  },
  {
    id: 'veh-10', plate: '51B-567.90', type: 'ambulance', status: 'available', driver: 'Đinh Thị Mai',
    stationId: 'st-5', area: 'Bình Thạnh', lat: 10.8105, lng: 106.7091, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
];
