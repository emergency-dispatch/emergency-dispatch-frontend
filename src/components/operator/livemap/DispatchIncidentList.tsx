import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Radio, Route, Siren, Truck, UserX, Users, X } from 'lucide-react';
import { SeverityBadge } from '../incidents/SeverityBadge';
import { SourceChip } from '../incidents/SourceChip';
import { FieldRequestSection } from './FieldRequestSection';
import { getAttentionReason, getCaseGroup, type AttentionReason, type CaseGroup } from './caseGroups';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { MAX_VEHICLES_BY_LEVEL } from '../../../data/dispatchConfig';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useNow } from '../../../hooks/useNow';
import type { FieldRequestDto } from '../../../types/fieldRequest';
import type { Incident } from '../../../types/incident';
import type { Vehicle } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';

const GROUP_ORDER: CaseGroup[] = ['attention', 'active', 'completed'];

interface CaseCardProps {
  incident: Incident;
  reason: AttentionReason | null;
  vehiclesById: Map<string, Vehicle>;
  isSelected: boolean;
  isEscalated: boolean;
  escalationTier: number;
  now: number;
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
  escalationTier,
  now,
  onOpen,
  onAction,
}) => {
  const { t } = useTranslation();
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const waitMinutes = Math.max(0, Math.round((now - new Date(incident.createdAt).getTime()) / 60000));
  const maxVehicles = MAX_VEHICLES_BY_LEVEL[incident.severity];
  const active = incident.assignedVehicleIds
    .filter((id) => !incident.reportedVehicleIds.includes(id))
    .map((id) => vehiclesById.get(id))
    .filter((v): v is Vehicle => !!v);
  // Xe "đi đầu" để tóm tắt tiến độ: xe gần tới nhất (ETA nhỏ nhất), không có thì xe đầu tiên.
  const lead = [...active].sort((a, b) => (a.etaMinutes ?? Infinity) - (b.etaMinutes ?? Infinity))[0];

  const reasonView = reason && (() => {
    switch (reason.kind) {
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
      className={`border-l-[3px] border-b border-b-slate-100 transition-colors ${
        isSelected ? 'border-l-red-600 bg-red-50/60' : 'border-l-transparent hover:bg-slate-50'
      }`}
    >
      <button onClick={onOpen} className="w-full text-left px-4 pt-3 pb-1.5 focus-visible:outline-none focus-visible:bg-slate-50">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold shrink-0" style={{ color: category.color }}>
            <CategoryIcon className="w-3.5 h-3.5" />
            {t(`enums.category.${incident.category}`)}
          </span>
          <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
          {isEscalated && (
            <span className="inline-flex items-center px-1.5 py-px rounded bg-red-600 text-[10px] font-bold text-white">
              {t('liveMap.recommend.escalated')}
            </span>
          )}
          <span className="ml-auto text-[11px] font-mono-data text-slate-400 whitespace-nowrap">
            {t('liveMap.incidentList.minutesShort', { count: waitMinutes })}
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-900 truncate leading-snug">{incident.title}</p>
        <p className="text-[11px] text-slate-500 truncate">{incident.area}</p>
        {(incident.source !== 'CitizenApp' || incident.isOutOfServiceArea || incident.linkedReportCount > 0) && (
          <div className="mt-1 flex flex-wrap gap-1">
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
          </div>
        )}
      </button>

      <div className="px-4 pb-3 flex items-center gap-2 min-h-[28px]">
        {incident.status === 'completed' ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('liveMap.incidentList.closed', { count: incident.reportedVehicleIds.length })}
          </span>
        ) : reasonView ? (
          <>
            <span className={`inline-flex items-center gap-1 min-w-0 text-[11px] font-semibold ${reasonView.className}`}>
              <reasonView.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{reasonView.text}</span>
            </span>
            <button
              onClick={onAction}
              className="ml-auto shrink-0 px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-red-500"
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
  );
};

interface DispatchIncidentListProps {
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  panelError: string | null;
  onClearError: () => void;
  /** §21.2: "Đáp ứng" yêu cầu chi viện → mở Chi tiết ca ở chế độ đáp ứng yêu cầu. */
  onServeFieldRequest: (request: FieldRequestDto) => void;
  /** Yêu cầu cần làm nổi (mở từ thông báo). */
  highlightFieldRequestId: string | null;
}

/**
 * Tầng 1 của panel trái Live Map: các ca sau khi đã duyệt, nhóm theo việc cần làm
 * (Cần xử lý → Đang thực hiện → Đã hoàn tất). Thao tác chi tiết (thu hồi xe, hủy ca, giao thêm) ở Chi tiết ca.
 */
export const DispatchIncidentList: React.FC<DispatchIncidentListProps> = ({
  selectedIncidentId,
  onSelectIncident,
  panelError,
  onClearError,
  onServeFieldRequest,
  highlightFieldRequestId,
}) => {
  const { vehicles, incidents, escalatedIncidentIds, escalationTiers, fieldRequests } = useDispatchStore();
  const now = useNow();
  const { t } = useTranslation();

  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
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

  const groups = useMemo(() => {
    const ctx = { escalatedIds: escalatedIncidentIds, fieldRequestCounts };
    const result: Record<CaseGroup, { incident: Incident; reason: AttentionReason | null }[]> = {
      attention: [],
      active: [],
      completed: [],
    };
    for (const incident of incidents) {
      if (incident.status !== 'approved' && incident.status !== 'completed') continue;
      result[getCaseGroup(incident, ctx)].push({ incident, reason: getAttentionReason(incident, ctx) });
    }
    // Cùng nhóm: leo thang trước, rồi cấp cao trước.
    for (const list of Object.values(result)) {
      list.sort(
        (a, b) =>
          Number(escalatedIncidentIds.has(b.incident.id)) - Number(escalatedIncidentIds.has(a.incident.id)) ||
          b.incident.severity - a.incident.severity
      );
    }
    return result;
  }, [incidents, escalatedIncidentIds, fieldRequestCounts]);

  const total = GROUP_ORDER.reduce((sum, g) => sum + groups[g].length, 0);

  const handleAction = (incident: Incident, reason: AttentionReason | null) => {
    if (reason?.kind === 'field_request') {
      const backup = fieldRequests.find((r) => r.incidentId === incident.id && r.type === 'Backup');
      if (backup) {
        onServeFieldRequest(backup);
        return;
      }
    }
    onSelectIncident(incident.id);
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
        {total === 0 ? (
          <div className="text-center text-xs text-slate-400 py-10">{t('liveMap.incidentList.empty')}</div>
        ) : (
          GROUP_ORDER.filter((g) => groups[g].length > 0).map((group) => (
            <section key={group} aria-label={t(`liveMap.cases.groups.${group}`)}>
              <h3
                className={`sticky top-0 z-10 flex items-center gap-1.5 px-4 py-2 border-b text-[13px] font-semibold ${
                  group === 'attention'
                    ? 'bg-red-50 border-red-100 text-red-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {t(`liveMap.cases.groups.${group}`)}
                <span className="font-normal opacity-70">{groups[group].length}</span>
              </h3>
              {groups[group].map(({ incident, reason }) => (
                <CaseCard
                  key={incident.id}
                  incident={incident}
                  reason={reason}
                  vehiclesById={vehiclesById}
                  isSelected={incident.id === selectedIncidentId}
                  isEscalated={escalatedIncidentIds.has(incident.id)}
                  escalationTier={escalationTiers.get(incident.id) ?? 1}
                  now={now}
                  onOpen={() => onSelectIncident(incident.id)}
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
