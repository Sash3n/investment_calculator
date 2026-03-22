import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Car, Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { calcCarFinance } from '../utils/car';
import { formatRand } from '../utils/format';
import type { CarInputs } from '../types';

const CHART_COLORS = {
  indigo: '#6366F1',
  amber: '#F59E0B',
  emerald: '#10B981',
  red: '#EF4444',
  cyan: '#06B6D4',
  pink: '#EC4899',
};

const DEFAULT_INPUTS: CarInputs = {
  vehiclePrice: 450000,
  deposit: 50000,
  balloonPercent: 0,
  interestRate: 11.25,
  termMonths: 72,
  monthlyInsurance: 1200,
  monthlyFuel: 2500,
  monthlyMaintenance: 800,
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

export function CarFinance() {
  const [inputs, setInputs] = useState<CarInputs>(DEFAULT_INPUTS);

  const set = useCallback(<K extends keyof CarInputs>(key: K, raw: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(raw) || 0 }));
  }, []);

  const result = useMemo(() => calcCarFinance(inputs), [inputs]);

  // ── Chart data ─────────────────────────────────────────────
  // Area: balance vs depreciated value over term
  const balanceValueData = useMemo(() => {
    const months = inputs.termMonths;
    const depRates = [0.15, 0.12, 0.10, 0.10, 0.10, 0.10];
    const monthlyRate = inputs.interestRate / 100 / 12;

    return Array.from({ length: Math.ceil(months / 6) + 1 }, (_, i) => {
      const month = i * 6;
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

      let loanBal = result.financedAmount;
      if (month > 0 && result.financedAmount > 0 && monthlyRate > 0) {
        loanBal = result.financedAmount *
          (Math.pow(1 + monthlyRate, months) - Math.pow(1 + monthlyRate, month)) /
          (Math.pow(1 + monthlyRate, months) - 1);
        if (month >= months) loanBal = 0;
      }

      return {
        month: `M${month}`,
        'Car Value': Math.round(Math.max(0, value)),
        'Loan Balance': Math.round(Math.max(0, Math.min(loanBal + (month < months ? result.balloonAmount : 0), result.loanAmount))),
      };
    });
  }, [inputs, result]);

  // Monthly cost breakdown bar
  const monthlyCostData = [
    { name: 'Instalment', value: Math.round(result.monthlyInstalment), fill: CHART_COLORS.indigo },
    { name: 'Insurance', value: inputs.monthlyInsurance, fill: CHART_COLORS.amber },
    { name: 'Fuel', value: inputs.monthlyFuel, fill: CHART_COLORS.emerald },
    { name: 'Maintenance', value: inputs.monthlyMaintenance, fill: CHART_COLORS.cyan },
  ];

  // Pie: total cost breakdown
  const totalCostPie = [
    { name: 'Principal', value: Math.round(result.loanAmount), fill: CHART_COLORS.indigo },
    { name: 'Interest', value: Math.round(result.totalInterest), fill: CHART_COLORS.red },
    { name: 'Insurance', value: inputs.monthlyInsurance * inputs.termMonths, fill: CHART_COLORS.amber },
    { name: 'Fuel', value: inputs.monthlyFuel * inputs.termMonths, fill: CHART_COLORS.emerald },
    { name: 'Maintenance', value: inputs.monthlyMaintenance * inputs.termMonths, fill: CHART_COLORS.cyan },
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
          <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]"
             style={{ fontFamily: 'var(--font-body)' }}>
            Finance Details
          </p>
          <InputField label="Vehicle Price" id="vp" value={inputs.vehiclePrice}
            onChange={(v) => set('vehiclePrice', v)} prefix="R" step={10000} />
          <InputField label="Deposit" id="dep" value={inputs.deposit}
            onChange={(v) => set('deposit', v)} prefix="R" step={5000} />
          <InputField label="Balloon Payment" id="bal" value={inputs.balloonPercent}
            onChange={(v) => set('balloonPercent', v)} suffix="% of price" step={5} min={0} max={30}
            help={`= ${formatRand(result.balloonAmount)} lump sum at end of term`} />
          <InputField label="Interest Rate" id="ir" value={inputs.interestRate}
            onChange={(v) => set('interestRate', v)} suffix="%" step={0.25} />
          <InputField label="Term" id="term" value={inputs.termMonths}
            onChange={(v) => set('termMonths', v)} suffix="months" min={12} max={84} step={12}
            help="Common SA term: 72 months (6 years)" />

          <div className="border-t border-[rgba(255,255,255,0.07)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#475569] mb-4"
               style={{ fontFamily: 'var(--font-body)' }}>
              Monthly Running Costs
            </p>
            <div className="space-y-4">
              <InputField label="Insurance" id="ins" value={inputs.monthlyInsurance}
                onChange={(v) => set('monthlyInsurance', v)} prefix="R" step={100} />
              <InputField label="Fuel" id="fuel" value={inputs.monthlyFuel}
                onChange={(v) => set('monthlyFuel', v)} prefix="R" step={100} />
              <InputField label="Maintenance" id="maint" value={inputs.monthlyMaintenance}
                onChange={(v) => set('monthlyMaintenance', v)} prefix="R" step={100} />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="four-col-stats">
            <StatCard label="Monthly Instalment" value={formatRand(result.monthlyInstalment)}
              color="indigo" delay={0} />
            <StatCard label="Total Repayments" value={formatRand(result.totalRepayments)}
              color="amber" delay={0.05} />
            <StatCard label="Total Interest" value={formatRand(result.totalInterest)}
              color="red" delay={0.1} />
            <StatCard label="Total Cost of Ownership" value={formatRand(result.totalCostOfOwnership)}
              sub={`${termYears.toFixed(0)} yr period`} color="emerald" delay={0.15} />
          </div>

          {/* Additional metrics */}
          <div className="glass-card-static p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Balloon Amount', value: formatRand(result.balloonAmount), color: inputs.balloonPercent > 0 ? '#F59E0B' : '#64748B' },
              { label: 'Effective Annual Cost', value: formatRand(result.effectiveAnnualCost), color: '#EF4444' },
              { label: 'Underwater Months', value: `${result.underwaterMonths} months`, color: result.underwaterMonths > 0 ? '#EF4444' : '#10B981' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1"
                   style={{ fontFamily: 'var(--font-body)' }}>
                  {s.label}
                </p>
                <p className="text-base font-bold" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Underwater warning */}
          {result.underwaterMonths > 0 && (
            <div className="glass-card-static p-4 border-l-[3px] border-l-[#EF4444] flex items-start gap-3">
              <AlertTriangle size={16} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#EF4444]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Negative Equity Warning
                </p>
                <p className="text-xs text-[#94A3B8] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                  Your loan balance exceeds the car's depreciated value for{' '}
                  <strong>{result.underwaterMonths} months</strong>. If you sell or write off the vehicle during
                  this period, you would owe more than the car is worth.
                </p>
              </div>
            </div>
          )}

          {/* Balance vs Value AreaChart */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Loan Balance vs Car Value Over Term
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={balanceValueData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCarVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradCarBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.red} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS.red} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                <Area type="monotone" dataKey="Car Value" stroke={CHART_COLORS.emerald}
                  fill="url(#gradCarVal)" strokeWidth={2} />
                <Area type="monotone" dataKey="Loan Balance" stroke={CHART_COLORS.red}
                  fill="url(#gradCarBal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="two-col-charts">
            {/* Monthly cost breakdown */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Monthly Cost Breakdown
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyCostData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(v) => `R ${(v / 1000).toFixed(1)}K`} />
                  <Tooltip
                    formatter={(v: unknown) => [formatRand(Number(v)), 'Monthly']}
                    contentStyle={{ background: 'rgba(15,20,40,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '12px', color: '#F1F5F9' }}
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
              <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
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
                  <Tooltip
                    formatter={(v: unknown) => [formatRand(Number(v)), '']}
                    contentStyle={{ background: 'rgba(15,20,40,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '12px', color: '#F1F5F9' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#94A3B8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Depreciation LineChart */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-[#F1F5F9] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Depreciation Schedule
            </p>
            <p className="text-xs text-[#64748B] mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Yr1: 15% · Yr2: 12% · Yr3+: 10% per annum
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={depreciationData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                <Line type="monotone" dataKey="Vehicle Value" stroke={CHART_COLORS.emerald}
                  strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.emerald }} />
                <Line type="monotone" dataKey="Loan Balance" stroke={CHART_COLORS.red}
                  strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.red }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Finance vs Cash comparison */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold text-[#F1F5F9] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Finance vs Cash Purchase
            </p>
            <p className="text-xs text-[#64748B] mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Opportunity cost assumes cash invested at 10% p.a. over {termYears.toFixed(0)} years.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card-static p-4 border-l-[3px] border-l-[#6366F1]">
                <p className="text-xs text-[#94A3B8] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                  Finance Route
                </p>
                <p className="text-xl font-bold text-[#F1F5F9]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatRand(result.totalCostOfOwnership)}
                </p>
                <p className="text-xs text-[#64748B] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                  Total out-of-pocket over {termYears.toFixed(0)} years
                </p>
              </div>
              <div className="glass-card-static p-4 border-l-[3px] border-l-[#F59E0B]">
                <p className="text-xs text-[#94A3B8] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                  Cash Purchase Opportunity Cost
                </p>
                <p className="text-xl font-bold text-[#F59E0B]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {formatRand(result.cashPurchaseOpportunityCost)}
                </p>
                <p className="text-xs text-[#64748B] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                  What your capital could have grown to
                </p>
              </div>
            </div>
            <p className="text-xs text-[#94A3B8] mt-4" style={{ fontFamily: 'var(--font-body)' }}>
              Note: Cash purchase avoids interest ({formatRand(result.totalInterest)}) but forfeits investment growth.
              Finance preserves liquidity for higher-yield investments.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
