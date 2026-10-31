import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingDown } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';
import { textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { positiveError, rangeError } from '../utils/validation';
import { CPI_REFERENCE } from '../config/referenceRates';

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
  teal:    'var(--note-teal)',
};

const TOOLTIP_STYLE = {
  background:   'color-mix(in srgb, var(--paper-raised) 95%, transparent)',
  border:       '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
  borderRadius: 10,
  fontSize:     12,
  color:        'var(--ink)',
};

// SA CPI historical average ~5.5%, SA repo rate ~8%, money market ~7%
const PRESET_SCENARIOS = [
  { label: 'SA Average CPI (5.5%)',   rate: 5.5 },
  { label: 'High Inflation (8%)',      rate: 8   },
  { label: 'Low Inflation (4%)',       rate: 4   },
  { label: 'Education Inflation (10%)',rate: 10  },
  { label: 'Medical Inflation (9%)',   rate: 9   },
];

export function InflationCalc() {
  const [amount,       setAmount]       = useState(1_000_000);
  const [inflationRate, setInflationRate] = useState(5.5);
  const [investReturn,  setInvestReturn]  = useState(12);
  const [years,        setYears]         = useState(20);
  const [presetIdx,    setPresetIdx]     = useState(0);

  const futureNominal   = amount * Math.pow(1 + investReturn / 100, years);
  const purchasingPower = amount / Math.pow(1 + inflationRate / 100, years);
  const requiredSavings = amount * Math.pow(1 + inflationRate / 100, years);
  const realReturn      = ((1 + investReturn / 100) / (1 + inflationRate / 100) - 1) * 100;

  // Monthly savings needed to maintain purchasing power
  const r = investReturn / 100 / 12;
  const n = years * 12;
  const monthlyNeeded = requiredSavings > 0 && r > 0
    ? (requiredSavings * r) / (Math.pow(1 + r, n) - 1)
    : requiredSavings / n;

  // Chart data
  const chartData = useMemo(() => {
    return Array.from({ length: years + 1 }, (_, yr) => ({
      year:          `Yr ${yr}`,
      today:         Math.round(amount),
      realValue:     Math.round(amount / Math.pow(1 + inflationRate / 100, yr)),
      invested:      Math.round(amount * Math.pow(1 + investReturn / 100, yr)),
      inflationGoal: Math.round(amount * Math.pow(1 + inflationRate / 100, yr)),
    }));
  }, [amount, inflationRate, investReturn, years]);

  const errors = {
    amount: positiveError(amount, 'Enter an amount.'),
    inflationRate: rangeError(inflationRate, 0.1, 30, 'inflation', '%'),
    investReturn: rangeError(investReturn, -20, 40, 'a return', '%'),
  };
  const blocked = errors.amount ?? errors.inflationRate ?? errors.investReturn;

  const applyPreset = (idx: number) => {
    setPresetIdx(idx);
    setInflationRate(PRESET_SCENARIOS[idx].rate);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--loss) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--loss) 25%, transparent)' }}>
            <TrendingDown size={20} className="text-loss-ink" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Inflation & Purchasing Power
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              What does your money really buy in 10, 20, 30 years? How much more do you need to save?
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Settings</p>

          <InputField id="amount" label="Today's Amount / Goal" value={amount} error={errors.amount}
            onChange={(v) => setAmount(parseFloat(v) || 0)} prefix="R" />
          <InputField id="ir" label="Inflation Rate" value={inflationRate} error={errors.inflationRate}
            onChange={(v) => setInflationRate(parseFloat(v) || 0)} suffix="% p.a." step={0.5} />
          <InputField id="ret" label="Investment Return" value={investReturn} error={errors.investReturn}
            onChange={(v) => setInvestReturn(parseFloat(v) || 0)} suffix="% p.a." step={0.5} />
          <InputField id="yrs" label="Time Horizon" value={years}
            onChange={(v) => setYears(Math.min(50, Math.max(1, parseInt(v) || 1)))} suffix="years" />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ink-muted)' }}>Inflation Presets</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SCENARIOS.map((p, i) => (
                <button key={i} onClick={() => applyPreset(i)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: presetIdx === i ? 'color-mix(in srgb, var(--loss) 15%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                    color: textTone(presetIdx === i ? C.red : 'var(--ink-muted)'),
                    border: `1px solid ${presetIdx === i ? 'color-mix(in srgb, var(--loss) 30%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <ResultPanel
          className="self-start"
          label={`What ${formatRand(amount, 0)} buys in ${years} years`}
          value={formatRand(purchasingPower, 0)}
          blocked={blocked}
          summary={<>
            At {inflationRate}% inflation, prices double about every {(72 / inflationRate).toFixed(0)} years, so
            today’s {formatRand(amount, 0)} buys {((1 - purchasingPower / amount) * 100).toFixed(0)}% less in {years} years.
            To keep up you would need {formatRand(requiredSavings, 0)} by then. Invested at {investReturn}%, it grows to {formatRand(futureNominal, 0)}
            {realReturn >= 0
              ? `, a real return of ${realReturn.toFixed(1)}% a year after inflation.`
              : `. That return is below inflation, so the money loses value every year.`}
          </>}
          figures={[
            { label: 'Needed to keep up', value: formatRand(requiredSavings, 0) },
            { label: `Invested at ${investReturn}%`, value: formatRand(futureNominal, 0) },
            { label: 'Real return', value: `${realReturn.toFixed(1)}%` },
            { label: 'Saving from zero', value: `${formatRand(monthlyNeeded, 0)}/mo` },
          ]}
        />
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Purchasing Power vs Investment Growth
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
          Green = investments grow · Red = what your money buys · Dashed = inflation-adjusted target
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.green} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.green} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradPP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.red} stopOpacity={0.25} />
                <stop offset="95%" stopColor={C.red} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} interval={Math.floor(years / 5)} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
            <Area type="monotone" dataKey="invested"      name="Investment Value"     stroke={C.green} strokeWidth={2.5} fill="url(#gradInv)" />
            <Area type="monotone" dataKey="realValue"     name="Purchasing Power"     stroke={C.red}     strokeWidth={1.5} fill="url(#gradPP)" />
            <Area type="monotone" dataKey="inflationGoal" name="Inflation Target"     stroke={C.blue}  strokeWidth={1.5} fill="none" strokeDasharray="5 4" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <AssumptionsDrawer
        items={[
          <>Inflation of {inflationRate}% and the return of {investReturn}% stay the same every year. Neither is guaranteed.</>,
          <>For reference, {CPI_REFERENCE.source.publisher} put headline inflation at {CPI_REFERENCE.value}% for {CPI_REFERENCE.period}. The presets are round numbers for comparing scenarios.</>,
          <>“Saving from zero” is the monthly amount that grows to {formatRand(requiredSavings, 0)} in {years} years at {investReturn}%, if you start with nothing.</>,
          <>Prices doubling is worked out with the rule of 72: 72 divided by the inflation rate.</>,
          <>Tax and fees are not included.</>,
        ]}
      />
    </div>
  );
}
