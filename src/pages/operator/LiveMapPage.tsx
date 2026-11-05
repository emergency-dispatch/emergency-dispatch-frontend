import React, { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useDispatchStore } from '../../context/DispatchContext';
import { useDispatchRoutes } from '../../hooks/useDispatchRoutes';
import { DispatchIncidentList } from '../../components/operator/livemap/DispatchIncidentList';
import { DispatchRecommendPanel } from '../../components/operator/livemap/DispatchRecommendPanel';
import { LiveMapView } from '../../components/operator/livemap/LiveMapView';
import { CreateIncidentPanel, type IncidentCreatedInfo } from '../../components/operator/livemap/CreateIncidentPanel';
import type { PickedPoint } from '../../components/operator/livemap/MapPickLocation';
import { findNearbyIncidents } from '../../utils/nearbyIncidents';
import { MAX_VEHICLES_BY_LEVEL } from '../../data/dispatchConfig';
import { StationNotAssigned } from '../../components/operator/StationNotAssigned';
import type { AssignOptions } from '../../context/DispatchContext';
import type { OperatorCancellationCode } from '../../types/incident';
import type { DispatchAlgorithm } from '../../types/vehicle';
import { useTranslation } from '../../i18n';

// DEV ONLY: giả lập GPS xe khi chưa có điện thoại Staff. Chỉ nạp khi `npm run dev`, bản build loại bỏ hẳn.
const GpsSimulatorPanel = import.meta.env.DEV
  ? React.lazy(() =>
      import('../../components/operator/livemap/GpsSimulatorPanel').then((m) => ({ default: m.GpsSimulatorPanel }))
    )
  : null;

/**
 * Live Map — bố cục 3 cột:
 *   [Danh sách sự cố] | [Bản đồ] | [Gợi ý tổ]
 *
 * Tablet < 1024px: DispatchIncidentList thu thành Bottom Sheet.
 * Panel phải luôn hiện trên desktop.
 *
 * Chế độ tạo sự cố (?create=1, nút "Tạo sự cố" trên Topbar): form tiếp nhận thay cột trái (rộng hơn),
 * panel phải ẩn, bản đồ chuyển sang chọn vị trí. Tạo xong quay về 3 cột.
 */
const CREATED_NOTICE_MS = 6000;

// Khớp breakpoint `lg` của Tailwind: form tạo sự cố chỉ mount một bản (cột trái hoặc bottom sheet) để không tách state.
const DESKTOP_QUERY = '(min-width: 1024px)';
const subscribeDesktop = (onChange: () => void) => {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};
const getIsDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

export const LiveMapPage: React.FC = () => {
  const {
    vehicles,
    incidents,
    stations,
    trafficJams,
    resolveTrafficJam,
    assignVehicle,
    cancelAssignment,
    rejectIncident,
    dismissResponseNotice,
    serviceArea,
    stationNotAssigned,
  } = useDispatchStore();
  const { t } = useTranslation();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [assigningVehicleId, setAssigningVehicleId] = useState<string | null>(null);
  const [cancellingVehicleId, setCancellingVehicleId] = useState<string | null>(null);
  const [cancellingIncidentId, setCancellingIncidentId] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  // Tablet: bottom sheet
  const [sheetOpen, setSheetOpen] = useState(true);

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const createOpen = searchParams.get('create') === '1';
  const [pickPosition, setPickPosition] = useState<PickedPoint | null>(null);
  const [pickFlyKey, setPickFlyKey] = useState(0);
  const [createdNotice, setCreatedNotice] = useState<IncidentCreatedInfo | null>(null);
  const nearby = useMemo(
    () => (createOpen && pickPosition ? findNearbyIncidents(incidents, pickPosition) : []),
    [createOpen, pickPosition, incidents]
  );
  const nearbyIncidents = useMemo(() => nearby.map((n) => n.incident), [nearby]);
  const dispatchIncidents = useMemo(() => incidents.filter((i) => i.status === 'approved'), [incidents]);
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const incidentsById = useMemo(() => new Map(incidents.map((i) => [i.id, i])), [incidents]);
  const routes = useDispatchRoutes(incidents, vehicles);

  // Auto-select ưu tiên nhất khi chưa chọn
  const userClearedRef = useRef(false);
  const firstNeedingVehicles = useMemo(
    () =>
      incidents
        .filter(
          (i) =>
            i.status === 'approved' &&
            i.assignedVehicleIds.length - i.reportedVehicleIds.length < MAX_VEHICLES_BY_LEVEL[i.severity]
        )
        .sort((a, b) => b.severity - a.severity)[0] ?? null,
    [incidents]
  );
  useEffect(() => {
    if (selectedIncidentId || userClearedRef.current || !firstNeedingVehicles) return;
    setSelectedIncidentId(firstNeedingVehicles.id);
  }, [selectedIncidentId, firstNeedingVehicles?.id]);

  // Deep link từ banner leo thang / thông báo
  const focusIncidentId = (location.state as { focusIncidentId?: string } | null)?.focusIncidentId;
  useEffect(() => {
    if (focusIncidentId) {
      setSelectedIncidentId(focusIncidentId);
      setSheetOpen(true);
    }
  }, [focusIncidentId, location.key]);

  const handleSelectIncident = (id: string | null) => {
    userClearedRef.current = id === null;
    setSelectedIncidentId(id);
    if (id) setSheetOpen(true);
  };

  const closeCreate = () => {
    setPickPosition(null);
    setPickFlyKey(0);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('create');
        return next;
      },
      { replace: true }
    );
  };

  const isDesktop = useSyncExternalStore(subscribeDesktop, getIsDesktop);

  // Tablet: mở form thì kéo bottom sheet lên.
  useEffect(() => {
    if (createOpen) setSheetOpen(true);
  }, [createOpen]);

  // Sự cố Operator tạo đã được xác minh → chọn ngay để panel phải mở gợi ý xe.
  const handleCreated = (info: IncidentCreatedInfo) => {
    closeCreate();
    setCreatedNotice(info);
    handleSelectIncident(info.incidentId);
  };

  useEffect(() => {
    if (!createdNotice || createdNotice.dispatchSucceeded === false) return;
    const timer = setTimeout(() => setCreatedNotice(null), CREATED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [createdNotice]);

  const handleViewNearby = (id: string) => {
    const incident = incidentsById.get(id);
    // Sự cố đã duyệt → chọn để camera bay tới. Chờ duyệt (không mở được ở đây mà không mất form) → bay về khu vực
    // ghim, nơi sự cố nghi trùng đang được vẽ nổi bật (cách ghim ≤ 500 m).
    if (incident?.status === 'approved') setSelectedIncidentId(id);
    else if (incident) setPickFlyKey((k) => k + 1);
  };

  const createPanel = createOpen ? (
    <CreateIncidentPanel
      position={pickPosition}
      onLocate={(point) => {
        setPickPosition(point);
        setPickFlyKey((k) => k + 1);
      }}
      nearby={nearby}
      onViewIncident={handleViewNearby}
      onClose={closeCreate}
      onCreated={handleCreated}
    />
  ) : null;

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId((cur) => (cur === id ? null : id));
  };

  const handleAssign = async (vehicleId: string, algorithm: DispatchAlgorithm, options?: AssignOptions) => {
    if (!selectedIncidentId) return;
    setAssigningVehicleId(vehicleId);
    setPanelError(null);
    const result = await assignVehicle(vehicleId, selectedIncidentId, algorithm, options);
    setAssigningVehicleId(null);
    if (!result.ok) setPanelError(result.message ?? t('context.assignFailed'));
  };

  const handleCancelVehicle = async (vehicleId: string) => {
    setCancellingVehicleId(vehicleId);
    setPanelError(null);
    const result = await cancelAssignment(vehicleId);
    setCancellingVehicleId(null);
    if (!result.ok) setPanelError(result.message ?? t('context.unassignFailed'));
  };

  const handleCancelIncident = async (incidentId: string, reasonCode: OperatorCancellationCode) => {
    setCancellingIncidentId(incidentId);
    setPanelError(null);
    const result = await rejectIncident(
      incidentId,
      'Điều phối viên hủy sự cố đã duyệt trên Live Map.',
      null,
      reasonCode
    );
    if (!result.ok) setPanelError(result.message ?? t('context.cancelFailed'));
    else if (selectedIncidentId === incidentId) setSelectedIncidentId(null);
    setCancellingIncidentId(null);
  };

  if (stationNotAssigned) return <StationNotAssigned message={stationNotAssigned} />;

  return (
    <div className="h-full flex overflow-hidden relative">

      {/* ── CỘT TRÁI: Danh sách sự cố (300px cố định) ── */}
      {/* Desktop: luôn hiện. Tablet: ẩn trong bottom sheet. */}
      <div className={`hidden lg:flex lg:shrink-0 h-full flex-col ${createOpen ? 'lg:w-[440px]' : 'lg:w-[300px]'}`}>
        {(isDesktop && createPanel) || <DispatchIncidentList
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={handleSelectIncident}
          panelError={panelError}
          onClearError={() => setPanelError(null)}
          cancellingVehicleId={cancellingVehicleId}
          cancellingIncidentId={cancellingIncidentId}
          onCancelVehicle={handleCancelVehicle}
          onCancelIncident={handleCancelIncident}
          onDismissNotice={(incidentId, noticeId) => dismissResponseNotice(incidentId, noticeId)}
        />}
      </div>

      {/* ── CỘT GIỮA: Bản đồ (flex-1) ── */}
      <div className="flex-1 min-w-0 h-full relative">
        <LiveMapView
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={handleSelectVehicle}
          dispatchIncidents={dispatchIncidents}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={handleSelectIncident}
          stations={stations}
          trafficJams={trafficJams}
          onResolveTrafficJam={resolveTrafficJam}
          routes={routes}
          vehiclesById={vehiclesById}
          incidentsById={incidentsById}
          serviceArea={serviceArea}
          pickLocation={createOpen ? { position: pickPosition, onPick: setPickPosition, flyKey: pickFlyKey } : null}
          nearbyIncidents={nearbyIncidents}
        />
        {createdNotice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] w-[min(420px,calc(100%-2rem))]">
            <div
              role="status"
              className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-lg text-xs ${
                createdNotice.dispatchSucceeded === false
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              {createdNotice.dispatchSucceeded === false ? (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold">{createdNotice.message || t('liveMap.create.created')}</p>
                <p className="truncate opacity-80">{createdNotice.title}</p>
                {createdNotice.dispatchSucceeded === false && createdNotice.dispatchMessage && (
                  <p className="mt-0.5">{createdNotice.dispatchMessage}</p>
                )}
              </div>
              <button onClick={() => setCreatedNotice(null)} aria-label={t('common.close')} className="shrink-0 opacity-60 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        {GpsSimulatorPanel && (
          <Suspense fallback={null}>
            <GpsSimulatorPanel vehicles={vehicles} />
          </Suspense>
        )}
      </div>

      {/* ── CỘT PHẢI: Gợi ý tổ (340px cố định) ── */}
      <div className={`hidden lg:w-[340px] lg:shrink-0 h-full flex-col ${createOpen ? '' : 'lg:flex'}`}>
        <DispatchRecommendPanel
          selectedIncidentId={selectedIncidentId}
          assigningVehicleId={assigningVehicleId}
          onAssign={handleAssign}
        />
      </div>

      {/* ── TABLET: Bottom Sheet (Dispatch list) ── */}
      <div
        className={`lg:hidden z-[1100] bg-white flex flex-col transition-[height] duration-300
          absolute inset-x-0 bottom-0 rounded-t-2xl shadow-[0_-8px_24px_rgba(15,23,42,0.18)]
          ${sheetOpen ? (createOpen ? 'h-[70%]' : 'h-[55%]') : 'h-11'}`}
      >
        <button
          onClick={() => setSheetOpen((v) => !v)}
          className="shrink-0 h-11 flex items-center justify-center gap-2 border-b border-slate-200 text-xs font-bold text-slate-600"
          aria-label={sheetOpen ? t('liveMap.page.collapse') : t('liveMap.page.openPanel')}
        >
          <span className="w-10 h-1 rounded-full bg-slate-300" />
          {createOpen ? t('liveMap.create.title') : t('liveMap.page.panelTitle')}
        </button>
        {!isDesktop && createPanel ? (
          // Giữ form mounted khi thu sheet (để xem bản đồ chọn vị trí) — không mất dữ liệu đang nhập.
          <div className={`flex-1 min-h-0 ${sheetOpen ? '' : 'hidden'}`}>{createPanel}</div>
        ) : sheetOpen && (
          <div className="flex-1 min-h-0">
            {<DispatchIncidentList
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={handleSelectIncident}
              panelError={panelError}
              onClearError={() => setPanelError(null)}
              cancellingVehicleId={cancellingVehicleId}
              cancellingIncidentId={cancellingIncidentId}
              onCancelVehicle={handleCancelVehicle}
              onCancelIncident={handleCancelIncident}
              onDismissNotice={(incidentId, noticeId) => dismissResponseNotice(incidentId, noticeId)}
            />}
          </div>
        )}
      </div>
    </div>
  );
};
