import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BotOff, CheckCircle2, ListChecks, Loader2, Lock, Radio, Route, Siren, Truck, UserX, Users, X } from 'lucide-react';
import { IncidentThumbnail } from '../incidents/IncidentThumbnail';
import { SeverityBadge } from '../incidents/SeverityBadge';
import { SourceChip } from '../incidents/SourceChip';
import { StaleChip } from '../incidents/StaleChip';
import { TrafficJamChip } from '../incidents/TrafficJamChip';
import { AiCaseCard } from './AiCaseCard';
import { FieldRequestSection } from './FieldRequestSection';
import { getAttentionReason, getCaseGroup, type AttentionReason, type CaseGroup } from './caseGroups';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { COMPLETION_PATH } from '../../../data/dashboardMock';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import { useDispatchStore } from '../../../context/DispatchContext';
import { usePlanProgress } from '../../../hooks/usePlanProgress';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { useAuth } from '../../../hooks/useAuth';
import { getBusyTeamIds } from '../../../utils/teamAvailability';
import { formatCountdown, formatDateTime, formatWaitDuration } from '../../../utils/incidentFormat';
import type { FieldRequestDto } from '../../../types/fieldRequest';
import type { Incident } from '../../../types/incident';
import type { Vehicle } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';
import { AutoDispatchBadge } from '../incidents/AutoDispatchInfo';
import { IncidentCode } from '../incidents/IncidentCode';
import { useHandoverReasonText } from '../incidents/useHandoverReasonText';
import { isAiWorkingUnheld, usePendingTriage, type AiWorkingItem } from '../incidents/incomingTriage';

const GROUP_ORDER: CaseGroup[] = ['attention', 'active', 'completed'];
/** Ca vừa hoàn tất chỉ hiện chừng này rồi tự ẩn (xem lại ở Nghiệm thu) — Operator mở trang cả ca trực, không để dồn. */
const COMPLETED_VISIBLE_MS = 10 * 60_000;

interface CaseCardProps {
  incident: Incident;
  reason: AttentionReason | null;
  vehiclesById: Map<string, Vehicle>;
  isSelected: boolean;
  isEscalated: boolean;
  /** Ca vừa tới (nháy nền một lần). */
  isNew: boolean;
  escalationTier: number;
  now: number;
  /** Loại xe mà trạm mình còn tổ giao được. */
  readyTypes: Set<string>;
  onOpen: () => void;
  onAction: () => void;
}

/** Thẻ ca trong danh sách: chỉ để quét nhanh — lý do cần xử lý / tiến độ; bấm để mở Chi tiết ca. */
const CaseCard: React.FC<CaseCardProps> = ({
  incident,
  reason,
  vehiclesById,
  isSelected,
  isEscalated,
  isNew,
  escalationTier,
  now,
  readyTypes,
  onOpen,
  onAction,
}) => {
  const { t } = useTranslation();
  const { incidentKindLabel, autoDispatchSettings, currentOperatorId, unitTypeLabel } = useDispatchStore();
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const handoverReasonText = useHandoverReasonText();
  const threshold = Math.round((autoDispatchSettings?.minConfidence ?? 0) * 100);
  const { vehicleLimitFor } = useDispatchStore();
  // BR-14 theo kế hoạch điều xe của loại sự cố (§32).
  const maxVehicles = vehicleLimitFor(incident).max;
  const active = incident.assignedVehicleIds
    .filter((id) => !incident.reportedVehicleIds.includes(id))
    .map((id) => vehiclesById.get(id))
    .filter((v): v is Vehicle => !!v);
  // Xe "đi đầu" để tóm tắt tiến độ: xe gần tới nhất (ETA nhỏ nhất), không có thì xe đầu tiên.
  const lead = [...active].sort((a, b) => (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity))[0];

  // Khóa mềm còn hạn: người khác giữ thì chỉ xem được.
  const lockRemainingMs = incident.lock ? new Date(incident.lock.expiresAt).getTime() - now : 0;
  const lock = incident.lock && lockRemainingMs > 0 ? incident.lock : null;
  const heldByOther = !!lock && lock.operatorId !== currentOperatorId;

  const reasonView = reason && (() => {
    switch (reason.kind) {
      case 'review': {
        return {
          icon: lock ? Lock : BotOff,
          className: !lock ? 'text-amber-800' : heldByOther ? 'text-slate-500' : 'text-blue-700',
          text: lock
            ? lock.operatorId === currentOperatorId
              ? t('liveMap.cases.reason.heldByYou')
              : `${t('liveMap.cases.reason.heldBy', { name: lock.operatorName })} ${formatCountdown(lockRemainingMs)}`
            : reason.handover
              ? t('liveMap.cases.reason.handover', {
                  reason: t(`incidents.row.handover.${reason.handover}`, {
                    confidence: incident.confidenceScore,
                    threshold,
                  }),
                })
              : t('liveMap.cases.reason.waitingReview'),
          // Câu ngắn trên thẻ, rê chuột xem câu đầy đủ.
          title: reason.handover ? handoverReasonText(incident, reason.handover, threshold) : undefined,
          cta: t(heldByOther ? 'liveMap.cases.cta.view' : 'liveMap.cases.cta.review'),
          quiet: heldByOther,
        };
      }
      case 'rejected':
        return {
          icon: UserX,
          className: 'text-red-700',
          text: t(reason.timeout ? 'liveMap.cases.reason.timeout' : 'liveMap.cases.reason.rejected', { plate: reason.plate }),
          cta: t('liveMap.cases.cta.reassign'),
        };
      case 'field_request':
        return {
          icon: Radio,
          className: 'text-orange-700',
          text: t('liveMap.cases.reason.fieldRequest', { count: reason.count }),
          cta: t('liveMap.cases.cta.serve'),
        };
      case 'no_vehicle':
        return {
          icon: Truck,
          className: 'text-amber-700',
          text: t('liveMap.cases.reason.noVehicle'),
          cta: t('liveMap.cases.cta.dispatch'),
        };
      case 'plan_short': {
        const units = reason.missing
          .map((m) => t('liveMap.plan.teams', { count: m.missing, type: unitTypeLabel(m.unitType) }))
          .join(' · ');
        // Trạm hết tổ loại này → không thúc Operator bằng nút đỏ (có thể còn tổ trạm khác, mở ca để xem).
        const exhausted = reason.missing.every((m) => !readyTypes.has(m.unitType));
        return {
          icon: ListChecks,
          className: exhausted ? 'text-slate-600' : 'text-amber-700',
          text: t(exhausted ? 'liveMap.cases.reason.planShortNoTeam' : 'liveMap.cases.reason.planShort', { units }),
          cta: t(exhausted ? 'liveMap.cases.cta.open' : 'liveMap.cases.cta.dispatchMore'),
          quiet: exhausted,
        };
      }
      case 'escalated':
        return {
          icon: Siren,
          className: 'text-red-700',
          text: escalationTier >= 2 ? t('liveMap.incidentList.escalatedTier2') : t('liveMap.incidentList.escalated'),
          cta: t('liveMap.cases.cta.open'),
        };
    }
  })();

  return (
    <div
      className={`flex border-l-[3px] border-b border-b-slate-100 transition-colors ${
        isSelected ? 'border-l-red-600 bg-red-50/60' : 'border-l-transparent hover:bg-slate-50'
      } ${heldByOther && incident.status === 'pending' ? 'opacity-60' : ''} ${isNew ? 'animate-queue-enter' : ''}`}
    >
      {/* Ảnh người dân gửi: cao bằng cả thẻ để nhận ra ca bằng mắt; bấm cũng mở ca (nút chính bên phải đã nhận focus). */}
      <button
        type="button"
        onClick={onOpen}
        tabIndex={-1}
        aria-hidden
        className="shrink-0 self-stretch w-[72px] my-3 ml-3"
      >
        <IncidentThumbnail incident={incident} className="w-full h-full min-h-[72px]" />
      </button>
      <div className="flex-1 min-w-0">
        <button onClick={onOpen} className="w-full text-left pl-3 pr-4 pt-3 pb-1.5 focus-visible:outline-none focus-visible:bg-slate-50">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 min-w-0 text-[11px] font-semibold" style={{ color: category.color }}>
              <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{incidentKindLabel(incident)}</span>
            </span>
            <span className="shrink-0">
              {incident.aiPending ? (
                // AI chưa xong → chưa có cấp; "Chưa phân loại" chỉ dành cho ca AI đã chạy mà không phân loại được.
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-200 bg-indigo-50 text-[11px] font-bold text-indigo-700 whitespace-nowrap">
                  <Loader2 className="w-3 h-3 motion-safe:animate-spin" />
                  {t('liveMap.cases.aiAnalyzing')}
                </span>
              ) : (
                <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
              )}
            </span>
            {/* Lý do cần xử lý đã là leo thang thì dòng dưới đã ghi → không lặp nhãn. */}
            {isEscalated && reason?.kind !== 'escalated' && (
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-1.5 py-px rounded bg-red-600 text-[10px] font-bold text-white">
                {t('liveMap.recommend.escalated')}
              </span>
            )}
            <span
              title={t('incidents.row.receivedAt', { time: formatDateTime(incident.createdAt) })}
              className="ml-auto shrink-0 text-[11px] text-slate-400 whitespace-nowrap"
            >
              {formatWaitDuration(now - new Date(incident.createdAt).getTime())}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900 truncate leading-snug">{incident.title}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {incident.code && (
              <>
                <IncidentCode code={incident.code} />
                {' · '}
              </>
            )}
            {incident.area}
          </p>
          {(incident.source !== 'CitizenApp' ||
            incident.isOutOfServiceArea ||
            incident.linkedReportCount > 0 ||
            !!incident.trafficJam ||
            !!incident.staleFlaggedAt ||
            !!incident.autoDispatch) && (
            // `empty:hidden`: ùn tắc AI đã bác bỏ / chưa xác minh, cờ quá hạn của ca đã duyệt → không có chip.
            <div className="mt-1 flex flex-wrap gap-1 empty:hidden">
              <StaleChip incident={incident} />
              {incident.source !== 'CitizenApp' && <SourceChip source={incident.source} />}
              {incident.isOutOfServiceArea && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-[10px] font-bold text-red-700">
                  {t('liveMap.incidentList.outOfArea')}
                </span>
              )}
              {incident.linkedReportCount > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700">
                  <Users className="w-2.5 h-2.5" />
                  {t('liveMap.incidentList.linkedReports', { count: incident.linkedReportCount })}
                </span>
              )}
              <TrafficJamChip incident={incident} />
              <AutoDispatchBadge incident={incident} />
            </div>
          )}
        </button>

        <div className="pl-3 pr-4 pb-3 flex items-center gap-2 min-h-[28px]">
          {incident.status === 'completed' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('liveMap.incidentList.closed', { count: incident.reportedVehicleIds.length })}
            </span>
          ) : reasonView ? (
            <>
              <span
                title={('title' in reasonView && reasonView.title) || reasonView.text}
                className={`inline-flex items-start gap-1 min-w-0 text-[11px] leading-snug font-semibold ${reasonView.className}`}
              >
                <reasonView.icon className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span className="line-clamp-2">{reasonView.text}</span>
              </span>
              <button
                onClick={onAction}
                className={`ml-auto shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-red-500 ${
                  'quiet' in reasonView && reasonView.quiet
                    ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {reasonView.cta}
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 min-w-0 text-[11px] text-slate-600">
              {lead && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: VEHICLE_STATUS_META[lead.status].color }} />
              )}
              <span className="truncate">
                {lead ? t(`enums.vehicleStatus.${lead.status}`) : t('liveMap.cases.allReported')}
                {lead && lead.etaMinutes !== null && lead.status !== 'awaiting_ack' &&
                  t('liveMap.incidentList.eta', { count: lead.etaMinutes })}
              </span>
              <span className="text-slate-400 shrink-0">
                · {t('liveMap.cases.vehicleCount', { active: active.length, max: maxVehicles })}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface DispatchIncidentListProps {
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  /** Mở thẩm định ca chờ duyệt ngay trong panel. */
  onOpenTriage: (id: string) => void;
  panelError: string | null;
  onClearError: () => void;
  /** §21.2: "Đáp ứng" yêu cầu chi viện → mở Chi tiết ca ở chế độ đáp ứng yêu cầu. */
  onServeFieldRequest: (request: FieldRequestDto) => void;
  /** Yêu cầu cần làm nổi (mở từ thông báo). */
  highlightFieldRequestId: string | null;
  /** Bay tới marker của ca AI đang xử lý (không mở ca). */
  onFocusAiIncident: (id: string) => void;
}

/**
 * Tầng 1 của panel trái Live Map — "Theo dõi ca": mọi ca của trạm, nhóm theo việc cần làm
 * (Cần xử lý → Đang diễn ra → Vừa hoàn tất). Ca AI đang phân tích / điều phối nằm đầu nhóm Đang diễn ra; ca AI chuyển cho
 * người nằm ở Cần xử lý, "Thẩm định" mở ngay trong panel. Thao tác chi tiết (thu hồi xe, hủy ca, giao thêm) ở Chi tiết ca.
 */
export const DispatchIncidentList: React.FC<DispatchIncidentListProps> = ({
  selectedIncidentId,
  onSelectIncident,
  onOpenTriage,
  panelError,
  onClearError,
  onServeFieldRequest,
  highlightFieldRequestId,
  onFocusAiIncident,
}) => {
  const navigate = useNavigate();
  const {
    vehicles,
    incidents,
    incidentsLoading,
    incidentsError,
    highlightIncidentIds,
    escalatedIncidentIds,
    escalationTiers,
    fieldRequests,
  } = useDispatchStore();
  const { items: pendingItems, now } = usePendingTriage();
  const { t } = useTranslation();

  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const progressOf = usePlanProgress();
  const { user } = useAuth();
  const teamByVehicle = useTeamByVehicle();
  const readyTypes = useMemo(() => {
    const busy = getBusyTeamIds(vehicles, teamByVehicle);
    return new Set(
      vehicles
        .filter((v) => {
          const team = teamByVehicle.get(v.id);
          return v.status === 'available' && v.stationId === user?.stationId && !!team?.canBeAssigned && !busy.has(team.id);
        })
        .map((v) => v.unitType)
    );
  }, [vehicles, teamByVehicle, user?.stationId]);
  // Chỉ sự cố đang xử lý của trạm mình mới giao thêm xe được (backend kiểm trạm phụ trách).
  const boardIncidentIds = useMemo(
    () => new Set(incidents.filter((i) => i.status === 'approved').map((i) => i.id)),
    [incidents]
  );
  const fieldRequestCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of fieldRequests) counts.set(r.incidentId, (counts.get(r.incidentId) ?? 0) + 1);
    return counts;
  }, [fieldRequests]);

  const pendingById = new Map(pendingItems.map((item) => [item.incident.id, item] as const));
  // AI đang làm: ca nhận trước lên trước.
  const aiItems: AiWorkingItem[] = pendingItems
    .filter(isAiWorkingUnheld)
    .sort((a, b) => a.incident.createdAt.localeCompare(b.incident.createdAt));
  const aiIds = new Set(aiItems.map((item) => item.incident.id));

  const ctx = {
    escalatedIds: escalatedIncidentIds,
    fieldRequestCounts,
    verdictOf: (incident: Incident) => pendingById.get(incident.id)?.verdict ?? ({ phase: 'manual' } as const),
    missingOf: (incident: Incident) => progressOf(incident).missing,
  };
  const groups: Record<CaseGroup, { incident: Incident; reason: AttentionReason | null }[]> = {
    attention: [],
    active: [],
    completed: [],
  };
  for (const incident of incidents) {
    if (aiIds.has(incident.id)) continue;
    if (
      incident.status === 'completed' &&
      incident.id !== selectedIncidentId &&
      incident.completedAt &&
      now - new Date(incident.completedAt).getTime() > COMPLETED_VISIBLE_MS
    )
      continue;
    groups[getCaseGroup(incident, ctx)].push({ incident, reason: getAttentionReason(incident, ctx) });
  }
  // Cùng nhóm: leo thang trước, rồi cấp cao trước (chưa phân loại xếp như Cấp 3), rồi chờ lâu trước (FIFO, FR-OP-02).
  const rank = (incident: Incident) => (incident.aiUnclassified ? 3 : incident.severity);
  for (const list of Object.values(groups)) {
    list.sort(
      (a, b) =>
        Number(escalatedIncidentIds.has(b.incident.id)) - Number(escalatedIncidentIds.has(a.incident.id)) ||
        rank(b.incident) - rank(a.incident) ||
        a.incident.createdAt.localeCompare(b.incident.createdAt)
    );
  }
  const countOf = (group: CaseGroup) => groups[group].length + (group === 'active' ? aiItems.length : 0);

  const total = GROUP_ORDER.reduce((sum, g) => sum + countOf(g), 0);

  // Ca chờ duyệt mở thẩm định; ca đã duyệt mở Chi tiết ca.
  const handleOpen = (incident: Incident) => {
    if (incident.status === 'pending') onOpenTriage(incident.id);
    else onSelectIncident(incident.id);
  };

  const handleAction = (incident: Incident, reason: AttentionReason | null) => {
    if (reason?.kind === 'field_request') {
      const backup = fieldRequests.find((r) => r.incidentId === incident.id && r.type === 'Backup');
      if (backup) {
        onServeFieldRequest(backup);
        return;
      }
    }
    handleOpen(incident);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-4 py-3.5 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Route className="w-4 h-4 text-red-600 shrink-0" />
          {t('liveMap.cases.title')}
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">{t('liveMap.cases.subtitle')}</p>
      </div>

      {panelError && (
        <div className="shrink-0 mx-3 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="flex-1">{panelError}</span>
          <button onClick={onClearError} className="shrink-0" aria-label={t('liveMap.incidentList.dismissError')}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Lỗi tải danh sách / hủy ca được nhưng chặn số thất bại: không báo thì trông như "không có ca". */}
      {incidentsError && (
        <div
          role="alert"
          className="shrink-0 mx-3 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="flex-1">{incidentsError}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-3 pt-3 empty:hidden">
          <FieldRequestSection
            now={now}
            boardIncidentIds={boardIncidentIds}
            highlightRequestId={highlightFieldRequestId}
            onServe={onServeFieldRequest}
            onSelectIncident={(id) => onSelectIncident(id)}
          />
        </div>
        {total === 0 && incidentsLoading ? (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-10">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('liveMap.cases.loading')}
          </div>
        ) : total === 0 && incidentsError ? null : total === 0 ? (
          <div className="text-center text-xs text-slate-400 py-10">{t('liveMap.incidentList.empty')}</div>
        ) : (
          GROUP_ORDER.filter((g) => countOf(g) > 0).map((group) => (
            <section key={group} aria-label={t(`liveMap.cases.groups.${group}`)}>
              <h3
                className={`sticky top-0 z-10 flex items-center gap-1.5 px-4 py-2 border-b text-[13px] font-semibold ${
                  group === 'attention'
                    ? 'bg-red-50 border-red-100 text-red-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {t(`liveMap.cases.groups.${group}`)}
                <span className="font-normal opacity-70">{countOf(group)}</span>
                {group === 'completed' && (
                  <button
                    type="button"
                    onClick={() => navigate(COMPLETION_PATH)}
                    className="ml-auto text-[11px] font-semibold text-red-600 hover:underline"
                  >
                    {t('liveMap.cases.viewCompletion')}
                  </button>
                )}
              </h3>
              {group === 'active' &&
                aiItems.map((item) => (
                  <AiCaseCard
                    key={item.incident.id}
                    item={item}
                    now={now}
                    onViewOnMap={() => onFocusAiIncident(item.incident.id)}
                  />
                ))}
              {groups[group].map(({ incident, reason }) => (
                <CaseCard
                  key={incident.id}
                  incident={incident}
                  reason={reason}
                  vehiclesById={vehiclesById}
                  isSelected={incident.id === selectedIncidentId}
                  isEscalated={escalatedIncidentIds.has(incident.id)}
                  isNew={highlightIncidentIds.has(incident.id)}
                  escalationTier={escalationTiers.get(incident.id) ?? 1}
                  now={now}
                  readyTypes={readyTypes}
                  onOpen={() => handleOpen(incident)}
                  onAction={() => handleAction(incident, reason)}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
};
