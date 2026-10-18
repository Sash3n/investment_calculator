import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { usePrimeRate } from '../hooks/usePrimeRate';
import { NAV_CATEGORIES, NAV_BY_PATH } from '../config/nav';
import { PRESETS, openPresetTarget } from '../config/presets';
import { CPI_REFERENCE, SARB_SOURCE } from '../config/referenceRates';
import { useNavPrefs } from '../hooks/useNavPrefs';
import { alpha, textTone } from '../utils/color';
import {
  Building2,
  MapPin,
  Car,
  TrendingUp,
  ArrowRight,
  Shield,
  Search,
  BarChart3,
  Scale,
  PieChart,
  House,
  Briefcase,
  Wallet,
  Snowflake,
  GraduationCap,
  TrendingDown,
  Activity,
  BedDouble,
  DoorOpen, Receipt,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const featureCards = [
  {
    path: '/mortgage',
    title: 'Mortgage Calculator',
    description: 'Calculate bond repayments, compare bi-weekly and monthly payments, and see how extra payments cut the interest you pay.',
    icon: Building2,
  },
  {
    path: '/property-roi',
    title: 'Property ROI',
    description: 'Analyse a buy-to-let with two rental scenarios, cash flow, yield and 10-year capital growth, then save it to your property portfolio.',
    icon: MapPin,
  },
  {
    path: '/stress-test',
    title: 'Portfolio Stress Test',
    description: 'Run your saved properties through rate hikes, vacancies and value drops. See the rate at which each property turns cash-flow negative.',
    icon: Activity,
  },
  {
    path: '/affordability',
    title: 'Bond Affordability',
    description: 'Find out how much home loan you may qualify for under SA bank rules (30% instalment, NCA debt-to-income), with a rate stress test and the cash you need upfront.',
    icon: Wallet,
  },
  {
    path: '/car-finance',
    title: 'Car Finance',
    description: 'Model SA car finance with a balloon payment, depreciation and the true cost of owning compared with paying cash.',
    icon: Car,
  },
  {
    path: '/extra-vs-investing',
    title: 'Extra Payments vs Investing',
    description: 'Should you pay off your bond faster or invest in JSE ETFs? Compare both with tax taken into account, year by year.',
    icon: TrendingUp,
  },
  {
    path: '/loan-comparison',
    title: 'Loan Comparison',
    description: 'Compare up to three loan offers side by side: total cost including initiation fees, service fees and interest, and the effective rate.',
    icon: Scale,
  },
  {
    path: '/net-worth',
    title: 'Net Worth Dashboard',
    description: 'Track assets (property, TFSA, RA, ETFs, cash, car) against what you owe. Save snapshots to your account to see the trend.',
    icon: PieChart,
  },
  {
    path: '/rental-yield',
    title: 'Rental Yield Finder',
    description: 'Work out gross and net yield, your break-even rent, monthly cash flow and 10-year returns on a SA rental property.',
    icon: House,
  },
  {
    path: '/airbnb-vs-rental',
    title: 'Airbnb vs Long-term Rental',
    description: 'Compare short-term letting with a normal lease on the same property: net income, yield, break-even occupancy and the work each one takes.',
    icon: BedDouble,
  },
  {
    path: '/salary',
    title: 'Salary / Take-Home',
    description: 'PAYE, UIF and the medical aid tax credit on the 2026/27 SARS tables, with earlier years available. See where every rand of your salary goes.',
    icon: Briefcase,
  },
  {
    path: '/budget',
    title: 'Budget Planner',
    description: 'Split your income into needs, wants and savings with the 50/30/20 rule, get suggestions on where to trim, and save monthly snapshots to your account.',
    icon: Wallet,
  },
  {
    path: '/debt-snowball',
    title: 'Debt Snowball / Avalanche',
    description: 'List your debts, choose a payoff order, and see the fastest route to being debt-free: interest saved and the balance month by month.',
    icon: Snowflake,
  },
  {
    path: '/emergency-fund',
    title: 'Emergency Fund Planner',
    description: 'Set a target for your emergency fund, track progress towards it, and choose where to keep it so it stays easy to reach.',
    icon: Shield,
  },
  {
    path: '/exit-planner',
    title: 'Optimal Exit Planner',
    description: 'When should you sell an investment property? Compares CGT, Section 13sex recoupment and your marginal rate across sale years to find the best time to sell.',
    icon: DoorOpen,
  },
  {
    path: '/inflation',
    title: 'Inflation & Purchasing Power',
    description: 'See what your money buys in 10, 20 or 30 years, the real return on an investment, and how much more to save to beat CPI, with the rule of 72.',
    icon: TrendingDown,
  },
  {
    path: '/education-savings',
    title: 'Education Savings',
    description: 'Plan for school or university fees with education inflation, compare a TFSA with a unit trust, and get the monthly amount to save.',
    icon: GraduationCap,
  },
  {
    path: '/dividend-calculator',
    title: 'Dividend Income Calculator',
    description: 'Project dividend income from SA or international shares, with dividends reinvested, yield on cost and SA dividends tax.',
    icon: BarChart3,
  },
  {
    path: '/wealth-target',
    title: 'Wealth Target Planner',
    description: 'How much must you save each month to reach a goal such as R2M? Compare a TFSA, the S&P 500, the JSE or a fixed deposit, with milestones and the cost of waiting.',
    icon: TrendingUp,
  },
  {
    path: '/bond-extra',
    title: 'Bond Extra Payment',
    description: 'See how much interest and time you save by paying extra into your home loan each month.',
    icon: Building2,
  },
  {
    path: '/provisional-tax',
    title: 'Provisional Tax',
    description: 'For freelancers and side incomes: your August and February payments on the 2026/27 tables, what to set aside each month, and the 90% penalty threshold.',
    icon: Receipt,
  },
  {
    path: '/retrenchment',
    title: 'Retrenchment Calculator',
    description: 'Severance pay under the BCEA, the tax on your lump sum using the retirement tax table, and how many months your net payout will last.',
    icon: Briefcase,
  },
  {
    path: '/offshore-allowance',
    title: 'Offshore Allowance Planner',
    description: 'Plan with your single discretionary and foreign investment allowances. Compare offshore returns with the JSE, with rand depreciation over any period.',
    icon: TrendingUp,
  },
  {
    path: '/vat',
    title: 'VAT Calculator',
    description: 'Add or remove 15% VAT, and check whether your turnover means you must register for VAT and when you will reach the threshold.',
    icon: Receipt,
  },
  {
    path: '/municipal-rates',
    title: 'Municipal Rates Calculator',
    description: 'Estimate monthly property rates, water, sewerage and refuse in seven SA metros. Compare cities, apply pensioner rebates and see five years ahead.',
    icon: Building2,
  },
];

/** "2026-10-16" -> "16 Oct 2026" */
function formatAsOf(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Map each card's path to its nav category for grouping and filtering
const CAT_BY_PATH: Record<string, { id: string; label: string }> = {};
NAV_CATEGORIES.forEach((c) => c.items.forEach((i) => { CAT_BY_PATH[i.path] = { id: c.id, label: c.label }; }));

export function Home() {
  const navigate = useNavigate();
  const liveRate = usePrimeRate();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const { recents } = useNavPrefs();
  const recentItems = useMemo(
    () => recents
      .filter((p) => p !== '/')
      .map((p) => NAV_BY_PATH[p])
      .filter(Boolean)
      .slice(0, 3),
    [recents],
  );

  // Categories that actually have dashboard cards
  const presentCats = useMemo(
    () => NAV_CATEGORIES.filter((c) => c.id !== 'overview' && c.id !== 'history' && featureCards.some((fc) => CAT_BY_PATH[fc.path]?.id === c.id)),
    [],
  );

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return featureCards.filter((fc) => {
      if (activeCat !== 'all' && CAT_BY_PATH[fc.path]?.id !== activeCat) return false;
      if (!q) return true;
      return `${fc.title} ${fc.description} ${NAV_BY_PATH[fc.path]?.keywords ?? ''}`.toLowerCase().includes(q);
    });
  }, [query, activeCat]);

  // Cards grouped under their category, in navigation order
  const groups = useMemo(
    () => presentCats
      .map((cat) => ({ cat, cards: filteredCards.filter((fc) => CAT_BY_PATH[fc.path]?.id === cat.id) }))
      .filter((g) => g.cards.length > 0),
    [presentCats, filteredCards],
  );

  const sarbAsOf = liveRate.loading ? null : formatAsOf(liveRate.asOf);
  const referenceRates = [
    {
      label: 'Prime lending rate',
      value: liveRate.loading ? '…' : `${liveRate.primeRate}%`,
      source: 'SARB',
      sourceUrl: SARB_SOURCE.url,
      asAt: sarbAsOf,
    },
    {
      label: 'Repo rate',
      value: liveRate.loading ? '…' : `${liveRate.repoRate}%`,
      source: 'SARB',
      sourceUrl: SARB_SOURCE.url,
      asAt: sarbAsOf,
    },
    {
      label: 'CPI inflation (year on year)',
      value: `${CPI_REFERENCE.value}%`,
      source: CPI_REFERENCE.source.publisher,
      sourceUrl: CPI_REFERENCE.source.url,
      asAt: CPI_REFERENCE.period,
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto px-5 pt-10 pb-16"
    >
      {/* ── Hero section ───────────────────────────────── */}
      <motion.div variants={cardVariants} className="text-center mb-14">
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-[1.1] mb-5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Money calculators for South Africans
        </h1>

        <p
          className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto leading-relaxed mb-8"
          style={{ fontFamily: 'var(--font-text)' }}
        >
          Work out bond repayments, take-home pay, rental returns and tax with South African rates,
          SARS tables and rand amounts.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/mortgage">
            <button className="btn-primary flex items-center gap-2 text-sm">
              <Building2 size={15} />
              Mortgage Calculator
              <ArrowRight size={14} />
            </button>
          </Link>
          <Link to="/extra-vs-investing">
            <button className="btn-ghost flex items-center gap-2 text-sm">
              <TrendingUp size={15} />
              Pay off the bond or invest?
            </button>
          </Link>
        </div>
      </motion.div>

      {/* ── Reference rates ─────────────────────────────── */}
      <motion.section variants={cardVariants} className="mb-14" aria-labelledby="reference-rates">
        <h2
          id="reference-rates"
          className="text-xs font-semibold uppercase tracking-widest text-ink-subtle mb-4 text-center"
          style={{ fontFamily: 'var(--font-text)' }}
        >
          Reference rates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {referenceRates.map((rate) => (
            <div key={rate.label} className="glass-card-static p-4 text-center">
              <p className="text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                {rate.value}
              </p>
              <p className="text-sm text-ink-muted mt-0.5" style={{ fontFamily: 'var(--font-text)' }}>
                {rate.label}
              </p>
              <p className="text-xs text-ink-subtle mt-2" style={{ fontFamily: 'var(--font-text)' }}>
                <a href={rate.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                  {rate.source}
                </a>
                {rate.asAt && <>, as at {rate.asAt}</>}
              </p>
            </div>
          ))}
        </div>
        {liveRate.fallback && !liveRate.loading && (
          <p className="text-xs text-ink-subtle text-center mt-3">
            Live rates could not be loaded, so these are the last confirmed SARB rates.
          </p>
        )}
      </motion.section>

      {/* ── Recently used ───────────────────────────────── */}
      {recentItems.length > 0 && (
        <motion.div variants={cardVariants} className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle mb-3" style={{ fontFamily: 'var(--font-text)' }}>
            Recently used
          </p>
          <div className="flex flex-wrap gap-2">
            {recentItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:border-rule-strong"
                    style={{
                      background: 'var(--paper-raised)',
                      border: '1px solid var(--rule)',
                      color: 'var(--ink)',
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: alpha(item.color, 13) }}
                    >
                      <Icon size={13} style={{ color: textTone(item.color) }} />
                    </span>
                    {item.shortLabel}
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Scenario presets ────────────────────────────── */}
      {PRESETS.length > 0 && (
        <motion.div variants={cardVariants} className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle mb-3" style={{ fontFamily: 'var(--font-text)' }}>
            Scenario presets
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <div key={preset.id} className="glass-card-static p-5">
                  <div className="flex items-start gap-3 mb-2">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: alpha(preset.color, 13) }}
                    >
                      <Icon size={16} style={{ color: textTone(preset.color) }} />
                    </span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                        {preset.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
                        {preset.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {preset.targets.map((target) => (
                      <button
                        key={target.path}
                        onClick={() => openPresetTarget(navigate, target)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:border-rule-strong"
                        style={{
                          background: 'var(--paper-raised)',
                          border: '1px solid var(--rule)',
                          color: 'var(--ink)',
                        }}
                      >
                        {target.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Calculators, grouped by category ────────────── */}
      <div className="mb-12">
        <motion.div variants={cardVariants} className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-subtle mb-3" style={{ fontFamily: 'var(--font-text)' }}>
            All calculators
          </h2>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-subtle)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search calculators…"
              aria-label="Search calculators"
              className="input-dark w-full"
              style={{ fontFamily: 'var(--font-text)', paddingLeft: '34px' }}
            />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {[{ id: 'all', label: 'All', color: 'var(--ink-subtle)' }, ...presentCats].map((c) => {
              const active = activeCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  aria-pressed={active}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: active ? 'var(--paper-sunk)' : 'var(--paper-raised)',
                    color: active ? 'var(--ink)' : 'var(--ink-muted)',
                    border: `1px solid ${active ? 'var(--rule-strong)' : 'var(--rule)'}`,
                    fontFamily: 'var(--font-text)',
                  }}
                >
                  {c.id !== 'all' && <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: c.color }} />}
                  {c.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {groups.length === 0 ? (
          <div className="glass-card-static p-10 text-center">
            <Search size={24} className="mx-auto mb-3" style={{ color: 'var(--ink-subtle)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>No calculators match “{query}”.</p>
          </div>
        ) : (
          groups.map(({ cat, cards }) => (
            <section key={cat.id} className="mb-10" aria-labelledby={`cat-${cat.id}`}>
              <div className="flex items-center gap-3 mb-4">
                <span aria-hidden className="w-1 h-5 rounded-full" style={{ background: cat.color }} />
                <h3 id={`cat-${cat.id}`} className="text-base font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                  {cat.label}
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <motion.div key={card.path} variants={cardVariants}>
                      <Link to={card.path} className="block group h-full">
                        <div className="glass-card p-5 h-full flex flex-col">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-paper-sunk">
                              <Icon size={17} style={{ color: 'var(--ink-muted)' }} />
                            </span>
                            <h4
                              className="text-base font-semibold text-ink group-hover:text-note-blue-ink transition-colors"
                              style={{ fontFamily: 'var(--font-display)' }}
                            >
                              {card.title}
                            </h4>
                          </div>
                          <p
                            className="text-sm text-ink-muted leading-relaxed mb-4 flex-1"
                            style={{ fontFamily: 'var(--font-text)' }}
                          >
                            {card.description}
                          </p>
                          <span
                            className="flex items-center gap-1.5 text-xs font-semibold text-note-blue-ink"
                            style={{ fontFamily: 'var(--font-text)' }}
                          >
                            Open {card.title}
                            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </motion.div>
  );
}
