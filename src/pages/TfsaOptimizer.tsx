import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Landmark, Shield, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { formatRand, formatRandShort } from '../utils/format';
import { calcIncomeTax } from '../utils/tax';
import type { AgeGroup } from '../types';

// ── TFSA 2026 Rules ───────────────────────────────────────────────────────────
const ANNUAL_LIMIT    = 36_000;
const LIFETIME_LIMIT  = 500_000;
const DIV_WHT         = 0.20;   // dividend withholding tax
const CGT_INCLUSION   = 0.40;
const CGT_EXCLUSION   = 50_000;

// Interest exemptions (SARS 2026)
const INTEREST_EXEMPTION: Record<AgeGroup, number> = {
  under65: 23_800,
  '65to74': 34_500,
  '75plus': 34_500,
};

const AGE_OPTIONS = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74',  label: '65 – 74 years' },
  { value: '75plus',  label: '75 years and older' },
];

const RETURN_TYPE_OPTIONS = [
  { value: 'etf',      label: 'JSE ETF (growth + dividends)' },
  { value: 'balanced', label: 'Balanced fund' },
  { value: 'cash',     label: 'Money market / cash' },
];

// Dividend yield split by return type (as % of total return that is dividend/interest income)
const INCOME_YIELD_SPLIT: Record<string, number> = {
  etf:      3.0,   // ~3% dividend yield typical for JSE All Share ETF
  balanced: 4.0,   // balanced funds distribute more income
  cash:     100,   // money market = all interest (use total return as interest rate)
};

const C = {
  indigo:  '#6366F1',
  amber:   '#F59E0B',
  emerald: '#10B981',
  red:     '#EF4444',
  cyan:    '#06B6D4',
  violet:  '#8B5CF6',
};

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Inputs {
  currentAge:               number;
  annualContribution:       number;
  existingBalance:          number;
  existingLifetimeUsed:     number;
  expectedReturnPercent:    number;
  returnType:               string;
  otherAnnualIncome:        number;
  ageGroup:                 AgeGroup;
  projectionYears:          number;
}

interface YearRow {
  year:                number;
  age:                 number;
  contribution:        number;
  lifetimeUsed:        number;
  lifetimeRemaining:   number;
  tfsaBalance:         number;
  taxableBalance:      number;
  taxableAnnualTax:    number;
  annualTaxSaving:     number;
  cumulativeTaxSaved:  number;
  tfsaGrowth:          number;
  taxableGrowth:       number;
}

// ── Simulation ────────────────────────────────────────────────────────────────
function simulate(inp: Inputs): YearRow[] {
  const rows: YearRow[] = [];

  const r         = inp.expectedReturnPercent / 100;
  const divYield  = Math.min(INCOME_YIELD_SPLIT[inp.returnType] ?? 3, inp.expectedReturnPercent) / 100;
  const growthR   = r - divYield;      // capital growth portion (tax-deferred for CGT)
  let tfsaBalance    = inp.existingBalance;
  let taxableBalance = inp.existingBalance;  // same starting point for comparison
  let lifetimeUsed   = inp.existingLifetimeUsed;
  let cumulativeTax  = 0;
  let taxableContrib = 0; // track total contributions to taxable account

  for (let year = 1; year <= inp.projectionYears; year++) {
    const age = inp.currentAge + year;

    // ── TFSA ──────────────────────────────────────────────────────────────
    const remainingLifetime  = Math.max(0, LIFETIME_LIMIT - lifetimeUsed);
    const allowedContrib     = Math.min(inp.annualContribution, ANNUAL_LIMIT, remainingLifetime);
    const prevTfsa           = tfsaBalance;

    tfsaBalance  = (tfsaBalance + allowedContrib) * (1 + r);
    lifetimeUsed = Math.min(LIFETIME_LIMIT, lifetimeUsed + allowedContrib);

    const tfsaGrowth = tfsaBalance - prevTfsa - allowedContrib;

    // ── Taxable equivalent ────────────────────────────────────────────────
    // Same contribution goes into a taxable account each year
    const prevTaxable = taxableBalance;
    taxableBalance   += allowedContrib;
    taxableContrib   += allowedContrib;

    // Dividend / interest tax applied annually
    const dividendIncome = taxableBalance * divYield;
    let   annualTax      = 0;

    if (inp.returnType === 'cash') {
      // All interest: subject to income tax after exemption
      const exemption   = INTEREST_EXEMPTION[inp.ageGroup];
      const taxableInterest = Math.max(0, dividendIncome - exemption);
      const taxWith    = calcIncomeTax(inp.otherAnnualIncome + taxableInterest, inp.ageGroup);
      const taxWithout = calcIncomeTax(inp.otherAnnualIncome, inp.ageGroup);
      annualTax        = Math.max(0, taxWith - taxWithout);
    } else {
      // Dividends: 20% withholding tax (final, no further income tax)
      annualTax = dividendIncome * DIV_WHT;
    }

    // Apply growth after tax drag
    taxableBalance = taxableBalance * (1 + growthR) + dividendIncome - annualTax;

    const taxableGrowth = taxableBalance - prevTaxable - allowedContrib;
    cumulativeTax      += annualTax;

    rows.push({
      year,
      age,
      contribution:      allowedContrib,
      lifetimeUsed,
      lifetimeRemaining: Math.max(0, LIFETIME_LIMIT - lifetimeUsed),
      tfsaBalance,
      taxableBalance,
      taxableAnnualTax:  annualTax,
      annualTaxSaving:   Math.max(0, tfsaGrowth - taxableGrowth),
      cumulativeTaxSaved: 0, // filled below
      tfsaGrowth,
      taxableGrowth,
    });
  }

  // CGT on taxable account at exit
  const lastTaxable   = rows[rows.length - 1];
  if (lastTaxable) {
    const capitalGain   = Math.max(0, lastTaxable.taxableBalance - taxableContrib - inp.existingBalance);
    const netGain       = Math.max(0, capitalGain - CGT_EXCLUSION);
    const inclusion     = netGain * CGT_INCLUSION;
    const taxWith       = calcIncomeTax(inp.otherAnnualIncome + inclusion, inp.ageGroup);
    const taxWithout    = calcIncomeTax(inp.otherAnnualIncome, inp.ageGroup);
    const cgt           = Math.max(0, taxWith - taxWithout);
    lastTaxable.taxableBalance -= cgt; // net after CGT at exit
  }

  // Fill cumulative tax saved (TFSA balance - taxable balance difference grows each year)
  let cumSaved = 0;
  for (const row of rows) {
    cumSaved += row.taxableAnnualTax;
    row.cumulativeTaxSaved = cumSaved;
  }

  return rows;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function TfsaOptimizer() {
  const [inp, setInp] = useState<Inputs>({
    currentAge:            30,
    annualContribution:    36_000,
    existingBalance:       0,
    existingLifetimeUsed:  0,
    expectedReturnPercent: 11,
    returnType:            'etf',
    otherAnnualIncome:     480_000,
    ageGroup:              'under65',
    projectionYears:       20,
  });

  const n = (fn: (v: number) => Partial<Inputs>) => (val: string) =>
    setInp((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const rows = useMemo(() => simulate(inp), [inp]);
  const last = rows[rows.length - 1];

  // Over-contribution warning
  const overContrib = inp.annualContribution > ANNUAL_LIMIT;
  const remainingLifetime = Math.max(0, LIFETIME_LIMIT - inp.existingLifetimeUsed);
  const yearsToLimit = remainingLifetime > 0
    ? Math.ceil(remainingLifetime / Math.min(inp.annualContribution, ANNUAL_LIMIT))
    : 0;

  const lifetimePct = Math.min(100, (inp.existingLifetimeUsed / LIFETIME_LIMIT) * 100);

  const totalTaxSaved = last?.cumulativeTaxSaved ?? 0;
  const tfsaFinal     = last?.tfsaBalance        ?? 0;
  const taxableFinal  = last?.taxableBalance      ?? 0;
  const extraWealth   = tfsaFinal - taxableFinal;

  // Chart data
  const growthChart = rows.map((r) => ({
    label: `Y${r.year}`,
    tfsa:     Math.round(r.tfsaBalance),
    taxable:  Math.round(r.taxableBalance),
  }));

  const taxDragChart = rows.map((r) => ({
    label: `Y${r.year}`,
    taxDrag: Math.round(r.taxableAnnualTax),
  }));

  const YEAR_OPTIONS = [5, 10, 15, 20, 25, 30].map((y) => ({ value: String(y), label: `${y} years` }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <Landmark size={20} className="text-[#6366F1]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              TFSA Optimizer
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Tax-Free Savings Account · R36,000/year · R500,000 lifetime · SARS 2026
            </p>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold hidden sm:inline-block"
            style={{ background: 'rgba(16,185,129,0.12)', color: C.emerald, border: `1px solid ${C.emerald}44` }}
          >
            Zero tax on growth
          </span>
        </div>
      </motion.div>

      {/* Allowance tracker */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card-static p-5"
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Lifetime Allowance Tracker
          </p>
          <span className="text-xs font-semibold" style={{ color: C.amber }}>
            {formatRand(inp.existingLifetimeUsed, 0)} used of {formatRand(LIFETIME_LIMIT, 0)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 rounded-full overflow-hidden mb-3"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: `linear-gradient(90deg, ${C.indigo} 0%, ${C.cyan} 100%)` }}
            initial={{ width: 0 }}
            animate={{ width: `${lifetimePct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p style={{ color: 'var(--color-text-subtle)' }}>Remaining allowance</p>
            <p className="font-bold mt-0.5" style={{ color: C.emerald }}>
              {formatRand(remainingLifetime, 0)}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-subtle)' }}>Annual limit</p>
            <p className="font-bold mt-0.5" style={{ color: C.indigo }}>
              R 36,000 / year
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-subtle)' }}>Years to lifetime limit</p>
            <p className="font-bold mt-0.5" style={{ color: C.amber }}>
              {remainingLifetime <= 0 ? 'Maxed out' : `~${yearsToLimit} year${yearsToLimit !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-subtle)' }}>% of lifetime used</p>
            <p className="font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>
              {lifetimePct.toFixed(1)}%
            </p>
          </div>
        </div>
      </motion.div>

      {/* Over-contribution warning */}
      {overContrib && (
        <div
          className="flex items-start gap-3 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertTriangle size={14} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
          <span style={{ color: '#FCA5A5' }}>
            Your annual contribution exceeds the R36,000 SARS limit. Excess contributions are penalised at
            <strong> 40%</strong>. The calculator caps contributions at R36,000/year. Do not over-contribute.
          </span>
        </div>
      )}

      {/* Info banner */}
      <div
        className="flex items-start gap-3 p-3 rounded-xl text-xs"
        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}
      >
        <Info size={14} className="text-[#6366F1] mt-0.5 flex-shrink-0" />
        <span style={{ color: 'var(--color-text-muted)' }}>
          <strong style={{ color: 'var(--color-text)' }}>How the comparison works:</strong> Both TFSA and Taxable
          start with the same balance and receive the same annual contributions. TFSA grows completely tax-free.
          Taxable applies 20% dividend withholding tax (or income tax on interest for cash) annually, plus CGT
          on disposal at the end of the period.
        </span>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left: TFSA details */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Shield size={15} className="text-[#6366F1]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              TFSA Details
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="currentAge" label="Current Age" value={inp.currentAge}
              onChange={n((v) => ({ currentAge: v }))} suffix="yrs" />
            <InputField id="annualContrib" label="Annual Contribution" value={inp.annualContribution}
              onChange={n((v) => ({ annualContribution: v }))} prefix="R"
              help="Max R36,000/year" />
            <InputField id="existingBalance" label="Existing TFSA Balance" value={inp.existingBalance}
              onChange={n((v) => ({ existingBalance: v }))} prefix="R" />
            <InputField id="lifetimeUsed" label="Lifetime Contributions Used" value={inp.existingLifetimeUsed}
              onChange={n((v) => ({ existingLifetimeUsed: v }))} prefix="R"
              help="How much you've contributed to date" />
          </div>
        </div>

        {/* Right: Investment & Income */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <TrendingUp size={15} className="text-[#10B981]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Investment &amp; Income
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="expectedReturn" label="Expected Annual Return" value={inp.expectedReturnPercent}
              onChange={n((v) => ({ expectedReturnPercent: v }))} suffix="% p.a." step={0.5} />
            <InputField id="otherIncome" label="Other Annual Income" value={inp.otherAnnualIncome}
              onChange={n((v) => ({ otherAnnualIncome: v }))} prefix="R"
              help="Sets your marginal tax rate" />
          </div>
          <SelectField id="returnType" label="Investment Type" value={inp.returnType}
            onChange={(v) => setInp((p) => ({ ...p, returnType: v }))}
            options={RETURN_TYPE_OPTIONS} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField id="ageGroup" label="Age Group" value={inp.ageGroup}
              onChange={(v) => setInp((p) => ({ ...p, ageGroup: v as AgeGroup }))}
              options={AGE_OPTIONS} />
            <SelectField id="projYears" label="Projection Period" value={String(inp.projectionYears)}
              onChange={(v) => setInp((p) => ({ ...p, projectionYears: parseInt(v) }))}
              options={YEAR_OPTIONS} />
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="TFSA Final Balance"
          value={formatRand(tfsaFinal, 0)}
          sub={`After ${inp.projectionYears} years`}
          color="emerald"
          delay={0}
        />
        <StatCard
          label="Taxable Equivalent"
          value={formatRand(taxableFinal, 0)}
          sub="Same contributions, after tax"
          color="indigo"
          delay={0.05}
        />
        <StatCard
          label="Extra Wealth (TFSA)"
          value={formatRand(extraWealth, 0)}
          sub="Tax-free advantage"
          color={extraWealth >= 0 ? 'emerald' : 'red'}
          delay={0.1}
        />
        <StatCard
          label="Tax Drag Avoided"
          value={formatRand(totalTaxSaved, 0)}
          sub="Annual taxes not paid"
          color="amber"
          delay={0.15}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* TFSA vs Taxable growth */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            TFSA vs Taxable Growth
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Both start with same balance and same contributions — difference is tax
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTfsa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.emerald} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.emerald} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradTax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.indigo} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip
                formatter={(v, name) => [formatRand(Number(v), 0), name === 'tfsa' ? 'TFSA' : 'Taxable (after CGT)']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Area type="monotone" dataKey="tfsa"    name="TFSA"
                stroke={C.emerald} fill="url(#gradTfsa)" strokeWidth={2} />
              <Area type="monotone" dataKey="taxable" name="Taxable"
                stroke={C.indigo}  fill="url(#gradTax)"  strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Annual tax drag */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Annual Tax Drag (Avoided in TFSA)
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Tax that would be paid on the same investment outside a TFSA each year
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={taxDragChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip
                formatter={(v) => [formatRand(Number(v), 0), 'Tax Avoided']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="taxDrag" name="Tax Avoided" fill={C.amber} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-year table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Year-by-Year Projection
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  'Year', 'Age', 'Contribution', 'Lifetime Used',
                  'TFSA Balance', 'Taxable Balance', 'Annual Tax Avoided', 'Cumulative Tax Saved',
                ].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const limitReached = r.lifetimeRemaining <= 0;
                return (
                  <tr key={r.year} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: limitReached
                      ? 'rgba(245,158,11,0.04)'
                      : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    <td className="py-2 px-3 font-bold" style={{ color: '#818CF8' }}>Y{r.year}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--color-text-muted)' }}>{r.age}</td>
                    <td className="py-2 px-3" style={{ color: C.indigo }}>
                      {r.contribution > 0 ? formatRand(r.contribution, 0) : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span style={{ color: r.lifetimeRemaining <= 0 ? C.amber : 'var(--color-text-muted)' }}>
                        {formatRand(r.lifetimeUsed, 0)}
                        {limitReached && <span className="ml-1 text-[10px]">★ maxed</span>}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: C.emerald }}>
                      {formatRand(r.tfsaBalance, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>
                      {formatRand(r.taxableBalance, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: C.amber }}>
                      {formatRand(r.taxableAnnualTax, 0)}
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: C.emerald }}>
                      {formatRand(r.cumulativeTaxSaved, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <td colSpan={4} className="py-2 px-3 text-xs font-semibold"
                  style={{ color: 'var(--color-text-muted)' }}>Totals</td>
                <td className="py-2 px-3 font-bold" style={{ color: C.emerald }}>
                  {formatRand(tfsaFinal, 0)}
                </td>
                <td className="py-2 px-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                  {formatRand(taxableFinal, 0)}
                </td>
                <td className="py-2 px-3 font-bold" style={{ color: C.amber }}>
                  {formatRand(totalTaxSaved, 0)}
                </td>
                <td className="py-2 px-3 font-bold" style={{ color: C.emerald }}>
                  +{formatRand(extraWealth, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Key rules callout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            title: 'Annual Limit',
            body: 'R36,000 per tax year (1 March – 28 February). Excess is penalised at 40% by SARS. Does not roll over.',
            color: C.indigo,
          },
          {
            title: 'Lifetime Limit',
            body: 'R500,000 total contributions. Withdrawals do NOT restore your lifetime allowance — withdrawn funds cannot be re-contributed.',
            color: C.amber,
          },
          {
            title: 'Zero Tax',
            body: 'No tax on interest, dividends, or capital gains inside a TFSA. No need to declare on your tax return.',
            color: C.emerald,
          },
        ].map((card) => (
          <div key={card.title}
            className="rounded-xl p-4"
            style={{ background: `${card.color}10`, border: `1px solid ${card.color}30` }}>
            <p className="text-xs font-bold mb-1" style={{ color: card.color }}>{card.title}</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {card.body}
            </p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Projections are illustrative only. TFSA rules per SARS 2026. Not financial advice — consult a CFP or tax practitioner.
      </p>
    </div>
  );
}
