import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import { NAV_CATEGORIES, NAV_ITEMS, NAV_BY_PATH, type NavItem } from '../config/nav';
import { useNavPrefs } from '../hooks/useNavPrefs';

interface Scored {
  item: NavItem;
  category: string;
  score: number;
}

/** Lightweight relevance scoring over label + keywords + category. */
function scoreItems(query: string): Scored[] {
  const flat: { item: NavItem; category: string }[] = NAV_CATEGORIES.flatMap((c) =>
    c.items.filter((i) => i.path !== '/').map((item) => ({ item, category: c.label })),
  );
  const q = query.trim().toLowerCase();
  if (!q) return flat.map((f) => ({ ...f, score: 0 }));

  const tokens = q.split(/\s+/);
  const results: Scored[] = [];
  for (const { item, category } of flat) {
    const label = item.label.toLowerCase();
    const hay = `${label} ${item.keywords ?? ''} ${category.toLowerCase()}`;
    // Every token must appear somewhere
    if (!tokens.every((t) => hay.includes(t))) continue;
    let score = 0;
    if (label.startsWith(q)) score += 100;
    else if (label.includes(q)) score += 50;
    if ((item.keywords ?? '').includes(q)) score += 20;
    score += 10 - Math.min(10, label.length / 4); // prefer shorter labels
    results.push({ item, category, score });
  }
  return results.sort((a, b) => b.score - a.score);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { recents } = useNavPrefs();

  // With no query, surface recently used calculators first.
  const results = useMemo(() => {
    if (query.trim()) return scoreItems(query);
    const recentItems = recents
      .map((p) => NAV_BY_PATH[p])
      .filter(Boolean)
      .map((item) => ({ item, category: 'Recent', score: 0 }));
    const recentPaths = new Set(recentItems.map((r) => r.item.path));
    const rest = scoreItems('').filter((r) => !recentPaths.has(r.item.path));
    return [...recentItems, ...rest];
  }, [query, recents]);

  // Global open shortcut: Ctrl/Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Clamp active index when results change
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
  }, [results.length]);

  const go = (item: NavItem) => {
    navigate(item.path);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = results[active];
      if (sel) go(sel.item);
    }
  };

  // Keep active row in view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  return (
    <>
      {/* Trigger pill in header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 h-9 rounded-xl text-xs transition-all"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}
        aria-label="Search calculators"
        title="Search calculators (Ctrl+K)"
      >
        <Search size={14} />
        <span className="hidden md:inline">Search…</span>
        <kbd
          className="hidden md:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}
        >
          Ctrl K
        </kbd>
      </button>

      {!open ? null : (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
          style={{ background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <Search size={17} style={{ color: 'var(--color-text-subtle)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search calculators…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
              />
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}>
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
              {results.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-subtle)' }}>
                  No calculators match “{query}”.
                </p>
              ) : (
                results.map(({ item, category }, idx) => {
                  const Icon = item.icon;
                  const isActive = idx === active;
                  return (
                    <button
                      key={item.path}
                      data-idx={idx}
                      onClick={() => go(item)}
                      onMouseMove={() => setActive(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent' }}
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${item.color}1f` }}
                      >
                        <Icon size={15} style={{ color: item.color }} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{item.label}</span>
                        <span className="block text-[11px] truncate" style={{ color: 'var(--color-text-subtle)' }}>{category}</span>
                      </span>
                      {isActive && <CornerDownLeft size={14} style={{ color: 'var(--color-text-subtle)' }} />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t text-[11px]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-subtle)' }}>
              <span className="flex items-center gap-1"><kbd className="px-1 rounded" style={{ background: 'var(--color-surface)' }}>↑</kbd><kbd className="px-1 rounded" style={{ background: 'var(--color-surface)' }}>↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 rounded" style={{ background: 'var(--color-surface)' }}>↵</kbd> open</span>
              <span className="ml-auto">{NAV_ITEMS.length - 1} calculators</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
