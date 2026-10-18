import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Counts a number up to `target` the first time it is shown. After that first
 * count, changes apply at once. With reduced motion the target shows straight away.
 */
export function useCountUp(target: number, duration = 900): number {
  const [reduce] = useState(prefersReducedMotion);
  // The number being shown while counting; null once the count has finished
  const [counting, setCounting] = useState<number | null>(reduce ? null : 0);
  const current = useRef(0);
  const finished = useRef(reduce);

  useEffect(() => {
    if (finished.current) return;
    // Continue from wherever the count is, so a late change does not restart it
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      current.current = from + (target - from) * (1 - Math.pow(1 - t, 3));
      if (t < 1) {
        setCounting(current.current);
        raf = requestAnimationFrame(tick);
      } else {
        finished.current = true;
        setCounting(null);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return counting ?? target;
}
