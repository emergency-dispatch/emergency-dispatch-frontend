import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Pause, Play, Satellite, SkipForward } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '../../../services/apiClient';
import { incidentService } from '../../../services/incidentService';
import type { Vehicle } from '../../../types/vehicle';
import i18n, { useTranslation } from '../../../i18n';

/**
 * DEV ONLY — giả lập GPS xe chạy tới hiện trường khi chưa có điện thoại Staff gửi vị trí thật.
 * LiveMapPage chỉ nạp component này khi `import.meta.env.DEV` (npm run dev); bản build không có.
 *
 * Đẩy xe dọc tuyến backend tính sẵn (GET /dispatch/tracking/incident/{id}) qua PUT /rescue-units/{id}/location.
 * Backend phát ReceiveRescueUnitLocation → bản đồ Operator, dẫn đường Staff, theo dõi Citizen cùng cập nhật.
 * Chuỗi hiển thị nằm trong từ điển liveMap.gpsSim (vi / en).
 */

const INTERVAL_MS = 2000;
const MOVING_STATUSES: Vehicle['status'][] = ['awaiting_ack', 'accepted', 'en_route'];

interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (d: number) => (d * Math.PI) / 180;
const distanceKm = (a: LatLng, b: LatLng) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

/** Điểm cách đầu tuyến `km` km, nội suy trên từng đoạn. */
const pointAt = (route: LatLng[], cumulative: number[], km: number): LatLng => {
  const last = route.length - 1;
  if (km <= 0) return route[0];
  if (km >= cumulative[last]) return route[last];
  let i = 1;
  while (cumulative[i] < km) i++;
  const t = (km - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1] || 1);
  return {
    lat: route[i - 1].lat + (route[i].lat - route[i - 1].lat) * t,
    lng: route[i - 1].lng + (route[i].lng - route[i - 1].lng) * t,
  };
};

interface Run {
  vehicleId: string;
  route: LatLng[];
  cumulative: number[];
  totalKm: number;
  doneKm: number;
}

export const GpsSimulatorPanel: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [vehicleId, setVehicleId] = useState('');
  const [speedKmh, setSpeedKmh] = useState(40);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ doneKm: number; totalKm: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runRef = useRef<Run | null>(null);
  const timerRef = useRef<number | null>(null);
  // Bấm Dừng khi request đang bay → tick đó không hẹn lượt tiếp.
  const runningRef = useRef(false);
  const speedRef = useRef(speedKmh);
  speedRef.current = speedKmh;

  const candidates = useMemo(
    () => vehicles.filter((v) => v.incidentId && MOVING_STATUSES.includes(v.status)),
    [vehicles]
  );
  const selected = candidates.find((v) => v.id === vehicleId) ?? null;

  // Chọn sẵn xe đầu tiên; xe đang chọn hết nhiệm vụ → bỏ chọn.
  useEffect(() => {
    if (!running && !candidates.some((v) => v.id === vehicleId)) setVehicleId(candidates[0]?.id ?? '');
  }, [candidates, vehicleId, running]);

  const stop = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    runningRef.current = false;
    setRunning(false);
  };

  useEffect(() => stop, []);

  const sendPosition = async (run: Run, km: number) => {
    const p = pointAt(run.route, run.cumulative, km);
    const pNext = pointAt(run.route, run.cumulative, Math.min(run.totalKm, km + 0.05));
    const dLng = toRad(pNext.lng - p.lng);
    const y = Math.sin(dLng) * Math.cos(toRad(pNext.lat));
    const x = Math.cos(toRad(p.lat)) * Math.sin(toRad(pNext.lat)) - Math.sin(toRad(p.lat)) * Math.cos(toRad(pNext.lat)) * Math.cos(dLng);
    const heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

    await apiClient.put(`/rescue-units/${run.vehicleId}/location`, {
      latitude: p.lat,
      longitude: p.lng,
      headingDegrees: Math.round(heading),
      speedKmh: speedRef.current,
    });
    run.doneKm = km;
    setProgress({ doneKm: km, totalKm: run.totalKm });
  };

  const tick = async () => {
    const run = runRef.current;
    if (!run) return;
    const nextKm = Math.min(run.totalKm, run.doneKm + (speedRef.current * INTERVAL_MS) / 3_600_000);
    try {
      await sendPosition(run, nextKm);
    } catch (err) {
      setMessage(getApiErrorMessage(err, i18n.t('liveMap.gpsSim.sendFailed')));
      stop();
      return;
    }
    if (nextKm >= run.totalKm) {
      setMessage(i18n.t('liveMap.gpsSim.arrived'));
      stop();
      return;
    }
    if (runningRef.current) timerRef.current = window.setTimeout(tick, INTERVAL_MS);
  };

  const loadRoute = async (vehicle: Vehicle): Promise<Run> => {
    const res = await incidentService.getTracking(vehicle.incidentId!);
    if (!res.success) throw new Error(res.message || i18n.t('liveMap.gpsSim.routeFailed'));
    const unit = res.data.units?.find((u) => u.rescueUnitId === vehicle.id);
    const raw = unit?.routeTrajectory?.length ? unit.routeTrajectory : res.data.routeTrajectory ?? [];
    let route = raw.map((p) => ({ lat: p.latitude, lng: p.longitude }));
    // Không có tuyến → đi thẳng từ xe tới hiện trường.
    if (route.length < 2) route = [{ lat: vehicle.lat, lng: vehicle.lng }, { lat: res.data.incidentLat, lng: res.data.incidentLng }];
    const cumulative = [0];
    for (let i = 1; i < route.length; i++) cumulative.push(cumulative[i - 1] + distanceKm(route[i - 1], route[i]));
    return { vehicleId: vehicle.id, route, cumulative, totalKm: cumulative[cumulative.length - 1], doneKm: 0 };
  };

  const start = async () => {
    if (!selected) return;
    setMessage(null);
    try {
      // Tiếp tục tuyến đang dở của cùng xe; xe khác hoặc đã tới nơi → lấy tuyến mới.
      const current = runRef.current;
      if (!current || current.vehicleId !== selected.id || current.doneKm >= current.totalKm) {
        runRef.current = await loadRoute(selected);
        setProgress({ doneKm: 0, totalKm: runRef.current.totalKm });
      }
      runningRef.current = true;
      setRunning(true);
      tick();
    } catch (err) {
      setMessage(getApiErrorMessage(err, i18n.t('liveMap.gpsSim.routeFailed')));
    }
  };

  const jumpToEnd = async () => {
    if (!selected) return;
    stop();
    setMessage(null);
    try {
      const run = runRef.current?.vehicleId === selected.id ? runRef.current : await loadRoute(selected);
      runRef.current = run;
      await sendPosition(run, run.totalKm);
      setMessage(i18n.t('liveMap.gpsSim.arrived'));
    } catch (err) {
      setMessage(getApiErrorMessage(err, i18n.t('liveMap.gpsSim.sendFailed')));
    }
  };

  const changeVehicle = (id: string) => {
    stop();
    runRef.current = null;
    setProgress(null);
    setMessage(null);
    setVehicleId(id);
  };

  const pct = progress && progress.totalKm > 0 ? Math.round((progress.doneKm / progress.totalKm) * 100) : 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-10 right-4 z-[1000] cad-glass rounded-xl px-3 py-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
      >
        <Satellite className={`w-3.5 h-3.5 ${running ? 'text-emerald-600 animate-pulse' : 'text-violet-600'}`} />
        GPS Simulator
        {running && <span className="font-mono-data text-emerald-700">{pct}%</span>}
      </button>
    );
  }

  return (
    <div className="absolute bottom-10 right-4 z-[1000] w-72 cad-glass rounded-xl p-3 space-y-2.5 text-xs text-slate-700">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 font-bold text-slate-900">
          <Satellite className="w-3.5 h-3.5 text-violet-600" />
          GPS Simulator
          <span className="px-1.5 py-px rounded bg-violet-100 text-violet-700 text-[9px] font-mono-data">DEV</span>
        </p>
        <button onClick={() => setOpen(false)} className="p-0.5 text-slate-400 hover:text-slate-700" aria-label={t('liveMap.gpsSim.minimize')}>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {candidates.length === 0 ? (
        <p className="text-slate-500">{t('liveMap.gpsSim.noVehicles')}</p>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-[10px] font-mono-data uppercase text-slate-500">{t('liveMap.gpsSim.vehicle')}</span>
            <select
              value={vehicleId}
              onChange={(e) => changeVehicle(e.target.value)}
              disabled={running}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-60"
            >
              {candidates.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} · {t(`enums.vehicleStatus.${v.status}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="flex justify-between text-[10px] font-mono-data uppercase text-slate-500">
              {t('liveMap.gpsSim.speed')} <span className="text-slate-800">{speedKmh} km/h</span>
            </span>
            <input
              type="range"
              min={10}
              max={150}
              step={10}
              value={speedKmh}
              onChange={(e) => setSpeedKmh(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
          </label>

          <div className="flex gap-1.5">
            {running ? (
              <button
                onClick={stop}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-2 py-1.5 font-bold text-white hover:bg-amber-600"
              >
                <Pause className="w-3.5 h-3.5" /> {t('liveMap.gpsSim.stop')}
              </button>
            ) : (
              <button
                onClick={start}
                disabled={!selected}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-violet-600 px-2 py-1.5 font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" /> {progress && pct > 0 && pct < 100 ? t('liveMap.gpsSim.resume') : t('liveMap.gpsSim.run')}
              </button>
            )}
            <button
              onClick={jumpToEnd}
              disabled={!selected}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <SkipForward className="w-3.5 h-3.5" /> {t('liveMap.gpsSim.jumpToEnd')}
            </button>
          </div>

          {progress && (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-violet-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="font-mono-data text-[10px] text-slate-500">
                {t('liveMap.gpsSim.remaining', {
                  pct,
                  left: (progress.totalKm - progress.doneKm).toFixed(2),
                  total: progress.totalKm.toFixed(2),
                })}
              </p>
            </div>
          )}
        </>
      )}

      {message && <p className="text-[11px] text-slate-600 leading-snug">{message}</p>}
    </div>
  );
};
