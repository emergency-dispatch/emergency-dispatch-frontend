import React, { useState } from 'react';
import { Building2, CheckCircle2, Clock, Loader2, Siren, Truck, Undo2, UserPlus } from 'lucide-react';
import { TRAFFIC_JAM_STATUS_COLOR } from '../../../data/liveMapMeta';
import { OVERRIDE_REASON_MIN_LENGTH } from '../../../data/incidentMock';
import { useNow } from '../../../hooks/useNow';
import type { ActionResult } from '../../../context/DispatchContext';
import type { RescueUnitResponseDto } from '../../../types/rescueUnit';
import type { TrafficJamReport } from '../../../types/incident';
import { dateLocale, useTranslation } from '../../../i18n';

// Ghi chú giải tỏa: backend giới hạn 500 ký tự.
const RESOLVE_NOTE_MAX = 500;

type Mode = 'idle' | 'assign' | 'unassign' | 'resolve';

interface TrafficJamPopupProps {
  jam: TrafficJamReport;
  /** Trạm của Operator — chỉ trạm phụ trách (hoặc điểm chưa có trạm) mới giao / rút / giải tỏa được. */
  myStationId: string | null;
  /** Xe Sẵn sàng của trạm mình (PolicePatrol trước). */
  assignableUnits: RescueUnitResponseDto[];
  onAssign?: (id: string, rescueUnitId: string, notes?: string) => Promise<ActionResult>;
  onUnassign?: (id: string, reason: string) => Promise<ActionResult>;
  onResolve?: (id: string, note?: string) => Promise<ActionResult>;
}

/** §20/§24: popup điểm ùn tắc — trạng thái, xe đang giải tỏa, giao / rút đội, đánh dấu đã giải tỏa. */
export const TrafficJamPopup: React.FC<TrafficJamPopupProps> = ({
  jam,
  myStationId,
  assignableUnits,
  onAssign,
  onUnassign,
  onResolve,
}) => {
  const { t } = useTranslation();
  const now = useNow();
  const [mode, setMode] = useState<Mode>('idle');
  const [unitId, setUnitId] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAssigned = jam.status === 'assigned';
  const escalated = !isAssigned && !!jam.escalatedAt;
  const canManage = !jam.responsibleStationId || jam.responsibleStationId === myStationId;
  const remainingMin = Math.max(0, Math.ceil((new Date(jam.expiresAt).getTime() - now) / 60000));
  const statusColor = escalated
    ? TRAFFIC_JAM_STATUS_COLOR.escalated
    : TRAFFIC_JAM_STATUS_COLOR[jam.status];
  const time = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

  const open = (next: Mode) => {
    setMode(next);
    setText('');
    setError(null);
    if (next === 'assign') setUnitId(assignableUnits[0]?.id ?? '');
  };

  const run = async (action: () => Promise<ActionResult> | undefined, fallback: string) => {
    const pending = action();
    if (!pending) return;
    setBusy(true);
    setError(null);
    const result = await pending;
    setBusy(false);
    // Thành công → dữ liệu điểm ùn tắc đổi (hoặc điểm bị gỡ khỏi bản đồ cùng popup).
    if (result.ok) setMode('idle');
    else setError(result.message ?? fallback);
  };

  const reasonLength = text.trim().length;
  const reasonValid = reasonLength >= OVERRIDE_REASON_MIN_LENGTH;

  return (
    <div className="min-w-[230px] space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: statusColor }}>
          {t('liveMap.map.trafficJam')}
        </p>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
            escalated ? 'animate-pulse text-white' : ''
          }`}
          style={escalated ? { backgroundColor: statusColor } : { color: statusColor, backgroundColor: `${statusColor}1A` }}
        >
          {escalated && <Siren className="w-3 h-3" />}
          {escalated
            ? t('liveMap.traffic.overdue')
            : isAssigned
              ? t('liveMap.traffic.statusAssigned')
              : t('liveMap.traffic.statusActive')}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-900">{jam.area}</p>
      <p className="text-xs text-slate-600">{jam.note}</p>
      {jam.congestionLevel && (
        <p className="text-[11px] text-slate-600">
          {t('liveMap.traffic.level')}: <strong>{t(`liveMap.traffic.levels.${jam.congestionLevel}`)}</strong>
        </p>
      )}

      <div className="space-y-0.5 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
        <p className="flex items-center gap-1">
          <Clock className="w-3 h-3 shrink-0" />
          {t('liveMap.map.reportedAt', { time: time(jam.reportedAt) })}
          {!isAssigned && ` · ${t('liveMap.traffic.expiresIn', { count: remainingMin })}`}
        </p>
        {jam.responsibleStationName && (
          <p className="flex items-center gap-1">
            <Building2 className="w-3 h-3 shrink-0" />
            {t('liveMap.traffic.station', { name: jam.responsibleStationName })}
          </p>
        )}
        {isAssigned && (
          <p className="flex items-center gap-1 font-semibold" style={{ color: TRAFFIC_JAM_STATUS_COLOR.assigned }}>
            <Truck className="w-3 h-3 shrink-0" />
            {t('liveMap.traffic.assignedUnit', { plate: jam.assignedUnitPlate ?? '—' })}
            {jam.assignedAt && ` · ${time(jam.assignedAt)}`}
          </p>
        )}
        {escalated && jam.escalatedAt && (
          <p className="text-red-600 font-semibold">{t('liveMap.traffic.escalatedAt', { time: time(jam.escalatedAt) })}</p>
        )}
      </div>

      {!canManage ? (
        <p className="text-[11px] text-slate-400 pt-1">{t('liveMap.traffic.otherStation')}</p>
      ) : mode === 'assign' ? (
        <div className="space-y-1.5 pt-1">
          {assignableUnits.length === 0 ? (
            <p className="text-[11px] text-amber-700">{t('liveMap.traffic.noUnits')}</p>
          ) : (
            <>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500" htmlFor={`jam-unit-${jam.id}`}>
                {t('liveMap.traffic.chooseUnit')}
              </label>
              <select
                id={`jam-unit-${jam.id}`}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                {assignableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.plateNumber} · {t(`enums.unitType.${u.unitType}`)}
                  </option>
                ))}
              </select>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder={t('liveMap.traffic.notesPlaceholder')}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setMode('idle')}
              disabled={busy}
              className="py-1.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('liveMap.traffic.back')}
            </button>
            <button
              onClick={() =>
                run(() => onAssign?.(jam.id, unitId, text.trim() || undefined), t('liveMap.traffic.assignFailed'))
              }
              disabled={busy || !unitId}
              className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold disabled:opacity-60"
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" />}
              {t('liveMap.traffic.confirmAssign')}
            </button>
          </div>
        </div>
      ) : mode === 'unassign' ? (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] text-slate-600">{t('liveMap.traffic.unassignHelp')}</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={t('liveMap.traffic.unassignPlaceholder')}
            className="w-full rounded-md border border-amber-300 px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
          {text.length > 0 && !reasonValid && (
            <p className="text-[10px] text-amber-700">
              {t('liveMap.traffic.minChars', { min: OVERRIDE_REASON_MIN_LENGTH, length: reasonLength })}
            </p>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setMode('idle')}
              disabled={busy}
              className="py-1.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('liveMap.traffic.back')}
            </button>
            <button
              onClick={() => run(() => onUnassign?.(jam.id, text.trim()), t('liveMap.traffic.unassignFailed'))}
              disabled={busy || !reasonValid}
              className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold disabled:opacity-60"
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" />}
              {t('liveMap.traffic.confirmUnassign')}
            </button>
          </div>
        </div>
      ) : mode === 'resolve' ? (
        <div className="space-y-1.5 pt-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, RESOLVE_NOTE_MAX))}
            rows={2}
            placeholder={t('liveMap.traffic.resolvePlaceholder')}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-300"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setMode('idle')}
              disabled={busy}
              className="py-1.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('liveMap.traffic.back')}
            </button>
            <button
              onClick={() => run(() => onResolve?.(jam.id, text.trim() || undefined), t('liveMap.map.resolveFailed'))}
              disabled={busy}
              className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-60"
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" />}
              {t('liveMap.traffic.confirmResolve')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {isAssigned
            ? onUnassign && (
                <button
                  onClick={() => open('unassign')}
                  className="flex items-center justify-center gap-1 py-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-bold hover:bg-amber-100"
                >
                  <Undo2 className="w-3 h-3" />
                  {t('liveMap.traffic.unassign')}
                </button>
              )
            : onAssign && (
                <button
                  onClick={() => open('assign')}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-white text-[11px] font-bold ${
                    escalated ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <UserPlus className="w-3 h-3" />
                  {t('liveMap.traffic.assign')}
                </button>
              )}
          {onResolve && (
            <button
              onClick={() => open('resolve')}
              className="flex items-center justify-center gap-1 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100"
            >
              <CheckCircle2 className="w-3 h-3" />
              {t('liveMap.traffic.resolve')}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
};
