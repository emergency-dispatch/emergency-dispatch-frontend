import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Gauge,
  HandHelping,
  History,
  MessageSquarePlus,
  X,
  Loader2,
  Plus,
  Radar,
  Radio,
  Users,
} from 'lucide-react';
import { ChangeSeverityDialog } from './ChangeSeverityDialog';
import { DispatchShortages } from './DispatchShortages';
import { GpsFarNote } from './GpsFarNote';
import { OffPlanTeams } from './OffPlanTeams';
import { PlanTeamGroups } from './PlanTeamGroups';
import { SupportConfirmDialog, type SupportRow } from './SupportConfirmDialog';
import { RecommendedTeamLabel } from '../teams/RecommendedTeamLabel';
import { IncidentAuditTimeline } from '../incidents/IncidentAuditTimeline';
import { IncidentThumbnail } from '../incidents/IncidentThumbnail';
import { IncidentSupplementList } from '../incidents/IncidentSupplementList';
import { LinkedReportsPanel } from '../incidents/LinkedReportsPanel';
import { SeverityBadge } from '../incidents/SeverityBadge';
import { SourceChip } from '../incidents/SourceChip';
import { INCIDENT_CATEGORY_META, OVERRIDE_REASON_MIN_LENGTH } from '../../../data/incidentMock';
import { DISPATCH_ALGORITHM_META } from '../../../data/dispatchConfig';
import { useDispatchStore, type AssignOptions, type TeamAssignTarget } from '../../../context/DispatchContext';
import { useDispatchNeeds } from '../../../hooks/useDispatchNeeds';
import { useDispatchRecommendations } from '../../../hooks/useDispatchRecommendations';
import { usePlanProgress } from '../../../hooks/usePlanProgress';
import { useIncidentSupplements } from '../../../hooks/useIncidentSupplements';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import type { DispatchAlgorithm, DispatchCandidate, DispatchTeamCandidate } from '../../../types/vehicle';
import type { FieldRequestDto } from '../../../types/fieldRequest';
import { showToast } from '../../admin/common/toastStore';
import { useTranslation } from '../../../i18n';
import { AutoDispatchNotice } from '../incidents/AutoDispatchInfo';
import { IncidentCode } from '../incidents/IncidentCode';

interface DispatchRecommendPanelProps {
  selectedIncidentId: string | null;
  /** Tổ đang được giao, `ASSIGNING_MANY` = nhiều tổ một lệnh (hiện vòng xoay, khóa các nút giao khác). */
  assigningTeamId: string | null;
  /**
   * Các tổ + chức năng + thuật toán đang chọn — để LiveMapPage gọi đúng thuật toán; options khi giao thêm tổ cho
   * Cấp 1–2 hoặc giao ngoài kế hoạch. Trả true khi giao xong.
   */
  onAssign: (targets: TeamAssignTarget[], algorithm: DispatchAlgorithm, options?: AssignOptions) => Promise<boolean>;
  /**
   * §21.2: yêu cầu chi viện (Backup) đang được đáp ứng cho sự cố đang chọn → chọn nhiều tổ, giao một lần kèm
   * fieldRequestId (vượt giới hạn Cấp 1–2 không cần lý do; Cấp 3 vẫn tối đa 5 xe).
   */
  fieldRequest?: FieldRequestDto | null;
  onExitFieldRequest?: () => void;
  /** Quay về danh sách ca (panel trái 2 tầng của Live Map). */
  onBack: () => void;
  /** Mở ca khác (ca đang giữ xe mà ca này thiếu). */
  onOpenIncident?: (incidentId: string) => void;
  /** Mở Hồ sơ ca (ảnh, người báo, kết quả AI, lịch sử). */
  onOpenDossier: () => void;
  /** Số ca đang cần xử lý — hiện cạnh nút quay lại để Operator biết còn việc khác. */
  attentionCount: number;
  /** Phần ca: thông báo đội, tổ đã giao (thu hồi), hủy ca, nghiệm thu — đặt trên gợi ý xe. */
  caseBody?: React.ReactNode;
}

export const DispatchRecommendPanel: React.FC<DispatchRecommendPanelProps> = ({
  selectedIncidentId,
  assigningTeamId,
  onAssign,
  fieldRequest = null,
  onExitFieldRequest,
  onBack,
  onOpenIncident,
  onOpenDossier,
  attentionCount,
  caseBody,
}) => {
  const {
    incidents,
    escalatedIncidentIds,
    unlinkLinkedReport,
    changeIncidentSeverity,
    currentOperatorId,
    supplementVersions,
    assignForFieldRequest,
    vehicleLimitFor,
  } = useDispatchStore();
  // Tổ đã chọn / lỗi gắn với id yêu cầu → đổi yêu cầu là tự bỏ, không cần effect reset.
  const [requestSelection, setRequestSelection] = useState<{ requestId: string; ids: string[] }>({ requestId: '', ids: [] });
  const [requestError, setRequestError] = useState<{ requestId: string; message: string } | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [algorithm, setAlgorithm] = useState<DispatchAlgorithm>('nearest');
  // §34: chức năng Operator chọn cho từng tổ có nhiều chức năng (teamId → mã loại xe).
  const [optionByTeam, setOptionByTeam] = useState<Record<string, string>>({});
  // Cấp 1–2 đã đủ 1 tổ: backend cho giao thêm khi có lý do ≥ 5 ký tự.
  const [extraMode, setExtraMode] = useState(false);
  const [extraReason, setExtraReason] = useState('');
  // Ca đã có xe, không ai từ chối: gợi ý xe chỉ mở khi Operator bấm "Giao thêm xe".
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // BR-07: hộp thoại báo cáo trùng đã gom vào sự cố đang chọn.
  const [linkedOpen, setLinkedOpen] = useState(false);
  // §21.1: hộp thoại đổi mức độ + câu backend trả sau khi đổi (có thể nhắc rút bớt xe).
  const [severityOpen, setSeverityOpen] = useState(false);
  // §21.4: hộp thoại thông tin người báo bổ sung (nút chỉ hiện khi đã có bổ sung).
  const [supplementsOpen, setSupplementsOpen] = useState(false);
  const supplements = useIncidentSupplements(
    selectedIncidentId,
    selectedIncidentId ? supplementVersions.get(selectedIncidentId) ?? 0 : 0
  );
  const teamByVehicle = useTeamByVehicle();
  // Lệnh có tổ trạm khác đang chờ Operator xác nhận; `resolve` trả kết quả về nơi bấm giao.
  const [supportConfirm, setSupportConfirm] = useState<{ rows: SupportRow[]; totalCount: number } | null>(null);
  const supportResolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const answerSupport = (confirmed: boolean) => {
    setSupportConfirm(null);
    supportResolveRef.current?.(confirmed);
    supportResolveRef.current = null;
  };
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const { unitTypeLabel } = useDispatchStore();

  useEffect(() => {
    setExtraMode(false);
    setExtraReason('');
    setRecommendOpen(false);
    setHistoryOpen(false);
    setLinkedOpen(false);
    setSeverityOpen(false);
    setSupplementsOpen(false);
    setOptionByTeam({});
    // Đổi ca lúc đang hỏi → coi như không điều.
    setSupportConfirm(null);
    supportResolveRef.current?.(false);
    supportResolveRef.current = null;
  }, [selectedIncidentId]);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  );

  const progressOf = usePlanProgress();
  const progress = selectedIncident ? progressOf(selectedIncident) : null;
  // BR-14 theo kế hoạch điều xe của loại sự cố (§32).
  const maxVehicles = selectedIncident ? vehicleLimitFor(selectedIncident).max : 1;
  const activeCount = selectedIncident
    ? selectedIncident.assignedVehicleIds.length - selectedIncident.reportedVehicleIds.length
    : 0;
  const isFull = activeCount >= maxVehicles;
  const isCompleted = selectedIncident?.status === 'completed';
  // Backend chỉ cho đổi mức độ sự cố đã xác minh và đang xử lý (Verified / Dispatched / InProgress / Escalated).
  const canChangeSeverity = selectedIncident?.status === 'approved';
  const canAddExtra = isFull && !isCompleted && !!selectedIncident && selectedIncident.severity !== 3;
  const extraReasonValid = extraReason.trim().length >= OVERRIDE_REASON_MIN_LENGTH;
  const serving = !!fieldRequest && !!selectedIncident && !isCompleted;
  // Cấp 3 không vượt được 5 xe kể cả theo yêu cầu chi viện; Cấp 1–2 giao đủ số xe đội xin.
  const level3Remaining = selectedIncident?.severity === 3 ? Math.max(0, maxVehicles - activeCount) : Infinity;
  const pickMax = fieldRequest ? Math.min(fieldRequest.quantity, level3Remaining) : 0;
  // Cần xe ngay: chưa có xe nào, chưa đủ tổ theo kế hoạch, hoặc có đội từ chối / không phản hồi → mở gợi ý sẵn; còn lại
  // chờ Operator bấm.
  const planShort = !!progress && progress.missing.length > 0;
  const needsVehicles =
    !!selectedIncident && (activeCount === 0 || planShort || selectedIncident.responseNotices.length > 0);
  const wantsSuggestions = serving || needsVehicles || recommendOpen || extraMode;
  const showSuggestions =
    !isCompleted && wantsSuggestions && (serving ? pickMax > 0 : !isFull || (canAddExtra && extraMode));
  const isEscalated = selectedIncident ? escalatedIncidentIds.has(selectedIncident.id) : false;
  const category = selectedIncident ? INCIDENT_CATEGORY_META[selectedIncident.category] : null;

  const preferredType = serving ? fieldRequest?.requestedUnitType ?? null : null;
  const { neededTypes, refreshKey } = useDispatchNeeds(selectedIncident, preferredType);

  const { suggestion, loading: suggestionLoading, error: suggestionError } = useDispatchRecommendations(
    selectedIncidentId,
    !!selectedIncidentId && showSuggestions,
    algorithm,
    refreshKey,
    neededTypes
  );

  // §34: backend chỉ gợi ý tổ có nhân viên đang hoạt động, không bận và có xe đúng chức năng đang Sẵn sàng.
  // Đáp ứng yêu cầu chi viện có chỉ định loại xe → tổ có chức năng đó lên đầu (sort ổn định, giữ thứ tự gợi ý).
  const hasPreferred = (team: DispatchTeamCandidate) => team.options.some((o) => o.unitType === preferredType);
  const teams = preferredType
    ? [...(suggestion?.teams ?? [])].sort((a, b) => Number(hasPreferred(b)) - Number(hasPreferred(a)))
    : suggestion?.teams ?? [];
  const optionOf = (team: DispatchTeamCandidate): DispatchCandidate =>
    team.options.find((o) => o.unitType === optionByTeam[team.teamId]) ??
    team.options.find((o) => o.unitType === preferredType) ??
    team.options[0];
  const targetOf = (team: DispatchTeamCandidate): TeamAssignTarget => ({
    teamId: team.teamId,
    teamName: team.teamName,
    unitType: optionOf(team).unitType,
  });
  /** Hỏi xác nhận khi lệnh có tổ trạm khác; không có thì cho qua. */
  const confirmSupport = (targets: TeamAssignTarget[]): Promise<boolean> => {
    const rows = targets.flatMap((target) => {
      const team = teams.find((item) => item.teamId === target.teamId && item.isSupportUnit);
      const option = team?.options.find((o) => o.unitType === target.unitType);
      return team && option ? [{ team, option }] : [];
    });
    if (rows.length === 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      supportResolveRef.current?.(false);
      supportResolveRef.current = resolve;
      setSupportConfirm({ rows, totalCount: targets.length });
    });
  };
  const assignTargets = async (targets: TeamAssignTarget[]): Promise<boolean> =>
    (await confirmSupport(targets)) && onAssign(targets, algorithm, assignOptions);
  const selectedForRequest =
    fieldRequest && requestSelection.requestId === fieldRequest.id
      ? requestSelection.ids.filter((id) => teams.some((team) => team.teamId === id))
      : [];
  const requestErrorMessage =
    fieldRequest && requestError?.requestId === fieldRequest.id ? requestError.message : null;

  const toggleRequestTeam = (teamId: string) => {
    if (!fieldRequest) return;
    const ids = selectedForRequest.includes(teamId)
      ? selectedForRequest.filter((id) => id !== teamId)
      : selectedForRequest.length < pickMax
        ? [...selectedForRequest, teamId]
        : selectedForRequest;
    setRequestSelection({ requestId: fieldRequest.id, ids });
  };

  const handleServeRequest = async () => {
    if (!fieldRequest || !selectedIncident || selectedForRequest.length === 0) return;
    const targets = teams.filter((team) => selectedForRequest.includes(team.teamId)).map(targetOf);
    if (!(await confirmSupport(targets))) return;
    setRequestBusy(true);
    setRequestError(null);
    const res = await assignForFieldRequest(fieldRequest.id, selectedIncident.id, targets, algorithm);
    setRequestBusy(false);
    if (!res.ok) {
      setRequestError({ requestId: fieldRequest.id, message: res.message ?? t('context.assignFailed') });
      return;
    }
    showToast(t('liveMap.fieldRequests.served'));
    onExitFieldRequest?.();
  };
  const assignOptions: AssignOptions | undefined =
    isFull && extraMode ? { allowExtraUnits: true, notes: extraReason.trim() } : undefined;
  const assignBlocked = isFull && extraMode && !extraReasonValid;
  // Có kế hoạch → chia nhóm theo chức năng, giao nhiều tổ một lệnh; đáp ứng chi viện giữ danh sách chọn riêng.
  const grouped = !serving && !!progress && progress.items.length > 0;


  return (
    <div className="h-full flex flex-col bg-white">
      {historyOpen && selectedIncident && (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('liveMap.recommend.historyDialog')}
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-[11px] font-mono-data uppercase tracking-widest text-slate-500">{t('liveMap.recommend.history')}</p>
                <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{selectedIncident.title}</p>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                aria-label={t('common.close')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <IncidentAuditTimeline incidentId={selectedIncident.id} />
            </div>
          </div>
        </div>
      )}
      {linkedOpen && selectedIncident && (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('liveMap.recommend.linkedDialog')}
          onClick={() => setLinkedOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-[11px] font-mono-data uppercase tracking-widest text-slate-500">
                  {t('liveMap.recommend.linkedDialog')}
                </p>
                <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{selectedIncident.title}</p>
              </div>
              <button
                onClick={() => setLinkedOpen(false)}
                aria-label={t('common.close')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <LinkedReportsPanel
                key={selectedIncident.id}
                parentIncidentId={selectedIncident.id}
                linkedReportCount={selectedIncident.linkedReportCount}
                onUnlink={unlinkLinkedReport}
                // Hết báo cáo gộp → đóng hộp thoại, Operator quay lại điều phối.
                onAllHandled={() => setLinkedOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
      {supplementsOpen && selectedIncident && (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('liveMap.recommend.supplementsDialog')}
          onClick={() => setSupplementsOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-[11px] font-mono-data uppercase tracking-widest text-slate-500">
                  {t('liveMap.recommend.supplementsDialog')}
                </p>
                <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{selectedIncident.title}</p>
              </div>
              <button
                onClick={() => setSupplementsOpen(false)}
                aria-label={t('common.close')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <IncidentSupplementList
                items={supplements.items}
                loading={supplements.loading}
                error={supplements.error}
                onReload={supplements.reload}
              />
            </div>
          </div>
        </div>
      )}
      {supportConfirm && (
        <SupportConfirmDialog
          rows={supportConfirm.rows}
          totalCount={supportConfirm.totalCount}
          onCancel={() => answerSupport(false)}
          onConfirm={() => answerSupport(true)}
        />
      )}
      {severityOpen && selectedIncident && (
        <ChangeSeverityDialog
          key={selectedIncident.id}
          incident={selectedIncident}
          currentOperatorId={currentOperatorId}
          activeVehicleCount={activeCount}
          onClose={() => setSeverityOpen(false)}
          onSubmit={(severity, category, reason, incidentTypeCode) =>
            changeIncidentSeverity(selectedIncident.id, severity, category, reason, incidentTypeCode)
          }
          onDone={(message) => {
            setSeverityOpen(false);
            if (message) showToast(message);
          }}
        />
      )}
      {/* Header: quay lại danh sách + ca đang chọn */}
      <div className="shrink-0 px-4 py-3.5 border-b border-slate-200">
        <button
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('liveMap.detail.back')}
          {attentionCount > 0 && (
            <span className="text-red-600">{t('liveMap.detail.attention', { count: attentionCount })}</span>
          )}
        </button>
        {selectedIncident && category ? (
          <>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={onOpenDossier}
                tabIndex={-1}
                aria-hidden
                className="shrink-0"
              >
                <IncidentThumbnail incident={selectedIncident} className="w-16 h-16" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold" style={{ color: category.color }}>
                    <category.icon className="w-3.5 h-3.5 shrink-0" />
                    {incidentKindLabel(selectedIncident)}
                  </span>
                  <SeverityBadge severity={selectedIncident.severity} unclassified={selectedIncident.aiUnclassified} />
                  <SourceChip source={selectedIncident.source} />
                  {isEscalated && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600 whitespace-nowrap text-[9px] font-bold text-white uppercase animate-pulse">
                      {t('liveMap.recommend.escalated')}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900 truncate leading-snug">{selectedIncident.title}</p>
                <p className="text-[10px] leading-relaxed text-slate-500 break-words mt-0.5">
                  {selectedIncident.code && (
                    <>
                      <IncidentCode code={selectedIncident.code} className="font-semibold text-slate-600" />
                      {' · '}
                    </>
                  )}
                  {selectedIncident.area}
                </p>
              </div>
            </div>
            <AutoDispatchNotice incident={selectedIncident} showTally className="mt-2" />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                onClick={onOpenDossier}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-800 hover:bg-slate-100"
              >
                <FileText className="w-3 h-3" />
                {t('liveMap.dossier.title')}
              </button>
              <button
                onClick={() => setHistoryOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <History className="w-3 h-3" />
                {t('liveMap.recommend.history')}
              </button>
              {canChangeSeverity && (
                <button
                  onClick={() => setSeverityOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Gauge className="w-3 h-3" />
                  {t('liveMap.recommend.changeSeverity')}
                </button>
              )}
              {selectedIncident.linkedReportCount > 0 && (
                <button
                  onClick={() => setLinkedOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Users className="w-3 h-3" />
                  {t('liveMap.recommend.linkedReports', { count: selectedIncident.linkedReportCount })}
                </button>
              )}
              {(supplements.items.length > 0 || supplements.error) && (
                <button
                  onClick={() => setSupplementsOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-amber-300 bg-amber-50 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                >
                  <MessageSquarePlus className="w-3 h-3" />
                  {t('liveMap.recommend.supplements', { count: supplements.items.length })}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Radar className="w-4 h-4 text-red-600 shrink-0" />
              {t('liveMap.recommend.title')}
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">{t('liveMap.recommend.chooseIncident')}</p>
          </>
        )}
      </div>

      {/* Thân ca: thông báo đội, tổ đã giao, hủy ca, nghiệm thu → rồi gợi ý xe (khi cần) */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0 space-y-2">
        {caseBody}
        {serving && fieldRequest && (
          <div className="rounded-lg border border-orange-300 bg-orange-50 p-2.5 space-y-1.5">
            <p className="flex items-center gap-1 text-[11px] font-bold text-orange-800">
              <Radio className="w-3.5 h-3.5" />
              {t('liveMap.fieldRequests.serveTitle')}
            </p>
            <p className="text-[11px] text-orange-900 leading-snug">
              {t('liveMap.fieldRequests.serveBody', {
                plate: fieldRequest.plateNumber ?? '—',
                count: fieldRequest.quantity,
                type: fieldRequest.requestedUnitType
                  ? t('liveMap.fieldRequests.serveTypeSuffix', {
                      type: unitTypeLabel(fieldRequest.requestedUnitType ?? ''),
                    })
                  : '',
              })}
            </p>
            {fieldRequest.description && (
              <p className="text-[11px] text-slate-600 italic break-words">“{fieldRequest.description}”</p>
            )}
            {pickMax === 0 ? (
              <p className="text-[11px] font-semibold text-red-600">
                {t('liveMap.fieldRequests.level3Full', { max: maxVehicles })}
              </p>
            ) : (
              pickMax < fieldRequest.quantity && (
                <p className="text-[11px] text-amber-700">
                  {t('liveMap.fieldRequests.level3Remaining', { max: maxVehicles, count: pickMax })}
                </p>
              )
            )}
            {requestErrorMessage && <p className="text-[11px] text-red-600">{requestErrorMessage}</p>}
            <button
              onClick={onExitFieldRequest}
              disabled={requestBusy}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50"
            >
              {t('liveMap.fieldRequests.cancelServe')}
            </button>
          </div>
        )}
      {/* Algorithm toggle */}
        {selectedIncident && showSuggestions && (
        <div className="pt-1">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100">
            {(Object.keys(DISPATCH_ALGORITHM_META) as DispatchAlgorithm[]).map((key) => (
              <button
                key={key}
                onClick={() => setAlgorithm(key)}
                title={t(`enums.algorithm.${key}.description`)}
                className={`py-1.5 rounded-md text-[11px] font-bold transition-colors ${algorithm === key ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {t(`enums.algorithm.${key}.label`)}
              </button>
            ))}
          </div>
        </div>
      )}
        {!selectedIncident ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 pb-8">
            <Radar className="w-10 h-10 text-slate-200" />
            <p className="text-xs text-center leading-relaxed">
              {t('liveMap.recommend.emptyLine1')}
              <br />
              {t('liveMap.recommend.emptyLine2')}
            </p>
          </div>
        ) : !showSuggestions ? (
          // Đang đáp ứng yêu cầu nhưng Cấp 3 đã đủ xe → banner phía trên đã giải thích.
          serving ? null : <div className="space-y-2 py-2">
            {(isFull || isCompleted) && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                {isCompleted ? t('liveMap.recommend.incidentClosed') : t('liveMap.recommend.maxReached', { max: maxVehicles })}
              </div>
            )}
            {!isFull && !isCompleted && (
              <button
                onClick={() => setRecommendOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('liveMap.detail.addVehicles')}
              </button>
            )}
            {canAddExtra && (
              <button
                onClick={() => setExtraMode(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-slate-300 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('liveMap.recommend.addExtra')}
              </button>
            )}
          </div>
        ) : (
          <>
            {isFull && extraMode && !serving && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 space-y-1.5 mb-1">
                <p className="text-[11px] text-amber-800">
                  {t('liveMap.recommend.extraPrompt', { level: selectedIncident.severity, count: activeCount })}
                </p>
                <textarea
                  value={extraReason}
                  onChange={(e) => setExtraReason(e.target.value)}
                  rows={2}
                  placeholder={t('liveMap.recommend.extraPlaceholder')}
                  className="w-full rounded border border-amber-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-300"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-700">
                    {extraReasonValid ? '' : t('liveMap.recommend.minChars', { min: OVERRIDE_REASON_MIN_LENGTH })}
                  </span>
                  <button
                    onClick={() => {
                      setExtraMode(false);
                      setExtraReason('');
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    {t('liveMap.recommend.cancelExtra')}
                  </button>
                </div>
              </div>
            )}
            {/* Tiêu đề gợi ý */}
            {(suggestionLoading || suggestion) && (
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="flex items-center gap-1 text-[13px] font-semibold text-slate-700">
                  <Radar className="w-3 h-3" />
                  {t('liveMap.recommend.suitableTeams')}
                  {suggestion && suggestion.radiusKm > 0 && t('liveMap.recommend.radius', { km: suggestion.radiusKm })}
                </span>
                {isEscalated ? (
                  <span className="text-[10px] font-bold text-red-600">{t('liveMap.recommend.radiusDoubled')}</span>
                ) : suggestion?.expanded ? (
                  <span className="text-[10px] font-bold text-amber-600">{t('liveMap.recommend.expanded')}</span>
                ) : null}
              </div>
            )}

            {suggestionLoading && !suggestion && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('liveMap.recommend.searching')}
              </div>
            )}

            {suggestionError && <p className="text-[11px] text-red-600">{suggestionError}</p>}

            {suggestion && grouped && progress && (
              <PlanTeamGroups
                key={selectedIncident.id}
                incidentId={selectedIncident.id}
                onOpenIncident={onOpenIncident}
                suggestion={suggestion}
                items={progress.items}
                slotsLeft={Math.max(0, maxVehicles - activeCount)}
                assignedVehicleIds={selectedIncident.assignedVehicleIds}
                algorithm={algorithm}
                assigningTeamId={assigningTeamId}
                assignBlocked={assignBlocked}
                onAssign={assignTargets}
              />
            )}

            {!grouped && teams.map((team, index) => {
              const option = optionOf(team);
              const isAssigning = assigningTeamId === team.teamId;
              const isPicked = selectedForRequest.includes(team.teamId);
              const leader = teamByVehicle.get(option.vehicleId)?.members.find((m) => m.crewRole === 'commander');
              const distanceLabel = (
                <>
                  {t('liveMap.recommend.distance', { km: option.km.toFixed(1) })}
                  {option.isApproximate && t('liveMap.recommend.approximate')}
                  {t('liveMap.recommend.etaShort', { count: option.etaMinutes })}
                  {algorithm === 'load_aware' && ` · ${option.cost.toFixed(2)}`}
                </>
              );
              return (
                <div
                  key={team.teamId}
                  // Đáp ứng chi viện: bấm thẻ = chọn tổ (ô chọn / nút chức năng bên trong xử lý riêng).
                  onClick={
                    serving && !requestBusy && (isPicked || selectedForRequest.length < pickMax)
                      ? (e) => {
                          if (!(e.target as HTMLElement).closest('button, label, input')) toggleRequestTeam(team.teamId);
                        }
                      : undefined
                  }
                  className={`flex items-center gap-2 border rounded-lg px-2.5 py-2 transition-colors ${serving ? 'cursor-pointer ' : ''}${
                    isPicked
                      ? 'border-orange-300 bg-orange-50'
                      : 'bg-white border-slate-200 hover:border-red-200 hover:bg-red-50/30'
                  }`}
                  title={
                    algorithm === 'load_aware'
                      ? t('liveMap.recommend.costTitle', { load: Math.round(option.stationLoad * 100) })
                      : undefined
                  }
                >
                  <span className="w-5 text-[10px] font-mono-data font-bold text-slate-300 text-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {preferredType && hasPreferred(team) && (
                      <span className="inline-flex items-center mb-0.5 mr-1 px-1.5 py-px rounded bg-orange-50 border border-orange-200 text-[9px] font-bold text-orange-700">
                        {t('liveMap.fieldRequests.preferredType')}
                      </span>
                    )}
                    {team.isSupportUnit && (
                      <span className="inline-flex items-center gap-0.5 mb-0.5 px-1.5 py-px rounded bg-blue-50 border border-blue-200 text-[9px] font-bold text-blue-700">
                        <HandHelping className="w-2.5 h-2.5" />
                        {t('liveMap.recommend.supportUnit', { station: team.stationName })}
                      </span>
                    )}
                    <RecommendedTeamLabel
                      team={team}
                      selected={option}
                      onSelectOption={(unitType) => setOptionByTeam((prev) => ({ ...prev, [team.teamId]: unitType }))}
                      leaderName={leader?.fullName}
                      disabled={!!assigningTeamId || requestBusy}
                      detail={distanceLabel}
                    />
                    <GpsFarNote option={option} />
                  </div>
                  {serving ? (
                    <label className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-orange-200 bg-white text-[10px] font-bold text-orange-700 shrink-0 cursor-pointer has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={isPicked}
                        onChange={() => toggleRequestTeam(team.teamId)}
                        disabled={requestBusy || (!isPicked && selectedForRequest.length >= pickMax)}
                        className="accent-orange-600"
                      />
                      {t('liveMap.fieldRequests.select')}
                    </label>
                  ) : (
                    <button
                      onClick={() => assignTargets([targetOf(team)])}
                      disabled={!!assigningTeamId || assignBlocked}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold shrink-0 transition-colors disabled:opacity-60 ${
                        team.isSupportUnit
                          ? 'border border-blue-200 text-blue-700 hover:bg-blue-50'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      {isAssigning && <Loader2 className="w-3 h-3 animate-spin" />}
                      {t(team.isSupportUnit ? 'liveMap.support.assign' : 'liveMap.recommend.assign')}
                    </button>
                  )}
                </div>
              );
            })}

            {suggestion && !grouped && (
              <DispatchShortages
                shortages={suggestion.shortages}
                incidentId={selectedIncident.id}
                onOpenIncident={onOpenIncident}
              />
            )}

            {suggestion && progress && !serving && (
              <OffPlanTeams
                key={`off-plan-${selectedIncident.id}`}
                incidentId={selectedIncident.id}
                suggestion={suggestion}
                items={progress.items}
                maxVehicles={maxVehicles}
                isFull={isFull}
                algorithm={algorithm}
                refreshKey={refreshKey}
                assigningTeamId={assigningTeamId}
                onAssign={(target, reason) =>
                  onAssign([target], algorithm, { notes: reason, ...(isFull ? { allowExtraUnits: true } : {}) })
                }
              />
            )}

            {serving && teams.length > 0 && (
              <div className="sticky bottom-0 -mx-3 -mb-3 px-3 py-2 bg-white/95 border-t border-orange-200 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-600">
                  {t('liveMap.fieldRequests.selected', { count: selectedForRequest.length, max: pickMax })}
                </span>
                <button
                  onClick={handleServeRequest}
                  disabled={requestBusy || selectedForRequest.length === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                >
                  {requestBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                  {t('liveMap.fieldRequests.assignSelected', { count: selectedForRequest.length })}
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};
