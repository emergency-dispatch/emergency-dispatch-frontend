import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../services/apiClient';

/**
 * Gọi một hàm service mỗi khi `key` đổi (bộ lọc, trang…). Bỏ qua kết quả của lần gọi cũ
 * nếu key đã đổi trước khi xong. `loading` = đang chờ kết quả cho key hiện tại.
 */
export function useServiceQuery<T>(fetcher: () => Promise<T>, key: string) {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const [reloadCount, setReloadCount] = useState(0);
  const fullKey = `${key}#${reloadCount}`;
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({
    key: null,
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current().then(
      (data) => {
        if (!cancelled) setState({ key: fullKey, data, error: null });
      },
      (err) => {
        if (!cancelled) setState((s) => ({ key: fullKey, data: s.data, error: getApiErrorMessage(err) }));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [fullKey]);

  return {
    data: state.data,
    error: state.error,
    loading: state.key !== fullKey,
    reload: () => setReloadCount((c) => c + 1),
  };
}

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Cảnh báo khi rời trang còn thay đổi chưa lưu: đóng/tải lại tab (beforeunload) và bấm link nội bộ
 * (sidebar, topbar). App dùng <BrowserRouter> nên không có useBlocker của data router — chặn click
 * ở pha capture trước khi React Router xử lý. Nút Back của trình duyệt chưa chặn được.
 */
export function useUnsavedChangesGuard(dirty: boolean, message = 'Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?') {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank') return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, message]);
}

/**
 * Bộ lọc ban đầu đọc từ query string (link từ Tổng quan, VD /admin/vehicles?status=maintenance).
 * Chỉ đọc lúc vào trang; giá trị không hợp lệ thì bỏ qua.
 */
export function useInitialQueryParams() {
  const [params] = useSearchParams();
  const [snapshot] = useState(() => new URLSearchParams(params));
  return {
    text: (key: string) => snapshot.get(key)?.trim() ?? '',
    oneOf: <T extends string>(key: string, allowed: readonly T[]): T | '' => {
      const value = snapshot.get(key);
      return value && (allowed as readonly string[]).includes(value) ? (value as T) : '';
    },
    flag: (key: string) => snapshot.get(key) === 'true',
  };
}
