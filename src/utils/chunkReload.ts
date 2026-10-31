const RELOAD_KEY = 'fincalc-chunk-reload';

/** True when a page's code file could not be loaded, usually a tab left open across a deploy. */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /dynamically imported module|importing a module script|module script failed|loading chunk|preload css/i.test(error.message);
}

/** Reload once to pick up the new files. Returns false if that was already tried. */
export function reloadForNewVersion(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return false;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    return false; // storage blocked: without the guard a reload could loop
  }
  window.location.reload();
  return true;
}
