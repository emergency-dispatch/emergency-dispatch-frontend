import React, { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { labelClass } from '../common/styles';
import {
  actorRoleLabel,
  compareStates,
  entityDisplayName,
  entityTypeMeta,
  fieldLabel,
  formatAuditTime,
  systemActionMeta,
} from './auditMeta';
import type { SystemAuditLogDto } from '../../../types/auditTrail';
import { useTranslation } from '../../../i18n';

interface SystemAuditDetailDrawerProps {
  entry: SystemAuditLogDto;
  onClose: () => void;
  /** Lọc nhật ký theo đối tượng của bản ghi này. */
  onFilterEntity: (entry: SystemAuditLogDto) => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100 last:border-0">
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className="text-sm text-slate-900 min-w-0 break-words">{children}</dd>
  </div>
);

/** Chi tiết một bản ghi quản trị kèm bảng so sánh trước / sau — chỉ đọc. */
export const SystemAuditDetailDrawer: React.FC<SystemAuditDetailDrawerProps> = ({ entry, onClose, onFilterEntity }) => {
  const { t } = useTranslation();
  const action = systemActionMeta(entry.action);
  const ActionIcon = action.icon;
  const entity = entityTypeMeta(entry.entityType);
  const rows = compareStates(entry.oldValueJson, entry.newValueJson);
  const hasBefore = !!entry.oldValueJson;
  const hasAfter = !!entry.newValueJson;
  const changedCount = rows.filter((r) => r.changed).length;
  // Có cả trước và sau → mặc định chỉ hiện trường đã đổi; bấm để xem đủ.
  const canHideUnchanged = hasBefore && hasAfter && changedCount > 0 && changedCount < rows.length;
  const [showAll, setShowAll] = useState(false);
  const visibleRows = canHideUnchanged && !showAll ? rows.filter((r) => r.changed) : rows;

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
        aria-label={t('admin.monitoring.audit.system.detailTitle')}
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in"
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-bold ${action.badgeClass}`}>
            <ActionIcon className="w-3.5 h-3.5" />
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
            <Row label={t('admin.monitoring.audit.entity')}>
              <div>
                <span className="text-slate-500">{entity.label}:</span> {entityDisplayName(entry.entityType, entry.entityName)}
              </div>
              {entry.entityId && <div className="font-mono-data text-xs text-slate-500">{entry.entityId}</div>}
              {entry.entityId && (
                <button
                  type="button"
                  onClick={() => onFilterEntity(entry)}
                  className="mt-1 text-xs font-semibold text-red-600 hover:underline"
                >
                  {t('admin.monitoring.audit.system.viewEntityRecords')}
                </button>
              )}
            </Row>
            {entry.ipAddress && (
              <Row label={t('admin.monitoring.audit.system.ipAddress')}>
                <span className="font-mono-data text-xs">{entry.ipAddress}</span>
              </Row>
            )}
            <Row label={t('admin.monitoring.audit.recordId')}>
              <span className="font-mono-data text-xs text-slate-500">{entry.id}</span>
            </Row>
          </dl>

          {rows.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className={labelClass}>
                  {hasBefore && hasAfter
                    ? t('admin.monitoring.audit.system.compare')
                    : hasAfter
                      ? t('admin.monitoring.audit.system.afterOnly')
                      : t('admin.monitoring.audit.system.beforeOnly')}
                </h3>
                {canHideUnchanged && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="text-[11px] font-bold text-slate-600 hover:text-red-600"
                  >
                    {showAll
                      ? t('admin.monitoring.audit.system.showChangedOnly', { count: changedCount })
                      : t('admin.monitoring.audit.system.showUnchanged', { count: rows.length - changedCount })}
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left">
                      <th className="px-3 py-2 font-semibold text-slate-500 w-[34%]">{t('admin.monitoring.audit.system.field')}</th>
                      {hasBefore && <th className="px-3 py-2 font-semibold text-slate-500">{t('admin.monitoring.audit.system.before')}</th>}
                      {hasAfter && <th className="px-3 py-2 font-semibold text-slate-500">{t('admin.monitoring.audit.system.after')}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRows.map((r) => (
                      <tr key={r.field} className={r.changed ? 'bg-amber-50/60' : ''}>
                        <td className="px-3 py-2 align-top">
                          <div className="text-slate-800">{fieldLabel(r.field)}</div>
                          {fieldLabel(r.field) !== r.field && (
                            <div className="text-[10px] text-slate-400 font-mono-data">{r.field}</div>
                          )}
                        </td>
                        {hasBefore && (
                          <td
                            className={`px-3 py-2 align-top break-all ${
                              r.changed ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-700'
                            }`}
                          >
                            {r.before}
                          </td>
                        )}
                        {hasAfter && (
                          <td className={`px-3 py-2 align-top break-all ${r.changed ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                            {r.after}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasBefore && hasAfter && changedCount === 0 && (
                <p className="text-[11px] text-slate-500">{t('admin.monitoring.audit.system.noChanges')}</p>
              )}
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
