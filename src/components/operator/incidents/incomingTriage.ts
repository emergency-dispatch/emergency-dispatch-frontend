import { useEffect, useSyncExternalStore } from 'react';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useNow } from '../../../hooks/useNow';
import type { Incident } from '../../../types/incident';
import {
  AUTO_DISPATCH_DECIDING_TIMEOUT_MS,
  autoDispatchVerdict,
  autoDispatchVerdictAt,
  type AutoDispatchVerdict,
} from './autoDispatchVerdict';

/**
 * Backend chờ AI phân tích tối đa ~2 phút rồi mới chấm tự điều phối → mốc "bình thường" cho đoạn Phân tích ảnh.
 * Quá mốc vẫn chờ tiếp, chỉ tô vàng để Operator để ý.
 */
export const AI_ANALYZE_BUDGET_MS = 120_000;

// Lúc ca bắt đầu ở bước "đang điều phối" — dùng chung cho dải AI (topbar), marker Live Map và modal tin báo mới để cả ba
// cùng thấy một mốc quá hạn. Giữ ngoài React vì các nơi dùng nằm ở các nhánh cây khác nhau.
const decidingSince = new Map<string, number>();
let version = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getVersion = () => version;

export interface IncomingTriageItem {
  incident: Incident;
  verdict: AutoDispatchVerdict;
  /** Mốc bắt đầu "đang điều phối" (ms), null = chưa tới bước đó. */
  decidingSince: number | null;
}

/**
 * §31.E: giai đoạn AI của các tin báo mới (`incomingIncidents`). Một nguồn cho dải AI, marker có vòng trên Live Map và
 * modal "Cần bạn xử lý".
 */
export function useIncomingTriage(): { items: IncomingTriageItem[]; now: number } {
  const { incomingIncidents, incomingTransferNotes, autoDispatchSettings } = useDispatchStore();
  const now = useNow(1000);
  useSyncExternalStore(subscribe, getVersion);

  const items = incomingIncidents.map((incident) => {
    const since = decidingSince.get(incident.id) ?? null;
    return {
      incident,
      decidingSince: since,
      verdict: autoDispatchVerdict(incident, autoDispatchSettings, {
        transferred: incomingTransferNotes.has(incident.id),
        decidingExpired: since !== null && now - since > AUTO_DISPATCH_DECIDING_TIMEOUT_MS,
      }),
    };
  });

  const newlyDeciding = items
    .filter((item) => item.verdict.phase === 'deciding' && item.decidingSince === null)
    .map((item) => item.incident.id)
    .join(',');
  useEffect(() => {
    if (!newlyDeciding) return;
    const at = Date.now();
    let changed = false;
    for (const id of newlyDeciding.split(',')) {
      if (decidingSince.has(id)) continue;
      decidingSince.set(id, at);
      changed = true;
    }
    if (!changed) return;
    version += 1;
    listeners.forEach((listener) => listener());
  }, [newlyDeciding]);

  return { items, now };
}

/**
 * Ca chờ duyệt có từ trước khi mở trang (không phải tin báo mới của phiên) mà AI vẫn "đang làm" quá hạn này → coi như kẹt,
 * chuyển cho người.
 */
const AI_STUCK_MS = 10 * 60_000;

/**
 * Giai đoạn của **mọi** ca chờ duyệt: tin báo mới trong phiên dùng `useIncomingTriage` (mốc điều phối chính xác), ca còn lại
 * (VD vừa tải lại trang) tính theo lúc tiếp nhận. Dùng cho panel "Theo dõi ca", dải AI và marker AI trên bản đồ.
 */
export function usePendingTriage(): { items: IncomingTriageItem[]; now: number } {
  const { incidents, autoDispatchSettings } = useDispatchStore();
  const incoming = useIncomingTriage();
  const { now } = incoming;
  const incomingIds = new Set(incoming.items.map((item) => item.incident.id));
  const others = incidents
    .filter((incident) => incident.status === 'pending' && !incomingIds.has(incident.id))
    .map((incident): IncomingTriageItem => {
      const verdict = autoDispatchVerdictAt(incident, autoDispatchSettings, now);
      const stuck =
        (verdict.phase === 'analyzing' || verdict.phase === 'deciding') &&
        now - new Date(incident.createdAt).getTime() > AI_STUCK_MS;
      return {
        incident,
        verdict: stuck ? { phase: 'handover', reason: 'undecided' } : verdict,
        decidingSince: decidingSince.get(incident.id) ?? null,
      };
    });
  return { items: [...incoming.items, ...others], now };
}

/** Ca AI đang làm. Đang có người giữ khóa thì AI sẽ bỏ qua → không tính. */
export function useAiWorkingItems(): { items: AiWorkingItem[]; now: number } {
  const { items, now } = usePendingTriage();
  return { items: items.filter(isAiWorkingUnheld), now };
}

/** Ca đang ở tay AI (phân tích ảnh / đang điều phối). */
export type AiWorkingItem = IncomingTriageItem & { verdict: { phase: 'analyzing' | 'deciding' } };
export const isAiWorking = (item: IncomingTriageItem): item is AiWorkingItem =>
  item.verdict.phase === 'analyzing' || item.verdict.phase === 'deciding';
export const isAiWorkingUnheld = (item: IncomingTriageItem): item is AiWorkingItem => isAiWorking(item) && !item.incident.lock;

export interface AiProgress {
  phase: 'analyzing' | 'deciding';
  /** 0–1: đoạn Phân tích ảnh (so với mốc ~2 phút). */
  analyzeFill: number;
  /** 0–1: đoạn Điều phối (so với hạn 20 s). */
  decideFill: number;
  /** Lâu hơn thường lệ ở bước hiện tại → tô vàng. */
  slow: boolean;
  /** Giây kể từ lúc tiếp nhận. */
  elapsedSeconds: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function aiProgressOf(item: AiWorkingItem, now: number): AiProgress {
  const created = new Date(item.incident.createdAt).getTime();
  const elapsed = Math.max(0, now - created);
  if (item.verdict.phase === 'analyzing') {
    return {
      phase: 'analyzing',
      analyzeFill: clamp01(elapsed / AI_ANALYZE_BUDGET_MS),
      decideFill: 0,
      slow: elapsed > AI_ANALYZE_BUDGET_MS,
      elapsedSeconds: Math.floor(elapsed / 1000),
    };
  }
  const deciding = item.decidingSince === null ? 0 : now - item.decidingSince;
  return {
    phase: 'deciding',
    analyzeFill: 1,
    decideFill: clamp01(deciding / AUTO_DISPATCH_DECIDING_TIMEOUT_MS),
    slow: deciding > AUTO_DISPATCH_DECIDING_TIMEOUT_MS / 2,
    elapsedSeconds: Math.floor(elapsed / 1000),
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** mm:ss, từ 1 giờ trở lên thành h:mm:ss. */
export const formatWaitTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
};

/** Đuôi số của mã sự cố (SC-261118-0377 → 0377) cho ô nhỏ trên thanh trên cùng. */
export const codeTail = (code: string) => code.split('-').pop() ?? code;
