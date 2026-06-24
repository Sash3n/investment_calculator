import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Sunset, TrendingUp, Info, AlertTriangle, Clock, CheckCircle2, ArrowLeftRight } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { readShareParam } from '../utils/share';
import {
  calcRetirementIncomeGoal, calcRetirementAffordability,
  simulateRetirementSavings, findRequiredMonthly,
} from '../utils/retirementIncome';

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
  mode:                   string;
  currentAge:             number;
  retirementAge:          number;
  desiredMonthlyIncome:   number;
  currentMonthlyIncome:   number;
  savingsRatePercent:     number;
  swr:                    number;
  currentSavings:         number;
  annualReturnPercent:    number;
  annualInflationPercent: number;
  contributionEscalation: number;
}

export function RetirementIncomeGoal() {
  const shared = readShareParam<ShareState>();

  const [mode,                   setMode]                   = useState<'income' | 'afford'>(shared?.mode as 'income' | 'afford' ?? 'income');
  const [currentAge,             setCurrentAge]             = useState(shared?.currentAge             ?? 30);
  const [retirementAge,          setRetirementAge]          = useState(shared?.retirementAge          ?? 50);
  const [desiredMonthlyIncome,   setDesiredMonthlyIncome]   = useState(shared?.desiredMonthlyIncome    ?? 100_000);
  const [currentMonthlyIncome,   setCurrentMonthlyIncome]   = useState(shared?.currentMonthlyIncome    ?? 50_000);
  const [savingsRatePercent,     setSavingsRatePercent]     = useState(shared?.savingsRatePercent      ?? 15);
  const [swr,                    setSwr]                    = useState(shared?.swr                    ?? 0.04);
  const [currentSavings,         setCurrentSavings]         = useState(shared?.currentSavings          ?? 0);
  const [annualReturnPercent,    setAnnualReturnPercent]    = useState(shared?.annualReturnPercent     ?? 11);
  const [annualInflationPercent, setAnnualInflationPercent] = useState(shared?.annualInflationPercent  ?? 5.5);
  const [contributionEscalation, setContributionEscalation] = useState(shared?.contributionEscalation  ?? 0);

  const incomeResult = useMemo(() => calcRetirementIncomeGoal({
    currentAge, retirementAge, desiredMonthlyIncome, swr,
    currentSavings, annualReturnPercent, annualInflationPercent, contributionEscalation,
  }), [
    currentAge, retirementAge, desiredMonthlyIncome, swr,
    currentSavings, annualReturnPercent, annualInflationPercent, contributionEscalation,
  ]);

  const affordResult = useMemo(() => calcRetirementAffordability({
    currentAge, retirementAge, currentMonthlyIncome, savingsRatePercent, swr,
    currentSavings, annualReturnPercent, annualInflationPercent, contributionEscalation,
  }), [
    currentAge, retirementAge, currentMonthlyIncome, savingsRatePercent, swr,
    currentSavings, annualReturnPercent, annualInflationPercent, contributionEscalation,
  ]);

  // Fields shared by the chart/drawdown sections regardless of mode
  const years       = mode === 'income' ? incomeResult.years       : affordResult.years;
  const chartData   = mode === 'income' ? incomeResult.chartData   : affordResult.chartData;
  const totalContrib = mode === 'income' ? incomeResult.totalContrib : affordResult.totalContrib;
  const totalReturns = mode === 'income' ? incomeResult.totalReturns : affordResult.totalReturns;
  const nestEgg      = mode === 'income' ? incomeResult.lumpSumTarget : affordResult.finalBalance;
  const drawdown     = mode === 'income' ? incomeResult.drawdown     : affordResult.drawdown;
  const depletionAge = mode === 'income' ? incomeResult.depletionAge : affordResult.depletionAge;
  const monthlyWithdrawalFuture = mode === 'income'
    ? incomeResult.futureAnnualIncome / 12
    : affordResult.achievableMonthlyIncomeFuture;

  const retirementNotInFuture = retirementAge <= currentAge;

  // "Start later" effect: cost of waiting 2 years, framed per mode
  const startLaterEffect = useMemo(() => {
    if (mode === 'income') {
      const pmtLater = findRequiredMonthly(
        incomeResult.lumpSumTarget, Math.max(1, incomeResult.years - 2), annualReturnPercent, currentSavings, contributionEscalation,
      );
      return pmtLater - incomeResult.requiredMonthly;
    }
    const yearsLater = Math.max(1, affordResult.years - 2);
    const { finalBalance } = simulateRetirementSavings(
      affordResult.monthlyContribution, yearsLater, annualReturnPercent, currentSavings, contributionEscalation,
    );
    const infR = annualInflationPercent / 100;
    // Retirement date doesn't move — deflate by the original distance from today to retirement,
    // not by the shrunk accumulation window (yearsLater), or this understates the penalty.
    const incomeLaterToday = (finalBalance * swr / 12) / Math.pow(1 + infR, affordResult.years);
    return affordResult.achievableMonthlyIncomeToday - incomeLaterToday;
  }, [
    mode, incomeResult.lumpSumTarget, incomeResult.years, incomeResult.requiredMonthly,
    affordResult.years, affordResult.monthlyContribution, affordResult.achievableMonthlyIncomeToday,
    annualReturnPercent, currentSavings, contributionEscalation, swr, annualInflationPercent,
  ]);

  // Scenario comparison — memoised to avoid re-running the solver/simulation on every keystroke
  const scenarios = useMemo(() => [
    { label: 'Conservative', r: Math.max(1, annualReturnPercent - 2), color: C.amber },
    { label: 'Current',      r: annualReturnPercent,                  color: C.indigo },
    { label: 'Aggressive',   r: annualReturnPercent + 2,               color: C.emerald },
  ].map(({ label, r, color }) => {
    if (mode === 'income') {
      const pmt = findRequiredMonthly(incomeResult.lumpSumTarget, incomeResult.years, r, currentSavings, contributionEscalation);
      return { label, r, color, value: pmt };
    }
    const { finalBalance } = simulateRetirementSavings(
      affordResult.monthlyContribution, affordResult.years, r, currentSavings, contributionEscalation,
    );
    const infR = annualInflationPercent / 100;
    const value = (finalBalance * swr / 12) / Math.pow(1 + infR, affordResult.years);
    return { label, r, color, value };
  }), [
    mode, incomeResult.lumpSumTarget, incomeResult.years,
    affordResult.monthlyContribution, affordResult.years,
    annualReturnPercent, currentSavings, contributionEscalation, swr, annualInflationPercent,
  ]);

  const shareState: ShareState = {
    mode, currentAge, retirementAge, desiredMonthlyIncome, currentMonthlyIncome, savingsRatePercent, swr,
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
              Set a retirement income goal and find the monthly investment — or see what income your current savings rate can afford.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
        {(['income', 'afford'] as const).map((m) => (
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
            {m === 'income' ? 'I know my desired income' : 'I know what I can afford'}
          </button>
        ))}
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

          {mode === 'income' ? (
            <InputField id="rig-income" label="Desired monthly income (today's R)" value={desiredMonthlyIncome}
              onChange={(v) => setDesiredMonthlyIncome(Number(v))} prefix="R" min={0} />
          ) : (
            <>
              <InputField id="rig-current-income" label="Your current monthly income (R)" value={currentMonthlyIncome}
                onChange={(v) => setCurrentMonthlyIncome(Number(v))} prefix="R" min={0} />
              <InputField id="rig-savings-rate" label="% of income you can invest monthly" value={savingsRatePercent}
                onChange={(v) => setSavingsRatePercent(Number(v))} suffix="%" min={0} max={100} />
            </>
          )}

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
              {mode === 'income'
                ? "We inflate your desired income to retirement-year Rands, convert it to a nest egg using your chosen safe withdrawal rate, then solve for the monthly contribution needed to get there."
                : 'We grow your monthly contribution to a nest egg at retirement, then convert it back to a monthly income using your chosen safe withdrawal rate.'}
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {mode === 'income' ? (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Monthly investment needed" value={formatRand(incomeResult.requiredMonthly)} color="indigo" icon={TrendingUp} />
              <StatCard label="Nest egg needed at retirement" value={formatRandShort(incomeResult.lumpSumTarget)} color="emerald" icon={Sunset} />
              <StatCard label="Your contributions" value={formatRandShort(totalContrib)} color="indigo" icon={TrendingUp} />
              <StatCard label="Returns (compounding)" value={formatRandShort(totalReturns)} color="emerald" icon={TrendingUp} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Achievable income (today's R)" value={formatRand(affordResult.achievableMonthlyIncomeToday)} color="indigo" icon={TrendingUp} />
              <StatCard label="Income replacement" value={`${affordResult.incomeReplacementPct.toFixed(0)}%`} color="amber" icon={Sunset} />
              <StatCard label="Monthly investment" value={formatRand(affordResult.monthlyContribution)} color="indigo" icon={TrendingUp} />
              <StatCard label="Nest egg at retirement" value={formatRandShort(affordResult.finalBalance)} color="emerald" icon={Sunset} />
            </div>
          )}

          {mode === 'income' ? (
            <div className="p-4 rounded-xl text-sm"
              style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}33` }}>
              <span style={{ color: 'var(--color-text-muted)' }}>
                To draw {formatRand(desiredMonthlyIncome)}/month in today's Rands from age {retirementAge}, you'll need a nest egg of{' '}
                <span style={{ color: C.amber, fontWeight: 600 }}>{formatRandShort(incomeResult.lumpSumTarget)}</span>
                {' '}by then ({formatRandShort(incomeResult.realLumpSumTarget)} in today's Rands) — that takes{' '}
                <span style={{ color: C.amber, fontWeight: 600 }}>{formatRand(incomeResult.requiredMonthly)}/month</span>
                {' '}invested over the next {incomeResult.years} years at {annualReturnPercent}% p.a.
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl text-sm"
              style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}33` }}>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Investing {savingsRatePercent}% of your {formatRand(currentMonthlyIncome)}/month income (
                <span style={{ color: C.amber, fontWeight: 600 }}>{formatRand(affordResult.monthlyContribution)}/month</span>
                ) from age {currentAge} to {retirementAge} builds a nest egg of{' '}
                <span style={{ color: C.amber, fontWeight: 600 }}>{formatRandShort(affordResult.finalBalance)}</span>
                {' '}— enough to support{' '}
                <span style={{ color: C.amber, fontWeight: 600 }}>{formatRand(affordResult.achievableMonthlyIncomeToday)}/month</span>
                {' '}in today's Rands, {affordResult.incomeReplacementPct.toFixed(0)}% of your current income.
              </span>
            </div>
          )}

          {startLaterEffect > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
              style={{ background: `${C.red}11`, border: `1px solid ${C.red}33` }}>
              <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.red }} />
              <span style={{ color: 'var(--color-text-muted)' }}>
                {mode === 'income' ? (
                  <>
                    If you wait 2 years to start, you would need{' '}
                    <span style={{ color: C.red, fontWeight: 600 }}>{formatRand(startLaterEffect)} more per month</span>
                    {' '}to reach the same nest egg.
                  </>
                ) : (
                  <>
                    If you wait 2 years to start, your achievable income drops by{' '}
                    <span style={{ color: C.red, fontWeight: 600 }}>{formatRand(startLaterEffect)}/month</span>
                    {' '}in today's Rands.
                  </>
                )}
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
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                {mode === 'income' && (
                  <ReferenceLine y={nestEgg} stroke={C.emerald} strokeDasharray="5 3"
                    label={{ value: 'Nest egg target', fill: C.emerald, fontSize: 11, position: 'insideTopRight' }} />
                )}
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
              Withdrawing {formatRandShort(monthlyWithdrawalFuture)}/month (inflation-adjusted) from age {retirementAge}, while the balance keeps growing at {annualReturnPercent}% p.a.
            </p>
            <div className="flex items-start gap-3 p-3 rounded-xl text-sm mb-4"
              style={{
                background: depletionAge !== null ? `${C.red}11` : `${C.emerald}11`,
                border: `1px solid ${depletionAge !== null ? C.red : C.emerald}33`,
              }}>
              {depletionAge !== null ? (
                <>
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: C.red }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    At this withdrawal rate and return, the nest egg runs out at age{' '}
                    <span style={{ color: C.red, fontWeight: 600 }}>{depletionAge}</span>. Consider a lower
                    SWR, a higher return, or a smaller income target.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" style={{ color: C.emerald }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    The nest egg sustains this income for at least {drawdown.length} years into retirement
                    (to around age {retirementAge + drawdown.length}).
                  </span>
                </>
              )}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={drawdown} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
              Conservative (-2%), Current, Aggressive (+2%) return rates
            </p>
            <div className="grid grid-cols-3 gap-3">
              {scenarios.map(({ label, r, color, value }) => (
                <div key={label} className="p-3 rounded-xl text-xs"
                  style={{ background: `${color}11`, border: `1px solid ${color}33` }}>
                  <div className="font-semibold mb-2" style={{ color }}>{label} ({r}%)</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    {mode === 'income' ? 'Monthly needed' : 'Achievable income'}
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>
                    {formatRand(value)}
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
