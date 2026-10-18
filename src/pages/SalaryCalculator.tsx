import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Briefcase, TrendingDown, Info, Plus, Trash2 } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { TaxYearSelect } from '../components/ui/TaxYearSelect';
import { formatRand, formatRandShort } from '../utils/format';
import { calcPAYE, type PAYEInputs } from '../utils/tax';
import { TAX_YEAR_OPTIONS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';
import type { AgeGroup } from '../types';
import { textTone } from '../utils/color';

type AgeGroupLocal = AgeGroup;

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
  teal:    'var(--note-teal)',
  brown:  'var(--note-brown)',
};

const TOOLTIP_STYLE = {
  background:   'color-mix(in srgb, var(--paper-raised) 95%, transparent)',
  border:       '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
  borderRadius: 10,
  fontSize:     12,
  color:        'var(--ink)',
};

const AGE_GROUPS: { value: AgeGroupLocal; label: string }[] = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74',  label: '65 – 74' },
  { value: '75plus',  label: '75+' },
];

// -1 = not on medical aid (no credit); 0 = main member only; 1+ = main + dependants
const MED_OPTIONS: { value: number; label: string }[] = [
  { value: -1, label: 'None' },
  { value: 0,  label: 'Solo' },
  { value: 1,  label: '+1' },
  { value: 2,  label: '+2' },
  { value: 3,  label: '+3' },
  { value: 4,  label: '+4' },
];

interface IncomeStream {
  id: number;
  label: string;
  amount: number;
}

export function SalaryCalculator() {
  const [incomes, setIncomes]           = useState<IncomeStream[]>([{ id: 1, label: 'Primary Income', amount: 45_000 }]);
  const [ageGroup, setAgeGroup]         = useState<AgeGroupLocal>('under65');
  const [raContrib, setRaContrib]       = useState(2_000);
  const [medDependants, setMedDependants] = useState(0);
  const [showAnnual, setShowAnnual]     = useState(false);
  const [taxYear, setTaxYear]           = useState<TaxYearId>(DEFAULT_TAX_YEAR);

  const grossMonthly = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);

  const result = useMemo(
    () => calcPAYE({
      grossMonthly,
      ageGroup,
      raMonthlyContrib: raContrib,
      medAidDependants: medDependants,
    } satisfies PAYEInputs, taxYear),
    [grossMonthly, ageGroup, raContrib, medDependants, taxYear]
  );

  const mult  = showAnnual ? 12 : 1;
  const label = showAnnual ? 'Annual' : 'Monthly';

  const addIncome = () => {
    if (incomes.length >= 3) return;
    const id = Math.max(...incomes.map((i) => i.id)) + 1;
    setIncomes([...incomes, { id, label: `Income ${id}`, amount: 0 }]);
  };

  const removeIncome = (id: number) => {
    if (incomes.length <= 1) return;
    setIncomes(incomes.filter((i) => i.id !== id));
  };

  const updateIncome = (id: number, field: 'label' | 'amount', val: string) => {
    setIncomes(incomes.map((i) =>
      i.id === id ? { ...i, [field]: field === 'amount' ? parseFloat(val) || 0 : val } : i
    ));
  };

  // Pie chart: deductions breakdown
  const pieData = [
    { name: 'Net Pay',    value: result.monthlyNet   * mult, color: C.green },
    { name: 'PAYE',       value: result.monthlyPAYE  * mult, color: C.red     },
    { name: 'UIF',        value: result.monthlyUIF   * mult, color: C.orange   },
    { name: 'RA Contrib', value: result.monthlyRA    * mult, color: C.blue  },
  ].filter((d) => d.value > 0);

  // Bar chart: gross vs net at different salary levels
  const barData = useMemo(() => {
    const salaries = [15_000, 25_000, 35_000, 45_000, 60_000, 80_000, 100_000, 150_000];
    return salaries.map((g) => {
      const r = calcPAYE({ grossMonthly: g, ageGroup, raMonthlyContrib: raContrib, medAidDependants: medDependants }, taxYear);
      return {
        salary: formatRandShort(g),
        gross:  g,
        net:    Math.round(r.monthlyNet),
        paye:   Math.round(r.monthlyPAYE),
      };
    });
  }, [ageGroup, raContrib, medDependants, taxYear]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)' }}>
            <Briefcase size={20} className="text-note-blue-ink" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Salary / Take-Home Calculator
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              SA PAYE, UIF & medical aid tax credit — {TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label} tax year
            </p>
          </div>
          <button
            onClick={() => setShowAnnual((v) => !v)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', color: textTone(C.blue), border: `1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)` }}>
            {showAnnual ? 'Show Monthly' : 'Show Annual'}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Your Details
          </p>

          {/* Income streams */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
                Income Sources
              </p>
              {incomes.length < 3 && (
                <button onClick={addIncome}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold"
                  style={{ background: 'color-mix(in srgb, var(--note-blue) 10%, transparent)', color: textTone(C.blue), border: '1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)' }}>
                  <Plus size={11} /> Add Income
                </button>
              )}
            </div>

            {incomes.map((inc, idx) => (
              <div key={inc.id} className="rounded-xl p-3 space-y-2"
                style={{ background: 'color-mix(in srgb, var(--ink) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 7%, transparent)' }}>
                <div className="flex items-center justify-between">
                  <input
                    value={inc.label}
                    onChange={(e) => updateIncome(inc.id, 'label', e.target.value)}
                    className="text-xs font-semibold bg-transparent border-0 outline-none"
                    style={{ color: textTone([C.blue, C.green, C.orange][idx % 3]) }}
                  />
                  {incomes.length > 1 && (
                    <button onClick={() => removeIncome(inc.id)}
                      className="p-0.5 rounded" style={{ color: textTone(C.red) }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <InputField id={`income-${inc.id}`} label="Gross Monthly Amount" value={inc.amount}
                  onChange={(v) => updateIncome(inc.id, 'amount', v)} prefix="R" />
              </div>
            ))}

            {incomes.length > 1 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: 'color-mix(in srgb, var(--note-blue) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 15%, transparent)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--ink-muted)' }}>Total Gross Monthly</span>
                <span className="text-sm font-bold" style={{ color: textTone(C.blue) }}>{formatRand(grossMonthly, 0)}</span>
              </div>
            )}
          </div>

          <TaxYearSelect id="salary-taxyear" value={taxYear} onChange={setTaxYear} />

          {/* Age group */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>Age Group</label>
            <div className="flex gap-2">
              {AGE_GROUPS.map((ag) => (
                <button key={ag.value}
                  onClick={() => setAgeGroup(ag.value)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: ageGroup === ag.value ? 'color-mix(in srgb, var(--note-blue) 18%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                    color: textTone(ageGroup === ag.value ? C.blue : 'var(--ink-muted)'),
                    border: `1px solid ${ageGroup === ag.value ? 'color-mix(in srgb, var(--note-blue) 35%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                  }}>
                  {ag.label}
                </button>
              ))}
            </div>
          </div>

          <InputField id="ra" label="Monthly RA Contribution" value={raContrib}
            onChange={(v) => setRaContrib(parseFloat(v) || 0)} prefix="R"
            help={taxYear === '2027'
              ? 'Tax-deductible up to 27.5% of income (max R430K/yr)'
              : 'Tax-deductible up to 27.5% of income (max R350K/yr)'} />

          {/* Medical aid dependants */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              Medical Aid
            </label>
            <div className="flex gap-2 flex-wrap">
              {MED_OPTIONS.map((opt) => (
                <button key={opt.value}
                  onClick={() => setMedDependants(opt.value)}
                  className="flex-1 min-w-[48px] py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: medDependants === opt.value ? 'color-mix(in srgb, var(--gain) 15%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                    color: textTone(medDependants === opt.value ? C.green : 'var(--ink-muted)'),
                    border: `1px solid ${medDependants === opt.value ? 'color-mix(in srgb, var(--gain) 30%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px]" style={{ color: 'var(--ink-subtle)' }}>
              {medDependants < 0
                ? 'No medical aid — no tax credit applied.'
                : `Medical credit: R364/mo main + R364/mo 1st dep + R246/mo each extra`}
            </p>
          </div>
        </motion.div>

        {/* KPI panel */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="space-y-3">
          {/* Main hero */}
          <div className="glass-card p-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--ink-muted)' }}>
              {label} Take-Home Pay
            </p>
            <p className="text-4xl font-extrabold mb-1"
              style={{ color: textTone(C.green), fontFamily: 'var(--font-display)' }}>
              {formatRand(result.monthlyNet * mult, 0)}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-subtle)' }}>
              Effective tax rate: <span style={{ color: textTone(C.orange) }}>{result.effectiveRate.toFixed(1)}%</span>
              &ensp;|&ensp;Marginal rate: <span style={{ color: textTone(C.red) }}>{result.marginalRate.toFixed(0)}%</span>
            </p>
          </div>

          {/* Deductions grid */}
          {[
            { label: 'Gross Salary',       value: grossMonthly * mult,        color: 'var(--ink)' },
            { label: 'PAYE Income Tax',    value: result.monthlyPAYE  * mult, color: C.red },
            { label: 'UIF (employee 1%)', value: result.monthlyUIF   * mult, color: C.orange },
            { label: 'RA Contribution',   value: result.monthlyRA    * mult, color: C.blue },
            ...(medDependants >= 0 ? [{ label: 'Medical Aid Credit', value: -(result.medCreditMonthly * mult), color: C.teal, note: 'tax credit' }] : []),
            { label: 'Net Take-Home',      value: result.monthlyNet   * mult, color: C.green, bold: true },
          ].map((row) => (
            <div key={row.label}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--ink) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 6%, transparent)' }}>
              <span className="text-xs" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
                {row.label}
                {'note' in row && row.note && <span className="ml-1 text-[10px]" style={{ color: 'var(--ink-subtle)' }}>({row.note})</span>}
              </span>
              <span className="text-sm font-bold" style={{ color: textTone(row.color) }}>
                {row.value < 0 ? '-' : ''}{formatRand(Math.abs(row.value), 0)}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Pie chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Where Your {label} Salary Goes
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ResponsiveContainer width={220} height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                paddingAngle={2} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2 w-full">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                <span className="flex-1 text-sm" style={{ color: 'var(--ink-muted)' }}>{d.name}</span>
                <span className="text-sm font-semibold" style={{ color: textTone(d.color) }}>
                  {formatRand(d.value, 0)}
                </span>
                <span className="text-xs w-10 text-right" style={{ color: 'var(--ink-subtle)' }}>
                  {grossMonthly * mult > 0 ? ((d.value / (grossMonthly * mult)) * 100).toFixed(1) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tax detail box */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card-static p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} style={{ color: textTone(C.orange) }} />
          <p className="text-sm font-semibold"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Tax Calculation Detail
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Taxable Income',   value: formatRand(result.taxableIncome / 12 * mult, 0), color: 'var(--ink)' },
            { label: 'Gross Tax',        value: formatRand(result.grossTaxBefore / 12 * mult, 0), color: C.red },
            { label: 'Rebates',          value: `-${formatRand(result.rebateAmount / 12 * mult, 0)}`, color: C.green },
            { label: 'Med Aid Credit',   value: medDependants >= 0 ? `-${formatRand(result.medCreditAnnual / 12 * mult, 0)}` : 'None', color: medDependants >= 0 ? C.teal : 'var(--ink-subtle)' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-3"
              style={{ background: 'color-mix(in srgb, var(--ink) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 6%, transparent)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--ink-subtle)' }}>{item.label}</p>
              <p className="text-sm font-bold" style={{ color: textTone(item.color) }}>{item.value}</p>
            </div>
          ))}
        </div>
        {raContrib > 0 && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--note-blue) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 15%, transparent)' }}>
            <TrendingDown size={14} style={{ color: textTone(C.blue), flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              Your RA contribution of <strong style={{ color: textTone(C.blue) }}>{formatRand(raContrib, 0)}/mo</strong> reduces
              taxable income by <strong style={{ color: textTone(C.blue) }}>{formatRand(result.raDeduction, 0)}/yr</strong>,
              saving roughly <strong style={{ color: textTone(C.green) }}>{formatRand((result.grossTaxBefore - (result.grossTaxBefore - result.raDeduction * result.marginalRate / 100)) / 12, 0)}/mo</strong> in PAYE.
            </p>
          </div>
        )}
      </motion.div>

      {/* Salary comparison bar chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Gross vs Net Across Salary Levels
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
          How much PAYE takes at different gross salaries (using your current RA & medical settings)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
            <XAxis dataKey="salary" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="net"  name="Net Pay"  stackId="a" fill={C.green} radius={[0, 0, 0, 0]} />
            <Bar dataKey="paye" name="PAYE"     stackId="a" fill={C.red}     radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--ink-subtle)' }}>
        SARS {TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label} tax year. Does not include employer UIF, SDL, or pension fund contributions. Not tax advice.
      </p>
    </div>
  );
}
