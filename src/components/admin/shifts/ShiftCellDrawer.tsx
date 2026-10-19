import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Notice } from '../common/ui';
import { iconButtonClass, inputClass, labelClass } from '../common/styles';
import { useServiceQuery } from '../common/hooks';
import { getApiErrorMessage } from '../../../services/apiClient';
import { shiftService, type ShiftAssignmentView, type ShiftCellRef } from '../../../services/admin/shiftService';
import { CREW_ROLES, CREW_ROLE_LABEL, SHIFT_DEFINITIONS, shiftInterval, type CrewRole } from '../../../types/shift';

interface ShiftCellDrawerProps {
  cell: ShiftCellRef;
  rowLabel: string;
  stationName: string;
  crew: ShiftAssignmentView[];
  cellWarnings: string[];
  now: number;
  onClose: () => void;
  /** Gọi sau mỗi lần thêm / bớt để trang nạp lại lịch. */
  onChanged: (message: string) => void;
}

const formatDay = (ymd: string) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });

export const ShiftCellDrawer: React.FC<ShiftCellDrawerProps> = ({
  cell,
  rowLabel,
  stationName,
  crew,
  cellWarnings,
  now,
  onClose,
  onChanged,
}) => {
  const def = SHIFT_DEFINITIONS[cell.shiftType];
  const ended = shiftInterval(cell.date, cell.shiftType).end <= now;
  // Danh sách ứng viên nạp lại sau mỗi thay đổi (key đổi theo số người trong kíp).
  const candidates = useServiceQuery(() => shiftService.listCandidates(cell), `${JSON.stringify(cell)}#${crew.length}`);

  const [staffId, setStaffId] = useState('');
  const [role, setRole] = useState<CrewRole>('rescuer');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = candidates.data?.find((c) => c.staffId === staffId);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || selected.blockReason) return;
    setPending('add');
    setError(null);
    try {
      await shiftService.assign(cell, staffId, role);
      onChanged(`Đã xếp ${selected.staffName} vào ${def.label.toLowerCase()} ${cell.date.slice(8)}/${cell.date.slice(5, 7)}.`);
      setStaffId('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPending(null);
    }
  };

  const handleRemove = async (a: ShiftAssignmentView) => {
    setPending(a.id);
    setError(null);
    try {
      await shiftService.unassign(a.id);
      onChanged(`Đã bỏ ${a.staffName} khỏi ${def.label.toLowerCase()}.`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {def.label} · {def.start}–{def.end}
              {def.endsNextDay && <span className="text-xs font-normal text-slate-500"> (hôm sau)</span>}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{formatDay(cell.date)}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {stationName} · <span className={cell.vehicleId ? 'font-mono-data' : ''}>{rowLabel}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <Notice notice={error ? { kind: 'error', message: error } : null} />

          {cellWarnings.length > 0 && (
            <div className="flex gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <ul className="space-y-0.5">
                {cellWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="space-y-2">
            <h3 className={labelClass}>Kíp trực ({crew.length})</h3>
            {crew.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có ai trong ca này.</p>
            ) : (
              <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                {crew.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${a.staffLocked ? 'text-red-700 line-through' : 'text-slate-900'}`}>
                        {a.staffName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {CREW_ROLE_LABEL[a.crewRole]}
                        {a.staffLocked && ' · tài khoản đang bị khóa'}
                        {a.status === 'checked_in' && ' · đang trực'}
                      </div>
                    </div>
                    {!ended && (
                      <button
                        onClick={() => handleRemove(a)}
                        disabled={pending !== null}
                        className={iconButtonClass}
                        aria-label={`Bỏ ${a.staffName} khỏi ca`}
                        title="Bỏ khỏi ca"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {ended ? (
            <p className="text-xs text-slate-500">Ca đã kết thúc, chỉ xem.</p>
          ) : (
            <form onSubmit={handleAdd} className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className={labelClass}>Thêm người vào kíp</h3>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                disabled={!candidates.data}
                aria-label="Chọn nhân sự"
                className={inputClass}
              >
                <option value="">{candidates.data ? '— Chọn RescueStaff —' : 'Đang tải...'}</option>
                {(candidates.data ?? []).map((c) => (
                  <option key={c.staffId} value={c.staffId} disabled={!!c.blockReason}>
                    {c.staffName}
                    {c.blockReason ? ` — ${c.blockReason}` : c.warnings.length ? ' ⚠' : ''}
                  </option>
                ))}
              </select>
              <select value={role} onChange={(e) => setRole(e.target.value as CrewRole)} aria-label="Vai trò trong kíp" className={inputClass}>
                {CREW_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {CREW_ROLE_LABEL[r]}
                  </option>
                ))}
              </select>

              {selected && selected.warnings.length > 0 && (
                <div className="flex gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Vẫn xếp được, nhưng lưu ý:</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {selected.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!selected || !!selected.blockReason || pending !== null}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
              >
                {pending === 'add' ? 'Đang xếp...' : 'Thêm vào kíp'}
              </button>
              <p className="text-[11px] text-slate-500">
                Người bị khóa, đang nghỉ phép đã duyệt hoặc trùng giờ ca khác không chọn được.
              </p>
            </form>
          )}
        </div>
      </aside>
    </>
  );
};
