import React, { useMemo, useState } from 'react';
import { IncidentDetailDrawer } from '../../../components/dashboard/incidents/IncidentDetailDrawer';
import { IncidentQueueList } from '../../../components/dashboard/incidents/IncidentQueueList';
import { useDispatchStore } from '../../../context/DispatchContext';

export const IncidentQueuePage: React.FC = () => {
  const { incidents, highlightIncidentIds, updateIncidentStatus } = useDispatchStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pendingIncidents = useMemo(() => incidents.filter((inc) => inc.status === 'pending'), [incidents]);
  const selectedIncident = pendingIncidents.find((inc) => inc.id === selectedId) ?? null;

  const handleApprove = (id: string) => {
    updateIncidentStatus(id, 'approved');
    setSelectedId(null);
  };

  const handleReject = (id: string) => {
    updateIncidentStatus(id, 'rejected');
    setSelectedId(null);
  };

  return (
    <div className="h-full">
      <IncidentQueueList
        incidents={pendingIncidents}
        highlightIds={highlightIncidentIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <IncidentDetailDrawer
        incident={selectedIncident}
        onClose={() => setSelectedId(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};
