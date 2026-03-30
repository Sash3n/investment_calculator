import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, ReferenceLine,
} from 'recharts';
import { Flame, Target, Zap, Info, DollarSign } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';

// ── Constants ─────────────────────────────────────────────────────────────────
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

const SWR_OPTIONS = [
  { swr: 0.03,   label: '3% SWR',   sub: 'Very conservative (SA inflation hedge)' },
  { swr: 0.035,  label: '3.5% SWR', sub: 'Conservative' },
  { swr: 0.04,   label: '4% SWR',   sub: 'Traditional FIRE rule' },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Inputs {
  currentAge:                  number;
  targetRetirementAge:         number;
  currentSavings:              number;
  monthlyContribution:         number;
  annualReturnPercent:         number;
  annualInflationPercent:      number;
  monthlyExpensesInRetirement: number;
}

interface FireRow {
  year:             number;
  age:              number;
  balance:          number;
  contribution:     number;
  growth:           number;
  fireTarget3:      number;  // 3% SWR target
  fireTarget35:     number;  // 3.5% SWR target
  fireTarget4:      number;  // 4% SWR target
  realBalance:      number;  // inflation-adjusted
}

// ── Core math ─────────────────────────────────────────────────────────────────
function yearsToFire(
  currentSavings:   number,
  monthlyContrib:   number,
  annualReturn:     number,
  fireTarget:       number,
): number {
  const r = annualReturn / 100 / 12;
  let balance = currentSavings;

  if (balance >= fireTarget) return 0;
  if (r === 0) {
    if (monthlyContrib <= 0) return Infinity;
    return (fireTarget - balance) / monthlyContrib / 12;
  }

  for (let month = 1; month <= 12 * 100; month++) {
    balance = balance * (1 + r) + monthlyContrib;
    if (balance >= fireTarget) return month / 12;
  }
  return Infinity;
}

function coastFireBalance(
  fireTarget:         number,
  yearsToRetirement:  number,
  annualReturn:       number,
): number {
  // Balance today needed so it grows to fireTarget without more contributions
  const r = annualReturn / 100;
  return fireTarget / Math.pow(1 + r, yearsToRetirement);
}

function simulate(inp: Inputs): FireRow[] {
  const rows: FireRow[] = [];
  const r       = inp.annualReturnPercent / 100 / 12;
  const infR    = inp.annualInflationPercent / 100;

  // FIRE targets at different SWRs (today's expenses inflation-adjusted to retirement)
  const yearsToRetirement = inp.targetRetirementAge - inp.currentAge;
  const retirementExpenses = inp.monthlyExpensesInRetirement * 12
    * Math.pow(1 + infR, Math.max(0, yearsToRetirement));

  let balance = inp.currentSavings;
  const maxYears = Math.max(60, yearsToRetirement + 10);

  for (let year = 1; year <= maxYears; year++) {
    const age = inp.currentAge + year;
    const prevBalance = balance;

    // Grow monthly
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + inp.monthlyContribution;
    }

    const growth = balance - prevBalance - inp.monthlyContribution * 12;
    const inflationFactor = Math.pow(1 + infR, year);

    // Inflation-adjusted expenses for this year
    const annualExpenses = retirementExpenses;

    rows.push({
      year,
      age,
      balance,
      contribution: inp.monthlyContribution * 12,
      growth,
      fireTarget3:  annualExpenses / 0.03,
      fireTarget35: annualExpenses / 0.035,
      fireTarget4:  annualExpenses / 0.04,
      realBalance:  balance / inflationFactor,
    });
  }

  return rows;
}

// ── Contribution impact helper ────────────────────────────────────────────────
function bumpImpact(
  inp:         Inputs,
  fireTarget:  number,
  bumps:       number[],
): { bump: number; years: number; saving: number }[] {
  const base = yearsToFire(inp.currentSavings, inp.monthlyContribution, inp.annualReturnPercent, fireTarget);
  return bumps.map((bump) => {
    const y = yearsToFire(inp.currentSavings, inp.monthlyContribution + bump, inp.annualReturnPercent, fireTarget);
    return { bump, years: y, saving: isFinite(base) && isFinite(y) ? base - y : 0 };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export function FireCalculator() {
  const [inp, setInp] = useState<Inputs>({
    currentAge:                  30,
    targetRetirementAge:         55,
    currentSavings:              200_000,
    monthlyContribution:         10_000,
    annualReturnPercent:         11,
    annualInflationPercent:      5.5,
    monthlyExpensesInRetirement: 30_000,
  });

  const n = (fn: (v: number) => Partial<Inputs>) => (val: string) =>
    setInp((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const rows = useMemo(() => simulate(inp), [inp]);

  const yearsToRetirement = Math.max(0, inp.targetRetirementAge - inp.currentAge);
  const infR              = inp.annualInflationPercent / 100;

  // Retirement expenses inflated
  const retirementAnnualExp = inp.monthlyExpensesInRetirement * 12
    * Math.pow(1 + infR, yearsToRetirement);

  const target4 = retirementAnnualExp / 0.04;

  const yrs4  = yearsToFire(inp.currentSavings, inp.monthlyContribution, inp.annualReturnPercent, target4);

  const fireAge4  = inp.currentAge + (isFinite(yrs4)  ? yrs4  : 0);

  // Coast FIRE at 4% SWR
  const coastBalance = coastFireBalance(target4, yearsToRetirement, inp.annualReturnPercent);
  const coastReached = rows.find((r) => r.balance >= coastBalance);

  // Balance at target retirement age
  const retirementRow = rows.find((r) => r.age === inp.targetRetirementAge) ?? rows[yearsToRetirement - 1];
  const balanceAtRetirement = retirementRow?.balance ?? 0;
  const onTrack4 = balanceAtRetirement >= target4;

  // Contribution bump impact (at 4% SWR)
  const bumps = bumpImpact(inp, target4, [500, 1000, 2000, 5000]);

  // Chart: cap at retirement age + 5 for main chart
  const chartRows = rows.filter((r) => r.age <= inp.targetRetirementAge + 5);

  const growthChart = chartRows.map((r) => ({
    label:    `${r.age}`,
    balance:  Math.round(r.balance),
    target4:  Math.round(r.fireTarget4),
    target3:  Math.round(r.fireTarget3),
    real:     Math.round(r.realBalance),
  }));

  const bumpChart = bumps.map((b) => ({
    label:  `+R${(b.bump / 1000).toFixed(1)}k/mo`,
    years:  parseFloat(b.years.toFixed(1)),
    saving: parseFloat(b.saving.toFixed(1)),
  }));

  // Annual breakdown for table
  const tableRows = rows.filter((r) => r.age <= Math.max(inp.targetRetirementAge + 1, inp.currentAge + 40));

  const isFireYear4 = (age: number) => Math.abs(age - fireAge4) < 0.6;
  const isCoastYear = (age: number) => coastReached?.age === age;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Flame size={20} className="text-[#EF4444]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              FIRE Calculator
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Financial Independence, Retire Early · SA-adjusted · 3–4% safe withdrawal rates
            </p>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold hidden sm:inline-block"
            style={{ background: 'rgba(239,68,68,0.1)', color: C.red, border: `1px solid ${C.red}44` }}
          >
            {isFinite(yrs4) ? `FIRE in ${yrs4.toFixed(1)} yrs` : 'Adjust inputs'}
          </span>
        </div>
      </motion.div>

      {/* On-track banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
        style={{
          background: onTrack4 ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
          border: `1px solid ${onTrack4 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: onTrack4 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}
          >
            <Target size={16} style={{ color: onTrack4 ? C.emerald : C.red }} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: onTrack4 ? C.emerald : C.red }}>
              {onTrack4
                ? `On track — you'll hit your FIRE number by age ${inp.targetRetirementAge}`
                : `Behind target — at age ${inp.targetRetirementAge} you'll have ${formatRand(balanceAtRetirement, 0)} vs target ${formatRand(target4, 0)}`}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Based on 4% SWR · {inp.monthlyExpensesInRetirement > 0
                ? `R${(inp.monthlyExpensesInRetirement / 1000).toFixed(0)}k/month retirement expenses (today's money)`
                : 'Enter monthly expenses in retirement'}
            </p>
          </div>
        </div>
        {onTrack4 && (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Surplus at retirement</p>
            <p className="text-sm font-bold" style={{ color: C.emerald }}>
              {formatRand(balanceAtRetirement - target4, 0)}
            </p>
          </div>
        )}
      </motion.div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <DollarSign size={15} className="text-[#6366F1]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Your Finances
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="currentAge" label="Current Age" value={inp.currentAge}
              onChange={n((v) => ({ currentAge: v }))} suffix="yrs" />
            <InputField id="retireAge" label="Target FIRE Age" value={inp.targetRetirementAge}
              onChange={n((v) => ({ targetRetirementAge: v }))} suffix="yrs" />
            <InputField id="currentSavings" label="Current Savings / Investments" value={inp.currentSavings}
              onChange={n((v) => ({ currentSavings: v }))} prefix="R"
              help="RA + TFSA + ETFs + savings" />
            <InputField id="monthlyContrib" label="Monthly Contribution" value={inp.monthlyContribution}
              onChange={n((v) => ({ monthlyContribution: v }))} prefix="R"
              help="Total saved/invested per month" />
          </div>
        </div>

        {/* Right */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Flame size={15} className="text-[#EF4444]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              FIRE Targets
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="monthlyExp" label="Monthly Expenses in Retirement" value={inp.monthlyExpensesInRetirement}
              onChange={n((v) => ({ monthlyExpensesInRetirement: v }))} prefix="R"
              help="Today's money — inflation applied automatically" />
            <InputField id="annualReturn" label="Expected Annual Return" value={inp.annualReturnPercent}
              onChange={n((v) => ({ annualReturnPercent: v }))} suffix="% p.a." step={0.5} />
            <InputField id="inflation" label="Annual Inflation" value={inp.annualInflationPercent}
              onChange={n((v) => ({ annualInflationPercent: v }))} suffix="% p.a." step={0.5}
              help="SA CPI average ~5.5%" />
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                Years to FIRE target
              </p>
              <p className="text-xl font-bold" style={{ color: C.amber, fontFamily: 'var(--font-heading)' }}>
                {yearsToRetirement} yrs
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-subtle)' }}>
                  (age {inp.targetRetirementAge})
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SWR summary cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
          FIRE Number by Safe Withdrawal Rate
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SWR_OPTIONS.map(({ swr, label, sub }) => {
            const target = retirementAnnualExp / swr;
            const yrs = yearsToFire(inp.currentSavings, inp.monthlyContribution, inp.annualReturnPercent, target);
            const fireAge = inp.currentAge + (isFinite(yrs) ? yrs : Infinity);
            const achieved = isFinite(yrs);
            return (
              <motion.div
                key={swr}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: swr * 5 }}
                className="glass-card-static p-4 rounded-xl"
                style={{ borderLeft: `3px solid ${swr === 0.04 ? C.emerald : swr === 0.035 ? C.amber : C.indigo}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: swr === 0.04 ? C.emerald : swr === 0.035 ? C.amber : C.indigo }}>
                    {label}
                  </p>
                  {achieved && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(16,185,129,0.1)', color: C.emerald }}>
                      Age {fireAge.toFixed(0)}
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
                  {formatRandShort(target)}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
                <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-text-subtle)' }}>
                  {achieved
                    ? `${yrs.toFixed(1)} years to reach`
                    : 'Not achievable at current rate'}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Coast FIRE callout */}
      <div
        className="rounded-xl p-4 flex items-start gap-4 flex-wrap"
        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(99,102,241,0.15)' }}>
          <Zap size={16} className="text-[#6366F1]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold mb-0.5" style={{ color: C.indigo }}>Coast FIRE (4% SWR)</p>
          <p className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            {formatRand(coastBalance, 0)}
          </p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            If your portfolio reaches this balance today, it will compound on its own to your FIRE number by
            age {inp.targetRetirementAge} — without any further contributions.{' '}
            {coastReached
              ? <span style={{ color: C.emerald }}>You'll reach Coast FIRE at age {coastReached.age}.</span>
              : <span style={{ color: C.amber }}>You haven't reached Coast FIRE yet at current trajectory.</span>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
            {inp.currentSavings >= coastBalance ? 'Already coasting!' : 'Gap to Coast FIRE'}
          </p>
          <p className="text-sm font-bold" style={{ color: inp.currentSavings >= coastBalance ? C.emerald : C.amber }}>
            {inp.currentSavings >= coastBalance
              ? 'Achieved'
              : formatRand(coastBalance - inp.currentSavings, 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Portfolio growth vs FIRE targets */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Portfolio Growth vs FIRE Targets
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Nominal balance vs 3% and 4% SWR targets (inflation-adjusted expenses)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={growthChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.indigo} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip
                formatter={(v, name) => [
                  formatRand(Number(v), 0),
                  name === 'balance' ? 'Your Portfolio' : name === 'target4' ? '4% SWR Target' : '3% SWR Target',
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Area type="monotone" dataKey="balance" name="Portfolio"
                stroke={C.indigo} fill="url(#gradBal)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="target4" name="4% Target"
                stroke={C.emerald} strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="target3" name="3% Target"
                stroke={C.amber} strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              {isFinite(yrs4) && (
                <ReferenceLine
                  x={String(Math.round(fireAge4))}
                  stroke={C.emerald}
                  strokeDasharray="4 2"
                  label={{ value: `FIRE ${Math.round(fireAge4)}`, fontSize: 10, fill: C.emerald, position: 'top' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Extra contribution impact */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Years Saved by Contributing More
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            How many years earlier you reach FIRE (4% SWR) by increasing monthly contributions
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bumpChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} unit=" yrs" />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(1)} years earlier`, 'Years saved']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="saving" name="Years saved" fill={C.emerald} radius={[4, 4, 0, 0]}>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Bump detail rows */}
          <div className="mt-3 space-y-1.5">
            {bumps.map((b) => (
              <div key={b.bump} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.025)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  +{formatRand(b.bump, 0)}/month extra
                </span>
                <span className="font-semibold" style={{ color: b.saving > 0 ? C.emerald : 'var(--color-text-subtle)' }}>
                  {b.saving > 0
                    ? `${b.saving.toFixed(1)} years earlier (age ${(inp.currentAge + b.years).toFixed(0)})`
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inflation-adjusted real value note */}
      <div
        className="flex items-start gap-3 p-3 rounded-xl text-xs"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}
      >
        <Info size={14} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
        <span style={{ color: 'var(--color-text-muted)' }}>
          <strong style={{ color: 'var(--color-text)' }}>SA inflation note:</strong> At {inp.annualInflationPercent}% p.a., your retirement expenses of{' '}
          <strong style={{ color: C.amber }}>{formatRand(inp.monthlyExpensesInRetirement * 12, 0)}/year</strong> (today's money)
          will be <strong style={{ color: C.red }}>{formatRand(retirementAnnualExp, 0)}/year</strong> in{' '}
          {yearsToRetirement} years. The FIRE targets above are based on that inflated figure — so your portfolio needs
          to be larger than a simple 25× today's expenses would suggest.
        </span>
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
                {['Age', 'Annual Contribution', 'Growth', 'Portfolio Balance', 'Real Value', '4% FIRE Target', 'Progress'].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => {
                const pct     = Math.min(100, (r.balance / r.fireTarget4) * 100);
                const isCoast = isCoastYear(r.age);
                const isFire4 = isFireYear4(r.age);
                const isTarget = r.age === inp.targetRetirementAge;
                let rowBg = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)';
                if (isFire4)  rowBg = 'rgba(16,185,129,0.08)';
                if (isCoast)  rowBg = 'rgba(99,102,241,0.06)';
                if (isTarget && !isFire4) rowBg = 'rgba(245,158,11,0.05)';

                return (
                  <tr key={r.year} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: rowBg }}>
                    <td className="py-2 px-3 font-bold" style={{
                      color: isFire4 ? C.emerald : isTarget ? C.amber : '#818CF8',
                    }}>
                      {r.age}
                      {isFire4  && <span className="ml-1 text-[10px]">🔥 FIRE</span>}
                      {isCoast && !isFire4 && <span className="ml-1 text-[10px]" style={{ color: C.indigo }}>⚡ Coast</span>}
                      {isTarget && !isFire4 && <span className="ml-1 text-[10px]" style={{ color: C.amber }}>★ Target</span>}
                    </td>
                    <td className="py-2 px-3" style={{ color: C.indigo }}>
                      {formatRand(r.contribution, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: C.emerald }}>
                      +{formatRand(r.growth, 0)}
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                      {formatRand(r.balance, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                      {formatRand(r.realBalance, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                      {formatRand(r.fireTarget4, 0)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.06)', minWidth: 50 }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 100
                                ? C.emerald
                                : pct >= 75 ? C.amber : C.indigo,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold w-8 text-right"
                          style={{ color: pct >= 100 ? C.emerald : 'var(--color-text-subtle)' }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-subtle)' }}>
          🔥 = FIRE reached (4% SWR) &nbsp;·&nbsp; ⚡ = Coast FIRE reached &nbsp;·&nbsp; ★ = your target retirement age
        </p>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Projections are illustrative only. Returns are not guaranteed. FIRE calculations assume consistent contributions and returns — actual results will vary. Not financial advice — consult a CFP.
      </p>
    </div>
  );
}
