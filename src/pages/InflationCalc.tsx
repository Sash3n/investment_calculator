import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingDown, AlertCircle } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';

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
  const savingsGap      = Math.max(0, requiredSavings - futureNominal);

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
            <TrendingDown size={20} className="text-loss" />
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

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: `${years}-Year Purchasing Power`, value: formatRand(purchasingPower, 0),
            sub: `Today's ${formatRand(amount, 0)} buys only this much in ${years} yrs`, color: C.red },
          { label: 'If Invested',  value: formatRand(futureNominal, 0),
            sub: `At ${investReturn}% p.a.`, color: C.green },
          { label: 'Real Return',  value: `${realReturn.toFixed(2)}%`,
            sub: 'After inflation',
            color: realReturn > 0 ? C.green : C.red },
          { label: 'Savings Gap', value: savingsGap > 0 ? formatRand(savingsGap, 0) : 'None',
            sub: savingsGap > 0 ? 'Invest more to beat inflation' : 'Investments beat inflation',
            color: savingsGap > 0 ? C.orange : C.green },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card-static p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--ink-subtle)' }}>{kpi.label}</p>
            <p className="text-base font-bold leading-tight"
              style={{ color: kpi.color, fontFamily: 'var(--font-display)' }}>{kpi.value}</p>
            <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'var(--ink-subtle)' }}>{kpi.sub}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Settings</p>

          <InputField id="amount" label="Today's Amount / Goal" value={amount}
            onChange={(v) => setAmount(parseFloat(v) || 0)} prefix="R" />
          <InputField id="ir" label="Inflation Rate" value={inflationRate}
            onChange={(v) => setInflationRate(parseFloat(v) || 0)} suffix="% p.a." step={0.5} />
          <InputField id="ret" label="Investment Return" value={investReturn}
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
                    color: presetIdx === i ? C.red : 'var(--ink-muted)',
                    border: `1px solid ${presetIdx === i ? 'color-mix(in srgb, var(--loss) 30%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Insight boxes */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
          className="space-y-3">

          <div className="glass-card-static p-4 space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              The Purchasing Power Story
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              {formatRand(amount, 0)} today will only buy the equivalent of{' '}
              <strong style={{ color: C.red }}>{formatRand(purchasingPower, 0)}</strong> worth of goods in {years} years at {inflationRate}% inflation.
              That's a <strong style={{ color: C.red }}>{(((amount - purchasingPower) / amount) * 100).toFixed(0)}%</strong> loss of purchasing power.
            </p>
          </div>

          <div className="glass-card-static p-4 space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              To Maintain Purchasing Power
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              You need <strong style={{ color: C.blue }}>{formatRand(requiredSavings, 0)}</strong> in {years} years to buy what {formatRand(amount, 0)} buys today.
              Investing <strong style={{ color: C.green }}>{formatRand(monthlyNeeded, 0)}/mo</strong> at {investReturn}% gets you there.
            </p>
          </div>

          {realReturn < 2 && (
            <div className="p-4 rounded-xl flex items-start gap-2"
              style={{ background: 'color-mix(in srgb, var(--loss) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--loss) 20%, transparent)' }}>
              <AlertCircle size={14} style={{ color: C.red, flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                {realReturn < 0
                  ? `Your investment return (${investReturn}%) is below inflation (${inflationRate}%). You are losing real wealth.`
                  : `Real return of ${realReturn.toFixed(1)}% is very low. Consider higher-return assets like JSE ETFs.`}
              </p>
            </div>
          )}

          <div className="glass-card-static p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--ink-subtle)' }}>Rule of 72</p>
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              At {inflationRate}% inflation, prices <strong style={{ color: C.orange }}>double</strong> every{' '}
              <strong style={{ color: C.orange }}>{(72 / inflationRate).toFixed(1)} years</strong>.
              Your investment doubles every <strong style={{ color: C.green }}>{(72 / investReturn).toFixed(1)} years</strong> at {investReturn}%.
            </p>
          </div>
        </motion.div>
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

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--ink-subtle)' }}>
        SA CPI 5-year average ≈ 5.5%. JSE All Share 20-year average ≈ 13–15% nominal. Past performance ≠ future results. Not financial advice.
      </p>
    </div>
  );
}
