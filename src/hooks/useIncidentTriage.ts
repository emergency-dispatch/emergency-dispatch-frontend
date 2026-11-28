import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatchStore } from '../context/DispatchContext';
import { showToast } from '../components/admin/common/toastStore';
import type {
  BlockDuration,
  IncidentCategory,
  OperatorCancellationCode,
  SeverityLevel,
  TrafficJamDecision,
} from '../types/incident';
import { useTranslation } from '../i18n';

/**
 * Thẩm định một ca trong drawer của Hàng đợi: duyệt, hủy (kèm chặn số), chuyển trạm.
 * Không giữ khóa mềm (bỏ 2026-11-26: mỗi trạm một Operator mỗi ca làm, không có chuyện hai người làm trùng). Hệ quả: mở ca
 * không chặn AI tự điều phối nữa — AI điều xong thì ca rời panel (`vanished`). Ca còn bị người khác giữ khóa (bản cũ / app
 * khác) thì drawer chỉ xem, vì backend vẫn trả 409.
 * Rời ca (đóng drawer, mở ca khác qua thông báo) khi đang nhập dở thì hỏi lại (`requestLeave`).
 */
export function useIncidentTriage({ onApproved }: { onApproved: (incidentId: string) => void }) {
  const { incidents, stations, approveIncident, rejectIncident, transferIncident } = useDispatchStore();
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Việc đang chờ Operator đồng ý rời ca đang nhập dở. */
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  // Ref: đọc được giá trị mới nhất trong hàm bất đồng bộ và lúc unmount.
  const openIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);

  const incident = useMemo(
    () => (openId ? incidents.find((i) => i.id === openId && i.status === 'pending') ?? null : null),
    [openId, incidents]
  );

  const moveTo = (id: string | null) => {
    openIdRef.current = id;
    dirtyRef.current = false;
    setOpenId(id);
    setActionError(null);
    setPendingLeave(null);
  };

  const open = (id: string) => {
    if (openIdRef.current === id) return;
    moveTo(id);
  };

  const close = () => moveTo(null);

  /** Rời ca đang mở rồi làm `action`; đang nhập dở thì chờ Operator đồng ý. Không mở ca nào → làm luôn. */
  const requestLeave = (action: () => void) => {
    if (submittingRef.current) return;
    if (!openIdRef.current) {
      action();
    } else if (dirtyRef.current) {
      setPendingLeave(() => action);
    } else {
      close();
      action();
    }
  };

  const confirmLeave = () => {
    const action = pendingLeave;
    close();
    action?.();
  };

  // Ca không còn chờ thẩm định (người dân hủy, người khác xử lý, bị gộp, AI điều) → đóng drawer, về danh sách.
  const vanished = !!openId && !incident;
  useEffect(() => {
    if (!vanished || submitting) return;
    moveTo(null);
    showToast(t('liveMap.triage.gone'), { kind: 'info', long: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vanished, submitting]);

  const submit = async (
    id: string,
    run: () => Promise<{ ok: boolean; message?: string }>,
    fallback: string,
    onDone: () => void
  ) => {
    submittingRef.current = true;
    setSubmitting(true);
    setActionError(null);
    const result = await run();
    submittingRef.current = false;
    setSubmitting(false);
    if (openIdRef.current !== id) return;
    if (!result.ok) {
      setActionError(result.message ?? fallback);
      return;
    }
    onDone();
  };

  const approve = (
    id: string,
    severity: SeverityLevel,
    overrideReason: string | undefined,
    category: IncidentCategory | undefined,
    trafficJam: TrafficJamDecision | undefined,
    incidentTypeCode: string | undefined
  ) =>
    submit(
      id,
      () => approveIncident(id, severity, overrideReason, category, trafficJam, incidentTypeCode),
      t('incidents.page.approveFailed'),
      () => {
        close();
        onApproved(id);
      }
    );

  const reject = (
    id: string,
    reason: string,
    blockDuration: BlockDuration | null,
    reasonCode: OperatorCancellationCode
  ) => submit(id, () => rejectIncident(id, reason, blockDuration, reasonCode), t('incidents.page.rejectFailed'), () =>
      moveTo(null)
    );

  const transfer = (id: string, stationId: string, reason: string) =>
    submit(id, () => transferIncident(id, stationId, reason), t('incidents.page.transferFailed'), () =>
      moveTo(null)
    );

  // Trạm nhận được: mọi trạm đang hoạt động trừ trạm đang phụ trách sự cố.
  const transferStations = useMemo(
    () => stations.filter((st) => st.id !== incident?.responsibleStationId),
    [stations, incident?.responsibleStationId]
  );

  return {
    openId,
    incident,
    submitting,
    actionError,
    transferStations,
    open,
    close,
    requestLeave,
    leavePending: !!pendingLeave,
    confirmLeave,
    cancelLeave: () => setPendingLeave(null),
    isDirty: () => dirtyRef.current,
    setDirty: (dirty: boolean) => {
      dirtyRef.current = dirty;
    },
    approve,
    reject,
    transfer,
  };
}
