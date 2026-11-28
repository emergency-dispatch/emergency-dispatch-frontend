import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

const DEFAULT_COOLDOWN_MINUTES = 3;
const COOLDOWN_MINUTES_STORAGE_KEY = 'resq_report_cooldown_minutes';
const GLOBAL_STORAGE_KEY = 'resq_last_reported_time';
const COOLDOWN_REFRESH_TTL_MS = 60_000;

let lastFetchedAt = 0;
let inFlightCooldownFetch: Promise<number> | null = null;

function clampCooldownMinutes(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_COOLDOWN_MINUTES;
  return Math.min(60, Math.max(0, Math.round(n)));
}

export function getCachedReportCooldownMinutes(): number {
  if (typeof window === 'undefined') return DEFAULT_COOLDOWN_MINUTES;
  try {
    const raw = localStorage.getItem(COOLDOWN_MINUTES_STORAGE_KEY);
    if (raw === null) return DEFAULT_COOLDOWN_MINUTES;
    return clampCooldownMinutes(raw);
  } catch {
    return DEFAULT_COOLDOWN_MINUTES;
  }
}

export function setCachedReportCooldownMinutes(minutes: number): void {
  if (typeof window === 'undefined') return;
  const clamped = clampCooldownMinutes(minutes);
  try {
    localStorage.setItem(COOLDOWN_MINUTES_STORAGE_KEY, String(clamped));
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new CustomEvent('resq_report_cooldown_updated', { detail: { minutes: clamped } }));
}

export async function refreshReportCooldown(force = false): Promise<number> {
  if (typeof window === 'undefined') return DEFAULT_COOLDOWN_MINUTES;
  if (!force && lastFetchedAt > 0 && Date.now() - lastFetchedAt < COOLDOWN_REFRESH_TTL_MS) {
    return getCachedReportCooldownMinutes();
  }
  if (!force && inFlightCooldownFetch) return inFlightCooldownFetch;

  inFlightCooldownFetch = (async () => {
    try {
      const res = await apiClient.get<{
        data?: { values?: { reportCooldownMinutes?: number }; reportCooldownMinutes?: number };
      }>('/settings/citizen-incident-alerts');
      const data = res?.data?.data;
      const mins = clampCooldownMinutes(data?.values?.reportCooldownMinutes ?? data?.reportCooldownMinutes);
      lastFetchedAt = Date.now();
      setCachedReportCooldownMinutes(mins);
      return mins;
    } catch {
      return getCachedReportCooldownMinutes();
    } finally {
      inFlightCooldownFetch = null;
    }
  })();

  return inFlightCooldownFetch;
}

function getCooldownMs(): number {
  return getCachedReportCooldownMinutes() * 60 * 1000;
}

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
    const cooldownMs = getCooldownMs();
    if (cooldownMs <= 0) return 0;
    const key = resolveCooldownKey(userScope);
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const elapsed = Date.now() - Number(raw);
    return elapsed < cooldownMs ? Math.ceil((cooldownMs - elapsed) / 1000) : 0;
  });

  const triggerCooldown = useCallback((timestamp: number = Date.now()) => {
    const key = getStorageKey();
    const cooldownMs = getCooldownMs();
    localStorage.setItem(key, String(timestamp));
    if (key !== GLOBAL_STORAGE_KEY) {
      localStorage.setItem(GLOBAL_STORAGE_KEY, String(timestamp));
    }
    setCooldownSeconds(cooldownMs > 0 ? Math.ceil(cooldownMs / 1000) : 0);
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
    void refreshReportCooldown();

    const check = () => {
      const cooldownMs = getCooldownMs();
      if (cooldownMs <= 0) {
        setCooldownSeconds(0);
        return;
      }
      const key = getStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) {
        setCooldownSeconds(0);
        return;
      }
      const elapsed = Date.now() - Number(raw);
      if (elapsed < cooldownMs) {
        setCooldownSeconds(Math.ceil((cooldownMs - elapsed) / 1000));
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
      const cooldownMs = getCooldownMs();
      if (!ts || cooldownMs <= 0) {
        setCooldownSeconds(0);
        return;
      }
      const elapsed = Date.now() - ts;
      setCooldownSeconds(elapsed < cooldownMs ? Math.ceil((cooldownMs - elapsed) / 1000) : 0);
    };

    window.addEventListener('resq_sos_cooldown_started', onCooldownStarted);
    window.addEventListener('resq_report_cooldown_updated', check);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resq_sos_cooldown_started', onCooldownStarted);
      window.removeEventListener('resq_report_cooldown_updated', check);
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
