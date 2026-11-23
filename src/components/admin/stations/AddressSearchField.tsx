import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { inputClass } from '../common/styles';
import { useDebouncedValue } from '../common/hooks';
import {
  mergeSuggestions,
  searchAddress,
  searchOpenStreetMap,
  type AddressSuggestion,
} from '../../../services/admin/geocodeService';
import { useTranslation } from '../../../i18n';

const MIN_QUERY_LENGTH = 4;

type SearchFn = (query: string, signal: AbortSignal) => Promise<AddressSuggestion[]>;

// §43: đang gõ chỉ dùng Mapbox (OpenStreetMap cấm gợi ý khi gõ).
const searchWhileTyping: SearchFn = (query, signal) => searchAddress(query, signal, { fallbackToNominatim: false });

interface AddressSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Chọn một gợi ý → điền địa chỉ và dời vị trí trên bản đồ. */
  onPick: (suggestion: AddressSuggestion) => void;
  maxLength: number;
  disabled?: boolean;
  placeholder?: string;
  /** Hàm tìm khi đang gõ (VD giới hạn trong khu vực phục vụ). Mặc định tìm toàn quốc. Không được gọi OpenStreetMap. */
  search?: SearchFn;
  /** Hàm chạy khi bấm "Tìm thêm trên OpenStreetMap". Mặc định tìm toàn quốc. */
  searchMore?: SearchFn;
  /** Số ký tự tối thiểu mới tìm (tìm toàn quốc cần dài hơn để bớt kết quả nhiễu). */
  minQueryLength?: number;
}

/** Ô địa chỉ kèm gợi ý: gõ địa chỉ → chọn một gợi ý để bản đồ dời tới đó. */
export const AddressSearchField: React.FC<AddressSearchFieldProps> = ({
  value,
  onChange,
  onPick,
  maxLength,
  disabled,
  placeholder,
  search = searchWhileTyping,
  searchMore = searchOpenStreetMap,
  minQueryLength = MIN_QUERY_LENGTH,
}) => {
  const { t } = useTranslation();
  // Chỉ tìm khi Admin tự gõ — địa chỉ tự điền từ bản đồ thì không mở gợi ý.
  const [typed, setTyped] = useState(false);
  const [open, setOpen] = useState(false);
  // Kết quả gắn với đúng câu tìm đã gửi → đang tìm = câu hiện tại chưa có kết quả.
  const [result, setResult] = useState<{ query: string; items: AddressSuggestion[]; error: boolean } | null>(null);
  // Kết quả bấm tìm thêm, cũng gắn với câu tìm (gõ câu khác thì nút hiện lại).
  const [more, setMore] = useState<{ query: string; state: 'loading' | 'done' | 'error'; items: AddressSuggestion[] } | null>(null);
  const moreAbortRef = useRef<AbortController | null>(null);
  const query = useDebouncedValue(value.trim(), 500);
  // Gõ chưa đủ dài hoặc vừa chọn gợi ý → không tìm, không hiện danh sách.
  const active = typed && query.length >= minQueryLength;
  const current = result?.query === query ? result : null;
  const searching = active && !current;
  const currentMore = more?.query === query ? more : null;
  const suggestions = mergeSuggestions(current?.items ?? [], currentMore?.items ?? []);
  // Mapbox lỗi nhưng đã bấm tìm thêm và có kết quả → vẫn hiện danh sách.
  const searchError = !!current?.error && suggestions.length === 0;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    search(query, controller.signal)
      .then((items) => {
        setResult({ query, items, error: false });
        setOpen(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ query, items: [], error: true });
      });
    return () => {
      controller.abort();
      moreAbortRef.current?.abort();
    };
    // `search` là hàm của trang gọi — chỉ tìm lại khi câu tìm đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, active]);

  const handleSearchMore = () => {
    if (currentMore && currentMore.state !== 'error') return;
    const controller = new AbortController();
    moreAbortRef.current = controller;
    setMore({ query, state: 'loading', items: [] });
    searchMore(query, controller.signal)
      .then((items) => {
        setMore({ query, state: 'done', items });
        setOpen(true);
      })
      .catch(() => {
        // Bị hủy vì gõ tiếp → bỏ trạng thái đang tìm, để gõ lại đúng câu đó thì nút bấm được.
        setMore((m) => (controller.signal.aborted ? (m?.query === query ? null : m) : { query, state: 'error', items: [] }));
      });
  };

  // Mỗi lần bấm gọi OpenStreetMap đúng một lần; có kết quả rồi thì ẩn nút.
  const moreButton = currentMore?.state !== 'done' && (
    <button
      type="button"
      disabled={currentMore?.state === 'loading'}
      // Giữ focus ở ô nhập để danh sách không đóng trước khi bấm xong.
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleSearchMore}
      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-wait"
    >
      {currentMore?.state === 'loading' ? (
        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
      ) : (
        <Search className="w-3.5 h-3.5 shrink-0" />
      )}
      {t(currentMore?.state === 'error' ? 'admin.stations.addressSearch.moreFailed' : 'admin.stations.addressSearch.more')}
    </button>
  );

  const pick = (s: AddressSuggestion) => {
    setTyped(false);
    setOpen(false);
    onPick(s);
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          setTyped(true);
          onChange(e.target.value);
        }}
        onFocus={() => active && setOpen(true)}
        // Trễ một nhịp để kịp nhận click vào gợi ý trước khi danh sách đóng.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        maxLength={maxLength}
        required
        disabled={disabled}
        placeholder={placeholder ?? t('admin.stations.addressSearch.placeholder')}
        autoComplete="off"
        className={`${inputClass} pr-9`}
      />
      {searching && active && (
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
      )}

      {open && active && current && !searchError && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg divide-y divide-slate-100">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-slate-400">{t('admin.stations.addressSearch.noResults')}</li>
          ) : (
            suggestions.map((s) => (
              <li key={`${s.lat},${s.lng},${s.label}`}>
                <button
                  type="button"
                  // mousedown chạy trước blur của ô nhập.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-red-50"
                >
                  <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{s.label}</span>
                </button>
              </li>
            ))
          )}
          {moreButton && <li>{moreButton}</li>}
        </ul>
      )}
      {searchError && active && (
        <>
          <p className="mt-1 text-[11px] text-amber-700">{t('admin.stations.addressSearch.failed')}</p>
          {moreButton}
        </>
      )}
    </div>
  );
};
