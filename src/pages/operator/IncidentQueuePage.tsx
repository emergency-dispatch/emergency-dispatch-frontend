import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IncidentDetailDrawer } from '../../components/operator/incidents/IncidentDetailDrawer';
import { IncidentQueueList } from '../../components/operator/incidents/IncidentQueueList';
import { StationNotAssigned } from '../../components/operator/StationNotAssigned';
import { useDispatchStore } from '../../context/DispatchContext';
import type { BlockDuration, IncidentCategory, OperatorCancellationCode, SeverityLevel } from '../../types/incident';

// Backend giữ khóa mềm 2 phút; gia hạn mỗi 60 giây khi Operator vẫn đang mở ca.
const LOCK_RENEW_MS = 60 * 1000;

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
  } = useDispatchStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingIncidents = useMemo(() => incidents.filter((inc) => inc.status === 'pending'), [incidents]);
  const selectedIncident = pendingIncidents.find((inc) => inc.id === selectedId) ?? null;
  const isDrawerOpen = !!selectedIncident;

  useEffect(() => {
    setIncidentDrawerOpen(isDrawerOpen);
    return () => setIncidentDrawerOpen(false);
  }, [isDrawerOpen]);

  const holdsLock = selectedIncident?.lock?.operatorId === currentOperatorId;
  useEffect(() => {
    if (!selectedId || !holdsLock) return;
    const interval = setInterval(() => lockIncident(selectedId), LOCK_RENEW_MS);
    return () => clearInterval(interval);
  }, [selectedId, holdsLock]);

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
    category: IncidentCategory | undefined
  ) => {
    setSubmittingId(id);
    setActionError(null);
    const result = await approveIncident(id, confirmedSeverity, overrideReason, category);
    setSubmittingId(null);
    if (result.ok) {
      setSelectedId(null);
    } else {
      setActionError(result.message ?? 'Duyệt sự cố thất bại. Vui lòng thử lại.');
    }
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
      setActionError(result.message ?? 'Hủy ca thất bại. Vui lòng thử lại.');
    }
  };

  const handleTransfer = async (id: string, stationId: string, reason: string) => {
    setSubmittingId(id);
    setActionError(null);
    const result = await transferIncident(id, stationId, reason);
    setSubmittingId(null);
    if (result.ok) setSelectedId(null);
    else setActionError(result.message ?? 'Chuyển trạm thất bại. Vui lòng thử lại.');
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
      />

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
        isSubmitting={submittingId === selectedId}
        errorMsg={actionError}
      />
    </div>
  );
};
