import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { JourneyValues } from '../config/journeys';

interface Published {
  path: string;
  values: JourneyValues;
}

interface JourneyContextValue {
  published: Published | null;
  publish: (p: Published | null) => void;
}

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [published, publish] = useState<Published | null>(null);
  const value = useMemo(() => ({ published, publish }), [published]);
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

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
