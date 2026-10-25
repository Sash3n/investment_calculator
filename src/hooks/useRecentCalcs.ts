import { useState } from 'react';

const KEY   = 'fincalc_recent';
const LIMIT = 3;

export interface RecentEntry {
  path:    string;
  visited: number;
}

export function useRecentCalcs(): RecentEntry[] {
  // Read once when the component mounts
  const [entries] = useState<RecentEntry[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  return entries;
}

export function trackCalcVisit(path: string): void {
  try {
    const raw     = localStorage.getItem(KEY);
    const current: RecentEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = current.filter((e) => e.path !== path);
    const updated  = [{ path, visited: Date.now() }, ...filtered].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
