import React, { useEffect } from 'react';
import { AlertTriangle, Ban, FileCheck2, History, Map as MapIcon, MapPin, X } from 'lucide-react';
import { AutoDispatchNotice } from './AutoDispatchInfo';
import { AiVotesPanel } from './AiVotesPanel';
import { IncidentAuditTimeline } from './IncidentAuditTimeline';
import { IncidentMediaGallery } from './IncidentMediaGallery';
import { SeverityBadge } from './SeverityBadge';
import { DispatchPlanHint } from '../livemap/DispatchPlanHint';
import { ASSIGNMENT_VEHICLE_STATUS } from '../completion/completionGroups';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useAssignmentTeam } from '../../../hooks/useStationTeams';
import { assignmentPlateLabel, type DispatchAssignmentResponseDto } from '../../../types/dispatch';
import type { Incident } from '../../../types/incident';
import { useTranslation } from '../../../i18n';
import { IncidentCode } from './IncidentCode';

interface AutoDispatchedDrawerProps {
  incident: Incident;
  onClose: () => void;
  /** Đổi mức độ / thu hồi / giao thêm tổ / hủy ca làm trên Live Map (Chi tiết ca). */
  onOpenLiveMap: (incidentId: string) => void;
}

/**
 * §31.E: xem nhanh ca AI đã tự điều phối (tab "AI đã điều phối" của Hàng đợi) — CHỈ XEM, không giữ ca (khóa mềm).
 * Thấy AI sai hoặc cần thêm tổ → "Mở trên Live Map" để thao tác ở một chỗ duy nhất.
 */
export const AutoDispatchedDrawer: React.FC<AutoDispatchedDrawerProps> = ({ incident, onClose, onOpenLiveMap }) => {
  const { t } = useTranslation();
  const { assignmentsByIncident, incidentKindLabel, vehicleLimitFor } = useDispatchStore();
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const assignments = assignmentsByIncident.get(incident.id) ?? [];
  const activeCount = incident.assignedVehicleIds.length - incident.reportedVehicleIds.length;
  // Ca còn mở mà không tổ nào đang xử lý (VD tổ còn lại bị thu hồi sau khi tổ kia đã nghiệm thu — backend không tự đóng ca).
  const noActiveTeam = incident.status === 'approved' && activeCount <= 0;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />
      <aside
        aria-label={t('incidents.autoDispatched.drawerLabel')}
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in"
      >
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: category.color }}>
                  <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
                  {incidentKindLabel(incident)}
                </span>
                <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
                <IncidentCode code={incident.code} className="text-slate-500" />
              </div>
              <h2 className="mt-1.5 text-lg font-bold text-slate-900 leading-snug">{incident.title}</h2>
              <p className="mt-0.5 flex items-start gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" />
                <span className="break-words">{incident.area}</span>
              </p>
            </div>
            <button
              onClick={() => onOpenLiveMap(incident.id)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-red-500"
            >
              <MapIcon className="w-4 h-4" />
              {t('incidents.queue.openOnMap')}
            </button>
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5">
          {noActiveTeam && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
              <span>{t('incidents.autoDispatched.noActiveTeam')}</span>
            </div>
          )}

          <AutoDispatchNotice incident={incident} />
          <AiVotesPanel votes={incident.aiVotes} />

          {incident.media.length > 0 && (
            <IncidentMediaGallery key={incident.id} media={incident.media} title={incident.title} />
          )}

          {incident.aiSummary && (
            <section className="space-y-1">
              <h3 className="text-[13px] font-semibold text-slate-700">{t('incidents.autoDispatched.aiSummary')}</h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{incident.aiSummary}</p>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-[13px] font-semibold text-slate-700">
              {t('incidents.autoDispatched.teams', { count: Math.max(0, activeCount) })}
            </h3>
            <DispatchPlanHint limit={vehicleLimitFor(incident)} />
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-400">{t('incidents.dispatchStep.noneAssigned')}</p>
            ) : (
              <ul className="divide-y divide-slate-100 border-y border-slate-100">
                {assignments.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} />
                ))}
              </ul>
            )}
          </section>

          <details className="group rounded-lg border border-slate-200">
            <summary className="flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold text-slate-700 cursor-pointer select-none">
              <History className="w-4 h-4 text-slate-400" />
              {t('liveMap.recommend.history')}
            </summary>
            <div className="px-3 pb-3">
              <IncidentAuditTimeline incidentId={incident.id} />
            </div>
          </details>
        </div>
      </aside>
    </>
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
        {assignment.status === 'Rejected' ? t('incidents.autoDispatched.rejected') : t('incidents.autoDispatched.recalled')}
      </span>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {team?.name ?? t('liveMap.incidentList.vehicleNoTeam')}
          {assignment.isSelfDispatched && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Tổ tự nhận · Đang xử lý tại hiện trường
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500 truncate">
          <span className="font-mono-data">{plate}</span>
          {unitType && ` · ${unitTypeLabel(unitType)}`}
        </p>
      </div>
      <span className="shrink-0 text-xs">{statusEl}</span>
    </li>
  );
};
