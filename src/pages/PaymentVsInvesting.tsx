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
import { calcExtraPaymentVsInvesting, calcStandardPayment } from '../utils/investing';
import { formatRand, formatPercent, formatYears, formatDate } from '../utils/format';
import type { InvestingInputs } from '../types';

const CHART_COLORS = {
  indigo: '#6366F1',
  amber: '#F59E0B',
  emerald: '#10B981',
  red: '#EF4444',
  cyan: '#06B6D4',
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
      <p className="text-[#94A3B8] mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="mb-1" style={{ color: p.color }}>
          {p.name}: {formatRand(p.value)}
        </p>
      ))}
    </div>
  );
}

export function PaymentVsInvesting() {
  const [inputs, setInputs] = useState<InvestingInputs>(DEFAULT_INPUTS);
  const [isCustomReturn, setIsCustomReturn] = useState(false);

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
  const standardPayment = useMemo(
    () => calcStandardPayment(inputs.loanBalance, inputs.interestRate, inputs.remainingTermYears),
    [inputs.loanBalance, inputs.interestRate, inputs.remainingTermYears]
  );

  // ── Chart data ─────────────────────────────────────────────
  // Area chart: interest saved (A) vs portfolio value after tax (B)
  const areaData = useMemo(() => {
    return result.yearByYear.map((row) => {
      // Interest saved up to this year (approximate)
      const interestSavedSoFar = row.year === result.yearByYear.length
        ? result.interestSaved
        : (result.interestSaved * row.year / result.yearByYear.length);
      return {
        year: `Yr ${row.year}`,
        'Interest Saved (A)': Math.round(Math.max(0, interestSavedSoFar)),
        'Portfolio Value (B)': row.investmentValue,
      };
    });
  }, [result]);

  // Line chart: net worth comparison
  const netWorthData = useMemo(() => {
    return result.yearByYear.map((row) => ({
      year: `Yr ${row.year}`,
      'Net Worth A (Bond↓)': Math.round(inputs.loanBalance - row.bondBalanceA),
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
    const ybyHeaders = ['Year', 'Bond Balance A', 'Bond Balance B', 'Investment Value', 'Net Difference', 'Winner'];
    const ybyRows = result.yearByYear.map((r) => [
      r.year,
      r.bondBalanceA,
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
          <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]"
             style={{ fontFamily: 'var(--font-body)' }}>
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

          <div className="border-t border-[rgba(255,255,255,0.07)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-4"
               style={{ fontFamily: 'var(--font-body)' }}>
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
          {/* Winner badge */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card-static p-5 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy size={20} className={result.winner === 'investing' ? 'text-[#10B981]' : 'text-[#6366F1]'} />
              <span
                className={clsx('winner-badge text-base', result.winner === 'investing' ? 'investing' : 'bond')}
              >
                {winnerLabel}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
              {result.winner === 'investing'
                ? `Investing your R ${inputs.extraMonthlyAmount.toLocaleString()}/month in ${ETF_OPTIONS.find(e => e.value === inputs.investmentVehicle)?.label?.split('(')[0].trim() ?? 'an ETF'} at ${inputs.expectedReturn}% p.a. yields more (after CGT) than the interest you would save by paying off the bond faster.`
                : `Paying an extra R ${inputs.extraMonthlyAmount.toLocaleString()}/month off your bond at ${inputs.interestRate}% is a guaranteed ${inputs.interestRate}% tax-free return — better than the after-tax investment outcome in this scenario.`}
            </p>
          </motion.div>

          {/* A vs B columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Column A */}
            <div className="glass-card-static p-5 border-l-[3px] border-l-[#6366F1]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[rgba(99,102,241,0.15)] flex items-center justify-center">
                  <span className="text-xs font-bold text-[#6366F1]" style={{ fontFamily: 'var(--font-heading)' }}>A</span>
                </div>
                <p className="text-sm font-bold text-[#F1F5F9]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Extra to Bond
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Interest Saved', value: formatRand(result.interestSaved), color: '#10B981' },
                  { label: 'Months Saved', value: formatYears(result.monthsSaved), color: '#6366F1' },
                  { label: 'New Payoff Date', value: formatDate(result.newPayoffDate), color: '#F1F5F9' },
                  { label: 'Effective Return', value: formatPercent(result.effectiveReturnA), color: '#6366F1' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] text-[#64748B] uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                      {s.label}
                    </p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column B */}
            <div className="glass-card-static p-5 border-l-[3px] border-l-[#10B981]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[rgba(16,185,129,0.15)] flex items-center justify-center">
                  <span className="text-xs font-bold text-[#10B981]" style={{ fontFamily: 'var(--font-heading)' }}>B</span>
                </div>
                <p className="text-sm font-bold text-[#F1F5F9]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Invest Instead
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Portfolio at Payoff', value: formatRand(result.portfolioValueAtPayoff), color: '#10B981' },
                  { label: 'After-Tax Value', value: formatRand(result.afterTaxPortfolioValue), color: '#34D399' },
                  { label: 'vs Scenario A', value: formatRand(result.netBenefitB), color: result.netBenefitB >= 0 ? '#10B981' : '#EF4444' },
                  { label: 'Payoff Date (B)', value: formatDate(result.standardPayoffDate), color: '#F1F5F9' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] text-[#64748B] uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                      {s.label}
                    </p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat overview */}
          <div className="four-col-stats">
            <StatCard label="Bond Interest Rate" value={formatPercent(inputs.interestRate)} color="indigo" delay={0} />
            <StatCard label="ETF Return" value={formatPercent(inputs.expectedReturn)} color="emerald" delay={0.05} />
            <StatCard label="Extra/Month" value={formatRand(inputs.extraMonthlyAmount)} color="amber" delay={0.1} />
            <StatCard label="CGT Rate" value={formatPercent(inputs.cgtRate)} color="red" delay={0.15} />
          </div>

          {/* Area chart: interest saved vs portfolio value */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Cumulative Benefit Over Time
            </p>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={areaData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIntSaved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.indigo} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.indigo} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                <Area type="monotone" dataKey="Interest Saved (A)" stroke={CHART_COLORS.indigo}
                  fill="url(#gradIntSaved)" strokeWidth={2} />
                <Area type="monotone" dataKey="Portfolio Value (B)" stroke={CHART_COLORS.emerald}
                  fill="url(#gradPortfolio)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Line chart: net worth comparison */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-[#F1F5F9] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Net Worth Comparison
            </p>
            <p className="text-xs text-[#64748B] mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              A: Equity gained from paying down bond · B: Portfolio + standard bond equity
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={netWorthData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                <Line type="monotone" dataKey="Net Worth A (Bond↓)" stroke={CHART_COLORS.indigo}
                  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Net Worth B (Portfolio)" stroke={CHART_COLORS.emerald}
                  strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Year-by-year comparison table */}
      <div className="glass-card-static mt-6 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-[#F1F5F9]" style={{ fontFamily: 'var(--font-heading)' }}>
            Year-by-Year Comparison
          </p>
          <div className="flex items-center gap-3 text-xs text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#6366F1] inline-block" /> Scenario A
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" /> Scenario B
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Year</th>
                <th>Bond Balance (A)</th>
                <th>Bond Balance (B)</th>
                <th>Investment Value</th>
                <th>Net Difference</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              {result.yearByYear.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td style={{ color: '#6366F1' }}>{formatRand(row.bondBalanceA)}</td>
                  <td style={{ color: '#94A3B8' }}>{formatRand(row.bondBalanceB)}</td>
                  <td style={{ color: '#10B981' }}>{formatRand(row.investmentValue)}</td>
                  <td style={{ color: row.netDifference >= 0 ? '#10B981' : '#6366F1' }}>
                    {row.netDifference >= 0 ? '+' : ''}{formatRand(row.netDifference)}
                  </td>
                  <td>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: row.winner === 'B' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                        color: row.winner === 'B' ? '#10B981' : '#6366F1',
                        fontFamily: 'var(--font-body)',
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
        <div className="mt-5 p-4 bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-xl flex items-start gap-3">
          <Zap size={14} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[#F59E0B] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              SA Tax Note
            </p>
            <p className="text-xs text-[#94A3B8] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              Capital Gains Tax (CGT) in South Africa applies only to gains above the R40,000 annual exclusion.
              The calculation uses a {inputs.cgtRate}% effective CGT rate (40% inclusion × marginal rate).
              Bond interest savings are effectively a tax-free, guaranteed return equal to your interest rate.
              ETF returns shown are average historical returns — actual returns may vary.
              Consult a qualified financial advisor before making investment decisions.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
