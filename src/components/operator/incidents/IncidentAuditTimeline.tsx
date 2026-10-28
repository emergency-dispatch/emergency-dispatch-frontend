import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  Eye,
  FilePlus2,
  Flag,
  Loader2,
  MapPinOff,
  PhoneOff,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { getApiErrorMessage } from '../../../services/apiClient';
import { incidentService } from '../../../services/incidentService';
import type { IncidentAuditAction, IncidentAuditEntryDto } from '../../../types/incident';
import i18n, { dateLocale, useTranslation } from '../../../i18n';

// Nhãn: incidents.audit.actions.<action> trong từ điển.
const ACTION_META: Record<IncidentAuditAction, { icon: LucideIcon; color: string }> = {
  Created: { icon: FilePlus2, color: '#64748B' },
  AiAnalyzed: { icon: BrainCircuit, color: '#7C3AED' },
  Verified: { icon: ShieldCheck, color: '#059669' },
  SeverityOverridden: { icon: SlidersHorizontal, color: '#D97706' },
  Dispatched: { icon: Truck, color: '#2563EB' },
  AssignmentAccepted: { icon: ThumbsUp, color: '#0EA5E9' },
  AssignmentRejected: { icon: ThumbsDown, color: '#D97706' },
  StatusChanged: { icon: CircleDot, color: '#64748B' },
  Escalated: { icon: Siren, color: '#DC2626' },
  DeEscalated: { icon: CheckCircle2, color: '#059669' },
  Cancelled: { icon: Ban, color: '#DC2626' },
  Completed: { icon: CheckCircle2, color: '#059669' },
  Closed: { icon: Flag, color: '#059669' },
  ReDispatched: { icon: Repeat, color: '#2563EB' },
  PhoneRevealed: { icon: Eye, color: '#64748B' },
  ReporterBlocked: { icon: PhoneOff, color: '#DC2626' },
  TransferredStation: { icon: ArrowRightLeft, color: '#2563EB' },
  OutOfServiceArea: { icon: MapPinOff, color: '#DC2626' },
};

const UNKNOWN_ACTION = { icon: CircleDot, color: '#64748B' };

const KNOWN_ROLES = ['Operator', 'Admin', 'RescueStaff', 'Citizen', 'System'] as const;
type KnownRole = (typeof KNOWN_ROLES)[number];
const isKnownRole = (role: string): role is KnownRole => (KNOWN_ROLES as readonly string[]).includes(role);

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });

const TimelineItem: React.FC<{ entry: IncidentAuditEntryDto; isLast: boolean }> = ({ entry, isLast }) => {
  const { t } = useTranslation();
  const meta = ACTION_META[entry.action] ?? UNKNOWN_ACTION;
  const label = entry.action in ACTION_META ? t(`incidents.audit.actions.${entry.action}`) : t('incidents.audit.unknownAction');
  const Icon = meta.icon;
  const role = entry.actorRole
    ? isKnownRole(entry.actorRole)
      ? t(`incidents.audit.roles.${entry.actorRole}`)
      : entry.actorRole
    : null;

  return (
    <li className="relative flex gap-3 pb-4">
      {!isLast && <span aria-hidden className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-200" />}
      <span
        className="relative z-[1] w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm"
        style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <span className="text-[11px] font-mono-data text-slate-400 whitespace-nowrap shrink-0">
            {formatTime(entry.timestamp)}
          </span>
        </div>
        {(entry.actorName || role) && (
          <p className="text-xs text-slate-500 mt-0.5">
            {entry.actorName ?? t('incidents.audit.system')}
            {role && <span className="text-slate-400"> · {role}</span>}
          </p>
        )}
        {/* Mô tả của mốc "Created" do backend ghi cứng ("Tiếp nhận báo cáo SOS"), trùng tiêu đề và gán nhầm người dân là người tiếp nhận → ẩn. */}
        {entry.description && entry.action !== 'Created' && (
          <p className="text-xs text-slate-700 mt-1 leading-relaxed">{entry.description}</p>
        )}
      </div>
    </li>
  );
};

interface IncidentAuditTimelineProps {
  incidentId: string;
}

/**
 * Lịch sử xử lý sự cố (GET /api/incidents/{id}/audit-trail): ai làm gì, lúc nào — tiếp nhận, AI, xác minh / ghi đè,
 * giao tổ, đội nhận / từ chối, leo thang, chuyển trạm, hủy (kèm lý do)… Mới nhất ở trên.
 */
export const IncidentAuditTimeline: React.FC<IncidentAuditTimelineProps> = ({ incidentId }) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<IncidentAuditEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await incidentService.getAuditTrail(incidentId);
      setEntries(
        [...page.items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
      setTotal(page.totalCount);
    } catch (err) {
      setError(getApiErrorMessage(err, i18n.t('incidents.audit.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {loading
            ? t('common.loading')
            : t('incidents.audit.count', { count: total }) +
              (total > entries.length ? t('incidents.audit.showingLatest', { count: entries.length }) : '')}
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {t('incidents.audit.reload')}
        </button>
      </div>

      {error ? (
        <p className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          {error}
        </p>
      ) : loading && entries.length === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 py-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t('incidents.audit.loading')}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">{t('incidents.audit.empty')}</p>
      ) : (
        <ol>
          {entries.map((entry, index) => (
            <TimelineItem key={entry.id} entry={entry} isLast={index === entries.length - 1} />
          ))}
        </ol>
      )}
    </div>
  );
};
