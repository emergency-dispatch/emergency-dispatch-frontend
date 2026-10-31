import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Power, PowerOff, RefreshCw, ScanSearch, Trash2 } from 'lucide-react';
import { EscalationRuleFormDrawer } from '../../components/admin/escalation/EscalationRuleFormDrawer';
import { EscalationSettingsSection } from '../../components/admin/escalation/EscalationSettingsSection';
import { escalationSeverityMeta, severityLabel } from '../../components/admin/escalation/escalationMeta';
import { ConfirmModal, Notice, type NoticeState } from '../../components/admin/common/ui';
import { iconButtonClass, thClass } from '../../components/admin/common/styles';
import { useServiceQuery } from '../../components/admin/common/hooks';
import { escalationService } from '../../services/admin/escalationService';
import { getApiErrorMessage } from '../../services/apiClient';
import { parseNotifyRoles, type EscalationRuleDto } from '../../types/escalation';
import { dateLocale, useTranslation } from '../../i18n';

const LOG_PAGE_SIZE = 10;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale(), { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

const EscalationSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const rules = useServiceQuery(() => escalationService.listRules(), 'escalation-rules');
  const [logPage, setLogPage] = useState(1);
  const logs = useServiceQuery(() => escalationService.listLogs(logPage, LOG_PAGE_SIZE), `escalation-logs|${logPage}`);
  const logItems = logs.data?.items ?? [];

  const [formRule, setFormRule] = useState<EscalationRuleDto | 'new' | null>(null);
  const [deletingRule, setDeletingRule] = useState<EscalationRuleDto | null>(null);
  const [confirmTrigger, setConfirmTrigger] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const run = async (key: string, action: () => Promise<string>) => {
    setPending(key);
    try {
      setNotice({ kind: 'success', message: await action() });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setPending(null);
      rules.reload();
      logs.reload();
    }
  };

  const ruleItems = rules.data ?? [];
  const activeCount = ruleItems.filter((r) => r.isActive).length;

  return (
    <div>
      <EscalationSettingsSection />

      <div className="px-4 sm:px-6 pb-6 space-y-6">
        <Notice notice={notice} onClose={() => setNotice(null)} />

        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t('admin.settings.escalation.rules.title')}
                {rules.data && (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {t('admin.settings.escalation.rules.activeCount', { active: activeCount, total: ruleItems.length })}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('admin.settings.escalation.rules.description')}
              </p>
            </div>
            <div className="sm:ml-auto flex gap-2">
              <button
                onClick={() => setConfirmTrigger(true)}
                disabled={pending === 'trigger'}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-60"
              >
                <ScanSearch className="w-4 h-4" />
                {t('admin.settings.escalation.rules.scanNow')}
              </button>
              <button
                onClick={() => setFormRule('new')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                {t('admin.settings.escalation.rules.add')}
              </button>
            </div>
          </div>

          {rules.error && <Notice notice={{ kind: 'error', message: rules.error }} />}

          <div
            className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
              rules.loading ? 'opacity-60' : ''
            }`}
          >
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className={thClass}>{t('admin.settings.escalation.rules.appliesFrom')}</th>
                  <th className={thClass}>{t('admin.settings.escalation.rules.notifyRoles')}</th>
                  <th className={thClass}>{t('admin.settings.escalation.rules.descriptionColumn')}</th>
                  <th className={thClass}>{t('admin.common.status')}</th>
                  <th className={`${thClass} text-right`}>{t('admin.common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ruleItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                      {rules.loading ? t('admin.common.loading') : t('admin.settings.escalation.rules.empty')}
                    </td>
                  </tr>
                )}
                {ruleItems.map((rule) => {
                  const severity = escalationSeverityMeta(rule.minSeverityLevel);
                  const roles = parseNotifyRoles(rule.notifyRoles);
                  const busy = pending === rule.id;
                  return (
                    <tr key={rule.id} className={rule.isActive ? 'hover:bg-slate-50' : 'bg-slate-50/60 text-slate-400'}>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-bold font-mono-data whitespace-nowrap ${severity.badgeClass}`}
                        >
                          {severity.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {roles.length > 0 ? roles.map((r) => t(`admin.settings.escalation.notifyRole.${r}`)).join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[260px]">
                        <span className="line-clamp-2" title={rule.description ?? undefined}>
                          {rule.description || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${
                            rule.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          {rule.isActive ? t('admin.settings.escalation.rules.active') : t('admin.settings.escalation.rules.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setFormRule(rule)}
                            className={iconButtonClass}
                            aria-label={t('admin.settings.escalation.rules.edit')}
                            title={t('admin.settings.escalation.rules.edit')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              run(rule.id, async () => {
                                await escalationService.setActive(rule.id, !rule.isActive);
                                return rule.isActive ? t('admin.settings.escalation.rules.disabled') : t('admin.settings.escalation.rules.enabled');
                              })
                            }
                            disabled={busy}
                            className={iconButtonClass}
                            aria-label={rule.isActive ? t('admin.settings.escalation.rules.disable') : t('admin.settings.escalation.rules.enable')}
                            title={rule.isActive ? t('admin.settings.escalation.rules.disable') : t('admin.settings.escalation.rules.enable')}
                          >
                            {rule.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setDeletingRule(rule)}
                            disabled={busy}
                            className={iconButtonClass}
                            aria-label={t('admin.settings.escalation.rules.delete')}
                            title={t('admin.settings.escalation.rules.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              {t('admin.settings.escalation.logs.title')}{' '}
              <span className="text-xs font-normal text-slate-500">{t('admin.settings.escalation.logs.newestFirst')}</span>
            </h2>
            <button
              onClick={logs.reload}
              disabled={logs.loading}
              className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logs.loading ? 'animate-spin' : ''}`} />
              {t('admin.monitoring.refresh')}
            </button>
          </div>

          {logs.error && <Notice notice={{ kind: 'error', message: logs.error }} />}

          <div
            className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
              logs.loading ? 'opacity-60' : ''
            }`}
          >
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className={thClass}>{t('admin.settings.escalation.logs.time')}</th>
                  <th className={thClass}>{t('admin.settings.escalation.logs.incident')}</th>
                  <th className={thClass}>{t('admin.settings.escalation.logs.severity')}</th>
                  <th className={thClass}>{t('admin.settings.escalation.logs.currentStatus')}</th>
                  <th className={thClass}>{t('admin.settings.escalation.logs.action')}</th>
                  <th className={thClass}>{t('admin.settings.escalation.logs.resolved')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                      {logs.loading
                        ? t('admin.common.loading')
                        : logPage > 1
                          ? t('admin.settings.escalation.logs.emptyPage')
                          : t('admin.settings.escalation.logs.empty')}
                    </td>
                  </tr>
                )}
                {logItems.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono-data text-xs text-slate-600 whitespace-nowrap">
                      {formatDateTime(log.triggerTime)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{log.incidentTitle || t('admin.monitoring.incident.missing')}</div>
                      <div className="text-[11px] font-mono-data text-slate-400">{log.incidentId.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono-data whitespace-nowrap">{severityLabel(log.incidentSeverity)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {t(`admin.monitoring.incident.status.${log.incidentStatus}`, { defaultValue: log.incidentStatus })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[280px]">
                      <span className="line-clamp-2" title={log.actionTaken ?? undefined}>
                        {log.actionTaken || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono-data whitespace-nowrap">
                      {log.resolvedAt ? (
                        <span className="text-emerald-700">
                          {formatDateTime(log.resolvedAt)}
                          {log.resolutionTimeMs !== null &&
                            t('admin.settings.escalation.logs.resolvedAfter', { minutes: Math.round(log.resolutionTimeMs / 60000) })}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold">{t('admin.settings.escalation.logs.notYet')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-mono-data">
              {logItems.length > 0
                ? t('admin.settings.escalation.logs.range', {
                    from: (logPage - 1) * LOG_PAGE_SIZE + 1,
                    to: (logPage - 1) * LOG_PAGE_SIZE + logItems.length,
                  })
                : ''}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                disabled={logPage <= 1 || logs.loading}
                aria-label={t('common.previousPage')}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono-data">{t('admin.settings.escalation.logs.page', { page: logPage })}</span>
              <button
                onClick={() => setLogPage((p) => p + 1)}
                disabled={!logs.data?.hasNextPage || logs.loading}
                aria-label={t('common.nextPage')}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {formRule && (
        <EscalationRuleFormDrawer
          initialRule={formRule === 'new' ? null : formRule}
          onClose={() => setFormRule(null)}
          onSaved={() => {
            setNotice({ kind: 'success', message: formRule === 'new' ? t('admin.settings.escalation.rules.added') : t('admin.settings.escalation.rules.updated') });
            setFormRule(null);
            rules.reload();
          }}
        />
      )}

      {deletingRule && (
        <ConfirmModal
          title={t('admin.settings.escalation.rules.deleteTitle')}
          confirmLabel={t('admin.settings.escalation.rules.delete')}
          submitting={pending === deletingRule.id}
          onCancel={() => setDeletingRule(null)}
          onConfirm={async () => {
            const target = deletingRule;
            await run(target.id, async () => {
              await escalationService.deleteRule(target.id);
              return t('admin.settings.escalation.rules.deleted');
            });
            setDeletingRule(null);
          }}
        >
          <p>
            {t('admin.settings.escalation.rules.deleteBody', { severity: escalationSeverityMeta(deletingRule.minSeverityLevel).label })}
          </p>
          {activeCount === 1 && deletingRule.isActive && (
            <p className="text-amber-700">
              {t('admin.settings.escalation.rules.deleteLastActive')}
            </p>
          )}
        </ConfirmModal>
      )}

      {confirmTrigger && (
        <ConfirmModal
          title={t('admin.settings.escalation.rules.scanTitle')}
          confirmLabel={t('admin.settings.escalation.rules.scanNow')}
          submitting={pending === 'trigger'}
          onCancel={() => setConfirmTrigger(false)}
          onConfirm={async () => {
            await run('trigger', async () => {
              const count = await escalationService.triggerCheck();
              return count > 0 ? t('admin.settings.escalation.rules.scanResult', { count }) : t('admin.settings.escalation.rules.scanNone');
            });
            setConfirmTrigger(false);
            // Bản ghi mới nằm đầu danh sách.
            setLogPage(1);
          }}
        >
          <p>
            {t('admin.settings.escalation.rules.scanBody')}
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default EscalationSettingsPage;
