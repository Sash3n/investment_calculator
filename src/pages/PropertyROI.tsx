import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MapPin, Plus, Trash2, Eye, Download, Building2, Cloud, CloudOff, Pencil, FileText, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';

import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { calcPropertyROI } from '../utils/roi';
import { exportPropertyPDF } from '../utils/pdf';
import { formatRand, formatPercent } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useSavedProperties, useHistory } from '../hooks/useFirestore';
import { usePrimeRate, FALLBACK_PRIME } from '../hooks/usePrimeRate';
import type { PropertyInputs } from '../types';

const CHART_COLORS = {
  indigo: '#6366F1',
  amber: '#F59E0B',
  emerald: '#10B981',
  red: '#EF4444',
  cyan: '#06B6D4',
  pink: '#EC4899',
};

const DEFAULT_INPUTS: PropertyInputs = {
  propertyName: 'My Investment Property',
  purchasePrice: 1200000,
  discount: 0,
  deposit: 120000,
  interestRate: FALLBACK_PRIME,
  bondTerm: 20,
  monthlyLevies: 1500,
  monthlyRates: 800,
  insurance: 600,
  effluentFees: 350,
  miscFees: 0,
  monthlyServiceFee: 69,
  managementFeePercent: 8,
  vacancyRate: 5,
  rentScenario1: 9500,
  rentScenario2: 11000,
  annualAppreciation: 7,
  transferDutyExempt: false,
  bondRegistrationIncluded: false,
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

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs">
      <p style={{ color: payload[0].payload.fill }}>{payload[0].name}</p>
      <p className="text-[#F1F5F9] font-bold">{formatRand(payload[0].value)}</p>
    </div>
  );
}

export function PropertyROI() {
  const liveRate = usePrimeRate();
  const [activeTab, setActiveTab] = useState<'quick' | 'portfolio'>('quick');
  const [inputs, setInputs] = useState<PropertyInputs>(DEFAULT_INPUTS);

  // Pre-fill with live prime rate once loaded (only if user hasn't changed it yet)
  const [rateApplied, setRateApplied] = useState(false);
  useEffect(() => {
    if (!liveRate.loading && !liveRate.fallback && !rateApplied) {
      setInputs((prev) =>
        prev.interestRate === FALLBACK_PRIME
          ? { ...prev, interestRate: liveRate.primeRate }
          : prev
      );
      setRateApplied(true);
    }
  }, [liveRate.loading, liveRate.fallback, liveRate.primeRate, rateApplied]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auth + Firestore
  const { user } = useAuth();
  const { properties: cloudProperties, save: saveCloud, remove: removeCloud, loading: cloudLoading } = useSavedProperties(user?.uid ?? null);
  const { push: pushHistory } = useHistory(user?.uid ?? null);

  // localStorage fallback for unauthenticated users
  const [localPortfolio, setLocalPortfolio] = useState<(PropertyInputs & { id: string })[]>(() => {
    try {
      const stored = localStorage.getItem('fincalc_portfolio');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Unified portfolio — cloud when signed in, localStorage otherwise
  const portfolio = user
    ? cloudProperties.map((p) => ({ ...p.inputs, id: p.id }))
    : localPortfolio;

  const set = useCallback(<K extends keyof PropertyInputs>(key: K, raw: string | number) => {
    setInputs((prev) => ({
      ...prev,
      [key]: typeof raw === 'string' && key !== 'propertyName' ? parseFloat(raw) || 0 : raw,
    }));
  }, []);

  const result = useMemo(() => calcPropertyROI(inputs), [inputs]);

  // ── Chart data ─────────────────────────────────────────────
  const incomeExpenseData = useMemo(() => [
    { name: 'S1 Rent', value: result.monthlyEffectiveRentS1, fill: CHART_COLORS.emerald },
    { name: 'S2 Rent', value: result.monthlyEffectiveRentS2, fill: CHART_COLORS.cyan },
    { name: 'Bond', value: result.monthlyBondRepayment, fill: CHART_COLORS.indigo },
    { name: 'Service Fee', value: inputs.monthlyServiceFee, fill: '#818CF8' },
    { name: 'Levies', value: inputs.monthlyLevies, fill: CHART_COLORS.amber },
    { name: 'Rates', value: inputs.monthlyRates, fill: CHART_COLORS.pink },
    { name: 'Insurance', value: inputs.insurance, fill: CHART_COLORS.red },
    { name: 'Effluent', value: inputs.effluentFees, fill: CHART_COLORS.cyan },
    { name: 'Misc', value: inputs.miscFees, fill: '#A78BFA' },
  ], [result, inputs]);

  const propertyValueData = useMemo(() =>
    result.propertyValueYears.map((y) => ({
      year: `Yr ${y.year}`,
      'Property Value': y.value,
      'Equity': y.equity,
      'Loan Balance': y.loanBalance,
    })),
    [result]
  );

  const costPieData = useMemo(() => [
    { name: 'Bond Repayment', value: Math.round(result.monthlyBondRepayment), fill: CHART_COLORS.indigo },
    { name: 'Service Fee', value: inputs.monthlyServiceFee, fill: '#818CF8' },
    { name: 'Levies', value: inputs.monthlyLevies, fill: CHART_COLORS.amber },
    { name: 'Rates & Taxes', value: inputs.monthlyRates, fill: CHART_COLORS.cyan },
    { name: 'Insurance', value: inputs.insurance, fill: CHART_COLORS.pink },
    { name: 'Effluent', value: inputs.effluentFees, fill: '#06B6D4' },
    { name: 'Misc', value: inputs.miscFees, fill: '#A78BFA' },
    { name: 'Mgmt Fee (S1)', value: Math.round(result.managementFeeS1), fill: CHART_COLORS.emerald },
  ].filter((d) => d.value > 0), [result, inputs]);

  // ── Portfolio management ───────────────────────────────────
  const saveToPortfolio = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (user) {
        await saveCloud(inputs.propertyName || 'Property', inputs);
        // Also push to calculation history
        await pushHistory({
          type: 'property',
          title: `Property — ${inputs.propertyName || 'Investment Property'}`,
          summary: `Net yield: ${result.netYieldS1.toFixed(1)}% | Cash flow: ${formatRand(result.cashFlowS1)}/month | Price: ${formatRand(inputs.purchasePrice)}`,
          inputs: inputs as unknown as Record<string, unknown>,
        });
      } else {
        const entry = { ...inputs, id: Date.now().toString() };
        const updated = [...localPortfolio, entry];
        setLocalPortfolio(updated);
        localStorage.setItem('fincalc_portfolio', JSON.stringify(updated));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')
        ? 'Save failed: Firestore rules not configured.'
        : `Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const removeFromPortfolio = async (id: string) => {
    if (user) {
      await removeCloud(id);
    } else {
      const updated = localPortfolio.filter((p) => p.id !== id);
      setLocalPortfolio(updated);
      localStorage.setItem('fincalc_portfolio', JSON.stringify(updated));
    }
    if (selectedPortfolioId === id) setSelectedPortfolioId(null);
  };

  const exportPortfolioExcel = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Name', 'Price', 'Loan', 'Bond Repayment', 'S1 Rent', 'S1 Cash Flow', 'S1 Yield', 'S2 Rent', 'S2 Cash Flow', 'S2 Yield', '5yr ROI (S1)', '10yr ROI (S1)'];
    const rows = portfolio.map((p) => {
      const r = calcPropertyROI(p);
      return [
        p.propertyName,
        p.purchasePrice,
        r.loanAmount.toFixed(0),
        r.monthlyBondRepayment.toFixed(2),
        p.rentScenario1,
        r.cashFlowS1.toFixed(2),
        `${r.netYieldS1.toFixed(2)}%`,
        p.rentScenario2,
        r.cashFlowS2.toFixed(2),
        `${r.netYieldS2.toFixed(2)}%`,
        `${r.roi5YearS1.toFixed(1)}%`,
        `${r.roi10YearS1.toFixed(1)}%`,
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Portfolio');
    XLSX.writeFile(wb, 'FinCalcZA_Portfolio.xlsx');
  };

  const exportQuickExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['Property ROI Analysis', ''],
      ['Property Name', inputs.propertyName],
      ['Purchase Price', inputs.purchasePrice],
      ['Effective Price', result.effectivePurchasePrice],
      ['Deposit', inputs.deposit],
      ['Loan Amount', result.loanAmount],
      ['Monthly Bond Repayment', result.monthlyBondRepayment.toFixed(2)],
      ['Monthly Levies', inputs.monthlyLevies],
      ['Rates & Taxes', inputs.monthlyRates],
      ['Insurance', inputs.insurance],
      ['Effluent Fees', inputs.effluentFees],
      ['Misc Fees', inputs.miscFees],
      ['', ''],
      ['Scenario 1 Rent', inputs.rentScenario1],
      ['S1 Effective Rent (after vacancy)', result.monthlyEffectiveRentS1.toFixed(2)],
      ['S1 Total Monthly Costs', result.totalMonthlyCostsS1.toFixed(2)],
      ['S1 Cash Flow', result.cashFlowS1.toFixed(2)],
      ['S1 Gross Yield', `${result.grossYieldS1.toFixed(2)}%`],
      ['S1 Net Yield', `${result.netYieldS1.toFixed(2)}%`],
      ['S1 5-Year ROI', `${result.roi5YearS1.toFixed(1)}%`],
      ['S1 10-Year ROI', `${result.roi10YearS1.toFixed(1)}%`],
      ['', ''],
      ['Scenario 2 Rent', inputs.rentScenario2],
      ['S2 Cash Flow', result.cashFlowS2.toFixed(2)],
      ['S2 Net Yield', `${result.netYieldS2.toFixed(2)}%`],
      ['S2 5-Year ROI', `${result.roi5YearS2.toFixed(1)}%`],
      ['S2 10-Year ROI', `${result.roi10YearS2.toFixed(1)}%`],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Property ROI');

    // Value over time sheet
    const valueHeaders = ['Year', 'Property Value', 'Equity', 'Loan Balance'];
    const valueRows = result.propertyValueYears.map((y) => [y.year, y.value, y.equity, y.loanBalance]);
    const ws2 = XLSX.utils.aoa_to_sheet([valueHeaders, ...valueRows]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Value Over Time');
    XLSX.writeFile(wb, 'FinCalcZA_PropertyROI.xlsx');
  };

  const selectedPortfolioProperty = portfolio.find((p) => p.id === selectedPortfolioId);
  const selectedResult = selectedPortfolioProperty ? calcPropertyROI(selectedPortfolioProperty) : null;

  const portfolioROIData = portfolio.map((p) => {
    const r = calcPropertyROI(p);
    return {
      name: p.propertyName.substring(0, 15),
      'ROI 5yr S1': parseFloat(r.roi5YearS1.toFixed(1)),
      'ROI 10yr S1': parseFloat(r.roi10YearS1.toFixed(1)),
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 pt-6 pb-16"
    >
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <SectionHeader
          title="Property ROI Calculator"
          subtitle="Analyse buy-to-let investment returns with two rental scenarios."
          icon={MapPin}
          className="mb-0"
        />
        <div className="tab-bar">
          <button className={clsx('tab-btn', activeTab === 'quick' && 'active')}
            onClick={() => setActiveTab('quick')}>
            Quick Calculator
          </button>
          <button className={clsx('tab-btn', activeTab === 'portfolio' && 'active')}
            onClick={() => setActiveTab('portfolio')}>
            Portfolio ({portfolio.length})
          </button>
        </div>
      </div>

      {activeTab === 'quick' && (
        <div className="two-col-layout">
          {/* Input panel */}
          <div className="space-y-4">
            <div className="glass-card-static p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]"
                 style={{ fontFamily: 'var(--font-body)' }}>
                Property Details
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider"
                       style={{ fontFamily: 'var(--font-body)' }}>
                  Property Name
                </label>
                <input
                  type="text"
                  value={inputs.propertyName}
                  onChange={(e) => set('propertyName', e.target.value)}
                  className="input-dark"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>
              <InputField label="Purchase Price" id="pp" value={inputs.purchasePrice}
                onChange={(v) => set('purchasePrice', v)} prefix="R" step={10000} />
              <InputField label="Discount" id="disc" value={inputs.discount}
                onChange={(v) => set('discount', v)} suffix="%" step={0.5} min={0} max={50}
                help="Reduces effective purchase price (e.g. distressed sale)" />
              <InputField label="Deposit" id="dep" value={inputs.deposit}
                onChange={(v) => set('deposit', v)} prefix="R" step={5000} />

              {/* Acquisition cost toggles */}
              {[
                {
                  label: 'Include transfer duty',
                  hint: 'Disable for VAT-registered seller / new build',
                  active: !inputs.transferDutyExempt,
                  onToggle: () => setInputs((prev) => ({ ...prev, transferDutyExempt: !prev.transferDutyExempt })),
                },
                {
                  label: 'Include bond registration costs',
                  hint: 'Disable if capitalised into loan or covered by bank promotion',
                  active: !inputs.bondRegistrationIncluded,
                  onToggle: () => setInputs((prev) => ({ ...prev, bondRegistrationIncluded: !prev.bondRegistrationIncluded })),
                },
              ].map(({ label, hint, active, onToggle }) => (
                <label key={label} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={onToggle}
                    className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
                    style={{ background: active ? '#6366F1' : 'rgba(100,116,139,0.3)' }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow"
                      style={{ transform: active ? 'translateX(16px)' : 'translateX(0)' }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {label}
                    <span className="ml-1.5 text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                      ({hint})
                    </span>
                  </span>
                </label>
              ))}

              {/* Acquisition cost breakdown */}
              <div className="rounded-xl p-3.5 space-y-2" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#818CF8' }}>
                  Acquisition Costs
                </p>
                {[
                  { label: 'Deposit',           value: inputs.deposit,                                                         muted: false },
                  { label: 'Transfer Duty',     value: inputs.transferDutyExempt ? 0 : result.transferDuty,                    muted: inputs.transferDutyExempt },
                  { label: 'Bond Registration', value: inputs.bondRegistrationIncluded ? 0 : result.bondRegistrationCost,      muted: inputs.bondRegistrationIncluded },
                ].map(({ label, value, muted }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: muted ? 'var(--color-text-subtle)' : 'var(--color-text-muted)' }}>
                      {label}{muted ? ' (excluded)' : ''}
                    </span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: muted ? 'var(--color-text-subtle)' : 'var(--color-text)' }}>
                      {formatRand(value)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                  <span className="text-xs font-bold" style={{ color: '#818CF8' }}>Total Cash Required</span>
                  <span className="text-sm font-bold" style={{ color: '#818CF8' }}>{formatRand(result.totalCashRequired)}</span>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                  Bond registration costs are estimated — get a quote from your attorney.
                </p>
              </div>

              <div className="space-y-1.5">
                <InputField label="Interest Rate" id="ir" value={inputs.interestRate}
                  onChange={(v) => set('interestRate', v)} suffix="%" step={0.25} />
                <button
                  className="text-xs text-[#6366F1] hover:text-[#818CF8] transition-colors flex items-center gap-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                  onClick={() => set('interestRate', String(liveRate.primeRate))}
                >
                  <Zap size={11} />
                  {liveRate.loading ? 'Fetching rate…' : `Use Live Prime Rate (${liveRate.primeRate}%${liveRate.fallback ? ' est.' : ''})`}
                </button>
              </div>
              <InputField label="Bond Term" id="bt" value={inputs.bondTerm}
                onChange={(v) => set('bondTerm', v)} suffix="yrs" min={1} max={30} step={1} />
            </div>

            <div className="glass-card-static p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]"
                 style={{ fontFamily: 'var(--font-body)' }}>
                Monthly Costs
              </p>
              <InputField label="Levies" id="lev" value={inputs.monthlyLevies}
                onChange={(v) => set('monthlyLevies', v)} prefix="R" step={100} />
              <InputField label="Rates & Taxes" id="rat" value={inputs.monthlyRates}
                onChange={(v) => set('monthlyRates', v)} prefix="R" step={100} />
              <InputField label="Insurance" id="ins" value={inputs.insurance}
                onChange={(v) => set('insurance', v)} prefix="R" step={100} />
              <InputField label="Monthly Service Fee" id="msf" value={inputs.monthlyServiceFee}
                onChange={(v) => set('monthlyServiceFee', v)} prefix="R" step={1}
                help="Bank bond admin fee (e.g. R69/month)" />
              <InputField label="Effluent Fees" id="eff" value={inputs.effluentFees}
                onChange={(v) => set('effluentFees', v)} prefix="R" step={50}
                help="Municipal sewage/effluent charges" />
              <InputField label="Misc Fees" id="misc" value={inputs.miscFees}
                onChange={(v) => set('miscFees', v)} prefix="R" step={100}
                help="Any other recurring costs (garden, pool, etc.)" />
              <InputField label="Management Fee" id="mf" value={inputs.managementFeePercent}
                onChange={(v) => set('managementFeePercent', v)} suffix="% of rent" step={0.5}
                help="Agent fee deducted from rental income" />
              <InputField label="Vacancy Rate" id="vac" value={inputs.vacancyRate}
                onChange={(v) => set('vacancyRate', v)} suffix="%" step={1} min={0} max={50}
                help="% of year the property is unoccupied" />
            </div>

            <div className="glass-card-static p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]"
                 style={{ fontFamily: 'var(--font-body)' }}>
                Rental Scenarios
              </p>
              <InputField label="Scenario 1 Monthly Rent" id="r1" value={inputs.rentScenario1}
                onChange={(v) => set('rentScenario1', v)} prefix="R" step={500} />
              <InputField label="Scenario 2 Monthly Rent" id="r2" value={inputs.rentScenario2}
                onChange={(v) => set('rentScenario2', v)} prefix="R" step={500} />
              <InputField label="Annual Property Appreciation" id="app" value={inputs.annualAppreciation}
                onChange={(v) => set('annualAppreciation', v)} suffix="% p.a." step={0.5}
                help="SA average: 7% p.a." />
            </div>

            {/* Cloud sync badge */}
            {user ? (
              <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', color: '#818CF8' }}>
                <Cloud size={12} /> Syncing to your account
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg" style={{ background: 'rgba(100,116,139,0.1)', color: 'var(--color-text-subtle)' }}>
                <CloudOff size={12} /> Sign in to save across devices
              </div>
            )}

            {saveError && (
              <div className="text-xs px-2 py-1.5 rounded-lg flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span className="flex-1">{saveError}</span>
                <button onClick={() => setSaveError(null)} className="font-bold opacity-60 hover:opacity-100">✕</button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                onClick={saveToPortfolio}
                disabled={saving || cloudLoading}
              >
                <Plus size={14} /> {saving ? 'Saving…' : 'Save to Portfolio'}
              </button>
              <button className="btn-ghost flex items-center gap-2 text-sm"
                onClick={exportQuickExcel}>
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          {/* Results panel */}
          <div className="space-y-5">
            {/* PDF export */}
            <div className="flex justify-end">
              <button
                className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
                onClick={() => exportPropertyPDF(inputs, result)}
              >
                <FileText size={13} /> Export PDF
              </button>
            </div>

            {/* Key metrics */}
            <div className="four-col-stats">
              <StatCard label="Monthly Bond" value={formatRand(result.monthlyBondRepayment)}
                icon={Building2} color="indigo" delay={0} />
              <StatCard label="S1 Cash Flow" value={formatRand(result.cashFlowS1)}
                color={result.cashFlowS1 >= 0 ? 'emerald' : 'red'} delay={0.05}
                sub={result.cashFlowS1 >= 0 ? 'Positive' : 'Negative'} />
              <StatCard label="S2 Cash Flow" value={formatRand(result.cashFlowS2)}
                color={result.cashFlowS2 >= 0 ? 'emerald' : 'red'} delay={0.1}
                sub={result.cashFlowS2 >= 0 ? 'Positive' : 'Negative'} />
              <StatCard label="Total Monthly Costs" value={formatRand(result.totalMonthlyCostsS1)}
                color="amber" delay={0.15} />
            </div>

            {/* Yield & ROI grid */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Returns & Yield
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Gross Yield S1', value: formatPercent(result.grossYieldS1), color: '#10B981' },
                  { label: 'Net Yield S1', value: formatPercent(result.netYieldS1), color: result.netYieldS1 >= 0 ? '#10B981' : '#EF4444' },
                  { label: 'Gross Yield S2', value: formatPercent(result.grossYieldS2), color: '#06B6D4' },
                  { label: 'Net Yield S2', value: formatPercent(result.netYieldS2), color: result.netYieldS2 >= 0 ? '#06B6D4' : '#EF4444' },
                  { label: '5-Year ROI S1', value: formatPercent(result.roi5YearS1, 1), color: '#6366F1' },
                  { label: '10-Year ROI S1', value: formatPercent(result.roi10YearS1, 1), color: '#818CF8' },
                  { label: '5-Year ROI S2', value: formatPercent(result.roi5YearS2, 1), color: '#F59E0B' },
                  { label: '10-Year ROI S2', value: formatPercent(result.roi10YearS2, 1), color: '#FCD34D' },
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
            </div>

            {/* Monthly Income vs Expenses BarChart */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Monthly Income vs Expenses
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={incomeExpenseData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(v) => `R ${(v / 1000).toFixed(1)}K`} />
                  <Tooltip
                    formatter={(v: unknown) => [formatRand(Number(v)), 'Amount']}
                    contentStyle={{
                      background: 'rgba(15,20,40,0.95)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px', fontSize: '12px', color: '#F1F5F9',
                    }}
                  />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                    {incomeExpenseData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Property value + equity AreaChart */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Property Value & Equity Over 10 Years
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={propertyValueData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.amber} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.amber} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(v) => `R ${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                  <Area type="monotone" dataKey="Property Value" stroke={CHART_COLORS.amber}
                    fill="url(#gradValue)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Equity" stroke={CHART_COLORS.emerald}
                    fill="url(#gradEquity)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Loan Balance" stroke={CHART_COLORS.red}
                    fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Cost breakdown pie */}
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Monthly Cost Breakdown
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={costPieData} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {costPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {portfolio.length === 0 ? (
            <div className="glass-card-static p-12 text-center">
              <MapPin size={40} className="text-[#475569] mx-auto mb-4" />
              <p className="text-base font-semibold text-[#94A3B8]" style={{ fontFamily: 'var(--font-heading)' }}>
                No properties in portfolio
              </p>
              <p className="text-sm text-[#64748B] mt-2" style={{ fontFamily: 'var(--font-body)' }}>
                Go to Quick Calculator and click "Save to Portfolio"
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button className="btn-primary flex items-center gap-2 text-sm"
                  onClick={exportPortfolioExcel}>
                  <Download size={14} /> Export All to Excel
                </button>
              </div>

              {/* Property cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolio.map((prop) => {
                  const r = calcPropertyROI(prop);
                  const isSelected = selectedPortfolioId === prop.id;
                  return (
                    <motion.div
                      key={prop.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx(
                        'glass-card p-5 cursor-pointer transition-all',
                        isSelected && 'border-[#6366F1] glow-indigo'
                      )}
                      onClick={() => setSelectedPortfolioId(isSelected ? null : prop.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(16,185,129,0.12)] flex items-center justify-center">
                          <MapPin size={16} className="text-[#10B981]" />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1 rounded-lg transition-colors text-[#64748B] hover:text-[#F59E0B]"
                            title="Edit in calculator"
                            onClick={(e) => {
                              e.stopPropagation();
                              // eslint-disable-next-line @typescript-eslint/no-unused-vars
                              const { id: _id, ...propInputs } = prop;
                              setInputs(propInputs as PropertyInputs);
                              setActiveTab('quick');
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="text-[#64748B] hover:text-[#EF4444] transition-colors p-1"
                            onClick={(e) => { e.stopPropagation(); removeFromPortfolio(prop.id); }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-[#F1F5F9] mb-1 truncate"
                         style={{ fontFamily: 'var(--font-heading)' }}>
                        {prop.propertyName}
                      </p>
                      <p className="text-xs text-[#64748B] mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                        {formatRand(prop.purchasePrice)} · {formatRand(prop.rentScenario1)}/mo
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Cash Flow', value: formatRand(r.cashFlowS1), color: r.cashFlowS1 >= 0 ? '#10B981' : '#EF4444' },
                          { label: 'Net Yield', value: formatPercent(r.netYieldS1), color: '#6366F1' },
                          { label: '5yr ROI', value: formatPercent(r.roi5YearS1, 1), color: '#F59E0B' },
                          { label: '10yr ROI', value: formatPercent(r.roi10YearS1, 1), color: '#06B6D4' },
                        ].map((s) => (
                          <div key={s.label}>
                            <p className="text-[10px] text-[#475569] uppercase" style={{ fontFamily: 'var(--font-body)' }}>
                              {s.label}
                            </p>
                            <p className="text-sm font-bold" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>
                              {s.value}
                            </p>
                          </div>
                        ))}
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 mt-3 text-xs text-[#6366F1]"
                             style={{ fontFamily: 'var(--font-body)' }}>
                          <Eye size={12} /> Viewing details below
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Selected property details */}
              {selectedPortfolioProperty && selectedResult && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card-static p-5"
                >
                  <p className="text-sm font-bold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                    Detail: {selectedPortfolioProperty.propertyName}
                  </p>
                  <div className="grid sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Bond Repayment', value: formatRand(selectedResult.monthlyBondRepayment) },
                      { label: 'Total Costs S1', value: formatRand(selectedResult.totalMonthlyCostsS1) },
                      { label: 'Cash Flow S1', value: formatRand(selectedResult.cashFlowS1) },
                      { label: '10yr ROI S1', value: formatPercent(selectedResult.roi10YearS1, 1) },
                    ].map((s) => (
                      <div key={s.label} className="glass-card-static p-3">
                        <p className="text-[10px] text-[#64748B] uppercase mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                          {s.label}
                        </p>
                        <p className="text-sm font-bold text-[#F1F5F9]" style={{ fontFamily: 'var(--font-heading)' }}>
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Portfolio ROI comparison chart */}
              {portfolio.length > 1 && (
                <div className="glass-card-static p-5">
                  <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                    Portfolio ROI Comparison
                  </p>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={portfolioROIData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(v: unknown) => [`${v}%`, '']}
                        contentStyle={{
                          background: 'rgba(15,20,40,0.95)', border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px', fontSize: '12px', color: '#F1F5F9',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                      <Bar dataKey="ROI 5yr S1" fill={CHART_COLORS.indigo} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ROI 10yr S1" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Comparison table */}
              <div className="glass-card-static p-5">
                <p className="text-sm font-semibold text-[#F1F5F9] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                  Portfolio Comparison
                </p>
                <div className="overflow-x-auto">
                  <table className="table-dark">
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>Price</th>
                        <th>Bond</th>
                        <th>S1 Cash Flow</th>
                        <th>Net Yield</th>
                        <th>5yr ROI</th>
                        <th>10yr ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.map((prop) => {
                        const r = calcPropertyROI(prop);
                        return (
                          <tr key={prop.id}>
                            <td className="font-semibold">{prop.propertyName}</td>
                            <td>{formatRand(prop.purchasePrice, 0)}</td>
                            <td>{formatRand(r.monthlyBondRepayment)}</td>
                            <td style={{ color: r.cashFlowS1 >= 0 ? '#10B981' : '#EF4444' }}>
                              {formatRand(r.cashFlowS1)}
                            </td>
                            <td>{formatPercent(r.netYieldS1)}</td>
                            <td style={{ color: '#6366F1' }}>{formatPercent(r.roi5YearS1, 1)}</td>
                            <td style={{ color: '#F59E0B' }}>{formatPercent(r.roi10YearS1, 1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
