import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Target, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { readShareParam } from '../utils/share';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, positiveError, rangeError } from '../utils/validation';

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
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

const VEHICLES = [
  { label: 'TFSA (ETFs) - ~11% p.a.',           rate: 11,  tfsa: true  },
  { label: 'S&P 500 / Global ETF - ~13% p.a.',  rate: 13,  tfsa: false },
  { label: 'JSE / Satrix 40 - ~10% p.a.',       rate: 10,  tfsa: false },
  { label: 'Fixed Deposit / Money Market - ~8%', rate: 8,   tfsa: false },
];

const TFSA_ANNUAL_LIMIT  = 46_000;
const TFSA_LIFETIME_CAP  = 500_000;
const TFSA_MONTHLY_LIMIT = TFSA_ANNUAL_LIMIT / 12;

const MILESTONES = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000];

interface ShareState {
  mode: string;
  target: number;
  monthly: number;
  years: number;
  lump: number;
  vehicleIdx: number;
  rate: number;
  escalation: number;
  inflation: number;
}

function simulate(
  basePMT: number,
  years: number,
  annualRate: number,
  lumpSum: number,
  escalationPct: number,
): { chartData: { year: number; balance: number; contributed: number; returns: number }[]; finalBalance: number } {
  const monthlyRate = annualRate / 100 / 12;
  let balance = lumpSum;
  let totalContributed = lumpSum;
  const chartData = [];

  for (let y = 1; y <= years; y++) {
    const pmt = basePMT * Math.pow(1 + escalationPct / 100, y - 1);
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + pmt;
      totalContributed += pmt;
    }
    chartData.push({
      year:        y,
      balance:     Math.round(balance),
      contributed: Math.round(totalContributed),
      returns:     Math.round(balance - totalContributed),
    });
  }
  return { chartData, finalBalance: balance };
}

function findMonthly(
  target: number,
  years: number,
  annualRate: number,
  lumpSum: number,
  escalationPct: number,
): number {
  let lo = 0, hi = target;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { finalBalance } = simulate(mid, years, annualRate, lumpSum, escalationPct);
    if (finalBalance < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function getMilestones(
  basePMT: number,
  years: number,
  annualRate: number,
  lumpSum: number,
  escalationPct: number,
): { amount: number; year: number }[] {
  const monthlyRate = annualRate / 100 / 12;
  let balance = lumpSum;
  const hits: { amount: number; year: number }[] = [];
  let mIdx = 0;

  for (let y = 1; y <= years && mIdx < MILESTONES.length; y++) {
    const pmt = basePMT * Math.pow(1 + escalationPct / 100, y - 1);
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + pmt;
    }
    while (mIdx < MILESTONES.length && balance >= MILESTONES[mIdx]) {
      hits.push({ amount: MILESTONES[mIdx], year: y });
      mIdx++;
    }
  }
  return hits;
}

export function WealthTargetPlanner() {
  const shared = readShareParam<ShareState>();

  const [mode,         setMode]         = useState<'target' | 'monthly'>(shared?.mode as 'target' | 'monthly' ?? 'target');
  const [target,       setTarget]       = useState(shared?.target     ?? 2_000_000);
  const [monthly,      setMonthly]      = useState(shared?.monthly    ?? 3_000);
  const [years,        setYears]        = useState(shared?.years      ?? 15);
  const [lump,         setLump]         = useState(shared?.lump       ?? 0);
  const [vehicleIdx,   setVehicleIdx]   = useState(shared?.vehicleIdx ?? 1);
  const [rateOverride, setRateOverride] = useState<number | null>(shared?.rate != null ? shared.rate : null);
  const [escalation,   setEscalation]   = useState(shared?.escalation ?? 0);
  const [inflation,    setInflation]    = useState(shared?.inflation  ?? 5.5);

  const vehicle = VEHICLES[vehicleIdx];
  const rate    = rateOverride ?? vehicle.rate;

  const result = useMemo(() => {
    if (mode === 'target') {
      const pmt = findMonthly(target, years, rate, lump, escalation);
      const { chartData, finalBalance } = simulate(pmt, years, rate, lump, escalation);
      const totalContrib = chartData[chartData.length - 1]?.contributed ?? 0;
      const totalReturns = finalBalance - totalContrib;
      const realValue    = target / Math.pow(1 + inflation / 100, years);
      const milestones   = getMilestones(pmt, years, rate, lump, escalation);
      return { pmt, finalBalance, totalContrib, totalReturns, realValue, chartData, milestones };
    } else {
      const { chartData, finalBalance } = simulate(monthly, years, rate, lump, escalation);
      const totalContrib = chartData[chartData.length - 1]?.contributed ?? 0;
      const totalReturns = finalBalance - totalContrib;
      const realValue    = finalBalance / Math.pow(1 + inflation / 100, years);
      const milestones   = getMilestones(monthly, years, rate, lump, escalation);
      return { pmt: monthly, finalBalance, totalContrib, totalReturns, realValue, chartData, milestones };
    }
  }, [mode, target, monthly, years, lump, rate, escalation, inflation]);

  const displayPMT           = result.pmt;
  const tfsaMonthlyBreached  = vehicle.tfsa && displayPMT > TFSA_MONTHLY_LIMIT;
  const tfsaLifetimeBreached = vehicle.tfsa && result.totalContrib > TFSA_LIFETIME_CAP;

  const startLaterPenalty = useMemo(() => {
    if (mode !== 'target') return null;
    const pmtLater = findMonthly(target, Math.max(1, years - 2), rate, lump, escalation);
    return pmtLater - result.pmt;
  }, [mode, target, years, rate, lump, escalation, result.pmt]);

  // Scenario comparison — memoised to avoid re-running 3×binary-search on every keystroke
  const scenarios = useMemo(() => [
    { label: 'Conservative', r: Math.max(1, rate - 2), color: 'var(--note-orange)' },
    { label: 'Current',      r: rate,                  color: 'var(--note-blue)' },
    { label: 'Aggressive',   r: rate + 2,             color: 'var(--gain)' },
  ].map(({ label, r, color }) => {
    const pmt = mode === 'target'
      ? findMonthly(target, years, r, lump, escalation)
      : monthly;
    const { finalBalance } = simulate(pmt, years, r, lump, escalation);
    const realVal = (mode === 'target' ? target : finalBalance) / Math.pow(1 + inflation / 100, years);
    return { label, r, color, pmt, finalBalance, realVal };
  }), [mode, target, monthly, years, rate, lump, escalation, inflation]);

  const errors = {
    target: positiveError(target, 'Enter the amount you want to reach.'),
    monthly: positiveError(monthly, 'Enter the amount you can save each month.'),
    years: rangeError(years, 1, 50, 'a number of years', ''),
    lump: nonNegativeError(lump),
    rate: rangeError(rate, 0, 50, 'a return', '%'),
    escalation: rangeError(escalation, 0, 30, 'a yearly increase', '%'),
    inflation: rangeError(inflation, 0, 20, 'inflation', '%'),
  };
  const blocked = (mode === 'target' ? errors.target : errors.monthly) ?? errors.years ?? errors.lump ?? errors.rate ?? errors.escalation;

  const shareState: ShareState = {
    mode, target, monthly, years, lump,
    vehicleIdx, rate, escalation, inflation,
  };

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: alpha(C.blue, 13) }}>
            <Target size={22} style={{ color: textTone(C.blue) }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>Wealth Target Planner</h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              How much do you need to save to reach your goal?
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--rule)' }}>
        {(['target', 'monthly'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
            style={{
              background: mode === m ? C.blue : 'transparent',
              color:      mode === m ? 'var(--on-accent)'   : 'var(--ink-muted)',
            }}
          >
            <ArrowLeftRight size={14} />
            {m === 'target' ? 'Target amount → Monthly needed' : 'Monthly amount → Final value'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div
          className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            Inputs
          </h2>

          {mode === 'target' ? (
            <InputField id="wtp-target" label="Target amount (R)" value={target} error={errors.target}
              onChange={(v) => setTarget(Number(v))} prefix="R" min={1} />
          ) : (
            <InputField id="wtp-monthly" label="Monthly contribution (R)" value={monthly} error={errors.monthly}
              onChange={(v) => setMonthly(Number(v))} prefix="R" min={1} />
          )}

          <InputField id="wtp-years" label="Years to goal" value={years} error={errors.years}
            onChange={(v) => setYears(Number(v))} suffix="yrs" min={1} max={50} />

          <InputField id="wtp-lump" label="Existing savings / lump sum (R)" value={lump} error={errors.lump}
            onChange={(v) => setLump(Number(v))} prefix="R" min={0} />

          <SelectField
            id="wtp-vehicle"
            label="Investment vehicle"
            value={String(vehicleIdx)}
            onChange={(v) => { setVehicleIdx(Number(v)); setRateOverride(null); }}
            options={VEHICLES.map((v, i) => ({ value: String(i), label: v.label }))}
          />

          <div>
            <InputField
              id="wtp-rate"
              label={`Annual return rate (${vehicle.rate}% default)`}
              value={rateOverride ?? vehicle.rate}
              error={errors.rate}
              onChange={(v) => setRateOverride(Number(v))}
              suffix="%" min={0} max={50}
            />
            <button
              className="mt-1 text-xs"
              style={{ color: textTone(C.blue) }}
              onClick={() => setRateOverride(null)}
            >
              Reset to preset
            </button>
          </div>

          <InputField id="wtp-esc" label="Annual contribution escalation" value={escalation} error={errors.escalation}
            onChange={(v) => setEscalation(Number(v))} suffix="%" min={0} max={30} />

          <InputField id="wtp-infl" label="Inflation rate (for real value)" value={inflation} error={errors.inflation}
            onChange={(v) => setInflation(Number(v))} suffix="%" min={0} max={20} />
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <ResultPanel
            label={mode === 'target' ? 'Save each month' : `Value after ${years} years`}
            value={formatRand(mode === 'target' ? displayPMT : result.finalBalance, 0)}
            blocked={blocked}
            summary={<>
              {mode === 'target'
                ? `Saving ${formatRand(displayPMT, 0)} a month${escalation > 0 ? `, rising ${escalation}% a year,` : ''} for ${years} years at ${rate}% a year reaches ${formatRand(target, 0)}.`
                : `Saving ${formatRand(monthly, 0)} a month${escalation > 0 ? `, rising ${escalation}% a year,` : ''} for ${years} years at ${rate}% a year grows to ${formatRand(result.finalBalance, 0)}.`}
              {` That is worth about ${formatRand(result.realValue, 0)} in today’s money.`}
              {startLaterPenalty != null && startLaterPenalty > 0 && ` Starting 2 years later would mean saving ${formatRand(startLaterPenalty, 0)} more a month.`}
              {tfsaMonthlyBreached && ` That is more than the TFSA limit of ${formatRand(TFSA_ANNUAL_LIMIT, 0)} a year, so part would need another account.`}
              {tfsaLifetimeBreached && ` Your contributions of ${formatRand(result.totalContrib, 0)} pass the TFSA lifetime limit of ${formatRand(TFSA_LIFETIME_CAP, 0)}.`}
            </>}
            figures={[
              { label: 'You put in', value: formatRand(result.totalContrib, 0) },
              { label: 'Growth', value: formatRand(result.totalReturns, 0) },
              { label: 'In today’s money', value: formatRand(result.realValue, 0) },
              mode === 'target'
                ? { label: 'Wait 2 years and save', value: startLaterPenalty != null && startLaterPenalty > 0 ? `${formatRand(startLaterPenalty, 0)} more` : 'The same' }
                : { label: 'Return used', value: `${rate}% a year` },
            ]}
          />

          {/* Chart */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
              Growth over {years} years
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={result.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wtp-contrib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.brown} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C.brown} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="wtp-returns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.blue} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={C.blue} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  tickFormatter={(v) => `Yr ${v}`} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  tickFormatter={formatRandShort} width={64} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [formatRand(Number(val)), '']}
                  labelFormatter={(l) => `Year ${l}`}
                  cursor={{ stroke: alpha(C.blue, 33), strokeWidth: 1 }}
                />
                {mode === 'target' && (
                  <ReferenceLine y={target} stroke={C.green} strokeDasharray="5 3"
                    label={{ value: 'Target', fill: C.green, fontSize: 11, position: 'insideTopRight' }} />
                )}
                <Area type="monotone" dataKey="contributed" name="Contributions" stackId="1"
                  stroke={C.brown} fill="url(#wtp-contrib)" strokeWidth={2} />
                <Area type="monotone" dataKey="returns" name="Returns" stackId="1"
                  stroke={C.blue} fill="url(#wtp-returns)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario comparison — data memoised above to avoid keystroke jank */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              Scenario comparison
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
              Conservative (-2%), Current, Aggressive (+2%) return rates
            </p>
            <div className="grid grid-cols-3 gap-3">
              {scenarios.map(({ label, r, color, pmt, finalBalance, realVal }) => (
                <div key={label} className="p-3 rounded-xl text-xs"
                  style={{ background: alpha(color, 7), border: `1px solid ${alpha(color, 20)}` }}>
                  <div className="font-semibold mb-2" style={{ color: textTone(color) }}>{label} ({r}%)</div>
                  {mode === 'target' ? (
                    <>
                      <div style={{ color: 'var(--ink-muted)' }}>Monthly needed</div>
                      <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>
                        {formatRand(pmt)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: 'var(--ink-muted)' }}>Final value</div>
                      <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>
                        {formatRandShort(finalBalance)}
                      </div>
                    </>
                  )}
                  <div className="mt-1" style={{ color: 'var(--ink-muted)' }}>Real value</div>
                  <div className="font-medium mt-0.5" style={{ color: 'var(--ink)' }}>
                    {formatRandShort(realVal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          {result.milestones.length > 0 && (
            <div className="p-5 rounded-2xl"
              style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
                Milestones reached
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {result.milestones.map((m) => (
                  <div key={m.amount} className="flex items-center gap-2 p-3 rounded-xl text-sm"
                    style={{ background: alpha(C.green, 7), border: `1px solid ${alpha(C.green, 20)}` }}>
                    <CheckCircle2 size={14} style={{ color: textTone(C.green) }} />
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--ink)' }}>
                        {formatRandShort(m.amount)}
                      </div>
                      <div style={{ color: 'var(--ink-muted)', fontSize: 11 }}>Year {m.year}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AssumptionsDrawer
            items={[
              <>The return of {rate}% a year is added monthly and stays the same. It is not guaranteed.</>,
              <>Contributions go in at the end of each month{escalation > 0 ? ` and rise by ${escalation}% at the start of each year` : ''}.</>,
              <>“Today’s money” takes off inflation of {inflation}% a year.</>,
              vehicle.tfsa
                ? <>A tax-free savings account has limits of {formatRand(TFSA_ANNUAL_LIMIT, 0)} a year and {formatRand(TFSA_LIFETIME_CAP, 0)} in a lifetime. Going over them costs 40% tax on the excess.</>
                : <>Tax on interest, dividends and capital gains is not included.</>,
              <>Fees are not included.</>,
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
}
