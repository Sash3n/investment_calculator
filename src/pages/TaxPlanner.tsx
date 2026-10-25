import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  Receipt, Building2, TrendingUp, Info,
  ChevronDown, ChevronUp,
  Plus, Trash2, BookOpen, X,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { SectionHeader } from '../components/ui/SectionHeader';
import { TaxYearSelect } from '../components/ui/TaxYearSelect';
import { formatRand, formatPercent, formatRandShort } from '../utils/format';
import {
  calcRentalIncomeTax,
  calc13sex,
  calc13quat,
  calcCGT,
} from '../utils/tax';
import { TAX_YEARS, TAX_YEAR_OPTIONS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';
import { calcPropertyROI } from '../utils/roi';
import { useAuth } from '../context/useAuth';
import { useSavedProperties } from '../hooks/useFirestore';
import { alpha, seriesColors, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, rangeError } from '../utils/validation';
import type {
  RentalTaxInputs,
  Section13quatInputs,
  CGTInputs,
  AgeGroup,
  UDZBuildingType,
  PropertyType,
  PropertyInputs,
  S13Unit,
} from '../types';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  blue: 'var(--note-blue)', orange: 'var(--note-orange)', green: 'var(--gain)',
  red: 'var(--loss)', teal: 'var(--note-teal)', brown: 'var(--note-brown)', rose: 'var(--note-red)',
};
const PIE_COLORS = seriesColors(8);

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
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: textTone(p.fill ?? C.blue) }}>{p.name}: {formatRand(p.value, 0)}</p>
      ))}
    </div>
  );
}

// ── Info badge ────────────────────────────────────────────────────────────────
function InfoBadge({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'color-mix(in srgb, var(--note-blue) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 20%, transparent)' }}>
      <Info size={13} className="mt-0.5 flex-shrink-0 text-note-blue-ink" />
      <span style={{ color: 'var(--ink-muted)' }}>{text}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function TaxPlanner() {
  const [activeTab, setActiveTab] = useState<MainTab>('rental');
  const [s13Tab, setS13Tab] = useState<S13Tab>('13sex');
  const [showSchedule, setShowSchedule] = useState(false);
  const [taxYear, setTaxYear] = useState<TaxYearId>(DEFAULT_TAX_YEAR);

  // ── Portfolio loading for Section 13sex ────────────────────────────────────
  const { user } = useAuth();
  const { properties: cloudProperties } = useSavedProperties(user?.uid ?? null);
  const [localPortfolio] = useState<(PropertyInputs & { id: string })[]>(() => {
    try {
      const stored = localStorage.getItem('fincalc_portfolio');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const portfolio = user
    ? cloudProperties.map((p) => ({ ...p.inputs, id: p.id }))
    : localPortfolio;

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
  const makeDefaultUnit = (n: number): S13Unit => ({
    id: `unit-${n}`,
    name: `Unit ${n}`,
    purchasePrice: 900_000,
    monthlyRent: 8_500,
    isLowCostHousing: false,
    monthlyBondRepayment: 7_200,
    monthlyLevies: 1_200,
    monthlyRates: 800,
    monthlyInsurance: 400,
    managementFeePercent: 10,
    vacancyRate: 5,
  });
  const [s13Units, setS13Units] = useState<S13Unit[]>(() => [1, 2, 3, 4, 5].map(makeDefaultUnit));
  const [s13Income, setS13Income] = useState(800_000);
  const [s13RA, setS13RA] = useState(0);
  const [s13AgeGroup, setS13AgeGroup] = useState<AgeGroup>('under65');
  const [expandedUnitIds, setExpandedUnitIds] = useState<Set<string>>(new Set());
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);

  const updateUnit = (id: string, patch: Partial<S13Unit>) =>
    setS13Units(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  const removeUnit = (id: string) =>
    setS13Units(prev => prev.filter(u => u.id !== id));
  const addUnit = () => {
    const newId = `unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setS13Units(prev => [...prev, {
      id: newId, name: `Unit ${prev.length + 1}`, purchasePrice: 900_000,
      monthlyRent: 8_500, isLowCostHousing: false, monthlyBondRepayment: 7_200,
      monthlyLevies: 1_200, monthlyRates: 800, monthlyInsurance: 400,
      managementFeePercent: 10, vacancyRate: 5,
    }]);
  };
  const toggleUnitExpand = (id: string) =>
    setExpandedUnitIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const importFromPortfolio = (p: PropertyInputs & { id: string }) => {
    const roi = calcPropertyROI(p);
    // Unique id without reading the clock: the next free number for this property
    let n = 1;
    while (s13Units.some((u) => u.id === `p-${p.id}-${n}`)) n++;
    const unit: S13Unit = {
      id: `p-${p.id}-${n}`,
      name: p.propertyName || 'Portfolio Unit',
      purchasePrice: Math.round(p.purchasePrice * 0.85),
      monthlyRent: p.rentScenario1,
      isLowCostHousing: p.purchasePrice <= 350_000,
      monthlyBondRepayment: Math.round(roi.monthlyBondRepayment),
      monthlyLevies: p.monthlyLevies,
      monthlyRates: p.monthlyRates,
      monthlyInsurance: p.insurance,
      managementFeePercent: p.managementFeePercent,
      vacancyRate: p.vacancyRate,
      portfolioId: p.id,
    };
    setS13Units(prev => [...prev, unit]);
    setShowPortfolioPicker(false);
  };

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
  const rentalResult = useMemo(() => calcRentalIncomeTax(rental, taxYear), [rental, taxYear]);
  const s13sexResult = useMemo(() => calc13sex({
    units: s13Units, annualTaxableIncome: s13Income, raMonthlyContrib: s13RA, ageGroup: s13AgeGroup,
  }, taxYear), [s13Units, s13Income, s13RA, s13AgeGroup, taxYear]);
  const s13quatResult = useMemo(() => calc13quat(s13quat, taxYear), [s13quat, taxYear]);
  const cgtResult = useMemo(() => calcCGT(cgt, taxYear), [cgt, taxYear]);

  // ── Input helpers ──────────────────────────────────────────────────────────
  const nr = (fn: (v: number) => Partial<RentalTaxInputs>) => (val: string) =>
    setRental((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));
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
        background: activeTab === id ? alpha(color, 13) : 'transparent',
        border: `1px solid ${activeTab === id ? alpha(color, 33) : 'var(--rule)'}`,
        color: textTone(activeTab === id ? color : 'var(--ink-muted)'),
        fontFamily: 'var(--font-text)',
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
        background: s13Tab === id ? 'color-mix(in srgb, var(--note-blue) 15%, transparent)' : 'transparent',
        color: textTone(s13Tab === id ? C.blue : 'var(--ink-muted)'),
        border: `1px solid ${s13Tab === id ? 'color-mix(in srgb, var(--note-blue) 30%, transparent)' : 'transparent'}`,
        fontFamily: 'var(--font-text)',
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
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Property Tax Planner
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              SARS {TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label} tax year · {TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.period}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{ background: 'color-mix(in srgb, var(--gain) 12%, transparent)', color: textTone(C.green), border: `1px solid ${alpha(C.green, 27)}` }}
            >
              CGT exclusion {formatRandShort(TAX_YEARS[taxYear].cgt.primaryResidenceExclusion)}
            </span>
            <TaxYearSelect id="tp-taxyear" value={taxYear} onChange={setTaxYear} className="min-w-[150px]" />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mt-5">
          <TabBtn id="rental"    label="Rental Income Tax"    icon={Receipt}    color={C.blue} />
          <TabBtn id="section13" label="Section 13 Incentives" icon={Building2}  color={C.orange}  />
          <TabBtn id="cgt"       label="CGT Planner"           icon={TrendingUp} color={C.green} />
        </div>
      </motion.div>

      {/* ── TAB 1: Rental Income Tax ─────────────────────────────────────────── */}
      {activeTab === 'rental' && (
        <motion.div
          key="rental"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5"
        >
          {/* Inputs */}
          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Rental Income & Deductions" icon={Receipt} />
            <InfoBadge text="Enter annual figures. Deductions must be directly related to producing rental income (SARS Section 25)." />

            <InputField label="Monthly Gross Rent" id="r-rent" value={rental.monthlyGrossRent} error={nonNegativeError(rental.monthlyGrossRent)} onChange={nr((v) => ({ monthlyGrossRent: v }))} prefix="R" />
            <InputField label="Annual Other Income (Salary etc.)" id="r-other" value={rental.otherAnnualIncome} error={nonNegativeError(rental.otherAnnualIncome)} onChange={nr((v) => ({ otherAnnualIncome: v }))} prefix="R" help="Used to determine your tax bracket" />
            <SelectField label="Age Group" id="r-age" value={rental.ageGroup} onChange={(v) => setRental((p) => ({ ...p, ageGroup: v as AgeGroup }))} options={AGE_OPTIONS} help="Determines rebate applied" />

            <div className="border-t pt-4" style={{ borderColor: 'var(--rule)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-muted)' }}>Allowable Deductions</p>
              <div className="space-y-3">
                <InputField label="Annual Bond Interest Paid" id="r-interest" value={rental.annualBondInterest} error={nonNegativeError(rental.annualBondInterest)} onChange={nr((v) => ({ annualBondInterest: v }))} prefix="R" help="Interest only — not capital repayment" />
                <InputField label="Annual Rates & Municipal Taxes" id="r-rates" value={rental.annualRates} error={nonNegativeError(rental.annualRates)} onChange={nr((v) => ({ annualRates: v }))} prefix="R" />
                <InputField label="Annual Levies / Body Corporate" id="r-levies" value={rental.annualLevies} error={nonNegativeError(rental.annualLevies)} onChange={nr((v) => ({ annualLevies: v }))} prefix="R" />
                <InputField label="Annual Insurance" id="r-ins" value={rental.annualInsurance} error={nonNegativeError(rental.annualInsurance)} onChange={nr((v) => ({ annualInsurance: v }))} prefix="R" />
                <InputField label="Annual Repairs & Maintenance" id="r-repairs" value={rental.annualRepairs} error={nonNegativeError(rental.annualRepairs)} onChange={nr((v) => ({ annualRepairs: v }))} prefix="R" help="Repairs only — not capital improvements" />
                <InputField label="Management Fee" id="r-mgmt" value={rental.managementFeePercent} error={rangeError(rental.managementFeePercent, 0, 50, 'a fee', '%')} onChange={nr((v) => ({ managementFeePercent: v }))} suffix="%" help="% of gross annual rent" />
                <InputField label="Annual Advertising Costs" id="r-adv" value={rental.annualAdvertising} error={nonNegativeError(rental.annualAdvertising)} onChange={nr((v) => ({ annualAdvertising: v }))} prefix="R" />
                <InputField label="Other Annual Deductions" id="r-other-ded" value={rental.otherDeductions} error={nonNegativeError(rental.otherDeductions)} onChange={nr((v) => ({ otherDeductions: v }))} prefix="R" />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-5">
            <ResultPanel
              label={rentalResult.taxAttributableToRental >= 0 ? 'Tax on your rental income' : 'Tax saved by the rental loss'}
              value={`${formatRand(Math.abs(rentalResult.taxAttributableToRental), 0)} a year`}
              tone={rentalResult.taxAttributableToRental > 0 ? 'default' : 'gain'}
              summary={<>
                {rentalResult.taxableRentalIncome >= 0
                  ? `Rent of ${formatRand(rentalResult.annualGrossRent, 0)} a year less ${formatRand(rentalResult.totalDeductions, 0)} of deductions leaves ${formatRand(rentalResult.taxableRentalIncome, 0)} of taxable profit, taxed at up to ${formatPercent(rentalResult.marginalRate, 0)} on top of your other income.`
                  : `Deductions of ${formatRand(rentalResult.totalDeductions, 0)} are more than the ${formatRand(rentalResult.annualGrossRent, 0)} of rent, so the ${formatRand(-rentalResult.taxableRentalIncome, 0)} loss reduces the tax on your other income.`}
                {' '}After tax that leaves {formatRand(rentalResult.afterTaxMonthlyRentalCashFlow, 0)} a month.
              </>}
              figures={[
                { label: 'Rent a year', value: formatRand(rentalResult.annualGrossRent, 0) },
                { label: 'Deductions', value: formatRand(rentalResult.totalDeductions, 0) },
                { label: 'Taxable profit', value: formatRand(rentalResult.taxableRentalIncome, 0) },
                { label: 'After tax, each month', value: formatRand(rentalResult.afterTaxMonthlyRentalCashFlow, 0) },
              ]}
            />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Deductions breakdown bar */}
              <div className="glass-card-static p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Deduction Breakdown</p>
                {rentalResult.deductionsBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={rentalResult.deductionsBreakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => `R${(v/1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} width={110} />
                      <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                      <Bar dataKey="value" name="Amount" fill={C.blue} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ink-subtle)' }}>No deductions entered</p>
                )}
              </div>

              {/* Income vs deduction pie */}
              <div className="glass-card-static p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Expense Composition</p>
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
                    <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Deductions table */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Tax Calculation Summary</p>
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
                    <tr key={i} className={i % 2 === 0 ? '' : ''} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td className="py-2 pr-4" style={{ color: row.bold ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: row.bold ? 600 : 400 }}>
                        {row.label}
                      </td>
                      <td
                        className="py-2 text-right font-mono"
                        style={{
                          color: textTone(row.value < 0 ? C.red : row.bold ? 'var(--ink)' : 'var(--ink-muted)'),
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
          <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <S13TabBtn id="13sex"  label="Section 13sex — 5+ Units" />
            <S13TabBtn id="13quat" label="Section 13quat — UDZ Allowance" />
          </div>

          {/* ── 13sex ─────────────────────────────────────────────────────── */}
          {s13Tab === '13sex' && (
            <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-5">
              {/* LEFT — Inputs */}
              <div className="space-y-4">
                {/* Global settings */}
                <div className="glass-card p-5 space-y-4">
                  <SectionHeader title="Section 13sex" icon={Building2} />
                  <InfoBadge text="Own 5+ new, unused residential units rented out. Deduct 5% of building cost (excl. land) for 20 years. Low-cost housing (≤R350K): 10% for 10 years." />
                  <InputField label="Annual Taxable Income (other income)" id="s-income" value={s13Income} error={nonNegativeError(s13Income)} onChange={v => setS13Income(parseFloat(v) || 0)} prefix="R" help="Your income before S13 deduction is applied (e.g. salary)" />
                  <InputField label="Monthly RA Contribution" id="s-ra" value={s13RA} error={nonNegativeError(s13RA)} onChange={v => setS13RA(parseFloat(v) || 0)} prefix="R" help={`Stacks with Section 13 allowance — further reduces taxable income (27.5% of income, max ${formatRandShort(TAX_YEARS[taxYear].retirement.cap)} p.a.)`} />
                  <SelectField label="Age Group" id="s-age" value={s13AgeGroup} onChange={v => setS13AgeGroup(v as AgeGroup)} options={AGE_OPTIONS} />
                </div>

                {/* Units header */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                    Residential Units ({s13Units.length}{s13Units.length < 5 ? ` — need ${5 - s13Units.length} more` : ''})
                  </p>
                  <div className="flex gap-2">
                    {portfolio.length > 0 && (
                      <button
                        onClick={() => setShowPortfolioPicker(p => !p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: alpha(C.teal, 8), color: textTone(C.teal), border: `1px solid ${alpha(C.teal, 20)}` }}
                      >
                        <Building2 size={11} />
                        Portfolio
                      </button>
                    )}
                    <button
                      onClick={addUnit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: alpha(C.blue, 8), color: textTone(C.blue), border: `1px solid ${alpha(C.blue, 20)}` }}
                    >
                      <Plus size={11} />
                      Add Unit
                    </button>
                  </div>
                </div>

                {/* Portfolio picker */}
                {showPortfolioPicker && portfolio.length > 0 && (
                  <div className="glass-card-static p-4 space-y-2 rounded-xl" style={{ border: `1px solid ${alpha(C.teal, 20)}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold" style={{ color: textTone(C.teal) }}>Select from Portfolio</p>
                      <button onClick={() => setShowPortfolioPicker(false)}><X size={13} color="var(--ink-muted)" /></button>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Purchase price auto-reduced by 15% to estimate land exclusion. Adjust per unit after importing.</p>
                    {portfolio.map(p => (
                      <button
                        key={p.id}
                        onClick={() => importFromPortfolio(p)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                        style={{ border: '1px solid var(--rule)', color: 'var(--ink)', background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = alpha(C.teal, 3))}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span className="font-medium">{p.propertyName || 'Unnamed Property'}</span>
                        <span className="ml-2" style={{ color: 'var(--ink-muted)' }}>
                          {formatRandShort(p.purchasePrice)} · {formatRand(p.rentScenario1, 0)}/mo
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Unit cards */}
                {s13Units.map((unit, idx) => {
                  const expanded = expandedUnitIds.has(unit.id);
                  const grossYield = unit.purchasePrice > 0
                    ? ((unit.monthlyRent * 12 / unit.purchasePrice) * 100).toFixed(1)
                    : '—';
                  return (
                    <div key={unit.id} className="glass-card-static rounded-xl overflow-hidden">
                      {/* Always-visible header row */}
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
                        onClick={() => toggleUnitExpand(unit.id)}
                        style={{ background: expanded ? alpha(C.blue, 3) : undefined }}
                      >
                        <span
                          className="text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0"
                          style={{ background: alpha(C.blue, 13), color: textTone(C.blue) }}
                        >
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={unit.name}
                          onChange={e => { e.stopPropagation(); updateUnit(unit.id, { name: e.target.value }); }}
                          onClick={e => e.stopPropagation()}
                          className="text-sm font-medium flex-1 bg-transparent outline-none min-w-0"
                          style={{ color: 'var(--ink)', fontFamily: 'var(--font-text)' }}
                          placeholder={`Unit ${idx + 1}`}
                        />
                        {unit.portfolioId && (
                          <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: alpha(C.teal, 8), color: textTone(C.teal) }}>
                            portfolio
                          </span>
                        )}
                        <span className="text-xs font-semibold flex-shrink-0" style={{ color: textTone(C.orange) }}>{grossYield}%</span>
                        <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--ink-muted)' }}>
                          {formatRandShort(unit.purchasePrice)}
                        </span>
                        {s13Units.length > 5 && (
                          <button className="p-1 rounded flex-shrink-0" onClick={e => { e.stopPropagation(); removeUnit(unit.id); }}>
                            <Trash2 size={12} color={C.red} />
                          </button>
                        )}
                        {expanded
                          ? <ChevronUp size={13} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                          : <ChevronDown size={13} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />}
                      </div>

                      {/* Expanded inputs */}
                      {expanded && (
                        <div className="px-3 pb-3 space-y-3 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
                          <div className="grid grid-cols-2 gap-3">
                            <InputField label="Price (excl. land)" id={`u-price-${unit.id}`} value={unit.purchasePrice} error={nonNegativeError(unit.purchasePrice)} onChange={v => updateUnit(unit.id, { purchasePrice: parseFloat(v) || 0 })} prefix="R" help="Building cost only — exclude land value" />
                            <InputField label="Monthly Rent" id={`u-rent-${unit.id}`} value={unit.monthlyRent} error={nonNegativeError(unit.monthlyRent)} onChange={v => updateUnit(unit.id, { monthlyRent: parseFloat(v) || 0 })} prefix="R" />
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
                            <input
                              type="checkbox"
                              id={`u-lc-${unit.id}`}
                              checked={unit.isLowCostHousing}
                              onChange={e => updateUnit(unit.id, { isLowCostHousing: e.target.checked })}
                              className="w-4 h-4 accent-note-blue"
                            />
                            <label htmlFor={`u-lc-${unit.id}`} className="text-xs cursor-pointer" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
                              Low-cost housing — 10% deduction for 10 years (≤R350K)
                            </label>
                          </div>
                          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>Monthly Expenses</p>
                          <div className="grid grid-cols-2 gap-2">
                            <InputField label="Bond Repayment" id={`u-bond-${unit.id}`} value={unit.monthlyBondRepayment} error={nonNegativeError(unit.monthlyBondRepayment)} onChange={v => updateUnit(unit.id, { monthlyBondRepayment: parseFloat(v) || 0 })} prefix="R" />
                            <InputField label="Levies" id={`u-lev-${unit.id}`} value={unit.monthlyLevies} error={nonNegativeError(unit.monthlyLevies)} onChange={v => updateUnit(unit.id, { monthlyLevies: parseFloat(v) || 0 })} prefix="R" />
                            <InputField label="Rates" id={`u-rates-${unit.id}`} value={unit.monthlyRates} error={nonNegativeError(unit.monthlyRates)} onChange={v => updateUnit(unit.id, { monthlyRates: parseFloat(v) || 0 })} prefix="R" />
                            <InputField label="Insurance" id={`u-ins-${unit.id}`} value={unit.monthlyInsurance} error={nonNegativeError(unit.monthlyInsurance)} onChange={v => updateUnit(unit.id, { monthlyInsurance: parseFloat(v) || 0 })} prefix="R" />
                            <InputField label="Mgmt Fee" id={`u-mgmt-${unit.id}`} value={unit.managementFeePercent} error={rangeError(unit.managementFeePercent, 0, 50, 'a fee', '%')} onChange={v => updateUnit(unit.id, { managementFeePercent: parseFloat(v) || 0 })} suffix="%" />
                            <InputField label="Vacancy" id={`u-vac-${unit.id}`} value={unit.vacancyRate} error={rangeError(unit.vacancyRate, 0, 100, 'a vacancy', '%')} onChange={v => updateUnit(unit.id, { vacancyRate: parseFloat(v) || 0 })} suffix="%" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {s13Units.length < 5 && (
                  <div className="p-3 rounded-xl text-xs text-center" style={{ background: 'color-mix(in srgb, var(--loss) 7%, transparent)', color: textTone(C.red), border: `1px solid ${alpha(C.red, 20)}` }}>
                    Add {5 - s13Units.length} more unit{5 - s13Units.length !== 1 ? 's' : ''} to qualify for Section 13sex
                  </div>
                )}
              </div>

              {/* RIGHT — Results */}
              <div className="space-y-5">
                <ResultPanel
                  label={s13sexResult.qualifies ? 'Section 13sex tax saving each year' : 'Section 13sex'}
                  value={s13sexResult.qualifies ? formatRand(s13sexResult.annualTaxSaving, 0) : 'Not yet'}
                  tone={s13sexResult.qualifies ? 'gain' : 'default'}
                  summary={s13sexResult.qualifies
                    ? <>
                        Your {s13sexResult.numberOfUnits} units cost {formatRand(s13sexResult.totalCostExclLand, 0)} excluding land, so you can deduct
                        {' '}{formatRand(s13sexResult.annualDeduction, 0)} a year for up to {s13sexResult.deductionPeriodYears} years. That saves
                        {' '}{formatRand(s13sexResult.annualTaxSaving, 0)} a year{s13sexResult.raTaxSaving > 0 ? `, or ${formatRand(s13sexResult.combinedAnnualTaxSaving, 0)} with your retirement annuity` : ''}.
                      </>
                    : <>{s13sexResult.reason}</>}
                  figures={s13sexResult.qualifies ? [
                    { label: 'Deduction a year', value: formatRand(s13sexResult.annualDeduction, 0) },
                    { label: 'With your annuity', value: formatRand(s13sexResult.combinedAnnualTaxSaving, 0) },
                    { label: `Saved over ${s13sexResult.deductionPeriodYears} years`, value: formatRand(s13sexResult.totalTaxSavingOverPeriod, 0) },
                    { label: 'Tax on your next rand', value: formatPercent(s13sexResult.marginalRate, 0) },
                  ] : undefined}
                />

                {s13sexResult.qualifies && (
                  <>
                    {/* Tax Impact Summary */}
                    <div className="glass-card-static p-5">
                      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Tax Impact Summary</p>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { label: 'Annual Taxable Income (before deductions)', value: s13Income, bold: false, color: undefined },
                            { label: '− Section 13sex Annual Deduction', value: -s13sexResult.annualDeduction, bold: false, color: C.orange },
                            ...(s13sexResult.raAnnualDeduction > 0 ? [{ label: `− RA Deduction (27.5%, max ${formatRandShort(TAX_YEARS[taxYear].retirement.cap)})`, value: -s13sexResult.raAnnualDeduction, bold: false, color: C.brown }] : []),
                            { label: 'Taxable Income After All Deductions', value: s13Income - s13sexResult.annualDeduction - s13sexResult.raAnnualDeduction, bold: true, color: undefined },
                            { label: 'Annual Tax Saving — Section 13sex', value: s13sexResult.annualTaxSaving, bold: false, color: C.green },
                            ...(s13sexResult.raTaxSaving > 0 ? [{ label: 'Annual Tax Saving — RA Contribution', value: s13sexResult.raTaxSaving, bold: false, color: C.brown }] : []),
                            { label: 'Combined Annual Tax Saving', value: s13sexResult.combinedAnnualTaxSaving, bold: true, color: C.green },
                            { label: `Total S13 Saving Over ${s13sexResult.deductionPeriodYears} Years`, value: s13sexResult.totalTaxSavingOverPeriod, bold: false, color: C.blue },
                            { label: 'Portfolio Monthly Cash Flow (all units)', value: s13sexResult.totalAnnualCashFlow / 12, bold: true, color: s13sexResult.totalAnnualCashFlow >= 0 ? C.green : C.red },
                          ].map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--rule)' }}>
                              <td className="py-2 pr-4" style={{ color: row.bold ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: row.bold ? 600 : 400 }}>
                                {row.label}
                              </td>
                              <td className="py-2 text-right font-mono" style={{ color: textTone(row.color ?? (row.value < 0 ? C.red : row.bold ? 'var(--ink)' : 'var(--ink-muted)')), fontWeight: row.bold ? 600 : 400 }}>
                                {formatRand(row.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Per-unit table */}
                    <div className="glass-card-static p-5">
                      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Per-Unit Analysis</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--rule)' }}>
                              {['Unit', 'Price (excl. land)', 'Annual Deduction', 'Gross Yield', 'Net Yield', 'Monthly CF'].map(h => (
                                <th key={h} className="py-2 text-right first:text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {s13sexResult.unitResults.map(u => (
                              <tr key={u.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                                <td className="py-2" style={{ color: 'var(--ink)' }}>{u.name}</td>
                                <td className="py-2 text-right" style={{ color: 'var(--ink-muted)' }}>{formatRand(u.purchasePrice, 0)}</td>
                                <td className="py-2 text-right font-medium" style={{ color: textTone(C.orange) }}>{formatRand(u.annualDeductionPerUnit, 0)}</td>
                                <td className="py-2 text-right" style={{ color: textTone(u.grossYield >= 8 ? C.green : u.grossYield >= 6 ? C.orange : C.red) }}>{u.grossYield.toFixed(1)}%</td>
                                <td className="py-2 text-right" style={{ color: textTone(u.netYield >= 0 ? C.green : C.red) }}>{u.netYield.toFixed(1)}%</td>
                                <td className="py-2 text-right font-semibold" style={{ color: textTone(u.monthlyCashFlow >= 0 ? C.green : C.red) }}>{formatRand(u.monthlyCashFlow, 0)}</td>
                              </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid var(--rule)' }}>
                              <td className="py-2 font-semibold" style={{ color: 'var(--ink)' }}>Portfolio Total</td>
                              <td className="py-2 text-right font-semibold" style={{ color: 'var(--ink)' }}>{formatRand(s13sexResult.totalCostExclLand, 0)}</td>
                              <td className="py-2 text-right font-semibold" style={{ color: textTone(C.orange) }}>{formatRand(s13sexResult.annualDeduction, 0)}</td>
                              <td className="py-2 text-right font-semibold" style={{ color: textTone(C.orange) }}>{s13sexResult.totalGrossYield.toFixed(1)}%</td>
                              <td className="py-2 text-right font-semibold" style={{ color: textTone(s13sexResult.totalNetYield >= 0 ? C.green : C.red) }}>{s13sexResult.totalNetYield.toFixed(1)}%</td>
                              <td className="py-2 text-right font-semibold" style={{ color: textTone(s13sexResult.totalAnnualCashFlow >= 0 ? C.green : C.red) }}>{formatRand(s13sexResult.totalAnnualCashFlow / 12, 0)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Cumulative savings */}
                      <div className="glass-card-static p-5">
                        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                          Cumulative Tax Saving — {s13sexResult.deductionPeriodYears} Years
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={s13sexResult.schedule} margin={{ left: 8, right: 16, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--ink-subtle)' }} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={v => `R${(v / 1000).toFixed(0)}K`} />
                            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                            <Line type="monotone" dataKey="cumulativeSaving" name="S13 Only" stroke={C.green} strokeWidth={2} dot={false} />
                            {s13sexResult.raTaxSaving > 0 && (
                              <Line type="monotone" dataKey="combinedCumulative" name="S13 + RA" stroke={C.brown} strokeWidth={2} dot={false} strokeDasharray="5 3" />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Monthly cashflow per unit */}
                      <div className="glass-card-static p-5">
                        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                          Monthly Cash Flow per Unit
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={s13sexResult.unitResults.map(u => ({ name: u.name, cashflow: Math.round(u.monthlyCashFlow) }))}
                            margin={{ left: 8, right: 8, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--ink-subtle)' }} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={v => `R${(v / 1000).toFixed(0)}K`} />
                            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                            <Bar dataKey="cashflow" name="Monthly CF" radius={[3, 3, 0, 0]}>
                              {s13sexResult.unitResults.map((u, i) => (
                                <Cell key={i} fill={u.monthlyCashFlow >= 0 ? C.green : C.red} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Full schedule — collapsible */}
                    <div className="glass-card-static overflow-hidden">
                      <button
                        onClick={() => setShowSchedule(p => !p)}
                        className="w-full flex items-center justify-between p-4 transition-colors hover:bg-note-blue/5"
                      >
                        <span className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                          Full Deduction Schedule ({s13sexResult.deductionPeriodYears} years)
                        </span>
                        {showSchedule ? <ChevronUp size={16} style={{ color: 'var(--ink-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-muted)' }} />}
                      </button>
                      {showSchedule && (
                        <div className="overflow-x-auto px-4 pb-4">
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ borderBottom: '2px solid var(--rule)' }}>
                                {[
                                  'Year', 'Annual Deduction', 'Tax Saving (S13)',
                                  ...(s13sexResult.raTaxSaving > 0 ? ['RA Saving', 'Combined'] : []),
                                  'Cumulative (S13)',
                                ].map(h => (
                                  <th key={h} className="py-2 text-right first:text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {s13sexResult.schedule.map(row => (
                                <tr key={row.year} style={{ borderBottom: '1px solid var(--rule)' }}>
                                  <td className="py-2" style={{ color: 'var(--ink-muted)' }}>{row.year}</td>
                                  <td className="py-2 text-right" style={{ color: 'var(--ink)' }}>{formatRand(row.deduction, 0)}</td>
                                  <td className="py-2 text-right font-medium" style={{ color: textTone(C.green) }}>{formatRand(row.taxSaving, 0)}</td>
                                  {s13sexResult.raTaxSaving > 0 && (
                                    <>
                                      <td className="py-2 text-right" style={{ color: textTone(C.brown) }}>{formatRand(row.raTaxSaving, 0)}</td>
                                      <td className="py-2 text-right font-semibold" style={{ color: textTone(C.orange) }}>{formatRand(row.combinedSaving, 0)}</td>
                                    </>
                                  )}
                                  <td className="py-2 text-right font-semibold" style={{ color: textTone(C.blue) }}>{formatRand(row.cumulativeSaving, 0)}</td>
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

          {/* ── Education Section (always shown on this tab) ─────────────── */}
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} color={C.orange} />
              <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                Understanding Section 13 Incentives
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                {
                  title: 'What is Section 13sex?',
                  color: C.blue,
                  body: 'Section 13sex lets individual taxpayers who own 5 or more new, unused residential units (actively rented out) deduct 5% of the building cost (excluding land) from their taxable income annually for 20 years. It creates a "paper loss" that reduces your tax bill without an actual cash outflow.',
                },
                {
                  title: 'Qualifying Conditions',
                  color: C.orange,
                  body: '• You must own at least 5 residential units\n• Units must be new and unused at acquisition\n• Units must be used for rental income purposes\n• Deduction applies to building cost only — land is excluded\n• Low-cost housing (≤R350K) qualifies for 10% over 10 years\n• All units must be owned in your personal name',
                },
                {
                  title: 'How the Deduction Works',
                  color: C.green,
                  body: 'Each year you deduct 5% of total building cost from your other taxable income (e.g. salary). This reduces the tax owed at your marginal rate. At a 36% marginal rate, a R225,000 deduction saves R81,000 in tax annually — even if the properties are cash-flow negative, the tax saving can offset that.',
                },
                {
                  title: 'Section 13quat — UDZ',
                  color: C.teal,
                  body: 'Section 13quat offers accelerated depreciation in Urban Development Zones (Joburg, Cape Town, Tshwane, Durban etc.). New buildings: 20% year 1, then 8% × 10 years. Improvements: 20% × 5 years. Low-cost: 25% × 4 years. The incentive has been extended to 31 March 2030.',
                },
                {
                  title: 'Combining with an RA',
                  color: C.brown,
                  body: `An RA contribution is deductible at up to 27.5% of taxable income (max ${formatRand(TAX_YEARS[taxYear].retirement.cap, 0)} p.a.). Stacked with Section 13sex, both deductions reduce your taxable income before tax is calculated. The combined effect can pull you into a lower bracket, amplifying the saving beyond what each deduction achieves alone.`,
                },
                {
                  title: 'Key Caveats',
                  color: C.red,
                  body: '• Recoupment on sale: prior deductions are clawed back as taxable income when you sell (at your marginal rate at that time)\n• "Building cost excl. land" requires a professional appraisal or developer\'s split\n• SARS scrutinises schemes arranged purely for tax — ensure genuine rental activity\n• Get a tax practitioner\'s advice before implementing',
                },
              ].map(item => (
                <div key={item.title} className="p-4 rounded-xl space-y-2" style={{ background: alpha(item.color, 3), border: `1px solid ${alpha(item.color, 13)}` }}>
                  <p className="text-xs font-bold" style={{ color: textTone(item.color) }}>{item.title}</p>
                  <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 13quat ─────────────────────────────────────────────────────── */}
          {s13Tab === '13quat' && (
            <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
              {/* Inputs */}
              <div className="glass-card p-5 space-y-4">
                <SectionHeader title="Section 13quat — UDZ Allowance" icon={Building2} />
                <InfoBadge text="Accelerated depreciation for buildings in designated Urban Development Zones. Extended to 31 March 2030. Applicable in Joburg, Cape Town, Tshwane, Durban, and others." />

                <InputField label="Building / Renovation Cost" id="q-cost" value={s13quat.buildingCost} error={nonNegativeError(s13quat.buildingCost)} onChange={nq((v) => ({ buildingCost: v }))} prefix="R" />
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
                <InputField label="Annual Taxable Income" id="q-income" value={s13quat.annualTaxableIncome} error={nonNegativeError(s13quat.annualTaxableIncome)} onChange={nq((v) => ({ annualTaxableIncome: v }))} prefix="R" help="Before this allowance is applied" />
                <SelectField label="Age Group" id="q-age" value={s13quat.ageGroup} onChange={(v) => setS13quat((p) => ({ ...p, ageGroup: v as AgeGroup }))} options={AGE_OPTIONS} />

                <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: 'color-mix(in srgb, var(--note-orange) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--note-orange) 20%, transparent)' }}>
                  <p className="font-semibold" style={{ color: textTone(C.orange) }}>UDZ Schedule</p>
                  <p style={{ color: 'var(--ink-muted)' }}>New: 20% yr 1, then 8% × 10 years</p>
                  <p style={{ color: 'var(--ink-muted)' }}>Improvements: 20% × 5 years</p>
                  <p style={{ color: 'var(--ink-muted)' }}>Low-cost: 25% × 4 years</p>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-5">
                <ResultPanel
                  label="Tax saved over the write-off period"
                  value={formatRand(s13quatResult.totalTaxSaving, 0)}
                  tone="gain"
                  summary={<>
                    Spending {formatRand(s13quat.buildingCost, 0)} on an urban development zone building lets you deduct
                    {' '}{formatRand(s13quatResult.year1Deduction, 0)} in the first year, saving {formatRand(s13quatResult.year1TaxSaving, 0)} straight away,
                    and the rest over {s13quatResult.schedule.length} years.
                  </>}
                  figures={[
                    { label: 'First-year deduction', value: formatRand(s13quatResult.year1Deduction, 0) },
                    { label: 'First-year tax saving', value: formatRand(s13quatResult.year1TaxSaving, 0) },
                    { label: 'Write-off period', value: `${s13quatResult.schedule.length} years` },
                  ]}
                />

                {/* Chart */}
                <div className="glass-card-static p-5">
                  <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Annual Deduction & Tax Saving</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={s13quatResult.schedule} margin={{ left: 8, right: 16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--ink-subtle)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => `R${(v/1000).toFixed(0)}K`} />
                      <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                      <Bar dataKey="deduction" name="Annual Deduction" fill={C.orange} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="taxSaving" name="Tax Saving" fill={C.green} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="glass-card-static p-5">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Full Depreciation Schedule</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--rule)' }}>
                          {['Year', 'Rate', 'Deduction', 'Tax Saving', 'Cumulative Saving'].map((h) => (
                            <th key={h} className="py-2 text-right first:text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s13quatResult.schedule.map((row) => (
                          <tr key={row.year} style={{ borderBottom: '1px solid var(--rule)' }}>
                            <td className="py-2" style={{ color: 'var(--ink-muted)' }}>{row.year}</td>
                            <td className="py-2 text-right" style={{ color: textTone(C.orange) }}>{formatPercent(row.rate * 100, 0)}</td>
                            <td className="py-2 text-right" style={{ color: 'var(--ink)' }}>{formatRand(row.deduction, 0)}</td>
                            <td className="py-2 text-right font-medium" style={{ color: textTone(C.green) }}>{formatRand(row.taxSaving, 0)}</td>
                            <td className="py-2 text-right font-semibold" style={{ color: textTone(C.blue) }}>{formatRand(row.cumulativeSaving, 0)}</td>
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
          className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5"
        >
          {/* Inputs */}
          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Capital Gains Tax (CGT)" icon={TrendingUp} />
            <InfoBadge text={taxYear === '2027'
              ? 'Budget 2026: Primary residence exclusion raised to R3 million and annual exclusion to R50,000 from the 2027 tax year. Inclusion rate remains 40%.'
              : 'Pre-2027 tax years: R2 million primary residence exclusion and R40,000 annual exclusion. Inclusion rate 40%.'} />

            <div className="p-3 rounded-xl text-xs space-y-1.5" style={{ background: 'color-mix(in srgb, var(--gain) 8%, transparent)', border: `1px solid ${alpha(C.green, 20)}` }}>
              <p className="font-semibold" style={{ color: textTone(C.green) }}>{TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label} CGT Rates</p>
              <div className="grid grid-cols-2 gap-1" style={{ color: 'var(--ink-muted)' }}>
                <span>Primary residence exclusion:</span><span className="font-semibold text-right" style={{ color: 'var(--ink)' }}>{formatRand(TAX_YEARS[taxYear].cgt.primaryResidenceExclusion, 0)}</span>
                <span>Annual exclusion:</span><span className="font-semibold text-right" style={{ color: 'var(--ink)' }}>{formatRand(TAX_YEARS[taxYear].cgt.annualExclusion, 0)}</span>
                <span>Inclusion rate:</span><span className="font-semibold text-right" style={{ color: 'var(--ink)' }}>40%</span>
                <span>Max effective CGT rate:</span><span className="font-semibold text-right" style={{ color: textTone(C.red) }}>18% (45% marginal)</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--rule)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>Acquisition</p>
              <InputField label="Original Purchase Price" id="c-buy" value={cgt.purchasePrice} error={nonNegativeError(cgt.purchasePrice)} onChange={nc((v) => ({ purchasePrice: v }))} prefix="R" />
              <InputField label="Acquisition Costs" id="c-acq" value={cgt.acquisitionCosts} error={nonNegativeError(cgt.acquisitionCosts)} onChange={nc((v) => ({ acquisitionCosts: v }))} prefix="R" help="Transfer duty, bond registration, legal fees, renovations" />
            </div>

            <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--rule)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>Disposal</p>
              <InputField label="Sale Price" id="c-sell" value={cgt.salePrice} error={nonNegativeError(cgt.salePrice)} onChange={nc((v) => ({ salePrice: v }))} prefix="R" />
              <InputField label="Sale Costs" id="c-sellcost" value={cgt.saleCostsPercent} error={rangeError(cgt.saleCostsPercent, 0, 20, 'sale costs', '%')} onChange={nc((v) => ({ saleCostsPercent: v }))} suffix="%" help="Agent commission (typically 2.5–5%)" />
            </div>

            <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--rule)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>Property & Taxpayer</p>
              <SelectField
                label="Property Type"
                id="c-type"
                value={cgt.propertyType}
                onChange={(v) => setCgt((p) => ({ ...p, propertyType: v as PropertyType }))}
                options={[
                  { value: 'primary',    label: `Primary Residence (${formatRandShort(TAX_YEARS[taxYear].cgt.primaryResidenceExclusion)} exclusion)` },
                  { value: 'investment', label: 'Investment / Rental Property' },
                ]}
              />
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
                <input
                  type="checkbox"
                  id="c-joint"
                  checked={cgt.jointOwnership}
                  onChange={(e) => setCgt((p) => ({ ...p, jointOwnership: e.target.checked }))}
                  className="w-4 h-4 accent-note-blue"
                  disabled={cgt.propertyType !== 'primary'}
                />
                <label htmlFor="c-joint" className="text-sm cursor-pointer" style={{ color: cgt.propertyType !== 'primary' ? 'var(--ink-subtle)' : 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
                  Joint ownership (50/50 — splits {formatRandShort(TAX_YEARS[taxYear].cgt.primaryResidenceExclusion)} exclusion, half each)
                </label>
              </div>
              <InputField label="Other Annual Taxable Income" id="c-income" value={cgt.otherAnnualTaxableIncome} error={nonNegativeError(cgt.otherAnnualTaxableIncome)} onChange={nc((v) => ({ otherAnnualTaxableIncome: v }))} prefix="R" help="Salary etc. — CGT inclusion adds on top" />
              <SelectField label="Age Group" id="c-age" value={cgt.ageGroup} onChange={(v) => setCgt((p) => ({ ...p, ageGroup: v as AgeGroup }))} options={AGE_OPTIONS} />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-5">
            <ResultPanel
              label="Capital gains tax on the sale"
              value={formatRand(cgtResult.cgtPayable, 0)}
              tone={cgtResult.cgtPayable === 0 ? 'gain' : 'default'}
              summary={<>
                The gain is {formatRand(cgtResult.grossCapitalGain, 0)} after costs. {formatRand(cgtResult.primaryResidenceExclusion + cgtResult.annualExclusion, 0)} of it is excluded
                {cgtResult.primaryResidenceExclusion > 0 ? ' (primary residence and yearly exclusions)' : ' (the yearly exclusion)'}, 40% of the rest is added to your income
                {cgtResult.cgtPayable > 0 ? `, and the tax is ${formatPercent(cgtResult.effectiveCGTRate, 1)} of the whole gain.` : ', and no tax is due.'}
                {' '}You keep {formatRand(cgtResult.netProceedsAfterCGT, 0)} after sale costs and tax.
              </>}
              figures={[
                { label: 'Gain after costs', value: formatRand(cgtResult.grossCapitalGain, 0) },
                { label: 'Excluded', value: formatRand(cgtResult.primaryResidenceExclusion + cgtResult.annualExclusion, 0) },
                { label: 'Tax as a share of the gain', value: formatPercent(cgtResult.effectiveCGTRate, 1) },
                { label: 'You keep', value: formatRand(cgtResult.netProceedsAfterCGT, 0) },
              ]}
            />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Proceeds waterfall */}
              <div className="glass-card-static p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Sale Proceeds Breakdown</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[
                      { name: 'Base Cost', value: cgtResult.baseCost, fill: C.blue },
                      { name: 'Sale Costs', value: cgtResult.saleCosts, fill: C.orange },
                      { name: 'CGT', value: cgtResult.cgtPayable, fill: C.red },
                      { name: 'Net Proceeds', value: cgtResult.netProceedsAfterCGT, fill: C.green },
                    ]}
                    margin={{ left: 8, right: 8 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => `R${(v/1_000_000).toFixed(1)}M`} />
                    <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                    <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                      {[C.blue, C.orange, C.red, C.green].map((fill, i) => (
                        <Cell key={i} fill={fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* CGT composition pie */}
              <div className="glass-card-static p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Gain Distribution</p>
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
                      {[C.blue, C.teal, C.green, C.red].map((fill, i) => (
                        <Cell key={i} fill={fill} />
                      ))}
                    </Pie>
                    <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed calculation table */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>CGT Calculation Detail</p>
              <table className="w-full text-xs">
                <tbody>
                  {[
                    { label: 'Sale Price', value: cgt.salePrice, highlight: false },
                    { label: '− Sale Costs (agent commission)', value: -cgtResult.saleCosts, highlight: false },
                    { label: '− Base Cost (purchase + acquisition)', value: -cgtResult.baseCost, highlight: false },
                    { label: 'Gross Capital Gain', value: cgtResult.grossCapitalGain, highlight: true },
                    { label: '− Primary Residence Exclusion', value: -cgtResult.primaryResidenceExclusion, highlight: false },
                    { label: `− Annual Exclusion (${formatRand(TAX_YEARS[taxYear].cgt.annualExclusion, 0)})`, value: -cgtResult.annualExclusion, highlight: false },
                    { label: 'Net Gain After Exclusions', value: cgtResult.netGainAfterExclusions, highlight: true },
                    { label: '× 40% Inclusion Rate', value: cgtResult.inclusionAmount, highlight: false },
                    { label: 'Included in Taxable Income', value: cgtResult.inclusionAmount, highlight: false },
                    { label: 'Tax on Income + CGT Inclusion', value: -cgtResult.taxOnIncomeWithCGT, highlight: false },
                    { label: 'Tax on Income Only', value: cgtResult.taxOnIncomeWithoutCGT, highlight: false },
                    { label: 'CGT Payable', value: -cgtResult.cgtPayable, highlight: true },
                    { label: 'Net Proceeds After CGT', value: cgtResult.netProceedsAfterCGT, highlight: true },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td className="py-2 pr-4" style={{ color: row.highlight ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: row.highlight ? 600 : 400 }}>
                        {row.label}
                      </td>
                      <td
                        className="py-2 text-right font-mono"
                        style={{
                          color: textTone(row.value < 0 ? C.red : row.highlight ? 'var(--ink)' : 'var(--ink-muted)'),
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

      <AssumptionsDrawer
        items={[
          <>Income tax uses the SARS tables for the selected tax year. Rental profit, or a loss, is added to your other income; ring-fencing under section 20A is not modelled.</>,
          <>Section 13sex needs at least five new-and-unused residential units, let out, and allows 5% of the building cost (excluding land) a year for 20 years, or 10% for 10 years for low-cost housing. Allowances are added back to income (recouped) when you sell.</>,
          <>Section 13quat applies to buildings in an urban development zone: 20% in the first year and 8% a year after that for a new building, or 20% a year over five years for an improvement.</>,
          <>Capital gains tax uses the R50,000 yearly exclusion, the R3 million primary residence exclusion where it applies, and 40% inclusion at your marginal rate.</>,
          <>These are estimates, not tax advice. Confirm with a registered tax practitioner.</>,
        ]}
      />
    </div>
  );
}
