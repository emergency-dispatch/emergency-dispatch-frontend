import { describe, expect, it } from 'vitest';
import i18n, { LANGUAGE_OPTIONS, dateLocale, getLanguage, restoreStoredLanguage, setLanguage } from '@/i18n';
import { vi as viMessages } from '@/i18n/locales/vi';
import { en as enMessages } from '@/i18n/locales/en';

type Tree = { [k: string]: string | Tree };

function leaves(obj: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.set(path, v);
    else for (const [p, s] of leaves(v, path)) out.set(p, s);
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('từ điển vi / en', () => {
  const viLeaves = leaves(viMessages as unknown as Tree);
  const enLeaves = leaves(enMessages as unknown as Tree);

  it('có cùng tập key', () => {
    const missingInEn = [...viLeaves.keys()].filter((k) => !enLeaves.has(k));
    const extraInEn = [...enLeaves.keys()].filter((k) => !viLeaves.has(k));
    expect(missingInEn).toEqual([]);
    expect(extraInEn).toEqual([]);
  });

  it('không có bản dịch rỗng', () => {
    const empty = [...viLeaves, ...enLeaves].filter(([, v]) => v.trim() === '').map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('cùng biến nội suy {{...}} ở hai ngôn ngữ', () => {
    const mismatched = [...viLeaves].filter(([k, v]) => enLeaves.has(k) && placeholders(v).join() !== placeholders(enLeaves.get(k)!).join());
    expect(mismatched.map(([k]) => k)).toEqual([]);
  });
});

describe('i18n runtime', () => {
  it('mặc định tiếng Việt', () => {
    expect(getLanguage()).toBe('vi');
    expect(dateLocale()).toBe('vi-VN');
    expect(LANGUAGE_OPTIONS.map((o) => o.value)).toEqual(['vi', 'en']);
  });

  it('setLanguage đổi ngôn ngữ, lưu localStorage, cập nhật <html lang> và tiêu đề', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(dateLocale()).toBe('en-US');
    expect(localStorage.getItem('resq.language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe(i18n.t('common.documentTitle'));
  });

  it('setLanguage vẫn đổi khi localStorage lỗi', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
    try {
      expect(() => setLanguage('en')).not.toThrow();
      expect(getLanguage()).toBe('en');
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('restoreStoredLanguage khôi phục ngôn ngữ đã lưu', async () => {
    localStorage.setItem('resq.language', 'en');
    restoreStoredLanguage();
    expect(getLanguage()).toBe('en');
    localStorage.setItem('resq.language', 'xx');
    restoreStoredLanguage();
    expect(getLanguage()).toBe('vi');
  });
});
