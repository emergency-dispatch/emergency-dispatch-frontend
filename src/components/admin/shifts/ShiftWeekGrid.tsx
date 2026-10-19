import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { ADMIN_VEHICLE_STATUS_META } from '../fleetMeta';
import { DUTY_SHIFT_TYPES, SHIFT_DEFINITIONS, shiftInterval, type DutyShiftType } from '../../../types/shift';
import { cellKey, type ShiftAssignmentView, type ShiftWeekRow, type ShiftWeekView } from '../../../services/admin/shiftService';

interface ShiftWeekGridProps {
  view: ShiftWeekView;
  today: string;
  now: number;
  loading: boolean;
  onOpenCell: (row: ShiftWeekRow, date: string, shiftType: DutyShiftType) => void;
}

const WEEKDAY = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const shortName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : fullName;
};

export const ShiftWeekGrid: React.FC<ShiftWeekGridProps> = ({ view, today, now, loading, onOpenCell }) => {
  const byCell = new Map<string, ShiftAssignmentView[]>();
  for (const a of view.assignments) {
    const key = cellKey(a.vehicleId ?? 'station', a.date, a.shiftType);
    byCell.set(key, [...(byCell.get(key) ?? []), a]);
  }
  // Ca trống cả trạm (không ai có mặt; người bị khóa không tính) → tô nền ở tiêu đề ca (chỉ ca chưa kết thúc).
  const emptyShift = (date: string, shiftType: DutyShiftType) =>
    !view.assignments.some((a) => a.date === date && a.shiftType === shiftType && !a.staffLocked);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto transition-opacity ${
        loading ? 'opacity-60' : ''
      }`}
    >
      <table className="text-xs border-collapse min-w-[1280px] w-full table-fixed">
        <colgroup>
          <col className="w-36" />
          {view.days.flatMap((d) => DUTY_SHIFT_TYPES.map((t) => <col key={`${d}-${t}`} />))}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-left text-[11px] font-mono-data uppercase tracking-wider text-slate-500">
              Xe / vị trí
            </th>
            {view.days.map((d, i) => (
              <th
                key={d}
                colSpan={3}
                className={`border-b border-l border-slate-200 px-2 py-1.5 text-center font-bold ${
                  d === today ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'
                }`}
              >
                {WEEKDAY[i]} {d.slice(8, 10)}/{d.slice(5, 7)}
                {d === today && <span className="ml-1 text-[10px] font-mono-data">· hôm nay</span>}
              </th>
            ))}
          </tr>
          <tr>
            {view.days.flatMap((d) =>
              DUTY_SHIFT_TYPES.map((t, j) => {
                const empty = emptyShift(d, t) && shiftInterval(d, t).end > now;
                return (
                  <th
                    key={`${d}-${t}`}
                    title={`${SHIFT_DEFINITIONS[t].label} ${SHIFT_DEFINITIONS[t].start}–${SHIFT_DEFINITIONS[t].end}${empty ? ' · chưa có ai trực' : ''}`}
                    className={`border-b border-slate-200 py-1 text-center text-[10px] font-mono-data ${j === 0 ? 'border-l' : ''} ${
                      empty ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-50 text-slate-500'
                    }`}
                  >
                    {SHIFT_DEFINITIONS[t].shortLabel}
                  </th>
                );
              })
            )}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <tr key={row.key}>
              <th className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-3 py-2 text-left align-top">
                <div className={`font-bold text-slate-900 ${row.vehicleId ? 'font-mono-data' : ''}`}>{row.label}</div>
                {row.vehicleStatus ? (
                  <div className="text-[10px] font-semibold" style={{ color: ADMIN_VEHICLE_STATUS_META[row.vehicleStatus].color }}>
                    {ADMIN_VEHICLE_STATUS_META[row.vehicleStatus].label}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400">{row.sublabel}</div>
                )}
              </th>
              {view.days.flatMap((d) =>
                DUTY_SHIFT_TYPES.map((t, j) => {
                  const key = cellKey(row.key, d, t);
                  const crew = byCell.get(key) ?? [];
                  const warnings = view.cellWarnings[key] ?? [];
                  const ended = shiftInterval(d, t).end <= now;
                  return (
                    <td
                      key={key}
                      className={`border-b border-slate-200 align-top p-0 ${j === 0 ? 'border-l' : ''} ${
                        d === today ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <button
                        onClick={() => onOpenCell(row, d, t)}
                        title={warnings.join('\n') || `${SHIFT_DEFINITIONS[t].label} ${d.slice(8, 10)}/${d.slice(5, 7)}`}
                        className={`group w-full min-h-[56px] h-full p-1 text-left space-y-0.5 transition-colors ${
                          warnings.length ? 'ring-1 ring-inset ring-amber-300 bg-amber-50/60' : 'hover:bg-slate-50'
                        } ${ended ? 'opacity-60' : ''}`}
                      >
                        {warnings.length > 0 && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        {crew.map((a) => (
                          <span
                            key={a.id}
                            className={`block truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                              a.staffLocked && !ended ? 'bg-red-100 text-red-700 line-through' : 'bg-cyan-50 text-cyan-800'
                            }`}
                          >
                            {shortName(a.staffName)}
                          </span>
                        ))}
                        {crew.length === 0 && !ended && (
                          <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-500 mx-auto mt-3" />
                        )}
                      </button>
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
