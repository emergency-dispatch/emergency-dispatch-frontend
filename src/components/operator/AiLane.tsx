import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronDown, MapPin, X } from 'lucide-react';
import { SEVERITY_LEVEL_COLOR } from '../../data/incidentMock';
import { useDispatchStore } from '../../context/DispatchContext';
import { SeverityBadge } from './incidents/SeverityBadge';
import {
  aiProgressOf,
  codeTail,
  formatWaitTime,
  isAiWorking,
  useIncomingTriage,
  type AiProgress,
  type AiWorkingItem,
} from './incidents/incomingTriage';
import { useTranslation } from '../../i18n';

const QUEUE_PATH = '/dashboard/command-center/incidents';
const LIVE_MAP_PATH = '/dashboard/command-center/live-map';

/** Số ô hiện được trên thanh trên cùng theo bề ngang; còn lại gộp vào "+N". Dưới lg chỉ còn nút "AI · N". */
function useVisibleTicketCount(): number {
  const read = () => {
    const w = window.innerWidth;
    return w < 1024 ? 0 : w < 1280 ? 1 : w < 1536 ? 2 : 3;
  };
  const [count, setCount] = useState(read);
  useEffect(() => {
    const onResize = () => setCount(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return count;
}

/** Viền trái: màu cấp độ khi AI đã nhận diện, chàm (việc của AI) khi chưa. */
const railStyle = (item: AiWorkingItem): React.CSSProperties =>
  item.incident.aiPending || item.incident.aiUnclassified
    ? {}
    : { background: SEVERITY_LEVEL_COLOR[item.incident.severity] };

/**
 * Thanh thời gian 2 đoạn: Phân tích ảnh (so với mốc ~2 phút backend chờ AI) | Điều phối (so với hạn 20 s).
 * Đoạn đang chạy chuyển vàng khi lâu hơn thường lệ.
 */
const SegmentBar: React.FC<{ progress: AiProgress; className?: string; height?: string }> = ({
  progress,
  className = '',
  height = 'h-1',
}) => {
  const segment = (fill: number, active: boolean) => (
    <span className={`relative ${height} rounded-full bg-indigo-100 overflow-hidden`}>
      <span
        className={`absolute inset-y-0 left-0 rounded-full motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-linear ${
          active && progress.slow ? 'bg-amber-500' : 'bg-indigo-600'
        }`}
        style={{ width: `${fill * 100}%` }}
      />
    </span>
  );
  return (
    <span aria-hidden className={`grid grid-cols-[3fr_1fr] gap-0.5 ${className}`}>
      {segment(progress.analyzeFill, progress.phase === 'analyzing')}
      {segment(progress.decideFill, progress.phase === 'deciding')}
    </span>
  );
};

/** "Tôi xử lý" — mở ca = giữ khóa mềm → AI bỏ qua ca này, nên hỏi lại một lần. */
export const AiTakeOver: React.FC<{ incidentId: string; onDone?: () => void }> = ({ incidentId, onDone }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dismissIncomingIncident } = useDispatchStore();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        {t('layout.aiLane.takeOver')}
      </button>
    );
  }
  return (
    <div role="alertdialog" className="w-full rounded-md bg-amber-50 border border-amber-200 p-2 space-y-2">
      <p className="text-xs text-amber-900">{t('layout.incomingIncident.ai.takeOverConfirm')}</p>
      <div className="flex gap-2">
        <button
          type="button"
          autoFocus
          onClick={() => {
            dismissIncomingIncident(incidentId);
            onDone?.();
            navigate(QUEUE_PATH, { state: { openIncidentId: incidentId } });
          }}
          className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
        >
          {t('layout.incomingIncident.ai.takeOverYes')}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
        >
          {t('layout.incomingIncident.ai.takeOverNo')}
        </button>
      </div>
    </div>
  );
};

/** Ô nhỏ trên thanh trên cùng: viền cấp độ · đuôi mã · loại · thanh 2 đoạn · thời gian chờ. */
const Ticket: React.FC<{
  item: AiWorkingItem;
  now: number;
  expanded: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}> = ({ item, now, expanded, onClick, fullWidth = false }) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const progress = aiProgressOf(item, now);
  const { incident } = item;
  const kind = incident.aiPending ? t('layout.aiLane.sos') : incidentKindLabel(incident);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      title={`${incident.code || incident.title} · ${incident.area}`}
      className={`flex items-stretch h-9 rounded-md border bg-white overflow-hidden text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 ${
        expanded ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'
      } ${fullWidth ? 'w-full' : 'shrink-0'}`}
    >
      <span aria-hidden className="w-1 shrink-0 bg-indigo-400" style={railStyle(item)} />
      <span className={`flex items-center gap-2 px-2.5 min-w-0 ${fullWidth ? 'flex-1' : ''}`}>
        <span className="font-mono-data text-xs font-bold text-slate-900 tabular-nums">
          {incident.code ? codeTail(incident.code) : '—'}
        </span>
        <span className={`text-[11px] text-slate-600 truncate ${fullWidth ? 'flex-1' : 'max-w-[5.5rem]'}`}>{kind}</span>
        <SegmentBar progress={progress} className="w-12 shrink-0" />
        <span
          className={`font-mono-data text-[11px] tabular-nums shrink-0 ${progress.slow ? 'text-amber-700 font-bold' : 'text-slate-500'}`}
        >
          {formatWaitTime(progress.elapsedSeconds)}
        </span>
      </span>
    </button>
  );
};

/** Bảng chi tiết của một ca dưới dải AI. */
const TicketPanel: React.FC<{ item: AiWorkingItem; now: number; onClose: () => void }> = ({ item, now, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { incidentKindLabel } = useDispatchStore();
  const { incident } = item;
  const progress = aiProgressOf(item, now);
  const status = progress.slow
    ? t('layout.aiLane.slow')
    : progress.phase === 'analyzing'
      ? t('layout.aiLane.analyzing')
      : t('layout.aiLane.deciding');

  return (
    <div className="flex">
      <span aria-hidden className="w-1 shrink-0 bg-indigo-400" style={railStyle(item)} />
      <div className="flex-1 min-w-0 p-3.5 space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-mono-data text-sm font-bold text-slate-900">{incident.code || '—'}</p>
            <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{incident.area}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('layout.aiLane.close')}
            className="p-1 -m-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {incident.aiPending ? (
            <span className="text-slate-500">{t('layout.aiLane.pendingAi')}</span>
          ) : (
            <>
              <span className="font-semibold text-slate-800">{incidentKindLabel(incident)}</span>
              <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
            </>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-end gap-3">
            <SegmentBar progress={progress} height="h-1.5" className="flex-1" />
            <span
              className={`font-mono-data text-lg leading-none font-bold tabular-nums ${
                progress.slow ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {formatWaitTime(progress.elapsedSeconds)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr_1fr] gap-0.5 pr-[4.5rem] text-[10px] text-slate-500">
            <span className={progress.phase === 'analyzing' ? 'font-semibold text-indigo-700' : ''}>
              {t('layout.aiLane.analyzeStep')}
            </span>
            <span className={progress.phase === 'deciding' ? 'font-semibold text-indigo-700' : ''}>
              {t('layout.aiLane.decideStep')}
            </span>
          </div>
          <p
            role="status"
            className={`flex items-center gap-1.5 text-xs ${progress.slow ? 'text-amber-800' : 'text-indigo-800'}`}
          >
            <Bot className="w-3.5 h-3.5 shrink-0" />
            {status}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(LIVE_MAP_PATH, { state: { focusAiIncidentId: incident.id } });
            }}
            title={t('layout.aiLane.viewOnMapHint')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <MapPin className="w-3.5 h-3.5" />
            {t('layout.aiLane.viewOnMap')}
          </button>
          <AiTakeOver incidentId={incident.id} onDone={onClose} />
        </div>
      </div>
    </div>
  );
};

type OpenState = { kind: 'detail'; id: string } | { kind: 'list' } | null;

/**
 * §31.E: dải "Ca AI đang xử lý" trên thanh trên cùng của Operator — thay thẻ nổi góc phải (che bản đồ). Mỗi ô là một tin
 * báo AI đang phân tích / điều phối; bấm mở bảng chi tiết (xem trên bản đồ không giữ ca, "Tôi xử lý" hỏi lại). Ca AI
 * chuyển cho người vẫn bật modal "Cần bạn xử lý" (IncomingIncidentToasts).
 */
export const AiLane: React.FC = () => {
  const { t } = useTranslation();
  const { items, now } = useIncomingTriage();
  const working = items.filter(isAiWorking);
  const visibleCount = useVisibleTicketCount();
  const [open, setOpen] = useState<OpenState>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (working.length === 0) return null;

  const visible = working.slice(0, visibleCount);
  const hidden = working.length - visible.length;
  // Ca vừa rời tay AI (đã điều / chuyển cho người) → bảng tự đóng.
  const detail = open?.kind === 'detail' ? working.find((item) => item.incident.id === open.id) : undefined;
  const showList = open?.kind === 'list';
  const toggleDetail = (id: string) =>
    setOpen((prev) => (prev?.kind === 'detail' && prev.id === id ? null : { kind: 'detail', id }));

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5 min-w-0" aria-label={t('layout.aiLane.label')} role="group">
      <span className="hidden lg:flex items-center pr-1 text-indigo-600" title={t('layout.aiLane.label')}>
        <Bot className="w-4 h-4" />
      </span>
      {visible.map((item) => (
        <Ticket
          key={item.incident.id}
          item={item}
          now={now}
          expanded={detail?.incident.id === item.incident.id}
          onClick={() => toggleDetail(item.incident.id)}
        />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((prev) => (prev?.kind === 'list' ? null : { kind: 'list' }))}
          aria-expanded={showList}
          title={t('layout.aiLane.moreTitle', { count: hidden })}
          className={`flex items-center gap-1 h-9 px-2.5 rounded-md border text-xs font-bold shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${
            showList ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:border-indigo-300'
          }`}
        >
          {visibleCount === 0 ? (
            <>
              <Bot className="w-4 h-4" />
              {t('layout.aiLane.compact', { count: working.length })}
            </>
          ) : (
            t('layout.aiLane.more', { count: hidden })
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showList ? 'rotate-180' : ''}`} />
        </button>
      )}

      {(detail || showList) && (
        <div className="absolute left-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden animate-drawer-in">
          {detail ? (
            <TicketPanel item={detail} now={now} onClose={() => setOpen(null)} />
          ) : (
            <div className="p-2 space-y-1.5">
              <p className="px-1 pt-1 text-xs font-bold text-slate-700">
                {t('layout.aiLane.listTitle', { count: working.length })}
              </p>
              {working.map((item) => (
                <Ticket
                  key={item.incident.id}
                  item={item}
                  now={now}
                  expanded={false}
                  fullWidth
                  onClick={() => setOpen({ kind: 'detail', id: item.incident.id })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
