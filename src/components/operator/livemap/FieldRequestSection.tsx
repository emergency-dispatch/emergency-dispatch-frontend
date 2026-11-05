import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Radio, Siren } from 'lucide-react';
import { useDispatchStore } from '../../../context/DispatchContext';
import { OVERRIDE_REASON_MIN_LENGTH } from '../../../data/incidentMock';
import type { FieldRequestDto } from '../../../types/fieldRequest';
import { useTranslation } from '../../../i18n';

interface FieldRequestCardProps {
  request: FieldRequestDto;
  now: number;
  highlighted: boolean;
  /** Sự cố nằm trên bảng điều phối của trạm mình (trạm phụ trách) → được giao thêm xe theo yêu cầu. */
  canAssign: boolean;
  onServe: () => void;
  onSelectIncident: () => void;
}

const FieldRequestCard: React.FC<FieldRequestCardProps> = ({
  request,
  now,
  highlighted,
  canAssign,
  onServe,
  onSelectIncident,
}) => {
  const { acknowledgeFieldRequest, fulfillFieldRequest, declineFieldRequest } = useDispatchStore();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'idle' | 'fulfill' | 'decline'>('idle');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlighted]);

  const isBackup = request.type === 'Backup';
  const isEscalated = !!request.escalatedAt;
  const ageMinutes = Math.max(0, Math.floor((now - new Date(request.createdAt).getTime()) / 60000));
  const noteLength = note.trim().length;
  const declineValid = noteLength >= OVERRIDE_REASON_MIN_LENGTH;

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(true);
    setError(null);
    const res = await action();
    setBusy(false);
    if (!res.ok) setError(res.message ?? t('liveMap.fieldRequests.actionFailed'));
    // Thành công: yêu cầu đóng → card tự biến mất; tiếp nhận → về trạng thái thường.
    else {
      setMode('idle');
      setNote('');
    }
  };

  const typeLabel = isBackup
    ? request.requestedUnitType
      ? t('liveMap.fieldRequests.backupType', {
          count: request.quantity,
          type: t(`enums.unitType.${request.requestedUnitType}`),
        })
      : t('liveMap.fieldRequests.backup', { count: request.quantity })
    : t('liveMap.fieldRequests.other');

  const frameClass = isEscalated
    ? 'border-red-300 bg-red-50/70'
    : highlighted
      ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-300'
      : 'border-orange-200 bg-white';

  return (
    <div ref={ref} className={`rounded-lg border px-2.5 py-2 space-y-1.5 ${frameClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold ${isBackup ? 'text-orange-700' : 'text-slate-700'}`}
        >
          <Radio className="w-3 h-3 shrink-0" />
          {typeLabel}
        </span>
        <span className="text-[10px] font-mono-data text-slate-400 whitespace-nowrap">
          {t('liveMap.fieldRequests.age', { count: ageMinutes })}
        </span>
      </div>

      {(isEscalated || request.status === 'Acknowledged') && (
        <div className="flex flex-wrap gap-1">
          {isEscalated && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600 text-[9px] font-bold text-white uppercase">
              <Siren className="w-2.5 h-2.5" />
              {t('liveMap.fieldRequests.overdue')}
            </span>
          )}
          {request.status === 'Acknowledged' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[9px] font-bold text-blue-700">
              {t('liveMap.fieldRequests.acknowledged')}
            </span>
          )}
        </div>
      )}

      <button onClick={onSelectIncident} className="block w-full text-left">
        <p className="text-xs font-semibold text-slate-900 truncate hover:underline">{request.incidentTitle}</p>
        <p className="text-[10px] text-slate-500 truncate">
          {t('liveMap.fieldRequests.from', { plate: request.plateNumber ?? '—', name: request.requestedByName ?? '—' })}
        </p>
      </button>

      {request.description && (
        <p className="text-[11px] text-slate-700 leading-snug whitespace-pre-line break-words">{request.description}</p>
      )}
      {!canAssign && <p className="text-[10px] text-slate-400">{t('liveMap.fieldRequests.otherStation')}</p>}

      {error && <p className="text-[10px] text-red-600">{error}</p>}

      {request.status === 'Open' ? (
        // Bước 1: tiếp nhận trước (đội được báo "trung tâm đã tiếp nhận"), rồi mới hiện các cách xử lý.
        // Backend vẫn cho xử lý thẳng từ Open — đây là quy trình FE chọn để đội luôn biết yêu cầu đã có người lo.
        <button
          onClick={() => run(() => acknowledgeFieldRequest(request.id))}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded bg-orange-600 text-[11px] font-bold text-white hover:bg-orange-500 disabled:opacity-60"
        >
          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          {t('liveMap.fieldRequests.acknowledge')}
        </button>
      ) : mode === 'idle' ? (
        <div className="flex flex-wrap gap-1">
          {isBackup && canAssign && (
            <button
              onClick={onServe}
              disabled={busy}
              className="px-2 py-1 rounded bg-red-600 text-[10px] font-bold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {t('liveMap.fieldRequests.assign')}
            </button>
          )}
          <button
            onClick={() => setMode('fulfill')}
            disabled={busy}
            title={isBackup ? t('liveMap.fieldRequests.fulfillBackupTitle') : t('liveMap.fieldRequests.fulfillOtherTitle')}
            className="px-2 py-1 rounded border border-emerald-200 bg-white text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {isBackup ? t('liveMap.fieldRequests.fulfillBackup') : t('liveMap.fieldRequests.fulfillOther')}
          </button>
          <button
            onClick={() => setMode('decline')}
            disabled={busy}
            className="px-2 py-1 rounded border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            {t('liveMap.fieldRequests.decline')}
          </button>
          {busy && <Loader2 className="w-3 h-3 animate-spin text-slate-400 self-center" />}
        </div>
      ) : (
        <div className="space-y-1.5">
          {mode === 'fulfill' && (
            <p className="text-[10px] text-slate-600 leading-snug">{isBackup ? t('liveMap.fieldRequests.fulfillBackupHint') : t('liveMap.fieldRequests.fulfillOtherHint')}</p>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            autoFocus
            placeholder={
              mode === 'fulfill'
                ? t('liveMap.fieldRequests.fulfillPlaceholder')
                : t('liveMap.fieldRequests.declinePlaceholder')
            }
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
          {mode === 'decline' && !declineValid && (
            <p className="text-[10px] text-amber-700">
              {t('liveMap.fieldRequests.minChars', { min: OVERRIDE_REASON_MIN_LENGTH, length: noteLength })}
            </p>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                setMode('idle');
                setNote('');
                setError(null);
              }}
              disabled={busy}
              className="py-1 rounded border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('liveMap.fieldRequests.back')}
            </button>
            <button
              onClick={() =>
                run(() =>
                  mode === 'fulfill'
                    ? fulfillFieldRequest(request.id, note.trim() || undefined)
                    : declineFieldRequest(request.id, note.trim())
                )
              }
              disabled={busy || (mode === 'decline' && !declineValid)}
              className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold text-white disabled:opacity-50 ${
                mode === 'fulfill' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" />}
              {t('liveMap.fieldRequests.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface FieldRequestSectionProps {
  now: number;
  /** Sự cố đang trên bảng điều phối của trạm mình (đã duyệt, chưa đóng). */
  boardIncidentIds: Set<string>;
  highlightRequestId: string | null;
  onServe: (request: FieldRequestDto) => void;
  onSelectIncident: (incidentId: string) => void;
}

/**
 * §21.2 Yêu cầu từ hiện trường: đội đang xử lý xin chi viện (Backup) hoặc báo vấn đề khác.
 * Operator tiếp nhận → giao thêm xe (Backup, tự đáp ứng) / đánh dấu đã đáp ứng / từ chối kèm lý do.
 * Danh sách đang mở do store giữ (GET /field-requests + ReceiveFieldRequest), cũ nhất trước.
 */
export const FieldRequestSection: React.FC<FieldRequestSectionProps> = ({
  now,
  boardIncidentIds,
  highlightRequestId,
  onServe,
  onSelectIncident,
}) => {
  const { fieldRequests } = useDispatchStore();
  const { t } = useTranslation();
  // Ghi nhớ yêu cầu đang làm nổi lúc thu gọn: mở từ thông báo khác (đổi highlight) → tự bung ra.
  const [collapsedAt, setCollapsedAt] = useState<{ highlight: string | null } | null>(null);
  const collapsed = collapsedAt !== null && collapsedAt.highlight === highlightRequestId;

  if (fieldRequests.length === 0) return null;
  const overdueCount = fieldRequests.filter((r) => r.escalatedAt).length;

  return (
    <section className="rounded-lg border border-orange-200 bg-orange-50/50">
      <button
        onClick={() => setCollapsedAt(collapsed ? null : { highlight: highlightRequestId })}
        aria-expanded={!collapsed}
        title={t('liveMap.fieldRequests.toggle')}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-orange-800">
          <Radio className="w-3.5 h-3.5" />
          {t('liveMap.fieldRequests.title')}
          <span className="px-1.5 rounded-full bg-orange-600 text-[10px] text-white font-mono-data">{fieldRequests.length}</span>
          {overdueCount > 0 && (
            <span className="px-1.5 rounded-full bg-red-600 text-[10px] text-white font-mono-data animate-pulse">
              {overdueCount}
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-orange-700 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>
      {!collapsed && (
        <div className="px-2 pb-2 space-y-1.5">
          {fieldRequests.map((r) => (
            <FieldRequestCard
              key={r.id}
              request={r}
              now={now}
              highlighted={r.id === highlightRequestId}
              canAssign={boardIncidentIds.has(r.incidentId)}
              onServe={() => onServe(r)}
              onSelectIncident={() => onSelectIncident(r.incidentId)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
