import React from 'react';
import { AlertTriangle, Ban, CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, Loader2, X } from 'lucide-react';
import { DispatchTeamLabel } from '../teams/DispatchTeamLabel';
import { useDispatchStore } from '../../../context/DispatchContext';
import { DispatchPlanHint } from './DispatchPlanHint';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import type { Incident } from '../../../types/incident';
import type { DispatchAssignmentResponseDto } from '../../../types/dispatch';
import type { Vehicle } from '../../../types/vehicle';
import { findVehicleAssignment, type CompletionProgress } from '../completion/completionGroups';
import { usePlanProgress } from '../../../hooks/usePlanProgress';
import { useAssignmentTeam } from '../../../hooks/useStationTeams';
import { useTranslation } from '../../../i18n';

interface CaseAssignmentsProps {
  incident: Incident;
  vehiclesById: Map<string, Vehicle>;
  /** Lượt điều phối của sự cố — lấy tổ được giao (§34: tổ chốt lúc phát lệnh). */
  assignments: DispatchAssignmentResponseDto[];
  /** §26.2: số tổ đã ký nghiệm thu / tổng số tổ đang giao (null = chưa giao xe). */
  completion: CompletionProgress | null;
  onOpenCompletion: () => void;
  cancellingVehicleId: string | null;
  onCancelVehicle: (vehicleId: string) => void;
  /** Mở Hồ sơ ca ở phần hủy (xem lại bằng chứng, chặn số). */
  onCancelIncident: () => void;
  onDismissNotice: (noticeId: string) => void;
}

/**
 * Phần "ca" trong Chi tiết ca của Live Map: đội từ chối / không phản hồi, tổ đã giao (thu hồi), lối hủy ca, tiến độ nghiệm thu.
 * Trước đây nằm trong thẻ của danh sách; giờ danh sách chỉ để quét nhanh, thao tác làm ở đây.
 */
export const CaseAssignments: React.FC<CaseAssignmentsProps> = ({
  incident,
  vehiclesById,
  assignments,
  completion,
  onOpenCompletion,
  cancellingVehicleId,
  onCancelVehicle,
  onCancelIncident,
  onDismissNotice,
}) => {
  const { t } = useTranslation();

  const { vehicleLimitFor } = useDispatchStore();
  const assignmentTeam = useAssignmentTeam();
  // BR-14 theo kế hoạch điều xe của loại sự cố (§32).
  const vehicleLimit = vehicleLimitFor(incident);
  const maxVehicles = vehicleLimit.max;
  // Còn thiếu tổ → danh sách gợi ý bên dưới đã ghi số cần từng loại, không cần thêm khung "Chưa giao tổ".
  const planShort = usePlanProgress()(incident).missing.length > 0;
  const assigned = incident.assignedVehicleIds.map((id) => vehiclesById.get(id)).filter((v): v is Vehicle => !!v);
  const activeCount = assigned.filter((v) => !incident.reportedVehicleIds.includes(v.id)).length;
  const isCompleted = incident.status === 'completed';

  return (
    <section className="space-y-2">
      {incident.responseNotices.map((notice) => (
        <div
          key={notice.id}
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="flex-1 leading-snug">
            <strong className="font-mono-data">{notice.plate}</strong>{' '}
            {notice.kind === 'rejected' ? t('liveMap.incidentList.noticeRejected') : t('liveMap.incidentList.noticeTimeout')}
            {t('liveMap.incidentList.noticeSuffix')}
          </span>
          <button
            onClick={() => onDismissNotice(notice.id)}
            aria-label={t('common.close')}
            className="shrink-0 text-red-400 hover:text-red-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {isCompleted ? (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          {t('liveMap.incidentList.closed', { count: incident.reportedVehicleIds.length })}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-slate-700">
              {t('liveMap.incidentList.assignedTeams', { active: activeCount, max: maxVehicles })}
            </h3>
            <button
              onClick={onCancelIncident}
              title={t('liveMap.incidentList.cancelIncidentTitle')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50"
            >
              <Ban className="w-3 h-3" />
              {t('liveMap.detail.cancelCase')}
            </button>
          </div>
          <DispatchPlanHint limit={vehicleLimit} />

          {assigned.length === 0 ? (
            !planShort && <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
              <span className="text-xs font-semibold">{t('liveMap.incidentList.noTeamAssigned')}</span>
            </div>
          ) : (
            assigned.map((vehicle) => {
              const statusMeta = VEHICLE_STATUS_META[vehicle.status];
              const hasReported = incident.reportedVehicleIds.includes(vehicle.id);
              const canRecall = !hasReported && !!vehicle.assignmentId && vehicle.status !== 'on_scene';
              const team = assignmentTeam(
                vehicle.id,
                findVehicleAssignment(assignments, vehicle.id, vehicle.assignmentId)
              );
              const progressEl = (
                <>
                  {' · '}
                  {hasReported ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                      <FileCheck2 className="w-2.5 h-2.5" />
                      {t('liveMap.incidentList.reported')}
                    </span>
                  ) : (
                    <span style={{ color: statusMeta.color }} className="font-semibold">
                      {t(`enums.vehicleStatus.${vehicle.status}`)}
                    </span>
                  )}
                  {!hasReported &&
                    vehicle.etaMinutes !== null &&
                    vehicle.status !== 'awaiting_ack' &&
                    t('liveMap.incidentList.eta', { count: vehicle.etaMinutes })}
                </>
              );
              return (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2"
                >
                  {team?.team ? (
                    <DispatchTeamLabel team={team.team} name={team.name} vehicle={vehicle} detail={progressEl} />
                  ) : team ? (
                    // Tổ trạm khác đi hỗ trợ (không xem được chi tiết tổ) → tên tổ + biển số.
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{team.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        <span className="font-mono-data">{vehicle.plate}</span>
                        {progressEl}
                      </p>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-amber-700 truncate">{t('liveMap.incidentList.vehicleNoTeam')}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        <span className="font-mono-data">{vehicle.plate}</span>
                        {progressEl}
                      </p>
                    </div>
                  )}
                  {canRecall && (
                    <button
                      onClick={() => onCancelVehicle(vehicle.id)}
                      disabled={!!cancellingVehicleId}
                      title={t('liveMap.incidentList.recallTitle')}
                      aria-label={t('liveMap.incidentList.recallTitle')}
                      className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0 disabled:opacity-40"
                    >
                      {cancellingVehicleId === vehicle.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}

          {completion && completion.total > 0 && (
            <button
              onClick={onOpenCompletion}
              className={`w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                completion.done === completion.total
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">{t('incidents.completion.progress', { ...completion })}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>
          )}
        </>
      )}
    </section>
  );
};
