/**
 * usePrimeRate — fetches the current SA prime lending rate from /api/prime-rate
 * (which proxies the SARB CurrentMarketRates endpoint).
 *
 * Falls back to the last confirmed SARB rates (src/config/referenceRates.ts)
 * if the fetch fails or times out.
 */

import { useState, useEffect } from 'react';
import { SARB_FALLBACK } from '../config/referenceRates';

export const FALLBACK_PRIME = SARB_FALLBACK.primeRate;
export const FALLBACK_REPO  = SARB_FALLBACK.repoRate;

export interface PrimeRateState {
  primeRate:  number;
  repoRate:   number;
  asOf:       string | null; // "2026-03-27"
  loading:    boolean;
  fallback:   boolean;       // true = using hardcoded fallback
}

const CACHE_KEY = 'fincalc_prime_rate';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

function getCached(): PrimeRateState | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: PrimeRateState; ts: number };
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache(data: PrimeRateState) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

export function usePrimeRate(): PrimeRateState {
  // A rate cached this session is used straight away
  const [state, setState] = useState<PrimeRateState>(() => {
    const cached = getCached();
    return cached
      ? { ...cached, loading: false }
      : { primeRate: FALLBACK_PRIME, repoRate: FALLBACK_REPO, asOf: SARB_FALLBACK.asOf, loading: true, fallback: true };
  });

  useEffect(() => {
    if (getCached()) return;

    const controller = new AbortController();

    fetch('/api/prime-rate', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { repoRate: number; primeRate: number; asOf: string | null; fallback: boolean }) => {
        const next: PrimeRateState = {
          primeRate: d.primeRate,
          repoRate:  d.repoRate,
          asOf:      d.asOf,
          loading:   false,
          fallback:  d.fallback,
        };
        setCache(next);
        setState(next);
      })
      .catch(() => {
        setState((prev) => ({ ...prev, loading: false }));
      });

    return () => controller.abort();
  }, []);

  return state;
}
