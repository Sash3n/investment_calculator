const NBSP = ' ';

/**
 * Group with non-breaking spaces and use a decimal comma: 1 234 567,89.
 * Formats in en-US first (identical in every browser) and then swaps the
 * separators, so the output does not depend on each browser's locale data.
 */
function groupZA(abs: number, decimals: number): string {
  return abs
    .toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    .replace(/[,.]/g, (c) => (c === ',' ? NBSP : ','));
}

/**
 * Format a number as South African Rand: R 1 234 567,89
 * (non-breaking spaces, so an amount never wraps across lines).
 */
export function formatRand(n: number, decimals = 2): string {
  if (!isFinite(n)) n = 0;
  const formatted = groupZA(Math.abs(n), decimals);
  // No minus sign on an amount that rounds to zero
  const sign = n < 0 && /[1-9]/.test(formatted) ? '-' : '';
  return `${sign}R${NBSP}${formatted}`;
}

/**
 * Format a number as percentage: 12.50%
 */
export function formatPercent(n: number, decimals = 2): string {
  if (!isFinite(n)) return '0%';
  return `${n.toFixed(decimals)}%`;
}

/**
 * Format months into "X yrs Y months"
 */
export function formatYears(totalMonths: number): string {
  if (!isFinite(totalMonths) || totalMonths <= 0) return '0 months';
  const years = Math.floor(totalMonths / 12);
  const months = Math.round(totalMonths % 12);
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
  if (months === 0) return `${years} yr${years !== 1 ? 's' : ''}`;
  return `${years} yr${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
}

/**
 * Format a plain number the same way as rand amounts: 1 234 567
 */
export function formatNumber(n: number, decimals = 0): string {
  if (!isFinite(n)) n = 0;
  const formatted = groupZA(Math.abs(n), decimals);
  return n < 0 && /[1-9]/.test(formatted) ? `-${formatted}` : formatted;
}

/**
 * Format a date as "Jan 2045"
 */
export function formatDate(d: Date): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
}

/**
 * Short rand: "R 1,2M" or "R 450K"
 */
export function formatRandShort(n: number): string {
  if (!isFinite(n)) n = 0;
  const abs = Math.abs(n);
  const sign = n < 0 && Math.round(abs) > 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}R${NBSP}${groupZA(abs / 1_000_000, 1)}M`;
  if (abs >= 1_000) return `${sign}R${NBSP}${groupZA(abs / 1_000, 0)}K`;
  return `${sign}R${NBSP}${groupZA(abs, 0)}`;
}

/**
 * Tooltip formatter for Recharts — returns formatted Rand string
 */
export function tooltipRand(value: number | string): string {
  return formatRand(typeof value === 'string' ? parseFloat(value) : value);
}

/**
 * Tooltip formatter for Recharts — returns formatted percent string
 */
export function tooltipPercent(value: number | string): string {
  return formatPercent(typeof value === 'string' ? parseFloat(value) : value);
}
