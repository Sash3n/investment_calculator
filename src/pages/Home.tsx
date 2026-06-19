import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { usePrimeRate } from '../hooks/usePrimeRate';
import { NAV_CATEGORIES, NAV_BY_PATH } from '../config/nav';
import { useNavPrefs } from '../hooks/useNavPrefs';
import {
  Building2,
  MapPin,
  Car,
  TrendingUp,
  ArrowRight,
  Shield,
  Zap,
  Search,
  BarChart3,
  Landmark,
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
    description: 'Calculate bond repayments, compare bi-weekly vs monthly payments, and see how extra payments save thousands in interest.',
    icon: Building2,
    color: '#F59E0B',
    colorDim: 'rgba(245,158,11,0.12)',
    tag: 'Most Popular',
  },
  {
    path: '/property-roi',
    title: 'Property ROI',
    description: 'Analyse buy-to-let investments with two rental scenarios, cash flow projections, yield calculations, and 10-year capital appreciation.',
    icon: MapPin,
    color: '#10B981',
    colorDim: 'rgba(16,185,129,0.12)',
    tag: 'Portfolio Manager',
  },
  {
    path: '/stress-test',
    title: 'Portfolio Stress Test',
    description: 'Run your saved properties through rate hikes, vacancy spikes and value drops. See breaking-point rates and which properties go cash-flow negative — no extra input needed.',
    icon: Activity,
    color: '#EF4444',
    colorDim: 'rgba(239,68,68,0.12)',
    tag: 'Risk Analysis',
  },
  {
    path: '/affordability',
    title: 'Bond Affordability',
    description: 'Find out how much home loan you qualify for using SA bank rules (30% instalment, NCA debt-to-income), with a rate stress test and upfront cash needed.',
    icon: Wallet,
    color: '#6366F1',
    colorDim: 'rgba(99,102,241,0.12)',
    tag: 'Qualify Instantly',
  },
  {
    path: '/car-finance',
    title: 'Car Finance',
    description: 'Model SA car finance with balloon payments, depreciation schedules, and true cost of ownership vs cash purchase analysis.',
    icon: Car,
    color: '#EC4899',
    colorDim: 'rgba(236,72,153,0.12)',
    tag: 'Balloon Support',
  },
  {
    path: '/extra-vs-investing',
    title: 'Extra Payments vs Investing',
    description: 'Should you pay off your bond faster or invest in JSE ETFs? Compare scenarios with tax-adjusted returns and year-by-year breakdowns.',
    icon: TrendingUp,
    color: '#06B6D4',
    colorDim: 'rgba(6,182,212,0.12)',
    tag: 'ETF Comparison',
  },
  {
    path: '/loan-comparison',
    title: 'Loan Comparison Tool',
    description: 'Compare up to 3 loan offers side by side — true total cost including initiation fees, service fees, interest, and effective APR.',
    icon: Scale,
    color: '#F59E0B',
    colorDim: 'rgba(245,158,11,0.12)',
    tag: 'Side-by-Side',
  },
  {
    path: '/net-worth',
    title: 'Net Worth Dashboard',
    description: 'Track assets (property, TFSA, RA, ETF, cash, car) vs liabilities over time. Snapshots saved to your account for trend tracking.',
    icon: PieChart,
    color: '#6366F1',
    colorDim: 'rgba(99,102,241,0.12)',
    tag: 'Firestore Backed',
  },
  {
    path: '/rental-yield',
    title: 'Rental Yield Finder',
    description: 'Calculate gross and net yield, find your breakeven rent, see monthly cash flow, and project 10-year returns on SA rental property.',
    icon: House,
    color: '#10B981',
    colorDim: 'rgba(16,185,129,0.12)',
    tag: 'Cash Flow Analysis',
  },
  {
    path: '/airbnb-vs-rental',
    title: 'Airbnb vs Long-term Rental',
    description: 'Compare short-term letting against a traditional lease on the same property — net income, yield, break-even occupancy, and the costs and effort each strategy demands.',
    icon: BedDouble,
    color: '#EC4899',
    colorDim: 'rgba(236,72,153,0.12)',
    tag: 'Strategy Compare',
  },
  {
    path: '/salary',
    title: 'Salary / Take-Home',
    description: 'Exact SA PAYE, UIF and medical aid tax credit calculation. See where every rand of your gross salary goes — monthly and annually.',
    icon: Briefcase,
    color: '#6366F1',
    colorDim: 'rgba(99,102,241,0.12)',
    tag: 'SARS 2025/26',
  },
  {
    path: '/budget',
    title: 'Budget Planner',
    description: '50/30/20 analysis with AI-style insights. Track needs, wants and savings — with personalised suggestions and Firestore snapshot history.',
    icon: Wallet,
    color: '#10B981',
    colorDim: 'rgba(16,185,129,0.12)',
    tag: 'With Insights',
  },
  {
    path: '/debt-snowball',
    title: 'Debt Snowball / Avalanche',
    description: 'List all your debts, pick a payoff strategy, and see the fastest route to debt freedom — interest saved and month-by-month balance.',
    icon: Snowflake,
    color: '#06B6D4',
    colorDim: 'rgba(6,182,212,0.12)',
    tag: 'Strategy Comparison',
  },
  {
    path: '/emergency-fund',
    title: 'Emergency Fund Planner',
    description: 'Calculate your target fund, track your build-up progress, and find the right vehicle to keep it accessible and growing.',
    icon: Shield,
    color: '#10B981',
    colorDim: 'rgba(16,185,129,0.12)',
    tag: 'Safety Net',
  },
  {
    path: '/exit-planner',
    title: 'Optimal Exit Planner',
    description: 'When should you sell an investment property? Models CGT, Section 13sex recoupment and your marginal rate across sale years to reveal the recoupment trap and the best exit.',
    icon: DoorOpen,
    color: '#8B5CF6',
    colorDim: 'rgba(139,92,246,0.12)',
    tag: 'Tax-Smart Exit',
  },
  {
    path: '/inflation',
    title: 'Inflation & Purchasing Power',
    description: 'See what your money really buys in 10, 20, 30 years. Find the real return on investments and how much more you need to save to beat CPI.',
    icon: TrendingDown,
    color: '#EF4444',
    colorDim: 'rgba(239,68,68,0.12)',
    tag: 'Rule of 72',
  },
  {
    path: '/education-savings',
    title: 'Education Savings',
    description: 'Plan for SA school or university costs with education inflation, TFSA vs unit trust comparison, and required monthly savings calculation.',
    icon: GraduationCap,
    color: '#8B5CF6',
    colorDim: 'rgba(139,92,246,0.12)',
    tag: 'Inflation-Adjusted',
  },
  {
    path: '/dividend-calculator',
    title: 'Dividend Income Calculator',
    description: 'Project dividend income from SA or international stocks with DRIP compounding, yield on cost growth, and SA Dividends Tax (20%) applied.',
    icon: BarChart3,
    color: '#10B981',
    colorDim: 'rgba(16,185,129,0.12)',
    tag: 'DRIP + Tax',
  },
  {
    path: '/wealth-target',
    title: 'Wealth Target Planner',
    description: 'How much do you need to save monthly to reach R2M? Reverse-calculate from any goal — choose TFSA, S&P 500, JSE or fixed deposit, see milestones and the cost of waiting.',
    icon: TrendingUp,
    color: '#6366F1',
    colorDim: 'rgba(99,102,241,0.12)',
    tag: 'Goal Calculator',
  },
  {
    path: '/bond-extra',
    title: 'Bond Extra Payment',
    description: 'See exactly how much interest and time you save by paying extra on your home loan. Enter any extra monthly amount and watch years melt off your bond.',
    icon: Building2,
    color: '#10B981',
    colorDim: 'rgba(16,185,129,0.12)',
    tag: 'Interest Saver',
  },
  {
    path: '/provisional-tax',
    title: 'Provisional Tax',
    description: 'Freelancers and side hustlers: calculate your August and February provisional tax payments, how much to set aside monthly, and your 90% penalty threshold.',
    icon: Receipt,
    color: '#F59E0B',
    colorDim: 'rgba(245,158,11,0.12)',
    tag: '2025/26',
  },
  {
    path: '/retrenchment',
    title: 'Retrenchment Calculator',
    description: 'Calculate your severance pay (BCEA), the tax on your lump sum using the retirement tax table, and how many months your net payout will last.',
    icon: Briefcase,
    color: '#8B5CF6',
    colorDim: 'rgba(139,92,246,0.12)',
    tag: 'BCEA + Tax',
  },
  {
    path: '/offshore-allowance',
    title: 'Offshore Allowance Planner',
    description: 'Model your R1M Single Discretionary Allowance — compare offshore USD returns vs local JSE returns with ZAR depreciation factored in over any time horizon.',
    icon: TrendingUp,
    color: '#06B6D4',
    colorDim: 'rgba(6,182,212,0.12)',
    tag: 'SDA + FIA',
  },
  {
    path: '/vat',
    title: 'VAT Calculator',
    description: 'Add or extract 15% VAT instantly. Check whether your turnover triggers mandatory registration and how many months until you hit the R1M threshold.',
    icon: Receipt,
    color: '#F59E0B',
    colorDim: 'rgba(245,158,11,0.12)',
    tag: '15% VAT',
  },
  {
    path: '/municipal-rates',
    title: 'Municipal Rates Calculator',
    description: 'Estimate your monthly property rates, water, sewerage and refuse across 7 SA municipalities. Compare cities, model pensioner rebates, and see a 5-year cost projection.',
    icon: Building2,
    color: '#10B981',
    colorDim: 'rgba(16,185,129,0.12)',
    tag: '7 Metros',
  },
];

const quickStats = [
  { label: 'SA Prime Rate', value: null, icon: Landmark, color: '#F59E0B' },
  { label: 'Avg Property Appreciation', value: '7% p.a.', icon: TrendingUp, color: '#10B981' },
  { label: 'Typical Bond Term', value: '20 years', icon: Building2, color: '#6366F1' },
  { label: 'Avg JSE ETF Return', value: '13–18% p.a.', icon: BarChart3, color: '#06B6D4' },
];

// Map each card's path to its nav category for chip filtering
const CAT_BY_PATH: Record<string, { id: string; label: string }> = {};
NAV_CATEGORIES.forEach((c) => c.items.forEach((i) => { CAT_BY_PATH[i.path] = { id: c.id, label: c.label }; }));

export function Home() {
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
      return `${fc.title} ${fc.description} ${fc.tag}`.toLowerCase().includes(q);
    });
  }, [query, activeCat]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto px-5 pt-10 pb-16"
    >
      {/* ── Hero section ───────────────────────────────── */}
      <motion.div variants={cardVariants} className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.08)] mb-6">
          <Zap size={12} className="text-[#6366F1]" />
          <span className="text-xs font-semibold text-[#6366F1]" style={{ fontFamily: 'var(--font-body)' }}>
            Built for South African Investors
          </span>
        </div>

        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#F1F5F9] leading-[1.1] mb-5"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Smart Investment Tools{' '}
          <span className="text-gradient-indigo">for South Africans</span>
        </h1>

        <p
          className="text-base sm:text-lg text-[#94A3B8] max-w-2xl mx-auto leading-relaxed mb-8"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Make informed financial decisions with calculators built specifically for the SA market —
          ZAR currency, SA prime rate, JSE ETFs, and local tax considerations.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/mortgage">
            <button className="btn-primary flex items-center gap-2 text-sm">
              <Building2 size={15} />
              Try Mortgage Calculator
              <ArrowRight size={14} />
            </button>
          </Link>
          <Link to="/extra-vs-investing">
            <button className="btn-ghost flex items-center gap-2 text-sm">
              <TrendingUp size={15} />
              Compare Bond vs ETF
            </button>
          </Link>
        </div>
      </motion.div>

      {/* ── Quick stats ─────────────────────────────────── */}
      <motion.div variants={cardVariants} className="mb-14">
        <p
          className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-4 text-center"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          SA Market Reference Rates
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-card-static p-4 text-center">
                <div
                  className="w-8 h-8 rounded-lg mx-auto mb-3 flex items-center justify-center"
                  style={{ background: `${stat.color}20` }}
                >
                  <Icon size={16} style={{ color: stat.color }} />
                </div>
                <p
                  className="text-lg font-bold text-[#F1F5F9]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {stat.label === 'SA Prime Rate'
                    ? liveRate.loading ? '…' : `${liveRate.primeRate}%`
                    : stat.value}
                </p>
                <p
                  className="text-[11px] text-[#64748B] mt-0.5"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Recently used ───────────────────────────────── */}
      {recentItems.length > 0 && (
        <motion.div variants={cardVariants} className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Recently Used
          </p>
          <div className="flex flex-wrap gap-2">
            {recentItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}22` }}
                    >
                      <Icon size={13} style={{ color: item.color }} />
                    </span>
                    {item.shortLabel}
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Feature cards ───────────────────────────────── */}
      <div className="mb-12">
        <motion.div variants={cardVariants} className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Available Calculators
          </p>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search calculators…"
              className="input-dark w-full"
              style={{ fontFamily: 'var(--font-body)', paddingLeft: '34px' }}
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {[{ id: 'all', label: 'All' }, ...presentCats].map((c) => {
              const active = activeCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: active ? 'rgba(99,102,241,0.2)' : 'var(--color-surface)',
                    color: active ? '#818CF8' : 'var(--color-text-muted)',
                    border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'var(--color-border)'}`,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {filteredCards.length === 0 ? (
          <div className="glass-card-static p-10 text-center">
            <Search size={24} className="mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No calculators match “{query}”.</p>
          </div>
        ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {filteredCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.path} variants={cardVariants}>
                <Link to={card.path} className="block group">
                  <div className="glass-card p-6 h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: card.colorDim }}
                      >
                        <Icon size={20} style={{ color: card.color }} />
                      </div>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={{
                          background: `${card.color}18`,
                          color: card.color,
                          border: `1px solid ${card.color}30`,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {card.tag}
                      </span>
                    </div>

                    <h3
                      className="text-lg font-bold text-[#F1F5F9] mb-2 group-hover:text-white transition-colors"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {card.title}
                    </h3>
                    <p
                      className="text-sm text-[#94A3B8] leading-relaxed mb-5"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {card.description}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-semibold transition-colors"
                        style={{ color: card.color, fontFamily: 'var(--font-body)' }}
                      >
                        Open Calculator
                      </span>
                      <ArrowRight
                        size={13}
                        style={{ color: card.color }}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
        )}
      </div>

      {/* ── Features strip ──────────────────────────────── */}
      <motion.div
        variants={cardVariants}
        className="glass-card-static p-6 grid sm:grid-cols-3 gap-6"
      >
        {[
          {
            icon: Shield,
            title: 'Mathematically Accurate',
            desc: 'Standard annuity formulas with proper amortization, exact interest calculations, and SA tax rules.',
            color: '#6366F1',
          },
          {
            icon: BarChart3,
            title: 'Visual Insights',
            desc: 'Interactive Recharts graphs for balance over time, cost breakdowns, and scenario comparisons.',
            color: '#10B981',
          },
          {
            icon: Zap,
            title: 'Real-time Calculation',
            desc: 'Every input change immediately recalculates and updates all charts, tables, and summary cards.',
            color: '#F59E0B',
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="flex gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${f.color}18` }}
              >
                <Icon size={16} style={{ color: f.color }} />
              </div>
              <div>
                <p
                  className="text-sm font-semibold text-[#F1F5F9] mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {f.title}
                </p>
                <p
                  className="text-xs text-[#64748B] leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
