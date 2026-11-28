import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Map as MapIcon, X } from 'lucide-react';
import { IncidentDetailDrawer } from '../../components/operator/incidents/IncidentDetailDrawer';
import { IncidentQueueList, type QueueTab } from '../../components/operator/incidents/IncidentQueueList';
import { QueueDispatchDrawer } from '../../components/operator/incidents/QueueDispatchDrawer';
import { AutoDispatchedDrawer } from '../../components/operator/incidents/AutoDispatchedDrawer';
import { StationNotAssigned } from '../../components/operator/StationNotAssigned';
import { useDispatchStore } from '../../context/DispatchContext';
import { useIncidentTriage } from '../../hooks/useIncidentTriage';
import { useTranslation } from '../../i18n';

// Thông báo sau khi đóng bước Điều xe tự tắt sau ngần này.
const DISPATCH_NOTICE_MS = 8000;
const LIVE_MAP_PATH = '/dashboard/command-center/live-map';

interface DispatchNotice {
  incidentId: string;
  title: string;
  /** Số xe đang giao cho ca; 0 = Operator chọn "Để sau". */
  vehicleCount: number;
}

/**
 * Hàng đợi thẩm định (FR-OP-02): ca chờ duyệt xếp theo ưu tiên, mở ca → drawer thẩm định một cột bên phải; duyệt xong
 * sang thẳng bước "Điều xe" (FR-OP-04). Không giữ khóa mềm (bỏ 2026-11-26: mỗi trạm một Operator mỗi ca làm) nên mở ca
 * không chặn AI tự điều phối — AI điều xong trước khi duyệt thì drawer tự đóng kèm thông báo (`useIncidentTriage`).
 */
export const IncidentQueuePage: React.FC = () => {
  const {
    currentOperatorId,
    incidents,
    highlightIncidentIds,
    escalatedIncidentIds,
    incidentsLoading,
    incidentsError,
    stationNotAssigned,
    revealReporterPhone,
    setIncidentDrawerOpen,
    unlinkLinkedReport,
    supplementVersions,
    autoDispatchSettings,
  } = useDispatchStore();
  const { t } = useTranslation();
  // Sự cố vừa duyệt đang ở bước "Điều xe" (giao xe lần đầu ngay trong Hàng đợi).
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  // Duyệt xong chuyển thẳng sang bước điều xe.
  const triage = useIncidentTriage({ onApproved: setDispatchingId });
  const [dispatchNotice, setDispatchNotice] = useState<DispatchNotice | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  // Ca đã duyệt đang xử lý — hàng đợi trống thì mời sang Live Map theo dõi.
  const activeIncidentCount = useMemo(() => incidents.filter((inc) => inc.status === 'approved').length, [incidents]);
  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  const pendingIncidents = useMemo(() => incidents.filter((inc) => inc.status === 'pending'), [incidents]);
  // §31.E: xem nhanh ca AI đã điều phối (drawer chỉ xem). Ca rời danh sách (hoàn tất / hủy) → tự đóng.
  const [previewId, setPreviewId] = useState<string | null>(null);
  // §31.E: ca AI đã tự điều phối, còn đang xử lý — tab giám sát "AI đã điều phối".
  const autoDispatchedIncidents = useMemo(
    () => incidents.filter((inc) => inc.status === 'approved' && inc.autoDispatch?.state === 'Dispatched'),
    [incidents]
  );
  const previewIncident = previewId ? autoDispatchedIncidents.find((i) => i.id === previewId) ?? null : null;
  const isDrawerOpen = !!triage.incident || !!dispatchingId;

  useEffect(() => {
    setIncidentDrawerOpen(isDrawerOpen, 'right');
    return () => setIncidentDrawerOpen(false);
  }, [isDrawerOpen, setIncidentDrawerOpen]);

  // Mở ca khác / đóng drawer khi đang nhập dở → hỏi "Rời ca" trước.
  const handleSelect = (id: string) => triage.requestLeave(() => triage.open(id));
  const handleClose = () => triage.requestLeave(() => undefined);

  // Mở từ thông báo / dải AI / chuông ("Thẩm định ngay", "Mở ca") → mở sẵn ca đó. Chờ ca có trong danh sách rồi mới mở.
  const location = useLocation();
  // Thông báo "Thêm người cùng báo" → drawer mở sẵn tab Báo cáo trùng của đúng ca đó.
  const requestedDrawerTab = (location.state as { openTab?: 'linked' | 'history' } | null)?.openTab;
  const [drawerTab, setDrawerTab] = useState<{ id: string; tab: 'linked' | 'history' } | null>(null);
  // "Xem ở Hàng đợi" (dải AI) / deep link ca AI đang làm → mở thẳng tab "AI đang phân tích".
  const [queueTab, setQueueTab] = useState<QueueTab>('human');
  const requestedTab = (location.state as { queueTab?: QueueTab } | null)?.queueTab;
  useEffect(() => {
    if (requestedTab) setQueueTab(requestedTab);
  }, [requestedTab, location.key]);
  const openIncidentId = (location.state as { openIncidentId?: string } | null)?.openIncidentId;
  const [openedFromState, setOpenedFromState] = useState<string | null>(null);
  const openKey = openIncidentId ? `${location.key}:${openIncidentId}` : null;
  useEffect(() => {
    if (!openKey || openedFromState === openKey) return;
    if (!pendingIncidents.some((inc) => inc.id === openIncidentId)) return;
    setOpenedFromState(openKey);
    setDrawerTab(requestedDrawerTab ? { id: openIncidentId!, tab: requestedDrawerTab } : null);
    handleSelect(openIncidentId!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey, pendingIncidents]);

  // Hoàn tất / Để sau / X → ở lại Hàng đợi (ca chờ kế tiếp) kèm thông báo ngắn có lối sang Live Map.
  const closeDispatch = (showNotice = true) => {
    if (dispatchingId) {
      const incident = incidents.find((inc) => inc.id === dispatchingId);
      if (showNotice && incident && incident.status === 'approved') {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        setDispatchNotice({
          incidentId: incident.id,
          title: incident.title,
          vehicleCount: incident.assignedVehicleIds.length - incident.reportedVehicleIds.length,
        });
        noticeTimerRef.current = setTimeout(() => setDispatchNotice(null), DISPATCH_NOTICE_MS);
      }
    }
    setDispatchingId(null);
  };

  const openOnLiveMap = (id: string) => {
    closeDispatch(false);
    setDispatchNotice(null);
    navigate(LIVE_MAP_PATH, { state: { focusIncidentId: id } });
  };

  if (stationNotAssigned) return <StationNotAssigned message={stationNotAssigned} />;

  return (
    <div className="h-full">
      <IncidentQueueList
        incidents={pendingIncidents}
        highlightIds={highlightIncidentIds}
        escalatedIds={escalatedIncidentIds}
        selectedId={triage.openId}
        currentOperatorId={currentOperatorId}
        onSelect={handleSelect}
        isLoading={incidentsLoading}
        loadError={incidentsError}
        activeIncidentCount={activeIncidentCount}
        onOpenLiveMap={() => navigate(LIVE_MAP_PATH)}
        autoDispatchSettings={autoDispatchSettings}
        autoDispatchedIncidents={autoDispatchedIncidents}
        onOpenAutoDispatched={setPreviewId}
        previewId={previewId}
        tab={queueTab}
        onTabChange={setQueueTab}
      />

      {previewIncident && (
        <AutoDispatchedDrawer
          key={previewIncident.id}
          incident={previewIncident}
          onClose={() => setPreviewId(null)}
          onOpenLiveMap={(id) => {
            setPreviewId(null);
            openOnLiveMap(id);
          }}
        />
      )}

      {dispatchNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1300] w-[min(560px,calc(100%-2rem))]">
          <div
            role="status"
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm animate-drawer-in ${
              dispatchNotice.vehicleCount > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {dispatchNotice.vehicleCount > 0 ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1 min-w-0">
              {dispatchNotice.vehicleCount > 0
                ? t('incidents.dispatchStep.notice.dispatched', {
                    count: dispatchNotice.vehicleCount,
                    title: dispatchNotice.title,
                  })
                : t('incidents.dispatchStep.notice.deferred', { title: dispatchNotice.title })}
            </span>
            <button
              onClick={() => openOnLiveMap(dispatchNotice.incidentId)}
              className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-white shadow-sm text-xs font-bold hover:bg-white/70"
            >
              <MapIcon className="w-3.5 h-3.5" />
              {t('incidents.dispatchStep.notice.view')}
            </button>
            <button
              onClick={() => setDispatchNotice(null)}
              aria-label={t('common.close')}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer thẩm định một cột phủ từ bên phải (bấm nền tối = đóng, đang nhập dở thì hỏi trước). */}
      {triage.incident && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={handleClose} />
          <div className="fixed top-0 right-0 h-full w-full max-w-4xl z-[1401] border-l border-slate-200 shadow-2xl shadow-slate-900/20 animate-drawer-in">
            <IncidentDetailDrawer
              key={triage.incident.id}
              incident={triage.incident}
              currentOperatorId={currentOperatorId}
              isEscalated={escalatedIncidentIds.has(triage.incident.id)}
              onClose={handleClose}
              onApprove={triage.approve}
              onReject={triage.reject}
              onTransfer={triage.transfer}
              transferStations={triage.transferStations}
              onRevealPhone={revealReporterPhone}
              onUnlinkReport={unlinkLinkedReport}
              supplementVersion={supplementVersions.get(triage.incident.id) ?? 0}
              isSubmitting={triage.submitting}
              errorMsg={triage.actionError}
              onDirtyChange={triage.setDirty}
              initialTab={drawerTab?.id === triage.incident.id ? drawerTab.tab : 'review'}
              leavePrompt={
                triage.leavePending && (
                  <div
                    role="alertdialog"
                    aria-label={t('liveMap.triage.leavePrompt')}
                    className="shrink-0 flex flex-wrap items-center gap-2 px-5 py-2 border-b border-amber-300 bg-amber-50 text-xs text-amber-900"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 min-w-[12rem] font-semibold">{t('liveMap.triage.leavePrompt')}</span>
                    <button
                      onClick={triage.cancelLeave}
                      autoFocus
                      className="px-2.5 py-1 rounded-md border border-amber-300 bg-white font-bold hover:bg-amber-100"
                    >
                      {t('liveMap.triage.stay')}
                    </button>
                    <button
                      onClick={triage.confirmLeave}
                      className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white font-bold"
                    >
                      {t('liveMap.triage.leave')}
                    </button>
                  </div>
                )
              }
            />
          </div>
        </>
      )}

      {dispatchingId && (
        <QueueDispatchDrawer
          key={dispatchingId}
          incidentId={dispatchingId}
          onClose={() => closeDispatch()}
          onOpenLiveMap={openOnLiveMap}
        />
      )}
    </div>
  );
};
