import { Building2, CarFront, Droplet, Flame, HeartPulse, ShieldAlert, WavesHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { HazardTagKey, Incident, IncidentSeverity } from '../types/incident';

export const HAZARD_TAG_META: Record<HazardTagKey, { label: string; color: string; icon: LucideIcon }> = {
  fire: { label: '#Fire', color: '#DC2626', icon: Flame },
  oil_spill: { label: '#Oil_Spill', color: '#EAB308', icon: Droplet },
  vehicle_rollover: { label: '#Vehicle_Rollover', color: '#F97316', icon: CarFront },
  injury: { label: '#Injury', color: '#EC4899', icon: HeartPulse },
  structural_collapse: { label: '#Structural_Collapse', color: '#64748B', icon: Building2 },
  flooding: { label: '#Flooding', color: '#06B6D4', icon: WavesHorizontal },
  security_threat: { label: '#Security_Threat', color: '#8B5CF6', icon: ShieldAlert },
};

export const SEVERITY_META: Record<IncidentSeverity, { label: string; badgeClass: string }> = {
  1: { label: 'Cấp 1 · Thấp', badgeClass: 'bg-severity-1-bg text-severity-1-text border-severity-1-border' },
  2: { label: 'Cấp 2 · Trung bình', badgeClass: 'bg-severity-2-bg text-severity-2-text border-severity-2-border' },
  3: { label: 'Cấp 3 · Cao', badgeClass: 'bg-severity-3-bg text-severity-3-text border-severity-3-border' },
  4: { label: 'Cấp 4 · Nghiêm trọng', badgeClass: 'bg-severity-4-bg text-severity-4-text border-severity-4-border' },
  5: { label: 'Cấp 5 · Nguy kịch', badgeClass: 'bg-severity-5-bg text-severity-5-text border-severity-5-border' },
};

// Raw hex per severity, for contexts that need an inline style value rather
// than a Tailwind class (e.g. Leaflet divIcon HTML strings).
export const SEVERITY_COLOR: Record<IncidentSeverity, string> = {
  1: '#10B981',
  2: '#F59E0B',
  3: '#F97316',
  4: '#DC2626',
  5: '#8B5CF6',
};

const HAZARD_KEYS = Object.keys(HAZARD_TAG_META) as HazardTagKey[];

const INCIDENT_TITLES: Record<HazardTagKey, string> = {
  fire: 'Cháy nhà dân / kho hàng',
  oil_spill: 'Tràn dầu / hóa chất',
  vehicle_rollover: 'Tai nạn giao thông lật xe',
  injury: 'Người bị thương cần cấp cứu',
  structural_collapse: 'Sập / đổ công trình',
  flooding: 'Ngập úng nghiêm trọng',
  security_threat: 'Nghi vấn an ninh',
};

const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  'Quận 1': { lat: 10.7769, lng: 106.7009 },
  'Quận 3': { lat: 10.7843, lng: 106.6907 },
  'Quận 5': { lat: 10.7546, lng: 106.6633 },
  'Quận 7': { lat: 10.7325, lng: 106.7217 },
  'Bình Thạnh': { lat: 10.8105, lng: 106.7091 },
  'Quận 10': { lat: 10.7679, lng: 106.6667 },
  'Gò Vấp': { lat: 10.8386, lng: 106.6652 },
};

const AREAS = Object.keys(AREA_COORDS);

const REPORTER_NAMES = [
  'Nguyễn Văn Phúc', 'Trần Thị Hạnh', 'Lê Hoàng Nam', 'Phạm Thu Trang',
  'Đỗ Minh Quân', 'Vũ Thị Lan', 'Bùi Anh Tuấn', 'Ngô Thị Yến',
];

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();

function coordsForArea(area: string): { lat: number; lng: number } {
  const base = AREA_COORDS[area] ?? AREA_COORDS['Quận 1'];
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.012,
    lng: base.lng + (Math.random() - 0.5) * 0.012,
  };
}

export const incidentSeeds: Incident[] = [
  {
    id: 'inc-1042', title: INCIDENT_TITLES.fire,
    description: 'AI phát hiện khói dày và lửa tại tầng trệt kho hàng, khuyến nghị điều xe cứu hỏa chuyên dụng.',
    hazardTags: ['fire', 'structural_collapse'], severity: 5, plausibilityScore: 92, status: 'pending',
    area: 'Quận 1', ...coordsForArea('Quận 1'), reporterName: 'Nguyễn Văn Phúc', reporterPhone: '0912345678',
    createdAt: minutesAgo(8), mediaType: 'video', mediaUrl: null, assignedVehicleId: null,
  },
  {
    id: 'inc-1039', title: INCIDENT_TITLES.vehicle_rollover,
    description: 'Va chạm nhiều xe trên tuyến đường chính, nghi có người mắc kẹt trong xe lật.',
    hazardTags: ['vehicle_rollover', 'injury'], severity: 4, plausibilityScore: 88, status: 'pending',
    area: 'Quận 3', ...coordsForArea('Quận 3'), reporterName: 'Trần Thị Hạnh', reporterPhone: '0987654321',
    createdAt: minutesAgo(6), mediaType: 'image', mediaUrl: '/assets/mock_traffic_accident.jpg', assignedVehicleId: null,
  },
  {
    id: 'inc-1037', title: INCIDENT_TITLES.oil_spill,
    description: 'Xe bồn rò rỉ hóa chất ra mặt đường, có mùi hắc, khu vực dân cư đông đúc.',
    hazardTags: ['oil_spill'], severity: 4, plausibilityScore: 76, status: 'pending',
    area: 'Quận 7', ...coordsForArea('Quận 7'), reporterName: 'Lê Hoàng Nam', reporterPhone: '0909112233',
    createdAt: minutesAgo(15), mediaType: 'image', mediaUrl: null, assignedVehicleId: null,
  },
  {
    id: 'inc-1035', title: INCIDENT_TITLES.injury,
    description: 'Người đi đường ngã xe máy, có vết thương hở, còn tỉnh táo.',
    hazardTags: ['injury'], severity: 2, plausibilityScore: 81, status: 'pending',
    area: 'Quận 5', ...coordsForArea('Quận 5'), reporterName: 'Phạm Thu Trang', reporterPhone: '0933221144',
    createdAt: minutesAgo(20), mediaType: 'image', mediaUrl: null, assignedVehicleId: null,
  },
  {
    id: 'inc-1031', title: INCIDENT_TITLES.flooding,
    description: 'Nước dâng nhanh sau mưa lớn, một số phương tiện chết máy giữa đường.',
    hazardTags: ['flooding'], severity: 3, plausibilityScore: 69, status: 'pending',
    area: 'Bình Thạnh', ...coordsForArea('Bình Thạnh'), reporterName: 'Đỗ Minh Quân', reporterPhone: '0977889900',
    createdAt: minutesAgo(25), mediaType: 'video', mediaUrl: null, assignedVehicleId: null,
  },
  {
    id: 'inc-1028', title: INCIDENT_TITLES.security_threat,
    description: 'Người dân báo nghi vấn vật thể lạ để lại gần khu trung tâm thương mại.',
    hazardTags: ['security_threat'], severity: 3, plausibilityScore: 44, status: 'pending',
    area: 'Quận 1', ...coordsForArea('Quận 1'), reporterName: 'Vũ Thị Lan', reporterPhone: '0966554433',
    createdAt: minutesAgo(31), mediaType: 'image', mediaUrl: null, assignedVehicleId: null,
  },
  {
    id: 'inc-1024', title: INCIDENT_TITLES.structural_collapse,
    description: 'Ban công một căn nhà cũ có dấu hiệu nứt và nghiêng bất thường.',
    hazardTags: ['structural_collapse'], severity: 2, plausibilityScore: 58, status: 'pending',
    area: 'Quận 10', ...coordsForArea('Quận 10'), reporterName: 'Bùi Anh Tuấn', reporterPhone: '0944556677',
    createdAt: minutesAgo(40), mediaType: 'image', mediaUrl: null, assignedVehicleId: null,
  },
  {
    id: 'inc-1019', title: INCIDENT_TITLES.fire,
    description: 'Khói nhẹ phát ra từ tủ điện tầng 2 chung cư, cư dân đã sơ tán một phần.',
    hazardTags: ['fire'], severity: 1, plausibilityScore: 63, status: 'pending',
    area: 'Gò Vấp', ...coordsForArea('Gò Vấp'), reporterName: 'Ngô Thị Yến', reporterPhone: '0922113344',
    createdAt: minutesAgo(48), mediaType: 'image', mediaUrl: null, assignedVehicleId: null,
  },
];

let incidentCounter = 1042;

export function createRandomIncident(): Incident {
  incidentCounter += 1;
  const primaryTag = HAZARD_KEYS[Math.floor(Math.random() * HAZARD_KEYS.length)];
  const extraTag = Math.random() > 0.55 ? HAZARD_KEYS[Math.floor(Math.random() * HAZARD_KEYS.length)] : null;
  const hazardTags = extraTag && extraTag !== primaryTag ? [primaryTag, extraTag] : [primaryTag];
  const severity = (Math.floor(Math.random() * 5) + 1) as IncidentSeverity;
  const plausibilityScore = Math.floor(35 + Math.random() * 65);
  const area = AREAS[Math.floor(Math.random() * AREAS.length)];

  return {
    id: `inc-${incidentCounter}`,
    title: INCIDENT_TITLES[primaryTag],
    description: `Báo cáo mới từ Mobile App. AI đã bóc tách ${hazardTags.length} nhãn nguy cơ và chấm điểm mức độ khẩn cấp.`,
    hazardTags,
    severity,
    plausibilityScore,
    status: 'pending',
    area,
    ...coordsForArea(area),
    reporterName: REPORTER_NAMES[Math.floor(Math.random() * REPORTER_NAMES.length)],
    reporterPhone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
    createdAt: new Date().toISOString(),
    mediaType: Math.random() > 0.6 ? 'video' : 'image',
    mediaUrl: primaryTag === 'vehicle_rollover' ? '/assets/mock_traffic_accident.jpg' : null,
    assignedVehicleId: null,
  };
}
