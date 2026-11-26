import React from 'react';
import { LANGUAGE_OPTIONS, getLanguage, setLanguage, type AppLanguage } from '../../i18n';

const FlagIcon: React.FC<{ lang: AppLanguage }> = ({ lang }) =>
  lang === 'vi' ? (
    <svg
      viewBox="0 0 30 20"
      aria-hidden="true"
      className="h-3.5 w-5 shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
    >
      <rect width="30" height="20" fill="#DA251D" />
      <polygon
        points="15,4 16.47,8.53 21.24,8.53 17.38,11.33 18.85,15.85 15,13.06 11.15,15.85 12.62,11.33 8.76,8.53 13.53,8.53"
        fill="#FFCD00"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 60 40"
      aria-hidden="true"
      className="h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
    >
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="12" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  );

interface LanguageSwitcherProps {
  label: string;
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ label, className = '' }) => {
  const current = getLanguage();
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 ${className}`}
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const active = current === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            title={option.value === 'vi' ? 'Tiếng Việt' : 'English'}
            className={`flex items-center justify-center rounded-md px-1.5 py-1 transition-all ${
              active ? 'bg-white shadow-xs ring-1 ring-red-500/30' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <FlagIcon lang={option.value} />
          </button>
        );
      })}
    </div>
  );
};
