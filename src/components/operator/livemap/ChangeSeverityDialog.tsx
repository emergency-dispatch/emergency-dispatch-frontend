import React, { useState } from 'react';
import { AlertTriangle, ArrowUpRight, Gauge, Loader2, Lock, X } from 'lucide-react';
import { SeverityBadge } from '../incidents/SeverityBadge';
import {
  CONFIRMABLE_CATEGORIES,
  INCIDENT_CATEGORY_META,
  OVERRIDE_REASON_MIN_LENGTH,
  SEVERITY_LEVEL_META,
} from '../../../data/incidentMock';
import { MAX_VEHICLES_BY_LEVEL } from '../../../data/dispatchConfig';
import { useNow } from '../../../hooks/useNow';
import type { ActionResult } from '../../../context/DispatchContext';
import type { Incident, IncidentCategory, SeverityLevel } from '../../../types/incident';
import { useTranslation } from '../../../i18n';

const LEVELS: SeverityLevel[] = [1, 2, 3];

type ConfirmedCategory = Exclude<IncidentCategory, 'unknown'>;

interface ChangeSeverityDialogProps {
  incident: Incident;
  currentOperatorId: string;
  /** Số xe đang làm nhiệm vụ (chưa nộp báo cáo) — để nhắc rút bớt khi hạ mức. */
  activeVehicleCount: number;
  onClose: () => void;
  /** `category` chỉ gửi khi đổi loại; undefined = giữ loại hiện tại. */
  onSubmit: (severity: SeverityLevel, category: ConfirmedCategory | undefined, reason: string) => Promise<ActionResult>;
  /** Lưu thành công — `message` là câu backend trả. */
  onDone: (message: string | undefined) => void;
}

/** §21.1: đổi mức độ (và tùy chọn loại) sự cố đã xác minh khi tình hình hiện trường thay đổi. */
export const ChangeSeverityDialog: React.FC<ChangeSeverityDialogProps> = ({
  incident,
  currentOperatorId,
  activeVehicleCount,
  onClose,
  onSubmit,
  onDone,
}) => {
  const { t } = useTranslation();
  const now = useNow();
  const currentCategory: ConfirmedCategory | null = incident.category === 'unknown' ? null : incident.category;
  const [severity, setSeverity] = useState<SeverityLevel>(incident.severity);
  const [category, setCategory] = useState<ConfirmedCategory | null>(currentCategory);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend chặn (409) khi Operator khác đang giữ khóa mềm của sự cố.
  const lock = incident.lock && new Date(incident.lock.expiresAt).getTime() > now ? incident.lock : null;
  const lockedByOther = !!lock && lock.operatorId !== currentOperatorId;

  const categoryChanged = category !== null && category !== currentCategory;
  const changed = severity !== incident.severity || categoryChanged;
  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= OVERRIDE_REASON_MIN_LENGTH;
  const canSubmit = changed && reasonValid && !submitting && !lockedByOther;

  const raised = severity > incident.severity;
  const newMax = MAX_VEHICLES_BY_LEVEL[severity];
  const tooManyUnits = severity < incident.severity && activeVehicleCount > newMax;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(severity, categoryChanged ? category : undefined, reason.trim());
    setSubmitting(false);
    if (result.ok) onDone(result.message);
    else setError(result.message ?? t('liveMap.severityChange.failed'));
  };

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('liveMap.severityChange.title')}
      onClick={() => !submitting && onClose()}
    >
      <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-mono-data uppercase tracking-widest text-slate-500">
              <Gauge className="w-3.5 h-3.5 text-red-600" />
              {t('liveMap.severityChange.title')}
            </p>
            <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{incident.title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label={t('common.close')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {lockedByOther && (
            <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-px" />
              {t('liveMap.severityChange.lockedByOther', { name: lock.operatorName })}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {t('liveMap.severityChange.current')}:
            <SeverityBadge severity={incident.severity} />
            {currentCategory && (
              <span className="font-bold" style={{ color: INCIDENT_CATEGORY_META[currentCategory].color }}>
                {t(`enums.category.${currentCategory}`)}
              </span>
            )}
          </div>

          <div>
            <p className="text-xs font-mono-data uppercase tracking-widest text-slate-400 font-bold mb-2">
              {t('liveMap.severityChange.newLevel')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LEVELS.map((level) => {
                const active = severity === level;
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSeverity(level)}
                    disabled={lockedByOther}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-bold font-mono-data whitespace-nowrap transition-colors disabled:cursor-not-allowed ${
                      active ? SEVERITY_LEVEL_META[level].badgeClass : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t(`enums.severity.level${level}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-mono-data uppercase tracking-widest text-slate-400 font-bold mb-2">
              {t('liveMap.severityChange.eventType')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CONFIRMABLE_CATEGORIES.map((cat) => {
                const meta = INCIDENT_CATEGORY_META[cat];
                const Icon = meta.icon;
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(cat)}
                    disabled={lockedByOther}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                      active ? 'text-white' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                    style={active ? { backgroundColor: meta.color, borderColor: meta.color } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t(`enums.category.${cat}`)}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">{t('liveMap.severityChange.eventTypeHelp')}</p>
          </div>

          {changed && raised && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0 mt-px" />
              {t('liveMap.severityChange.raiseNote')}
            </p>
          )}
          {tooManyUnits && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {t('liveMap.severityChange.lowerExtraUnits', {
                count: activeVehicleCount,
                level: t(`enums.severity.level${severity}`),
                max: newMax,
              })}
            </p>
          )}

          <div>
            <label
              htmlFor="severity-change-reason"
              className="block text-xs font-mono-data uppercase tracking-widest text-slate-400 font-bold mb-2"
            >
              {t('liveMap.severityChange.reason')} <span className="text-red-600">*</span>
            </label>
            <textarea
              id="severity-change-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={lockedByOther}
              rows={3}
              placeholder={t('liveMap.severityChange.reasonPlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-slate-50"
            />
            {reason.length > 0 && !reasonValid && (
              <p className="text-[11px] text-amber-700 mt-1">
                {t('liveMap.severityChange.minChars', { min: OVERRIDE_REASON_MIN_LENGTH, length: reasonLength })}
              </p>
            )}
            {!changed && reasonValid && (
              <p className="text-[11px] text-slate-500 mt-1">{t('liveMap.severityChange.unchanged')}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 p-4 border-t border-slate-200 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-sm transition-colors disabled:opacity-50"
          >
            {t('liveMap.severityChange.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('liveMap.severityChange.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};
