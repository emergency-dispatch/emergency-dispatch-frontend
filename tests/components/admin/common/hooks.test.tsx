import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery, useUnsavedChangesGuard } from '@/components/admin/common/hooks';

describe('useServiceQuery', () => {
  it('tải dữ liệu theo key và báo loading', async () => {
    const fetcher = vi.fn().mockResolvedValue('A');
    const { result } = renderHook(({ k }) => useServiceQuery(fetcher, k), { initialProps: { k: '1' } });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('A');
    expect(result.current.error).toBeNull();
  });

  it('đổi key → tải lại, bỏ kết quả cũ về muộn', async () => {
    let resolveOld!: (v: string) => void;
    const fetcher = vi
      .fn()
      .mockReturnValueOnce(new Promise<string>((r) => (resolveOld = r)))
      .mockResolvedValueOnce('mới');
    const { result, rerender } = renderHook(({ k }) => useServiceQuery(() => fetcher(), k), { initialProps: { k: 'a' } });
    rerender({ k: 'b' });
    await waitFor(() => expect(result.current.data).toBe('mới'));
    await act(async () => resolveOld('cũ'));
    expect(result.current.data).toBe('mới');
  });

  it('lỗi giữ dữ liệu cũ; reload gọi lại', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('A').mockRejectedValueOnce(new Error('Hỏng'));
    const { result } = renderHook(() => useServiceQuery(fetcher, 'k'));
    await waitFor(() => expect(result.current.data).toBe('A'));
    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.error).toBe('Hỏng'));
    expect(result.current.data).toBe('A');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('useDebouncedValue', () => {
  afterEach(() => vi.useRealTimers());

  it('chỉ cập nhật sau khoảng trễ', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: 'a' } });
    rerender({ v: 'ab' });
    rerender({ v: 'abc' });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('abc');
  });
});

describe('useUnsavedChangesGuard', () => {
  const clickLink = (href: string, init: MouseEventInit = {}) => {
    const a = document.createElement('a');
    a.href = href;
    document.body.appendChild(a);
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    // Ghi lại kết quả của guard rồi chặn điều hướng thật (jsdom không hỗ trợ chuyển trang).
    let preventedBeforeWindow: boolean | null = null;
    const stop = (e: Event) => {
      preventedBeforeWindow = e.defaultPrevented;
      e.preventDefault();
    };
    window.addEventListener('click', stop);
    a.dispatchEvent(evt);
    window.removeEventListener('click', stop);
    a.remove();
    // Guard chặn thì đã stopPropagation → listener ở window không chạy, đọc thẳng evt.defaultPrevented.
    return { defaultPrevented: preventedBeforeWindow ?? evt.defaultPrevented };
  };

  it('không dirty → không chặn', () => {
    const confirm = vi.spyOn(window, 'confirm');
    renderHook(() => useUnsavedChangesGuard(false));
    clickLink('/admin/other');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('dirty + bấm link nội bộ → hỏi, hủy thì chặn điều hướng', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderHook(() => useUnsavedChangesGuard(true, 'Rời trang?'));
    const evt = clickLink('/admin/other');
    expect(confirm).toHaveBeenCalledWith('Rời trang?');
    expect(evt.defaultPrevented).toBe(true);
  });

  it('dirty + đồng ý → cho đi', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderHook(() => useUnsavedChangesGuard(true));
    expect(clickLink('/admin/other').defaultPrevented).toBe(false);
  });

  it('bỏ qua link ngoài, cùng trang, phím bổ trợ', () => {
    const confirm = vi.spyOn(window, 'confirm');
    renderHook(() => useUnsavedChangesGuard(true));
    clickLink('https://example.com/x');
    clickLink(window.location.pathname);
    clickLink('/admin/other', { ctrlKey: true });
    expect(confirm).not.toHaveBeenCalled();
  });

  it('beforeunload bị chặn khi dirty', () => {
    const { unmount } = renderHook(() => useUnsavedChangesGuard(true));
    const evt = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
    unmount();
    const evt2 = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(evt2);
    expect(evt2.defaultPrevented).toBe(false);
  });
});

describe('useInitialQueryParams', () => {
  const wrapper =
    (url: string) =>
    ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;

  it('đọc text / oneOf / flag từ query string', () => {
    const { result } = renderHook(() => useInitialQueryParams(), { wrapper: wrapper('/x?q=%20abc%20&status=maintenance&bad=zzz&open=true') });
    expect(result.current.text('q')).toBe('abc');
    expect(result.current.text('missing')).toBe('');
    expect(result.current.oneOf('status', ['maintenance', 'available'] as const)).toBe('maintenance');
    expect(result.current.oneOf('bad', ['maintenance'] as const)).toBe('');
    expect(result.current.flag('open')).toBe(true);
    expect(result.current.flag('q')).toBe(false);
  });
});
