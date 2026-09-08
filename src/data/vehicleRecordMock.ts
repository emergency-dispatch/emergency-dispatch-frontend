import type { VehicleRecord } from '../types/vehicleRecord';
import type { VehicleType } from '../types/vehicle';

export const EQUIPMENT_TEMPLATE: Record<VehicleType, string[]> = {
  fire_truck: ['Vòi rồng chữa cháy', 'Bình khí nén SCBA', 'Rìu cứu hộ', 'Thang chữa cháy', 'Bộ đàm'],
  ambulance: ['Cáng cứu thương', 'Bình oxy y tế', 'Bộ sơ cứu', 'Máy khử rung tim AED', 'Nẹp cố định'],
  police: ['Loa cầm tay', 'Đèn tín hiệu', 'Bộ đàm', 'Dụng cụ phân luồng'],
  rescue: ['Máy cắt thủy lực', 'Dây cứu hộ', 'Đèn pha di động', 'Bộ đàm', 'Bình chữa cháy'],
};

const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

function buildChecklist(
  vehicleId: string,
  type: VehicleType,
  missingItems: string[] = []
): VehicleRecord['equipmentChecklist'] {
  return EQUIPMENT_TEMPLATE[type].map((name, i) => ({
    id: `${vehicleId}-eq-${i}`,
    name,
    equipped: !missingItems.includes(name),
  }));
}

export const vehicleRecordsSeed: VehicleRecord[] = [
  {
    id: 'veh-1', plate: '51D-123.45', type: 'fire_truck', stationId: 'st-1', status: 'maintenance',
    lastMaintenanceDate: daysFromNow(-190), nextMaintenanceDate: daysFromNow(-10),
    equipmentChecklist: buildChecklist('veh-1', 'fire_truck', ['Bình khí nén SCBA']),
  },
  {
    id: 'veh-2', plate: '51D-123.46', type: 'fire_truck', stationId: 'st-1', status: 'active',
    lastMaintenanceDate: daysFromNow(-60), nextMaintenanceDate: daysFromNow(120),
    equipmentChecklist: buildChecklist('veh-2', 'fire_truck'),
  },
  {
    id: 'veh-3', plate: '51B-234.56', type: 'ambulance', stationId: 'st-2', status: 'active',
    lastMaintenanceDate: daysFromNow(-170), nextMaintenanceDate: daysFromNow(10),
    equipmentChecklist: buildChecklist('veh-3', 'ambulance', ['Máy khử rung tim AED']),
  },
  {
    id: 'veh-4', plate: '51B-234.57', type: 'ambulance', stationId: 'st-2', status: 'active',
    lastMaintenanceDate: daysFromNow(-30), nextMaintenanceDate: daysFromNow(150),
    equipmentChecklist: buildChecklist('veh-4', 'ambulance'),
  },
  {
    id: 'veh-5', plate: '51D-345.67', type: 'rescue', stationId: 'st-3', status: 'maintenance',
    lastMaintenanceDate: daysFromNow(-200), nextMaintenanceDate: daysFromNow(-20),
    equipmentChecklist: buildChecklist('veh-5', 'rescue', ['Máy cắt thủy lực', 'Dây cứu hộ']),
  },
  {
    id: 'veh-6', plate: '51D-345.68', type: 'fire_truck', stationId: 'st-3', status: 'active',
    lastMaintenanceDate: daysFromNow(-90), nextMaintenanceDate: daysFromNow(90),
    equipmentChecklist: buildChecklist('veh-6', 'fire_truck'),
  },
  {
    id: 'veh-7', plate: '51A-456.78', type: 'police', stationId: 'st-4', status: 'active',
    lastMaintenanceDate: daysFromNow(-175), nextMaintenanceDate: daysFromNow(5),
    equipmentChecklist: buildChecklist('veh-7', 'police'),
  },
  {
    id: 'veh-8', plate: '51A-456.79', type: 'police', stationId: 'st-4', status: 'active',
    lastMaintenanceDate: daysFromNow(-20), nextMaintenanceDate: daysFromNow(160),
    equipmentChecklist: buildChecklist('veh-8', 'police', ['Đèn tín hiệu']),
  },
  {
    id: 'veh-9', plate: '51D-567.89', type: 'rescue', stationId: 'st-5', status: 'maintenance',
    lastMaintenanceDate: daysFromNow(-185), nextMaintenanceDate: daysFromNow(-5),
    equipmentChecklist: buildChecklist('veh-9', 'rescue'),
  },
  {
    id: 'veh-10', plate: '51B-567.90', type: 'ambulance', stationId: 'st-5', status: 'active',
    lastMaintenanceDate: daysFromNow(-150), nextMaintenanceDate: daysFromNow(30),
    equipmentChecklist: buildChecklist('veh-10', 'ambulance'),
  },
];
