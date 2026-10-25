import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { AuditDateRangeFilter, YMD_PATTERN } from './AuditDateRangeFilter';
import { SystemAuditDetailDrawer } from './SystemAuditDetailDrawer';
import { SystemAuditTable } from './SystemAuditTable';
import { entityDisplayName, entityTypeMeta, systemActionMeta } from './auditMeta';
import { Notice, Pagination } from '../common/ui';
import { inputClass, labelClass } from '../common/styles';
import { useInitialQueryParams, useServiceQuery } from '../common/hooks';
import { auditTrailService } from '../../../services/admin/auditTrailService';
import {
  SYSTEM_AUDIT_ACTIONS,
  SYSTEM_AUDIT_ENTITY_TYPES,
  type SystemAuditAction,
  type SystemAuditEntityType,
  type SystemAuditLogDto,
} from '../../../types/auditTrail';

const PAGE_SIZE = 20;

/** Nhật ký thao tác quản trị: trạm, xe, tài khoản, tổ, cấu hình, quy tắc leo thang, chặn số, xuất báo cáo. */
export const SystemAuditTab: React.FC = () => {
  const initial = useInitialQueryParams();
  const dateParam = (key: string) => (YMD_PATTERN.test(initial.text(key)) ? initial.text(key) : '');

  const [entityType, setEntityType] = useState<SystemAuditEntityType | ''>(() =>
    initial.oneOf('entityType', SYSTEM_AUDIT_ENTITY_TYPES)
  );
  const [action, setAction] = useState<SystemAuditAction | ''>(() => initial.oneOf('action', SYSTEM_AUDIT_ACTIONS));
  const [fromDate, setFromDate] = useState(() => dateParam('from'));
  const [toDate, setToDate] = useState(() => dateParam('to'));
  // Mở từ drawer "Xem mọi bản ghi của đối tượng này".
  const [entity, setEntity] = useState<{ id: string; label: string } | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [selected, setSelected] = useState<SystemAuditLogDto | null>(null);

  const filter = {
    entityType: entityType || undefined,
    entityId: entity?.id,
    action: action || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };
  const query = useServiceQuery(
    () => auditTrailService.listSystem(filter, { pageIndex, pageSize: PAGE_SIZE }),
    `system:${JSON.stringify({ filter, pageIndex })}`
  );

  const withPageReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPageIndex(1);
    };

  const hasFilter = !!(entityType || action || fromDate || toDate || entity);
  const clearFilters = () => {
    setEntityType('');
    setAction('');
    setFromDate('');
    setToDate('');
    setEntity(null);
    setPageIndex(1);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Loại đối tượng</label>
            <select
              value={entityType}
              onChange={(e) => {
                withPageReset(setEntityType)(e.target.value as SystemAuditEntityType | '');
                setEntity(null);
              }}
              className={inputClass}
            >
              <option value="">Tất cả đối tượng</option>
              {SYSTEM_AUDIT_ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {entityTypeMeta(t).label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Hành động</label>
            <select
              value={action}
              onChange={(e) => withPageReset(setAction)(e.target.value as SystemAuditAction | '')}
              className={inputClass}
            >
              <option value="">Tất cả hành động</option>
              {SYSTEM_AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {systemActionMeta(a).label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AuditDateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => {
            setFromDate(from);
            setToDate(to);
            setPageIndex(1);
          }}
        >
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </AuditDateRangeFilter>

        {entity && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Đang xem bản ghi của:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 font-semibold">
              {entity.label}
              <button
                type="button"
                onClick={() => {
                  setEntity(null);
                  setPageIndex(1);
                }}
                aria-label="Bỏ lọc theo đối tượng"
                className="hover:text-red-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Lock className="w-3.5 h-3.5" />
        Nhật ký chỉ đọc, ghi lại thao tác quản trị (trạm, xe, tài khoản, tổ, cấu hình, quy tắc leo thang, chặn số, xuất báo
        cáo).
      </p>

      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <SystemAuditTable
        entries={query.data?.items ?? []}
        loading={query.loading}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />

      {query.data && (
        <Pagination
          pageIndex={query.data.pageIndex}
          totalPages={query.data.totalPages}
          totalCount={query.data.totalCount}
          onChange={setPageIndex}
        />
      )}

      {selected && (
        <SystemAuditDetailDrawer
          entry={selected}
          onClose={() => setSelected(null)}
          onFilterEntity={(e) => {
            if (!e.entityId) return;
            setEntityType(e.entityType);
            setEntity({
              id: e.entityId,
              label: `${entityTypeMeta(e.entityType).label} · ${entityDisplayName(e.entityType, e.entityName)}`,
            });
            setPageIndex(1);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
};
