/**
 * Encode/decode calculator inputs to a URL-safe string so a scenario can be
 * shared or bookmarked via a `?s=` query parameter.
 */

export function encodeState(obj: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

/** Largest numeric magnitude accepted from a share link (1 trillion). */
const MAX_SHARED_MAGNITUDE = 1e12;

/** Longest term, age or period accepted from a share link. Calculators loop once per year or month. */
const MAX_SHARED_PERIOD = 1200;
const PERIOD_KEY = /^(?:years?|months?|term|age)(?:[A-Z]|$)|(?:Years?|Months?|Term|Period|Age)$/;

/**
 * Drops keys whose values could corrupt calculator state: non-finite numbers
 * (NaN/Infinity), absurd magnitudes, and periods long enough to freeze the tab
 * in a calculation loop. Dropped keys fall back to each
 * calculator's `?? default`. Share links are attacker-controllable input —
 * consumers cast the result to their input type, so anything numeric must
 * actually be a safe number. Strings/booleans pass through (rendered via
 * React escaping only); nested objects are pruned recursively.
 */
function sanitizeShared(value: unknown, key = ''): unknown {
  if (typeof value === 'number') {
    const max = PERIOD_KEY.test(key) ? MAX_SHARED_PERIOD : MAX_SHARED_MAGNITUDE;
    return Number.isFinite(value) && Math.abs(value) <= max ? value : undefined;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeShared(v, key)).filter((v) => v !== undefined);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // Skip prototype-polluting keys: JSON.parse makes `__proto__` an own
      // property, and `out[k] = …` would route it through the prototype
      // setter, silently reshaping the object a consumer reads via `?.`.
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const clean = sanitizeShared(v, k);
      if (clean !== undefined) out[k] = clean;
    }
    return out;
  }
  return value;
}

export function decodeState<T>(s: string): T | null {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(atob(s)));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return sanitizeShared(parsed) as T;
  } catch {
    return null;
  }
}

const kindOf = (v: unknown) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

/**
 * Keeps only values a page can use. Share states are flat, so nested objects
 * are dropped. With `defaults`, each value must also have the default's type,
 * which pages that spread the result over their inputs rely on.
 */
function matchShape<T>(state: T, defaults?: Partial<T>): T {
  const entries = Object.entries(state as Record<string, unknown>).filter(([k, v]) => {
    if (kindOf(v) === 'object') return false;
    const expected = (defaults as Record<string, unknown> | undefined)?.[k];
    return expected === undefined || kindOf(v) === kindOf(expected);
  });
  return Object.fromEntries(entries) as T;
}

/** Read and decode the `?s=` share parameter from the current URL, if present. */
export function readShareParam<T>(defaults?: Partial<T>): T | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('s');
    const state = raw ? decodeState<T>(raw) : null;
    return state ? matchShape(state, defaults) : null;
  } catch {
    return null;
  }
}

/** Build a shareable absolute URL embedding the given state in `?s=`. */
export function buildShareUrl(obj: unknown): string {
  const url = new URL(window.location.href);
  url.searchParams.set('s', encodeState(obj));
  return url.toString();
}
