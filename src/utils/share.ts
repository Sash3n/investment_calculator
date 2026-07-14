/**
 * Encode/decode calculator inputs to a URL-safe string so a scenario can be
 * shared or bookmarked via a `?s=` query parameter.
 */

export function encodeState(obj: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

/** Largest numeric magnitude accepted from a share link (1 trillion). */
const MAX_SHARED_MAGNITUDE = 1e12;

/**
 * Drops keys whose values could corrupt calculator state: non-finite numbers
 * (NaN/Infinity) and absurd magnitudes. Dropped keys fall back to each
 * calculator's `?? default`. Share links are attacker-controllable input —
 * consumers cast the result to their input type, so anything numeric must
 * actually be a safe number. Strings/booleans pass through (rendered via
 * React escaping only); nested objects are pruned recursively.
 */
function sanitizeShared(value: unknown): unknown {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Math.abs(value) <= MAX_SHARED_MAGNITUDE ? value : undefined;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeShared).filter((v) => v !== undefined);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // Skip prototype-polluting keys: JSON.parse makes `__proto__` an own
      // property, and `out[k] = …` would route it through the prototype
      // setter, silently reshaping the object a consumer reads via `?.`.
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const clean = sanitizeShared(v);
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

/** Read and decode the `?s=` share parameter from the current URL, if present. */
export function readShareParam<T>(): T | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('s');
    return raw ? decodeState<T>(raw) : null;
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
