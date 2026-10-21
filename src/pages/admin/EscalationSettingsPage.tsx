import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Pencil, Plus, Power, PowerOff, RefreshCw, ScanSearch, Trash2 } from 'lucide-react';
import { EscalationRuleFormDrawer } from '../../components/admin/escalation/EscalationRuleFormDrawer';
import {
  INCIDENT_STATUS_LABEL,
  NOTIFY_ROLE_LABEL,
  escalationSeverityMeta,
  severityLabel,
} from '../../components/admin/escalation/escalationMeta';
import { ConfirmModal, Notice, type NoticeState } from '../../components/admin/common/ui';
import { iconButtonClass, thClass } from '../../components/admin/common/styles';
import { useServiceQuery } from '../../components/admin/common/hooks';
import { escalationService } from '../../services/admin/escalationService';
import { getApiErrorMessage } from '../../services/apiClient';
import { parseNotifyRoles, type EscalationRuleDto } from '../../types/escalation';

const LOG_PAGE_SIZE = 10;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

const EscalationSettingsPage: React.FC = () => {
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
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            Escalation Daemon quét mỗi 30 giây: sự cố đạt cấp tối thiểu của quy tắc mà chưa có đội nhận quá ngưỡng chờ sẽ
            chuyển sang <span className="font-bold">Leo thang</span>, gửi cảnh báo tới các vai trò đã chọn và mở rộng bán
            kính tìm xe.
          </p>
          <p className="text-[12px] text-blue-700">
            Ngưỡng tính theo phút nguyên, chưa phân biệt ban ngày / ban đêm. Nếu không có quy tắc nào đang bật, hệ thống tự
            tạo quy tắc mặc định (Cấp 3, 3 phút).
          </p>
        </div>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-sm font-bold text-slate-900">
            Quy tắc leo thang
            {rules.data && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                {activeCount}/{ruleItems.length} đang bật
              </span>
            )}
          </h2>
          <div className="sm:ml-auto flex gap-2">
            <button
              onClick={() => setConfirmTrigger(true)}
              disabled={pending === 'trigger'}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-60"
            >
              <ScanSearch className="w-4 h-4" />
              Quét ngay
            </button>
            <button
              onClick={() => setFormRule('new')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Thêm quy tắc
            </button>
          </div>
        </div>

        {rules.error && <Notice notice={{ kind: 'error', message: rules.error }} />}

        <div
          className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
            rules.loading ? 'opacity-60' : ''
          }`}
        >
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className={thClass}>Áp dụng từ</th>
                <th className={thClass}>Ngưỡng chờ</th>
                <th className={thClass}>Mở rộng bán kính</th>
                <th className={thClass}>Nhận cảnh báo</th>
                <th className={thClass}>Mô tả</th>
                <th className={thClass}>Trạng thái</th>
                <th className={`${thClass} text-right`}>Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ruleItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    {rules.loading ? 'Đang tải...' : 'Chưa có quy tắc nào — hệ thống đang dùng quy tắc mặc định.'}
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
                    <td className="px-4 py-3 font-mono-data whitespace-nowrap">{rule.timeoutMinutes} phút</td>
                    <td className="px-4 py-3 font-mono-data whitespace-nowrap">+{rule.expandRadiusPercent}%</td>
                    <td className="px-4 py-3 text-xs">
                      {roles.length > 0 ? roles.map((r) => NOTIFY_ROLE_LABEL[r]).join(', ') : '—'}
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
                        {rule.isActive ? 'Đang bật' : 'Đã tắt'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setFormRule(rule)} className={iconButtonClass} aria-label="Sửa quy tắc" title="Sửa quy tắc">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            run(rule.id, async () => {
                              await escalationService.setActive(rule.id, !rule.isActive);
                              return rule.isActive ? 'Đã tắt quy tắc.' : 'Đã bật quy tắc.';
                            })
                          }
                          disabled={busy}
                          className={iconButtonClass}
                          aria-label={rule.isActive ? 'Tắt quy tắc' : 'Bật quy tắc'}
                          title={rule.isActive ? 'Tắt quy tắc' : 'Bật quy tắc'}
                        >
                          {rule.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setDeletingRule(rule)}
                          disabled={busy}
                          className={iconButtonClass}
                          aria-label="Xóa quy tắc"
                          title="Xóa quy tắc"
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
            Nhật ký kích hoạt <span className="text-xs font-normal text-slate-500">(mới nhất trước)</span>
          </h2>
          <button
            onClick={logs.reload}
            disabled={logs.loading}
            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${logs.loading ? 'animate-spin' : ''}`} />
            Làm mới
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
                <th className={thClass}>Thời điểm</th>
                <th className={thClass}>Sự cố</th>
                <th className={thClass}>Cấp</th>
                <th className={thClass}>Trạng thái hiện tại</th>
                <th className={thClass}>Hành động hệ thống</th>
                <th className={thClass}>Đã có đội nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                    {logs.loading ? 'Đang tải...' : logPage > 1 ? 'Không còn bản ghi ở trang này.' : 'Chưa có lần leo thang nào.'}
                  </td>
                </tr>
              )}
              {logItems.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono-data text-xs text-slate-600 whitespace-nowrap">
                    {formatDateTime(log.triggerTime)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{log.incidentTitle || 'Sự cố không còn tồn tại'}</div>
                    <div className="text-[11px] font-mono-data text-slate-400">{log.incidentId.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono-data whitespace-nowrap">{severityLabel(log.incidentSeverity)}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {INCIDENT_STATUS_LABEL[log.incidentStatus] ?? log.incidentStatus}
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
                        {log.resolutionTimeMs !== null && ` (sau ${Math.round(log.resolutionTimeMs / 60000)} phút)`}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold">Chưa</span>
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
              ? `Bản ghi ${(logPage - 1) * LOG_PAGE_SIZE + 1}–${(logPage - 1) * LOG_PAGE_SIZE + logItems.length}`
              : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLogPage((p) => Math.max(1, p - 1))}
              disabled={logPage <= 1 || logs.loading}
              aria-label="Trang trước"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono-data">Trang {logPage}</span>
            <button
              onClick={() => setLogPage((p) => p + 1)}
              disabled={!logs.data?.hasNextPage || logs.loading}
              aria-label="Trang sau"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {formRule && (
        <EscalationRuleFormDrawer
          initialRule={formRule === 'new' ? null : formRule}
          onClose={() => setFormRule(null)}
          onSaved={() => {
            setNotice({ kind: 'success', message: formRule === 'new' ? 'Đã thêm quy tắc leo thang.' : 'Đã cập nhật quy tắc.' });
            setFormRule(null);
            rules.reload();
          }}
        />
      )}

      {deletingRule && (
        <ConfirmModal
          title="Xóa quy tắc leo thang?"
          confirmLabel="Xóa quy tắc"
          submitting={pending === deletingRule.id}
          onCancel={() => setDeletingRule(null)}
          onConfirm={async () => {
            const target = deletingRule;
            await run(target.id, async () => {
              await escalationService.deleteRule(target.id);
              return 'Đã xóa quy tắc.';
            });
            setDeletingRule(null);
          }}
        >
          <p>
            Quy tắc {escalationSeverityMeta(deletingRule.minSeverityLevel).label} · {deletingRule.timeoutMinutes} phút sẽ
            ngừng áp dụng. Nhật ký các lần đã kích hoạt vẫn được giữ.
          </p>
          {activeCount === 1 && deletingRule.isActive && (
            <p className="text-amber-700">
              Đây là quy tắc duy nhất đang bật — sau khi xóa, hệ thống sẽ tự tạo lại quy tắc mặc định (Cấp 3, 3 phút).
            </p>
          )}
        </ConfirmModal>
      )}

      {confirmTrigger && (
        <ConfirmModal
          title="Quét leo thang ngay?"
          confirmLabel="Quét ngay"
          submitting={pending === 'trigger'}
          onCancel={() => setConfirmTrigger(false)}
          onConfirm={async () => {
            await run('trigger', async () => {
              const count = await escalationService.triggerCheck();
              return count > 0 ? `Đã leo thang ${count} sự cố.` : 'Không có sự cố nào cần leo thang.';
            });
            setConfirmTrigger(false);
            // Bản ghi mới nằm đầu danh sách.
            setLogPage(1);
          }}
        >
          <p>
            Chạy ngay một lượt quét thay vì chờ chu kỳ 30 giây. Sự cố quá ngưỡng sẽ chuyển sang Leo thang thật và gửi cảnh
            báo tới Command Center.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default EscalationSettingsPage;
