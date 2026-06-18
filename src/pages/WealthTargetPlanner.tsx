import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Target, TrendingUp, AlertTriangle, Info, ArrowLeftRight,
  CheckCircle2, Clock,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { readShareParam } from '../utils/share';

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
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
    { label: 'Conservative', r: Math.max(1, rate - 2), color: '#F59E0B' },
    { label: 'Current',      r: rate,                  color: '#6366F1' },
    { label: 'Aggressive',   r: rate + 2,             color: '#10B981' },
  ].map(({ label, r, color }) => {
    const pmt = mode === 'target'
      ? findMonthly(target, years, r, lump, escalation)
      : monthly;
    const { finalBalance } = simulate(pmt, years, r, lump, escalation);
    const realVal = (mode === 'target' ? target : finalBalance) / Math.pow(1 + inflation / 100, years);
    return { label, r, color, pmt, finalBalance, realVal };
  }), [mode, target, monthly, years, rate, lump, escalation, inflation]);

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
          <div className="p-2.5 rounded-xl" style={{ background: `${C.indigo}22` }}>
            <Target size={22} style={{ color: C.indigo }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Wealth Target Planner</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              How much do you need to save to reach your goal?
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
        {(['target', 'monthly'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
            style={{
              background: mode === m ? C.indigo : 'transparent',
              color:      mode === m ? '#fff'   : 'var(--color-text-muted)',
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
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Inputs
          </h2>

          {mode === 'target' ? (
            <InputField id="wtp-target" label="Target amount (R)" value={target}
              onChange={(v) => setTarget(Number(v))} prefix="R" min={1} />
          ) : (
            <InputField id="wtp-monthly" label="Monthly contribution (R)" value={monthly}
              onChange={(v) => setMonthly(Number(v))} prefix="R" min={1} />
          )}

          <InputField id="wtp-years" label="Years to goal" value={years}
            onChange={(v) => setYears(Number(v))} suffix="yrs" min={1} max={50} />

          <InputField id="wtp-lump" label="Existing savings / lump sum (R)" value={lump}
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
              onChange={(v) => setRateOverride(Number(v))}
              suffix="%" min={0} max={50}
            />
            <button
              className="mt-1 text-xs"
              style={{ color: C.indigo }}
              onClick={() => setRateOverride(null)}
            >
              Reset to preset
            </button>
          </div>

          <InputField id="wtp-esc" label="Annual contribution escalation" value={escalation}
            onChange={(v) => setEscalation(Number(v))} suffix="%" min={0} max={30} />

          <InputField id="wtp-infl" label="Inflation rate (for real value)" value={inflation}
            onChange={(v) => setInflation(Number(v))} suffix="%" min={0} max={20} />
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {tfsaMonthlyBreached && (
            <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
              style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}44` }}>
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} />
              <span style={{ color: 'var(--color-text-muted)' }}>
                Required monthly of {formatRand(displayPMT)} exceeds the TFSA annual limit of R46,000
                (R3,833/month). Consider splitting between TFSA and a unit trust.
              </span>
            </div>
          )}
          {tfsaLifetimeBreached && (
            <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
              style={{ background: `${C.red}11`, border: `1px solid ${C.red}44` }}>
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.red }} />
              <span style={{ color: 'var(--color-text-muted)' }}>
                Total contributions of {formatRandShort(result.totalContrib)} exceed the TFSA lifetime cap of R500,000.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {mode === 'target' ? (
              <StatCard label="Monthly needed"        value={formatRand(displayPMT)}            color="indigo"  icon={TrendingUp} />
            ) : (
              <StatCard label="Final value"           value={formatRandShort(result.finalBalance)} color="indigo"  icon={TrendingUp} />
            )}
            <StatCard label="Real value (today's R)"  value={formatRandShort(result.realValue)}  color="emerald" icon={Info} />
            <StatCard label="Your contributions"      value={formatRandShort(result.totalContrib)} color="indigo"  icon={TrendingUp} />
            <StatCard label="Returns (compounding)"   value={formatRandShort(result.totalReturns)} color="emerald" icon={TrendingUp} />
          </div>

          {startLaterPenalty != null && startLaterPenalty > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
              style={{ background: `${C.red}11`, border: `1px solid ${C.red}33` }}>
              <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.red }} />
              <span style={{ color: 'var(--color-text-muted)' }}>
                If you wait 2 years to start, you would need{' '}
                <span style={{ color: C.red, fontWeight: 600 }}>{formatRand(startLaterPenalty)} more per month</span>
                {' '}to reach the same target.
              </span>
            </div>
          )}

          {/* Chart */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
              Growth over {years} years
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={result.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wtp-contrib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.violet} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C.violet} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="wtp-returns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={C.indigo} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  tickFormatter={(v) => `Yr ${v}`} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  tickFormatter={formatRandShort} width={64} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [formatRand(Number(val)), '']}
                  labelFormatter={(l) => `Year ${l}`}
                  cursor={{ stroke: `${C.indigo}55`, strokeWidth: 1 }}
                />
                {mode === 'target' && (
                  <ReferenceLine y={target} stroke={C.emerald} strokeDasharray="5 3"
                    label={{ value: 'Target', fill: C.emerald, fontSize: 11, position: 'insideTopRight' }} />
                )}
                <Area type="monotone" dataKey="contributed" name="Contributions" stackId="1"
                  stroke={C.violet} fill="url(#wtp-contrib)" strokeWidth={2} />
                <Area type="monotone" dataKey="returns" name="Returns" stackId="1"
                  stroke={C.indigo} fill="url(#wtp-returns)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario comparison — data memoised above to avoid keystroke jank */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              Scenario comparison
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Conservative (-2%), Current, Aggressive (+2%) return rates
            </p>
            <div className="grid grid-cols-3 gap-3">
              {scenarios.map(({ label, r, color, pmt, finalBalance, realVal }) => (
                <div key={label} className="p-3 rounded-xl text-xs"
                  style={{ background: `${color}11`, border: `1px solid ${color}33` }}>
                  <div className="font-semibold mb-2" style={{ color }}>{label} ({r}%)</div>
                  {mode === 'target' ? (
                    <>
                      <div style={{ color: 'var(--color-text-muted)' }}>Monthly needed</div>
                      <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
                        {formatRand(pmt)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: 'var(--color-text-muted)' }}>Final value</div>
                      <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
                        {formatRandShort(finalBalance)}
                      </div>
                    </>
                  )}
                  <div className="mt-1" style={{ color: 'var(--color-text-muted)' }}>Real value</div>
                  <div className="font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>
                    {formatRandShort(realVal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          {result.milestones.length > 0 && (
            <div className="p-5 rounded-2xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                Milestones reached
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {result.milestones.map((m) => (
                  <div key={m.amount} className="flex items-center gap-2 p-3 rounded-xl text-sm"
                    style={{ background: `${C.emerald}11`, border: `1px solid ${C.emerald}33` }}>
                    <CheckCircle2 size={14} style={{ color: C.emerald }} />
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--color-text)' }}>
                        {formatRandShort(m.amount)}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Year {m.year}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
