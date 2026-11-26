import React, { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useDispatchStore } from '../../context/DispatchContext';
import { useAuth } from '../../hooks/useAuth';
import { usePlanProgress } from '../../hooks/usePlanProgress';
import { useDispatchRoutes } from '../../hooks/useDispatchRoutes';
import { useNow } from '../../hooks/useNow';
import { CaseDossierPanel } from '../../components/operator/livemap/CaseDossierPanel';
import { DispatchIncidentList } from '../../components/operator/livemap/DispatchIncidentList';
import { DispatchRecommendPanel } from '../../components/operator/livemap/DispatchRecommendPanel';
import { CaseAssignments } from '../../components/operator/livemap/CaseAssignments';
import { ReadyTeamsCard } from '../../components/operator/livemap/ReadyTeamsCard';
import { countAttentionCases } from '../../components/operator/livemap/caseGroups';
import { autoDispatchVerdictAt, needsOperator } from '../../components/operator/incidents/autoDispatchVerdict';
import { groupCompletion, progressOf } from '../../components/operator/completion/completionGroups';
import { COMPLETION_PATH, INCIDENT_QUEUE_PATH } from '../../data/dashboardMock';
import { useTeamByVehicle } from '../../hooks/useStationTeams';
import { LiveMapView } from '../../components/operator/livemap/LiveMapView';
import { CreateIncidentPanel, type IncidentCreatedInfo } from '../../components/operator/livemap/CreateIncidentPanel';
import type { PickedPoint } from '../../components/operator/livemap/MapPickLocation';
import { showToast } from '../../components/admin/common/toastStore';
import { ASSIGNING_MANY } from '../../utils/dispatchPlan';
import { findNearbyIncidents } from '../../utils/nearbyIncidents';
import { StationNotAssigned } from '../../components/operator/StationNotAssigned';
import type { AssignOptions, TeamAssignTarget } from '../../context/DispatchContext';
import type { FieldRequestDto } from '../../types/fieldRequest';
import type { BlockDuration, OperatorCancellationCode } from '../../types/incident';
import type { DispatchAlgorithm } from '../../types/vehicle';
import { useTranslation } from '../../i18n';

// Giả lập GPS xe để demo khi chưa có điện thoại Staff: bật cả bản dev lẫn bản deploy (nạp lười, chỉ tải khi mở Live Map).
// Tắt ở bản thật bằng biến môi trường VITE_GPS_SIMULATOR=off.
const GpsSimulatorPanel = import.meta.env.VITE_GPS_SIMULATOR !== 'off'
  ? React.lazy(() =>
      import('../../components/operator/livemap/GpsSimulatorPanel').then((m) => ({ default: m.GpsSimulatorPanel }))
    )
  : null;

/**
 * Live Map — giám sát và điều phối (thẩm định ca chờ duyệt nằm ở Hàng đợi, FR-OP-02):
 *   [Panel trái: Danh sách ca ⇄ Chi tiết ca (380px) / Hồ sơ ca (760px)] | [Bản đồ + thẻ "Tổ sẵn sàng"]
 *
 * Tablet < 1024px: cùng panel đó trong Bottom Sheet (tablet cũng giao xe được).
 * Chế độ tạo sự cố (?create=1, nút "Tạo sự cố" trên Topbar): form tiếp nhận thay panel trái (rộng hơn),
 * bản đồ chuyển sang chọn vị trí. Tạo xong mở luôn Chi tiết ca vừa tạo.
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
    assignTrafficJam,
    unassignTrafficJam,
    trafficAssignableUnits,
    assignTeams,
    cancelAssignment,
    rejectIncident,
    dismissResponseNotice,
    serviceArea,
    stationNotAssigned,
    fieldRequests,
    escalatedIncidentIds,
    assignmentsByIncident,
    autoDispatchSettings,
    setIncidentDrawerOpen,
  } = useDispatchStore();
  const teamByVehicle = useTeamByVehicle();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [assigningTeamId, setAssigningTeamId] = useState<string | null>(null);
  const [cancellingVehicleId, setCancellingVehicleId] = useState<string | null>(null);
  const [cancellingIncidentId, setCancellingIncidentId] = useState<string | null>(null);
  // Hồ sơ của ca đang chọn (thay Chi tiết ca, panel rộng hơn); `cancelling` = mở sẵn phần hủy ca.
  const [dossier, setDossier] = useState<{ incidentId: string; cancelling: boolean } | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  /** §35: hệ quả của thao tác vừa xong (VD thu hồi lượt cuối → sự cố tự đóng / về hàng chờ). */
  const [panelNotice, setPanelNotice] = useState<string | null>(null);
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
  const { user } = useAuth();
  const planProgressOf = usePlanProgress();

  // Nhịp chậm: chỉ để đếm, không vẽ lại cả trang (bản đồ) mỗi giây.
  const slowNow = useNow(15_000);
  // Danh sách ca là màn chính → không tự mở ca nào; số ca cần xử lý hiện cạnh nút quay lại ở Chi tiết ca.
  const attentionCount = useMemo(() => {
    const fieldRequestCounts = new Map<string, number>();
    for (const r of fieldRequests) fieldRequestCounts.set(r.incidentId, (fieldRequestCounts.get(r.incidentId) ?? 0) + 1);
    return countAttentionCases(incidents, {
      escalatedIds: escalatedIncidentIds,
      fieldRequestCounts,
      verdictOf: (incident) => autoDispatchVerdictAt(incident, autoDispatchSettings, slowNow),
      missingOf: (incident) => planProgressOf(incident).missing,
    });
  }, [incidents, fieldRequests, escalatedIncidentIds, autoDispatchSettings, slowNow, planProgressOf]);

  // Chọn ca trên Live Map (ca đã duyệt / đã hoàn tất → Chi tiết ca).
  const showIncident = (id: string | null) => {
    setSelectedIncidentId(id);
    setDossier(null);
    setPanelError(null);
    setPanelNotice(null);
    setServingRequestId(null);
    if (id) setSheetOpen(true);
  };

  const handleSelectIncident = showIncident;
  // Ca chờ duyệt ("Thẩm định" ở Theo dõi ca, marker ca chờ người) → mở thẩm định ở Hàng đợi.
  const handleOpenTriage = (id: string) => navigate(INCIDENT_QUEUE_PATH, { state: { openIncidentId: id } });

  // Deep link từ banner leo thang / thông báo / chuông: ca đã duyệt → Chi tiết ca; ca chờ người → thẩm định ở Hàng đợi; ca
  // AI đang làm → chỉ bay tới (để AI làm; muốn xem thì bấm "Mở ca").
  const focusIncidentId = (location.state as { focusIncidentId?: string } | null)?.focusIncidentId;
  const [focusAiIncident, setFocusAiIncident] = useState<{ id: string; key: number } | null>(null);
  useEffect(() => {
    if (!focusIncidentId) return;
    const target = incidentsById.get(focusIncidentId);
    if (target?.status !== 'pending') {
      handleSelectIncident(focusIncidentId);
      return;
    }
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    const aiWorking = !target.lock && !needsOperator(autoDispatchVerdictAt(target, autoDispatchSettings, Date.now()));
    if (aiWorking) setFocusAiIncident((prev) => ({ id: target.id, key: (prev?.key ?? 0) + 1 }));
    else handleOpenTriage(target.id);
    // Chỉ chạy theo yêu cầu mới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIncidentId, location.key]);

  // Cảnh báo điểm ùn tắc leo thang (§24) → bay tới và mở popup (có nút giao đội).
  const focusTrafficJamId = (location.state as { focusTrafficJamId?: string } | null)?.focusTrafficJamId;
  const [focusTrafficJam, setFocusTrafficJam] = useState<{ id: string; key: number } | null>(null);
  useEffect(() => {
    if (focusTrafficJamId) setFocusTrafficJam((prev) => ({ id: focusTrafficJamId, key: (prev?.key ?? 0) + 1 }));
  }, [focusTrafficJamId, location.key]);

  // §31.E: dải AI → "Xem trên bản đồ": bay tới tin báo AI đang xử lý, không chọn / không mở ca (AI vẫn chạy).
  const focusAiIncidentId = (location.state as { focusAiIncidentId?: string } | null)?.focusAiIncidentId;
  useEffect(() => {
    if (focusAiIncidentId) setFocusAiIncident((prev) => ({ id: focusAiIncidentId, key: (prev?.key ?? 0) + 1 }));
  }, [focusAiIncidentId, location.key]);

  // §21.2: thông báo yêu cầu hiện trường → làm nổi yêu cầu trong mục "Yêu cầu từ hiện trường".
  const focusFieldRequestId = (location.state as { focusFieldRequestId?: string } | null)?.focusFieldRequestId ?? null;
  const [highlightFieldRequestId, setHighlightFieldRequestId] = useState<string | null>(null);
  useEffect(() => {
    if (focusFieldRequestId) setHighlightFieldRequestId(focusFieldRequestId);
  }, [focusFieldRequestId, location.key]);

  // §21.2: yêu cầu chi viện đang được đáp ứng ở panel phải. Yêu cầu đóng (đã giao / Operator khác xử lý / đội hủy)
  // hoặc chọn sự cố khác → tự thoát chế độ này.
  const [servingRequestId, setServingRequestId] = useState<string | null>(null);
  const servingRequest = useMemo(
    () =>
      fieldRequests.find(
        (r) => r.id === servingRequestId && r.incidentId === selectedIncidentId && r.type === 'Backup'
      ) ?? null,
    [fieldRequests, servingRequestId, selectedIncidentId]
  );

  // Bấm lại icon Live Map ở thanh bên khi đang ở đây → về "Theo dõi ca" (đang tạo sự cố thì hỏi bỏ dữ liệu trước).
  // Bản đồ giữ nguyên. Bỏ qua state còn lưu trong lịch sử khi vừa mở / tải lại trang.
  const liveMapHome = !!(location.state as { liveMapHome?: boolean } | null)?.liveMapHome;
  const initialLocationKeyRef = useRef(location.key);
  const [closeCreateRequest, setCloseCreateRequest] = useState(0);
  useEffect(() => {
    if (!liveMapHome || location.key === initialLocationKeyRef.current) return;
    if (createOpen) setCloseCreateRequest((n) => n + 1);
    else handleSelectIncident(null);
    // Chỉ chạy theo lần bấm (mỗi lần bấm là một location.key mới).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMapHome, location.key]);

  const handleServeFieldRequest = (request: FieldRequestDto) => {
    showIncident(request.incidentId);
    setServingRequestId(request.id);
    setHighlightFieldRequestId(request.id);
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
      closeRequestKey={closeCreateRequest}
      onCreated={handleCreated}
    />
  ) : null;

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId((cur) => (cur === id ? null : id));
  };

  const handleAssign = async (
    targets: TeamAssignTarget[],
    algorithm: DispatchAlgorithm,
    options?: AssignOptions
  ): Promise<boolean> => {
    if (!selectedIncidentId) return false;
    setAssigningTeamId(targets.length === 1 ? targets[0].teamId : ASSIGNING_MANY);
    setPanelError(null);
    const result = await assignTeams(targets, selectedIncidentId, algorithm, options);
    setAssigningTeamId(null);
    if (!result.ok) setPanelError(result.message ?? t('context.assignFailed'));
    else if (targets.length > 1) showToast(t('liveMap.plan.assignedMany', { count: targets.length }));
    return result.ok;
  };

  const handleCancelVehicle = async (vehicleId: string) => {
    setCancellingVehicleId(vehicleId);
    setPanelError(null);
    setPanelNotice(null);
    const result = await cancelAssignment(vehicleId);
    setCancellingVehicleId(null);
    if (!result.ok) setPanelError(result.message ?? t('context.unassignFailed'));
    else setPanelNotice(result.notice ?? null);
  };

  const handleCancelIncident = async (
    incidentId: string,
    reason: string,
    blockDuration: BlockDuration | null,
    reasonCode: OperatorCancellationCode
  ) => {
    setCancellingIncidentId(incidentId);
    setPanelError(null);
    const result = await rejectIncident(
      incidentId,
      reason || 'Điều phối viên hủy sự cố đã duyệt trên Live Map.',
      blockDuration,
      reasonCode
    );
    if (!result.ok) setPanelError(result.message ?? t('context.cancelFailed'));
    else if (selectedIncidentId === incidentId) showIncident(null);
    setCancellingIncidentId(null);
  };

  // Panel trái 2 tầng: ca đang chọn (đã duyệt / đã hoàn tất) → Chi tiết ca; còn lại → Danh sách ca.
  const selectedCase = selectedIncidentId ? incidentsById.get(selectedIncidentId) : undefined;
  const showDetail = !!selectedCase && (selectedCase.status === 'approved' || selectedCase.status === 'completed');
  const ownAssignments = selectedCase ? assignmentsByIncident.get(selectedCase.id) : undefined;
  const completion = ownAssignments ? progressOf(groupCompletion(ownAssignments, teamByVehicle)) : null;

  const dossierOpen = showDetail && !!selectedCase && dossier?.incidentId === selectedCase.id;
  // Hồ sơ ca cần hai cột → panel rộng; banner leo thang né sang phần bản đồ.
  const widePanel = !createOpen && dossierOpen;
  useEffect(() => {
    setIncidentDrawerOpen(widePanel, 'left');
    return () => setIncidentDrawerOpen(false);
  }, [widePanel, setIncidentDrawerOpen]);

  const casePanel =
    showDetail && selectedCase ? (
      <>
        {dossierOpen && (
          <CaseDossierPanel
            key={selectedCase.id}
            incident={selectedCase}
            assignments={ownAssignments ?? []}
            startCancelling={!!dossier?.cancelling}
            isCancelling={cancellingIncidentId === selectedCase.id}
            errorMsg={panelError}
            onBack={() => {
              setDossier(null);
              setPanelError(null);
            }}
            onCancelCase={(reason, blockDuration, reasonCode) =>
              handleCancelIncident(selectedCase.id, reason, blockDuration, reasonCode)
            }
          />
        )}
        {/* Ẩn chứ không gỡ: quay lại từ Hồ sơ ca vẫn còn các tổ đang chọn. */}
        <div className={dossierOpen ? 'hidden' : 'h-full'}>
          <DispatchRecommendPanel
            selectedIncidentId={selectedCase.id}
            assigningTeamId={assigningTeamId}
            onAssign={handleAssign}
            fieldRequest={servingRequest}
            onExitFieldRequest={() => setServingRequestId(null)}
            onBack={() => handleSelectIncident(null)}
            onOpenIncident={handleSelectIncident}
            onOpenDossier={() => setDossier({ incidentId: selectedCase.id, cancelling: false })}
            attentionCount={attentionCount}
            caseBody={
              <>
                {panelError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="flex-1">{panelError}</span>
                    <button onClick={() => setPanelError(null)} aria-label={t('liveMap.incidentList.dismissError')}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {panelNotice && (
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="flex-1">{panelNotice}</span>
                    <button onClick={() => setPanelNotice(null)} aria-label={t('common.close')}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <CaseAssignments
                  key={selectedCase.id}
                  incident={selectedCase}
                  vehiclesById={vehiclesById}
                  assignments={ownAssignments ?? []}
                  completion={completion}
                  onOpenCompletion={() => navigate(`${COMPLETION_PATH}?incident=${encodeURIComponent(selectedCase.id)}`)}
                  cancellingVehicleId={cancellingVehicleId}
                  onCancelVehicle={handleCancelVehicle}
                  onCancelIncident={() => {
                    setPanelError(null);
                    setDossier({ incidentId: selectedCase.id, cancelling: true });
                  }}
                  onDismissNotice={(noticeId) => dismissResponseNotice(selectedCase.id, noticeId)}
                />
              </>
            }
          />
        </div>
      </>
    ) : (
      <DispatchIncidentList
        selectedIncidentId={selectedIncidentId}
        onSelectIncident={handleSelectIncident}
        onOpenTriage={handleOpenTriage}
        panelError={panelError}
        onClearError={() => setPanelError(null)}
        onServeFieldRequest={handleServeFieldRequest}
        highlightFieldRequestId={highlightFieldRequestId}
        onFocusAiIncident={(id) => setFocusAiIncident((prev) => ({ id, key: (prev?.key ?? 0) + 1 }))}
      />
    );

  if (stationNotAssigned) return <StationNotAssigned message={stationNotAssigned} />;

  return (
    <div className="h-full flex overflow-hidden relative">

      {/* ── PANEL TRÁI 2 TẦNG: Danh sách ca ⇄ Chi tiết ca (form tạo sự cố thay chỗ khi đang tạo) ── */}
      {/* Desktop: luôn hiện. Tablet: nằm trong bottom sheet. */}
      <div
        className={`hidden lg:flex lg:shrink-0 h-full flex-col border-r border-slate-200 bg-white ${
          createOpen ? 'lg:w-[440px]' : widePanel ? 'lg:w-[min(760px,58vw)]' : 'lg:w-[380px]'
        }`}
      >
        {(isDesktop && createPanel) || (isDesktop && casePanel)}
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
          onAssignTrafficJam={assignTrafficJam}
          onUnassignTrafficJam={unassignTrafficJam}
          trafficAssignableUnits={trafficAssignableUnits}
          focusTrafficJam={focusTrafficJam}
          focusAiIncident={focusAiIncident}
          onOpenTriage={handleOpenTriage}
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
        {!createOpen && <ReadyTeamsCard />}
        {GpsSimulatorPanel && (
          <Suspense fallback={null}>
            <GpsSimulatorPanel vehicles={vehicles} stations={stations} myStationId={user?.stationId ?? null} />
          </Suspense>
        )}
      </div>

      {/* ── TABLET: Bottom Sheet (Dispatch list) ── */}
      <div
        className={`lg:hidden z-[1100] bg-white flex flex-col transition-[height] duration-300
          absolute inset-x-0 bottom-0 rounded-t-2xl shadow-[0_-8px_24px_rgba(15,23,42,0.18)]
          ${sheetOpen ? (widePanel ? 'h-full' : createOpen ? 'h-[70%]' : 'h-[55%]') : 'h-11'}`}
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
        ) : (sheetOpen || widePanel) && (
          // Đang xem hồ sơ: thu sheet để nhìn bản đồ không làm mất nội dung đang nhập.
          <div className={`flex-1 min-h-0 ${sheetOpen ? '' : 'hidden'}`}>{!isDesktop && casePanel}</div>
        )}
      </div>
    </div>
  );
};
