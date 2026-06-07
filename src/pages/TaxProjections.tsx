import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, Receipt, Building2, Info } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { formatRand, formatRandShort } from '../utils/format';
import { calcIncomeTax } from '../utils/tax';
import type { AgeGroup } from '../types';

// ── Constants ────────────────────────────────────────────────────────────────
const CGT_ANNUAL_EXCLUSION = 50_000;
const CGT_INCLUSION_RATE   = 0.40;

const AGE_OPTIONS = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74',  label: '65 – 74 years' },
  { value: '75plus',  label: '75 years and older' },
];

const YEAR_OPTIONS = [
  { value: '5',  label: '5 years'  },
  { value: '10', label: '10 years' },
  { value: '15', label: '15 years' },
  { value: '20', label: '20 years' },
];

const C = {
  indigo:  '#6366F1',
  amber:   '#F59E0B',
  emerald: '#10B981',
  red:     '#EF4444',
  cyan:    '#06B6D4',
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Inputs {
  purchasePrice:               number;
  loanAmount:                  number;
  interestRatePercent:         number;
  loanTermYears:               number;
  monthlyRentYear1:            number;
  annualRentEscalationPercent: number;
  managementFeePercent:        number;
  annualRates:                 number;
  annualLevies:                number;
  annualInsurance:             number;
  annualRepairsPercent:        number;
  otherAnnualIncome:           number;
  ageGroup:                    AgeGroup;
  annualPropertyGrowthPercent: number;
  saleCostsPercent:            number;
  projectionYears:             number;
}

interface YearRow {
  year:               number;
  grossRent:          number;
  bondInterest:       number;
  otherDeductions:    number;
  totalDeductions:    number;
  taxableRental:      number;
  rentalTax:          number;
  netCash:            number;  // grossRent - deductions - tax (pre-principal)
  cumulativeNetCash:  number;
  cumulativeTax:      number;
  propertyValue:      number;
  capitalGain:        number;
  cgtAtExit:          number;
  netProceedsAtExit:  number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcYearBondInterest(
  loanAmount: number,
  annualRate: number,
  termYears:  number,
  year:       number,
): number {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0 || loanAmount <= 0 || n === 0) return 0;
  const pmt = (loanAmount * r) / (1 - Math.pow(1 + r, -n));

  let balance = loanAmount;
  // advance balance to start of the requested year
  const skipMonths = (year - 1) * 12;
  for (let m = 0; m < skipMonths; m++) {
    if (balance <= 0) break;
    const interest  = balance * r;
    balance        -= (pmt - interest);
    if (balance < 0) balance = 0;
  }

  let annualInterest = 0;
  for (let m = 0; m < 12; m++) {
    if (balance <= 0) break;
    const interest  = balance * r;
    annualInterest += interest;
    balance        -= (pmt - interest);
    if (balance < 0) balance = 0;
  }
  return annualInterest;
}

function calcCGTSimple(
  capitalGain:  number,
  otherIncome:  number,
  ageGroup:     AgeGroup,
): number {
  const gainAfterExclusion = Math.max(0, capitalGain - CGT_ANNUAL_EXCLUSION);
  const inclusion  = gainAfterExclusion * CGT_INCLUSION_RATE;
  const taxWith    = calcIncomeTax(otherIncome + inclusion, ageGroup);
  const taxWithout = calcIncomeTax(otherIncome, ageGroup);
  return Math.max(0, taxWith - taxWithout);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

// ── Component ─────────────────────────────────────────────────────────────────
export function TaxProjections() {
  const [inp, setInp] = useState<Inputs>({
    purchasePrice:               1_500_000,
    loanAmount:                  1_200_000,
    interestRatePercent:         11.5,
    loanTermYears:               20,
    monthlyRentYear1:            10_000,
    annualRentEscalationPercent: 8,
    managementFeePercent:        10,
    annualRates:                 18_000,
    annualLevies:                12_000,
    annualInsurance:             6_000,
    annualRepairsPercent:        1,
    otherAnnualIncome:           480_000,
    ageGroup:                    'under65',
    annualPropertyGrowthPercent: 5,
    saleCostsPercent:            2.5,
    projectionYears:             10,
  });

  const n = (fn: (v: number) => Partial<Inputs>) => (val: string) =>
    setInp((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  // ── Core projection ────────────────────────────────────────────────────────
  const rows = useMemo<YearRow[]>(() => {
    const result: YearRow[] = [];
    let cumulativeNetCash = 0;
    let cumulativeTax     = 0;

    for (let year = 1; year <= inp.projectionYears; year++) {
      // Rental income grows with escalation
      const grossRent = inp.monthlyRentYear1
        * Math.pow(1 + inp.annualRentEscalationPercent / 100, year - 1)
        * 12;

      // Bond interest for this year (declining as loan amortises)
      const bondInterest = calcYearBondInterest(
        inp.loanAmount, inp.interestRatePercent, inp.loanTermYears, year,
      );

      // Other deductible costs
      const mgmtFee       = (inp.managementFeePercent / 100) * grossRent;
      const repairs       = (inp.annualRepairsPercent / 100) * inp.purchasePrice;
      const otherDeductions = inp.annualRates + inp.annualLevies + inp.annualInsurance + repairs + mgmtFee;
      const totalDeductions = bondInterest + otherDeductions;

      // Taxable rental income (ring-fenced: can't go below 0)
      const taxableRental = Math.max(0, grossRent - totalDeductions);

      // Marginal tax on rental income
      const taxWithRental  = calcIncomeTax(inp.otherAnnualIncome + taxableRental, inp.ageGroup);
      const taxWithout     = calcIncomeTax(inp.otherAnnualIncome, inp.ageGroup);
      const rentalTax      = Math.max(0, taxWithRental - taxWithout);

      // Net rental cash (pre-principal repayment)
      const netCash = grossRent - totalDeductions - rentalTax;
      cumulativeNetCash += netCash;
      cumulativeTax     += rentalTax;

      // Property value and CGT at this exit year
      const propertyValue = inp.purchasePrice
        * Math.pow(1 + inp.annualPropertyGrowthPercent / 100, year);
      const saleCosts       = (inp.saleCostsPercent / 100) * propertyValue;
      const capitalGain     = Math.max(0, propertyValue - saleCosts - inp.purchasePrice);
      const cgtAtExit       = calcCGTSimple(capitalGain, inp.otherAnnualIncome, inp.ageGroup);
      const netProceedsAtExit = propertyValue - saleCosts - cgtAtExit;

      result.push({
        year,
        grossRent,
        bondInterest,
        otherDeductions,
        totalDeductions,
        taxableRental,
        rentalTax,
        netCash,
        cumulativeNetCash,
        cumulativeTax,
        propertyValue,
        capitalGain,
        cgtAtExit,
        netProceedsAtExit,
      });
    }
    return result;
  }, [inp]);

  // ── Derived summary ────────────────────────────────────────────────────────
  const last = rows[rows.length - 1];

  const totalRentalTax  = last?.cumulativeTax     ?? 0;
  const totalNetCash    = last?.cumulativeNetCash  ?? 0;
  const breakEvenYear   = rows.find((r) => r.cumulativeNetCash >= 0)?.year ?? null;

  // Best exit year = highest (netProceedsAtExit + cumulativeNetCash - purchasePrice)
  const bestExit = rows.reduce((best, r) => {
    const totalReturn = r.netProceedsAtExit + r.cumulativeNetCash - inp.purchasePrice;
    const bestReturn  = best.netProceedsAtExit + best.cumulativeNetCash - inp.purchasePrice;
    return totalReturn > bestReturn ? r : best;
  }, rows[0]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const annualChartData = rows.map((r) => ({
    year:    `Y${r.year}`,
    netCash: Math.round(r.netCash),
    tax:     Math.round(r.rentalTax),
  }));

  const cumulativeChartData = rows.map((r) => ({
    year:          `Y${r.year}`,
    cumulativeNet: Math.round(r.cumulativeNetCash),
    cumulativeTax: Math.round(r.cumulativeTax),
  }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <TrendingUp size={20} className="text-[#6366F1]" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}
            >
              Tax Projections
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Multi-year rental tax forecast · SARS 2026 brackets · CGT at each exit point
            </p>
          </div>
          <span
            className="ml-auto text-xs px-3 py-1.5 rounded-full font-semibold hidden sm:inline-block"
            style={{ background: 'rgba(16,185,129,0.12)', color: C.emerald, border: `1px solid ${C.emerald}44` }}
          >
            2026 Tax Year
          </span>
        </div>
      </motion.div>

      {/* Info banner */}
      <div
        className="flex items-start gap-3 p-3 rounded-xl text-xs"
        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}
      >
        <Info size={14} className="text-[#6366F1] mt-0.5 flex-shrink-0" />
        <span style={{ color: 'var(--color-text-muted)' }}>
          Shows how your rental tax liability changes year-by-year as rent escalates and bond interest deductions decrease —
          plus CGT if you sold at each year. <strong style={{ color: 'var(--color-text)' }}>Net Rental Profit</strong> = Gross Rent − All Deductible Costs − Tax (principal repayment excluded — it builds equity).
        </span>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Property & Bond */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Building2 size={15} className="text-[#F59E0B]" />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Property &amp; Bond
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="purchasePrice" label="Purchase Price" value={inp.purchasePrice}
              onChange={n((v) => ({ purchasePrice: v }))} prefix="R" />
            <InputField id="loanAmount" label="Loan Amount" value={inp.loanAmount}
              onChange={n((v) => ({ loanAmount: v }))} prefix="R" />
            <InputField id="interestRate" label="Interest Rate" value={inp.interestRatePercent}
              onChange={n((v) => ({ interestRatePercent: v }))} suffix="%" step={0.25} />
            <InputField id="loanTerm" label="Loan Term" value={inp.loanTermYears}
              onChange={n((v) => ({ loanTermYears: v }))} suffix="yrs" />
            <InputField id="propertyGrowth" label="Property Growth" value={inp.annualPropertyGrowthPercent}
              onChange={n((v) => ({ annualPropertyGrowthPercent: v }))} suffix="% p.a." step={0.5} />
            <InputField id="saleCosts" label="Sale Costs" value={inp.saleCostsPercent}
              onChange={n((v) => ({ saleCostsPercent: v }))} suffix="%" step={0.5} />
          </div>
        </div>

        {/* Rental & Income */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Receipt size={15} className="text-[#6366F1]" />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Rental &amp; Income
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="monthlyRent" label="Monthly Rent (Yr 1)" value={inp.monthlyRentYear1}
              onChange={n((v) => ({ monthlyRentYear1: v }))} prefix="R" />
            <InputField id="rentEscalation" label="Rent Escalation" value={inp.annualRentEscalationPercent}
              onChange={n((v) => ({ annualRentEscalationPercent: v }))} suffix="% p.a." step={0.5} />
            <InputField id="annualRates" label="Annual Rates" value={inp.annualRates}
              onChange={n((v) => ({ annualRates: v }))} prefix="R" />
            <InputField id="annualLevies" label="Annual Levies" value={inp.annualLevies}
              onChange={n((v) => ({ annualLevies: v }))} prefix="R" />
            <InputField id="annualInsurance" label="Annual Insurance" value={inp.annualInsurance}
              onChange={n((v) => ({ annualInsurance: v }))} prefix="R" />
            <InputField id="repairsPercent" label="Repairs (% of value)" value={inp.annualRepairsPercent}
              onChange={n((v) => ({ annualRepairsPercent: v }))} suffix="%" step={0.25} />
            <InputField id="mgmtFee" label="Management Fee" value={inp.managementFeePercent}
              onChange={n((v) => ({ managementFeePercent: v }))} suffix="%" step={0.5} />
            <InputField id="otherIncome" label="Other Annual Income" value={inp.otherAnnualIncome}
              onChange={n((v) => ({ otherAnnualIncome: v }))} prefix="R" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField id="ageGroup" label="Age Group" value={inp.ageGroup}
              onChange={(v) => setInp((p) => ({ ...p, ageGroup: v as AgeGroup }))}
              options={AGE_OPTIONS} />
            <SelectField id="projectionYears" label="Projection Period" value={String(inp.projectionYears)}
              onChange={(v) => setInp((p) => ({ ...p, projectionYears: parseInt(v) }))}
              options={YEAR_OPTIONS} />
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Rental Tax"
          value={formatRand(totalRentalTax, 0)}
          sub={`Over ${inp.projectionYears} years`}
          color="red"
          delay={0}
        />
        <StatCard
          label="Net Rental Profit"
          value={formatRand(totalNetCash, 0)}
          sub="After tax &amp; deductions"
          color={totalNetCash >= 0 ? 'emerald' : 'red'}
          delay={0.05}
        />
        <StatCard
          label="CGT at Exit"
          value={formatRand(last?.cgtAtExit ?? 0, 0)}
          sub={`Year ${inp.projectionYears} sale`}
          color="amber"
          delay={0.1}
        />
        <StatCard
          label={breakEvenYear ? `Break-even Year ${breakEvenYear}` : 'No break-even'}
          value={breakEvenYear ? `Year ${breakEvenYear}` : '—'}
          sub="Cumulative net cash ≥ 0"
          color="indigo"
          delay={0.15}
        />
      </div>

      {/* Best exit callout */}
      {bestExit && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: C.emerald }}>
              Optimal Exit: Year {bestExit.year}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Highest combined return (net sale proceeds + cumulative rental profit − purchase price)
            </p>
          </div>
          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Net Proceeds</p>
              <p className="text-sm font-bold" style={{ color: C.emerald }}>
                {formatRand(bestExit.netProceedsAtExit, 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Total Return</p>
              <p className="text-sm font-bold" style={{ color: C.emerald }}>
                {formatRand(bestExit.netProceedsAtExit + bestExit.cumulativeNetCash - inp.purchasePrice, 0)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Annual breakdown */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-4"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Annual Net Profit vs Tax Paid
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={annualChartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => formatRandShort(v)} />
              <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }}
                formatter={(v, name) => [
                  formatRand(Number(v), 0),
                  name === 'netCash' ? 'Net Rental Profit' : 'Tax Paid',
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Bar dataKey="netCash" name="Net Rental Profit" fill={C.emerald} radius={[3, 3, 0, 0]} />
              <Bar dataKey="tax"     name="Tax Paid"          fill={C.red}     radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cumulative area */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-4"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Cumulative Net Cash vs Cumulative Tax
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cumulativeChartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.emerald} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.emerald} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradTax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.red} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.red} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => formatRandShort(v)} />
              <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }}
                formatter={(v, name) => [
                  formatRand(Number(v), 0),
                  name === 'cumulativeNet' ? 'Cumulative Net' : 'Cumulative Tax',
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Area type="monotone" dataKey="cumulativeNet" name="Cumulative Net"
                stroke={C.emerald} fill="url(#gradNet)" strokeWidth={2} />
              <Area type="monotone" dataKey="cumulativeTax" name="Cumulative Tax"
                stroke={C.red} fill="url(#gradTax)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-Year Rental Table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Year-by-Year Rental Tax Breakdown
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[680px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Year', 'Gross Rent', 'Bond Interest', 'Other Costs', 'Taxable Rental', 'Tax Paid', 'Net Profit'].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.year} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                }}>
                  <td className="py-2 px-3 font-bold" style={{ color: '#818CF8' }}>Y{r.year}</td>
                  <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>
                    {formatRand(r.grossRent, 0)}
                  </td>
                  <td className="py-2 px-3" style={{ color: C.amber }}>
                    {formatRand(r.bondInterest, 0)}
                  </td>
                  <td className="py-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                    {formatRand(r.otherDeductions, 0)}
                  </td>
                  <td className="py-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                    {formatRand(r.taxableRental, 0)}
                  </td>
                  <td className="py-2 px-3" style={{ color: C.red }}>
                    {formatRand(r.rentalTax, 0)}
                  </td>
                  <td className="py-2 px-3 font-semibold"
                    style={{ color: r.netCash >= 0 ? C.emerald : C.red }}>
                    {formatRand(r.netCash, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CGT at Exit Table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Capital Gains Tax at Each Exit Year
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          What your CGT bill would be if you sold at the end of each year. Based on SARS 2026 rates — 40% inclusion, R50k annual exclusion.
          <br />
          <span className="opacity-75">Total Return = Net Sale Proceeds + Cumulative Net Rental − Purchase Price</span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Year', 'Property Value', 'Capital Gain', 'CGT Payable', 'Net Proceeds', 'Cum. Rental Net', 'Total Return'].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const totalReturn = r.netProceedsAtExit + r.cumulativeNetCash - inp.purchasePrice;
                const isOptimal   = bestExit?.year === r.year;
                return (
                  <tr key={r.year} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isOptimal
                      ? 'rgba(16,185,129,0.06)'
                      : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    <td className="py-2 px-3 font-bold" style={{ color: isOptimal ? C.emerald : '#818CF8' }}>
                      Y{r.year}{isOptimal ? ' ★' : ''}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>
                      {formatRand(r.propertyValue, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: C.amber }}>
                      {formatRand(r.capitalGain, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: C.red }}>
                      {formatRand(r.cgtAtExit, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: C.emerald }}>
                      {formatRand(r.netProceedsAtExit, 0)}
                    </td>
                    <td className="py-2 px-3"
                      style={{ color: r.cumulativeNetCash >= 0 ? C.emerald : C.red }}>
                      {formatRand(r.cumulativeNetCash, 0)}
                    </td>
                    <td className="py-2 px-3 font-semibold"
                      style={{ color: totalReturn >= 0 ? C.emerald : C.red }}>
                      {formatRand(totalReturn, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Projections are illustrative estimates only. Tax rates based on SARS 2026 tax year. Not financial advice — consult a registered tax practitioner before making decisions.
      </p>
    </div>
  );
}
