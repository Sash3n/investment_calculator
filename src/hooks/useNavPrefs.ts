import { useCallback, useEffect, useState } from 'react';

/**
 * Tracks user navigation preferences — pinned favourites and recently visited
 * calculators — persisted to localStorage and synced across components in the
 * same tab via a custom event.
 */

const FAV_KEY = 'fincalc-favourites';
const RECENT_KEY = 'fincalc-recents';
const MAX_RECENTS = 6;
const SYNC_EVENT = 'fincalc-navprefs';

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function write(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch { /* ignore quota / serialization errors */ }
}

export function useNavPrefs() {
  const [favourites, setFavourites] = useState<string[]>(() => read(FAV_KEY));
  const [recents, setRecents] = useState<string[]>(() => read(RECENT_KEY));

  // Re-read when another component (or tab) changes prefs
  useEffect(() => {
    const sync = () => {
      setFavourites(read(FAV_KEY));
      setRecents(read(RECENT_KEY));
    };
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleFavourite = useCallback((path: string) => {
    setFavourites((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      write(FAV_KEY, next);
      return next;
    });
  }, []);

  const isFavourite = useCallback((path: string) => favourites.includes(path), [favourites]);

  const recordVisit = useCallback((path: string) => {
    if (path === '/') return; // don't track the dashboard
    setRecents((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(0, MAX_RECENTS);
      write(RECENT_KEY, next);
      return next;
    });
  }, []);

  return { favourites, recents, toggleFavourite, isFavourite, recordVisit };
}
