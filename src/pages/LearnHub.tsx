import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, ChevronRight, Search } from 'lucide-react';
import { ARTICLES, CATEGORY_META, type ArticleCategory } from '../data/learn';
import { alpha, textTone } from '../utils/color';

const ALL = 'all' as const;
type Filter = ArticleCategory | typeof ALL;

export function LearnHub() {
  const [filter, setFilter]   = useState<Filter>(ALL);
  const [query,  setQuery]    = useState('');

  const q = query.toLowerCase().trim();
  const visible = ARTICLES.filter((a) => {
    if (filter !== ALL && a.category !== filter) return false;
    if (q) return (
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
    return true;
  });

  const categories = Object.entries(CATEGORY_META) as [ArticleCategory, typeof CATEGORY_META[ArticleCategory]][];

  return (
    <motion.div
      className="space-y-8 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--note-blue) 15%, transparent)' }}>
          <BookOpen size={22} style={{ color: 'var(--note-blue-ink)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            Financial Education
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            SA-focused guides on investing, tax, property, debt, and FIRE — each linked to a calculator so you can put the theory to work.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-muted)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: 'var(--paper-raised)',
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
          }}
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(ALL)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: filter === ALL ? 'var(--note-blue)' : 'color-mix(in srgb, var(--note-blue) 10%, transparent)',
            color:      filter === ALL ? 'var(--on-accent)'    : 'var(--note-blue-ink)',
          }}
        >
          All ({ARTICLES.length})
        </button>
        {categories.map(([cat, meta]) => {
          const count = ARTICLES.filter((a) => a.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: filter === cat ? meta.color : alpha(meta.color, 9),
                color:      textTone(filter === cat ? 'var(--on-accent)'     : meta.color),
              }}
            >
              {meta.emoji} {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Article grid */}
      {visible.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--ink-muted)' }}>
          No articles match "{query}".
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((article, i) => {
            const meta = CATEGORY_META[article.category];
            return (
              <motion.div
                key={article.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Link
                  to={`/learn/${article.slug}`}
                  className="flex flex-col h-full p-5 rounded-2xl group transition-all"
                  style={{
                    background: 'var(--paper-raised)',
                    border: '1px solid var(--rule)',
                    textDecoration: 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{ background: alpha(meta.color, 9), color: textTone(meta.color) }}
                    >
                      {meta.emoji} {meta.label}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                      <Clock size={11} />
                      {article.readMins} min
                    </span>
                  </div>

                  <h2
                    className="text-sm font-semibold leading-snug mb-2 group-hover:text-note-blue-ink transition-colors"
                    style={{ color: 'var(--ink)' }}
                  >
                    {article.title}
                  </h2>

                  <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--ink-muted)' }}>
                    {article.summary}
                  </p>

                  <div className="flex items-center gap-1 mt-4 text-xs font-semibold" style={{ color: textTone(meta.color) }}>
                    Read article <ChevronRight size={13} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
