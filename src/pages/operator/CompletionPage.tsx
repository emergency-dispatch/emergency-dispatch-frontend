import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, SearchX } from 'lucide-react';
import { StationNotAssigned } from '../../components/operator/StationNotAssigned';
import { CompletionList } from '../../components/operator/completion/CompletionList';
import { CompletionDetail } from '../../components/operator/completion/CompletionDetail';
import {
  groupCompletion,
  hasPendingCompletion,
  type CompletionRange,
  type CompletionRow,
  type CompletionTab,
} from '../../components/operator/completion/completionGroups';
import { useDispatchStore } from '../../context/DispatchContext';
import { useTeamByVehicle } from '../../hooks/useStationTeams';
import { useNow } from '../../hooks/useNow';
import { incidentService } from '../../services/incidentService';
import { dispatchService } from '../../services/dispatchService';
import { getApiErrorMessage } from '../../services/apiClient';
import { getLanguage, useTranslation } from '../../i18n';
import {
  mapIncidentResponseToIncident,
  type Incident,
  type IncidentResponseDto,
} from '../../types/incident';
import type { BackendDispatchStatus, DispatchAssignmentResponseDto } from '../../types/dispatch';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const RANGE_HOURS: Record<CompletionRange, number | null> = { d1: 24, d7: 24 * 7, d30: 24 * 30, all: null };

// Lượt điều phối chỉ tiến lên: gộp dữ liệu realtime (store) với dữ liệu tải lại, giữ bản "tiến xa" hơn.
const STATUS_RANK: Record<BackendDispatchStatus, number> = {
  Dispatched: 0,
  Accepted: 1,
  EnRoute: 2,
  OnScene: 3,
  Completed: 4,
  Cancelled: 4,
  Rejected: 4,
};

function mergeAssignments(
  fetched: DispatchAssignmentResponseDto[] | null,
  live: DispatchAssignmentResponseDto[] | undefined
): DispatchAssignmentResponseDto[] {
  const byId = new Map((fetched ?? []).map((a) => [a.id, a]));
  for (const a of live ?? []) {
    const known = byId.get(a.id);
    // Cùng mức → giữ bản tải từ API (đủ tên tổ, ảnh hiện trường hơn payload SignalR).
    if (!known || STATUS_RANK[a.status] > STATUS_RANK[known.status]) byId.set(a.id, a);
  }
  return [...byId.values()];
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * §26.2 Nghiệm thu theo tổ: danh sách bên trái (Chờ nghiệm thu từ store realtime / Đã hoàn tất từ API có phân trang),
 * chi tiết bên phải nhóm xe theo tổ — ảnh hiện trường, chữ ký, người ký, thời điểm ký; tổ chưa nộp "Chờ tổ nghiệm thu".
 * Màn < xl: chỉ hiện một trong hai. Chọn sự cố ghi vào `?incident=` để tải lại / gửi link vẫn mở đúng ca.
 */
export const CompletionPage: React.FC = () => {
  const { incidents, assignmentsByIncident, stationNotAssigned, incidentsLoading } = useDispatchStore();
  const teamByVehicle = useTeamByVehicle();
  const now = useNow(30000);
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const selectedId = params.get('incident');
  const tab: CompletionTab = params.get('tab') === 'done' ? 'done' : 'pending';

  const updateParams = useCallback(
    (patch: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  // ---------- Bộ lọc ----------
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);
  const [range, setRange] = useState<CompletionRange>('d7');
  const [page, setPage] = useState(1);
  // Đổi bộ lọc → về trang 1 (đặt ngay trong handler, không cần effect).
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const changeRange = (value: CompletionRange) => {
    setRange(value);
    setPage(1);
  };

  // ---------- Chờ nghiệm thu: từ store (realtime, không gọi API thêm) ----------
  const pendingIncidents = useMemo(
    () =>
      incidents
        .filter((i) => i.status === 'approved' && hasPendingCompletion(assignmentsByIncident.get(i.id)))
        // Chờ lâu nhất lên đầu.
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [incidents, assignmentsByIncident]
  );
  const pendingRows = useMemo<CompletionRow[]>(() => {
    const term = normalize(debouncedSearch);
    return pendingIncidents
      .filter((i) => !term || normalize(`${i.title} ${i.area}`).includes(term))
      .map((incident) => ({
        incident,
        groups: groupCompletion(assignmentsByIncident.get(incident.id) ?? [], teamByVehicle),
        completedAt: null,
      }));
  }, [pendingIncidents, assignmentsByIncident, teamByVehicle, debouncedSearch]);

  // ---------- Đã hoàn tất: API phân trang ----------
  const [done, setDone] = useState<{ items: IncidentResponseDto[]; totalPages: number; totalCount: number } | null>(null);
  const [doneLoading, setDoneLoading] = useState(false);
  const [doneError, setDoneError] = useState<string | null>(null);
  const [doneReload, setDoneReload] = useState(0);
  // Sự cố vừa hoàn tất trong phiên (store giữ lại) → tải lại danh sách để có ca mới.
  const completedInSession = useMemo(() => incidents.filter((i) => i.status === 'completed').length, [incidents]);

  useEffect(() => {
    if (tab !== 'done' || stationNotAssigned) return;
    let cancelled = false;
    setDoneLoading(true);
    setDoneError(null);
    const hours = RANGE_HOURS[range];
    incidentService
      .getCompletedIncidents({
        pageIndex: page,
        pageSize: PAGE_SIZE,
        searchTerm: debouncedSearch,
        fromDate: hours ? new Date(Date.now() - hours * 3600_000).toISOString() : undefined,
      })
      .then((res) => {
        if (!cancelled) setDone({ items: res.items, totalPages: res.totalPages, totalCount: res.totalCount });
      })
      .catch((err) => {
        if (!cancelled) setDoneError(getApiErrorMessage(err, t('incidents.completion.loadFailed')));
      })
      .finally(() => {
        if (!cancelled) setDoneLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, page, range, debouncedSearch, doneReload, completedInSession, stationNotAssigned, t]);

  const language = getLanguage();
  const doneRows = useMemo<CompletionRow[]>(
    () =>
      (done?.items ?? []).map((dto) => {
        const own = assignmentsByIncident.get(dto.id);
        return {
          incident: mapIncidentResponseToIncident(dto, language),
          // Sự cố hoàn tất trong phiên đã có lượt điều phối trong store → hiện luôn các tổ.
          groups: own ? groupCompletion(own, teamByVehicle) : null,
          completedAt: dto.updatedAt ?? null,
        };
      }),
    [done, assignmentsByIncident, teamByVehicle, language]
  );

  // ---------- Sự cố đang chọn ----------
  const [fallback, setFallback] = useState<{ id: string; dto: IncidentResponseDto | null; error: string | null } | null>(null);
  const selectedFromLists = useMemo<{ incident: Incident; completedAt: string | null } | null>(() => {
    if (!selectedId) return null;
    const live = incidents.find((i) => i.id === selectedId);
    if (live) return { incident: live, completedAt: live.completedAt ?? null };
    const row = doneRows.find((r) => r.incident.id === selectedId);
    return row ? { incident: row.incident, completedAt: row.completedAt } : null;
  }, [selectedId, incidents, doneRows]);

  // Mở bằng link (?incident=) mà sự cố không có trong hai danh sách → tải riêng (mỗi id một lần).
  const requestedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId || selectedFromLists || incidentsLoading || requestedIdRef.current === selectedId) return;
    const id = selectedId;
    requestedIdRef.current = id;
    setFallback({ id, dto: null, error: null });
    const apply = (dto: IncidentResponseDto | null, error: string | null) => {
      if (requestedIdRef.current === id) setFallback({ id, dto, error });
    };
    incidentService
      .getById(id)
      .then((res) => apply(res.success ? res.data : null, res.success ? null : res.message || ''))
      .catch((err) => apply(null, getApiErrorMessage(err, '')));
  }, [selectedId, selectedFromLists, incidentsLoading]);

  const selected = useMemo(() => {
    if (selectedFromLists) return selectedFromLists;
    if (fallback?.id === selectedId && fallback.dto) {
      return { incident: mapIncidentResponseToIncident(fallback.dto, language), completedAt: fallback.dto.updatedAt ?? null };
    }
    return null;
  }, [selectedFromLists, fallback, selectedId, language]);
  const selectedNotFound = !!selectedId && !selected && fallback?.id === selectedId && fallback.dto === null && fallback.error !== null;

  // Lượt điều phối đầy đủ của sự cố đang chọn: tải khi mở và mỗi khi store báo lượt đổi trạng thái (realtime).
  const live = selectedId ? assignmentsByIncident.get(selectedId) : undefined;
  const liveSignature = (live ?? []).map((a) => `${a.id}:${a.status}`).join('|');
  const [fetched, setFetched] = useState<{ id: string; items: DispatchAssignmentResponseDto[] } | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReload, setDetailReload] = useState(0);
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setDetailError(null);
    dispatchService
      .getAssignmentsByIncident(selectedId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) setFetched({ id: selectedId, items: res.data });
        else setDetailError(res.message || t('incidents.completion.detail.loadFailed'));
      })
      .catch((err) => {
        if (!cancelled) setDetailError(getApiErrorMessage(err, t('incidents.completion.detail.loadFailed')));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, liveSignature, detailReload, t]);

  const fetchedForSelected = fetched?.id === selectedId ? fetched.items : null;
  const detailAssignments = useMemo(
    () => mergeAssignments(fetchedForSelected, live),
    [fetchedForSelected, live]
  );
  const detailGroups = useMemo(() => groupCompletion(detailAssignments, teamByVehicle), [detailAssignments, teamByVehicle]);
  // Chưa có gì để hiện (chưa tải xong, store cũng không có) → vòng xoay thay vì báo "chưa giao xe".
  const detailLoading = !fetchedForSelected && !live && !detailError;

  // ---------- Điều hướng ----------
  const select = (id: string) => updateParams({ incident: id });
  const closeDetail = useCallback(() => updateParams({ incident: null }), [updateParams]);
  const changeTab = (next: CompletionTab) => updateParams({ tab: next === 'done' ? 'done' : null });

  // Esc: đóng chi tiết (lightbox tự chặn Esc của nó; đang gõ trong ô tìm kiếm thì bỏ qua).
  useEffect(() => {
    if (!selectedId) return;
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key !== 'Escape' || target?.closest('input, select, textarea')) return;
      closeDetail();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedId, closeDetail]);

  if (stationNotAssigned) return <StationNotAssigned message={stationNotAssigned} />;

  const isCompleted = selected?.incident.status === 'completed';

  return (
    <div className="h-full flex min-h-0">
      <div
        className={`${selectedId ? 'hidden xl:flex' : 'flex'} flex-col w-full xl:w-[400px] 2xl:w-[440px] shrink-0 xl:border-r border-slate-200 min-h-0`}
      >
        <CompletionList
          tab={tab}
          onTabChange={changeTab}
          pendingCount={pendingIncidents.length}
          rows={tab === 'pending' ? pendingRows : doneRows}
          selectedId={selectedId}
          onSelect={select}
          loading={tab === 'pending' ? incidentsLoading : doneLoading}
          error={tab === 'done' ? doneError : null}
          onRetry={() => setDoneReload((n) => n + 1)}
          search={search}
          onSearchChange={changeSearch}
          range={range}
          onRangeChange={changeRange}
          page={page}
          totalPages={done?.totalPages ?? 1}
          totalCount={done?.totalCount ?? 0}
          onPageChange={setPage}
          now={now}
        />
      </div>

      <div className={`${selectedId ? 'flex' : 'hidden xl:flex'} flex-1 flex-col min-w-0 min-h-0`}>
        {selected ? (
          <CompletionDetail
            // Đổi sự cố → dựng lại khung (đóng lịch sử, ảnh đang xem, mốc "vừa ký").
            key={selected.incident.id}
            incident={selected.incident}
            isCompleted={isCompleted}
            assignments={detailAssignments}
            groups={detailGroups}
            loading={detailLoading}
            error={detailError && (fetchedForSelected || live) ? t('incidents.completion.detail.loadFailed') : detailError}
            onReload={() => setDetailReload((n) => n + 1)}
            onBack={closeDetail}
            now={now}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center bg-slate-50/60">
            {selectedNotFound ? (
              <>
                <SearchX className="w-9 h-9 text-slate-300" />
                <p className="text-sm text-slate-500 max-w-xs">{fallback?.error || t('incidents.completion.notFound')}</p>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900"
                >
                  {t('incidents.completion.back')}
                </button>
              </>
            ) : (
              <>
                <ClipboardCheck className="w-9 h-9 text-slate-300" />
                <p className="text-sm text-slate-500 max-w-xs">
                  {selectedId ? t('incidents.completion.loading') : t('incidents.completion.selectHint')}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
