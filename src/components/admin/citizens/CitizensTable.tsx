import React from 'react';
import { ArrowDown, Ban, Lock, LockOpen } from 'lucide-react';
import { iconButtonClass, thClass } from '../common/styles';
import type { CitizenListItem } from '../../../types/adminCitizen';

interface CitizensTableProps {
  citizens: CitizenListItem[];
  loading: boolean;
  sortByFalseReports: boolean;
  onToggleSort: () => void;
  onLock: (citizen: CitizenListItem) => void;
  onUnlock: (citizen: CitizenListItem) => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export const CitizensTable: React.FC<CitizensTableProps> = ({
  citizens,
  loading,
  sortByFalseReports,
  onToggleSort,
  onLock,
  onUnlock,
}) => (
  <div
    className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
      loading ? 'opacity-60' : ''
    }`}
  >
    <table className="w-full text-sm min-w-[860px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-left">
          <th className={thClass}>Họ tên</th>
          <th className={thClass}>SĐT</th>
          <th className={thClass}>Ngày đăng ký</th>
          <th className={`${thClass} text-right`}>Sự cố đã báo</th>
          <th className={`${thClass} text-right`}>
            <button
              onClick={onToggleSort}
              className={`inline-flex items-center gap-1 uppercase tracking-wider ${
                sortByFalseReports ? 'text-red-600' : 'hover:text-slate-800'
              }`}
              title={sortByFalseReports ? 'Bỏ sắp xếp' : 'Sắp xếp theo số ca báo khống'}
            >
              Ca báo khống
              <ArrowDown className={`w-3 h-3 ${sortByFalseReports ? '' : 'opacity-30'}`} />
            </button>
          </th>
          <th className={thClass}>Trạng thái</th>
          <th className={`${thClass} text-right`}>Hành động</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {citizens.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
              {loading ? 'Đang tải...' : 'Không có tài khoản nào phù hợp.'}
            </td>
          </tr>
        )}
        {citizens.map((c) => {
          const locked = c.lock.kind === 'admin';
          return (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{c.fullName}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-mono-data text-slate-600">{c.maskedPhone}</span>
                {c.phoneBlocked && (
                  <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-[10px] font-bold text-red-700">
                    <Ban className="w-3 h-3" />
                    Số đang bị chặn
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500 font-mono-data whitespace-nowrap">{formatDate(c.registeredAt)}</td>
              <td className="px-4 py-3 text-right font-mono-data text-slate-600">{c.reportedIncidentCount}</td>
              <td className="px-4 py-3 text-right font-mono-data">
                <span className={c.falseReportCount >= 3 ? 'text-red-600 font-bold' : c.falseReportCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                  {c.falseReportCount}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${
                    locked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {locked ? 'Bị khóa' : 'Hoạt động'}
                </span>
                {c.lock.kind === 'admin' && (
                  <div className="mt-1 text-[11px] text-slate-500 max-w-[220px] line-clamp-1" title={c.lock.reason}>
                    {c.lock.reason}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  {locked ? (
                    <button onClick={() => onUnlock(c)} className={iconButtonClass} aria-label="Mở khóa" title="Mở khóa">
                      <LockOpen className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => onLock(c)} className={iconButtonClass} aria-label="Khóa tài khoản" title="Khóa tài khoản">
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
