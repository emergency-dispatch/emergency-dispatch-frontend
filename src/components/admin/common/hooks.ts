import { useEffect, useRef, useState } from 'react';
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
