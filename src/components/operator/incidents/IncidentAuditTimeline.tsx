import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
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
import { CANCELLATION_REASON_LABEL } from '../../../data/incidentMock';
import { getApiErrorMessage } from '../../../services/apiClient';
import { incidentService } from '../../../services/incidentService';
import type { CancellationReasonCode, IncidentAuditAction, IncidentAuditEntryDto } from '../../../types/incident';

const ACTION_META: Record<IncidentAuditAction, { label: string; icon: LucideIcon; color: string }> = {
  Created: { label: 'Tiếp nhận tin báo', icon: FilePlus2, color: '#64748B' },
  AiAnalyzed: { label: 'AI phân tích xong', icon: BrainCircuit, color: '#7C3AED' },
  Verified: { label: 'Operator xác minh', icon: ShieldCheck, color: '#059669' },
  SeverityOverridden: { label: 'Ghi đè đánh giá AI', icon: SlidersHorizontal, color: '#D97706' },
  Dispatched: { label: 'Giao tổ / xe', icon: Truck, color: '#2563EB' },
  AssignmentAccepted: { label: 'Đội nhận nhiệm vụ', icon: ThumbsUp, color: '#0EA5E9' },
  AssignmentRejected: { label: 'Đội từ chối nhiệm vụ', icon: ThumbsDown, color: '#D97706' },
  StatusChanged: { label: 'Đổi trạng thái', icon: CircleDot, color: '#64748B' },
  Escalated: { label: 'Leo thang', icon: Siren, color: '#DC2626' },
  DeEscalated: { label: 'Hạ leo thang', icon: CheckCircle2, color: '#059669' },
  Cancelled: { label: 'Hủy sự cố', icon: Ban, color: '#DC2626' },
  Completed: { label: 'Hoàn tất xử lý', icon: CheckCircle2, color: '#059669' },
  Closed: { label: 'Đóng hồ sơ', icon: Flag, color: '#059669' },
  ReDispatched: { label: 'Điều phối lại', icon: Repeat, color: '#2563EB' },
  PhoneRevealed: { label: 'Xem số điện thoại người báo', icon: Eye, color: '#64748B' },
  ReporterBlocked: { label: 'Chặn số người báo', icon: PhoneOff, color: '#DC2626' },
  TransferredStation: { label: 'Chuyển trạm phụ trách', icon: ArrowRightLeft, color: '#2563EB' },
  OutOfServiceArea: { label: 'SOS ngoài khu vực phục vụ', icon: MapPinOff, color: '#DC2626' },
};

const UNKNOWN_ACTION = { label: 'Thao tác khác', icon: CircleDot, color: '#64748B' };

const ROLE_LABEL: Record<string, string> = {
  Operator: 'Điều phối viên',
  Admin: 'Quản trị viên',
  RescueStaff: 'Đội cứu hộ',
  Citizen: 'Người dân',
  System: 'Hệ thống',
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });

function parseState(json?: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const formatValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (/cancellationReason|reasonCode/i.test(key) && typeof value === 'string') {
    return CANCELLATION_REASON_LABEL[value as CancellationReasonCode] ?? value;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/** Trạng thái trước / sau (oldStateJson / newStateJson) — chỉ các trường thay đổi hoặc có trong bản sau. */
const StateDiff: React.FC<{ entry: IncidentAuditEntryDto }> = ({ entry }) => {
  const before = parseState(entry.oldStateJson);
  const after = parseState(entry.newStateJson);
  if (!before && !after) return null;
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  return (
    <dl className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 space-y-1 text-[11px]">
      {keys.map((key) => {
        const oldValue = before?.[key];
        const newValue = after?.[key];
        const changed = before && JSON.stringify(oldValue) !== JSON.stringify(newValue);
        return (
          <div key={key} className="flex gap-2 min-w-0">
            <dt className="w-32 shrink-0 text-slate-500 font-mono-data truncate" title={key}>
              {key}
            </dt>
            <dd className="min-w-0 text-slate-700 break-words">
              {changed ? (
                <>
                  <span className="line-through text-slate-400">{formatValue(key, oldValue)}</span>
                  {' → '}
                  <span className="font-semibold">{formatValue(key, newValue)}</span>
                </>
              ) : (
                formatValue(key, after ? newValue : oldValue)
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
};

const TimelineItem: React.FC<{ entry: IncidentAuditEntryDto; isLast: boolean }> = ({ entry, isLast }) => {
  const [open, setOpen] = useState(false);
  const meta = ACTION_META[entry.action] ?? UNKNOWN_ACTION;
  const Icon = meta.icon;
  const hasState = !!(entry.oldStateJson || entry.newStateJson);
  const role = entry.actorRole ? (ROLE_LABEL[entry.actorRole] ?? entry.actorRole) : null;

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
          <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
          <span className="text-[11px] font-mono-data text-slate-400 whitespace-nowrap shrink-0">
            {formatTime(entry.timestamp)}
          </span>
        </div>
        {(entry.actorName || role) && (
          <p className="text-xs text-slate-500 mt-0.5">
            {entry.actorName ?? 'Hệ thống'}
            {role && <span className="text-slate-400"> · {role}</span>}
          </p>
        )}
        {entry.description && <p className="text-xs text-slate-700 mt-1 leading-relaxed">{entry.description}</p>}
        {hasState && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            aria-expanded={open}
          >
            {open ? 'Ẩn chi tiết' : 'Xem chi tiết'}
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
        {open && <StateDiff entry={entry} />}
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
      setError(getApiErrorMessage(err, 'Không tải được lịch sử xử lý.'));
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
          {loading ? 'Đang tải…' : `${total} thao tác${total > entries.length ? ` · hiện ${entries.length} gần nhất` : ''}`}
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Tải lại
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
          Đang tải lịch sử xử lý…
        </p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">Chưa có thao tác nào được ghi nhận.</p>
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
