import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '../../../i18n';

interface CaseStepsProps {
  /** Bước đang làm: 1 = Thẩm định, 2 = Điều xe. */
  current: 1 | 2;
}

/** Hai bước của một ca trong Hàng đợi (FR-OP-03 → FR-OP-04). Đánh số vì đây đúng là một trình tự. */
export const CaseSteps: React.FC<CaseStepsProps> = ({ current }) => {
  const { t } = useTranslation();
  const steps = [t('incidents.steps.review'), t('incidents.steps.dispatch')];

  return (
    <ol className="flex items-center gap-2 text-xs" aria-label={t('incidents.steps.label')}>
      {steps.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            {index > 0 && <span aria-hidden className={`h-px w-6 ${done || active ? 'bg-slate-400' : 'bg-slate-200'}`} />}
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                done
                  ? 'bg-emerald-600 text-white'
                  : active
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 text-slate-400'
              }`}
            >
              {done ? <Check className="h-3 w-3" strokeWidth={3} /> : step}
            </span>
            <span className={active ? 'font-semibold text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400'}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};
