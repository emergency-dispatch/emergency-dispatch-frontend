import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { CatalogTypeFormDrawer } from '../../components/admin/catalog/CatalogTypeFormDrawer';
import { CatalogTypesTable } from '../../components/admin/catalog/CatalogTypesTable';
import { catalogName, entryToUpsert } from '../../components/admin/catalog/catalogMeta';
import { ConfirmModal, Notice, type NoticeState } from '../../components/admin/common/ui';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { normalizeText } from '../../services/admin/listUtils';
import { typeCatalogService } from '../../services/admin/typeCatalogService';
import { vehicleAdminService } from '../../services/admin/vehicleAdminService';
import { getApiErrorMessage } from '../../services/apiClient';
import type { RescueUnitTypeDto } from '../../types/typeCatalog';
import { Trans, useTranslation } from '../../i18n';

type StatusFilter = 'active' | 'hidden';
const STATUSES: StatusFilter[] = ['active', 'hidden'];

/** Danh mục loại xe (§31.B): thêm / sửa / ẩn / xóa. Danh sách nhỏ → lọc phía client, không phân trang. */
const UnitTypesPage: React.FC = () => {
  const { t } = useTranslation();
  const initial = useInitialQueryParams();
  const [search, setSearch] = useState(() => initial.text('search'));
  const [status, setStatus] = useState<StatusFilter | ''>(() => initial.oneOf('status', STATUSES));
  const debouncedSearch = useDebouncedValue(search);

  const query = useServiceQuery(() => typeCatalogService.listUnitTypes(true), 'admin-unit-types');
  // Đếm xe theo loại để báo trước loại nào không xóa được (backend vẫn kiểm tra lại, 409).
  const vehicles = useServiceQuery(() => vehicleAdminService.listAll(), 'admin-unit-types-vehicles');
  const vehicleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of vehicles.data ?? []) counts.set(v.unitType, (counts.get(v.unitType) ?? 0) + 1);
    return counts;
  }, [vehicles.data]);

  const all = query.data ?? [];
  const q = normalizeText(debouncedSearch);
  const items = all
    .filter((u) => !status || (status === 'active') === u.isActive)
    .filter((u) => !q || normalizeText(`${u.code} ${u.nameVi} ${u.nameEn}`).includes(q));
  const nextOrder = all.reduce((max, u) => Math.max(max, u.displayOrder), 0) + 1;

  const [formEntry, setFormEntry] = useState<RescueUnitTypeDto | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RescueUnitTypeDto | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const handleToggle = async (entry: RescueUnitTypeDto) => {
    setPendingId(entry.id);
    try {
      const saved = await typeCatalogService.updateUnitType(entry.id, entryToUpsert(entry, !entry.isActive));
      setNotice({
        kind: 'success',
        message: t(saved.isActive ? 'admin.catalog.unitTypes.shown' : 'admin.catalog.unitTypes.hidden', {
          name: catalogName(saved),
        }),
      });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setPendingId(null);
      query.reload();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteSubmitting(true);
    try {
      await typeCatalogService.removeUnitType(deleting.id);
      setNotice({ kind: 'success', message: t('admin.catalog.unitTypes.deleted', { name: catalogName(deleting) }) });
    } catch (err) {
      // 409: đang được dùng → message backend đã gợi ý ẩn thay vì xóa.
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setDeleteSubmitting(false);
      setDeleting(null);
      query.reload();
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <p className="text-xs text-slate-500 max-w-3xl">{t('admin.catalog.unitTypes.description')}</p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.catalog.unitTypes.searchPlaceholder')}
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter | '')}
          aria-label={t('admin.common.filterByStatus')}
          className={`${inputClass} sm:w-44`}
        >
          <option value="">{t('admin.common.allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.catalog.statusFilter.${s}`)}
            </option>
          ))}
        </select>
        <button
          onClick={() => setFormEntry('new')}
          className="sm:ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {t('admin.catalog.unitTypes.add')}
        </button>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <CatalogTypesTable
        kind="unit"
        items={items}
        loading={query.loading}
        emptyLabel={t('admin.catalog.unitTypes.empty')}
        vehicleCounts={vehicleCounts}
        pendingId={pendingId}
        onEdit={setFormEntry}
        onToggleActive={handleToggle}
        onDelete={setDeleting}
      />

      {formEntry && (
        <CatalogTypeFormDrawer
          kind="unit"
          initial={formEntry === 'new' ? null : formEntry}
          nextOrder={nextOrder}
          onClose={() => setFormEntry(null)}
          onSaved={(saved) => {
            setNotice({
              kind: 'success',
              message: t(formEntry === 'new' ? 'admin.catalog.unitTypes.added' : 'admin.catalog.unitTypes.updated', {
                name: catalogName(saved),
              }),
            });
            setFormEntry(null);
            query.reload();
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t('admin.catalog.unitTypes.deleteTitle')}
          confirmLabel={t('admin.catalog.unitTypes.deleteConfirm')}
          submitting={deleteSubmitting}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        >
          <p>
            <Trans
              i18nKey="admin.catalog.unitTypes.deleteBody"
              values={{ name: catalogName(deleting), code: deleting.code }}
              components={{ b: <span className="font-semibold text-slate-900" /> }}
            />
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default UnitTypesPage;
