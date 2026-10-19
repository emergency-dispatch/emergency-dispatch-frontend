import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Lock, X } from 'lucide-react';
import { labelClass } from '../common/styles';
import { ACTOR_ROLE_LABEL, AUDIT_ACTION_LABEL, AUDIT_GROUP_META, auditTargetLink, formatAuditTime } from './auditMeta';
import { AUDIT_ACTION_GROUP, type AuditTrailEntry } from '../../../types/auditTrail';

interface AuditDetailDrawerProps {
  entry: AuditTrailEntry;
  onClose: () => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-slate-100 last:border-0">
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className="text-sm text-slate-900 min-w-0 break-words">{children}</dd>
  </div>
);

/** Chi tiết một bản ghi — chỉ đọc. */
export const AuditDetailDrawer: React.FC<AuditDetailDrawerProps> = ({ entry, onClose }) => {
  const group = AUDIT_GROUP_META[AUDIT_ACTION_GROUP[entry.action]];
  const Icon = group.icon;
  const link = auditTargetLink(entry);

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
        aria-label="Chi tiết bản ghi"
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in"
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-bold ${group.badgeClass}`}>
            <Icon className="w-3.5 h-3.5" />
            {AUDIT_ACTION_LABEL[entry.action]}
          </span>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <p className="text-sm text-slate-800">{entry.detail}</p>

          <dl>
            <Row label="Thời điểm">
              <span className="font-mono-data">{formatAuditTime(entry.at)}</span>
            </Row>
            <Row label="Người thao tác">
              {entry.actorName} <span className="text-slate-500">· {ACTOR_ROLE_LABEL[entry.actorRole]}</span>
            </Row>
            <Row label="Nhóm">{group.label}</Row>
            <Row label="Đối tượng">
              <span className="font-mono-data">{entry.targetLabel}</span>
              {link && (
                <Link to={link} className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline">
                  Mở
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </Row>
            {entry.incidentId && (
              <Row label="Sự cố">
                <span className="font-mono-data">{entry.incidentId}</span>
              </Row>
            )}
            <Row label="Mã bản ghi">
              <span className="font-mono-data text-xs text-slate-500">{entry.id}</span>
            </Row>
          </dl>

          {entry.changes.length > 0 && (
            <section className="space-y-2">
              <h3 className={labelClass}>Thay đổi</h3>
              <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                {entry.changes.map((c, i) => (
                  <li key={i} className="px-3 py-2 text-sm">
                    <div className="text-xs text-slate-500">{c.field}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-slate-500 line-through decoration-slate-300">{c.from}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-900">{c.to}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {entry.reason && (
            <section className="space-y-2">
              <h3 className={labelClass}>Lý do</h3>
              <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap">
                {entry.reason}
              </p>
            </section>
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-slate-200 flex items-center gap-2 text-[11px] text-slate-500">
          <Lock className="w-3.5 h-3.5" />
          Bản ghi chỉ đọc, không thể sửa hoặc xóa.
        </div>
      </aside>
    </>
  );
};
