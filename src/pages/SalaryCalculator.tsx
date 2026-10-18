import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { TaxYearSelect } from '../components/ui/TaxYearSelect';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';
import { Statement } from '../components/statement/Statement';
import type { StatementData, StatementLine } from '../components/statement/statementText';
import { calcPAYE, type PAYEInputs } from '../utils/tax';
import { TAX_YEAR_OPTIONS, DEFAULT_TAX_YEAR, TAX_YEARS, type TaxYearId } from '../config/taxYears';
import type { AgeGroup } from '../types';
import { textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, positiveError } from '../utils/validation';

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

  // PAYE saved by the annuity: the same pay worked out without it
  const raTaxSaving = useMemo(
    () => raContrib > 0
      ? calcPAYE({ grossMonthly, ageGroup, raMonthlyContrib: 0, medAidDependants: medDependants }, taxYear).monthlyPAYE - result.monthlyPAYE
      : 0,
    [grossMonthly, ageGroup, raContrib, medDependants, taxYear, result.monthlyPAYE],
  );

  const incomeErrors = incomes.map((i) => nonNegativeError(i.amount));
  const raError = nonNegativeError(raContrib);
  const blocked = incomeErrors.find(Boolean) ?? raError ?? positiveError(grossMonthly, 'Enter your monthly pay before tax.');

  const mult  = showAnnual ? 12 : 1;
  const label = showAnnual ? 'Annual' : 'Monthly';

  // Payslip of the same figures, monthly or annual to match the toggle
  const payslip: StatementData = {
    title: `${label} payslip`,
    subtitle: `${TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label} tax year, ${AGE_GROUPS.find((a) => a.value === ageGroup)?.label.toLowerCase()}`,
    sections: [
      {
        heading: 'Earnings',
        lines: incomes.map((i) => ({ label: i.label || 'Income', value: i.amount * mult })),
        subtotal: { label: 'Gross pay', value: grossMonthly * mult },
      },
      {
        heading: 'Deductions',
        lines: ([
          { label: 'PAYE', value: result.monthlyPAYE * mult, kind: 'less', note: 'After the age rebate and medical aid credit' },
          { label: 'UIF', value: result.monthlyUIF * mult, kind: 'less' },
          raContrib > 0 ? { label: 'Retirement annuity', value: raContrib * mult, kind: 'less' } : null,
        ] as (StatementLine | null)[]).filter((l): l is StatementLine => l !== null),
        subtotal: { label: 'Total deductions', value: (result.monthlyPAYE + result.monthlyUIF + raContrib) * mult, kind: 'less' },
      },
    ],
    total: { label: 'Net pay', value: result.monthlyNet * mult },
    after: [
      {
        heading: 'How the tax is worked out (per year)',
        lines: ([
          { label: 'Taxable income', value: result.taxableIncome, note: result.raDeduction > 0 ? `After ${formatRand(result.raDeduction, 0)} retirement deduction` : undefined },
          { label: 'Tax before rebates', value: result.grossTaxBefore },
          { label: 'Age rebate', value: result.rebateAmount, kind: 'less' },
          result.medCreditAnnual > 0 ? { label: 'Medical aid credit', value: result.medCreditAnnual, kind: 'less' } : null,
          { label: 'Marginal rate', display: formatPercent(result.marginalRate, 0) },
          { label: 'Effective rate', display: formatPercent(result.effectiveRate, 1) },
        ] as (StatementLine | null)[]).filter((l): l is StatementLine => l !== null),
      },
    ],
    footnote: "Estimate only. Your employer's payroll may differ slightly because of rounding and other deductions.",
  };

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
                <InputField id={`income-${inc.id}`} label="Gross Monthly Amount" value={inc.amount} error={incomeErrors[idx]}
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

          <InputField id="ra" label="Monthly RA Contribution" value={raContrib} error={raError}
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
                : `Medical credit: R${TAX_YEARS[taxYear].medCredits.main}/mo main + R${TAX_YEARS[taxYear].medCredits.firstDep}/mo 1st dep + R${TAX_YEARS[taxYear].medCredits.extraDep}/mo each extra`}
            </p>
          </div>
        </motion.div>

        <ResultPanel
          className="self-start"
          label={`${label} take-home pay`}
          value={formatRand(result.monthlyNet * mult, 0)}
          blocked={blocked}
          summary={<>
            From {formatRand(grossMonthly * mult, 0)} before tax, PAYE takes {formatRand(result.monthlyPAYE * mult, 0)} and
            UIF {formatRand(result.monthlyUIF * mult, 0)}{raContrib > 0 ? `, and ${formatRand(raContrib * mult, 0)} goes to your retirement annuity` : ''}.
            {raTaxSaving > 0 && ` The annuity cuts your PAYE by about ${formatRand(raTaxSaving * mult, 0)}.`}
          </>}
          figures={[
            { label: `${label} PAYE`, value: formatRand(result.monthlyPAYE * mult, 0) },
            { label: 'Effective tax rate', value: formatPercent(result.effectiveRate, 1) },
            { label: 'Tax on your next rand', value: formatPercent(result.marginalRate, 0) },
            { label: 'Medical aid credit', value: medDependants >= 0 ? formatRand(result.medCreditMonthly * mult, 0) : 'None' },
          ]}
        />
      </div>

      {/* Payslip */}
      <Statement data={payslip} />

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

      <AssumptionsDrawer
        items={[
          <>Tax uses the SARS tables for the {TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label} tax year, with the rebate for your age group{medDependants >= 0 ? ' and the medical aid tax credit' : ''}.</>,
          <>PAYE is worked out on a full year’s pay and divided by 12. Your employer’s payroll may differ by a few rand because of rounding.</>,
          <>UIF is {formatPercent(TAX_YEARS[taxYear].uif.rate * 100, 0)} of your pay, up to {formatRand(TAX_YEARS[taxYear].uif.capMonthly, 2)} a month.</>,
          <>Retirement annuity contributions are deducted up to 27.5% of your income, capped at {formatRand(TAX_YEARS[taxYear].retirement.cap, 0)} a year.</>,
          <>Not included: employer UIF and SDL, pension or provident fund contributions through work, fringe benefits and bonuses.</>,
        ]}
      />
    </div>
  );
}
