import { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { JourneyValues } from '../config/journeys';

export interface PublishedJourneyValues {
  path: string;
  values: JourneyValues;
}

export interface JourneyContextValue {
  published: PublishedJourneyValues | null;
  publish: (p: PublishedJourneyValues | null) => void;
}

export const JourneyContext = createContext<JourneyContextValue | null>(null);

/** Figures the current page has published for the next journey step, if any. */
export function usePublishedJourneyValues(): JourneyValues | null {
  const ctx = useContext(JourneyContext);
  const { pathname } = useLocation();
  return ctx?.published && ctx.published.path === pathname ? ctx.published.values : null;
}

/**
 * Publish this calculator's key figures so a journey can hand them to the next
 * step. Cheap to call on every render; only changes are published.
 */
export function useJourneyValues(values: JourneyValues): void {
  const ctx = useContext(JourneyContext);
  const { pathname } = useLocation();
  const key = JSON.stringify(values);
  const publish = ctx?.publish;
  useEffect(() => {
    publish?.({ path: pathname, values: JSON.parse(key) as JourneyValues });
  }, [publish, pathname, key]);
}
