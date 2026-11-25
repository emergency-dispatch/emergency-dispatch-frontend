import { useState } from 'react';

export interface RevealedPhoneState {
  /** Số đầy đủ đã hiện cho sự cố đang xem (backend ghi vết mỗi lần hiện). */
  revealed: { phone: string; at: Date } | null;
  revealing: boolean;
  reveal: () => void;
}

/**
 * Backend luôn trả số đã che; số đầy đủ chỉ có sau khi bấm "Hiện số". Giữ theo id sự cố: đổi ca là tự ẩn, đổi tab rồi quay
 * lại thì vẫn còn (không phải hiện lại và ghi vết thêm lần nữa).
 */
export function useRevealPhone(
  incidentId: string | null,
  onReveal: (id: string) => Promise<string | null>
): RevealedPhoneState {
  const [state, setState] = useState<{ id: string; phone: string; at: Date } | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const reveal = async () => {
    if (!incidentId || revealingId === incidentId) return;
    setRevealingId(incidentId);
    const phone = await onReveal(incidentId);
    setRevealingId(null);
    if (phone) setState({ id: incidentId, phone, at: new Date() });
  };

  return {
    revealed: state && state.id === incidentId ? { phone: state.phone, at: state.at } : null,
    revealing: !!incidentId && revealingId === incidentId,
    reveal,
  };
}
