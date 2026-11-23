import { useSyncExternalStore } from 'react';

/** success = thao tác đã lưu xong; info = nhắc việc còn phải làm (VD đã điền mặc định, chưa lưu). Lỗi KHÔNG dùng toast. */
export type ToastKind = 'success' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const MAX_TOASTS = 3;

// Để ngoài React: form cài đặt được dựng lại sau khi lưu (đổi key), giữ trong form thì toast mất hoặc hiện hai lần.
let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function update(next: ToastItem[]) {
  toasts = next;
  listeners.forEach((listener) => listener());
}

/** Báo thao tác thành công. Trùng câu đang hiện → thay bằng toast mới (đếm giờ lại) thay vì xếp chồng. */
export function showToast(message: string, kind: ToastKind = 'success') {
  const rest = toasts.filter((item) => item.message !== message || item.kind !== kind);
  update([...rest, { id: nextId++, kind, message }].slice(-MAX_TOASTS));
}

export const dismissToast = (id: number) => update(toasts.filter((item) => item.id !== id));

export const clearToasts = () => update([]);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useToasts = () => useSyncExternalStore(subscribe, () => toasts);
