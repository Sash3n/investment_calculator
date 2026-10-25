import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Sunset, Info, AlertTriangle, CheckCircle2, ArrowLeftRight } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { readShareParam } from '../utils/share';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, positiveError, rangeError } from '../utils/validation';
import {
  calcRetirementIncomeGoal, calcRetirementAffordability,
  simulateRetirementSavings, findRequiredMonthly,
} from '../utils/retirementIncome';

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
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
    { label: 'Conservative', r: Math.max(1, annualReturnPercent - 2), color: C.orange },
    { label: 'Current',      r: annualReturnPercent,                  color: C.blue },
    { label: 'Aggressive',   r: annualReturnPercent + 2,               color: C.green },
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

  const errors = {
    currentAge: rangeError(currentAge, 1, 100, 'an age', ''),
    retirementAge: retirementNotInFuture ? 'Enter an age after your current age.' : rangeError(retirementAge, 1, 100, 'an age', ''),
    desiredMonthlyIncome: positiveError(desiredMonthlyIncome, 'Enter the monthly income you want in retirement.'),
    currentMonthlyIncome: positiveError(currentMonthlyIncome, 'Enter your monthly income.'),
    savingsRatePercent: rangeError(savingsRatePercent, 0, 100, 'a share', '%'),
    currentSavings: nonNegativeError(currentSavings),
    annualReturnPercent: rangeError(annualReturnPercent, -20, 50, 'a return', '%'),
    annualInflationPercent: rangeError(annualInflationPercent, 0, 20, 'inflation', '%'),
    contributionEscalation: rangeError(contributionEscalation, 0, 30, 'a yearly increase', '%'),
  };
  const blocked = errors.currentAge ?? errors.retirementAge
    ?? (mode === 'income' ? errors.desiredMonthlyIncome : errors.currentMonthlyIncome ?? errors.savingsRatePercent)
    ?? errors.currentSavings ?? errors.annualReturnPercent ?? errors.annualInflationPercent ?? errors.contributionEscalation;

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
          <div className="p-2.5 rounded-xl" style={{ background: alpha(C.orange, 13) }}>
            <Sunset size={22} style={{ color: textTone(C.orange) }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>Retirement Income Goal</h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Set a retirement income goal and find the monthly investment — or see what income your current savings rate can afford.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--rule)' }}>
        {(['income', 'afford'] as const).map((m) => (
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
            {m === 'income' ? 'I know my desired income' : 'I know what I can afford'}
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
            Your goal
          </h2>

          <InputField id="rig-age" label="Your current age" value={currentAge} error={errors.currentAge}
            onChange={(v) => setCurrentAge(Number(v))} suffix="yrs" min={1} max={100} />

          <InputField id="rig-retire-age" label="Target retirement age" value={retirementAge} error={errors.retirementAge}
            onChange={(v) => setRetirementAge(Number(v))} suffix="yrs" min={1} max={100} />

          {mode === 'income' ? (
            <InputField id="rig-income" label="Desired monthly income (today's R)" value={desiredMonthlyIncome} error={errors.desiredMonthlyIncome}
              onChange={(v) => setDesiredMonthlyIncome(Number(v))} prefix="R" min={0} />
          ) : (
            <>
              <InputField id="rig-current-income" label="Your current monthly income (R)" value={currentMonthlyIncome} error={errors.currentMonthlyIncome}
                onChange={(v) => setCurrentMonthlyIncome(Number(v))} prefix="R" min={0} />
              <InputField id="rig-savings-rate" label="% of income you can invest monthly" value={savingsRatePercent} error={errors.savingsRatePercent}
                onChange={(v) => setSavingsRatePercent(Number(v))} suffix="%" min={0} max={100} />
            </>
          )}

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ink-muted)' }}>
              Safe withdrawal rate
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {SWR_OPTIONS.map((opt) => (
                <button
                  key={opt.swr}
                  onClick={() => setSwr(opt.swr)}
                  className="py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: swr === opt.swr ? C.blue : alpha(C.blue, 7),
                    color:      textTone(swr === opt.swr ? 'var(--on-accent)'   : C.blue),
                  }}
                  title={opt.sub}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <InputField id="rig-savings" label="Current retirement savings (R)" value={currentSavings} error={errors.currentSavings}
            onChange={(v) => setCurrentSavings(Number(v))} prefix="R" min={0} />

          <InputField id="rig-return" label="Expected annual return" value={annualReturnPercent} error={errors.annualReturnPercent}
            onChange={(v) => setAnnualReturnPercent(Number(v))} suffix="%" min={0} max={50} />

          <InputField id="rig-inflation" label="Inflation rate" value={annualInflationPercent} error={errors.annualInflationPercent}
            onChange={(v) => setAnnualInflationPercent(Number(v))} suffix="%" min={0} max={20} />

          <InputField id="rig-escalation" label="Annual contribution escalation" value={contributionEscalation} error={errors.contributionEscalation}
            onChange={(v) => setContributionEscalation(Number(v))} suffix="%" min={0} max={30}
            help="Increase your monthly contribution each year, e.g. with salary growth" />

        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {mode === 'income' ? (
            <ResultPanel
              label="Invest each month"
              value={formatRand(incomeResult.requiredMonthly, 0)}
              blocked={blocked}
              summary={<>
                To draw {formatRand(desiredMonthlyIncome, 0)} a month in today’s money from age {retirementAge}, you need
                {' '}{formatRand(incomeResult.lumpSumTarget, 0)} by then ({formatRand(incomeResult.realLumpSumTarget, 0)} in today’s money).
                Investing {formatRand(incomeResult.requiredMonthly, 0)} a month for {incomeResult.years} years at {annualReturnPercent}% gets you there.
                {startLaterEffect > 0 && ` Starting 2 years later would mean ${formatRand(startLaterEffect, 0)} more a month.`}
              </>}
              figures={[
                { label: 'Needed at retirement', value: formatRand(incomeResult.lumpSumTarget, 0) },
                { label: 'You put in', value: formatRand(totalContrib, 0) },
                { label: 'Growth', value: formatRand(totalReturns, 0) },
                { label: 'Lasts until', value: depletionAge !== null ? `Age ${depletionAge}` : `Beyond age ${retirementAge + drawdown.length}` },
              ]}
            />
          ) : (
            <ResultPanel
              label="Income you can afford, in today’s money"
              value={`${formatRand(affordResult.achievableMonthlyIncomeToday, 0)} a month`}
              blocked={blocked}
              summary={<>
                Investing {savingsRatePercent}% of {formatRand(currentMonthlyIncome, 0)} a month ({formatRand(affordResult.monthlyContribution, 0)}) from age
                {' '}{currentAge} to {retirementAge} builds {formatRand(affordResult.finalBalance, 0)}, enough for this income at a
                {' '}{(swr * 100).toFixed(1)}% withdrawal rate. That replaces {affordResult.incomeReplacementPct.toFixed(0)}% of your income today.
                {startLaterEffect > 0 && ` Starting 2 years later would cut it by ${formatRand(startLaterEffect, 0)} a month.`}
              </>}
              figures={[
                { label: 'Saved by retirement', value: formatRand(affordResult.finalBalance, 0) },
                { label: 'Invested each month', value: formatRand(affordResult.monthlyContribution, 0) },
                { label: 'Share of income today', value: `${affordResult.incomeReplacementPct.toFixed(0)}%` },
                { label: 'Lasts until', value: depletionAge !== null ? `Age ${depletionAge}` : `Beyond age ${retirementAge + drawdown.length}` },
              ]}
            />
          )}

          {/* Chart */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
              Growth over {years} years
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rig-contrib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.brown} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C.brown} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="rig-returns" x1="0" y1="0" x2="0" y2="1">
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
                {mode === 'income' && (
                  <ReferenceLine y={nestEgg} stroke={C.green} strokeDasharray="5 3"
                    label={{ value: 'Nest egg target', fill: C.green, fontSize: 11, position: 'insideTopRight' }} />
                )}
                <Area type="monotone" dataKey="contributed" name="Contributions" stackId="1"
                  stroke={C.brown} fill="url(#rig-contrib)" strokeWidth={2} />
                <Area type="monotone" dataKey="returns" name="Returns" stackId="1"
                  stroke={C.blue} fill="url(#rig-returns)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Drawdown sustainability */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              Will it last? Drawdown simulation
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
              Withdrawing {formatRandShort(monthlyWithdrawalFuture)}/month (inflation-adjusted) from age {retirementAge}, while the balance keeps growing at {annualReturnPercent}% p.a.
            </p>
            <div className="flex items-start gap-3 p-3 rounded-xl text-sm mb-4"
              style={{
                background: depletionAge !== null ? alpha(C.red, 7) : alpha(C.green, 7),
                border: `1px solid ${alpha(depletionAge !== null ? C.red : C.green, 20)}`,
              }}>
              {depletionAge !== null ? (
                <>
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: textTone(C.red) }} />
                  <span style={{ color: 'var(--ink-muted)' }}>
                    At this withdrawal rate and return, the nest egg runs out at age{' '}
                    <span style={{ color: textTone(C.red), fontWeight: 600 }}>{depletionAge}</span>. Consider a lower
                    SWR, a higher return, or a smaller income target.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" style={{ color: textTone(C.green) }} />
                  <span style={{ color: 'var(--ink-muted)' }}>
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
                    <stop offset="5%"  stopColor={C.orange} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C.orange} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  tickFormatter={(v) => `Age ${v}`} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  tickFormatter={formatRandShort} width={64} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [formatRand(Number(val)), 'Balance']}
                  labelFormatter={(l) => `Age ${l}`}
                  cursor={{ stroke: alpha(C.orange, 33), strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="balance" name="Balance" stroke={C.orange} fill="url(#rig-drawdown)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario comparison */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              Scenario comparison
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
              Conservative (-2%), Current, Aggressive (+2%) return rates
            </p>
            <div className="grid grid-cols-3 gap-3">
              {scenarios.map(({ label, r, color, value }) => (
                <div key={label} className="p-3 rounded-xl text-xs"
                  style={{ background: alpha(color, 7), border: `1px solid ${alpha(color, 20)}` }}>
                  <div className="font-semibold mb-2" style={{ color: textTone(color) }}>{label} ({r}%)</div>
                  <div style={{ color: 'var(--ink-muted)' }}>
                    {mode === 'income' ? 'Monthly needed' : 'Achievable income'}
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>
                    {formatRand(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: alpha(C.blue, 7), border: `1px solid ${alpha(C.blue, 13)}` }}>
            <Info size={13} style={{ color: textTone(C.blue) }} />
            <span style={{ color: 'var(--ink-muted)' }}>
              For a different framing of the same retirement question, see the FIRE Calculator (target a
              retirement age from a savings rate) or Wealth Target Planner (target a Rand lump sum directly).
            </span>
          </div>

          <AssumptionsDrawer
            items={[
              mode === 'income'
                ? <>Your income goal is grown by {annualInflationPercent}% inflation to retirement, then divided by the {(swr * 100).toFixed(1)}% withdrawal rate to find the amount needed. The monthly investment is solved to reach it.</>
                : <>Your monthly investment is grown to retirement, then multiplied by the {(swr * 100).toFixed(1)}% withdrawal rate and brought back to today’s money with {annualInflationPercent}% inflation.</>,
              <>The return of {annualReturnPercent}% a year stays the same before and after retirement, and is not guaranteed.{contributionEscalation > 0 ? ` Contributions rise by ${contributionEscalation}% a year.` : ''}</>,
              <>In retirement the withdrawals rise with inflation each year while the rest keeps growing.</>,
              <>Tax, fees and changes in spending are not included.</>,
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
}
