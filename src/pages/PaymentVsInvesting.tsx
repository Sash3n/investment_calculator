import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';

import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SaveLoadBar } from '../components/ui/SaveLoadBar';
import { calcExtraPaymentVsInvesting, calcStandardPayment, findBreakEvenReturn, buildVersusModel } from '../utils/investing';
import { VersusView } from '../components/versus/VersusView';
import { formatRand, formatYears, formatDate } from '../utils/format';
import type { InvestingInputs } from '../types';
import { textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { BreakdownList } from '../components/results/BreakdownList';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { positiveError, rangeError } from '../utils/validation';
import { useJourneyValues } from '../journeys/journeyContext';
import type { ChartTooltipProps } from '../components/charts/tooltipTypes';

const CHART_COLORS = {
  blue: 'var(--note-blue)',
  orange: 'var(--note-orange)',
  green: 'var(--gain)',
  red: 'var(--loss)',
  teal: 'var(--note-teal)',
};

const ETF_OPTIONS = [
  { value: 'satrix40', label: 'Satrix 40 ETF (avg 13% p.a.)', return: 13 },
  { value: 'satrixsp500', label: 'Satrix S&P500 ETF (avg 18% p.a.)', return: 18 },
  { value: 'sygnia', label: 'Sygnia Itrix Global (avg 15% p.a.)', return: 15 },
  { value: 'ashburton', label: 'Ashburton Global 1200 (avg 14% p.a.)', return: 14 },
  { value: 'coronation', label: 'Coronation Balanced Plus (avg 12% p.a.)', return: 12 },
  { value: 'custom', label: 'Custom (enter manually)', return: 10 },
];

const investmentVehicleOptions = ETF_OPTIONS.map((e) => ({ value: e.value, label: e.label }));

const DEFAULT_INPUTS: InvestingInputs = {
  loanBalance: 900000,
  interestRate: 11.25,
  remainingTermYears: 18,
  extraMonthlyAmount: 3000,
  investmentVehicle: 'satrix40',
  expectedReturn: 13,
  cgtRate: 18,
  inflationRate: 5,
};

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs min-w-[160px]">
      <p className="text-ink-muted mb-2 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mb-1" style={{ color: textTone(p.color ?? 'var(--ink)') }}>
          {p.name}: {formatRand(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

export function PaymentVsInvesting() {
  const [inputs, setInputs] = useState<InvestingInputs>(DEFAULT_INPUTS);
  const [isCustomReturn, setIsCustomReturn] = useState(false);
  const [view, setView] = useState<'versus' | 'details'>('versus');

  const set = useCallback(<K extends keyof InvestingInputs>(key: K, raw: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(raw) || 0 }));
  }, []);

  const handleVehicleChange = (value: string) => {
    const etf = ETF_OPTIONS.find((e) => e.value === value);
    const isCustom = value === 'custom';
    setIsCustomReturn(isCustom);
    setInputs((prev) => ({
      ...prev,
      investmentVehicle: value,
      expectedReturn: isCustom ? prev.expectedReturn : (etf?.return ?? 13),
    }));
  };

  const location = useLocation();
  const locationState = location.state as { loadedInputs?: InvestingInputs; entryId?: string } | null;
  useEffect(() => {
    if (locationState?.loadedInputs) setInputs(locationState.loadedInputs);
  }, [locationState]);

  const result = useMemo(() => calcExtraPaymentVsInvesting(inputs), [inputs]);
  useJourneyValues({ loan: inputs.loanBalance, rate: inputs.interestRate, term: inputs.remainingTermYears, extra: inputs.extraMonthlyAmount });

  // Break-even does not depend on the assumed return, so it is not recomputed while the slider moves
  const { loanBalance, interestRate, remainingTermYears, extraMonthlyAmount, cgtRate, investmentVehicle, inflationRate } = inputs;
  const breakEven = useMemo(
    () => findBreakEvenReturn({ loanBalance, interestRate, remainingTermYears, extraMonthlyAmount, cgtRate, investmentVehicle, inflationRate, expectedReturn: 0 }),
    [loanBalance, interestRate, remainingTermYears, extraMonthlyAmount, cgtRate, investmentVehicle, inflationRate],
  );
  const versusModel = useMemo(() => buildVersusModel(inputs, result, breakEven), [inputs, result, breakEven]);

  // The slider writes the same state as the inputs panel, as a custom return
  const handleReturnChange = (expectedReturn: number) => {
    setIsCustomReturn(true);
    setInputs((prev) => ({ ...prev, investmentVehicle: 'custom', expectedReturn }));
  };
  const standardPayment = useMemo(
    () => calcStandardPayment(inputs.loanBalance, inputs.interestRate, inputs.remainingTermYears),
    [inputs.loanBalance, inputs.interestRate, inputs.remainingTermYears]
  );

  // ── Chart data ─────────────────────────────────────────────
  // Area chart: each route's investments, after CGT
  const areaData = useMemo(() => {
    return result.yearByYear.map((row) => ({
      year: `Yr ${row.year}`,
      'Invested after payoff (A)': row.bondRouteInvestmentValue,
      'Portfolio (B)': row.investmentValue,
    }));
  }, [result]);

  // Line chart: net worth comparison
  const netWorthData = useMemo(() => {
    return result.yearByYear.map((row) => ({
      year: `Yr ${row.year}`,
      'Net Worth A (Bond↓)': Math.round(inputs.loanBalance - row.bondBalanceA + row.bondRouteInvestmentValue),
      'Net Worth B (Portfolio)': Math.round(row.investmentValue + (inputs.loanBalance - row.bondBalanceB)),
    }));
  }, [result, inputs.loanBalance]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary
    const summaryData = [
      ['Extra Payments vs Investing Summary', ''],
      ['Current Loan Balance', inputs.loanBalance],
      ['Interest Rate', `${inputs.interestRate}%`],
      ['Remaining Term', `${inputs.remainingTermYears} years`],
      ['Extra Monthly Amount', inputs.extraMonthlyAmount],
      ['Standard Monthly Payment', standardPayment.toFixed(2)],
      ['Investment Vehicle', inputs.investmentVehicle],
      ['Expected Return', `${inputs.expectedReturn}%`],
      ['CGT Rate', `${inputs.cgtRate}%`],
      ['', ''],
      ['--- Scenario A: Extra to Bond ---', ''],
      ['Interest Saved', result.interestSaved.toFixed(2)],
      ['Months Saved', result.monthsSaved],
      ['New Payoff Date', formatDate(result.newPayoffDate)],
      ['Effective Return', `${result.effectiveReturnA}%`],
      ['Invested after payoff (after tax)', result.bondRouteValue.toFixed(2)],
      ['', ''],
      ['--- Scenario B: Invest Instead ---', ''],
      ['Portfolio Value at Payoff', result.portfolioValueAtPayoff.toFixed(2)],
      ['After-Tax Portfolio Value', result.afterTaxPortfolioValue.toFixed(2)],
      ['Net Benefit B vs A', result.netBenefitB.toFixed(2)],
      ['Winner', result.winner === 'investing' ? 'Investing (B)' : 'Extra Payments (A)'],
      ['Advantage', formatRand(result.winnerAmount)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');

    // Year by year
    const ybyHeaders = ['Year', 'Bond Balance A', 'Invested after payoff A', 'Bond Balance B', 'Investment Value B', 'Net Difference', 'Winner'];
    const ybyRows = result.yearByYear.map((r) => [
      r.year,
      r.bondBalanceA,
      r.bondRouteInvestmentValue,
      r.bondBalanceB,
      r.investmentValue,
      r.netDifference,
      r.winner === 'A' ? 'Extra Payments (A)' : 'Investing (B)',
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([ybyHeaders, ...ybyRows]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Year by Year');
    XLSX.writeFile(wb, 'FinCalcZA_ExtraVsInvesting.xlsx');
  };

  const errors = {
    loanBalance: positiveError(inputs.loanBalance, 'Enter what you still owe on the bond.'),
    interestRate: rangeError(inputs.interestRate, 0, 30, 'a rate', '%'),
    remainingTermYears: rangeError(inputs.remainingTermYears, 1, 30, 'a term', ' years'),
    extraMonthlyAmount: positiveError(inputs.extraMonthlyAmount, 'Enter the amount you could pay extra or invest each month.'),
    expectedReturn: rangeError(inputs.expectedReturn, -20, 30, 'a return', '%'),
    cgtRate: rangeError(inputs.cgtRate, 0, 45, 'a tax rate', '%'),
    inflationRate: rangeError(inputs.inflationRate, 0, 30, 'inflation', '%'),
  };
  const blocked = errors.loanBalance ?? errors.interestRate ?? errors.remainingTermYears ?? errors.extraMonthlyAmount
    ?? errors.expectedReturn ?? errors.cgtRate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 pt-6 pb-16"
    >
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <SectionHeader
          title="Extra Payments vs Investing"
          subtitle="Should you pay off your bond faster or invest in JSE ETFs? SA-specific tax calculations included."
          icon={TrendingUp}
          className="mb-0"
        />
        <button className="btn-ghost flex items-center gap-2 text-sm" onClick={exportToExcel}>
          <Download size={14} /> Export Excel
        </button>
      </div>

      <div className="two-col-layout">
        {/* Input panel */}
        <div className="glass-card-static p-6 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle"
             style={{ fontFamily: 'var(--font-text)' }}>
            Bond Details
          </p>
          <InputField label="Current Loan Balance" id="bal" value={inputs.loanBalance} error={errors.loanBalance}
            onChange={(v) => set('loanBalance', v)} prefix="R" step={10000} />
          <InputField label="Interest Rate" id="ir" value={inputs.interestRate} error={errors.interestRate}
            onChange={(v) => set('interestRate', v)} suffix="%" step={0.25} />
          <InputField label="Remaining Term" id="term" value={inputs.remainingTermYears} error={errors.remainingTermYears}
            onChange={(v) => set('remainingTermYears', v)} suffix="years" min={1} max={30} step={1} />
          <InputField label="Extra Monthly Amount" id="extra" value={inputs.extraMonthlyAmount} error={errors.extraMonthlyAmount}
            onChange={(v) => set('extraMonthlyAmount', v)} prefix="R" step={500}
            help={`Standard payment: ${formatRand(standardPayment)}/mo`} />

          <div className="border-t border-ink/7 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle mb-4"
               style={{ fontFamily: 'var(--font-text)' }}>
              Investment Assumptions
            </p>
            <div className="space-y-4">
              <SelectField label="Investment Vehicle" id="vehicle"
                value={inputs.investmentVehicle}
                onChange={handleVehicleChange}
                options={investmentVehicleOptions} />
              <InputField label="Expected Annual Return" id="ret" value={inputs.expectedReturn} error={errors.expectedReturn}
                onChange={(v) => set('expectedReturn', v)} suffix="% p.a."
                disabled={!isCustomReturn}
                help={isCustomReturn ? undefined : 'Set by selected ETF'} />
              <InputField label="CGT Rate" id="cgt" value={inputs.cgtRate} error={errors.cgtRate}
                onChange={(v) => set('cgtRate', v)} suffix="%"
                help="SA: 40% inclusion × marginal rate. Default 18% assumes 45% tax bracket." />
              <InputField label="Inflation Rate" id="inf" value={inputs.inflationRate} error={errors.inflationRate}
                onChange={(v) => set('inflationRate', v)} suffix="% p.a."
                help="SA average CPI: ~5% p.a." />
            </div>
          </div>

          <SaveLoadBar<InvestingInputs>
            type="investing"
            title={`Extra vs Invest — ${formatRand(inputs.extraMonthlyAmount)}/month extra`}
            summary={`Winner: ${result.winner === 'bond' ? 'Pay off bond' : 'Invest in ' + inputs.investmentVehicle} | Advantage: ${formatRand(result.winnerAmount)}`}
            inputs={inputs}
            onLoad={(saved) => setInputs(saved)}
            initialEditingId={locationState?.entryId}
          />
        </div>

        {/* Results panel */}
        <div className="space-y-5">
          <div className="tab-bar" role="tablist" aria-label="Results view">
            {([['versus', 'Versus'], ['details', 'Details']] as const).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                className={clsx('tab-btn', view === id && 'active')}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {blocked ? (
            <ResultPanel label="Pay the bond or invest" value="" summary="" blocked={blocked} />
          ) : view === 'versus' ? (
            <VersusView model={versusModel} cgtRate={inputs.cgtRate} onReturnChange={handleReturnChange} />
          ) : (<>
          <ResultPanel
            label={`${result.winner === 'investing' ? 'Investing' : 'Paying the bond'} comes out ahead by`}
            value={formatRand(result.winnerAmount, 0)}
            summary={result.winner === 'investing'
              ? `Investing ${formatRand(inputs.extraMonthlyAmount, 0)} a month at ${inputs.expectedReturn}% a year leaves you better off by ${formatDate(result.standardPayoffDate)} than paying it into the bond and investing the freed-up instalment once the bond is paid off.`
              : `Paying an extra ${formatRand(inputs.extraMonthlyAmount, 0)} a month into your bond at ${inputs.interestRate}%, then investing the instalment once it is paid off, leaves you better off by ${formatDate(result.standardPayoffDate)} than investing the extra now.`}
            figures={[
              { label: 'A: bond route, invested', value: formatRand(result.bondRouteValue, 0) },
              { label: 'B: invested, after tax', value: formatRand(result.afterTaxPortfolioValue, 0) },
              { label: 'Interest saved in A', value: formatRand(result.interestSaved, 0) },
              { label: 'Bond paid off in A', value: formatDate(result.newPayoffDate) },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-2">
            <BreakdownList
              title="A: extra into the bond"
              lines={[
                { label: 'Interest saved', value: result.interestSaved },
                { label: 'Paid off sooner by', display: formatYears(result.monthsSaved) },
                { label: 'New payoff date', display: formatDate(result.newPayoffDate) },
              ]}
              total={{ label: 'Then invested, after tax', value: result.bondRouteValue }}
            />
            <BreakdownList
              title="B: invest instead"
              lines={[
                { label: 'Portfolio at payoff', value: result.portfolioValueAtPayoff },
                { label: 'Tax on the gains', value: result.portfolioValueAtPayoff - result.afterTaxPortfolioValue, kind: 'less' },
                { label: 'Bond paid off', display: formatDate(result.standardPayoffDate) },
              ]}
              total={{ label: 'Portfolio after tax', value: result.afterTaxPortfolioValue }}
            />
          </div>

          {/* Area chart: interest saved vs portfolio value */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Investments Over Time (after CGT)
            </p>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={areaData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIntSaved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--ink-muted)' }} />
                <Area type="monotone" dataKey="Invested after payoff (A)" stroke={CHART_COLORS.blue}
                  fill="url(#gradIntSaved)" strokeWidth={2} />
                <Area type="monotone" dataKey="Portfolio (B)" stroke={CHART_COLORS.green}
                  fill="url(#gradPortfolio)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Line chart: net worth comparison */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-ink mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Net Worth Comparison
            </p>
            <p className="text-xs text-ink-subtle mb-4" style={{ fontFamily: 'var(--font-text)' }}>
              Home equity plus investments after CGT. A invests its full instalment once the bond is paid off.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={netWorthData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--ink-muted)' }} />
                <Line type="monotone" dataKey="Net Worth A (Bond↓)" stroke={CHART_COLORS.blue}
                  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Net Worth B (Portfolio)" stroke={CHART_COLORS.green}
                  strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <AssumptionsDrawer
            items={[
              <>Both routes spend the same each month until your original payoff date. In A, once the bond is paid off, the full instalment plus the extra is invested at the same return.</>,
              <>The bond rate stays at {inputs.interestRate}%. Paying the bond saves that interest for certain and tax-free; the {inputs.expectedReturn}% return is an assumption, not a forecast.</>,
              <>Tax of {inputs.cgtRate}% is taken off the whole investment gain at the end. To stay cautious, the R50,000 yearly capital gains exclusion is ignored.</>,
              <>Fees and dividend tax are not included.</>,
            ]}
          />
          </>)}
        </div>
      </div>

      {/* Year-by-year comparison table */}
      {view === 'details' && (
      <div className="glass-card-static mt-6 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Year-by-Year Comparison
          </p>
          <div className="flex items-center gap-3 text-xs text-ink-subtle" style={{ fontFamily: 'var(--font-text)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-note-blue inline-block" /> Scenario A
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gain inline-block" /> Scenario B
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Year</th>
                <th>Bond Balance (A)</th>
                <th>Invested (A)</th>
                <th>Bond Balance (B)</th>
                <th>Invested (B)</th>
                <th>Net Difference</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              {result.yearByYear.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td style={{ color: 'var(--note-blue-ink)' }}>{formatRand(row.bondBalanceA)}</td>
                  <td style={{ color: 'var(--note-blue-ink)' }}>{formatRand(row.bondRouteInvestmentValue)}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{formatRand(row.bondBalanceB)}</td>
                  <td style={{ color: 'var(--gain-ink)' }}>{formatRand(row.investmentValue)}</td>
                  <td style={{ color: row.netDifference >= 0 ? 'var(--gain-ink)' : 'var(--note-blue-ink)' }}>
                    {row.netDifference >= 0 ? '+' : ''}{formatRand(row.netDifference)}
                  </td>
                  <td>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: row.winner === 'B' ? 'color-mix(in srgb, var(--gain) 15%, transparent)' : 'color-mix(in srgb, var(--note-blue) 15%, transparent)',
                        color: row.winner === 'B' ? 'var(--gain-ink)' : 'var(--note-blue-ink)',
                        fontFamily: 'var(--font-text)',
                      }}
                    >
                      {row.winner === 'A' ? 'Extra Payment' : 'Investing'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
      )}
    </motion.div>
  );
}
