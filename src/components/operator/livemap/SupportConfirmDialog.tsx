import React from 'react';
import { HandHelping } from 'lucide-react';
import { GpsFarNote } from './GpsFarNote';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useTranslation } from '../../../i18n';
import type { DispatchCandidate, DispatchTeamCandidate } from '../../../types/vehicle';

export interface SupportRow {
  team: DispatchTeamCandidate;
  option: DispatchCandidate;
}

interface SupportConfirmDialogProps {
  /** Các tổ trạm khác trong lệnh sắp giao. */
  rows: SupportRow[];
  /** Tổng số tổ trong lệnh (gồm cả tổ trạm mình). */
  totalCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Xác nhận điều tổ trạm khác: backend giao ngay, trạm kia chỉ được báo chứ không duyệt → Operator phải thấy mình đang lấy
 * lực lượng của trạm nào và vị trí xe có đáng tin không.
 */
export const SupportConfirmDialog: React.FC<SupportConfirmDialogProps> = ({ rows, totalCount, onCancel, onConfirm }) => {
  const { unitTypeLabel } = useDispatchStore();
  const { t } = useTranslation();
  const stationNames = [...new Set(rows.map((row) => row.team.stationName))].join(', ');
  const title = t('liveMap.support.confirmTitle', { station: stationNames });

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 space-y-3">
          <h3 className="flex items-start gap-2 text-sm font-bold text-slate-900">
            <HandHelping className="w-4 h-4 mt-0.5 shrink-0 text-blue-700" />
            {title}
          </h3>
          <ul className="space-y-1.5">
            {rows.map(({ team, option }) => (
              <li key={team.teamId} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-xs font-bold text-slate-900">
                  {team.teamName}
                  <span className="font-normal text-slate-500"> · {unitTypeLabel(option.unitType)}</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  {team.stationName} · <span className="font-mono-data">{option.plate}</span>
                  {t('liveMap.recommend.distance', { km: option.km.toFixed(1) })}
                  {option.isApproximate && t('liveMap.recommend.approximate')}
                  {t('liveMap.recommend.etaShort', { count: option.etaMinutes })}
                </p>
                <GpsFarNote option={option} />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onCancel}
            autoFocus
            className="px-3 py-2 rounded-md border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            {t('liveMap.offPlan.cancel')}
          </button>
          <button onClick={onConfirm} className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-bold">
            {totalCount > 1
              ? t('liveMap.support.confirmMany', { count: totalCount })
              : t('liveMap.support.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
