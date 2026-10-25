import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Car, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileText, Zap } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';

import { InputField } from '../components/ui/InputField';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SaveLoadBar } from '../components/ui/SaveLoadBar';
import { calcCarFinance } from '../utils/car';
import { exportCarPDF } from '../utils/pdf';
import { formatRand, formatMonths } from '../utils/format';
import { ResultPanel } from '../components/results/ResultPanel';
import { BreakdownList } from '../components/results/BreakdownList';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { carInputErrors } from '../utils/validation';
import { usePrimeRate, FALLBACK_PRIME } from '../hooks/usePrimeRate';
import type { CarInputs } from '../types';
import { textTone } from '../utils/color';
import type { ChartTooltipProps } from '../components/charts/tooltipTypes';

const CHART_COLORS = {
  blue: 'var(--note-blue)',
  orange: 'var(--note-orange)',
  green: 'var(--gain)',
  red: 'var(--loss)',
  teal: 'var(--note-teal)',
};

const DEFAULT_INPUTS: CarInputs = {
  vehiclePrice: 450000,
  deposit: 50000,
  balloonPercent: 0,
  interestRate: FALLBACK_PRIME,
  termMonths: 72,
  minimumInstalment: 0,
  extraMonthlyPayment: 0,
  monthlyServiceFee: 69,
  monthlyInsurance: 1200,
  monthlyFuel: 2500,
  monthlyMaintenance: 800,
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

export function CarFinance() {
  const liveRate = usePrimeRate();
  const [inputs, setInputs] = useState<CarInputs>(DEFAULT_INPUTS);
  const [tableOpen, setTableOpen] = useState(false);
  const [showWithExtras, setShowWithExtras] = useState(false);
  const [tablePage, setTablePage] = useState(0);
  const ROWS_PER_PAGE = 24;

  const set = useCallback(<K extends keyof CarInputs>(key: K, raw: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(raw) || 0 }));
  }, []);

  const location = useLocation();
  const locationState = location.state as { loadedInputs?: CarInputs; entryId?: string } | null;
  useEffect(() => {
    if (locationState?.loadedInputs) setInputs(locationState.loadedInputs);
  }, [locationState]);

  const result = useMemo(() => calcCarFinance(inputs), [inputs]);

  // ── Chart data ─────────────────────────────────────────────
  // Area: balance vs depreciated value over term
  const balanceValueData = useMemo(() => {
    const months = inputs.termMonths;
    const depRates = [0.15, 0.12, 0.10, 0.10, 0.10, 0.10];
    // Balance after each month's payment, from the schedules; the balloon is settled at the end
    const balanceAt = (rows: typeof result.amortization, month: number) =>
      month <= 0 ? result.loanAmount : month >= months ? 0 : (rows[month - 1]?.closingBalance ?? 0);

    const step = Math.max(1, Math.ceil(months / 12));
    return Array.from({ length: Math.ceil(months / step) + 1 }, (_, i) => {
      const month = Math.min(i * step, months);
      const yearFraction = month / 12;
      let value = inputs.vehiclePrice;
      const fullYears = Math.floor(yearFraction);
      for (let y = 0; y < fullYears && y < depRates.length; y++) {
        value *= (1 - depRates[y]);
      }
      const partial = yearFraction - fullYears;
      if (partial > 0 && fullYears < depRates.length) {
        value *= (1 - depRates[fullYears] * partial);
      }

      const row: Record<string, unknown> = {
        month: `M${month}`,
        'Car Value': Math.round(Math.max(0, value)),
        'Loan Balance': Math.round(balanceAt(result.amortization, month)),
      };
      if (inputs.extraMonthlyPayment > 0) {
        const extraRows = result.amortizationWithExtras;
        row['Balance (Extra)'] = Math.round(month > extraRows.length ? 0 : balanceAt(extraRows, month));
      }
      return row;
    });
  }, [inputs, result]);

  // Monthly cost breakdown bar
  const monthlyCostData = [
    { name: 'Instalment', value: Math.round(result.monthlyInstalment), fill: CHART_COLORS.blue },
    { name: 'Insurance', value: inputs.monthlyInsurance, fill: CHART_COLORS.orange },
    { name: 'Fuel', value: inputs.monthlyFuel, fill: CHART_COLORS.green },
    { name: 'Maintenance', value: inputs.monthlyMaintenance, fill: CHART_COLORS.teal },
  ];

  // Pie: total cost breakdown
  const totalCostPie = [
    { name: 'Principal', value: Math.round(result.loanAmount), fill: CHART_COLORS.blue },
    { name: 'Interest', value: Math.round(result.totalInterest), fill: CHART_COLORS.red },
    { name: 'Insurance', value: inputs.monthlyInsurance * inputs.termMonths, fill: CHART_COLORS.orange },
    { name: 'Fuel', value: inputs.monthlyFuel * inputs.termMonths, fill: CHART_COLORS.green },
    { name: 'Maintenance', value: inputs.monthlyMaintenance * inputs.termMonths, fill: CHART_COLORS.teal },
  ];

  // Depreciation line chart
  const depreciationData = result.depreciation.map((d) => ({
    year: `Yr ${d.year}`,
    'Vehicle Value': d.value,
    'Loan Balance': d.loanBalance,
  }));

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ['Car Finance Summary', ''],
      ['Vehicle Price', inputs.vehiclePrice],
      ['Deposit', inputs.deposit],
      ['Loan Amount', result.loanAmount],
      ['Balloon Amount', result.balloonAmount],
      ['Financed Amount', result.financedAmount],
      ['Interest Rate', `${inputs.interestRate}%`],
      ['Term', `${inputs.termMonths} months`],
      ['Monthly Instalment', result.monthlyInstalment.toFixed(2)],
      ['Total Repayments', result.totalRepayments.toFixed(2)],
      ['Total Interest', result.totalInterest.toFixed(2)],
      ['Monthly Insurance', inputs.monthlyInsurance],
      ['Monthly Fuel', inputs.monthlyFuel],
      ['Monthly Maintenance', inputs.monthlyMaintenance],
      ['Total Cost of Ownership', result.totalCostOfOwnership.toFixed(2)],
      ['Effective Annual Cost', result.effectiveAnnualCost.toFixed(2)],
      ['Underwater Months', result.underwaterMonths],
    ];
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');

    // Depreciation sheet
    const depHeaders = ['Year', 'Vehicle Value', 'Loan Balance'];
    const depRows = result.depreciation.map((d) => [d.year, d.value, d.loanBalance]);
    const ws2 = XLSX.utils.aoa_to_sheet([depHeaders, ...depRows]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Depreciation');
    XLSX.writeFile(wb, 'FinCalcZA_CarFinance.xlsx');
  };

  const termYears = inputs.termMonths / 12;
  const allInMonthly = result.effectiveMonthlyPayment + inputs.extraMonthlyPayment
    + inputs.monthlyInsurance + inputs.monthlyFuel + inputs.monthlyMaintenance;
  const errors = carInputErrors(inputs);
  const blocked = errors.vehiclePrice ?? errors.deposit ?? errors.interestRate ?? errors.termMonths ?? errors.balloonPercent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 pt-6 pb-16"
    >
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <SectionHeader
          title="Car Finance Calculator"
          subtitle="Model SA car finance with balloon payments, true cost of ownership, and depreciation."
          icon={Car}
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
            Finance Details
          </p>
          <InputField label="Vehicle Price" id="vp" value={inputs.vehiclePrice} error={errors.vehiclePrice}
            onChange={(v) => set('vehiclePrice', v)} prefix="R" step={10000} />
          <InputField label="Deposit" id="dep" value={inputs.deposit} error={errors.deposit}
            onChange={(v) => set('deposit', v)} prefix="R" step={5000} />
          <InputField label="Balloon Payment" id="bal" value={inputs.balloonPercent} error={errors.balloonPercent}
            onChange={(v) => set('balloonPercent', v)} suffix="% of price" step={5} min={0} max={30}
            help={`= ${formatRand(result.balloonAmount)} lump sum at end of term`} />
          <div className="space-y-1.5">
            <InputField label="Interest Rate" id="ir" value={inputs.interestRate} error={errors.interestRate}
              onChange={(v) => set('interestRate', v)} suffix="%" step={0.25} />
            <button
              className="text-xs text-note-blue-ink hover:text-note-blue-ink transition-colors flex items-center gap-1"
              style={{ fontFamily: 'var(--font-text)' }}
              onClick={() => set('interestRate', String(liveRate.primeRate))}
            >
              <Zap size={11} />
              {liveRate.loading ? 'Fetching rate…' : `Use Live Prime Rate (${liveRate.primeRate}%${liveRate.fallback ? ' est.' : ''})`}
            </button>
          </div>
          <InputField label="Term" id="term" value={inputs.termMonths} error={errors.termMonths}
            onChange={(v) => set('termMonths', v)} suffix="months" min={12} max={84} step={12}
            help="Common SA term: 72 months (6 years)" />
          <InputField label="Bank Minimum Instalment" id="min" value={inputs.minimumInstalment} error={errors.minimumInstalment}
            onChange={(v) => set('minimumInstalment', v)} prefix="R" step={100} min={0}
            help={
              result.instalmentOverride
                ? `Bank minimum is R ${(inputs.minimumInstalment - result.calculatedInstalment).toFixed(0)} above our calc — surplus reduces principal`
                : `Our calc: ${formatRand(result.calculatedInstalment)} — leave 0 to use this`
            } />
          <InputField label="Monthly Service Fee" id="svcfee" value={inputs.monthlyServiceFee} error={errors.monthlyServiceFee}
            onChange={(v) => set('monthlyServiceFee', v)} prefix="R" step={1} min={0}
            help="Bank admin fee (e.g. R69/month). Added to total cost, doesn't reduce loan." />
          <InputField label="Extra Monthly Payment" id="extra" value={inputs.extraMonthlyPayment} error={errors.extraMonthlyPayment}
            onChange={(v) => set('extraMonthlyPayment', v)} prefix="R" step={500} min={0}
            help={inputs.extraMonthlyPayment > 0 ? `Saves ${result.monthsSaved} month${result.monthsSaved !== 1 ? 's' : ''} · pays off in ${result.actualTermMonths} months` : 'Optional: pay off faster & save interest'} />

          <div className="border-t border-ink/7 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle mb-4"
               style={{ fontFamily: 'var(--font-text)' }}>
              Monthly Running Costs
            </p>
            <div className="space-y-4">
              <InputField label="Insurance" id="ins" value={inputs.monthlyInsurance} error={errors.monthlyInsurance}
                onChange={(v) => set('monthlyInsurance', v)} prefix="R" step={100} />
              <InputField label="Fuel" id="fuel" value={inputs.monthlyFuel} error={errors.monthlyFuel}
                onChange={(v) => set('monthlyFuel', v)} prefix="R" step={100} />
              <InputField label="Maintenance" id="maint" value={inputs.monthlyMaintenance} error={errors.monthlyMaintenance}
                onChange={(v) => set('monthlyMaintenance', v)} prefix="R" step={100} />
            </div>
          </div>

          <SaveLoadBar<CarInputs>
            type="car"
            title={`Car — ${formatRand(inputs.vehiclePrice)} at ${inputs.interestRate}% / ${inputs.termMonths}mo`}
            summary={`Instalment: ${formatRand(result.monthlyInstalment)} | Total interest: ${formatRand(result.totalInterest)}`}
            inputs={inputs}
            onLoad={(saved) => setInputs(saved)}
            initialEditingId={locationState?.entryId}
          />
        </div>

        {/* Results */}
        <div className="space-y-5">
          {/* PDF export */}
          <div className="flex justify-end">
            <button
              className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
              onClick={() => exportCarPDF(inputs, result)}
            >
              <FileText size={13} /> Export PDF
            </button>
          </div>

          <ResultPanel
            label="Monthly instalment"
            value={formatRand(result.monthlyInstalment, 0)}
            blocked={blocked}
            summary={<>
              Over {formatMonths(inputs.termMonths)} you repay {formatRand(result.totalRepayments, 0)}, of which {formatRand(result.totalInterest, 0)} is interest
              {result.balloonAmount > 0 ? `, including a ${formatRand(result.balloonAmount, 0)} balloon at the end` : ''}.
              {' '}With the service fee and running costs, the car costs {formatRand(allInMonthly, 0)} a month.
              {result.instalmentOverride && ` Your bank’s minimum of ${formatRand(inputs.minimumInstalment, 0)} is above the worked-out instalment, so the extra goes off the loan.`}
              {inputs.extraMonthlyPayment > 0 && result.interestSaved > 0 && ` Paying ${formatRand(inputs.extraMonthlyPayment, 0)} extra saves ${formatRand(result.interestSaved, 0)} and finishes ${formatMonths(result.monthsSaved)} sooner.`}
              {result.underwaterMonths > 0 && ` For ${formatMonths(result.underwaterMonths)} you would owe more than the car is worth.`}
            </>}
            figures={[
              { label: 'Total interest', value: formatRand(result.totalInterest, 0) },
              { label: 'Balloon at the end', value: formatRand(result.balloonAmount, 0) },
              { label: 'Owing more than it’s worth', value: result.underwaterMonths > 0 ? formatMonths(result.underwaterMonths) : 'Never' },
              { label: 'Each year, all in', value: formatRand(result.effectiveAnnualCost, 0) },
            ]}
          />

          <div className="grid gap-5 xl:grid-cols-2">
            <BreakdownList
              title="Each month"
              lines={[
                { label: 'Instalment', value: result.monthlyInstalment },
                { label: 'Bank service fee', value: inputs.monthlyServiceFee },
                ...(inputs.extraMonthlyPayment > 0 ? [{ label: 'Extra payment', value: inputs.extraMonthlyPayment }] : []),
                { label: 'Insurance', value: inputs.monthlyInsurance },
                { label: 'Fuel', value: inputs.monthlyFuel },
                { label: 'Maintenance', value: inputs.monthlyMaintenance },
              ]}
              total={{ label: 'All in, each month', value: allInMonthly }}
            />
            <BreakdownList
              title={`Over ${formatMonths(inputs.termMonths)}`}
              lines={[
                { label: 'Deposit', value: inputs.deposit },
                { label: 'Instalments', value: result.totalRepayments - result.balloonAmount },
                ...(result.balloonAmount > 0 ? [{ label: 'Balloon', value: result.balloonAmount }] : []),
                { label: 'Service fees', value: result.totalServiceFees },
                { label: 'Insurance, fuel and maintenance', value: (inputs.monthlyInsurance + inputs.monthlyFuel + inputs.monthlyMaintenance) * inputs.termMonths },
              ]}
              total={{ label: 'Total cost of owning it', value: result.totalCostOfOwnership }}
            />
          </div>

          {/* Balance vs Value AreaChart */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Loan Balance vs Car Value Over Term
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={balanceValueData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCarVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradCarBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.red} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS.red} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--ink-muted)' }} />
                <Area type="monotone" dataKey="Car Value" stroke={CHART_COLORS.green}
                  fill="url(#gradCarVal)" strokeWidth={2} />
                <Area type="monotone" dataKey="Loan Balance" stroke={CHART_COLORS.red}
                  fill="url(#gradCarBal)" strokeWidth={2} />
                {inputs.extraMonthlyPayment > 0 && (
                  <Area type="monotone" dataKey="Balance (Extra)" stroke={CHART_COLORS.blue}
                    fill="none" strokeWidth={2} strokeDasharray="5 3" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="two-col-charts">
            {/* Monthly cost breakdown */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Monthly Cost Breakdown
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyCostData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                    tickFormatter={(v) => `R ${(v / 1000).toFixed(1)}K`} />
                  <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                    formatter={(v: unknown) => [formatRand(Number(v)), 'Monthly']}
                    contentStyle={{ background: 'color-mix(in srgb, var(--paper-raised) 95%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 12%, transparent)', borderRadius: '10px', fontSize: '12px', color: 'var(--ink)' }}
                  />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                    {monthlyCostData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Total cost pie */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Total Cost Breakdown ({termYears.toFixed(0)} yrs)
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={totalCostPie} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {totalCostPie.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                    formatter={(v: unknown) => [formatRand(Number(v)), '']}
                    contentStyle={{ background: 'color-mix(in srgb, var(--paper-raised) 95%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 12%, transparent)', borderRadius: '10px', fontSize: '12px', color: 'var(--ink)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: 'var(--ink-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Depreciation LineChart */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-ink mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Depreciation Schedule
            </p>
            <p className="text-xs text-ink-subtle mb-4" style={{ fontFamily: 'var(--font-text)' }}>
              Yr1: 15% · Yr2: 12% · Yr3+: 10% per annum
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={depreciationData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--ink-muted)' }} />
                <Line type="monotone" dataKey="Vehicle Value" stroke={CHART_COLORS.green}
                  strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.green }} />
                <Line type="monotone" dataKey="Loan Balance" stroke={CHART_COLORS.red}
                  strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.red }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Finance vs Cash comparison */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-ink mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Finance vs Cash Purchase
            </p>
            <p className="text-xs text-ink-subtle mb-4" style={{ fontFamily: 'var(--font-text)' }}>
              Opportunity cost assumes cash invested at 10% p.a. over {termYears.toFixed(0)} years.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card-static p-4 border-l-[3px] border-l-note-blue">
                <p className="text-xs text-ink-muted mb-2" style={{ fontFamily: 'var(--font-text)' }}>
                  Finance Route
                </p>
                <p className="text-xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                  {formatRand(result.totalCostOfOwnership)}
                </p>
                <p className="text-xs text-ink-subtle mt-1" style={{ fontFamily: 'var(--font-text)' }}>
                  Total out-of-pocket over {termYears.toFixed(0)} years
                </p>
              </div>
              <div className="glass-card-static p-4 border-l-[3px] border-l-note-orange">
                <p className="text-xs text-ink-muted mb-2" style={{ fontFamily: 'var(--font-text)' }}>
                  Cash Purchase Opportunity Cost
                </p>
                <p className="text-xl font-bold text-note-orange-ink" style={{ fontFamily: 'var(--font-display)' }}>
                  {formatRand(result.cashPurchaseOpportunityCost)}
                </p>
                <p className="text-xs text-ink-subtle mt-1" style={{ fontFamily: 'var(--font-text)' }}>
                  What your capital could have grown to
                </p>
              </div>
            </div>
            <p className="text-xs text-ink-muted mt-4" style={{ fontFamily: 'var(--font-text)' }}>
              Note: Cash purchase avoids interest ({formatRand(result.totalInterest)}) but forfeits investment growth.
              Finance preserves liquidity for higher-yield investments.
            </p>
          </div>

          <AssumptionsDrawer
            items={[
              <>The rate stays at {inputs.interestRate}% for the whole {inputs.termMonths} months, and interest is worked out monthly.</>,
              <>A balloon is a lump sum of {inputs.balloonPercent}% of the price, paid at the end. Interest is charged on the whole loan, balloon included, until it is paid.</>,
              <>The car loses 15% of its value in the first year, 12% in the second and 10% a year after that. Real values depend on the make, model and mileage.</>,
              <>The cash comparison assumes money not spent on the car would earn 10% a year if invested. Returns are not guaranteed.</>,
              <>Not included: the bank’s initiation fee, licence and registration, tracking, tyres and credit life cover.</>,
            ]}
          />
        </div>
      </div>

      {/* ── Amortization Table ───────────────────────────────── */}
      <div className="mt-6">
        <button
          onClick={() => setTableOpen((o) => !o)}
          className="w-full glass-card-static p-4 flex items-center justify-between text-left hover:border-note-blue/30 transition-all"
        >
          <span className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Amortization Schedule
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-subtle" style={{ fontFamily: 'var(--font-text)' }}>
              {result.amortization.length} payments
            </span>
            {tableOpen ? <ChevronUp size={16} className="text-note-blue-ink" /> : <ChevronDown size={16} className="text-note-blue-ink" />}
          </div>
        </button>

        {tableOpen && (
          <div className="glass-card-static mt-2 overflow-hidden">
            {/* Tab + page controls */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-ink/7 flex-wrap gap-3">
              <div className="flex gap-2">
                {(['Standard', 'With Extras'] as const).map((tab) => {
                  const isExtras = tab === 'With Extras';
                  const disabled = isExtras && inputs.extraMonthlyPayment <= 0;
                  return (
                    <button
                      key={tab}
                      disabled={disabled}
                      onClick={() => { setShowWithExtras(isExtras); setTablePage(0); }}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        showWithExtras === isExtras && !disabled
                          ? 'bg-note-blue/20 text-note-blue-ink border border-note-blue/30'
                          : 'text-ink-subtle hover:text-ink-muted',
                        disabled && 'opacity-30 cursor-not-allowed'
                      )}
                      style={{ fontFamily: 'var(--font-text)' }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
              {/* Pagination */}
              {(() => {
                const activeRows = showWithExtras ? result.amortizationWithExtras : result.amortization;
                const totalPages = Math.ceil(activeRows.length / ROWS_PER_PAGE);
                return totalPages > 1 ? (
                  <div className="flex items-center gap-2 text-xs text-ink-subtle" style={{ fontFamily: 'var(--font-text)' }}>
                    <button disabled={tablePage === 0} onClick={() => setTablePage((p) => p - 1)}
                      className="p-1 rounded hover:text-ink disabled:opacity-30">
                      <ChevronLeft size={14} />
                    </button>
                    <span>Page {tablePage + 1} / {totalPages}</span>
                    <button disabled={tablePage >= totalPages - 1} onClick={() => setTablePage((p) => p + 1)}
                      className="p-1 rounded hover:text-ink disabled:opacity-30">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ fontFamily: 'var(--font-text)' }}>
                <thead>
                  <tr className="border-b border-ink/7">
                    {['#', 'Opening Balance', 'Payment', 'Principal', 'Interest', 'Closing Balance', 'Cum. Interest'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-ink-subtle whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(showWithExtras ? result.amortizationWithExtras : result.amortization)
                    .slice(tablePage * ROWS_PER_PAGE, (tablePage + 1) * ROWS_PER_PAGE)
                    .map((row) => (
                      <tr key={row.period} className="border-b border-ink/4 hover:bg-note-blue/5 transition-colors">
                        <td className="px-4 py-2 text-ink-subtle">{row.period}</td>
                        <td className="px-4 py-2 text-ink-muted">{formatRand(row.openingBalance)}</td>
                        <td className="px-4 py-2 font-semibold text-ink">{formatRand(row.payment)}</td>
                        <td className="px-4 py-2 text-gain-ink">{formatRand(row.principal)}</td>
                        <td className="px-4 py-2 text-loss-ink">{formatRand(row.interest)}</td>
                        <td className="px-4 py-2 text-ink-muted">{formatRand(row.closingBalance)}</td>
                        <td className="px-4 py-2 text-note-orange-ink">{formatRand(row.cumulativeInterest)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
