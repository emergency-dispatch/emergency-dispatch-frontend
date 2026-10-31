import { useState, useEffect, useCallback } from 'react';

const COOLDOWN_MS = 3 * 60 * 1000; // 3 phút theo quy chuẩn BR-CIT-01
const STORAGE_KEY = 'resq_last_reported_time';

export function useSosCooldown() {
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return 0;
    const elapsed = Date.now() - Number(raw);
    return elapsed < COOLDOWN_MS ? Math.ceil((COOLDOWN_MS - elapsed) / 1000) : 0;
  });

  const triggerCooldown = useCallback((timestamp: number = Date.now()) => {
    localStorage.setItem(STORAGE_KEY, String(timestamp));
    setCooldownSeconds(Math.ceil(COOLDOWN_MS / 1000));
    window.dispatchEvent(new CustomEvent('resq_sos_cooldown_started', { detail: { timestamp } }));
  }, []);

  const clearCooldown = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCooldownSeconds(0);
    window.dispatchEvent(new CustomEvent('resq_sos_cooldown_started', { detail: { timestamp: 0 } }));
  }, []);

  useEffect(() => {
    const check = () => {
      const raw = localStorage.getItem(STORAGE_KEY);
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
  }, []);

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
