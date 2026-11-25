import React, { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Building2, Clock, Compass, Crown, ExternalLink, LocateFixed, MapPin, TrafficCone, Users } from 'lucide-react';
import { MAP_CENTER, VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import { INCIDENT_CATEGORY_META, SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import { MAPBOX_ACCESS_TOKEN } from '../../../services/mapboxService';
import { useAssignmentTeam } from '../../../hooks/useStationTeams';
import { findVehicleAssignment } from '../completion/completionGroups';
import { useAuth } from '../../../hooks/useAuth';
import type { Station, Vehicle } from '../../../types/vehicle';
import type { Incident, TrafficJamReport } from '../../../types/incident';
import { MAP_VISIBLE_VEHICLE_STATUSES } from './mapIcons';
import {
  glowIncidentMarkerHtml,
  glowStationMarkerHtml,
  glowTrafficJamMarkerHtml,
  vehicle3dMarkerHtml,
} from './glowMarkers';
import { MapMarker } from './MapMarker';
import { TrafficJamPopup } from './TrafficJamPopup';
import { useDispatchStore, type ActionResult } from '../../../context/DispatchContext';
import type { RescueUnitResponseDto } from '../../../types/rescueUnit';
import { MapRouteLayer } from './MapRouteLayer';
import { MapServiceAreaLayer } from './MapServiceAreaLayer';
import type { ServiceAreaDto } from '../../../services/liveMapService';
import type { DispatchRoute } from '../../../hooks/useDispatchRoutes';
import { MapLegend } from './MapLegend';
import { MapPickLocation, type PickedPoint } from './MapPickLocation';
import { SourceChip } from '../incidents/SourceChip';
import { MapLayerToggle, applyTileMode, createBaseMapStyle, type MapTileMode } from './MapLayerToggle';
import { dateLocale, useTranslation } from '../../../i18n';
import { IncidentCode } from '../incidents/IncidentCode';
import { AiWorkingMarkers } from './AiWorkingMarkers';
import { gpsFarFromStationKm, isGpsSignalLost, readyAwayFromStationKm } from '../../../utils/vehicleLocation';
import { useNow } from '../../../hooks/useNow';
import { trackingHubService } from '../../../services/realtime/incidentHubService';

// Bán kính gom cụm (px trên màn hình) — các xe nằm gần nhau hơn mức này ở zoom hiện tại sẽ gộp lại.
const MAX_ZOOM = 18;
// Thứ tự lớp marker: sự cố luôn nằm trên xe, xe nằm trên trạm / điểm ùn tắc.
const STATION_Z_INDEX = 1;
const VEHICLE_Z_INDEX = 2;
const INCIDENT_Z_INDEX = 3;

const boundsOf = (points: Array<{ lat: number; lng: number }>) =>
  points.reduce((b, p) => b.extend([p.lng, p.lat]), new mapboxgl.LngLatBounds());

interface MapCameraControllerProps {
  map: mapboxgl.Map;
  /** Xe để nút định vị gom vào khung nhìn. */
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  selectedIncident: Incident | null;
  recenterTrigger: number;
}

/** Owns all camera movement: auto-fly on selection change, plus the manual "locate" button trigger. */
const MapCameraController: React.FC<MapCameraControllerProps> = ({
  map,
  vehicles,
  selectedVehicle,
  selectedIncident,
  recenterTrigger,
}) => {
  useEffect(() => {
    if (selectedVehicle) {
      map.flyTo({ center: [selectedVehicle.lng, selectedVehicle.lat], zoom: Math.max(map.getZoom(), 14), duration: 800 });
    }
    // Fly only when a *different* vehicle is selected, not on every live position tick.
  }, [selectedVehicle?.id]);

  useEffect(() => {
    if (selectedIncident) {
      map.flyTo({ center: [selectedIncident.lng, selectedIncident.lat], zoom: Math.max(map.getZoom(), 15), duration: 800 });
    }
  }, [selectedIncident?.id]);

  useEffect(() => {
    if (recenterTrigger === 0) return;
    if (selectedVehicle) {
      map.flyTo({ center: [selectedVehicle.lng, selectedVehicle.lat], zoom: Math.max(map.getZoom(), 15), duration: 800 });
    } else if (vehicles.length > 0) {
      map.fitBounds(boundsOf(vehicles), { padding: 60, maxZoom: 16, duration: 800 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterTrigger]);

  return null;
};

const PopupRow: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex items-start gap-1.5 text-xs text-slate-600">
    <Icon className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" />
    <span className="min-w-0">{children}</span>
  </div>
);

/** Popup xe (RescueUnit): biển số, loại xe, trạng thái, trạm, tổ phụ trách, nhiệm vụ đang chạy, lần cập nhật vị trí. */
const VehiclePopup: React.FC<{
  vehicle: Vehicle;
  incident?: Incident;
  trafficJam?: TrafficJamReport;
  signalLost?: boolean;
}> = ({ vehicle, incident, trafficJam, signalLost = false }) => {
  const { t } = useTranslation();
  const { unitTypeLabel, assignmentsByIncident, stations } = useDispatchStore();
  const station = stations.find((s) => s.id === vehicle.stationId);
  const awayKm = readyAwayFromStationKm(vehicle, station);
  const isFar = gpsFarFromStationKm(vehicle, station) !== null;
  // §34: đang làm nhiệm vụ → tổ chốt trên lượt điều xe (có thể là tổ trạm khác đi hỗ trợ); còn lại → tổ hiện tại của xe.
  const assignedTeam = useAssignmentTeam()(
    vehicle.id,
    incident ? findVehicleAssignment(assignmentsByIncident.get(incident.id), vehicle.id, vehicle.assignmentId) : null
  );
  const team = assignedTeam?.team ?? null;
  const statusMeta =
    vehicle.unitStatus === 'OutOfService'
      ? { label: t('enums.vehicleStatus.outOfService'), color: '#64748B' }
      : { label: t(`enums.vehicleStatus.${vehicle.status}`), color: VEHICLE_STATUS_META[vehicle.status].color };
  const typeMeta = VEHICLE_TYPE_META[vehicle.type];
  const TypeIcon = typeMeta.icon;
  const leader = team?.members.find((m) => m.crewRole === 'commander');

  return (
    <div className="min-w-[220px] space-y-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('liveMap.map.vehicle')}</p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-sm font-bold text-slate-900 font-mono-data">{vehicle.plate}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{ color: statusMeta.color, backgroundColor: `${statusMeta.color}1A` }}
          >
            {statusMeta.label}
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
          <TypeIcon className="w-3.5 h-3.5 shrink-0" />
          {unitTypeLabel(vehicle.unitType)} · {t(`enums.teamFunction.${vehicle.type}`)}
        </p>
      </div>

      <div className="space-y-1 pt-1.5 border-t border-slate-100">
        <PopupRow icon={Building2}>{vehicle.stationName}</PopupRow>
        <PopupRow icon={team && leader ? Crown : Users}>
          {assignedTeam ? (
            <>
              <span className="font-semibold text-slate-800">{assignedTeam.name}</span>
              {team && (
                <>
                  {' · '}
                  {leader?.fullName ? `${leader.fullName} · ` : ''}
                  {t('liveMap.map.teamMembers', { count: team.members.length })}
                </>
              )}
            </>
          ) : (
            <span className="text-amber-700">{t('liveMap.map.noTeam')}</span>
          )}
        </PopupRow>
        {incident && (
          <PopupRow icon={MapPin}>
            {t('liveMap.map.mission')}
            <span className="font-semibold text-slate-800">{incident.title}</span>
            {vehicle.etaMinutes !== null && (
              <span className="text-red-600 font-semibold">{t('liveMap.map.etaMinutes', { count: vehicle.etaMinutes })}</span>
            )}
          </PopupRow>
        )}
        {trafficJam && (
          <PopupRow icon={TrafficCone}>
            {t('liveMap.traffic.vehicleTask')}
            <span className="font-semibold text-slate-800">{trafficJam.area}</span>
          </PopupRow>
        )}
        {signalLost && (
          <PopupRow icon={MapPin}>
            <span className="font-semibold text-amber-700">{t('liveMap.map.signalLost')}</span>
          </PopupRow>
        )}
        {awayKm !== null && (
          <PopupRow icon={MapPin}>
            <span className={isFar ? 'font-semibold text-amber-700' : 'text-slate-800'}>
              {t(isFar ? 'liveMap.readyTeams.gpsFar' : 'liveMap.map.notAtStation', { km: awayKm.toFixed(1) })}
            </span>
          </PopupRow>
        )}
        <PopupRow icon={Clock}>
          {vehicle.incidentId && !vehicle.hasLiveGps
            ? t('liveMap.map.noGps')
            : t('liveMap.map.locationUpdated', {
                time: new Date(vehicle.lastUpdated).toLocaleString(dateLocale(), {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                }),
              })}
        </PopupRow>
      </div>
    </div>
  );
};

// Bãi xe của trạm (pixel): ngay dưới nhà trạm, mỗi xe một chỗ cố định, đầu xe hướng lên. Nhà 3D 48px neo tâm
// (chân nhà ≈ +16px); thân xe dài ≈ 40px, rộng ≈ 20px → hàng đầu cách tâm trạm 40px, xe cách nhau 28px, hàng cách 44px.
const LOT_PER_ROW = 4;
const LOT_SPACING_PX = 28;
const LOT_ROW_SPACING_PX = 44;
const LOT_TOP_PX = 40;
// Phóng xa hơn mức này thì bãi xe thu thành nhãn "5/6 xe" để không che bản đồ.
const LOT_MIN_ZOOM = 12;
const LOT_LABEL_OFFSET: [number, number] = [0, 32];
// Thứ tự trong bãi: chữa cháy (thang) → cứu hộ → cấp cứu.
const LOT_TYPE_ORDER: Vehicle['type'][] = ['fire_truck', 'rescue', 'ambulance'];
// Xe ở hiện trường xếp hàng: mỗi hàng tối đa SCENE_PER_ROW xe, cách nhau 28px, các hàng cách nhau 44px.
const SCENE_PER_ROW = 3;
const SCENE_SPACING_PX = 28;
const SCENE_ROW_SPACING_PX = 44;
// Xe tại hiện trường nấp một phần sau ghim sự cố (ghim 48px, z-index cao hơn xe): đầu xe lấn ~10px vào nửa dưới ghim
// → nhìn như xe đỗ ngay tại hiện trường ở mọi mức zoom (dời pixel cố định, zoom xa mà cách xa thì trông như chỗ khác).
// Chấm trạng thái ở góc xe vẫn lộ ra ngoài vòng ghim.
const SCENE_TOP_PX = 34;

interface VehicleMarkersProps {
  map: mapboxgl.Map;
  vehicles: Vehicle[];
  placements: Map<string, VehiclePlacement>;
  incidentsById?: Map<string, Incident>;
  /** Xe đang giải tỏa điểm ùn tắc (§20) → popup xe ghi nhiệm vụ giải tỏa. */
  trafficJamByUnit?: Map<string, TrafficJamReport>;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
}

/**
 * Xe đứng tại trạm, trừ xe đang làm nhiệm vụ đã có GPS thật và xe Sẵn sàng mà GPS lưu chưa ở trạm (vẽ đúng chỗ backend
 * dùng để tính gợi ý, không che việc xe chưa về). Dùng chung cho marker, camera và chỉ đường.
 */
const isParkedAtStation = (v: Vehicle, station: Station) =>
  !(v.incidentId && v.hasLiveGps) && readyAwayFromStationKm(v, station) === null;

/** Xe Sẵn sàng ở quá xa trạm: thêm dấu "!" góc trên-trái marker (chấm trạng thái ở góc phải). */
const withFarWarning = (html: string) => `
  <div class="relative">
    ${html}
    <span class="absolute flex items-center justify-center rounded-full pointer-events-none text-white font-bold" style="left:0;top:0;width:15px;height:15px;font-size:11px;line-height:1;background:${VEHICLE_STATUS_META.unavailable.color};border:2px solid #FFFFFF;box-sizing:border-box;">!</span>
  </div>`;

/**
 * Xe tại hiện trường: xếp hàng ngay dưới ghim sự cố (không theo GPS — GPS lúc này trùng ghim sự cố, xe sẽ đè lên ghim;
 * xe chưa gửi GPS cũng không bị vẽ ở trạm như thể chưa đi).
 */
const isAtScene = (v: Vehicle, incidentsById: Map<string, Incident>) =>
  v.status === 'on_scene' && !!v.incidentId && incidentsById.has(v.incidentId);

/** Hàng xe dưới ghim sự cố: dời theo pixel, tối đa SCENE_PER_ROW xe mỗi hàng, sắp theo biển số. */
function stackUnderPin(
  result: Map<string, VehiclePlacement>,
  group: Vehicle[],
  pin: { lat: number; lng: number },
  topPx: number
) {
  [...group]
    .sort((a, b) => a.plate.localeCompare(b.plate))
    .forEach((v, index) => {
      const row = Math.floor(index / SCENE_PER_ROW);
      const inRow = Math.min(SCENE_PER_ROW, group.length - row * SCENE_PER_ROW);
      const col = index % SCENE_PER_ROW;
      result.set(v.id, {
        lat: pin.lat,
        lng: pin.lng,
        offset: [(col - (inRow - 1) / 2) * SCENE_SPACING_PX, topPx + row * SCENE_ROW_SPACING_PX],
      });
    });
}

/**
 * Chỗ của từng xe trong bãi của trạm. Tính trên toàn bộ xe của trạm (kể cả xe đang đi, bảo trì) nên xe rời bãi thì chỗ
 * để trống, các xe khác không dồn lại.
 */
function lotOffsets(fleet: Vehicle[]): Map<string, [number, number]> {
  const byStation = new Map<string, Vehicle[]>();
  fleet.forEach((v) => byStation.set(v.stationId, [...(byStation.get(v.stationId) ?? []), v]));
  const offsets = new Map<string, [number, number]>();
  byStation.forEach((group) => {
    const columns = Math.min(LOT_PER_ROW, group.length);
    [...group]
      .sort(
        (a, b) =>
          LOT_TYPE_ORDER.indexOf(a.type) - LOT_TYPE_ORDER.indexOf(b.type) ||
          a.unitType.localeCompare(b.unitType) ||
          a.plate.localeCompare(b.plate)
      )
      .forEach((v, index) => {
        const col = index % LOT_PER_ROW;
        const row = Math.floor(index / LOT_PER_ROW);
        offsets.set(v.id, [(col - (columns - 1) / 2) * LOT_SPACING_PX, LOT_TOP_PX + row * LOT_ROW_SPACING_PX]);
      });
  });
  return offsets;
}

/** Xe mất tín hiệu GPS: marker nhấp nháy + nhãn dưới xe (nhãn không xoay theo hướng xe vì marker lúc này đứng thẳng). */
const withSignalLost = (html: string, label: string) => `
  <div class="relative">
    <div class="motion-safe:animate-pulse">${html}</div>
    <span class="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-px text-[10px] font-bold text-amber-300 pointer-events-none">${label}</span>
  </div>`;

/** Nhãn số xe Sẵn sàng thay cho bãi xe khi phóng xa. */
const lotLabelHtml = (label: string) =>
  `<span class="block whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm cursor-pointer">${label}</span>`;

/** Vị trí vẽ của một xe: tọa độ + (xe đậu / ở hiện trường) độ dời pixel dưới ghim trạm / sự cố. */
export interface VehiclePlacement {
  lat: number;
  lng: number;
  offset?: [number, number];
}

/**
 * Xe tại hiện trường xếp hàng dưới ghim sự cố; xe đậu đứng đúng chỗ trong bãi của trạm; xe đang chạy có GPS thật đứng tại
 * tọa độ GPS.
 */
function computeVehiclePlacements(
  vehicles: Vehicle[],
  /** Toàn bộ xe — để chỗ trong bãi không đổi theo xe nào đang được vẽ. */
  fleet: Vehicle[],
  stations: Station[],
  incidentsById: Map<string, Incident>
): Map<string, VehiclePlacement> {
  const stationsById = new Map(stations.map((s) => [s.id, s]));
  const lots = lotOffsets(fleet);
  const result = new Map<string, VehiclePlacement>();
  const atSceneByIncident = new Map<string, Vehicle[]>();
  vehicles.forEach((v) => {
    if (isAtScene(v, incidentsById)) {
      atSceneByIncident.set(v.incidentId!, [...(atSceneByIncident.get(v.incidentId!) ?? []), v]);
      return;
    }
    // Đang làm nhiệm vụ mà đã có GPS thật → hiện theo GPS; còn lại (kể cả xe vừa được giao, chưa gửi GPS) đứng tại trạm.
    const station = stationsById.get(v.stationId);
    if (!station || !isParkedAtStation(v, station)) return;
    result.set(v.id, { lat: station.lat, lng: station.lng, offset: lots.get(v.id) });
  });

  atSceneByIncident.forEach((group, incidentId) =>
    stackUnderPin(result, group, incidentsById.get(incidentId)!, SCENE_TOP_PX)
  );
  vehicles.forEach((v) => {
    if (!result.has(v.id)) result.set(v.id, { lat: v.lat, lng: v.lng });
  });
  return result;
}

/**
 * Mỗi xe một marker (không gom cụm), icon theo loại xe, màu theo trạng thái.
 * Xe đứng tại trạm của nó, trừ xe đang làm nhiệm vụ đã có GPS thật và xe Sẵn sàng chưa ở trạm (hiện theo vị trí GPS).
 */
const VehicleMarkers: React.FC<VehicleMarkersProps> = ({
  map,
  vehicles,
  placements,
  incidentsById,
  trafficJamByUnit,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  const { stations } = useDispatchStore();
  const { t } = useTranslation();
  const now = useNow(10_000);
  // Hub vị trí rớt thì im lặng là do máy Operator, không phải do xe → không kết luận.
  const hubConnected = trackingHubService.isConnected();
  return (
    <>
      {vehicles.map((vehicle) => {
        const signalLost = hubConnected && isGpsSignalLost(vehicle, now);
        const isFar = gpsFarFromStationKm(vehicle, stations.find((s) => s.id === vehicle.stationId)) !== null;
        const isSelected = vehicle.id === selectedVehicleId;
        const markerHtml = vehicle3dMarkerHtml(vehicle.type, vehicle.status, isSelected);
        const place = placements.get(vehicle.id)!;
        // Xe theo GPS thật (không bị dời xếp hàng) → xoay theo hướng chạy, nằm phẳng trên mặt đường khi nghiêng 3D.
        // Xe trong bãi / Sẵn sàng ngoài trạm / ở hiện trường → đứng thẳng, đầu xe hướng lên cho hàng xe gọn.
        const followsGps = !place.offset && vehicle.status !== 'available' && !signalLost;
        return (
          <MapMarker
            key={vehicle.id}
            map={map}
            lat={place.lat}
            lng={place.lng}
            offset={place.offset}
            rotation={followsGps ? vehicle.heading : 0}
            rotationAlignment={followsGps ? 'map' : 'viewport'}
            html={signalLost ? withSignalLost(markerHtml, t('liveMap.map.signalLost')) : isFar ? withFarWarning(markerHtml) : markerHtml}
            zIndex={isSelected ? VEHICLE_Z_INDEX + 1 : VEHICLE_Z_INDEX}
            popupOffset={isSelected ? 28 : 24}
            onClick={() => onSelectVehicle(vehicle.id)}
          >
            <VehiclePopup
              vehicle={vehicle}
              incident={vehicle.incidentId ? incidentsById?.get(vehicle.incidentId) : undefined}
              trafficJam={trafficJamByUnit?.get(vehicle.id)}
              signalLost={signalLost}
            />
          </MapMarker>
        );
      })}
    </>
  );
};

interface LiveMapViewProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  dispatchIncidents?: Incident[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
  stations?: Station[];
  trafficJams?: TrafficJamReport[];
  onResolveTrafficJam?: (id: string, note?: string) => Promise<ActionResult>;
  /** §20: giao / rút xe giải tỏa điểm ùn tắc. */
  onAssignTrafficJam?: (id: string, rescueUnitId: string, notes?: string) => Promise<ActionResult>;
  onUnassignTrafficJam?: (id: string, reason: string) => Promise<ActionResult>;
  /** Xe Sẵn sàng của trạm mình để giao giải tỏa (gồm PolicePatrol). */
  trafficAssignableUnits?: RescueUnitResponseDto[];
  /** Bay tới + mở popup điểm ùn tắc (bấm cảnh báo leo thang §24); `key` đổi mỗi lần yêu cầu. */
  focusTrafficJam?: { id: string; key: number } | null;
  /** §31.E: bay tới + mở popup tin báo AI đang xử lý ("Xem trên bản đồ" ở dải AI); `key` đổi mỗi lần yêu cầu. */
  focusAiIncident?: { id: string; key: number } | null;
  /** Lộ trình xe đang tới hiện trường. */
  routes?: DispatchRoute[];
  vehiclesById?: Map<string, Vehicle>;
  incidentsById?: Map<string, Incident>;
  /** Khu vực phục vụ (vẽ vòng tròn khi Admin bật). */
  serviceArea?: ServiceAreaDto | null;
  /** Đang tạo sự cố: click bản đồ để đặt ghim hiện trường. */
  pickLocation?: { position: PickedPoint | null; onPick: (point: PickedPoint) => void; flyKey: number } | null;
  /** Sự cố nghi trùng quanh ghim — chưa có trên bản đồ (VD đang chờ duyệt) thì vẽ thêm. */
  nearbyIncidents?: Incident[];
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  dispatchIncidents = [],
  selectedIncidentId = null,
  onSelectIncident,
  stations = [],
  trafficJams = [],
  onResolveTrafficJam,
  onAssignTrafficJam,
  onUnassignTrafficJam,
  trafficAssignableUnits = [],
  focusTrafficJam = null,
  focusAiIncident = null,
  routes = [],
  serviceArea = null,
  vehiclesById,
  incidentsById,
  pickLocation = null,
  nearbyIncidents = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { incidentKindLabel, incidents: allIncidents } = useDispatchStore();
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  // Mặc định Đường phố: nền sáng, nhãn đường rõ, marker 3D (trạm / xe) và Quầng sáng nổi hơn; ảnh vệ tinh cũng nặng hơn.
  const [tileMode, setTileMode] = useState<MapTileMode>('light');
  const appliedTileModeRef = useRef(tileMode);
  const [recenterCount, setRecenterCount] = useState(0);
  const [is3DMode, setIs3DMode] = useState(true);

  // Góc nghiêng 2D / 3D như bản đồ Staff (45°); các lần bay camera sau đó giữ nguyên góc đang chọn.
  const handleToggle3D = () => {
    if (!map) return;
    const next = !is3DMode;
    setIs3DMode(next);
    map.easeTo({ pitch: next ? 45 : 0, duration: 600 });
  };

  // Tọa độ xe đúng như đang hiển thị: xe đậu lấy tọa độ trạm (tọa độ trong DB có thể là vị trí cũ / trạm cũ).
  // Camera, nút định vị và chỉ đường Google Maps đều dùng tọa độ này.
  // Ghim sự cố đang vẽ — xe tại hiện trường xếp dưới ghim của sự cố mình (sự cố không có ghim → xe theo luật cũ).
  const pinnedIncidentsById = useMemo(() => new Map(dispatchIncidents.map((i) => [i.id, i])), [dispatchIncidents]);
  const mapVehicles = useMemo(() => {
    const stationsById = new Map(stations.map((s) => [s.id, s]));
    return vehicles.map((v) => {
      if (isAtScene(v, pinnedIncidentsById)) {
        const incident = pinnedIncidentsById.get(v.incidentId!)!;
        return { ...v, lat: incident.lat, lng: incident.lng };
      }
      const station = stationsById.get(v.stationId);
      return station && isParkedAtStation(v, station) ? { ...v, lat: station.lat, lng: station.lng } : v;
    });
  }, [vehicles, stations, pinnedIncidentsById]);
  const myStationId = user?.stationId ?? null;
  const ownIncidentIds = useMemo(() => new Set(allIncidents.map((i) => i.id)), [allIncidents]);
  // Vẽ xe đang làm nhiệm vụ (đã nhận / đang đi / tại hiện trường); hình xe theo loại (vehicle3dMarkerHtml, xoay theo heading).
  const movingVehicles = useMemo(
    () =>
      mapVehicles.filter(
        (v) =>
          MAP_VISIBLE_VEHICLE_STATUSES.includes(v.status) &&
          // "Tại hiện trường" mà không còn lượt điều xe = trạng thái xe kẹt ở backend (VD lượt cập nhật GPS ghi đè
          // CoolDown sau nghiệm thu) → không vẽ, tránh hiện xe "ở hiện trường" đứng tại trạm.
          (v.status !== 'on_scene' || !!v.incidentId) &&
          // Backend trả / phát xe của mọi trạm cho Operator → chỉ vẽ xe trạm mình và xe trạm khác đang hỗ trợ ca của
          // trạm mình (store chỉ có sự cố của trạm mình).
          (v.stationId === myStationId || (!!v.incidentId && ownIncidentIds.has(v.incidentId)))
      ),
    [mapVehicles, myStationId, ownIncidentIds]
  );
  // Xe Sẵn sàng của trạm mình: đậu trong bãi dưới nhà trạm để thấy trạm còn xe gì.
  const readyVehicles = useMemo(
    () => mapVehicles.filter((v) => v.status === 'available' && !!myStationId && v.stationId === myStationId),
    [mapVehicles, myStationId]
  );
  // Phóng xa: ẩn các xe trong bãi (xe Sẵn sàng ngoài trạm vẫn vẽ), thay bằng nhãn dưới nhà trạm.
  const [lotCollapsed, setLotCollapsed] = useState(false);
  useEffect(() => {
    if (!map) return;
    const update = () => setLotCollapsed(map.getZoom() < LOT_MIN_ZOOM);
    update();
    map.on('zoom', update);
    return () => {
      map.off('zoom', update);
    };
  }, [map]);
  const myStation = stations.find((s) => s.id === myStationId) ?? null;
  const myFleetSize = vehicles.filter((v) => v.stationId === myStationId).length;
  const drawnVehicles = useMemo(
    () => [
      ...movingVehicles,
      ...readyVehicles.filter((v) => !lotCollapsed || (myStation && !isParkedAtStation(v, myStation))),
    ],
    [movingVehicles, readyVehicles, lotCollapsed, myStation]
  );
  // Nút định vị ưu tiên xe đang làm nhiệm vụ; không có thì về các xe đang ở trạm (bỏ xe lệch GPS để không thu nhỏ bản đồ).
  const cameraVehicles = useMemo(() => {
    if (movingVehicles.length > 0) return movingVehicles;
    const stationsById = new Map(stations.map((s) => [s.id, s]));
    return readyVehicles.filter((v) => gpsFarFromStationKm(v, stationsById.get(v.stationId)) === null);
  }, [movingVehicles, readyVehicles, stations]);
  const selectedVehicle = drawnVehicles.find((v) => v.id === selectedVehicleId) ?? null;
  // Xe không vẽ thì không có vị trí marker → đường đi (VD xe chờ đội xác nhận) bắt đầu từ điểm đầu của tuyến (trạm).
  const placements = useMemo(
    () => computeVehiclePlacements(drawnVehicles, vehicles, stations, pinnedIncidentsById),
    [drawnVehicles, vehicles, stations, pinnedIncidentsById]
  );
  const selectedIncident = dispatchIncidents.find((i) => i.id === selectedIncidentId) ?? null;
  const nearbyIds = useMemo(() => new Set(nearbyIncidents.map((i) => i.id)), [nearbyIncidents]);
  const trafficJamByUnit = useMemo(
    () => new Map(trafficJams.filter((j) => j.assignedUnitId).map((j) => [j.assignedUnitId!, j])),
    [trafficJams]
  );
  const nearbyOffMap = useMemo(() => {
    const onMap = new Set(dispatchIncidents.map((i) => i.id));
    return nearbyIncidents.filter((i) => !onMap.has(i.id));
  }, [nearbyIncidents, dispatchIncidents]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const instance = new mapboxgl.Map({
      container,
      style: createBaseMapStyle(appliedTileModeRef.current),
      center: [MAP_CENTER[1], MAP_CENTER[0]],
      zoom: 14,
      // Mở ở góc nhìn 3D (khớp is3DMode mặc định).
      pitch: 45,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
    });
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    instance.on('error', (e) => console.warn('Live map notice:', e?.error?.message || e));

    // Panel bên phải / Bottom Sheet đổi kích thước → canvas WebGL phải resize theo.
    const resizeObserver = new ResizeObserver(() => instance.resize());
    resizeObserver.observe(container);

    setMap(instance);
    return () => {
      resizeObserver.disconnect();
      instance.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map || appliedTileModeRef.current === tileMode) return;
    appliedTileModeRef.current = tileMode;
    if (map.isStyleLoaded()) applyTileMode(map, tileMode);
    else map.once('style.load', () => applyTileMode(map, appliedTileModeRef.current));
  }, [map, tileMode]);

  // Cảnh báo điểm ùn tắc leo thang → bay tới điểm đó (popup mở qua popupOpenKey của marker).
  const focusJam = focusTrafficJam ? trafficJams.find((j) => j.id === focusTrafficJam.id) : undefined;
  useEffect(() => {
    if (!map || !focusJam) return;
    map.flyTo({ center: [focusJam.lng, focusJam.lat], zoom: Math.max(map.getZoom(), 16), duration: 800 });
    // Chỉ bay khi có yêu cầu mới, không bay lại mỗi lần dữ liệu điểm ùn tắc đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focusTrafficJam?.key, !!focusJam]);

  // Dải AI → "Xem trên bản đồ": bay tới tin báo (popup mở qua popupOpenKey). Ca vừa rời tay AI thì không còn marker.
  const focusAi = focusAiIncident ? allIncidents.find((i) => i.id === focusAiIncident.id) : undefined;
  useEffect(() => {
    if (!map || !focusAi) return;
    map.flyTo({ center: [focusAi.lng, focusAi.lat], zoom: Math.max(map.getZoom(), 16), duration: 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focusAiIncident?.key, !!focusAi]);

  const handleOpenDirections = () => {
    if (!selectedVehicle) return;
    const targetIncident = selectedVehicle.incidentId ? incidentsById?.get(selectedVehicle.incidentId) : null;
    const url = targetIncident
      ? `https://www.google.com/maps/dir/?api=1&origin=${selectedVehicle.lat},${selectedVehicle.lng}&destination=${targetIncident.lat},${targetIncident.lng}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${selectedVehicle.lat},${selectedVehicle.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="cad-map h-full w-full" />

      {map && (
        <>
          <MapCameraController
            map={map}
            vehicles={cameraVehicles}
            selectedVehicle={selectedVehicle}
            selectedIncident={selectedIncident}
            recenterTrigger={recenterCount}
          />

          {/* Không vẽ vòng bán kính trạm: backend giao trạm theo quãng đường bộ (OSRM), bán kính không còn tác dụng. */}
          <MapServiceAreaLayer map={map} area={serviceArea} />
          <MapRouteLayer map={map} routes={routes} placements={placements} selectedVehicleId={selectedVehicleId} />

          {stations.map((station) => {
            const isMine = station.id === user?.stationId;
            const stationVehicles = vehicles.filter((v) => v.stationId === station.id);
            return (
              <MapMarker
                key={station.id}
                map={map}
                lat={station.lat}
                lng={station.lng}
                html={glowStationMarkerHtml(isMine)}
                zIndex={STATION_Z_INDEX}
                popupOffset={24}
              >
                <div className="min-w-[200px] space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {isMine ? t('liveMap.map.myStation') : t('liveMap.map.station')}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{station.name}</p>
                  <p className="text-[11px] text-slate-500">{station.address}</p>
                  <p className="text-[11px] text-slate-600 pt-1">
                    {t('liveMap.map.availableVehicles', {
                      available: stationVehicles.filter((v) => v.status === 'available').length,
                      total: stationVehicles.length,
                    })}
                  </p>
                </div>
              </MapMarker>
            );
          })}

          {lotCollapsed && myStation && myFleetSize > 0 && (
            <MapMarker
              map={map}
              lat={myStation.lat}
              lng={myStation.lng}
              offset={LOT_LABEL_OFFSET}
              html={lotLabelHtml(t('liveMap.map.lotLabel', { available: readyVehicles.length, total: myFleetSize }))}
              zIndex={VEHICLE_Z_INDEX}
              onClick={() => map.flyTo({ center: [myStation.lng, myStation.lat], zoom: 14, duration: 800 })}
            />
          )}

          {trafficJams.map((jam) => (
            <MapMarker
              key={jam.id}
              map={map}
              lat={jam.lat}
              lng={jam.lng}
              html={glowTrafficJamMarkerHtml(jam.status, !!jam.escalatedAt)}
              popupOffset={20}
              popupOpenKey={focusTrafficJam?.id === jam.id ? focusTrafficJam.key : undefined}
            >
              <TrafficJamPopup
                jam={jam}
                myStationId={user?.stationId ?? null}
                assignableUnits={trafficAssignableUnits}
                onAssign={onAssignTrafficJam}
                onUnassign={onUnassignTrafficJam}
                onResolve={onResolveTrafficJam}
              />
            </MapMarker>
          ))}

          <VehicleMarkers
            map={map}
            vehicles={drawnVehicles}
            placements={placements}
            incidentsById={incidentsById}
            trafficJamByUnit={trafficJamByUnit}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={onSelectVehicle}
          />

          {dispatchIncidents.map((incident) => {
            const severityMeta = SEVERITY_LEVEL_META[incident.severity];
            const category = INCIDENT_CATEGORY_META[incident.category];
            const isSelected = incident.id === selectedIncidentId || nearbyIds.has(incident.id);
            const assigned = incident.assignedVehicleIds
              .map((id) => vehiclesById?.get(id))
              .filter((v): v is Vehicle => !!v);

            return (
              <MapMarker
                key={incident.id}
                map={map}
                lat={incident.lat}
                lng={incident.lng}
                html={glowIncidentMarkerHtml(incident.category, incident.severity, isSelected)}
                zIndex={INCIDENT_Z_INDEX}
                popupOffset={isSelected ? 28 : 25}
                onClick={() => onSelectIncident?.(incident.id)}
              >
                <div className="min-w-[200px] space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: category.color }}>
                      {incidentKindLabel(incident)}
                    </span>
                    <SourceChip source={incident.source} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">{incident.title}</p>
                  <IncidentCode code={incident.code} className="block text-[11px] font-semibold text-slate-500" />
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityMeta.badgeClass}`}
                  >
                    {t(`enums.severity.level${incident.severity}`)}
                  </span>
                  <p className="text-xs text-slate-600">{incident.area}</p>
                  {assigned.length > 0 ? (
                    assigned.map((v) => (
                      <p key={v.id} className="text-xs text-red-600 font-semibold">
                        {t('liveMap.map.vehicleEta', { plate: v.plate, eta: v.etaMinutes ?? '--' })}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-amber-600 font-semibold">{t('liveMap.map.noVehicle')}</p>
                  )}
                </div>
              </MapMarker>
            );
          })}

          <AiWorkingMarkers map={map} focus={focusAiIncident} />

          {nearbyOffMap.map((incident) => (
            <MapMarker
              key={`nearby-${incident.id}`}
              map={map}
              lat={incident.lat}
              lng={incident.lng}
              html={glowIncidentMarkerHtml(incident.category, incident.severity, true)}
              zIndex={INCIDENT_Z_INDEX}
              popupOffset={28}
            >
              <div className="min-w-[200px] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  {t('liveMap.create.pendingIncident')}
                </span>
                <p className="text-sm font-bold text-slate-900">{incident.title}</p>
                <p className="text-xs text-slate-600">{incident.area}</p>
              </div>
            </MapMarker>
          ))}

          {pickLocation && (
            <MapPickLocation
              map={map}
              position={pickLocation.position}
              onPick={pickLocation.onPick}
              flyKey={pickLocation.flyKey}
            />
          )}
        </>
      )}

      {pickLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none max-w-[calc(100%-8rem)]">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 text-white text-xs font-semibold shadow-lg">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">{t('liveMap.create.pickHint')}</span>
          </div>
        </div>
      )}

      <MapLegend />

      <div className="absolute top-4 left-4 z-[1000]">
        <MapLayerToggle mode={tileMode} onChange={setTileMode} />
      </div>

      {/* Camera / layer / external navigation controls — mirrors the Staff field map's control set. */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setRecenterCount((v) => v + 1)}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-red-600 shadow-md transition-all active:scale-95"
          title={selectedVehicle ? t('liveMap.map.recenterSelected') : t('liveMap.map.recenterAll')}
          aria-label={t('liveMap.map.recenter')}
        >
          <LocateFixed className="w-5 h-5" />
        </button>

        <button
          onClick={handleToggle3D}
          aria-pressed={is3DMode}
          className={`p-2.5 rounded-xl border shadow-md transition-all active:scale-95 ${
            is3DMode
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
          title={is3DMode ? t('liveMap.layers.view2d') : t('liveMap.layers.view3d')}
          aria-label={is3DMode ? t('liveMap.layers.view2d') : t('liveMap.layers.view3d')}
        >
          <Compass className={`w-5 h-5 transition-transform ${is3DMode ? 'rotate-45' : ''}`} />
        </button>

        <button
          onClick={handleOpenDirections}
          disabled={!selectedVehicle}
          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 border border-red-600 disabled:border-slate-200 text-white shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100"
          title={selectedVehicle ? t('liveMap.map.directions') : t('liveMap.map.directionsNeedVehicle')}
          aria-label={t('liveMap.map.directions')}
        >
          <ExternalLink className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
