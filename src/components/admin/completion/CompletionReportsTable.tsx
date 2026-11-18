import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { thClass } from '../common/styles';
import { formatDateTime } from '../reports/reportMeta';
import { reportTeamLabel } from './completionMeta';
import type { CompletionReportHistoryItemDto } from '../../../types/report';
import { useTranslation } from '../../../i18n';

interface CompletionReportsTableProps {
  items: CompletionReportHistoryItemDto[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (report: CompletionReportHistoryItemDto) => void;
}

/** §36: lịch sử báo cáo nghiệm thu — mỗi dòng một biên bản (một tổ, có thể nhiều xe). */
export const CompletionReportsTable: React.FC<CompletionReportsTableProps> = ({ items, loading, selectedId, onSelect }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
        loading ? 'opacity-60' : ''
      }`}
    >
      <table className="w-full text-sm min-w-[960px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className={thClass}>{t('admin.monitoring.completion.table.submittedAt')}</th>
            <th className={thClass}>{t('admin.monitoring.completion.table.incident')}</th>
            <th className={thClass}>{t('admin.monitoring.completion.table.team')}</th>
            <th className={thClass}>{t('admin.monitoring.completion.table.units')}</th>
            <th className={thClass}>{t('admin.monitoring.completion.table.signer')}</th>
            <th className={`${thClass} text-right`}>{t('admin.monitoring.completion.table.evidence')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                {loading ? t('admin.common.loading') : t('admin.monitoring.completion.table.empty')}
              </td>
            </tr>
          )}
          {items.map((report) => (
            <tr
              key={report.id}
              onClick={() => onSelect(report)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onSelect(report);
                }
              }}
              tabIndex={0}
              className={`cursor-pointer focus:outline-none focus:bg-red-50/50 ${
                selectedId === report.id ? 'bg-red-50/60' : 'hover:bg-slate-50'
              }`}
            >
              <td className="px-4 py-3 font-mono-data text-xs text-slate-600 whitespace-nowrap">
                {formatDateTime(report.submittedAt)}
              </td>
              <td className="px-4 py-3 max-w-[300px]">
                <div className="font-semibold text-slate-900 truncate">{report.incidentTitle}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {report.incidentCode && <span className="font-mono-data text-slate-600">{report.incidentCode} · </span>}
                  {report.incidentAddress}
                </div>
              </td>
              <td className="px-4 py-3 text-xs max-w-[200px]">
                <div className="text-slate-500 truncate">{report.stationName || '—'}</div>
                <div className={`truncate font-semibold ${report.stationTeamDeleted ? 'text-slate-500' : 'text-slate-800'}`}>
                  {reportTeamLabel(report)}
                </div>
              </td>
              <td className="px-4 py-3 text-xs font-mono-data text-slate-700 max-w-[180px]">
                <div className="truncate">{report.units.map((u) => u.plateNumber).join(', ') || '—'}</div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-700 max-w-[180px]">
                <div className="truncate">{report.signerName || '—'}</div>
                {report.submittedByName && report.submittedByName !== report.signerName && (
                  <div className="text-[11px] text-slate-500 truncate">{report.submittedByName}</div>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  {report.evidenceMediaUrls.length}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
