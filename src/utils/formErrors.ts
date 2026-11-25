/**
 * Cuộn tới lỗi đầu tiên đang hiện trong form (`role="alert"`) và đặt con trỏ vào ô nhập của nó. Ô nhập + dòng lỗi bọc
 * chung trong phần tử có `data-field`; không có thì chỉ cuộn tới dòng lỗi. Gọi sau khi lỗi đã được vẽ (trong effect).
 */
export function scrollToFirstError(container: HTMLElement | null): void {
  const alert = container?.querySelector<HTMLElement>('[role="alert"]');
  if (!alert) return;
  const field = alert.closest<HTMLElement>('[data-field]');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  (field ?? alert).scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  field
    ?.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)')
    ?.focus({ preventScroll: true });
}
