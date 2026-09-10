import React, { useMemo, useState } from 'react';
import { IncidentDetailDrawer } from '../../../components/dashboard/incidents/IncidentDetailDrawer';
import { IncidentQueueList } from '../../../components/dashboard/incidents/IncidentQueueList';
import { useDispatchStore } from '../../../context/DispatchContext';
import type { IncidentSeverity } from '../../../types/incident';

export const IncidentQueuePage: React.FC = () => {
  const { incidents, highlightIncidentIds, incidentsLoading, incidentsError, approveIncident, rejectIncident } =
    useDispatchStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingIncidents = useMemo(() => incidents.filter((inc) => inc.status === 'pending'), [incidents]);
  const selectedIncident = pendingIncidents.find((inc) => inc.id === selectedId) ?? null;

  const handleApprove = async (id: string, confirmedSeverity: Exclude<IncidentSeverity, 0>) => {
    setSubmittingId(id);
    setActionError(null);
    const ok = await approveIncident(id, confirmedSeverity);
    setSubmittingId(null);
    if (ok) {
      setSelectedId(null);
    } else {
      setActionError('Duyệt sự cố thất bại. Vui lòng thử lại.');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setSubmittingId(id);
    setActionError(null);
    const ok = await rejectIncident(id, reason);
    setSubmittingId(null);
    if (ok) {
      setSelectedId(null);
    } else {
      setActionError('Từ chối sự cố thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="h-full">
      <IncidentQueueList
        incidents={pendingIncidents}
        highlightIds={highlightIncidentIds}
        selectedId={selectedId}
        onSelect={(id) => {
          setActionError(null);
          setSelectedId(id);
        }}
        isLoading={incidentsLoading}
        loadError={incidentsError}
      />

      <IncidentDetailDrawer
        incident={selectedIncident}
        onClose={() => setSelectedId(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        isSubmitting={submittingId === selectedId}
        errorMsg={actionError}
      />
    </div>
  );
};
