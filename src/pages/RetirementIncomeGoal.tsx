import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Sunset, TrendingUp, Info, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { readShareParam } from '../utils/share';
import { calcRetirementIncomeGoal, simulateRetirementSavings, findRequiredMonthly } from '../utils/retirementIncome';

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
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
  { swr: 0.03,  label: '3% SWR',   sub: 'Very conservative' },
  { swr: 0.035, label: '3.5% SWR', sub: 'Conservative' },
  { swr: 0.04,  label: '4% SWR',   sub: 'Traditional FIRE rule' },
];

interface ShareState {
  currentAge:             number;
  retirementAge:          number;
  desiredMonthlyIncome:   number;
  swr:                    number;
  currentSavings:         number;
  annualReturnPercent:    number;
  annualInflationPercent: number;
  contributionEscalation: number;
}

export function RetirementIncomeGoal() {
  const shared = readShareParam<ShareState>();

  const [currentAge,             setCurrentAge]             = useState(shared?.currentAge             ?? 30);
  const [retirementAge,          setRetirementAge]          = useState(shared?.retirementAge          ?? 50);
  const [desiredMonthlyIncome,   setDesiredMonthlyIncome]   = useState(shared?.desiredMonthlyIncome    ?? 100_000);
  const [swr,                    setSwr]                    = useState(shared?.swr                    ?? 0.04);
  const [currentSavings,         setCurrentSavings]         = useState(shared?.currentSavings          ?? 0);
  const [annualReturnPercent,    setAnnualReturnPercent]    = useState(shared?.annualReturnPercent     ?? 11);
  const [annualInflationPercent, setAnnualInflationPercent] = useState(shared?.annualInflationPercent  ?? 5.5);
  const [contributionEscalation, setContributionEscalation] = useState(shared?.contributionEscalation  ?? 0);

  const inputs = {
    currentAge, retirementAge, desiredMonthlyIncome, swr,
    currentSavings, annualReturnPercent, annualInflationPercent, contributionEscalation,
  };

  const result = useMemo(() => calcRetirementIncomeGoal(inputs), [
    currentAge, retirementAge, desiredMonthlyIncome, swr,
    currentSavings, annualReturnPercent, annualInflationPercent, contributionEscalation,
  ]);

  const retirementNotInFuture = retirementAge <= currentAge;

  // "Start later" penalty — reusing the binary-search solver at years-2
  const startLaterPenalty = useMemo(() => {
    const pmtLater = findRequiredMonthly(
      result.lumpSumTarget, Math.max(1, result.years - 2), annualReturnPercent, currentSavings, contributionEscalation,
    );
    return pmtLater - result.requiredMonthly;
  }, [result.lumpSumTarget, result.years, annualReturnPercent, currentSavings, contributionEscalation, result.requiredMonthly]);

  // Scenario comparison — memoised to avoid re-running 3x binary-search on every keystroke
  const scenarios = useMemo(() => [
    { label: 'Conservative', r: Math.max(1, annualReturnPercent - 2), color: C.amber },
    { label: 'Current',      r: annualReturnPercent,                  color: C.indigo },
    { label: 'Aggressive',   r: annualReturnPercent + 2,               color: C.emerald },
  ].map(({ label, r, color }) => {
    const pmt = findRequiredMonthly(result.lumpSumTarget, result.years, r, currentSavings, contributionEscalation);
    const { finalBalance } = simulateRetirementSavings(pmt, result.years, r, currentSavings, contributionEscalation);
    return { label, r, color, pmt, finalBalance };
  }), [result.lumpSumTarget, result.years, annualReturnPercent, currentSavings, contributionEscalation]);

  const shareState: ShareState = {
    currentAge, retirementAge, desiredMonthlyIncome, swr,
    currentSavings, annualReturnPercent, annualInflationPercent, contributionEscalation,
  };

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${C.amber}22` }}>
            <Sunset size={22} style={{ color: C.amber }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Retirement Income Goal</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Want a certain income after you retire? See exactly how much to invest monthly to get there.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      {retirementNotInFuture && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
          style={{ background: `${C.red}11`, border: `1px solid ${C.red}44` }}>
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.red }} />
          <span style={{ color: 'var(--color-text-muted)' }}>
            Retirement age must be after your current age — using 1 year for this calculation.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div
          className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Your goal
          </h2>

          <InputField id="rig-age" label="Your current age" value={currentAge}
            onChange={(v) => setCurrentAge(Number(v))} suffix="yrs" min={1} max={100} />

          <InputField id="rig-retire-age" label="Target retirement age" value={retirementAge}
            onChange={(v) => setRetirementAge(Number(v))} suffix="yrs" min={1} max={100} />

          <InputField id="rig-income" label="Desired monthly income (today's R)" value={desiredMonthlyIncome}
            onChange={(v) => setDesiredMonthlyIncome(Number(v))} prefix="R" min={0} />

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Safe withdrawal rate
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {SWR_OPTIONS.map((opt) => (
                <button
                  key={opt.swr}
                  onClick={() => setSwr(opt.swr)}
                  className="py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: swr === opt.swr ? C.indigo : `${C.indigo}11`,
                    color:      swr === opt.swr ? '#fff'   : C.indigo,
                  }}
                  title={opt.sub}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <InputField id="rig-savings" label="Current retirement savings (R)" value={currentSavings}
            onChange={(v) => setCurrentSavings(Number(v))} prefix="R" min={0} />

          <InputField id="rig-return" label="Expected annual return" value={annualReturnPercent}
            onChange={(v) => setAnnualReturnPercent(Number(v))} suffix="%" min={0} max={50} />

          <InputField id="rig-inflation" label="Inflation rate" value={annualInflationPercent}
            onChange={(v) => setAnnualInflationPercent(Number(v))} suffix="%" min={0} max={20} />

          <InputField id="rig-escalation" label="Annual contribution escalation" value={contributionEscalation}
            onChange={(v) => setContributionEscalation(Number(v))} suffix="%" min={0} max={30}
            help="Increase your monthly contribution each year, e.g. with salary growth" />

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${C.indigo}11`, border: `1px solid ${C.indigo}22` }}>
            <Info size={13} style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              We inflate your desired income to retirement-year Rands, convert it to a nest egg using your
              chosen safe withdrawal rate, then solve for the monthly contribution needed to get there.
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Monthly investment needed" value={formatRand(result.requiredMonthly)} color="indigo" icon={TrendingUp} />
            <StatCard label="Nest egg needed at retirement" value={formatRandShort(result.lumpSumTarget)} color="emerald" icon={Sunset} />
            <StatCard label="Your contributions" value={formatRandShort(result.totalContrib)} color="indigo" icon={TrendingUp} />
            <StatCard label="Returns (compounding)" value={formatRandShort(result.totalReturns)} color="emerald" icon={TrendingUp} />
          </div>

          <div className="p-4 rounded-xl text-sm"
            style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}33` }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              To draw {formatRand(desiredMonthlyIncome)}/month in today's Rands from age {retirementAge}, you'll need a nest egg of{' '}
              <span style={{ color: C.amber, fontWeight: 600 }}>{formatRandShort(result.lumpSumTarget)}</span>
              {' '}by then ({formatRandShort(result.realLumpSumTarget)} in today's Rands) — that takes{' '}
              <span style={{ color: C.amber, fontWeight: 600 }}>{formatRand(result.requiredMonthly)}/month</span>
              {' '}invested over the next {result.years} years at {annualReturnPercent}% p.a.
            </span>
          </div>

          {startLaterPenalty > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
              style={{ background: `${C.red}11`, border: `1px solid ${C.red}33` }}>
              <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.red }} />
              <span style={{ color: 'var(--color-text-muted)' }}>
                If you wait 2 years to start, you would need{' '}
                <span style={{ color: C.red, fontWeight: 600 }}>{formatRand(startLaterPenalty)} more per month</span>
                {' '}to reach the same nest egg.
              </span>
            </div>
          )}

          {/* Chart */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
              Growth over {result.years} years
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={result.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rig-contrib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.violet} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C.violet} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="rig-returns" x1="0" y1="0" x2="0" y2="1">
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
                <ReferenceLine y={result.lumpSumTarget} stroke={C.emerald} strokeDasharray="5 3"
                  label={{ value: 'Nest egg target', fill: C.emerald, fontSize: 11, position: 'insideTopRight' }} />
                <Area type="monotone" dataKey="contributed" name="Contributions" stackId="1"
                  stroke={C.violet} fill="url(#rig-contrib)" strokeWidth={2} />
                <Area type="monotone" dataKey="returns" name="Returns" stackId="1"
                  stroke={C.indigo} fill="url(#rig-returns)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Drawdown sustainability */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              Will it last? Drawdown simulation
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Withdrawing {formatRandShort(result.futureAnnualIncome / 12)}/month (inflation-adjusted) from age {retirementAge}, while the balance keeps growing at {annualReturnPercent}% p.a.
            </p>
            <div className="flex items-start gap-3 p-3 rounded-xl text-sm mb-4"
              style={{
                background: result.depletionAge ? `${C.red}11` : `${C.emerald}11`,
                border: `1px solid ${result.depletionAge ? C.red : C.emerald}33`,
              }}>
              {result.depletionAge ? (
                <>
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: C.red }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    At this withdrawal rate and return, the nest egg runs out at age{' '}
                    <span style={{ color: C.red, fontWeight: 600 }}>{result.depletionAge}</span>. Consider a lower
                    SWR, a higher return, or a smaller desired income.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" style={{ color: C.emerald }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    The nest egg sustains this income for at least {result.drawdown.length} years into retirement
                    (to around age {retirementAge + result.drawdown.length}).
                  </span>
                </>
              )}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={result.drawdown} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rig-drawdown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.amber} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C.amber} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  tickFormatter={(v) => `Age ${v}`} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  tickFormatter={formatRandShort} width={64} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [formatRand(Number(val)), 'Balance']}
                  labelFormatter={(l) => `Age ${l}`}
                  cursor={{ stroke: `${C.amber}55`, strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="balance" name="Balance" stroke={C.amber} fill="url(#rig-drawdown)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario comparison */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              Scenario comparison
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Conservative (-2%), Current, Aggressive (+2%) return rates — same nest egg target
            </p>
            <div className="grid grid-cols-3 gap-3">
              {scenarios.map(({ label, r, color, pmt }) => (
                <div key={label} className="p-3 rounded-xl text-xs"
                  style={{ background: `${color}11`, border: `1px solid ${color}33` }}>
                  <div className="font-semibold mb-2" style={{ color }}>{label} ({r}%)</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Monthly needed</div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
                    {formatRand(pmt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${C.indigo}11`, border: `1px solid ${C.indigo}22` }}>
            <Info size={13} style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              For a different framing of the same retirement question, see the FIRE Calculator (target a
              retirement age from a savings rate) or Wealth Target Planner (target a Rand lump sum directly).
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
