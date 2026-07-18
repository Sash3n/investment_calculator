import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, ArrowRight, Info } from 'lucide-react';
import {
  SARS_CODES, CATEGORY_LABELS, searchSarsCodes,
  type SarsCode, type SarsCodeCategory,
} from '../data/sarsCodes';

const C = { indigo: '#6366F1', amber: '#F59E0B', emerald: '#10B981', red: '#EF4444' };

const FIELD_LABELS: Record<string, string> = {
  annualSalary:        'Employment income',
  travelAllowance:     'Travel allowance',
  otherIncome:         'Other income',
  raContributions:     'Retirement contributions',
  medAidContributions: 'Medical contributions',
  donations:           'Donations (S18A)',
  payeWithheld:        'Tax already paid',
  interestIncome:      'Local interest',
};

const CATEGORY_ORDER: SarsCodeCategory[] = [
  'income', 'allowance', 'fringe', 'lumpsum', 'deduction', 'employer', 'tax-paid', 'investment',
];

function CodeCard({ c }: { c: SarsCode }) {
  return (
    <div className="glass-card p-4 space-y-1.5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold px-2.5 py-1 rounded-lg font-mono"
          style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid ${C.indigo}33` }}>
          {c.code}
        </span>
        <p className="flex-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.label}</p>
        <span className="text-[10px] uppercase tracking-wider hidden sm:block" style={{ color: 'var(--color-text-subtle)' }}>
          {CATEGORY_LABELS[c.category]}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{c.description}</p>
      {c.mapsTo ? (
        <p className="text-[11px] flex items-center gap-1.5" style={{ color: C.emerald }}>
          <ArrowRight size={11} /> Counts toward “{FIELD_LABELS[c.mapsTo] ?? c.mapsTo}” in the SARS Assessment Estimator
        </p>
      ) : (
        <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--color-text-subtle)' }}>
          <Info size={11} /> Informational — not added to the estimate
        </p>
      )}
    </div>
  );
}

export function SarsCodeLookup() {
  const [query, setQuery]       = useState('');
  const [category, setCategory] = useState<SarsCodeCategory | 'all'>('all');

  const results = useMemo(() => {
    const base = query.trim() ? searchSarsCodes(query, 50) : SARS_CODES;
    return category === 'all' ? base : base.filter((c) => c.category === category);
  }, [query, category]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          SARS Source Code Lookup
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
          Every code on your IRP5 / IT3 explained, and how the{' '}
          <Link to="/tax-assessment" className="underline" style={{ color: C.indigo }}>Assessment Estimator</Link> uses it
        </p>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code (e.g. 3601) or name (e.g. bonus, travel, PAYE)…"
          className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-body)',
          }}
          aria-label="Search SARS codes"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCategory('all')}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            background: category === 'all' ? 'rgba(99,102,241,0.18)' : 'transparent',
            color: category === 'all' ? C.indigo : 'var(--color-text-muted)',
            border: `1px solid ${category === 'all' ? `${C.indigo}55` : 'var(--color-border)'}`,
          }}>
          All ({SARS_CODES.length})
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button key={cat} onClick={() => setCategory(category === cat ? 'all' : cat)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: category === cat ? 'rgba(99,102,241,0.18)' : 'transparent',
              color: category === cat ? C.indigo : 'var(--color-text-muted)',
              border: `1px solid ${category === cat ? `${C.indigo}55` : 'var(--color-border)'}`,
            }}>
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={28} className="mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No codes match “{query}”. Try the code number or a keyword like “bonus” or “medical”.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((c) => <CodeCard key={c.code} c={c} />)}
        </div>
      )}

      <div className="flex items-start gap-3 p-4 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} />
        <span style={{ color: 'var(--color-text-muted)' }}>
          Codes per the SARS Guide for Codes Applicable to Employees Tax Certificates (PAYE-AE-06-G06).
          Common codes only — the full guide contains additional codes for special cases. Not tax advice.
        </span>
      </div>
    </div>
  );
}
