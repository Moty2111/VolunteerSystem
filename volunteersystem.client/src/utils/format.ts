export function plural(n: number, forms: [string, string, string]): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

export function formatHours(h: number | null | undefined): string {
  const v = Number(h ?? 0);
  return v.toFixed(1) + ' ч';
}

/** Деньги: 440 000 ₽ (без копеек, с неразрывными пробелами). */
export function formatMoney(v: number | null | undefined, withSign = true): string {
  const n = Number(v ?? 0);
  const body = n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  return withSign ? `${body} ₽` : body;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('');
}

export function getMonthShort(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
}

export function getDay(iso: string): string {
  return new Date(iso).getDate().toString().padStart(2, '0');
}
