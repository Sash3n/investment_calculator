/**
 * Format a number as South African Rand: R 1,234,567.89
 */
export function formatRand(n: number, decimals = 2): string {
  if (!isFinite(n)) return 'R 0.00';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = n < 0 ? '-' : '';
  return `${sign}R ${formatted}`;
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
 * Format a number with commas: 1,234,567
 */
export function formatNumber(n: number, decimals = 0): string {
  if (!isFinite(n)) return '0';
  return n.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a date as "Jan 2045"
 */
export function formatDate(d: Date): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
}

/**
 * Short rand: "R 1.2M" or "R 450K"
 */
export function formatRandShort(n: number): string {
  if (!isFinite(n)) return 'R 0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}R ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}R ${(abs / 1_000).toFixed(0)}K`;
  return `${sign}R ${abs.toFixed(0)}`;
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
