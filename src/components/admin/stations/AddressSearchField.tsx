import React, { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { inputClass } from '../common/styles';
import { useDebouncedValue } from '../common/hooks';
import { searchAddress, type AddressSuggestion } from '../../../services/admin/geocodeService';
import { useTranslation } from '../../../i18n';

const MIN_QUERY_LENGTH = 4;

interface AddressSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Chọn một gợi ý → điền địa chỉ và dời vị trí trên bản đồ. */
  onPick: (suggestion: AddressSuggestion) => void;
  maxLength: number;
  disabled?: boolean;
  placeholder?: string;
  /** Hàm tìm thay thế (VD giới hạn trong khu vực phục vụ). Mặc định tìm toàn quốc. */
  search?: (query: string, signal: AbortSignal) => Promise<AddressSuggestion[]>;
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
  search = searchAddress,
  minQueryLength = MIN_QUERY_LENGTH,
}) => {
  const { t } = useTranslation();
  // Chỉ tìm khi Admin tự gõ — địa chỉ tự điền từ bản đồ thì không mở gợi ý.
  const [typed, setTyped] = useState(false);
  const [open, setOpen] = useState(false);
  // Kết quả gắn với đúng câu tìm đã gửi → đang tìm = câu hiện tại chưa có kết quả.
  const [result, setResult] = useState<{ query: string; items: AddressSuggestion[]; error: boolean } | null>(null);
  const query = useDebouncedValue(value.trim(), 500);
  // Gõ chưa đủ dài hoặc vừa chọn gợi ý → không tìm, không hiện danh sách.
  const active = typed && query.length >= minQueryLength;
  const current = result?.query === query ? result : null;
  const searching = active && !current;
  const suggestions = current?.items ?? [];
  const searchError = !!current?.error;

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
    return () => controller.abort();
    // `search` là hàm của trang gọi — chỉ tìm lại khi câu tìm đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, active]);

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
        </ul>
      )}
      {searchError && active && (
        <p className="mt-1 text-[11px] text-amber-700">{t('admin.stations.addressSearch.failed')}</p>
      )}
    </div>
  );
};
