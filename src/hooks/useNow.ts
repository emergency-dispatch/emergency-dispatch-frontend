import { useEffect, useState } from 'react';

/** Thời điểm hiện tại (ms), tự cập nhật theo chu kỳ — dùng cho đồng hồ đếm ngược / "x phút trước". */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
