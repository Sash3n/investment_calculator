import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  Receipt, Building2, TrendingUp, Info, AlertCircle,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { formatRand, formatPercent, formatRandShort } from '../utils/format';
import {
  calcRentalIncomeTax,
  calc13sex,
  calc13quat,
  calcCGT,
} from '../utils/tax';
import type {
  RentalTaxInputs,
  Section13sexInputs,
  Section13quatInputs,
  CGTInputs,
  AgeGroup,
  UDZBuildingType,
  PropertyType,
} from '../types';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  indigo: '#6366F1', amber: '#F59E0B', emerald: '#10B981',
  red: '#EF4444', cyan: '#06B6D4', violet: '#8B5CF6', pink: '#EC4899',
};
const PIE_COLORS = [C.indigo, C.amber, C.emerald, C.cyan, C.violet, C.pink, C.red, '#94A3B8'];

type MainTab = 'rental' | 'section13' | 'cgt';
type S13Tab = '13sex' | '13quat';

const AGE_OPTIONS = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74',  label: '65 – 74 years' },
  { value: '75plus',  label: '75 years and older' },
];

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function RandTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ minWidth: 160 }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill ?? C.indigo }}>{p.name}: {formatRand(p.value, 0)}</p>
      ))}
    </div>
  );
}

// ── Info badge ────────────────────────────────────────────────────────────────
function InfoBadge({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
      <Info size={13} className="mt-0.5 flex-shrink-0 text-[#6366F1]" />
      <span style={{ color: 'var(--color-text-muted)' }}>{text}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function TaxPlanner() {
  const [activeTab, setActiveTab] = useState<MainTab>('rental');
  const [s13Tab, setS13Tab] = useState<S13Tab>('13sex');
  const [showSchedule, setShowSchedule] = useState(false);

  // ── Rental Tax inputs ──────────────────────────────────────────────────────
  const [rental, setRental] = useState<RentalTaxInputs>({
    monthlyGrossRent: 12000,
    annualBondInterest: 85000,
    annualRates: 18000,
    annualLevies: 12000,
    annualInsurance: 6000,
    annualRepairs: 5000,
    managementFeePercent: 10,
    annualAdvertising: 1500,
    otherDeductions: 0,
    otherAnnualIncome: 480000,
    ageGroup: 'under65',
  });

  // ── Section 13sex inputs ───────────────────────────────────────────────────
  const [s13sex, setS13sex] = useState<Section13sexInputs>({
    numberOfUnits: 5,
    purchasePricePerUnit: 900000,
    isLowCostHousing: false,
    annualTaxableIncome: 800000,
    ageGroup: 'under65',
  });

  // ── Section 13quat inputs ──────────────────────────────────────────────────
  const [s13quat, setS13quat] = useState<Section13quatInputs>({
    buildingCost: 2000000,
    buildingType: 'new',
    annualTaxableIncome: 800000,
    ageGroup: 'under65',
  });

  // ── CGT inputs ─────────────────────────────────────────────────────────────
  const [cgt, setCgt] = useState<CGTInputs>({
    purchasePrice: 1500000,
    acquisitionCosts: 95000,
    salePrice: 2800000,
    saleCostsPercent: 2.5,
    propertyType: 'investment',
    jointOwnership: false,
    otherAnnualTaxableIncome: 600000,
    ageGroup: 'under65',
  });

  // ── Results ────────────────────────────────────────────────────────────────
  const rentalResult = useMemo(() => calcRentalIncomeTax(rental), [rental]);
  const s13sexResult = useMemo(() => calc13sex(s13sex), [s13sex]);
  const s13quatResult = useMemo(() => calc13quat(s13quat), [s13quat]);
  const cgtResult = useMemo(() => calcCGT(cgt), [cgt]);

  // ── Input helpers ──────────────────────────────────────────────────────────
  const nr = (fn: (v: number) => Partial<RentalTaxInputs>) => (val: string) =>
    setRental((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));
  const ns = (fn: (v: number) => Partial<Section13sexInputs>) => (val: string) =>
    setS13sex((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));
  const nq = (fn: (v: number) => Partial<Section13quatInputs>) => (val: string) =>
    setS13quat((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));
  const nc = (fn: (v: number) => Partial<CGTInputs>) => (val: string) =>
    setCgt((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  // ── Tab button ─────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label, icon: Icon, color }: { id: MainTab; label: string; icon: typeof Receipt; color: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
      style={{
        background: activeTab === id ? `${color}22` : 'transparent',
        border: `1px solid ${activeTab === id ? `${color}55` : 'var(--color-border)'}`,
        color: activeTab === id ? color : 'var(--color-text-muted)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  const S13TabBtn = ({ id, label }: { id: S13Tab; label: string }) => (
    <button
      onClick={() => setS13Tab(id)}
      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
      style={{
        background: s13Tab === id ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: s13Tab === id ? C.indigo : 'var(--color-text-muted)',
        border: `1px solid ${s13Tab === id ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
        fontFamily: 'var(--font-body)',
      }}
    >
      {label}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Property Tax Planner
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              SARS 2026 tax year · 1 March 2025 – 28 February 2026
            </p>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: 'rgba(16,185,129,0.12)', color: C.emerald, border: `1px solid ${C.emerald}44` }}
          >
            2026 Rates · CGT exclusion R3M
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mt-5">
          <TabBtn id="rental"    label="Rental Income Tax"    icon={Receipt}    color={C.indigo} />
          <TabBtn id="section13" label="Section 13 Incentives" icon={Building2}  color={C.amber}  />
          <TabBtn id="cgt"       label="CGT Planner"           icon={TrendingUp} color={C.emerald} />
        </div>
      </motion.div>

      {/* ── TAB 1: Rental Income Tax ─────────────────────────────────────────── */}
      {activeTab === 'rental' && (
        <motion.div
          key="rental"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5"
        >
          {/* Inputs */}
          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Rental Income & Deductions" icon={Receipt} />
            <InfoBadge text="Enter annual figures. Deductions must be directly related to producing rental income (SARS Section 25)." />

            <InputField label="Monthly Gross Rent" id="r-rent" value={rental.monthlyGrossRent} onChange={nr((v) => ({ monthlyGrossRent: v }))} prefix="R" />
            <InputField label="Annual Other Income (Salary etc.)" id="r-other" value={rental.otherAnnualIncome} onChange={nr((v) => ({ otherAnnualIncome: v }))} prefix="R" help="Used to determine your tax bracket" />
            <SelectField label="Age Group" id="r-age" value={rental.ageGroup} onChange={(v) => setRental((p) => ({ ...p, ageGroup: v as AgeGroup }))} options={AGE_OPTIONS} help="Determines rebate applied" />

            <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Allowable Deductions</p>
              <div className="space-y-3">
                <InputField label="Annual Bond Interest Paid" id="r-interest" value={rental.annualBondInterest} onChange={nr((v) => ({ annualBondInterest: v }))} prefix="R" help="Interest only — not capital repayment" />
                <InputField label="Annual Rates & Municipal Taxes" id="r-rates" value={rental.annualRates} onChange={nr((v) => ({ annualRates: v }))} prefix="R" />
                <InputField label="Annual Levies / Body Corporate" id="r-levies" value={rental.annualLevies} onChange={nr((v) => ({ annualLevies: v }))} prefix="R" />
                <InputField label="Annual Insurance" id="r-ins" value={rental.annualInsurance} onChange={nr((v) => ({ annualInsurance: v }))} prefix="R" />
                <InputField label="Annual Repairs & Maintenance" id="r-repairs" value={rental.annualRepairs} onChange={nr((v) => ({ annualRepairs: v }))} prefix="R" help="Repairs only — not capital improvements" />
                <InputField label="Management Fee" id="r-mgmt" value={rental.managementFeePercent} onChange={nr((v) => ({ managementFeePercent: v }))} suffix="%" help="% of gross annual rent" />
                <InputField label="Annual Advertising Costs" id="r-adv" value={rental.annualAdvertising} onChange={nr((v) => ({ annualAdvertising: v }))} prefix="R" />
                <InputField label="Other Annual Deductions" id="r-other-ded" value={rental.otherDeductions} onChange={nr((v) => ({ otherDeductions: v }))} prefix="R" />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Annual Gross Rent" value={formatRandShort(rentalResult.annualGrossRent)} sub="Before deductions" icon={Receipt} color="indigo" delay={0} />
              <StatCard label="Total Deductions" value={formatRandShort(rentalResult.totalDeductions)} sub="Allowable expenses" icon={FileText} color="amber" delay={0.05} />
              <StatCard label="Taxable Rental Income" value={formatRandShort(rentalResult.taxableRentalIncome)} sub={rentalResult.bracketLabel} icon={TrendingUp} color="emerald" delay={0.1} />
              <StatCard label="Tax on Rental" value={formatRandShort(rentalResult.taxAttributableToRental)} sub={`Effective ${formatPercent(rentalResult.effectiveTaxRateOnRental, 1)}`} icon={AlertCircle} color="red" delay={0.15} />
            </div>

            {/* Summary banner */}
            <div
              className="glass-card-static p-4 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4"
              style={{ border: `1px solid ${C.emerald}33`, background: 'rgba(16,185,129,0.05)' }}
            >
              {[
                { label: 'After-Tax Monthly Cash Flow', value: formatRand(rentalResult.afterTaxMonthlyRentalCashFlow), color: C.emerald },
                { label: 'Marginal Rate', value: formatPercent(rentalResult.marginalRate, 0), color: C.amber },
                { label: 'Effective Tax on Rental', value: formatPercent(rentalResult.effectiveTaxRateOnRental, 1), color: C.red },
                { label: 'Total Taxable Income', value: formatRandShort(rentalResult.totalTaxableIncome), color: C.indigo },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{item.label}</p>
                  <p className="text-base font-bold" style={{ color: item.color, fontFamily: 'var(--font-heading)' }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Deductions breakdown bar */}
              <div className="glass-card-static p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Deduction Breakdown</p>
                {rentalResult.deductionsBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={rentalResult.deductionsBreakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickFormatter={(v) => `R${(v/1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={110} />
                      <Tooltip content={<RandTooltip />} />
                      <Bar dataKey="value" name="Amount" fill={C.indigo} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-subtle)' }}>No deductions entered</p>
                )}
              </div>

              {/* Income vs deduction pie */}
              <div className="glass-card-static p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Expense Composition</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={rentalResult.deductionsBreakdown.filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={2}
                    >
                      {rentalResult.deductionsBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatRand(Number(v), 0)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Deductions table */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Tax Calculation Summary</p>
              <table className="w-full text-xs">
                <tbody>
                  {[
                    { label: 'Annual Gross Rent', value: rentalResult.annualGrossRent, bold: false },
                    ...rentalResult.deductionsBreakdown.map(d => ({ label: `  − ${d.name}`, value: -d.value, bold: false })),
                    { label: 'Taxable Rental Income', value: rentalResult.taxableRentalIncome, bold: true },
                    { label: 'Other Income (Salary etc.)', value: rentalResult.totalTaxableIncome - rentalResult.taxableRentalIncome, bold: false },
                    { label: 'Total Taxable Income', value: rentalResult.totalTaxableIncome, bold: true },
                    { label: 'Tax on Total Income', value: -rentalResult.taxOnTotalIncome, bold: false },
                    { label: 'Tax (excl. rental portion)', value: rentalResult.taxOnOtherIncomeOnly, bold: false },
                    { label: 'Tax Attributable to Rental', value: -rentalResult.taxAttributableToRental, bold: true },
                    { label: 'After-Tax Monthly Cash Flow', value: rentalResult.afterTaxMonthlyRentalCashFlow, bold: true },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : ''} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="py-2 pr-4" style={{ color: row.bold ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: row.bold ? 600 : 400 }}>
                        {row.label}
                      </td>
                      <td
                        className="py-2 text-right font-mono"
                        style={{
                          color: row.value < 0 ? C.red : row.bold ? 'var(--color-text)' : 'var(--color-text-muted)',
                          fontWeight: row.bold ? 600 : 400,
                        }}
                      >
                        {formatRand(row.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 2: Section 13 Incentives ─────────────────────────────────────── */}
      {activeTab === 'section13' && (
        <motion.div
          key="section13"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-5"
        >
          {/* Sub-tab switcher */}
          <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <S13TabBtn id="13sex"  label="Section 13sex — 5+ Units" />
            <S13TabBtn id="13quat" label="Section 13quat — UDZ Allowance" />
          </div>

          {/* ── 13sex ─────────────────────────────────────────────────────── */}
          {s13Tab === '13sex' && (
            <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
              {/* Inputs */}
              <div className="glass-card p-5 space-y-4">
                <SectionHeader title="Section 13sex" icon={Building2} />
                <InfoBadge text="Own 5+ new, unused residential units rented out. Deduct 5% of building cost (excl. land) annually for 20 years. Low-cost housing: 10% for 10 years." />

                <InputField label="Number of Residential Units" id="s-units" value={s13sex.numberOfUnits} onChange={ns((v) => ({ numberOfUnits: Math.round(v) }))} min={1} help="Must be 5 or more to qualify" />
                <InputField label="Purchase Price per Unit (Excl. Land)" id="s-price" value={s13sex.purchasePricePerUnit} onChange={ns((v) => ({ purchasePricePerUnit: v }))} prefix="R" help="Building cost only — exclude land value" />

                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <input
                    type="checkbox"
                    id="s-lowcost"
                    checked={s13sex.isLowCostHousing}
                    onChange={(e) => setS13sex((p) => ({ ...p, isLowCostHousing: e.target.checked }))}
                    className="w-4 h-4 accent-[#6366F1]"
                  />
                  <label htmlFor="s-lowcost" className="text-sm cursor-pointer" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                    Low-cost housing (10% deduction rate, 10 years)
                  </label>
                </div>

                <InputField label="Annual Taxable Income (Other Income)" id="s-income" value={s13sex.annualTaxableIncome} onChange={ns((v) => ({ annualTaxableIncome: v }))} prefix="R" help="Your income before this deduction is applied" />
                <SelectField label="Age Group" id="s-age" value={s13sex.ageGroup} onChange={(v) => setS13sex((p) => ({ ...p, ageGroup: v as AgeGroup }))} options={AGE_OPTIONS} />
              </div>

              {/* Results */}
              <div className="space-y-5">
                {/* Qualification status */}
                <div
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{
                    background: s13sexResult.qualifies ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${s13sexResult.qualifies ? C.emerald : C.red}44`,
                  }}
                >
                  {s13sexResult.qualifies
                    ? <CheckCircle2 size={20} color={C.emerald} />
                    : <XCircle size={20} color={C.red} />}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: s13sexResult.qualifies ? C.emerald : C.red, fontFamily: 'var(--font-heading)' }}>
                      {s13sexResult.qualifies ? 'Qualifies for Section 13sex' : 'Does Not Qualify'}
                    </p>
                    {!s13sexResult.qualifies && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s13sexResult.reason}</p>
                    )}
                    {s13sexResult.qualifies && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {s13sex.numberOfUnits} units · {s13sexResult.deductionRate * 100}% rate · {s13sexResult.deductionPeriodYears} year period
                      </p>
                    )}
                  </div>
                </div>

                {s13sexResult.qualifies && (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <StatCard label="Total Building Cost" value={formatRandShort(s13sexResult.totalCostExclLand)} sub="Excl. land" icon={Building2} color="indigo" delay={0} />
                      <StatCard label="Annual Deduction" value={formatRandShort(s13sexResult.annualDeduction)} sub={`${s13sexResult.deductionRate * 100}% of cost`} icon={Receipt} color="amber" delay={0.05} />
                      <StatCard label="Annual Tax Saving" value={formatRandShort(s13sexResult.annualTaxSaving)} sub="Per tax year" icon={TrendingUp} color="emerald" delay={0.1} />
                      <StatCard label={`Total Saving (${s13sexResult.deductionPeriodYears} yrs)`} value={formatRandShort(s13sexResult.totalTaxSavingOverPeriod)} sub="Cumulative" icon={CheckCircle2} color="emerald" delay={0.15} />
                    </div>

                    {/* Chart */}
                    <div className="glass-card-static p-5">
                      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Cumulative Tax Saving Over {s13sexResult.deductionPeriodYears} Years</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={s13sexResult.schedule} margin={{ left: 8, right: 16, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--color-text-subtle)' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickFormatter={(v) => `R${(v/1000).toFixed(0)}K`} />
                          <Tooltip content={<RandTooltip />} />
                          <Line type="monotone" dataKey="cumulativeSaving" name="Cumulative Saving" stroke={C.emerald} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="taxSaving" name="Annual Saving" stroke={C.indigo} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Schedule table (collapsible) */}
                    <div className="glass-card-static overflow-hidden">
                      <button
                        onClick={() => setShowSchedule((p) => !p)}
                        className="w-full flex items-center justify-between p-4 transition-colors hover:bg-[rgba(99,102,241,0.05)]"
                      >
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
                          Full Deduction Schedule ({s13sexResult.deductionPeriodYears} years)
                        </span>
                        {showSchedule ? <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />}
                      </button>
                      {showSchedule && (
                        <div className="overflow-x-auto px-4 pb-4">
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                {['Year', 'Annual Deduction', 'Tax Saving', 'Cumulative Saving'].map((h) => (
                                  <th key={h} className="py-2 text-right first:text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {s13sexResult.schedule.map((row) => (
                                <tr key={row.year} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td className="py-2" style={{ color: 'var(--color-text-muted)' }}>{row.year}</td>
                                  <td className="py-2 text-right" style={{ color: 'var(--color-text)' }}>{formatRand(row.deduction, 0)}</td>
                                  <td className="py-2 text-right font-medium" style={{ color: C.emerald }}>{formatRand(row.taxSaving, 0)}</td>
                                  <td className="py-2 text-right font-semibold" style={{ color: C.indigo }}>{formatRand(row.cumulativeSaving, 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── 13quat ─────────────────────────────────────────────────────── */}
          {s13Tab === '13quat' && (
            <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
              {/* Inputs */}
              <div className="glass-card p-5 space-y-4">
                <SectionHeader title="Section 13quat — UDZ Allowance" icon={Building2} />
                <InfoBadge text="Accelerated depreciation for buildings in designated Urban Development Zones. Extended to 31 March 2030. Applicable in Joburg, Cape Town, Tshwane, Durban, and others." />

                <InputField label="Building / Renovation Cost" id="q-cost" value={s13quat.buildingCost} onChange={nq((v) => ({ buildingCost: v }))} prefix="R" />
                <SelectField
                  label="Building Category"
                  id="q-type"
                  value={s13quat.buildingType}
                  onChange={(v) => setS13quat((p) => ({ ...p, buildingType: v as UDZBuildingType }))}
                  options={[
                    { value: 'new',          label: 'New building or extension (20% + 8%×10)' },
                    { value: 'improvements', label: 'Improvements to existing (20%×5)' },
                    { value: 'lowcost',      label: 'Low-cost residential (25%×4)' },
                  ]}
                  help="Determines the depreciation schedule"
                />
                <InputField label="Annual Taxable Income" id="q-income" value={s13quat.annualTaxableIncome} onChange={nq((v) => ({ annualTaxableIncome: v }))} prefix="R" help="Before this allowance is applied" />
                <SelectField label="Age Group" id="q-age" value={s13quat.ageGroup} onChange={(v) => setS13quat((p) => ({ ...p, ageGroup: v as AgeGroup }))} options={AGE_OPTIONS} />

                <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="font-semibold" style={{ color: C.amber }}>UDZ Schedule</p>
                  <p style={{ color: 'var(--color-text-muted)' }}>New: 20% yr 1, then 8% × 10 years</p>
                  <p style={{ color: 'var(--color-text-muted)' }}>Improvements: 20% × 5 years</p>
                  <p style={{ color: 'var(--color-text-muted)' }}>Low-cost: 25% × 4 years</p>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Year 1 Deduction" value={formatRandShort(s13quatResult.year1Deduction)} sub="First year allowance" icon={Building2} color="amber" delay={0} />
                  <StatCard label="Year 1 Tax Saving" value={formatRandShort(s13quatResult.year1TaxSaving)} sub="Immediate benefit" icon={TrendingUp} color="emerald" delay={0.05} />
                  <StatCard label="Total Tax Saving" value={formatRandShort(s13quatResult.totalTaxSaving)} sub="Over full period" icon={CheckCircle2} color="indigo" delay={0.1} />
                  <StatCard label="Depreciation Years" value={`${s13quatResult.schedule.length} yrs`} sub="Full writeoff period" icon={Receipt} color="indigo" delay={0.15} />
                </div>

                {/* Chart */}
                <div className="glass-card-static p-5">
                  <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Annual Deduction & Tax Saving</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={s13quatResult.schedule} margin={{ left: 8, right: 16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--color-text-subtle)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickFormatter={(v) => `R${(v/1000).toFixed(0)}K`} />
                      <Tooltip content={<RandTooltip />} />
                      <Bar dataKey="deduction" name="Annual Deduction" fill={C.amber} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="taxSaving" name="Tax Saving" fill={C.emerald} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="glass-card-static p-5">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Full Depreciation Schedule</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                          {['Year', 'Rate', 'Deduction', 'Tax Saving', 'Cumulative Saving'].map((h) => (
                            <th key={h} className="py-2 text-right first:text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s13quatResult.schedule.map((row) => (
                          <tr key={row.year} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td className="py-2" style={{ color: 'var(--color-text-muted)' }}>{row.year}</td>
                            <td className="py-2 text-right" style={{ color: C.amber }}>{formatPercent(row.rate * 100, 0)}</td>
                            <td className="py-2 text-right" style={{ color: 'var(--color-text)' }}>{formatRand(row.deduction, 0)}</td>
                            <td className="py-2 text-right font-medium" style={{ color: C.emerald }}>{formatRand(row.taxSaving, 0)}</td>
                            <td className="py-2 text-right font-semibold" style={{ color: C.indigo }}>{formatRand(row.cumulativeSaving, 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── TAB 3: CGT Planner ───────────────────────────────────────────────── */}
      {activeTab === 'cgt' && (
        <motion.div
          key="cgt"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5"
        >
          {/* Inputs */}
          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Capital Gains Tax (CGT)" icon={TrendingUp} />
            <InfoBadge text="2026 Budget: Primary residence exclusion raised to R3 million. Annual exclusion raised to R50,000. Inclusion rate remains 40%." />

            <div className="p-3 rounded-xl text-xs space-y-1.5" style={{ background: 'rgba(16,185,129,0.08)', border: `1px solid ${C.emerald}33` }}>
              <p className="font-semibold" style={{ color: C.emerald }}>2026 CGT Rates</p>
              <div className="grid grid-cols-2 gap-1" style={{ color: 'var(--color-text-muted)' }}>
                <span>Primary residence exclusion:</span><span className="font-semibold text-right" style={{ color: 'var(--color-text)' }}>R3,000,000</span>
                <span>Annual exclusion:</span><span className="font-semibold text-right" style={{ color: 'var(--color-text)' }}>R50,000</span>
                <span>Inclusion rate:</span><span className="font-semibold text-right" style={{ color: 'var(--color-text)' }}>40%</span>
                <span>Max effective CGT rate:</span><span className="font-semibold text-right" style={{ color: C.red }}>18% (45% marginal)</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Acquisition</p>
              <InputField label="Original Purchase Price" id="c-buy" value={cgt.purchasePrice} onChange={nc((v) => ({ purchasePrice: v }))} prefix="R" />
              <InputField label="Acquisition Costs" id="c-acq" value={cgt.acquisitionCosts} onChange={nc((v) => ({ acquisitionCosts: v }))} prefix="R" help="Transfer duty, bond registration, legal fees, renovations" />
            </div>

            <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Disposal</p>
              <InputField label="Sale Price" id="c-sell" value={cgt.salePrice} onChange={nc((v) => ({ salePrice: v }))} prefix="R" />
              <InputField label="Sale Costs" id="c-sellcost" value={cgt.saleCostsPercent} onChange={nc((v) => ({ saleCostsPercent: v }))} suffix="%" help="Agent commission (typically 2.5–5%)" />
            </div>

            <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Property & Taxpayer</p>
              <SelectField
                label="Property Type"
                id="c-type"
                value={cgt.propertyType}
                onChange={(v) => setCgt((p) => ({ ...p, propertyType: v as PropertyType }))}
                options={[
                  { value: 'primary',    label: 'Primary Residence (R3M exclusion)' },
                  { value: 'investment', label: 'Investment / Rental Property' },
                ]}
              />
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <input
                  type="checkbox"
                  id="c-joint"
                  checked={cgt.jointOwnership}
                  onChange={(e) => setCgt((p) => ({ ...p, jointOwnership: e.target.checked }))}
                  className="w-4 h-4 accent-[#6366F1]"
                  disabled={cgt.propertyType !== 'primary'}
                />
                <label htmlFor="c-joint" className="text-sm cursor-pointer" style={{ color: cgt.propertyType !== 'primary' ? 'var(--color-text-subtle)' : 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                  Joint ownership (50/50 — splits R3M exclusion to R1.5M each)
                </label>
              </div>
              <InputField label="Other Annual Taxable Income" id="c-income" value={cgt.otherAnnualTaxableIncome} onChange={nc((v) => ({ otherAnnualTaxableIncome: v }))} prefix="R" help="Salary etc. — CGT inclusion adds on top" />
              <SelectField label="Age Group" id="c-age" value={cgt.ageGroup} onChange={(v) => setCgt((p) => ({ ...p, ageGroup: v as AgeGroup }))} options={AGE_OPTIONS} />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-5">
            {/* Winner banner */}
            <div
              className="p-4 rounded-xl flex items-center gap-4"
              style={{
                background: cgtResult.cgtPayable === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${cgtResult.cgtPayable === 0 ? C.emerald : C.red}44`,
              }}
            >
              {cgtResult.cgtPayable === 0
                ? <CheckCircle2 size={24} color={C.emerald} />
                : <AlertCircle size={24} color={C.red} />}
              <div>
                <p className="font-semibold" style={{ color: cgtResult.cgtPayable === 0 ? C.emerald : C.red, fontFamily: 'var(--font-heading)' }}>
                  {cgtResult.cgtPayable === 0 ? 'No CGT Payable' : `CGT Due: ${formatRand(cgtResult.cgtPayable)}`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {cgtResult.bracketLabel} · Effective CGT rate: {formatPercent(cgtResult.effectiveCGTRate, 1)} on total gain
                </p>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Gross Capital Gain" value={formatRandShort(cgtResult.grossCapitalGain)} sub="Before exclusions" icon={TrendingUp} color="emerald" delay={0} />
              <StatCard label="Exclusions Applied" value={formatRandShort(cgtResult.primaryResidenceExclusion + cgtResult.annualExclusion)} sub="Primary res + annual" icon={CheckCircle2} color="indigo" delay={0.05} />
              <StatCard label="CGT Payable" value={formatRandShort(cgtResult.cgtPayable)} sub={`Effective ${formatPercent(cgtResult.effectiveCGTRate, 1)}`} icon={Receipt} color="red" delay={0.1} />
              <StatCard label="Net Proceeds After CGT" value={formatRandShort(cgtResult.netProceedsAfterCGT)} sub="After sale costs + CGT" icon={TrendingUp} color="emerald" delay={0.15} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Proceeds waterfall */}
              <div className="glass-card-static p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Sale Proceeds Breakdown</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[
                      { name: 'Base Cost', value: cgtResult.baseCost, fill: C.indigo },
                      { name: 'Sale Costs', value: cgtResult.saleCosts, fill: C.amber },
                      { name: 'CGT', value: cgtResult.cgtPayable, fill: C.red },
                      { name: 'Net Proceeds', value: cgtResult.netProceedsAfterCGT, fill: C.emerald },
                    ]}
                    margin={{ left: 8, right: 8 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickFormatter={(v) => `R${(v/1_000_000).toFixed(1)}M`} />
                    <Tooltip content={<RandTooltip />} />
                    <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                      {[C.indigo, C.amber, C.red, C.emerald].map((fill, i) => (
                        <Cell key={i} fill={fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* CGT composition pie */}
              <div className="glass-card-static p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Gain Distribution</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Primary Res. Excl.', value: cgtResult.primaryResidenceExclusion },
                        { name: 'Annual Excl.', value: cgtResult.annualExclusion },
                        { name: 'Non-taxable (60%)', value: cgtResult.netGainAfterExclusions * 0.6 },
                        { name: 'Included in Income (40%)', value: cgtResult.inclusionAmount },
                      ].filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={2}
                    >
                      {[C.indigo, C.cyan, C.emerald, C.red].map((fill, i) => (
                        <Cell key={i} fill={fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatRand(Number(v), 0)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed calculation table */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>CGT Calculation Detail</p>
              <table className="w-full text-xs">
                <tbody>
                  {[
                    { label: 'Sale Price', value: cgt.salePrice, highlight: false },
                    { label: '− Sale Costs (agent commission)', value: -cgtResult.saleCosts, highlight: false },
                    { label: '− Base Cost (purchase + acquisition)', value: -cgtResult.baseCost, highlight: false },
                    { label: 'Gross Capital Gain', value: cgtResult.grossCapitalGain, highlight: true },
                    { label: '− Primary Residence Exclusion', value: -cgtResult.primaryResidenceExclusion, highlight: false },
                    { label: '− Annual Exclusion (2026: R50,000)', value: -cgtResult.annualExclusion, highlight: false },
                    { label: 'Net Gain After Exclusions', value: cgtResult.netGainAfterExclusions, highlight: true },
                    { label: '× 40% Inclusion Rate', value: cgtResult.inclusionAmount, highlight: false },
                    { label: 'Included in Taxable Income', value: cgtResult.inclusionAmount, highlight: false },
                    { label: 'Tax on Income + CGT Inclusion', value: -cgtResult.taxOnIncomeWithCGT, highlight: false },
                    { label: 'Tax on Income Only', value: cgtResult.taxOnIncomeWithoutCGT, highlight: false },
                    { label: 'CGT Payable', value: -cgtResult.cgtPayable, highlight: true },
                    { label: 'Net Proceeds After CGT', value: cgtResult.netProceedsAfterCGT, highlight: true },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="py-2 pr-4" style={{ color: row.highlight ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: row.highlight ? 600 : 400 }}>
                        {row.label}
                      </td>
                      <td
                        className="py-2 text-right font-mono"
                        style={{
                          color: row.value < 0 ? C.red : row.highlight ? 'var(--color-text)' : 'var(--color-text-muted)',
                          fontWeight: row.highlight ? 600 : 400,
                        }}
                      >
                        {formatRand(row.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
