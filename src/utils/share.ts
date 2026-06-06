/**
 * Encode/decode calculator inputs to a URL-safe string so a scenario can be
 * shared or bookmarked via a `?s=` query parameter.
 */

export function encodeState(obj: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

export function decodeState<T>(s: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(atob(s))) as T;
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
