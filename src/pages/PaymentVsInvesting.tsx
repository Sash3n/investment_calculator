import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Download, Trophy, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';

import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SaveLoadBar } from '../components/ui/SaveLoadBar';
import { calcExtraPaymentVsInvesting, calcStandardPayment, findBreakEvenReturn, buildVersusModel } from '../utils/investing';
import { VersusView } from '../components/versus/VersusView';
import { formatRand, formatPercent, formatYears, formatDate } from '../utils/format';
import type { InvestingInputs } from '../types';
import { textTone } from '../utils/color';

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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs min-w-[160px]">
      <p className="text-ink-muted mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="mb-1" style={{ color: textTone(p.color) }}>
          {p.name}: {formatRand(p.value)}
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

  const winnerLabel = result.winner === 'investing'
    ? `Investing Wins by ${formatRand(result.winnerAmount)}`
    : `Extra Payments Win by ${formatRand(result.winnerAmount)}`;

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
          <InputField label="Current Loan Balance" id="bal" value={inputs.loanBalance}
            onChange={(v) => set('loanBalance', v)} prefix="R" step={10000} />
          <InputField label="Interest Rate" id="ir" value={inputs.interestRate}
            onChange={(v) => set('interestRate', v)} suffix="%" step={0.25} />
          <InputField label="Remaining Term" id="term" value={inputs.remainingTermYears}
            onChange={(v) => set('remainingTermYears', v)} suffix="years" min={1} max={30} step={1} />
          <InputField label="Extra Monthly Amount" id="extra" value={inputs.extraMonthlyAmount}
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
              <InputField label="Expected Annual Return" id="ret" value={inputs.expectedReturn}
                onChange={(v) => set('expectedReturn', v)} suffix="% p.a."
                disabled={!isCustomReturn}
                help={isCustomReturn ? undefined : 'Set by selected ETF'} />
              <InputField label="CGT Rate" id="cgt" value={inputs.cgtRate}
                onChange={(v) => set('cgtRate', v)} suffix="%"
                help="SA: 40% inclusion × marginal rate. Default 18% assumes 45% tax bracket." />
              <InputField label="Inflation Rate" id="inf" value={inputs.inflationRate}
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

          {view === 'versus' ? (
            <VersusView model={versusModel} cgtRate={inputs.cgtRate} onReturnChange={handleReturnChange} />
          ) : (<>
          {/* Winner badge */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card-static p-5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy size={20} className={result.winner === 'investing' ? 'text-gain-ink' : 'text-note-blue-ink'} />
              <span
                className={clsx('winner-badge text-base', result.winner === 'investing' ? 'investing' : 'bond')}
              >
                {winnerLabel}
              </span>
            </div>
            <p className="text-xs text-ink-muted max-w-sm mx-auto" style={{ fontFamily: 'var(--font-text)' }}>
              {result.winner === 'investing'
                ? `Investing ${formatRand(inputs.extraMonthlyAmount, 0)}/month at ${inputs.expectedReturn}% a year leaves you better off by ${formatDate(result.standardPayoffDate)} than paying it into the bond and investing the freed-up instalment once the bond is paid off.`
                : `Paying an extra ${formatRand(inputs.extraMonthlyAmount, 0)}/month into your bond at ${inputs.interestRate}%, then investing the instalment once it is paid off, leaves you better off by ${formatDate(result.standardPayoffDate)} than investing the extra now.`}
            </p>
          </motion.div>

          {/* A vs B columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Column A */}
            <div className="glass-card-static p-5 border-l-[3px] border-l-note-blue">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-note-blue/15 flex items-center justify-center">
                  <span className="text-xs font-bold text-note-blue-ink" style={{ fontFamily: 'var(--font-display)' }}>A</span>
                </div>
                <p className="text-sm font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                  Extra to Bond
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Interest Saved', value: formatRand(result.interestSaved), color: 'var(--gain)' },
                  { label: 'Months Saved', value: formatYears(result.monthsSaved), color: 'var(--note-blue)' },
                  { label: 'New Payoff Date', value: formatDate(result.newPayoffDate), color: 'var(--ink)' },
                  { label: 'Then invested (after tax)', value: formatRand(result.bondRouteValue), color: 'var(--note-blue)' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] text-ink-subtle uppercase tracking-wider" style={{ fontFamily: 'var(--font-text)' }}>
                      {s.label}
                    </p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: textTone(s.color), fontFamily: 'var(--font-display)' }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column B */}
            <div className="glass-card-static p-5 border-l-[3px] border-l-gain">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gain/15 flex items-center justify-center">
                  <span className="text-xs font-bold text-gain-ink" style={{ fontFamily: 'var(--font-display)' }}>B</span>
                </div>
                <p className="text-sm font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                  Invest Instead
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Portfolio at Payoff', value: formatRand(result.portfolioValueAtPayoff), color: 'var(--gain)' },
                  { label: 'After-Tax Value', value: formatRand(result.afterTaxPortfolioValue), color: 'var(--gain)' },
                  { label: 'vs Scenario A', value: formatRand(result.netBenefitB), color: result.netBenefitB >= 0 ? 'var(--gain)' : 'var(--loss)' },
                  { label: 'Payoff Date (B)', value: formatDate(result.standardPayoffDate), color: 'var(--ink)' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] text-ink-subtle uppercase tracking-wider" style={{ fontFamily: 'var(--font-text)' }}>
                      {s.label}
                    </p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: textTone(s.color), fontFamily: 'var(--font-display)' }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat overview */}
          <div className="four-col-stats">
            <StatCard label="Bond Interest Rate" value={formatPercent(inputs.interestRate)} color="blue" delay={0} />
            <StatCard label="ETF Return" value={formatPercent(inputs.expectedReturn)} color="green" delay={0.05} />
            <StatCard label="Extra/Month" value={formatRand(inputs.extraMonthlyAmount)} color="orange" delay={0.1} />
            <StatCard label="CGT Rate" value={formatPercent(inputs.cgtRate)} color="red" delay={0.15} />
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

        {/* SA Tax disclosure */}
        <div className="mt-5 p-4 bg-note-orange/6 border border-note-orange/15 rounded-xl flex items-start gap-3">
          <Zap size={14} className="text-note-orange-ink mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-note-orange-ink mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              SA Tax Note
            </p>
            <p className="text-xs text-ink-muted leading-relaxed" style={{ fontFamily: 'var(--font-text)' }}>
              Capital Gains Tax (CGT) in South Africa applies only to gains above the annual exclusion (R50,000 from 2026/27).
              To stay conservative, this calculation ignores the exclusion and taxes the whole gain at a {inputs.cgtRate}% effective CGT rate (40% inclusion × marginal rate).
              Both routes spend the same amount each month until your original payoff date. In A, once the bond is paid off, the full instalment plus the extra is invested at the same return, so the comparison is what each route leaves you with on that date.
              Bond interest savings are effectively a tax-free, guaranteed return equal to your interest rate.
              ETF returns shown are average historical returns — actual returns may vary.
              Consult a qualified financial advisor before making investment decisions.
            </p>
          </div>
        </div>
      </div>
      )}
    </motion.div>
  );
}
