import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  Building2, Plus, Trash2, ChevronDown, ChevronUp, Info,
  CheckCircle2, XCircle, Receipt, TrendingUp, Wallet, CloudDownload,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { TaxYearSelect } from '../components/ui/TaxYearSelect';
import { EmptyState } from '../components/ui/EmptyState';
import { formatRand, formatRandShort } from '../utils/format';
import { calcPortfolioTax, S13SEX_MIN_UNITS } from '../utils/portfolioTax';
import { calcPropertyROI } from '../utils/roi';
import { TAX_YEAR_OPTIONS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';
import { useAuth } from '../context/AuthContext';
import { useSavedProperties } from '../hooks/useFirestore';
import type { AgeGroup, PortfolioRentalProperty } from '../types';

const C = {
  indigo: '#6366F1', amber: '#F59E0B', emerald: '#10B981',
  red: '#EF4444', cyan: '#06B6D4', violet: '#8B5CF6',
};

const AGE_OPTIONS = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74',  label: '65 – 74 years' },
  { value: '75plus',  label: '75 years and older' },
];

function newProperty(name: string): PortfolioRentalProperty {
  return {
    id: `pp-${crypto.randomUUID()}`,
    name,
    monthlyRent: 10_000,
    vacancyRate: 5,
    annualBondInterest: 0,
    annualRates: 12_000,
    annualLevies: 0,
    annualInsurance: 6_000,
    annualRepairs: 0,
    managementFeePercent: 0,
    otherAnnualDeductions: 0,
    purchasePrice: 1_000_000,
    isNewUnused: false,
    isLowCostHousing: false,
  };
}

function RandTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ minWidth: 150 }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: 'var(--color-text-muted)' }}>{p.name}: {formatRand(p.value, 0)}</p>
      ))}
    </div>
  );
}

export function PropertyPortfolioTax() {
  const [properties, setProperties] = useState<PortfolioRentalProperty[]>(() => [newProperty('Property 1')]);
  const [expanded, setExpanded]     = useState<string | null>(() => properties[0]?.id ?? null);
  const [otherIncome, setOtherIncome] = useState(600_000);
  const [ageGroup, setAgeGroup]     = useState<AgeGroup>('under65');
  const [raMonthly, setRaMonthly]   = useState(0);
  const [taxYear, setTaxYear]       = useState<TaxYearId>(DEFAULT_TAX_YEAR);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { user } = useAuth();
  const { properties: savedProperties } = useSavedProperties(user?.uid ?? null);

  const result = useMemo(
    () => calcPortfolioTax({ properties, otherAnnualIncome: otherIncome, ageGroup, raMonthlyContrib: raMonthly }, taxYear),
    [properties, otherIncome, ageGroup, raMonthly, taxYear],
  );

  const update = useCallback((id: string, patch: Partial<PortfolioRentalProperty>) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const addProperty = () => {
    const p = newProperty(`Property ${properties.length + 1}`);
    setProperties((prev) => [...prev, p]);
    setExpanded(p.id);
  };

  const removeProperty = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const importSaved = (name: string, inputs: Parameters<typeof calcPropertyROI>[0]) => {
    const roi = calcPropertyROI(inputs);
    const annualInterestEstimate = roi.monthlyBondRepayment * 12 * 0.8; // early-loan interest share
    setProperties((prev) => [...prev, {
      id: `pp-${crypto.randomUUID()}`,
      name: name || inputs.propertyName || 'Imported property',
      monthlyRent: inputs.rentScenario1,
      vacancyRate: inputs.vacancyRate,
      annualBondInterest: Math.round(annualInterestEstimate),
      annualRates: inputs.monthlyRates * 12,
      annualLevies: inputs.monthlyLevies * 12,
      annualInsurance: inputs.insurance * 12,
      annualRepairs: 0,
      managementFeePercent: inputs.managementFeePercent,
      otherAnnualDeductions: (inputs.effluentFees + inputs.miscFees) * 12,
      purchasePrice: inputs.purchasePrice,
      isNewUnused: false,
      isLowCostHousing: inputs.purchasePrice <= 350_000,
    }]);
    setShowImport(false);
  };

  const yearLabel = TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label ?? taxYear;
  const unitsShort = S13SEX_MIN_UNITS - result.s13QualifyingUnits;

  const barData = result.perProperty.map((p) => ({
    name: p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name,
    profit: Math.round(p.netProfit),
  }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Property Portfolio Tax
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Combined rental tax across your portfolio, and the Section 13sex break at {S13SEX_MIN_UNITS}+ new units · {yearLabel}
            </p>
          </div>
          <TaxYearSelect id="ppt-taxyear" value={taxYear} onChange={setTaxYear} className="min-w-[150px]" />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
        {/* ── Inputs ── */}
        <div className="space-y-5">
          {/* Taxpayer */}
          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Taxpayer" icon={Wallet} />
            <InputField label="Other Annual Taxable Income" id="ppt-other" value={otherIncome}
              onChange={(v) => setOtherIncome(parseFloat(v) || 0)} prefix="R" help="Salary and other income before rentals" />
            <SelectField label="Age Group" id="ppt-age" value={ageGroup}
              onChange={(v) => setAgeGroup(v as AgeGroup)} options={AGE_OPTIONS} />
            <InputField label="Monthly RA Contribution" id="ppt-ra" value={raMonthly}
              onChange={(v) => setRaMonthly(parseFloat(v) || 0)} prefix="R"
              help="Shown stacked with Section 13sex in the comparison" />
          </div>

          {/* Properties */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeader title={`Properties (${properties.length})`} icon={Building2} />
              <div className="flex gap-2">
                {user && savedProperties.length > 0 && (
                  <button onClick={() => setShowImport((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: 'rgba(6,182,212,0.12)', color: C.cyan, border: `1px solid ${C.cyan}44` }}>
                    <CloudDownload size={13} /> Import
                  </button>
                )}
                <button onClick={addProperty}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid ${C.indigo}44` }}>
                  <Plus size={13} /> Add
                </button>
              </div>
            </div>

            {showImport && (
              <div className="p-3 rounded-xl space-y-2" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>From your saved portfolio:</p>
                {savedProperties.map((sp) => (
                  <button key={sp.id} onClick={() => importSaved(sp.name, sp.inputs)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-[rgba(99,102,241,0.08)]"
                    style={{ color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                    {sp.name} <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                      · {formatRandShort(sp.inputs.purchasePrice)} · rent {formatRandShort(sp.inputs.rentScenario1)}/mo
                    </span>
                  </button>
                ))}
                <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                  Bond interest is estimated at 80% of repayments — replace it with the figure from your bank statement for accuracy.
                </p>
              </div>
            )}

            {properties.length === 0 && (
              <EmptyState icon={Building2} title="No properties yet" message="Add a rental property to see the combined tax picture." />
            )}

            {properties.map((p) => {
              const open = expanded === p.id;
              const res = result.perProperty.find((r) => r.id === p.id);
              return (
                <div key={p.id} className="rounded-xl" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                  <button onClick={() => setExpanded(open ? null : p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3">
                    <Building2 size={15} style={{ color: p.isNewUnused ? C.emerald : 'var(--color-text-subtle)' }} />
                    <span className="flex-1 text-left text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                    {res && (
                      <span className="text-xs font-semibold" style={{ color: res.netProfit >= 0 ? C.emerald : C.red }}>
                        {res.netProfit >= 0 ? '+' : ''}{formatRandShort(res.netProfit)}/yr
                      </span>
                    )}
                    {open ? <ChevronUp size={14} style={{ color: 'var(--color-text-subtle)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-subtle)' }} />}
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3">
                      <InputField label="Name" id={`${p.id}-name`} type="text" value={p.name}
                        onChange={(v) => update(p.id, { name: v })} />
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Monthly Rent" id={`${p.id}-rent`} value={p.monthlyRent}
                          onChange={(v) => update(p.id, { monthlyRent: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Vacancy" id={`${p.id}-vac`} value={p.vacancyRate}
                          onChange={(v) => update(p.id, { vacancyRate: parseFloat(v) || 0 })} suffix="%" />
                        <InputField label="Bond Interest (annual)" id={`${p.id}-int`} value={p.annualBondInterest}
                          onChange={(v) => update(p.id, { annualBondInterest: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Rates (annual)" id={`${p.id}-rates`} value={p.annualRates}
                          onChange={(v) => update(p.id, { annualRates: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Levies (annual)" id={`${p.id}-lev`} value={p.annualLevies}
                          onChange={(v) => update(p.id, { annualLevies: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Insurance (annual)" id={`${p.id}-ins`} value={p.annualInsurance}
                          onChange={(v) => update(p.id, { annualInsurance: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Repairs (annual)" id={`${p.id}-rep`} value={p.annualRepairs}
                          onChange={(v) => update(p.id, { annualRepairs: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Mgmt Fee" id={`${p.id}-mgmt`} value={p.managementFeePercent}
                          onChange={(v) => update(p.id, { managementFeePercent: parseFloat(v) || 0 })} suffix="%" />
                      </div>
                      <InputField label="Other Deductions (annual)" id={`${p.id}-oth`} value={p.otherAnnualDeductions}
                        onChange={(v) => update(p.id, { otherAnnualDeductions: parseFloat(v) || 0 })} prefix="R"
                        help="Advertising, accounting, garden services, etc." />
                      <div className="pt-1 space-y-2" style={{ borderTop: '1px dashed var(--color-border)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: 'var(--color-text-subtle)' }}>
                          Section 13sex qualification
                        </p>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id={`${p.id}-new`} checked={p.isNewUnused}
                            onChange={(e) => update(p.id, { isNewUnused: e.target.checked })}
                            className="w-4 h-4 accent-[#10B981]" />
                          <label htmlFor={`${p.id}-new`} className="text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                            Bought new and unused (required for 13sex)
                          </label>
                        </div>
                        {p.isNewUnused && (
                          <>
                            <InputField label="Building Cost (excl. land)" id={`${p.id}-cost`} value={p.purchasePrice}
                              onChange={(v) => update(p.id, { purchasePrice: parseFloat(v) || 0 })} prefix="R" />
                            <div className="flex items-center gap-3">
                              <input type="checkbox" id={`${p.id}-low`} checked={p.isLowCostHousing}
                                onChange={(e) => update(p.id, { isLowCostHousing: e.target.checked })}
                                className="w-4 h-4 accent-[#10B981]" />
                              <label htmlFor={`${p.id}-low`} className="text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                                Low-cost housing (10% over 10 years)
                              </label>
                            </div>
                          </>
                        )}
                      </div>
                      <button onClick={() => removeProperty(p.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(239,68,68,0.08)', color: C.red, border: '1px solid rgba(239,68,68,0.2)' }}>
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Results ── */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Net Rental Income" value={formatRand(result.netRentalIncome, 0)}
              color={result.netRentalIncome >= 0 ? 'emerald' : 'red'} icon={Building2} />
            <StatCard label="Tax on Rentals" value={formatRand(result.taxAttributableToRental, 0)} color="amber" icon={Receipt} />
            <StatCard label="After-Tax Cash Flow" value={`${formatRand(result.afterTaxMonthlyCashFlow, 0)}/mo`}
              color={result.afterTaxMonthlyCashFlow >= 0 ? 'emerald' : 'red'} icon={TrendingUp} />
            <StatCard label="Marginal Rate" value={`${result.marginalRate.toFixed(0)}%`} color="indigo" icon={TrendingUp} />
          </div>

          {/* Section 13sex status banner */}
          <div className="p-4 rounded-xl flex items-start gap-3" style={{
            background: result.s13Qualifies ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${result.s13Qualifies ? C.emerald : C.amber}44`,
          }}>
            {result.s13Qualifies
              ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" style={{ color: C.emerald }} />
              : <XCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} />}
            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {result.s13Qualifies ? (
                <>
                  <span className="font-semibold" style={{ color: C.emerald }}>
                    Section 13sex unlocked with {result.s13QualifyingUnits} qualifying units.
                  </span>{' '}
                  You can deduct {formatRand(result.s13?.annualDeduction ?? 0, 0)} per year
                  ({formatRand(result.s13AnnualTaxSaving, 0)} year-1 tax saving) for up to {result.s13?.deductionPeriodYears} years.
                </>
              ) : (
                <>
                  <span className="font-semibold" style={{ color: C.amber }}>
                    {result.s13QualifyingUnits} of {S13SEX_MIN_UNITS} qualifying units
                  </span>{' '}
                  — buy {unitsShort} more new-and-unused residential {unitsShort === 1 ? 'unit' : 'units'} to unlock the
                  Section 13sex depreciation allowance (5% of building cost per year for 20 years, 10% for low-cost housing).
                  Mark qualifying properties with the "new and unused" checkbox.
                </>
              )}
            </div>
          </div>

          {/* Per-property profit chart */}
          {barData.length > 0 && (
            <div className="glass-card p-5">
              <SectionHeader title="Net Profit per Property" icon={Building2} />
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => formatRandShort(Number(v))} />
                    <Tooltip content={<RandTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                    <Bar dataKey="profit" name="Net profit" radius={[4, 4, 0, 0]}>
                      {barData.map((d, i) => (
                        <Cell key={i} fill={d.profit >= 0 ? C.emerald : C.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* With vs without 13sex */}
          {result.s13Qualifies && result.s13 && (
            <div className="glass-card p-5 space-y-4">
              <SectionHeader title="Tax: With vs Without Section 13sex" icon={Receipt} />
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Standard treatment</p>
                  <p className="text-xl font-bold" style={{ color: C.red }}>
                    {formatRand(result.taxAttributableToRental + result.taxOnOtherIncomeOnly, 0)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>total tax, year 1</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>With Section 13sex{raMonthly > 0 ? ' + RA' : ''}</p>
                  <p className="text-xl font-bold" style={{ color: C.emerald }}>
                    {formatRand(Math.max(0, result.taxAttributableToRental + result.taxOnOtherIncomeOnly - (raMonthly > 0 ? result.s13.combinedAnnualTaxSaving : result.s13.annualTaxSaving)), 0)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                    saves {formatRand(raMonthly > 0 ? result.s13.combinedAnnualTaxSaving : result.s13.annualTaxSaving, 0)}/yr
                  </p>
                </div>
              </div>

              <button onClick={() => setShowSchedule((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: C.indigo }}>
                {showSchedule ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showSchedule ? 'Hide' : 'Show'} year-by-year schedule
              </button>
              {showSchedule && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th className="text-left py-2">Year</th>
                        <th className="text-right py-2">Deduction</th>
                        <th className="text-right py-2">Tax Saving</th>
                        <th className="text-right py-2">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.s13.schedule.map((row) => (
                        <tr key={row.year} style={{ borderBottom: '1px dashed var(--color-border)' }}>
                          <td className="py-1.5">{row.year}</td>
                          <td className="text-right">{formatRand(row.deduction, 0)}</td>
                          <td className="text-right" style={{ color: C.emerald }}>{formatRand(row.taxSaving, 0)}</td>
                          <td className="text-right font-semibold" style={{ color: 'var(--color-text)' }}>{formatRand(row.cumulativeSaving, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              Section 13sex requires at least {S13SEX_MIN_UNITS} new-and-unused residential units owned by the same
              taxpayer, all used to produce rental income; the allowance applies to building cost excluding land.
              Rental losses may be ring-fenced under s20A. Based on {yearLabel} SARS tables. Not tax advice —
              confirm with a registered tax practitioner.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
