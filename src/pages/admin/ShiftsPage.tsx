import React, { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { ShiftCellDrawer } from '../../components/admin/shifts/ShiftCellDrawer';
import { ShiftWeekGrid } from '../../components/admin/shifts/ShiftWeekGrid';
import { ConfirmModal, Notice, type NoticeState } from '../../components/admin/common/ui';
import { inputClass, thClass } from '../../components/admin/common/styles';
import { useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { getApiErrorMessage } from '../../services/apiClient';
import { stationAdminService } from '../../services/admin/stationAdminService';
import {
  MAX_WEEKLY_HOURS,
  MIN_CREW_SIZE,
  MIN_REST_HOURS,
  cellKey,
  shiftService,
  type CopyWeekResult,
  type ShiftCellRef,
} from '../../services/admin/shiftService';
import { useNow } from '../../hooks/useNow';
import { DUTY_SHIFT_TYPES, SHIFT_DEFINITIONS, addDays, toYmd, weekStartOf } from '../../types/shift';

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const formatDm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

const ShiftsPage: React.FC = () => {
  const initial = useInitialQueryParams();
  const now = useNow(60_000);
  const today = toYmd(new Date(now));

  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'shift-stations');
  const [stationChoice, setStationChoice] = useState(() => initial.text('station'));
  const [weekStart, setWeekStart] = useState(() => {
    const date = initial.text('date');
    return weekStartOf(YMD_PATTERN.test(date) ? date : today);
  });

  const stationItems = stations.data?.items ?? [];
  const stationId = stationItems.some((s) => s.id === stationChoice) ? stationChoice : stationItems[0]?.id ?? '';

  const week = useServiceQuery(
    () => (stationId ? shiftService.getWeek(stationId, weekStart) : Promise.resolve(null)),
    `${stationId}|${weekStart}`
  );
  const view = week.data;

  const [openCell, setOpenCell] = useState<(ShiftCellRef & { rowKey: string; rowLabel: string }) | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<CopyWeekResult | null>(null);

  const handleCopy = async () => {
    setCopying(true);
    setCopyResult(null);
    setNotice(null);
    try {
      const result = await shiftService.copyPreviousWeek(stationId, weekStart);
      setCopyResult(result);
      week.reload();
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setCopying(false);
      setConfirmCopy(false);
    }
  };

  const changeWeek = (next: string) => {
    setWeekStart(next);
    setCopyResult(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <select
          value={stationId}
          onChange={(e) => {
            setStationChoice(e.target.value);
            setCopyResult(null);
          }}
          aria-label="Chọn trạm"
          className={`${inputClass} lg:w-72`}
        >
          {stationItems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            onClick={() => changeWeek(addDays(weekStart, -7))}
            aria-label="Tuần trước"
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-sm font-semibold text-slate-800 font-mono-data whitespace-nowrap">
            {formatDm(weekStart)} – {formatDm(addDays(weekStart, 6))}/{addDays(weekStart, 6).slice(0, 4)}
          </span>
          <button
            onClick={() => changeWeek(addDays(weekStart, 7))}
            aria-label="Tuần sau"
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {weekStart !== weekStartOf(today) && (
            <button
              onClick={() => changeWeek(weekStartOf(today))}
              className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Tuần này
            </button>
          )}
        </div>

        <button
          onClick={() => setConfirmCopy(true)}
          disabled={!stationId}
          className="lg:ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          <Copy className="w-3.5 h-3.5" />
          Sao chép tuần trước
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {DUTY_SHIFT_TYPES.map((t) => (
          <span key={t}>
            <span className="font-bold font-mono-data text-slate-700">{SHIFT_DEFINITIONS[t].shortLabel}</span> ={' '}
            {SHIFT_DEFINITIONS[t].label} {SHIFT_DEFINITIONS[t].start}–{SHIFT_DEFINITIONS[t].end}
          </span>
        ))}
        <span>
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-100 align-middle" /> ca chưa có ai trực
        </span>
        <span>
          Cảnh báo: kíp &lt; {MIN_CREW_SIZE} người, nghỉ &lt; {MIN_REST_HOURS} giờ, &gt; {MAX_WEEKLY_HOURS} giờ/tuần, xe Bảo trì
        </span>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {stations.error && <Notice notice={{ kind: 'error', message: stations.error }} />}
      {week.error && <Notice notice={{ kind: 'error', message: week.error }} />}

      {copyResult && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-sm">
          <p className="font-semibold text-slate-900">
            Đã sao chép {copyResult.copied} ca từ tuần trước
            {copyResult.alreadyPresent > 0 && `, ${copyResult.alreadyPresent} ca đã có sẵn`}.
          </p>
          {copyResult.skipped.length > 0 && (
            <>
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Bỏ qua {copyResult.skipped.length} ca:
              </p>
              <ul className="max-h-48 overflow-y-auto text-xs text-slate-600 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {copyResult.skipped.map((s, i) => (
                  <li key={i} className="px-3 py-1.5">
                    <span className="font-mono-data">{formatDm(s.date)}</span> · {SHIFT_DEFINITIONS[s.shiftType].label} ·{' '}
                    {s.rowLabel} · <span className="font-semibold">{s.staffName}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
          <button onClick={() => setCopyResult(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
            Đóng
          </button>
        </div>
      )}

      {view ? (
        <ShiftWeekGrid
          view={view}
          today={today}
          now={now}
          loading={week.loading}
          onOpenCell={(row, date, shiftType) =>
            setOpenCell({ stationId, vehicleId: row.vehicleId, date, shiftType, rowKey: row.key, rowLabel: row.label })
          }
        />
      ) : (
        <p className="text-sm text-slate-400">{stations.loading || week.loading ? 'Đang tải lịch...' : 'Chưa có trạm nào.'}</p>
      )}

      {view && view.staffSummaries.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">Tổng giờ trong tuần</h2>
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className={thClass}>Nhân sự</th>
                  <th className={`${thClass} text-right`}>Ca tại trạm</th>
                  <th className={`${thClass} text-right`}>Tổng giờ (mọi trạm)</th>
                  <th className={thClass}>Cảnh báo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {view.staffSummaries.map((s) => (
                  <tr key={s.staffId}>
                    <td className="px-4 py-2 font-semibold text-slate-900 whitespace-nowrap">{s.staffName}</td>
                    <td className="px-4 py-2 text-right font-mono-data text-slate-600">{s.shiftsAtStation}</td>
                    <td
                      className={`px-4 py-2 text-right font-mono-data ${
                        s.weeklyHours > MAX_WEEKLY_HOURS ? 'text-amber-700 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {s.weeklyHours} giờ
                    </td>
                    <td className="px-4 py-2 text-xs text-amber-700">
                      {s.warnings.length ? s.warnings.join(' ') : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {openCell && view && (
        <ShiftCellDrawer
          cell={openCell}
          rowLabel={openCell.rowLabel}
          stationName={view.stationName}
          crew={view.assignments.filter(
            (a) => a.date === openCell.date && a.shiftType === openCell.shiftType && a.vehicleId === openCell.vehicleId
          )}
          cellWarnings={view.cellWarnings[cellKey(openCell.rowKey, openCell.date, openCell.shiftType)] ?? []}
          now={now}
          onClose={() => setOpenCell(null)}
          onChanged={(message) => {
            setNotice({ kind: 'success', message });
            week.reload();
          }}
        />
      )}

      {confirmCopy && (
        <ConfirmModal
          title="Sao chép lịch tuần trước?"
          confirmLabel="Sao chép"
          submitting={copying}
          onCancel={() => setConfirmCopy(false)}
          onConfirm={handleCopy}
        >
          <p>
            Sao chép các ca của <span className="font-semibold">{view?.stationName}</span> tuần{' '}
            {formatDm(addDays(weekStart, -7))} – {formatDm(addDays(weekStart, -1))} sang tuần {formatDm(weekStart)} –{' '}
            {formatDm(addDays(weekStart, 6))}.
          </p>
          <p className="text-xs">
            Ca đã có sẵn được giữ nguyên. Bỏ qua người bị khóa, đang nghỉ phép, trùng giờ và các ca đã kết thúc; danh sách
            ca bị bỏ qua sẽ hiện sau khi sao chép.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default ShiftsPage;
