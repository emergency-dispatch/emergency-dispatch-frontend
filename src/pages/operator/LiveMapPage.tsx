import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatchStore } from '../../context/DispatchContext';
import { useDispatchRoutes } from '../../hooks/useDispatchRoutes';
import { DispatchIncidentList } from '../../components/operator/livemap/DispatchIncidentList';
import { DispatchRecommendPanel } from '../../components/operator/livemap/DispatchRecommendPanel';
import { LiveMapView } from '../../components/operator/livemap/LiveMapView';
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
 */
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
      <div className="hidden lg:flex lg:w-[300px] lg:shrink-0 h-full flex-col">
        <DispatchIncidentList
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={handleSelectIncident}
          panelError={panelError}
          onClearError={() => setPanelError(null)}
          cancellingVehicleId={cancellingVehicleId}
          cancellingIncidentId={cancellingIncidentId}
          onCancelVehicle={handleCancelVehicle}
          onCancelIncident={handleCancelIncident}
          onDismissNotice={(incidentId, noticeId) => dismissResponseNotice(incidentId, noticeId)}
        />
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
        />
        {GpsSimulatorPanel && (
          <Suspense fallback={null}>
            <GpsSimulatorPanel vehicles={vehicles} />
          </Suspense>
        )}
      </div>

      {/* ── CỘT PHẢI: Gợi ý tổ (340px cố định) ── */}
      <div className="hidden lg:flex lg:w-[340px] lg:shrink-0 h-full flex-col">
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
          ${sheetOpen ? 'h-[55%]' : 'h-11'}`}
      >
        <button
          onClick={() => setSheetOpen((v) => !v)}
          className="shrink-0 h-11 flex items-center justify-center gap-2 border-b border-slate-200 text-xs font-bold text-slate-600"
          aria-label={sheetOpen ? t('liveMap.page.collapse') : t('liveMap.page.openPanel')}
        >
          <span className="w-10 h-1 rounded-full bg-slate-300" />
          {t('liveMap.page.panelTitle')}
        </button>
        {sheetOpen && (
          <div className="flex-1 min-h-0">
            <DispatchIncidentList
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={handleSelectIncident}
              panelError={panelError}
              onClearError={() => setPanelError(null)}
              cancellingVehicleId={cancellingVehicleId}
              cancellingIncidentId={cancellingIncidentId}
              onCancelVehicle={handleCancelVehicle}
              onCancelIncident={handleCancelIncident}
              onDismissNotice={(incidentId, noticeId) => dismissResponseNotice(incidentId, noticeId)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
