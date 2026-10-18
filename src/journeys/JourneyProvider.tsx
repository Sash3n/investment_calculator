import { useMemo, useState, type ReactNode } from 'react';
import { JourneyContext, type PublishedJourneyValues } from './journeyContext';

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [published, publish] = useState<PublishedJourneyValues | null>(null);
  const value = useMemo(() => ({ published, publish }), [published]);
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}
