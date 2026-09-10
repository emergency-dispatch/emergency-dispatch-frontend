import React from 'react';
import { Inbox, ListChecks } from 'lucide-react';
import { IncidentRow } from './IncidentRow';
import type { Incident } from '../../../types/incident';

interface IncidentQueueListProps {
  incidents: Incident[];
  highlightIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const IncidentQueueList: React.FC<IncidentQueueListProps> = ({
  incidents,
  highlightIds,
  selectedId,
  onSelect,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-6 py-5 border-b border-slate-200 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
          <ListChecks className="w-5 h-5 text-red-600" />
          Incident Queue
        </h1>
        <span className="text-xs font-mono-data text-slate-500 whitespace-nowrap">
          {incidents.length} đang chờ xử lý
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Inbox className="w-8 h-8" />
            <p className="text-sm text-slate-500">Không có sự cố nào đang chờ xử lý</p>
          </div>
        ) : (
          incidents.map((incident) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              isNew={highlightIds.has(incident.id)}
              isSelected={incident.id === selectedId}
              onClick={() => onSelect(incident.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
