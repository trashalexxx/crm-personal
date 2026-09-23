/** Formateo de dinero, fechas y textos. Todo el dinero viaja en céntimos. */

export function formatMoney(cents: number, currency = 'EUR', locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Convierte lo que escribe el usuario ("1.250,50" o "1250.5") a céntimos. */
export function parseMoneyToCents(input: string): number {
  const cleaned = input.trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (lastComma > lastDot) {
    // Formato español: el separador decimal es la coma.
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = cleaned.replace(/,/g, '');
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Céntimos -> cadena editable en un input de texto. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatDate(value: string | Date | null | undefined, locale = 'es-ES'): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined, locale = 'es-ES'): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(value: string | Date, locale = 'es-ES'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

/** "hace 3 días", "en 2 horas"… */
export function formatRelative(value: string | Date, locale = 'es-ES'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return rtf.format(Math.round(diffMs / 1000), 'second');
}

/** Valor para <input type="datetime-local"> a partir de un ISO. */
export function toDateTimeLocal(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valor para <input type="date"> a partir de un ISO. */
export function toDateInput(value: string | Date | null | undefined): string {
  return toDateTimeLocal(value).slice(0, 10);
}

/** Convierte el valor de un input de fecha a ISO, o null si está vacío. */
export function fromDateInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function fullName(contact: { firstName: string; lastName?: string | null } | null | undefined): string {
  if (!contact) return '—';
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Número de teléfono en formato apto para un enlace wa.me (solo dígitos). */
export function whatsappDigits(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, '') ?? '';
  return digits.length >= 8 ? digits : null;
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(dueDate) < startOfToday;
}
