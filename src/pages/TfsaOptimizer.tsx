import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Landmark, Shield, TrendingUp } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { formatRand, formatRandShort } from '../utils/format';
import { calcIncomeTax } from '../utils/tax';
import type { AgeGroup } from '../types';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, rangeError } from '../utils/validation';

// ── TFSA 2026 Rules ───────────────────────────────────────────────────────────
const ANNUAL_LIMIT    = 46_000; // SARS 2026/27 budget — increased from R36,000
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
  blue:  'var(--note-blue)',
  orange:   'var(--note-orange)',
  green: 'var(--gain)',
  red:     'var(--loss)',
  teal:    'var(--note-teal)',
  brown:  'var(--note-brown)',
};

const TOOLTIP_STYLE = {
  background:   'color-mix(in srgb, var(--paper-raised) 95%, transparent)',
  border:       '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
  borderRadius: 10,
  fontSize:     12,
  color:        'var(--ink)',
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
  let taxableContrib = 0; // base cost: contributions plus dividends reinvested after tax

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
    // Dividends reinvested after tax are bought shares, so they add to the base cost
    taxableContrib += dividendIncome - annualTax;

    const taxableGrowth = taxableBalance - prevTaxable - allowedContrib;

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
    annualContribution:    46_000,
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

  const errors = {
    currentAge: rangeError(inp.currentAge, 0, 100, 'an age', ''),
    annualContribution: inp.annualContribution < 0
      ? 'Enter zero or more.'
      : overContrib ? `The yearly limit is ${formatRand(ANNUAL_LIMIT, 0)}. Anything above it is taxed at 40%, so only the limit is counted.` : undefined,
    existingBalance: nonNegativeError(inp.existingBalance),
    existingLifetimeUsed: rangeError(inp.existingLifetimeUsed, 0, LIFETIME_LIMIT, 'an amount', ` (the lifetime limit is ${formatRand(LIFETIME_LIMIT, 0)})`),
    expectedReturnPercent: rangeError(inp.expectedReturnPercent, -20, 30, 'a return', '%'),
    otherAnnualIncome: nonNegativeError(inp.otherAnnualIncome),
  };
  const blocked = errors.currentAge ?? (inp.annualContribution < 0 ? errors.annualContribution : undefined)
    ?? errors.existingBalance ?? errors.existingLifetimeUsed ?? errors.expectedReturnPercent ?? errors.otherAnnualIncome;

  const YEAR_OPTIONS = [5, 10, 15, 20, 25, 30].map((y) => ({ value: String(y), label: `${y} years` }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)' }}
          >
            <Landmark size={20} className="text-note-blue-ink" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              TFSA Optimizer
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              Tax-Free Savings Account · R46,000/year · R500,000 lifetime · SARS 2026/27
            </p>
          </div>
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
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Lifetime Allowance Tracker
          </p>
          <span className="text-xs font-semibold" style={{ color: textTone(C.orange) }}>
            {formatRand(inp.existingLifetimeUsed, 0)} used of {formatRand(LIFETIME_LIMIT, 0)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 rounded-full overflow-hidden mb-3"
          style={{ background: 'color-mix(in srgb, var(--ink) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 8%, transparent)' }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: `linear-gradient(90deg, ${C.blue} 0%, ${C.teal} 100%)` }}
            initial={{ width: 0 }}
            animate={{ width: `${lifetimePct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p style={{ color: 'var(--ink-subtle)' }}>Remaining allowance</p>
            <p className="font-bold mt-0.5" style={{ color: textTone(C.green) }}>
              {formatRand(remainingLifetime, 0)}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--ink-subtle)' }}>Annual limit</p>
            <p className="font-bold mt-0.5" style={{ color: textTone(C.blue) }}>
              R 46,000 / year
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--ink-subtle)' }}>Years to lifetime limit</p>
            <p className="font-bold mt-0.5" style={{ color: textTone(C.orange) }}>
              {remainingLifetime <= 0 ? 'Maxed out' : `~${yearsToLimit} year${yearsToLimit !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--ink-subtle)' }}>% of lifetime used</p>
            <p className="font-bold mt-0.5" style={{ color: 'var(--ink)' }}>
              {lifetimePct.toFixed(1)}%
            </p>
          </div>
        </div>
      </motion.div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left: TFSA details */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)' }}>
              <Shield size={15} className="text-note-blue-ink" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              TFSA Details
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="currentAge" label="Current Age" value={inp.currentAge} error={errors.currentAge}
              onChange={n((v) => ({ currentAge: v }))} suffix="yrs" />
            <InputField id="annualContrib" label="Annual Contribution" value={inp.annualContribution} error={errors.annualContribution}
              onChange={n((v) => ({ annualContribution: v }))} prefix="R"
              help="Max R46,000/year (SARS 2026/27)" />
            <InputField id="existingBalance" label="Existing TFSA Balance" value={inp.existingBalance} error={errors.existingBalance}
              onChange={n((v) => ({ existingBalance: v }))} prefix="R" />
            <InputField id="lifetimeUsed" label="Lifetime Contributions Used" value={inp.existingLifetimeUsed} error={errors.existingLifetimeUsed}
              onChange={n((v) => ({ existingLifetimeUsed: v }))} prefix="R"
              help="How much you've contributed to date" />
          </div>
        </div>

        {/* Right: Investment & Income */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--gain) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 25%, transparent)' }}>
              <TrendingUp size={15} className="text-gain-ink" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Investment &amp; Income
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="expectedReturn" label="Expected Annual Return" value={inp.expectedReturnPercent} error={errors.expectedReturnPercent}
              onChange={n((v) => ({ expectedReturnPercent: v }))} suffix="% p.a." step={0.5} />
            <InputField id="otherIncome" label="Other Annual Income" value={inp.otherAnnualIncome} error={errors.otherAnnualIncome}
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

      <ResultPanel
        label={`Extra in the TFSA after ${inp.projectionYears} years`}
        value={formatRand(extraWealth, 0)}
        tone={extraWealth > 0 ? 'gain' : 'default'}
        blocked={blocked}
        summary={<>
          Putting {formatRand(Math.min(inp.annualContribution, ANNUAL_LIMIT), 0)} a year into a TFSA grows to {formatRand(tfsaFinal, 0)},
          against {formatRand(taxableFinal, 0)} in an ordinary account after tax, because there is no {inp.returnType === 'cash' ? 'tax on interest' : 'dividends tax'} or capital gains tax inside it.
          {remainingLifetime > 0 && ` At this rate you reach the ${formatRand(LIFETIME_LIMIT, 0)} lifetime limit in about ${yearsToLimit} year${yearsToLimit === 1 ? '' : 's'}.`}
        </>}
        figures={[
          { label: 'TFSA', value: formatRand(tfsaFinal, 0) },
          { label: 'Ordinary account, after tax', value: formatRand(taxableFinal, 0) },
          { label: 'Tax avoided along the way', value: formatRand(totalTaxSaved, 0) },
          { label: 'Lifetime allowance left', value: formatRand(remainingLifetime, 0) },
        ]}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* TFSA vs Taxable growth */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            TFSA vs Taxable Growth
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            Both start with same balance and same contributions — difference is tax
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTfsa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradTax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                formatter={(v, name) => [formatRand(Number(v), 0), name === 'tfsa' ? 'TFSA' : 'Taxable (after CGT)']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
              <Area type="monotone" dataKey="tfsa"    name="TFSA"
                stroke={C.green} fill="url(#gradTfsa)" strokeWidth={2} />
              <Area type="monotone" dataKey="taxable" name="Taxable"
                stroke={C.blue}  fill="url(#gradTax)"  strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Annual tax drag */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Annual Tax Drag (Avoided in TFSA)
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            Tax that would be paid on the same investment outside a TFSA each year
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={taxDragChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                formatter={(v) => [formatRand(Number(v), 0), 'Tax Avoided']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="taxDrag" name="Tax Avoided" fill={C.orange} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-year table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Year-by-Year Projection
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink) 8%, transparent)' }}>
                {[
                  'Year', 'Age', 'Contribution', 'Lifetime Used',
                  'TFSA Balance', 'Taxable Balance', 'Annual Tax Avoided', 'Cumulative Tax Saved',
                ].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--ink-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const limitReached = r.lifetimeRemaining <= 0;
                return (
                  <tr key={r.year} style={{
                    borderBottom: '1px solid color-mix(in srgb, var(--ink) 4%, transparent)',
                    background: limitReached
                      ? 'color-mix(in srgb, var(--note-orange) 4%, transparent)'
                      : i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--ink) 1.5%, transparent)',
                  }}>
                    <td className="py-2 px-3 font-bold" style={{ color: 'var(--note-blue-ink)' }}>Y{r.year}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--ink-muted)' }}>{r.age}</td>
                    <td className="py-2 px-3" style={{ color: textTone(C.blue) }}>
                      {r.contribution > 0 ? formatRand(r.contribution, 0) : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span style={{ color: textTone(r.lifetimeRemaining <= 0 ? C.orange : 'var(--ink-muted)') }}>
                        {formatRand(r.lifetimeUsed, 0)}
                        {limitReached && <span className="ml-1 text-[10px]">★ maxed</span>}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: textTone(C.green) }}>
                      {formatRand(r.tfsaBalance, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--ink)' }}>
                      {formatRand(r.taxableBalance, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: textTone(C.orange) }}>
                      {formatRand(r.taxableAnnualTax, 0)}
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: textTone(C.green) }}>
                      {formatRand(r.cumulativeTaxSaved, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid color-mix(in srgb, var(--ink) 10%, transparent)' }}>
                <td colSpan={4} className="py-2 px-3 text-xs font-semibold"
                  style={{ color: 'var(--ink-muted)' }}>Totals</td>
                <td className="py-2 px-3 font-bold" style={{ color: textTone(C.green) }}>
                  {formatRand(tfsaFinal, 0)}
                </td>
                <td className="py-2 px-3 font-semibold" style={{ color: 'var(--ink)' }}>
                  {formatRand(taxableFinal, 0)}
                </td>
                <td className="py-2 px-3 font-bold" style={{ color: textTone(C.orange) }}>
                  {formatRand(totalTaxSaved, 0)}
                </td>
                <td className="py-2 px-3 font-bold" style={{ color: textTone(C.green) }}>
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
            body: 'R46,000 per tax year (1 March – 28 February). Excess is penalised at 40% by SARS. Does not roll over. Increased from R36,000 in the 2026/27 budget.',
            color: C.blue,
          },
          {
            title: 'Lifetime Limit',
            body: 'R500,000 total contributions. Withdrawals do NOT restore your lifetime allowance — withdrawn funds cannot be re-contributed.',
            color: C.orange,
          },
          {
            title: 'Zero Tax',
            body: 'No tax on interest, dividends, or capital gains inside a TFSA. No need to declare on your tax return.',
            color: C.green,
          },
        ].map((card) => (
          <div key={card.title}
            className="rounded-xl p-4"
            style={{ background: alpha(card.color, 6), border: `1px solid ${alpha(card.color, 19)}` }}>
            <p className="text-xs font-bold mb-1" style={{ color: textTone(card.color) }}>{card.title}</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              {card.body}
            </p>
          </div>
        ))}
      </div>

      <AssumptionsDrawer
        items={[
          <>Both accounts start with the same balance and get the same contributions, capped at the R46,000 yearly limit and the R500,000 lifetime limit.</>,
          <>The return of {inp.expectedReturnPercent}% a year is not guaranteed. {inp.returnType === 'cash'
            ? 'In the ordinary account all of it is interest, taxed at your marginal rate above the yearly interest exemption.'
            : `In the ordinary account about ${INCOME_YIELD_SPLIT[inp.returnType] ?? 3}% a year is paid out as dividends, which lose 20% dividends tax before being reinvested.`}</>,
          <>The ordinary account pays capital gains tax on its growth at the end, after the R50,000 yearly exclusion and 40% inclusion, at your marginal rate.</>,
          <>Contributions above the yearly limit are taxed at 40% by SARS, so the calculator caps them.</>,
          <>Fees and inflation are not included.</>,
        ]}
      />
    </div>
  );
}
