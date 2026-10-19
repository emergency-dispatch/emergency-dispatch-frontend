import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { DeleteStationDialog } from '../../components/admin/stations/DeleteStationDialog';
import { StationFormDrawer } from '../../components/admin/stations/StationFormDrawer';
import { StationsTable } from '../../components/admin/stations/StationsTable';
import { Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useServiceQuery } from '../../components/admin/common/hooks';
import { stationAdminService } from '../../services/admin/stationAdminService';
import type { AdminStationListItem } from '../../types/adminFleet';

const PAGE_SIZE = 10;

const StationsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const params = { search: debouncedSearch, includeDeleted, pageIndex, pageSize: PAGE_SIZE };
  const query = useServiceQuery(() => stationAdminService.list(params), JSON.stringify(params));

  const [formStation, setFormStation] = useState<AdminStationListItem | 'new' | null>(null);
  const [deletingStation, setDeletingStation] = useState<AdminStationListItem | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageIndex(1);
            }}
            placeholder="Tìm theo tên, địa chỉ, hotline..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => {
              setIncludeDeleted(e.target.checked);
              setPageIndex(1);
            }}
            className="accent-red-600"
          />
          Hiện trạm đã xóa
        </label>
        <button
          onClick={() => setFormStation('new')}
          className="sm:ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25"
        >
          <Plus className="w-4 h-4" />
          Thêm trạm
        </button>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <StationsTable
        stations={query.data?.items ?? []}
        loading={query.loading}
        onEdit={setFormStation}
        onDelete={setDeletingStation}
      />

      {query.data && (
        <Pagination
          pageIndex={query.data.pageIndex}
          totalPages={query.data.totalPages}
          totalCount={query.data.totalCount}
          onChange={setPageIndex}
        />
      )}

      {formStation && (
        <StationFormDrawer
          initialStation={formStation === 'new' ? null : formStation}
          onClose={() => setFormStation(null)}
          onSaved={(saved) => {
            setNotice({
              kind: 'success',
              message: formStation === 'new' ? `Đã thêm trạm "${saved.name}".` : `Đã cập nhật trạm "${saved.name}".`,
            });
            setFormStation(null);
            query.reload();
          }}
        />
      )}

      {deletingStation && (
        <DeleteStationDialog
          station={deletingStation}
          onCancel={() => setDeletingStation(null)}
          onDeleted={(affected) => {
            setNotice({
              kind: 'success',
              message:
                affected > 0
                  ? `Đã xóa trạm "${deletingStation.name}". ${affected} xe chuyển sang Ngừng hoạt động.`
                  : `Đã xóa trạm "${deletingStation.name}".`,
            });
            setDeletingStation(null);
            query.reload();
          }}
        />
      )}
    </div>
  );
};

export default StationsPage;
