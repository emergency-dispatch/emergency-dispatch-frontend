import { useState, useEffect, useCallback } from 'react';

const COOLDOWN_MS = 3 * 60 * 1000; // 3 phút theo quy chuẩn BR-CIT-01
const GLOBAL_STORAGE_KEY = 'resq_last_reported_time';

export function resolveCooldownKey(customScope?: string | null): string {
  if (customScope) return `resq_last_reported_time_${customScope}`;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('resq_user_data') : null;
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id) return `resq_last_reported_time_${u.id}`;
      if (u?.phoneNumber) return `resq_last_reported_time_${u.phoneNumber}`;
    }
  } catch {
    // fallback
  }
  return GLOBAL_STORAGE_KEY;
}

export function useSosCooldown(userScope?: string | null) {
  const getStorageKey = useCallback(() => resolveCooldownKey(userScope), [userScope]);

  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const key = resolveCooldownKey(userScope);
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const elapsed = Date.now() - Number(raw);
    return elapsed < COOLDOWN_MS ? Math.ceil((COOLDOWN_MS - elapsed) / 1000) : 0;
  });

  const triggerCooldown = useCallback((timestamp: number = Date.now()) => {
    const key = getStorageKey();
    localStorage.setItem(key, String(timestamp));
    if (key !== GLOBAL_STORAGE_KEY) {
      localStorage.setItem(GLOBAL_STORAGE_KEY, String(timestamp));
    }
    setCooldownSeconds(Math.ceil(COOLDOWN_MS / 1000));
    window.dispatchEvent(new CustomEvent('resq_sos_cooldown_started', { detail: { timestamp, key } }));
  }, [getStorageKey]);

  const clearCooldown = useCallback(() => {
    const key = getStorageKey();
    localStorage.removeItem(key);
    localStorage.removeItem(GLOBAL_STORAGE_KEY);
    setCooldownSeconds(0);
    window.dispatchEvent(new CustomEvent('resq_sos_cooldown_started', { detail: { timestamp: 0, key } }));
  }, [getStorageKey]);

  useEffect(() => {
    const check = () => {
      const key = getStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) {
        setCooldownSeconds(0);
        return;
      }
      const elapsed = Date.now() - Number(raw);
      if (elapsed < COOLDOWN_MS) {
        setCooldownSeconds(Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      } else {
        setCooldownSeconds(0);
      }
    };

    check();
    const interval = setInterval(check, 1000);

    const onCooldownStarted = (e: any) => {
      const eventKey = e.detail?.key;
      const currentKey = getStorageKey();
      if (eventKey && eventKey !== currentKey && currentKey !== GLOBAL_STORAGE_KEY) {
        return;
      }
      const ts = Number(e.detail?.timestamp) || 0;
      if (!ts) {
        setCooldownSeconds(0);
        return;
      }
      const elapsed = Date.now() - ts;
      setCooldownSeconds(elapsed < COOLDOWN_MS ? Math.ceil((COOLDOWN_MS - elapsed) / 1000) : 0);
    };

    window.addEventListener('resq_sos_cooldown_started', onCooldownStarted);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resq_sos_cooldown_started', onCooldownStarted);
    };
  }, [getStorageKey]);

  const formatMinutesSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return {
    isCooldown: cooldownSeconds > 0,
    cooldownSeconds,
    cooldownLabel: formatMinutesSeconds(cooldownSeconds),
    triggerCooldown,
    clearCooldown,
  };
}
