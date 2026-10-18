import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Building2, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Zap, FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';

import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SaveLoadBar } from '../components/ui/SaveLoadBar';
import { calcMortgageSummary } from '../utils/mortgage';
import { calcTransferDuty } from '../utils/tax';
import { exportMortgagePDF } from '../utils/pdf';
import { formatRand, formatYears, formatDate, formatPercent } from '../utils/format';
import { usePrimeRate, FALLBACK_PRIME } from '../hooks/usePrimeRate';
import type { MortgageInputs } from '../types';

const ROWS_PER_PAGE = 24;

const CHART_COLORS = {
  blue: 'var(--note-blue)',
  orange: 'var(--note-orange)',
  green: 'var(--gain)',
  red: 'var(--loss)',
  teal: 'var(--note-teal)',
  muted: 'var(--rule-strong)',
};

const lumpSumOptions = [
  { value: 0, label: 'None' },
  ...Array.from({ length: 20 }, (_, i) => ({
    value: i + 1,
    label: `Year ${i + 1}`,
  })),
];

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly (12×/year)' },
  { value: 'biweekly', label: 'Bi-Weekly (26×/year)' },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs min-w-[160px]">
      <p className="text-ink-muted mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="mb-1" style={{ color: p.color }}>
          {p.name}: {formatRand(p.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs">
      <p style={{ color: payload[0].payload.fill }}>{payload[0].name}</p>
      <p className="text-ink font-bold">{formatRand(payload[0].value)}</p>
    </div>
  );
}

export function MortgageCalculator() {
  const [inputs, setInputs] = useState<MortgageInputs>({
    purchasePrice: 1150000,
    deposit: 100000,
    interestRate: FALLBACK_PRIME,
    termYears: 20,
    frequency: 'monthly',
    extraPayment: 0,
    lumpSumYear: 0,
    lumpSumAmount: 0,
    monthlyServiceFee: 69,
    initiationFee: 6037,
    initiationFeeCapitalised: false,
    utilityConnectionFee: 1500,
    transferDutyExempt: false,
    bondRegistrationIncluded: false,
  });

  const [tableOpen, setTableOpen] = useState(false);
  const [tablePage, setTablePage] = useState(0);
  const [showWithExtras, setShowWithExtras] = useState(false);

  const set = useCallback(<K extends keyof MortgageInputs>(key: K, raw: string) => {
    setInputs((prev) => ({
      ...prev,
      [key]: key === 'frequency' ? raw : (parseFloat(raw) || 0),
    }));
    setTablePage(0);
  }, []);

  // Load snapshot navigated from History page
  const location = useLocation();
  const locationState = location.state as { loadedInputs?: MortgageInputs; entryId?: string } | null;
  useEffect(() => {
    if (locationState?.loadedInputs) setInputs(locationState.loadedInputs);
  }, [locationState]);

  const liveRate = usePrimeRate();

  const result = useMemo(() => calcMortgageSummary(inputs), [inputs]);

  const upfrontCosts = useMemo(() => {
    const transferDuty = inputs.transferDutyExempt ? 0 : calcTransferDuty(inputs.purchasePrice);
    const bondRegCostCash = inputs.bondRegistrationIncluded ? 0 : result.bondRegCost;
    const utilityFee = inputs.utilityConnectionFee ?? 0;
    const initiationFeeCash = inputs.initiationFeeCapitalised ? 0 : inputs.initiationFee;
    return {
      transferDuty,
      bondRegCost: bondRegCostCash,
      totalCashRequired: inputs.deposit + transferDuty + bondRegCostCash + initiationFeeCash + utilityFee,
    };
  }, [inputs.purchasePrice, inputs.deposit, inputs.transferDutyExempt, inputs.bondRegistrationIncluded, inputs.initiationFee, inputs.initiationFeeCapitalised, inputs.utilityConnectionFee, result.bondRegCost]);

  // ── Chart data ─────────────────────────────────────────────
  const balanceChartData = useMemo(() => {
    const std = result.amortization;
    const ext = result.amortizationWithExtras;
    const maxLen = std.length;

    return Array.from({ length: Math.ceil(maxLen / 12) + 1 }, (_, i) => {
      const year = i;
      const stdIdx = Math.min(i * 12, std.length - 1);
      const extIdx = Math.min(i * 12, ext.length - 1);
      return {
        year: `Yr ${year}`,
        'Standard': year === 0 ? result.loanAmount : (std[stdIdx]?.closingBalance ?? 0),
        'With Extras': year === 0 ? result.loanAmount : (ext[extIdx]?.closingBalance ?? 0),
      };
    });
  }, [result]);

  const principalInterestData = useMemo(() => {
    const amort = result.amortization;
    return Array.from({ length: Math.ceil(amort.length / 12) }, (_, i) => {
      const row = amort[i * 12];
      if (!row) return null;
      return {
        year: `Yr ${Math.ceil((i + 1))}`,
        Principal: Math.round(row.principal),
        Interest: Math.round(row.interest),
      };
    }).filter(Boolean);
  }, [result]);

  const pieData = useMemo(() => [
    { name: 'Principal', value: Math.round(result.loanAmount), fill: CHART_COLORS.blue },
    { name: 'Total Interest', value: Math.round(result.totalInterestStandard), fill: CHART_COLORS.orange },
  ], [result]);

  const barComparisonData = useMemo(() => [
    {
      label: 'Standard Monthly',
      interest: Math.round(result.totalInterestStandard),
    },
    {
      label: 'Bi-Weekly',
      interest: Math.round(result.totalInterestBiweekly),
    },
    {
      label: 'With Extras',
      interest: Math.round(result.totalInterestWithExtras),
    },
  ], [result]);

  // ── Active table ───────────────────────────────────────────
  const activeTable = showWithExtras ? result.amortizationWithExtras : result.amortization;
  const totalTablePages = Math.ceil(activeTable.length / ROWS_PER_PAGE);
  const pageRows = activeTable.slice(tablePage * ROWS_PER_PAGE, (tablePage + 1) * ROWS_PER_PAGE);

  // ── Excel export ───────────────────────────────────────────
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['#', 'Date', 'Opening Balance', 'Scheduled', 'Extra', 'Total', 'Principal', 'Interest', 'Closing Balance', 'Cum. Interest'];
    const rows = activeTable.map((r) => [
      r.period,
      formatDate(r.date),
      r.openingBalance.toFixed(2),
      r.scheduledPayment.toFixed(2),
      r.extraPayment.toFixed(2),
      r.totalPayment.toFixed(2),
      r.principal.toFixed(2),
      r.interest.toFixed(2),
      r.closingBalance.toFixed(2),
      r.cumulativeInterest.toFixed(2),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Amortization');

    // Summary sheet
    const summaryData = [
      ['Mortgage Summary', ''],
      ['Purchase Price', inputs.purchasePrice],
      ['Deposit', inputs.deposit],
      ['Loan Amount', result.loanAmount],
      ['Interest Rate', `${inputs.interestRate}%`],
      ['Term', `${inputs.termYears} years`],
      ['Monthly Payment', result.standardPayment.toFixed(2)],
      ['Initiation Fee', inputs.initiationFee.toFixed(2)],
      ['Total Interest (Standard)', result.totalInterestStandard.toFixed(2)],
      ['Total Interest (With Extras)', result.totalInterestWithExtras.toFixed(2)],
      ['Interest Saved', result.interestSaved.toFixed(2)],
      ['Months Saved', result.monthsSaved],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    XLSX.writeFile(wb, 'FinCalcZA_Mortgage.xlsx');
  };

  const depositPct = inputs.purchasePrice > 0
    ? ((inputs.deposit / inputs.purchasePrice) * 100).toFixed(1)
    : '0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 pt-6 pb-16"
    >
      <SectionHeader
        title="Mortgage Calculator"
        subtitle="Calculate bond repayments, compare payment strategies, and see full amortization schedules."
        icon={Building2}
      />

      <div className="two-col-layout">
        {/* ── Input panel ──────────────────────────────── */}
        <div className="glass-card-static p-6 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle"
             style={{ fontFamily: 'var(--font-text)' }}>
            Loan Details
          </p>

          <InputField
            label="Purchase Price"
            id="purchasePrice"
            value={inputs.purchasePrice}
            onChange={(v) => set('purchasePrice', v)}
            prefix="R"
            min={0}
            step={10000}
          />
          <InputField
            label={`Deposit (${depositPct}% of purchase price)`}
            id="deposit"
            value={inputs.deposit}
            onChange={(v) => set('deposit', v)}
            prefix="R"
            min={0}
            step={5000}
          />

          <div className="space-y-1.5">
            <InputField
              label="Interest Rate"
              id="interestRate"
              value={inputs.interestRate}
              onChange={(v) => set('interestRate', v)}
              suffix="%"
              min={0}
              max={30}
              step={0.25}
            />
            <button
              className="text-xs text-note-blue hover:text-note-blue transition-colors flex items-center gap-1"
              style={{ fontFamily: 'var(--font-text)' }}
              onClick={() => setInputs((p) => ({ ...p, interestRate: liveRate.primeRate }))}
            >
              <Zap size={11} />
              {liveRate.loading ? 'Fetching rate…' : `Use Live Prime Rate (${liveRate.primeRate}%${liveRate.fallback ? ' est.' : ''})`}
            </button>
          </div>

          <InputField
            label="Loan Term (years)"
            id="termYears"
            value={inputs.termYears}
            onChange={(v) => set('termYears', v)}
            suffix="yrs"
            min={1}
            max={30}
            step={1}
          />

          <InputField
            label="Monthly Service Fee"
            id="monthlyServiceFee"
            value={inputs.monthlyServiceFee}
            onChange={(v) => set('monthlyServiceFee', v)}
            prefix="R"
            min={0}
            step={1}
            help="Bank admin fee (e.g. R69/month). Doesn't reduce principal — pure extra cost."
          />

          <InputField
            label="Initiation Fee"
            id="initiationFee"
            value={inputs.initiationFee}
            onChange={(v) => set('initiationFee', v)}
            prefix="R"
            min={0}
            step={100}
            help="Once-off upfront fee. NCA cap: R6,037 for bonds above R500K."
          />

          <InputField
            label="Utility Connection Fee"
            id="utilityConnectionFee"
            value={inputs.utilityConnectionFee ?? 0}
            onChange={(v) => set('utilityConnectionFee', v)}
            prefix="R"
            min={0}
            step={100}
            help="Once-off water/electricity connection & activation deposit charged by the municipality."
          />

          {/* Upfront cost toggles */}
          <div className="space-y-2 pt-1">
            {[
              {
                key: 'transferDutyExempt' as const,
                label: 'Transfer Duty Exempt',
                help: 'VAT-registered seller or new build — no transfer duty payable.',
              },
              {
                key: 'bondRegistrationIncluded' as const,
                label: 'Bond Registration Capitalised',
                help: 'Bank promotion or costs rolled into the loan — no upfront bond reg fee.',
              },
              {
                key: 'initiationFeeCapitalised' as const,
                label: 'Initiation Fee Capitalised',
                help: 'Add the initiation fee to the loan instead of paying it upfront in cash — increases the balance and total interest.',
              },
            ].map(({ key, label, help }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={inputs[key]}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors ${inputs[key] ? 'bg-note-blue' : 'bg-rule-strong'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${inputs[key] ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink" style={{ fontFamily: 'var(--font-text)' }}>{label}</p>
                  <p className="text-[10px] text-ink-subtle mt-0.5" style={{ fontFamily: 'var(--font-text)' }}>{help}</p>
                </div>
              </label>
            ))}
          </div>

          <SelectField
            label="Payment Frequency"
            id="frequency"
            value={inputs.frequency}
            onChange={(v) => set('frequency', v)}
            options={frequencyOptions}
          />

          <div className="border-t border-ink/7 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle mb-4"
               style={{ fontFamily: 'var(--font-text)' }}>
              Extra Payments
            </p>

            <InputField
              label="Extra Monthly Payment"
              id="extraPayment"
              value={inputs.extraPayment}
              onChange={(v) => set('extraPayment', v)}
              prefix="R"
              min={0}
              step={500}
              help="Applied on top of the scheduled payment each period."
            />
          </div>

          <SelectField
            label="Lump Sum Year"
            id="lumpSumYear"
            value={inputs.lumpSumYear}
            onChange={(v) => set('lumpSumYear', v)}
            options={lumpSumOptions}
          />

          {inputs.lumpSumYear > 0 && (
            <InputField
              label="Lump Sum Amount"
              id="lumpSumAmount"
              value={inputs.lumpSumAmount}
              onChange={(v) => set('lumpSumAmount', v)}
              prefix="R"
              min={0}
              step={10000}
            />
          )}

          <SaveLoadBar<MortgageInputs>
            type="mortgage"
            title={`Mortgage — ${formatRand(result.loanAmount)} at ${inputs.interestRate}% / ${inputs.termYears}yrs`}
            summary={`Monthly: ${formatRand(result.standardPayment)} | Total interest: ${formatRand(result.totalInterestStandard)}`}
            inputs={inputs}
            onLoad={(saved) => setInputs(saved)}
            initialEditingId={locationState?.entryId}
          />
        </div>

        {/* ── Results panel ────────────────────────────── */}
        <div className="space-y-5">
          {/* PDF export */}
          <div className="flex justify-end">
            <button
              className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
              onClick={() => exportMortgagePDF(inputs, result, upfrontCosts)}
            >
              <FileText size={13} /> Export PDF
            </button>
          </div>

          {/* Upfront cash required */}
          <div className="glass-card-static p-4 border-l-[3px] border-l-note-blue grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-text)' }}>Deposit</p>
              <p className="text-base font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>{formatRand(inputs.deposit)}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-text)' }}>Transfer Duty</p>
              <p className={`text-base font-bold ${inputs.transferDutyExempt ? 'text-gain' : 'text-loss'}`} style={{ fontFamily: 'var(--font-display)' }}>
                {inputs.transferDutyExempt ? 'Exempt' : formatRand(upfrontCosts.transferDuty)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-text)' }}>Bond Registration</p>
              <p className={`text-base font-bold ${inputs.bondRegistrationIncluded ? 'text-gain' : 'text-loss'}`} style={{ fontFamily: 'var(--font-display)' }}>
                {inputs.bondRegistrationIncluded ? 'Capitalised' : formatRand(upfrontCosts.bondRegCost)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-text)' }}>Initiation Fee</p>
              <p className={`text-base font-bold ${inputs.initiationFeeCapitalised || inputs.initiationFee === 0 ? 'text-gain' : 'text-loss'}`} style={{ fontFamily: 'var(--font-display)' }}>
                {inputs.initiationFeeCapitalised ? 'Capitalised' : inputs.initiationFee > 0 ? formatRand(inputs.initiationFee) : 'Waived'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-text)' }}>Utility Connection</p>
              <p className={`text-base font-bold ${(inputs.utilityConnectionFee ?? 0) > 0 ? 'text-loss' : 'text-gain'}`} style={{ fontFamily: 'var(--font-display)' }}>
                {(inputs.utilityConnectionFee ?? 0) > 0 ? formatRand(inputs.utilityConnectionFee ?? 0) : 'None'}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-4 border-t border-ink/7 pt-3 flex items-center justify-between">
              <p className="text-xs text-ink-muted" style={{ fontFamily: 'var(--font-text)' }}>Total Cash Required on Transfer Day</p>
              <p className="text-lg font-bold text-note-blue" style={{ fontFamily: 'var(--font-display)' }}>{formatRand(upfrontCosts.totalCashRequired)}</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="four-col-stats">
            <StatCard
              label="Loan Amount"
              value={formatRand(result.loanAmount)}
              sub={`${depositPct}% deposit`}
              icon={Building2}
              color="blue"
              delay={0}
            />
            <StatCard
              label={inputs.frequency === 'biweekly' ? 'Bi-Weekly Payment' : 'Monthly Payment'}
              value={formatRand(result.standardPayment)}
              icon={Building2}
              color="orange"
              delay={0.05}
            />
            <StatCard
              label="Total Interest (Standard)"
              value={formatRand(result.totalInterestStandard)}
              sub={formatDate(result.payoffDate)}
              icon={Building2}
              color="red"
              delay={0.1}
            />
            <StatCard
              label="Interest Saved"
              value={formatRand(result.interestSaved)}
              sub={formatYears(result.monthsSaved) + ' saved'}
              icon={Building2}
              color="green"
              delay={0.15}
            />
          </div>

          {/* Service fee summary */}
          {inputs.monthlyServiceFee > 0 && (
            <div className="glass-card-static p-4 border-l-[3px] border-l-note-orange grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-text)' }}>Effective Monthly</p>
                <p className="text-base font-bold text-note-orange" style={{ fontFamily: 'var(--font-display)' }}>{formatRand(result.effectiveMonthlyPayment)}</p>
                <p className="text-[10px] text-ink-subtle mt-0.5" style={{ fontFamily: 'var(--font-text)' }}>payment + service fee</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-text)' }}>Total Service Fees</p>
                <p className="text-base font-bold text-loss" style={{ fontFamily: 'var(--font-display)' }}>{formatRand(result.totalServiceFees)}</p>
                <p className="text-[10px] text-ink-subtle mt-0.5" style={{ fontFamily: 'var(--font-text)' }}>over loan life</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-text)' }}>True Total Cost</p>
                <p className="text-base font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>{formatRand(result.totalCostIncludingFees)}</p>
                <p className="text-[10px] text-ink-subtle mt-0.5" style={{ fontFamily: 'var(--font-text)' }}>incl. interest + fees</p>
              </div>
            </div>
          )}

          {/* Extra payments summary */}
          {(inputs.extraPayment > 0 || inputs.lumpSumAmount > 0) && (
            <div className="glass-card-static p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: 'Interest w/ Extras',
                  value: formatRand(result.totalInterestWithExtras),
                  color: 'var(--loss)',
                },
                {
                  label: 'Interest Saved',
                  value: formatRand(result.interestSaved),
                  color: 'var(--gain)',
                },
                {
                  label: 'Time Saved',
                  value: formatYears(result.monthsSaved),
                  color: 'var(--note-blue)',
                },
                {
                  label: 'New Payoff Date',
                  value: formatDate(result.payoffDateWithExtras),
                  color: 'var(--note-orange)',
                },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1"
                     style={{ fontFamily: 'var(--font-text)' }}>
                    {s.label}
                  </p>
                  <p className="text-sm font-bold" style={{ color: s.color, fontFamily: 'var(--font-display)' }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Charts ──────────────────────────────────── */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Loan Balance Over Time
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={balanceChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradStd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradExt" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="Standard" stroke={CHART_COLORS.blue}
                  fill="url(#gradStd)" strokeWidth={2} />
                <Area type="monotone" dataKey="With Extras" stroke={CHART_COLORS.green}
                  fill="url(#gradExt)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="two-col-charts">
            {/* Principal vs Interest line chart */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Principal vs Interest Per Year
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={principalInterestData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }}
                    tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                  <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
                  <Line type="monotone" dataKey="Principal" stroke={CHART_COLORS.blue}
                    strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Interest" stroke={CHART_COLORS.orange}
                    strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: Principal vs Interest */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Principal vs Total Interest
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<PieTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar: Interest comparison */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Total Interest Comparison
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barComparisonData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                  formatter={(v: unknown) => [formatRand(Number(v)), 'Total Interest']}
                  contentStyle={{
                    background: 'color-mix(in srgb, var(--paper-raised) 95%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--ink) 12%, transparent)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: 'var(--ink)',
                  }}
                />
                <Bar dataKey="interest" radius={[6, 6, 0, 0]}>
                  {barComparisonData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={[CHART_COLORS.blue, CHART_COLORS.orange, CHART_COLORS.green][i]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Amortization Table ────────────────────────── */}
      <div className="glass-card-static mt-6">
        <button
          className="w-full flex items-center justify-between p-5 text-left"
          onClick={() => setTableOpen((v) => !v)}
        >
          <div>
            <p className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
              Amortization Schedule
            </p>
            <p className="text-xs text-ink-subtle mt-0.5" style={{ fontFamily: 'var(--font-text)' }}>
              {activeTable.length} periods · {totalTablePages} pages
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
              onClick={(e) => { e.stopPropagation(); exportToExcel(); }}
            >
              <Download size={13} /> Export Excel
            </button>
            {tableOpen ? <ChevronUp size={18} className="text-ink-muted" /> : <ChevronDown size={18} className="text-ink-muted" />}
          </div>
        </button>

        {tableOpen && (
          <div className="px-5 pb-5">
            {/* Toggle standard vs extras */}
            <div className="flex items-center justify-between mb-4">
              <div className="tab-bar w-auto">
                <button
                  className={clsx('tab-btn', !showWithExtras && 'active')}
                  onClick={() => { setShowWithExtras(false); setTablePage(0); }}
                >
                  Standard
                </button>
                <button
                  className={clsx('tab-btn', showWithExtras && 'active')}
                  onClick={() => { setShowWithExtras(true); setTablePage(0); }}
                >
                  With Extras
                </button>
              </div>
              <p className="text-xs text-ink-subtle" style={{ fontFamily: 'var(--font-text)' }}>
                Amber rows = lump sum applied
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Opening Balance</th>
                    <th>Scheduled</th>
                    <th>Extra</th>
                    <th>Total</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Closing Balance</th>
                    <th>Cum. Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.period} className={row.isLumpSum ? 'lump-sum-row' : ''}>
                      <td>{row.period}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>{formatRand(row.openingBalance)}</td>
                      <td>{formatRand(row.scheduledPayment)}</td>
                      <td style={{ color: row.extraPayment > 0 ? 'var(--note-orange)' : undefined }}>
                        {row.extraPayment > 0 ? formatRand(row.extraPayment) : '—'}
                      </td>
                      <td>{formatRand(row.totalPayment)}</td>
                      <td style={{ color: 'var(--gain)' }}>{formatRand(row.principal)}</td>
                      <td style={{ color: 'var(--loss)' }}>{formatRand(row.interest)}</td>
                      <td>{formatRand(row.closingBalance)}</td>
                      <td style={{ color: 'var(--ink-muted)' }}>{formatRand(row.cumulativeInterest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-ink-subtle" style={{ fontFamily: 'var(--font-text)' }}>
                Page {tablePage + 1} of {totalTablePages} · {activeTable.length} rows
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-ghost py-1.5 px-3 flex items-center gap-1 text-xs disabled:opacity-40"
                  onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                  disabled={tablePage === 0}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  className="btn-ghost py-1.5 px-3 flex items-center gap-1 text-xs disabled:opacity-40"
                  onClick={() => setTablePage((p) => Math.min(totalTablePages - 1, p + 1))}
                  disabled={tablePage >= totalTablePages - 1}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bi-weekly savings note */}
      <div className="glass-card-static mt-4 p-4 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-note-orange/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Zap size={13} className="text-note-orange" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Bi-Weekly Payment Benefit
          </p>
          <p className="text-xs text-ink-muted mt-1" style={{ fontFamily: 'var(--font-text)' }}>
            Switching to bi-weekly payments saves you{' '}
            <span className="text-gain font-semibold">
              {formatRand(result.interestSavedBiweekly)}
            </span>{' '}
            in interest and pays off your bond{' '}
            <span className="text-note-blue font-semibold">
              {formatPercent(result.monthsSavedBiweekly / (inputs.termYears * 12) * 100, 1)} faster
            </span>.
            You make 26 half-payments instead of 12 full payments — effectively one extra month per year.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
