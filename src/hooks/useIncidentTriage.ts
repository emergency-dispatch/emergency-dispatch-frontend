import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatchStore } from '../context/DispatchContext';
import { incidentService } from '../services/incidentService';
import { showToast } from '../components/admin/common/toastStore';
import type {
  BlockDuration,
  IncidentCategory,
  OperatorCancellationCode,
  SeverityLevel,
  TrafficJamDecision,
} from '../types/incident';
import { useTranslation } from '../i18n';

// Backend giữ khóa mềm 2 phút; gia hạn mỗi 60 giây khi Operator vẫn đang mở ca.
const LOCK_RENEW_MS = 60 * 1000;

/**
 * Thẩm định một ca ngay trên Live Map: giữ / gia hạn / nhả khóa mềm, duyệt, hủy (kèm chặn số), chuyển trạm.
 * Rời ca khi đang nhập dở thì hỏi lại (`requestLeave`) vì bản đồ và các thông báo vẫn bấm được bên cạnh panel.
 */
export function useIncidentTriage({ onApproved }: { onApproved: (incidentId: string) => void }) {
  const {
    currentOperatorId,
    incidents,
    stations,
    approveIncident,
    rejectIncident,
    transferIncident,
    lockIncident,
    releaseIncident,
  } = useDispatchStore();
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Việc đang chờ Operator đồng ý rời ca đang nhập dở. */
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  // Ref: đọc được giá trị mới nhất trong hàm bất đồng bộ và lúc unmount.
  const openIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);
  const releaseRef = useRef(releaseIncident);
  useEffect(() => {
    releaseRef.current = releaseIncident;
  });

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

  const acquireLock = async (id: string) => {
    setLockingId(id);
    const result = await lockIncident(id);
    setLockingId((cur) => (cur === id ? null : cur));
    if (openIdRef.current !== id) {
      // Đã rời ca trong lúc chờ → không giữ khóa ngầm.
      if (result.ok) incidentService.unlock(id).catch(() => undefined);
      return;
    }
    if (!result.ok) setActionError(result.message ?? null);
  };

  /** Mở ca = nhận khóa mềm 2 phút. Ca đang bị người khác giữ vẫn mở được ở chế độ chỉ xem. */
  const open = (id: string) => {
    if (openIdRef.current === id) return;
    if (openIdRef.current) releaseIncident(openIdRef.current);
    moveTo(id);
    const lock = incidents.find((i) => i.id === id)?.lock;
    const heldByOther =
      !!lock && lock.operatorId !== currentOperatorId && new Date(lock.expiresAt).getTime() > Date.now();
    if (!heldByOther) acquireLock(id);
  };

  const close = () => {
    if (openIdRef.current) releaseIncident(openIdRef.current);
    moveTo(null);
  };

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

  const heldByMe = incident?.lock?.operatorId === currentOperatorId;
  useEffect(() => {
    if (!openId || !heldByMe) return;
    const interval = setInterval(() => lockIncident(openId), LOCK_RENEW_MS);
    return () => clearInterval(interval);
    // Chỉ đặt lại nhịp khi đổi ca / mất khóa; lockIncident đổi mỗi lần store cập nhật.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, heldByMe]);

  // Rời trang khi đang mở ca → nhả khóa ngay, không để người khác chờ hết 2 phút.
  useEffect(
    () => () => {
      if (openIdRef.current) releaseRef.current(openIdRef.current);
      openIdRef.current = null;
    },
    []
  );

  // Ca không còn chờ thẩm định (người dân hủy, người khác xử lý, bị gộp, AI điều) → về danh sách.
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
        // Duyệt không nhả khóa ở backend; điều tổ không cần giữ khóa (tổ vừa bị giao thì backend báo 409).
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

  const relock = (id: string) => {
    setActionError(null);
    acquireLock(id);
  };

  // Trạm nhận được: mọi trạm đang hoạt động trừ trạm đang phụ trách sự cố.
  const transferStations = useMemo(
    () => stations.filter((st) => st.id !== incident?.responsibleStationId),
    [stations, incident?.responsibleStationId]
  );

  return {
    openId,
    incident,
    isLocking: !!openId && lockingId === openId,
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
    relock,
  };
}
