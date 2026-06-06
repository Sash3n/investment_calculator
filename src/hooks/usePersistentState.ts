import { useEffect, useRef, useState } from 'react';

/**
 * Drop-in replacement for useState that persists the value to localStorage,
 * so a page refresh or revisit restores the user's last inputs. The stored
 * value is shallow-merged over `initial` on load to tolerate shape changes
 * (new fields added to the inputs type won't break old saved state).
 */
export function usePersistentState<T extends object>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...initial, ...(JSON.parse(raw) as Partial<T>) };
    } catch { /* ignore parse errors */ }
    return initial;
  });

  // Debounce-free write on every change (state objects here are small)
  const first = useRef(true);
  useEffect(() => {
    // Skip the very first effect so we don't immediately rewrite the loaded value
    if (first.current) { first.current = false; return; }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch { /* ignore quota errors */ }
  }, [key, state]);

  return [state, setState];
}
