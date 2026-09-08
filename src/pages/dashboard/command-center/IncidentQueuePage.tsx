import React, { useState } from 'react';
import { IncidentDetailDrawer } from '../../../components/dashboard/incidents/IncidentDetailDrawer';
import { IncidentQueueList } from '../../../components/dashboard/incidents/IncidentQueueList';
import { useIncidentQueue } from '../../../hooks/useIncidentQueue';

export const IncidentQueuePage: React.FC = () => {
  const { incidents, highlightIds, updateStatus } = useIncidentQueue();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedIncident = incidents.find((inc) => inc.id === selectedId) ?? null;

  const handleApprove = (id: string) => {
    updateStatus(id, 'approved');
    setSelectedId(null);
  };

  const handleReject = (id: string) => {
    updateStatus(id, 'rejected');
    setSelectedId(null);
  };

  return (
    <div className="h-full">
      <IncidentQueueList
        incidents={incidents}
        highlightIds={highlightIds}
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
