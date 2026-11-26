import React from 'react';
import { Ban, FileCheck2 } from 'lucide-react';
import { ASSIGNMENT_VEHICLE_STATUS } from '../completion/completionGroups';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useAssignmentTeam } from '../../../hooks/useStationTeams';
import { assignmentPlateLabel, type DispatchAssignmentResponseDto } from '../../../types/dispatch';
import { formatDateTime } from '../../../utils/incidentFormat';
import { useTranslation } from '../../../i18n';

/** Mọi lượt điều của ca, kể cả lượt bị thu hồi / từ chối. */
export const DispatchAssignmentList: React.FC<{ assignments: DispatchAssignmentResponseDto[] }> = ({ assignments }) => {
  const { t } = useTranslation();
  if (assignments.length === 0) return <p className="text-sm text-slate-400">{t('incidents.autoDispatched.noneAssigned')}</p>;
  return (
    <ul className="divide-y divide-slate-100 border-y border-slate-100">
      {assignments.map((a) => (
        <AssignmentRow key={a.id} assignment={a} />
      ))}
    </ul>
  );
};

/** Một lượt điều xe: tổ (chốt lúc phát lệnh) + xe + trạng thái. */
const AssignmentRow: React.FC<{ assignment: DispatchAssignmentResponseDto }> = ({ assignment }) => {
  const { t } = useTranslation();
  const { unitTypeLabel } = useDispatchStore();
  const team = useAssignmentTeam()(assignment.rescueUnitId, assignment);
  const vehicleStatus = ASSIGNMENT_VEHICLE_STATUS[assignment.status];
  const plate = assignmentPlateLabel(assignment);
  const unitType = assignment.rescueUnit?.unitType;

  let statusEl: React.ReactNode;
  if (vehicleStatus) {
    statusEl = (
      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: VEHICLE_STATUS_META[vehicleStatus].color }}>
        <span className="w-2 h-2 rounded-full" style={{ background: VEHICLE_STATUS_META[vehicleStatus].color }} />
        {t(`enums.vehicleStatus.${vehicleStatus}`)}
      </span>
    );
  } else if (assignment.status === 'Completed') {
    statusEl = (
      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
        <FileCheck2 className="w-3.5 h-3.5" />
        {t('liveMap.incidentList.reported')}
      </span>
    );
  } else {
    // Cancelled (thu hồi) / Rejected (đội từ chối).
    statusEl = (
      <span className="inline-flex items-center gap-1 font-semibold text-slate-400">
        <Ban className="w-3.5 h-3.5" />
        {assignment.status !== 'Rejected'
          ? t('incidents.autoDispatched.recalled')
          : // §52: quá hạn không nhận lệnh, hệ thống tự rút — không phải đội bấm từ chối.
            assignment.rejectionReason === 'NoResponse'
            ? t('incidents.autoDispatched.noResponse')
            : t('incidents.autoDispatched.rejected')}
      </span>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{team?.name ?? t('liveMap.incidentList.vehicleNoTeam')}</p>
        <p className="text-xs text-slate-500 truncate">
          <span className="font-mono-data">{plate}</span>
          {unitType && ` · ${unitTypeLabel(unitType)}`}
          {` · ${formatDateTime(assignment.dispatchedAt)}`}
        </p>
      </div>
      <span className="shrink-0 text-xs">{statusEl}</span>
    </li>
  );
};
