import type { TurnByTurnStep } from '../types/staff';

export interface RouteResult {
  polyline: [number, number][]; // [lat, lng] pairs for Leaflet/staff Mission state
  steps: TurnByTurnStep[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

// In-memory cache key helper
const getCacheKey = (from: [number, number], to: [number, number]) =>
  `${from[0].toFixed(5)},${from[1].toFixed(5)}->${to[0].toFixed(5)},${to[1].toFixed(5)}`;

const routeCache = new Map<string, RouteResult>();

const mapManeuver = (
  type?: string,
  modifier?: string
): TurnByTurnStep['maneuver'] => {
  if (type === 'arrive') return 'arrive';
  if (modifier === 'uturn') return 'u_turn';
  if (modifier === 'sharp right' || modifier === 'right') return 'turn_right';
  if (modifier === 'sharp left' || modifier === 'left') return 'turn_left';
  if (modifier === 'slight right') return 'slight_right';
  if (modifier === 'slight left') return 'slight_left';
  if (type === 'roundabout' || type === 'rotary') return 'roundabout';
  return 'straight';
};

const buildInstruction = (
  step: any,
  idx: number,
  isLast: boolean,
  roadName: string
): string => {
  if (idx === 0) {
    return `Xuất phát từ vị trí kíp trực, di chuyển vào ${roadName}`;
  }
  if (isLast || step.maneuver?.type === 'arrive') {
    return `Đã tiếp cận mục tiêu hiện trường sự cố (${roadName})`;
  }

  const mod = step.maneuver?.modifier;
  if (mod === 'right' || mod === 'sharp right') {
    return `Rẽ phải vào ${roadName}`;
  }
  if (mod === 'left' || mod === 'sharp left') {
    return `Rẽ trái vào ${roadName}`;
  }
  if (mod === 'slight right') {
    return `Chếch sang phải vào ${roadName}`;
  }
  if (mod === 'slight left') {
    return `Chếch sang trái vào ${roadName}`;
  }
  if (mod === 'uturn') {
    return `Quay đầu xe trên ${roadName}`;
  }
  if (step.maneuver?.type === 'roundabout') {
    return `Vào vòng xuyến, đi theo lối ra vào ${roadName}`;
  }
  return `Tiếp tục đi thẳng trên ${roadName}`;
};

export const routingService = {
  /**
   * Tính toán tuyến đường lái xe theo mạng lưới đường bộ thực tế (OSRM Driving Engine)
   * @param origin [lat, lng] của xe hoặc trạm
   * @param destination [lat, lng] của điểm sự cố
   */
  async calculateDrivingRoute(
    origin: [number, number],
    destination: [number, number]
  ): Promise<RouteResult> {
    const [fromLat, fromLng] = origin;
    const [toLat, toLng] = destination;

    // Kiểm tra cache
    const cacheKey = getCacheKey(origin, destination);
    if (routeCache.has(cacheKey)) {
      return routeCache.get(cacheKey)!;
    }

    try {
      // OSRM nhận kinh độ trước, vĩ độ sau: {lng},{lat};{lng},{lat}
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'ResQ-EmergencyDispatchWeb/1.0' },
      });

      if (!response.ok) {
        throw new Error(`OSRM HTTP status: ${response.status}`);
      }

      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const primaryRoute = data.routes[0];
        const rawCoords: [number, number][] = primaryRoute.geometry.coordinates; // [lng, lat]
        const polyline: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

        const rawSteps = primaryRoute.legs?.[0]?.steps || [];
        const steps: TurnByTurnStep[] = rawSteps.map((s: any, idx: number) => {
          const isLast = idx === rawSteps.length - 1;
          const roadName =
            s.name && s.name.trim().length > 0
              ? s.name.trim()
              : isLast
              ? 'Khu vực hiện trường'
              : 'Tuyến đường tác chiến';

          const instruction = buildInstruction(s, idx, isLast, roadName);
          const maneuver = mapManeuver(s.maneuver?.type, s.maneuver?.modifier);

          return {
            id: `step-${idx + 1}`,
            instruction,
            roadName,
            maneuver,
            distanceMeters: Math.round(s.distance || 0),
            durationSeconds: Math.round(s.duration || 0),
            lat: s.maneuver?.location?.[1] ?? polyline[0]?.[0] ?? fromLat,
            lng: s.maneuver?.location?.[0] ?? polyline[0]?.[1] ?? fromLng,
          };
        });

        // Nếu chỉ có 1 step hoặc không có step rẽ, tự sinh 2 mốc xuất phát và đích
        const safeSteps =
          steps.length > 0
            ? steps
            : [
                {
                  id: 'step-1',
                  instruction: 'Xuất phát theo tuyến đường tác chiến',
                  roadName: 'Đường xuất phát',
                  maneuver: 'straight' as const,
                  distanceMeters: Math.round(primaryRoute.distance * 0.7),
                  durationSeconds: Math.round(primaryRoute.duration * 0.7),
                  lat: fromLat,
                  lng: fromLng,
                },
                {
                  id: 'step-2',
                  instruction: 'Tiếp cận vị trí sự cố',
                  roadName: 'Khu vực hiện trường',
                  maneuver: 'arrive' as const,
                  distanceMeters: Math.round(primaryRoute.distance * 0.3),
                  durationSeconds: Math.round(primaryRoute.duration * 0.3),
                  lat: toLat,
                  lng: toLng,
                },
              ];

        const result: RouteResult = {
          polyline,
          steps: safeSteps,
          totalDistanceMeters: Math.round(primaryRoute.distance),
          totalDurationSeconds: Math.round(primaryRoute.duration),
        };

        routeCache.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      console.warn('[routingService] OSRM routing failed or offline, using fallback:', err);
    }

    // Fallback nếu không có mạng / OSRM quá tải
    return this.createFallbackRoute(origin, destination);
  },

  /**
   * Tạo lộ trình dự phòng nếu mạng lỗi, đảm bảo luôn có điểm nối
   */
  createFallbackRoute(
    origin: [number, number],
    destination: [number, number]
  ): RouteResult {
    const [fromLat, fromLng] = origin;
    const [toLat, toLng] = destination;

    const midLat = (fromLat + toLat) / 2;
    const midLng = (fromLng + toLng) / 2;

    const polyline: [number, number][] = [
      [fromLat, fromLng],
      [midLat, fromLng],
      [midLat, midLng],
      [toLat, midLng],
      [toLat, toLng],
    ];

    const steps: TurnByTurnStep[] = [
      {
        id: 'fallback-1',
        instruction: 'Xuất phát từ vị trí kíp xe tới trục giao lộ gần nhất',
        roadName: 'Trục đường xuất phát',
        maneuver: 'straight',
        distanceMeters: 500,
        durationSeconds: 60,
        lat: fromLat,
        lng: fromLng,
      },
      {
        id: 'fallback-2',
        instruction: 'Chuyển hướng theo tuyến giao thông chính',
        roadName: 'Đường trục chính',
        maneuver: 'turn_right',
        distanceMeters: 800,
        durationSeconds: 90,
        lat: midLat,
        lng: midLng,
      },
      {
        id: 'fallback-3',
        instruction: 'Tiếp cận hiện trường sự cố và dừng đỗ',
        roadName: 'Hiện trường mục tiêu',
        maneuver: 'arrive',
        distanceMeters: 200,
        durationSeconds: 30,
        lat: toLat,
        lng: toLng,
      },
    ];

    return {
      polyline,
      steps,
      totalDistanceMeters: 1500,
      totalDurationSeconds: 180,
    };
  },
};
