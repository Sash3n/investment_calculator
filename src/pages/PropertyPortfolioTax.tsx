import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  Building2, Plus, Trash2, ChevronDown, ChevronUp,
  Receipt, Wallet, CloudDownload,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { SectionHeader } from '../components/ui/SectionHeader';
import { TaxYearSelect } from '../components/ui/TaxYearSelect';
import { EmptyState } from '../components/ui/EmptyState';
import { formatRand, formatRandShort } from '../utils/format';
import { calcPortfolioTax, S13SEX_MIN_UNITS } from '../utils/portfolioTax';
import { calcPropertyROI } from '../utils/roi';
import { TAX_YEAR_OPTIONS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';
import { useAuth } from '../context/useAuth';
import { useSavedProperties } from '../hooks/useFirestore';
import type { AgeGroup, PortfolioRentalProperty } from '../types';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, rangeError } from '../utils/validation';

const C = {
  blue: 'var(--note-blue)', orange: 'var(--note-orange)', green: 'var(--gain)',
  red: 'var(--loss)', teal: 'var(--note-teal)', brown: 'var(--note-brown)',
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
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: 'var(--ink-muted)' }}>{p.name}: {formatRand(p.value, 0)}</p>
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
  const unitsShort = Math.max(0, S13SEX_MIN_UNITS - result.s13QualifyingUnits);

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
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Property Portfolio Tax
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
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
            <InputField label="Other Annual Taxable Income" id="ppt-other" value={otherIncome} error={nonNegativeError(otherIncome)}
              onChange={(v) => setOtherIncome(parseFloat(v) || 0)} prefix="R" help="Salary and other income before rentals" />
            <SelectField label="Age Group" id="ppt-age" value={ageGroup}
              onChange={(v) => setAgeGroup(v as AgeGroup)} options={AGE_OPTIONS} />
            <InputField label="Monthly RA Contribution" id="ppt-ra" value={raMonthly} error={nonNegativeError(raMonthly)}
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
                    style={{ background: 'color-mix(in srgb, var(--note-teal) 12%, transparent)', color: textTone(C.teal), border: `1px solid ${alpha(C.teal, 27)}` }}>
                    <CloudDownload size={13} /> Import
                  </button>
                )}
                <button onClick={addProperty}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', color: textTone(C.blue), border: `1px solid ${alpha(C.blue, 27)}` }}>
                  <Plus size={13} /> Add
                </button>
              </div>
            </div>

            {showImport && (
              <div className="p-3 rounded-xl space-y-2" style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--ink-muted)' }}>From your saved portfolio:</p>
                {savedProperties.map((sp) => (
                  <button key={sp.id} onClick={() => importSaved(sp.name, sp.inputs)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-note-blue/8"
                    style={{ color: 'var(--ink)', border: '1px solid var(--rule)' }}>
                    {sp.name} <span className="text-xs" style={{ color: 'var(--ink-subtle)' }}>
                      · {formatRandShort(sp.inputs.purchasePrice)} · rent {formatRandShort(sp.inputs.rentScenario1)}/mo
                    </span>
                  </button>
                ))}
                <p className="text-[10px]" style={{ color: 'var(--ink-subtle)' }}>
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
                <div key={p.id} className="rounded-xl" style={{ border: '1px solid var(--rule)', background: 'var(--paper-raised)' }}>
                  <button onClick={() => setExpanded(open ? null : p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3">
                    <Building2 size={15} style={{ color: textTone(p.isNewUnused ? C.green : 'var(--ink-subtle)') }} />
                    <span className="flex-1 text-left text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{p.name}</span>
                    {res && (
                      <span className="text-xs font-semibold" style={{ color: textTone(res.netProfit >= 0 ? C.green : C.red) }}>
                        {res.netProfit >= 0 ? '+' : ''}{formatRandShort(res.netProfit)}/yr
                      </span>
                    )}
                    {open ? <ChevronUp size={14} style={{ color: 'var(--ink-subtle)' }} /> : <ChevronDown size={14} style={{ color: 'var(--ink-subtle)' }} />}
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3">
                      <InputField label="Name" id={`${p.id}-name`} type="text" value={p.name}
                        onChange={(v) => update(p.id, { name: v })} />
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Monthly Rent" id={`${p.id}-rent`} value={p.monthlyRent} error={nonNegativeError(p.monthlyRent)}
                          onChange={(v) => update(p.id, { monthlyRent: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Vacancy" id={`${p.id}-vac`} value={p.vacancyRate} error={rangeError(p.vacancyRate, 0, 100, 'a vacancy', '%')}
                          onChange={(v) => update(p.id, { vacancyRate: parseFloat(v) || 0 })} suffix="%" />
                        <InputField label="Bond Interest (annual)" id={`${p.id}-int`} value={p.annualBondInterest} error={nonNegativeError(p.annualBondInterest)}
                          onChange={(v) => update(p.id, { annualBondInterest: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Rates (annual)" id={`${p.id}-rates`} value={p.annualRates} error={nonNegativeError(p.annualRates)}
                          onChange={(v) => update(p.id, { annualRates: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Levies (annual)" id={`${p.id}-lev`} value={p.annualLevies} error={nonNegativeError(p.annualLevies)}
                          onChange={(v) => update(p.id, { annualLevies: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Insurance (annual)" id={`${p.id}-ins`} value={p.annualInsurance} error={nonNegativeError(p.annualInsurance)}
                          onChange={(v) => update(p.id, { annualInsurance: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Repairs (annual)" id={`${p.id}-rep`} value={p.annualRepairs} error={nonNegativeError(p.annualRepairs)}
                          onChange={(v) => update(p.id, { annualRepairs: parseFloat(v) || 0 })} prefix="R" />
                        <InputField label="Mgmt Fee" id={`${p.id}-mgmt`} value={p.managementFeePercent} error={rangeError(p.managementFeePercent, 0, 50, 'a fee', '%')}
                          onChange={(v) => update(p.id, { managementFeePercent: parseFloat(v) || 0 })} suffix="%" />
                      </div>
                      <InputField label="Other Deductions (annual)" id={`${p.id}-oth`} value={p.otherAnnualDeductions} error={nonNegativeError(p.otherAnnualDeductions)}
                        onChange={(v) => update(p.id, { otherAnnualDeductions: parseFloat(v) || 0 })} prefix="R"
                        help="Advertising, accounting, garden services, etc." />
                      <div className="pt-1 space-y-2" style={{ borderTop: '1px dashed var(--rule)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: 'var(--ink-subtle)' }}>
                          Section 13sex qualification
                        </p>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id={`${p.id}-new`} checked={p.isNewUnused}
                            onChange={(e) => update(p.id, { isNewUnused: e.target.checked })}
                            className="w-4 h-4 accent-gain" />
                          <label htmlFor={`${p.id}-new`} className="text-xs cursor-pointer" style={{ color: 'var(--ink-muted)' }}>
                            Bought new and unused (required for 13sex)
                          </label>
                        </div>
                        {p.isNewUnused && (
                          <>
                            <InputField label="Building Cost (excl. land)" id={`${p.id}-cost`} value={p.purchasePrice} error={nonNegativeError(p.purchasePrice)}
                              onChange={(v) => update(p.id, { purchasePrice: parseFloat(v) || 0 })} prefix="R" />
                            <div className="flex items-center gap-3">
                              <input type="checkbox" id={`${p.id}-low`} checked={p.isLowCostHousing}
                                onChange={(e) => update(p.id, { isLowCostHousing: e.target.checked })}
                                className="w-4 h-4 accent-gain" />
                              <label htmlFor={`${p.id}-low`} className="text-xs cursor-pointer" style={{ color: 'var(--ink-muted)' }}>
                                Low-cost housing (10% over 10 years)
                              </label>
                            </div>
                          </>
                        )}
                      </div>
                      <button onClick={() => removeProperty(p.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'color-mix(in srgb, var(--loss) 8%, transparent)', color: textTone(C.red), border: '1px solid color-mix(in srgb, var(--loss) 20%, transparent)' }}>
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
          <ResultPanel
            label="Rental cash flow after tax"
            value={`${formatRand(result.afterTaxMonthlyCashFlow, 0)} a month`}
            tone={result.afterTaxMonthlyCashFlow >= 0 ? 'gain' : 'loss'}
            summary={<>
              {result.netRentalIncome >= 0
                ? `Across ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} you make ${formatRand(result.netRentalIncome, 0)} a year after deductions, which adds ${formatRand(result.taxAttributableToRental, 0)} to your tax.`
                : `Across ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} you make a loss of ${formatRand(-result.netRentalIncome, 0)} a year, which cuts the tax on your other income by ${formatRand(-result.taxAttributableToRental, 0)}.`}
              {' '}{result.s13Qualifies
                ? `With ${result.s13QualifyingUnits} new units you also qualify for Section 13sex: ${formatRand(result.s13?.annualDeduction ?? 0, 0)} a year off your taxable income, saving about ${formatRand(result.s13AnnualTaxSaving, 0)} in the first year.`
                : `${result.s13QualifyingUnits} of ${S13SEX_MIN_UNITS} units are new and unused; ${unitsShort} more would unlock the Section 13sex allowance.`}
            </>}
            figures={[
              { label: 'Net rental income a year', value: formatRand(result.netRentalIncome, 0) },
              { label: result.taxAttributableToRental >= 0 ? 'Extra tax' : 'Tax saved', value: formatRand(Math.abs(result.taxAttributableToRental), 0) },
              { label: 'Section 13sex units', value: `${result.s13QualifyingUnits} of ${S13SEX_MIN_UNITS}` },
              { label: 'Tax on your next rand', value: `${result.marginalRate.toFixed(0)}%` },
            ]}
          />

          {/* Per-property profit chart */}
          {barData.length > 0 && (
            <div className="glass-card p-5">
              <SectionHeader title="Net Profit per Property" icon={Building2} />
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => formatRandShort(Number(v))} />
                    <Tooltip content={<RandTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--note-blue) 6%, transparent)' }} />
                    <Bar dataKey="profit" name="Net profit" radius={[4, 4, 0, 0]}>
                      {barData.map((d, i) => (
                        <Cell key={i} fill={d.profit >= 0 ? C.green : C.red} />
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
                <div className="p-4 rounded-xl" style={{ background: 'color-mix(in srgb, var(--loss) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--loss) 20%, transparent)' }}>
                  <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Standard treatment</p>
                  <p className="text-xl font-bold" style={{ color: textTone(C.red) }}>
                    {formatRand(result.taxAttributableToRental + result.taxOnOtherIncomeOnly, 0)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-subtle)' }}>total tax, year 1</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'color-mix(in srgb, var(--gain) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 20%, transparent)' }}>
                  <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>With Section 13sex{raMonthly > 0 ? ' + RA' : ''}</p>
                  <p className="text-xl font-bold" style={{ color: textTone(C.green) }}>
                    {formatRand(Math.max(0, result.taxAttributableToRental + result.taxOnOtherIncomeOnly - (raMonthly > 0 ? result.s13.combinedAnnualTaxSaving : result.s13.annualTaxSaving)), 0)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-subtle)' }}>
                    saves {formatRand(raMonthly > 0 ? result.s13.combinedAnnualTaxSaving : result.s13.annualTaxSaving, 0)}/yr
                  </p>
                </div>
              </div>

              <button onClick={() => setShowSchedule((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: textTone(C.blue) }}>
                {showSchedule ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showSchedule ? 'Hide' : 'Show'} year-by-year schedule
              </button>
              {showSchedule && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ color: 'var(--ink-muted)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                        <th className="text-left py-2">Year</th>
                        <th className="text-right py-2">Deduction</th>
                        <th className="text-right py-2">Tax Saving</th>
                        <th className="text-right py-2">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.s13.schedule.map((row) => (
                        <tr key={row.year} style={{ borderBottom: '1px dashed var(--rule)' }}>
                          <td className="py-1.5">{row.year}</td>
                          <td className="text-right">{formatRand(row.deduction, 0)}</td>
                          <td className="text-right" style={{ color: textTone(C.green) }}>{formatRand(row.taxSaving, 0)}</td>
                          <td className="text-right font-semibold" style={{ color: 'var(--ink)' }}>{formatRand(row.cumulativeSaving, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <AssumptionsDrawer
            items={[
              <>Each property’s rent, less vacancy, is reduced by bond interest, rates, levies, insurance, repairs, the agent’s fee and other deductions. Repaying the bond’s capital is not deductible.</>,
              <>The combined profit or loss is added to {formatRand(otherIncome, 0)} of other income and taxed with the SARS tables for {yearLabel}. A loss reduces the tax on your other income; ring-fencing under section 20A is not modelled.</>,
              <>Section 13sex needs at least {S13SEX_MIN_UNITS} new-and-unused residential units owned by the same taxpayer and let out. It allows 5% of the building cost (excluding land) a year for 20 years, or 10% for 10 years for low-cost housing.</>,
              <>Imported properties estimate the first year’s bond interest as 80% of the repayment. Enter your actual interest certificate figure if you have it.</>,
              <>This is an estimate, not tax advice. Confirm with a registered tax practitioner.</>,
            ]}
          />
        </div>
      </div>
    </div>
  );
}
