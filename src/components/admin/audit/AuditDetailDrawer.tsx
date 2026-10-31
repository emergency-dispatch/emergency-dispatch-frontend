import React, { useEffect } from 'react';
import { ArrowRight, Lock, X } from 'lucide-react';
import { labelClass } from '../common/styles';
import { actorRoleLabel, auditActionMeta, formatAuditTime, stateChanges } from './auditMeta';
import type { AuditTrailEntryDto } from '../../../types/auditTrail';
import { useTranslation } from '../../../i18n';

interface AuditDetailDrawerProps {
  entry: AuditTrailEntryDto;
  onClose: () => void;
  /** Lọc nhật ký theo sự cố của bản ghi này. */
  onFilterIncident: (incidentId: string) => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100 last:border-0">
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className="text-sm text-slate-900 min-w-0 break-words">{children}</dd>
  </div>
);

/** Chi tiết một bản ghi — chỉ đọc. */
export const AuditDetailDrawer: React.FC<AuditDetailDrawerProps> = ({ entry, onClose, onFilterIncident }) => {
  const { t } = useTranslation();
  const action = auditActionMeta(entry.action);
  const Icon = action.icon;
  const changes = stateChanges(entry.oldStateJson, entry.newStateJson);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('admin.monitoring.audit.detailTitle')}
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in"
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-bold ${action.badgeClass}`}>
            <Icon className="w-3.5 h-3.5" />
            {action.label}
          </span>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100" aria-label={t('common.close')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {entry.description && <p className="text-sm text-slate-800">{entry.description}</p>}

          <dl>
            <Row label={t('admin.monitoring.audit.time')}>
              <span className="font-mono-data">{formatAuditTime(entry.timestamp)}</span>
            </Row>
            <Row label={t('admin.monitoring.audit.actor')}>
              {entry.actorName || '—'} <span className="text-slate-500">· {actorRoleLabel(entry.actorRole)}</span>
            </Row>
            <Row label={t('admin.monitoring.audit.incident')}>
              <div>{entry.incidentTitle || t('admin.monitoring.incident.missing')}</div>
              <div className="font-mono-data text-xs text-slate-500">{entry.incidentId}</div>
              <button
                type="button"
                onClick={() => onFilterIncident(entry.incidentId)}
                className="mt-1 text-xs font-semibold text-red-600 hover:underline"
              >
                {t('admin.monitoring.audit.viewIncidentRecords')}
              </button>
            </Row>
            <Row label={t('admin.monitoring.audit.recordId')}>
              <span className="font-mono-data text-xs text-slate-500">{entry.id}</span>
            </Row>
          </dl>

          {changes.length > 0 && (
            <section className="space-y-2">
              <h3 className={labelClass}>{t('admin.monitoring.audit.recordedData')}</h3>
              <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                {changes.map((c) => (
                  <li key={c.field} className="px-3 py-2 text-sm">
                    <div className="text-xs text-slate-500 font-mono-data">{c.field}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 break-all">
                      {c.from !== null && (
                        <>
                          <span className="text-slate-500 line-through decoration-slate-300">{c.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </>
                      )}
                      <span className="font-semibold text-slate-900">{c.to ?? '—'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-slate-200 flex items-center gap-2 text-[11px] text-slate-500">
          <Lock className="w-3.5 h-3.5" />
          {t('admin.monitoring.readOnlyRecord')}
        </div>
      </aside>
    </>
  );
};
