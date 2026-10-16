/** 0981234456 → 098***456 (FR-OP-03: che số điện thoại người báo). */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

/** Số giây còn lại → "1:45". */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
