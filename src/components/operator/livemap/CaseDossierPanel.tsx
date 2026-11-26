import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Ban, Clock, Loader2, MapPin } from 'lucide-react';
import { AutoDispatchNotice } from '../incidents/AutoDispatchInfo';
import { DispatchAssignmentList } from '../incidents/DispatchAssignmentList';
import { IncidentAuditTimeline } from '../incidents/IncidentAuditTimeline';
import { IncidentCode } from '../incidents/IncidentCode';
import { AiInsightBlock, CancelCaseFields, ReporterEvidence } from '../incidents/IncidentDossierSections';
import { LinkedReportsPanel } from '../incidents/LinkedReportsPanel';
import { SeverityBadge } from '../incidents/SeverityBadge';
import { SourceChip } from '../incidents/SourceChip';
import { blockDurationOf, EMPTY_CANCEL_INPUT } from '../incidents/cancelCaseInput';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useIncidentSupplements } from '../../../hooks/useIncidentSupplements';
import { useRevealPhone } from '../../../hooks/useRevealPhone';
import type { DispatchAssignmentResponseDto } from '../../../types/dispatch';
import type { BlockDuration, Incident, OperatorCancellationCode } from '../../../types/incident';
import { formatDateTime } from '../../../utils/incidentFormat';
import { useTranslation } from '../../../i18n';

type DossierTab = 'info' | 'linked' | 'history';

interface CaseDossierPanelProps {
  /** Nơi dùng gắn `key={incident.id}` để đổi ca thì bỏ thao tác đang dở. */
  incident: Incident;
  assignments: DispatchAssignmentResponseDto[];
  /** Mở sẵn phần hủy ca (bấm "Hủy ca" ở Chi tiết ca). */
  startCancelling: boolean;
  isCancelling: boolean;
  errorMsg: string | null;
  onBack: () => void;
  onCancelCase: (reason: string, blockDuration: BlockDuration | null, reasonCode: OperatorCancellationCode) => void;
}

/**
 * Hồ sơ của ca đã duyệt / đã điều (người hoặc AI) trong panel trái Live Map: ảnh, người báo, kết quả AI; tab Lịch sử có
 * các lượt điều. Chỉ để xem — điều tổ làm ở Chi tiết ca. Không giữ khóa mềm. Hủy ca làm ở đây để Operator xem lại bằng chứng và chặn được số báo khống.
 */
export const CaseDossierPanel: React.FC<CaseDossierPanelProps> = ({
  incident,
  assignments,
  startCancelling,
  isCancelling,
  errorMsg,
  onBack,
  onCancelCase,
}) => {
  const { t } = useTranslation();
  const { incidentKindLabel, operatorNotesOf, revealReporterPhone, unlinkLinkedReport, supplementVersions } =
    useDispatchStore();
  const supplements = useIncidentSupplements(incident.id, supplementVersions.get(incident.id) ?? 0);
  const phone = useRevealPhone(incident.id, revealReporterPhone);
  const [tab, setTab] = useState<DossierTab>('info');
  const [cancelOpen, setCancelOpen] = useState(startCancelling);
  const [cancelInput, setCancelInput] = useState(EMPTY_CANCEL_INPUT);

  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const canCancel = incident.status === 'approved';
  const cancelling = canCancel && cancelOpen;
  const notes = operatorNotesOf(incident.id);
  // Ca Operator tự tạo không qua AI → không có kết quả để hiện.
  const fromCitizen = incident.source === 'CitizenApp';
  const notesBlock = notes && (
    <section>
      <h3 className="text-[13px] font-semibold text-slate-700 mb-1.5">
        {t(fromCitizen ? 'liveMap.dossier.reviewNotes' : 'liveMap.dossier.operatorReport')}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words">{notes}</p>
    </section>
  );
  const hasAi = fromCitizen || !!incident.aiEngine || !!incident.aiSummary;
  const hasRight = hasAi || !!incident.autoDispatch;

  const tabs: { key: DossierTab; label: string }[] = [
    { key: 'info', label: t('liveMap.dossier.tabInfo') },
    ...(incident.linkedReportCount > 0 || tab === 'linked'
      ? [{ key: 'linked' as const, label: t('incidents.drawer.tabLinked', { count: incident.linkedReportCount }) }]
      : []),
    { key: 'history', label: t('incidents.drawer.tabHistory') },
  ];

  return (
    <aside aria-label={t('liveMap.dossier.title')} className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-5 pt-3.5 pb-3 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('liveMap.dossier.back')}
        </button>
        <h2 className="mt-2.5 text-lg font-bold text-slate-900 leading-snug truncate">{incident.title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <IncidentCode code={incident.code} className="font-semibold text-slate-600" />
          <span className="inline-flex items-center gap-1 font-semibold" style={{ color: category.color }}>
            <CategoryIcon className="w-3.5 h-3.5" />
            {incidentKindLabel(incident)}
          </span>
          <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
          <SourceChip source={incident.source} />
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {t('incidents.row.receivedAt', { time: formatDateTime(incident.createdAt) })}
          </span>
        </div>
        {/* Địa chỉ dòng riêng, xuống dòng đầy đủ (giống panel thẩm định). */}
        <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span className="break-words">{incident.area}</span>
        </p>
      </div>

      <div className="shrink-0 flex gap-1 px-5 pt-2 border-b border-slate-200" role="tablist">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 -mb-px border-b-2 text-sm font-semibold transition-colors ${
              tab === key ? 'border-red-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'history' ? (
          <div className="p-5 space-y-6">
            {assignments.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[13px] font-semibold text-slate-700">
                  {t('liveMap.dossier.dispatches', { count: assignments.length })}
                </h3>
                <DispatchAssignmentList assignments={assignments} />
              </section>
            )}
            <section className="space-y-2">
              <h3 className="text-[13px] font-semibold text-slate-700">{t('liveMap.recommend.history')}</h3>
              <IncidentAuditTimeline incidentId={incident.id} />
            </section>
          </div>
        ) : tab === 'linked' ? (
          <div className="p-5">
            <LinkedReportsPanel
              parentIncidentId={incident.id}
              linkedReportCount={incident.linkedReportCount}
              onUnlink={unlinkLinkedReport}
              onAllHandled={() => setTab('info')}
            />
          </div>
        ) : (
          // Hai cột (từ xl): trái = bằng chứng người báo; phải = kết quả AI (tự điều phối + AI nhận định, gồm cả nhận định
          // ùn tắc) và ghi chú lúc duyệt. Ca không có AI (Operator tạo) → một cột.
          <div className={`grid gap-6 p-5 ${hasRight ? 'xl:grid-cols-2' : 'max-w-3xl'}`}>
            <div className="space-y-5 min-w-0">
              {/* Ca Operator tạo: nội dung tin báo là phần chính nên đứng đầu. */}
              {!fromCitizen && notesBlock}
              <ReporterEvidence
                incident={incident}
                supplements={supplements}
                phone={phone}
                compact
                showLocation={false}
              />
              {fromCitizen && !hasRight && notesBlock}
            </div>
            {hasRight && (
              <div className="space-y-5 min-w-0">
                <AutoDispatchNotice incident={incident} />
                {hasAi && <AiInsightBlock key={incident.id} incident={incident} verified />}
                {fromCitizen && notesBlock}
              </div>
            )}
          </div>
        )}
      </div>

      {canCancel && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 space-y-3">
          {cancelling && (
            <>
              <CancelCaseFields
                incident={incident}
                value={cancelInput}
                onChange={setCancelInput}
                title={t('liveMap.detail.cancelCase')}
              />
              <p className="text-xs text-red-700">{t('liveMap.incidentList.confirmCancel')}</p>
            </>
          )}
          {cancelling && errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            {cancelling ? (
              <>
                <button
                  onClick={() => setCancelOpen(false)}
                  disabled={isCancelling}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  {t('liveMap.incidentList.back')}
                </button>
                <button
                  onClick={() =>
                    onCancelCase(cancelInput.note.trim(), blockDurationOf(incident, cancelInput), cancelInput.code)
                  }
                  disabled={isCancelling}
                  className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  {t('incidents.drawer.confirmReject')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setCancelOpen(true)}
                title={t('liveMap.incidentList.cancelIncidentTitle')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <Ban className="w-4 h-4" />
                {t('liveMap.detail.cancelCase')}
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
