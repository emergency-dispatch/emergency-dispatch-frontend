import React from 'react';
import { useTranslation } from '../../../i18n';

export interface SettingsTab<K extends string> {
  key: K;
  label: string;
  /** Có thay đổi chưa lưu → chấm đỏ. */
  dirty: boolean;
}

interface SettingsTabsProps<K extends string> {
  label: string;
  tabs: SettingsTab<K>[];
  active: K;
  onChange: (key: K) => void;
  /** Tiền tố id để nối tab với khung nội dung (`${idPrefix}-panel-${key}`). */
  idPrefix: string;
}

/** Thanh tab đầu cột cài đặt. Mũi tên trái / phải để chuyển tab bằng bàn phím. */
export function SettingsTabs<K extends string>({ label, tabs, active, onChange, idPrefix }: SettingsTabsProps<K>) {
  const { t } = useTranslation();
  const move = (e: React.KeyboardEvent, step: number) => {
    e.preventDefault();
    const index = tabs.findIndex((tab) => tab.key === active);
    const next = tabs[(index + step + tabs.length) % tabs.length];
    onChange(next.key);
    document.getElementById(`${idPrefix}-tab-${next.key}`)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex shrink-0 border-b border-slate-200 px-2"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(e, 1);
        else if (e.key === 'ArrowLeft') move(e, -1);
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={`-mb-px flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 ${
              selected ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {tab.dirty && (
              <span className="h-2 w-2 rounded-full bg-red-600" role="img" aria-label={t('admin.common.settings.unsaved')} title={t('admin.common.settings.unsaved')} />
            )}
          </button>
        );
      })}
    </div>
  );
}
