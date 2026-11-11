import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Map as MapIcon, X } from 'lucide-react';
import { IncidentDetailDrawer } from '../../components/operator/incidents/IncidentDetailDrawer';
import { IncidentQueueList } from '../../components/operator/incidents/IncidentQueueList';
import { QueueDispatchDrawer } from '../../components/operator/incidents/QueueDispatchDrawer';
import { StationNotAssigned } from '../../components/operator/StationNotAssigned';
import { useDispatchStore } from '../../context/DispatchContext';
import type {
  BlockDuration,
  IncidentCategory,
  OperatorCancellationCode,
  SeverityLevel,
  TrafficJamDecision,
} from '../../types/incident';
import { useTranslation } from '../../i18n';

// Backend giữ khóa mềm 2 phút; gia hạn mỗi 60 giây khi Operator vẫn đang mở ca.
const LOCK_RENEW_MS = 60 * 1000;
// Thông báo sau khi đóng bước Điều xe tự tắt sau ngần này.
const DISPATCH_NOTICE_MS = 8000;
const LIVE_MAP_PATH = '/dashboard/command-center/live-map';

interface DispatchNotice {
  incidentId: string;
  title: string;
  /** Số xe đang giao cho ca; 0 = Operator chọn "Để sau". */
  vehicleCount: number;
}

export const IncidentQueuePage: React.FC = () => {
  const {
    currentOperatorId,
    incidents,
    highlightIncidentIds,
    escalatedIncidentIds,
    incidentsLoading,
    incidentsError,
    approveIncident,
    rejectIncident,
    transferIncident,
    stations,
    stationNotAssigned,
    lockIncident,
    releaseIncident,
    revealReporterPhone,
    setIncidentDrawerOpen,
    unlinkLinkedReport,
    supplementVersions,
  } = useDispatchStore();
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Sự cố vừa duyệt đang ở bước "Điều xe" (giao xe lần đầu ngay trong Hàng đợi).
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchNotice, setDispatchNotice] = useState<DispatchNotice | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  // Ca đã duyệt đang xử lý — hàng đợi trống thì mời sang Live Map theo dõi.
  const activeIncidentCount = useMemo(() => incidents.filter((inc) => inc.status === 'approved').length, [incidents]);
  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  const pendingIncidents = useMemo(() => incidents.filter((inc) => inc.status === 'pending'), [incidents]);
  const selectedIncident = pendingIncidents.find((inc) => inc.id === selectedId) ?? null;
  const isDrawerOpen = !!selectedIncident || !!dispatchingId;

  useEffect(() => {
    setIncidentDrawerOpen(isDrawerOpen);
    return () => setIncidentDrawerOpen(false);
  }, [isDrawerOpen]);

  // Giữ khóa mềm suốt cả bước thẩm định lẫn bước điều xe (duyệt không nhả khóa ở backend).
  const lockedId = dispatchingId ?? selectedId;
  const holdsLock = incidents.find((inc) => inc.id === lockedId)?.lock?.operatorId === currentOperatorId;
  useEffect(() => {
    if (!lockedId || !holdsLock) return;
    const interval = setInterval(() => lockIncident(lockedId), LOCK_RENEW_MS);
    return () => clearInterval(interval);
  }, [lockedId, holdsLock]);

  // Mở ca = nhận khóa mềm 2 phút. Ca đang bị người khác giữ vẫn mở được ở chế độ chỉ xem.
  const acquireLock = async (id: string) => {
    setLockingId(id);
    const result = await lockIncident(id);
    setLockingId(null);
    if (!result.ok) setActionError(result.message ?? null);
  };

  const handleSelect = (id: string) => {
    if (selectedId && selectedId !== id) releaseIncident(selectedId);
    setActionError(null);
    setSelectedId(id);

    const target = pendingIncidents.find((inc) => inc.id === id);
    const heldByOther =
      target?.lock &&
      target.lock.operatorId !== currentOperatorId &&
      new Date(target.lock.expiresAt).getTime() > Date.now();
    if (!heldByOther) acquireLock(id);
  };

  // Mở từ thông báo tin báo mới ("Thẩm định ngay") → mở sẵn ca đó. Chờ ca có trong danh sách rồi mới mở.
  const location = useLocation();
  const openIncidentId = (location.state as { openIncidentId?: string } | null)?.openIncidentId;
  const [openedFromState, setOpenedFromState] = useState<string | null>(null);
  const openKey = openIncidentId ? `${location.key}:${openIncidentId}` : null;
  useEffect(() => {
    if (!openKey || openedFromState === openKey) return;
    if (!pendingIncidents.some((inc) => inc.id === openIncidentId)) return;
    setOpenedFromState(openKey);
    handleSelect(openIncidentId!);
  }, [openKey, pendingIncidents]);

  const handleClose = () => {
    if (selectedId) releaseIncident(selectedId);
    setSelectedId(null);
  };

  const handleApprove = async (
    id: string,
    confirmedSeverity: SeverityLevel,
    overrideReason: string | undefined,
    category: IncidentCategory | undefined,
    trafficJam: TrafficJamDecision | undefined
  ) => {
    setSubmittingId(id);
    setActionError(null);
    const result = await approveIncident(id, confirmedSeverity, overrideReason, category, trafficJam);
    setSubmittingId(null);
    if (result.ok) {
      // FR-OP-04: duyệt xong chuyển thẳng sang bước điều xe, vẫn giữ khóa (không nhả ở đây).
      setSelectedId(null);
      setDispatchingId(id);
    } else {
      setActionError(result.message ?? t('incidents.page.approveFailed'));
    }
  };

  // Hoàn tất / Để sau / X → ở lại Hàng đợi (ca chờ kế tiếp) kèm thông báo ngắn có lối sang Live Map.
  const closeDispatch = (showNotice = true) => {
    if (dispatchingId) {
      releaseIncident(dispatchingId);
      const incident = incidents.find((inc) => inc.id === dispatchingId);
      if (showNotice && incident && incident.status === 'approved') {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        setDispatchNotice({
          incidentId: incident.id,
          title: incident.title,
          vehicleCount: incident.assignedVehicleIds.length - incident.reportedVehicleIds.length,
        });
        noticeTimerRef.current = setTimeout(() => setDispatchNotice(null), DISPATCH_NOTICE_MS);
      }
    }
    setDispatchingId(null);
  };

  const openOnLiveMap = (id: string) => {
    closeDispatch(false);
    setDispatchNotice(null);
    navigate(LIVE_MAP_PATH, { state: { focusIncidentId: id } });
  };

  const handleReject = async (
    id: string,
    reason: string,
    blockDuration: BlockDuration | null,
    reasonCode: OperatorCancellationCode
  ) => {
    setSubmittingId(id);
    setActionError(null);
    const result = await rejectIncident(id, reason, blockDuration, reasonCode);
    setSubmittingId(null);
    if (result.ok) {
      setSelectedId(null);
    } else {
      setActionError(result.message ?? t('incidents.page.rejectFailed'));
    }
  };

  const handleTransfer = async (id: string, stationId: string, reason: string) => {
    setSubmittingId(id);
    setActionError(null);
    const result = await transferIncident(id, stationId, reason);
    setSubmittingId(null);
    if (result.ok) setSelectedId(null);
    else setActionError(result.message ?? t('incidents.page.transferFailed'));
  };

  // Trạm nhận được: mọi trạm đang hoạt động trừ trạm đang phụ trách sự cố.
  const transferStations = useMemo(
    () => stations.filter((st) => st.id !== selectedIncident?.responsibleStationId),
    [stations, selectedIncident?.responsibleStationId]
  );

  if (stationNotAssigned) return <StationNotAssigned message={stationNotAssigned} />;

  return (
    <div className="h-full">
      <IncidentQueueList
        incidents={pendingIncidents}
        highlightIds={highlightIncidentIds}
        escalatedIds={escalatedIncidentIds}
        selectedId={selectedId}
        currentOperatorId={currentOperatorId}
        onSelect={handleSelect}
        isLoading={incidentsLoading}
        loadError={incidentsError}
        activeIncidentCount={activeIncidentCount}
        onOpenLiveMap={() => navigate(LIVE_MAP_PATH)}
      />

      {dispatchNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1300] w-[min(560px,calc(100%-2rem))]">
          <div
            role="status"
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm animate-drawer-in ${
              dispatchNotice.vehicleCount > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {dispatchNotice.vehicleCount > 0 ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1 min-w-0">
              {dispatchNotice.vehicleCount > 0
                ? t('incidents.dispatchStep.notice.dispatched', {
                    count: dispatchNotice.vehicleCount,
                    title: dispatchNotice.title,
                  })
                : t('incidents.dispatchStep.notice.deferred', { title: dispatchNotice.title })}
            </span>
            <button
              onClick={() => openOnLiveMap(dispatchNotice.incidentId)}
              className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-white shadow-sm text-xs font-bold hover:bg-white/70"
            >
              <MapIcon className="w-3.5 h-3.5" />
              {t('incidents.dispatchStep.notice.view')}
            </button>
            <button
              onClick={() => setDispatchNotice(null)}
              aria-label={t('common.close')}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <IncidentDetailDrawer
        incident={selectedIncident}
        currentOperatorId={currentOperatorId}
        isEscalated={!!selectedId && escalatedIncidentIds.has(selectedId)}
        isLocking={lockingId === selectedId}
        onClose={handleClose}
        onApprove={handleApprove}
        onReject={handleReject}
        onTransfer={handleTransfer}
        transferStations={transferStations}
        onRelock={(id) => {
          setActionError(null);
          acquireLock(id);
        }}
        onRevealPhone={revealReporterPhone}
        onUnlinkReport={unlinkLinkedReport}
        supplementVersion={selectedId ? supplementVersions.get(selectedId) ?? 0 : 0}
        isSubmitting={submittingId === selectedId}
        errorMsg={actionError}
      />

      {dispatchingId && (
        <QueueDispatchDrawer
          key={dispatchingId}
          incidentId={dispatchingId}
          onClose={() => closeDispatch()}
          onOpenLiveMap={openOnLiveMap}
        />
      )}
    </div>
  );
};
