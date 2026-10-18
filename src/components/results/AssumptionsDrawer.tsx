import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** "What this assumes", closed by default. A native <details>, so it works with the keyboard. */
export function AssumptionsDrawer({ items, className = '' }: { items: ReactNode[]; className?: string }) {
  return (
    <details className={`assumptions glass-card-static group ${className}`}>
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer text-sm font-semibold text-ink">
        What this assumes
        <ChevronDown size={16} aria-hidden className="text-ink-subtle transition-transform group-open:rotate-180" />
      </summary>
      <ul className="px-5 pb-5 pl-10 list-disc space-y-1.5 text-sm text-ink-muted">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </details>
  );
}
