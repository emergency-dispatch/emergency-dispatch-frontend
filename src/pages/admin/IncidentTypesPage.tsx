import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { CatalogTypeFormDrawer } from '../../components/admin/catalog/CatalogTypeFormDrawer';
import { CatalogTypesTable } from '../../components/admin/catalog/CatalogTypesTable';
import { DispatchPlanDrawer } from '../../components/admin/catalog/DispatchPlanDrawer';
import { INCIDENT_TYPE_CATEGORIES, catalogName, entryToUpsert } from '../../components/admin/catalog/catalogMeta';
import { ConfirmModal, Notice, type NoticeState } from '../../components/admin/common/ui';
import { showToast } from '../../components/admin/common/toastStore';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { normalizeText } from '../../services/admin/listUtils';
import { typeCatalogService } from '../../services/typeCatalogService';
import { getApiErrorMessage } from '../../services/apiClient';
import type { IncidentTypeCategory, IncidentTypeDto } from '../../types/typeCatalog';
import { Trans, useTranslation } from '../../i18n';

type StatusFilter = 'active' | 'hidden';
const STATUSES: StatusFilter[] = ['active', 'hidden'];

/**
 * Danh mục loại sự cố (§31.B) + kế hoạch điều xe theo mức (§32). Danh sách nhỏ → lọc phía client, không phân trang.
 */
const IncidentTypesPage: React.FC = () => {
  const { t } = useTranslation();
  const initial = useInitialQueryParams();
  const [search, setSearch] = useState(() => initial.text('search'));
  const [category, setCategory] = useState<IncidentTypeCategory | ''>(() =>
    initial.oneOf('category', INCIDENT_TYPE_CATEGORIES)
  );
  const [status, setStatus] = useState<StatusFilter | ''>(() => initial.oneOf('status', STATUSES));
  const debouncedSearch = useDebouncedValue(search);

  const query = useServiceQuery(() => typeCatalogService.listIncidentTypes(true), 'admin-incident-types');
  // Cho drawer kế hoạch điều xe: chọn loại xe + hiện tên.
  const unitTypes = useServiceQuery(() => typeCatalogService.listUnitTypes(true), 'admin-incident-types-units');

  const all = query.data ?? [];
  const q = normalizeText(debouncedSearch);
  const items = all
    .filter((i) => !category || i.category === category)
    .filter((i) => !status || (status === 'active') === i.isActive)
    .filter((i) => !q || normalizeText(`${i.code} ${i.nameVi} ${i.nameEn}`).includes(q));
  // Loại "Khác" chung có thứ tự 99 → lấy thứ tự lớn nhất dưới 99 để loại mới đứng trước nó.
  const nextOrder = all.filter((i) => i.displayOrder < 99).reduce((max, i) => Math.max(max, i.displayOrder), 0) + 1;

  const [formEntry, setFormEntry] = useState<IncidentTypeDto | 'new' | null>(null);
  const [planEntry, setPlanEntry] = useState<IncidentTypeDto | null>(null);
  const [deleting, setDeleting] = useState<IncidentTypeDto | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const handleToggle = async (entry: IncidentTypeDto) => {
    setPendingId(entry.id);
    try {
      const saved = await typeCatalogService.updateIncidentType(entry.id, entryToUpsert(entry, !entry.isActive));
      setNotice(null);
      showToast(
        t(saved.isActive ? 'admin.catalog.incidentTypes.shown' : 'admin.catalog.incidentTypes.hidden', {
          name: catalogName(saved),
        })
      );
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
      await typeCatalogService.removeIncidentType(deleting.id);
      setNotice(null);
      showToast(t('admin.catalog.incidentTypes.deleted', { name: catalogName(deleting) }));
    } catch (err) {
      // 409: đã có sự cố dùng loại này → message backend gợi ý ẩn thay vì xóa.
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setDeleteSubmitting(false);
      setDeleting(null);
      query.reload();
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <p className="text-xs text-slate-500 max-w-3xl">{t('admin.catalog.incidentTypes.description')}</p>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.catalog.incidentTypes.searchPlaceholder')}
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:flex">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as IncidentTypeCategory | '')}
            aria-label={t('admin.catalog.filterByCategory')}
            className={`${inputClass} lg:w-48`}
          >
            <option value="">{t('admin.catalog.allCategories')}</option>
            {INCIDENT_TYPE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`admin.catalog.category.${c}`)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter | '')}
            aria-label={t('admin.common.filterByStatus')}
            className={`${inputClass} lg:w-44`}
          >
            <option value="">{t('admin.common.allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`admin.catalog.statusFilter.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setFormEntry('new')}
          className="lg:ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {t('admin.catalog.incidentTypes.add')}
        </button>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <CatalogTypesTable
        kind="incident"
        items={items}
        loading={query.loading}
        emptyLabel={t('admin.catalog.incidentTypes.empty')}
        pendingId={pendingId}
        onEdit={setFormEntry}
        onEditPlan={setPlanEntry}
        onToggleActive={handleToggle}
        onDelete={setDeleting}
      />

      {formEntry && (
        <CatalogTypeFormDrawer
          kind="incident"
          initial={formEntry === 'new' ? null : formEntry}
          nextOrder={nextOrder}
          onClose={() => setFormEntry(null)}
          onSaved={(saved) => {
            setNotice(null);
            showToast(
              t(
                formEntry === 'new' ? 'admin.catalog.incidentTypes.added' : 'admin.catalog.incidentTypes.updated',
                { name: catalogName(saved) }
              )
            );
            setFormEntry(null);
            query.reload();
          }}
        />
      )}

      {planEntry && (
        <DispatchPlanDrawer
          incidentType={planEntry}
          unitTypes={unitTypes.data ?? null}
          unitTypesError={unitTypes.error}
          onClose={() => setPlanEntry(null)}
          onSaved={(saved) => {
            setNotice(null);
            showToast(t('admin.catalog.plan.saved', { name: catalogName(saved) }));
            setPlanEntry(null);
            query.reload();
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t('admin.catalog.incidentTypes.deleteTitle')}
          confirmLabel={t('admin.catalog.incidentTypes.deleteConfirm')}
          submitting={deleteSubmitting}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        >
          <p>
            <Trans
              i18nKey="admin.catalog.incidentTypes.deleteBody"
              values={{ name: catalogName(deleting), code: deleting.code }}
              components={{ b: <span className="font-semibold text-slate-900" /> }}
            />
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default IncidentTypesPage;
