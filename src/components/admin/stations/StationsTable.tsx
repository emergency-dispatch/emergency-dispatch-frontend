import React from 'react';
import { Pencil, Phone, Trash2 } from 'lucide-react';
import { iconButtonClass, thClass } from '../common/styles';
import type { StationResponseDto } from '../../../types/station';
import { useTranslation } from '../../../i18n';

interface StationsTableProps {
  stations: StationResponseDto[];
  loading: boolean;
  onEdit: (station: StationResponseDto) => void;
  onDelete: (station: StationResponseDto) => void;
}

export const StationsTable: React.FC<StationsTableProps> = ({ stations, loading, onEdit, onDelete }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
        loading ? 'opacity-60' : ''
      }`}
    >
      <table className="w-full text-sm min-w-[980px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className={thClass}>{t('admin.stations.table.name')}</th>
            <th className={thClass}>{t('admin.stations.table.headOperator')}</th>
            <th className={thClass}>{t('admin.stations.table.hotline')}</th>
            <th className={thClass}>{t('admin.stations.table.radius')}</th>
            <th className={thClass}>{t('admin.common.status')}</th>
            <th className={thClass}>{t('admin.stations.table.staff')}</th>
            <th className={thClass}>{t('admin.stations.table.availableUnits')}</th>
            <th className={`${thClass} text-right`}>{t('admin.common.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {stations.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">
                {loading ? t('admin.common.loading') : t('admin.stations.table.empty')}
              </td>
            </tr>
          )}
          {stations.map((station) => (
            <tr key={station.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-900">{station.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{station.address}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {station.headOperatorName ? (
                  <>
                    <div className="text-slate-800 font-medium">{station.headOperatorName}</div>
                    {station.headOperatorPhone && (
                      <div className="text-xs text-slate-500 font-mono-data mt-0.5">{station.headOperatorPhone}</div>
                    )}
                  </>
                ) : (
                  <span className="px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-bold font-mono-data">
                    {t('admin.stations.table.noHeadOperator')}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 font-mono-data text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {station.phoneNumber || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 font-mono-data whitespace-nowrap">{station.coverageRadiusKm} km</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {station.isActive ? (
                  <span className="px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono-data">
                    {t('admin.stations.table.active')}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md border border-slate-300 bg-slate-100 text-slate-500 text-[10px] font-bold font-mono-data">
                    {t('admin.stations.table.inactive')}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 font-mono-data text-slate-600 whitespace-nowrap">{station.staffCount}</td>
              <td className="px-4 py-3 font-mono-data whitespace-nowrap">
                <span
                  className={
                    station.totalUnitsCount > 0 && station.activeUnitsCount === 0 ? 'text-red-600 font-bold' : 'text-slate-600'
                  }
                >
                  {station.activeUnitsCount} / {station.totalUnitsCount}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => onEdit(station)} className={iconButtonClass} aria-label={t('admin.stations.table.edit')} title={t('admin.stations.table.edit')}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(station)} className={iconButtonClass} aria-label={t('admin.stations.table.delete')} title={t('admin.stations.table.delete')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
