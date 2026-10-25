// Class Tailwind dùng chung cho các màn Admin (tách khỏi ui.tsx để file component chỉ export component).
export const inputClass =
  'w-full px-3 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400';

/**
 * Ô nhập có báo lỗi theo từng ô: đang nhập viền trung tính (không đỏ); lỗi (sau khi rời ô / bấm lưu) viền đỏ.
 */
export const validatedInputClass = (invalid: boolean) =>
  `w-full px-3 py-2.5 rounded-lg bg-white border text-slate-900 text-sm focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400 ${
    invalid ? 'border-red-500 bg-red-50/40 focus:border-red-500' : 'border-slate-300 focus:border-slate-500'
  }`;

export const labelClass = 'block text-xs font-mono-data uppercase tracking-wider text-slate-500 font-semibold';

export const thClass = 'px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold';

export const iconButtonClass =
  'p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400';
