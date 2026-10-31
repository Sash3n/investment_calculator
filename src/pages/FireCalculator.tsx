import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, ReferenceLine,
} from 'recharts';
import { Flame, DollarSign } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort, formatMonths } from '../utils/format';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, positiveError, rangeError } from '../utils/validation';
import { CPI_REFERENCE } from '../config/referenceRates';
import { textTone } from '../utils/color';
import { yearsToFire } from '../utils/fire';

// ── Constants ─────────────────────────────────────────────────────────────────
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

  const yearsToRetirement = inp.targetRetirementAge - inp.currentAge;

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

    // Expenses for this year, grown by inflation from today
    const annualExpenses = inp.monthlyExpensesInRetirement * 12 * inflationFactor;

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
  swr:         number,
  bumps:       number[],
): { bump: number; years: number; saving: number }[] {
  const years = (monthly: number) => yearsToFire(inp.currentSavings, monthly, inp.annualReturnPercent,
    inp.monthlyExpensesInRetirement * 12, inp.annualInflationPercent, swr);
  const base = years(inp.monthlyContribution);
  return bumps.map((bump) => {
    const y = years(inp.monthlyContribution + bump);
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
  const [selectedSwr, setSelectedSwr] = useState(0.04);

  const n = (fn: (v: number) => Partial<Inputs>) => (val: string) =>
    setInp((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const rows = useMemo(() => simulate(inp), [inp]);

  const yearsToRetirement = Math.max(0, inp.targetRetirementAge - inp.currentAge);
  const infR              = inp.annualInflationPercent / 100;

  // Retirement expenses inflated
  const retirementAnnualExp = inp.monthlyExpensesInRetirement * 12
    * Math.pow(1 + infR, yearsToRetirement);

  const target4 = retirementAnnualExp / selectedSwr;

  const yrs4  = yearsToFire(inp.currentSavings, inp.monthlyContribution, inp.annualReturnPercent,
    inp.monthlyExpensesInRetirement * 12, inp.annualInflationPercent, selectedSwr);

  const fireAge4  = inp.currentAge + (isFinite(yrs4)  ? yrs4  : 0);

  // Coast FIRE at selected SWR
  const coastBalance = coastFireBalance(target4, yearsToRetirement, inp.annualReturnPercent);
  // Coasting from an age means that balance would grow to the FIRE number by the target age on its own
  const coastReached = rows.find((r) => r.age <= inp.targetRetirementAge
    && r.balance * Math.pow(1 + inp.annualReturnPercent / 100, inp.targetRetirementAge - r.age) >= target4);

  // Balance at target retirement age
  const retirementRow = rows.find((r) => r.age === inp.targetRetirementAge) ?? rows[yearsToRetirement - 1];
  const balanceAtRetirement = retirementRow?.balance ?? 0;
  const onTrack4 = balanceAtRetirement >= target4;

  // Contribution bump impact (at selected SWR)
  const bumps = bumpImpact(inp, selectedSwr, [500, 1000, 2000, 5000]);

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

  const errors = {
    currentAge: rangeError(inp.currentAge, 0, 100, 'an age', ''),
    targetRetirementAge: inp.targetRetirementAge <= inp.currentAge
      ? 'Enter an age after your current age.'
      : rangeError(inp.targetRetirementAge, 1, 100, 'an age', ''),
    currentSavings: nonNegativeError(inp.currentSavings),
    monthlyContribution: nonNegativeError(inp.monthlyContribution),
    monthlyExpensesInRetirement: positiveError(inp.monthlyExpensesInRetirement, 'Enter what you expect to spend each month in retirement.'),
    annualReturnPercent: rangeError(inp.annualReturnPercent, -20, 30, 'a return', '%'),
    annualInflationPercent: rangeError(inp.annualInflationPercent, 0, 30, 'inflation', '%'),
  };
  const blocked = errors.currentAge ?? errors.targetRetirementAge ?? errors.currentSavings ?? errors.monthlyContribution
    ?? errors.monthlyExpensesInRetirement ?? errors.annualReturnPercent ?? errors.annualInflationPercent;

  const isFireYear4 = (age: number) => Math.abs(age - fireAge4) < 0.6;
  const isCoastYear = (age: number) => coastReached?.age === age;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--loss) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--loss) 30%, transparent)' }}
          >
            <Flame size={20} className="text-loss-ink" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              FIRE Calculator
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              Financial Independence, Retire Early · SA-adjusted · 3–4% safe withdrawal rates
            </p>
          </div>
        </div>
      </motion.div>

      <ResultPanel
        label="Financially independent at"
        value={isFinite(yrs4) ? `Age ${Math.ceil(fireAge4)}` : 'Not yet'}
        blocked={blocked}
        summary={<>
          {isFinite(yrs4)
            ? `Saving ${formatRand(inp.monthlyContribution, 0)} a month at ${inp.annualReturnPercent}%, your investments cover ${formatRand(inp.monthlyExpensesInRetirement, 0)} a month in today’s money at a ${(selectedSwr * 100).toFixed(1)}% withdrawal rate in about ${yrs4.toFixed(1)} years.`
            : 'At these figures your investments never reach the FIRE number. Save more, spend less in retirement or allow a higher withdrawal rate.'}
          {' '}{onTrack4
            ? `By age ${inp.targetRetirementAge} you would have ${formatRand(balanceAtRetirement - target4, 0)} more than you need.`
            : `By age ${inp.targetRetirementAge} you would have ${formatRand(balanceAtRetirement, 0)}, ${formatRand(target4 - balanceAtRetirement, 0)} short of the ${formatRand(target4, 0)} needed then.`}
          {coastReached && ` From age ${coastReached.age} your investments could grow to the target without more contributions.`}
        </>}
        figures={[
          { label: `FIRE number at age ${inp.targetRetirementAge}`, value: formatRand(target4, 0) },
          { label: `You would have at ${inp.targetRetirementAge}`, value: formatRand(balanceAtRetirement, 0) },
          { label: 'Coast FIRE balance today', value: formatRand(coastBalance, 0) },
          { label: 'Years to go', value: isFinite(yrs4) ? formatMonths(Math.round(yrs4 * 12)) : 'Not reached' },
        ]}
      />

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)' }}>
              <DollarSign size={15} className="text-note-blue-ink" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Your Finances
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="currentAge" label="Current Age" value={inp.currentAge} error={errors.currentAge}
              onChange={n((v) => ({ currentAge: v }))} suffix="yrs" />
            <InputField id="retireAge" label="Target FIRE Age" value={inp.targetRetirementAge} error={errors.targetRetirementAge}
              onChange={n((v) => ({ targetRetirementAge: v }))} suffix="yrs" />
            <InputField id="currentSavings" label="Current Savings / Investments" value={inp.currentSavings} error={errors.currentSavings}
              onChange={n((v) => ({ currentSavings: v }))} prefix="R"
              help="RA + TFSA + ETFs + savings" />
            <InputField id="monthlyContrib" label="Monthly Contribution" value={inp.monthlyContribution} error={errors.monthlyContribution}
              onChange={n((v) => ({ monthlyContribution: v }))} prefix="R"
              help="Total saved/invested per month" />
          </div>
        </div>

        {/* Right */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--loss) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--loss) 25%, transparent)' }}>
              <Flame size={15} className="text-loss-ink" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              FIRE Targets
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="monthlyExp" label="Monthly Expenses in Retirement" value={inp.monthlyExpensesInRetirement} error={errors.monthlyExpensesInRetirement}
              onChange={n((v) => ({ monthlyExpensesInRetirement: v }))} prefix="R"
              help="Today's money — inflation applied automatically" />
            <InputField id="annualReturn" label="Expected Annual Return" value={inp.annualReturnPercent} error={errors.annualReturnPercent}
              onChange={n((v) => ({ annualReturnPercent: v }))} suffix="% p.a." step={0.5} />
            <InputField id="inflation" label="Annual Inflation" value={inp.annualInflationPercent} error={errors.annualInflationPercent}
              onChange={n((v) => ({ annualInflationPercent: v }))} suffix="% p.a." step={0.5}
              help={`Stats SA headline CPI: ${CPI_REFERENCE.value}% (${CPI_REFERENCE.period})`} />
          </div>
        </div>
      </div>

      {/* SWR summary cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
          FIRE Number by Safe Withdrawal Rate
        </p>
        <p className="text-[11px] mb-2" style={{ color: 'var(--ink-muted)' }}>
          Click a card to set it as your active SWR target.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SWR_OPTIONS.map(({ swr, label, sub }) => {
            const target = retirementAnnualExp / swr;
            const yrs = yearsToFire(inp.currentSavings, inp.monthlyContribution, inp.annualReturnPercent,
              inp.monthlyExpensesInRetirement * 12, inp.annualInflationPercent, swr);
            const fireAge = inp.currentAge + (isFinite(yrs) ? yrs : Infinity);
            const achieved = isFinite(yrs);
            const isActive = selectedSwr === swr;
            return (
              <motion.div
                key={swr}
                onClick={() => setSelectedSwr(swr)}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: swr * 5 }}
                className="glass-card-static p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  borderLeft: `3px solid ${swr === 0.04 ? C.green : swr === 0.035 ? C.orange : C.blue}`,
                  outline: isActive ? `2px solid ${swr === 0.04 ? C.green : swr === 0.035 ? C.orange : C.blue}` : 'none',
                  outlineOffset: 2,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: textTone(swr === 0.04 ? C.green : swr === 0.035 ? C.orange : C.blue) }}>
                    {label}
                  </p>
                  {achieved && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'color-mix(in srgb, var(--gain) 10%, transparent)', color: textTone(C.green) }}>
                      Age {fireAge.toFixed(0)}
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                  {formatRandShort(target)}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--ink-muted)' }}>{sub}</p>
                <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--ink-subtle)' }}>
                  {achieved
                    ? `${yrs.toFixed(1)} years to reach`
                    : 'Not achievable at current rate'}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Portfolio growth vs FIRE targets */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Portfolio Growth vs FIRE Targets
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            Nominal balance vs 3% and 4% SWR targets (inflation-adjusted expenses)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={growthChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--ink-subtle)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                formatter={(v, name) => [
                  formatRand(Number(v), 0),
                  name === 'balance' ? 'Your Portfolio' : name === 'target4' ? '4% SWR Target' : '3% SWR Target',
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
              <Area type="monotone" dataKey="balance" name="Portfolio"
                stroke={C.blue} fill="url(#gradBal)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="target4" name="4% Target"
                stroke={C.green} strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="target3" name="3% Target"
                stroke={C.orange} strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              {isFinite(yrs4) && (
                <ReferenceLine
                  x={String(Math.round(fireAge4))}
                  stroke={C.green}
                  strokeDasharray="4 2"
                  label={{ value: `FIRE ${Math.round(fireAge4)}`, fontSize: 10, fill: C.green, position: 'top' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Extra contribution impact */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Years Saved by Contributing More
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            How many years earlier you reach FIRE (4% SWR) by increasing monthly contributions
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bumpChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} unit=" yrs" />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                formatter={(v) => [`${Number(v).toFixed(1)} years earlier`, 'Years saved']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="saving" name="Years saved" fill={C.green} radius={[4, 4, 0, 0]}>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Bump detail rows */}
          <div className="mt-3 space-y-1.5">
            {bumps.map((b) => (
              <div key={b.bump} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg"
                style={{ background: 'color-mix(in srgb, var(--ink) 2.5%, transparent)' }}>
                <span style={{ color: 'var(--ink-muted)' }}>
                  +{formatRand(b.bump, 0)}/month extra
                </span>
                <span className="font-semibold" style={{ color: textTone(b.saving > 0 ? C.green : 'var(--ink-subtle)') }}>
                  {b.saving > 0
                    ? `${b.saving.toFixed(1)} years earlier (age ${(inp.currentAge + b.years).toFixed(0)})`
                    : '—'}
                </span>
              </div>
            ))}
          </div>
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
                {['Age', 'Annual Contribution', 'Growth', 'Portfolio Balance', 'Real Value', '4% FIRE Target', 'Progress'].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--ink-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => {
                const pct     = Math.min(100, (r.balance / r.fireTarget4) * 100);
                const isCoast = isCoastYear(r.age);
                const isFire4 = isFireYear4(r.age);
                const isTarget = r.age === inp.targetRetirementAge;
                let rowBg = i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--ink) 1.5%, transparent)';
                if (isFire4)  rowBg = 'color-mix(in srgb, var(--gain) 8%, transparent)';
                if (isCoast)  rowBg = 'color-mix(in srgb, var(--note-blue) 6%, transparent)';
                if (isTarget && !isFire4) rowBg = 'color-mix(in srgb, var(--note-orange) 5%, transparent)';

                return (
                  <tr key={r.year} style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink) 4%, transparent)', background: rowBg }}>
                    <td className="py-2 px-3 font-bold" style={{
                      color: textTone(isFire4 ? C.green : isTarget ? C.orange : 'var(--note-blue)'),
                    }}>
                      {r.age}
                      {isFire4  && <span className="ml-1 text-[10px]">🔥 FIRE</span>}
                      {isCoast && !isFire4 && <span className="ml-1 text-[10px]" style={{ color: textTone(C.blue) }}>⚡ Coast</span>}
                      {isTarget && !isFire4 && <span className="ml-1 text-[10px]" style={{ color: textTone(C.orange) }}>★ Target</span>}
                    </td>
                    <td className="py-2 px-3" style={{ color: textTone(C.blue) }}>
                      {formatRand(r.contribution, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: textTone(C.green) }}>
                      +{formatRand(r.growth, 0)}
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: 'var(--ink)' }}>
                      {formatRand(r.balance, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--ink-muted)' }}>
                      {formatRand(r.realBalance, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--ink-muted)' }}>
                      {formatRand(r.fireTarget4, 0)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'color-mix(in srgb, var(--ink) 6%, transparent)', minWidth: 50 }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 100
                                ? C.green
                                : pct >= 75 ? C.orange : C.blue,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold w-8 text-right"
                          style={{ color: textTone(pct >= 100 ? C.green : 'var(--ink-subtle)') }}>
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
        <p className="text-[10px] mt-3" style={{ color: 'var(--ink-subtle)' }}>
          🔥 = FIRE reached (4% SWR) &nbsp;·&nbsp; ⚡ = Coast FIRE reached &nbsp;·&nbsp; ★ = your target retirement age
        </p>
      </div>

      <AssumptionsDrawer
        items={[
          <>Your contribution of {formatRand(inp.monthlyContribution, 0)} a month and the {inp.annualReturnPercent}% return stay the same. Returns are not guaranteed.</>,
          <>Retirement spending of {formatRand(inp.monthlyExpensesInRetirement * 12, 0)} a year in today’s money grows by {inp.annualInflationPercent}% inflation, to {formatRand(retirementAnnualExp, 0)} a year by age {inp.targetRetirementAge}.</>,
          <>The FIRE number is that year’s spending divided by the withdrawal rate. A {(selectedSwr * 100).toFixed(1)}% rate means drawing that share of the portfolio each year; lower rates are safer over long retirements.</>,
          <>Coast FIRE is the balance today that would grow to the FIRE number by age {inp.targetRetirementAge} with no more contributions.</>,
          <>Tax, fees and changes in spending are not included.</>,
        ]}
      />
    </div>
  );
}
