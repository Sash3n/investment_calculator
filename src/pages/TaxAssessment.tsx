import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  FileText, Wallet, HeartPulse, Receipt, Info,
  CheckCircle2, AlertCircle, TrendingUp, Search, Plus, Trash2, ArrowDown, BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SaveLoadBar } from '../components/ui/SaveLoadBar';
import { TaxYearSelect } from '../components/ui/TaxYearSelect';
import { formatRand } from '../utils/format';
import { calcTaxAssessment } from '../utils/taxAssessment';
import { TAX_YEAR_OPTIONS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';
import {
  SARS_CODE_BY_CODE, searchSarsCodes, sumCodeRows, type CodeRow,
} from '../data/sarsCodes';
import type { TaxAssessmentInputs, AgeGroup } from '../types';

const C = {
  indigo: '#6366F1', amber: '#F59E0B', emerald: '#10B981',
  red: '#EF4444', cyan: '#06B6D4', violet: '#8B5CF6', pink: '#EC4899',
};
const PIE_COLORS = [C.indigo, C.emerald, C.amber, C.cyan, C.violet, C.pink];

const AGE_OPTIONS = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74',  label: '65 – 74 years' },
  { value: '75plus',  label: '75 years and older' },
];

const MED_DEP_OPTIONS = [
  { value: -1, label: 'No medical aid' },
  { value: 0,  label: 'Main member only' },
  { value: 1,  label: 'Main + 1 dependant' },
  { value: 2,  label: 'Main + 2 dependants' },
  { value: 3,  label: 'Main + 3 dependants' },
  { value: 4,  label: 'Main + 4 dependants' },
  { value: 5,  label: 'Main + 5 dependants' },
];

const TRAVEL_OPTIONS = [
  { value: 0.8, label: '80% taxable (standard)' },
  { value: 0.2, label: '20% taxable (mostly business use)' },
];

const DEFAULT_INPUTS: TaxAssessmentInputs = {
  ageGroup: 'under65',
  annualSalary: 480_000,
  travelAllowance: 0,
  travelInclusionRate: 0.8,
  otherIncome: 0,
  netRentalIncome: 0,
  interestIncome: 0,
  localDividends: 0,
  capitalGain: 0,
  raContributions: 0,
  donations: 0,
  medAidDependants: -1,
  medAidContributions: 0,
  medicalOutOfPocket: 0,
  hasDisability: false,
  payeWithheld: 0,
  provisionalPaid: 0,
};

interface SavedState { inputs: TaxAssessmentInputs; taxYear: TaxYearId; codeRows?: CodeRow[] }

const FIELD_LABELS: Record<string, string> = {
  annualSalary:        'Employment income',
  travelAllowance:     'Travel allowance',
  otherIncome:         'Other income',
  raContributions:     'Retirement contributions',
  medAidContributions: 'Medical contributions',
  donations:           'Donations',
  payeWithheld:        'PAYE withheld',
  interestIncome:      'Local interest',
};

function RandTooltip({ active, payload }: { active?: boolean; payload?: { value: number; name: string; payload?: { fill?: string } }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ minWidth: 150 }}>
      {payload.map((p, i) => (
        <p key={i} style={{ color: 'var(--color-text)' }}>{p.name}: {formatRand(p.value, 0)}</p>
      ))}
    </div>
  );
}

function BreakdownRow({ label, value, bold, color, negative }: {
  label: string; value: number; bold?: boolean; color?: string; negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm" style={{
      borderBottom: bold ? 'none' : '1px dashed var(--color-border)',
    }}>
      <span style={{ color: color ?? 'var(--color-text-muted)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ color: color ?? (bold ? 'var(--color-text)' : 'var(--color-text-muted)'), fontWeight: bold ? 700 : 500 }}>
        {negative && value > 0 ? '− ' : ''}{formatRand(Math.abs(value), 0)}
      </span>
    </div>
  );
}

/** TaxTim-style "enter your IRP5 by source code" panel. */
function Irp5CodePanel({ rows, setRows, onApply }: {
  rows: CodeRow[];
  setRows: (rows: CodeRow[]) => void;
  onApply: () => void;
}) {
  const [query, setQuery]           = useState('');
  const [pickedCode, setPickedCode] = useState<string | null>(null);
  const [amount, setAmount]         = useState(0);

  const matches = useMemo(() => (query.trim() ? searchSarsCodes(query, 6) : []), [query]);
  const picked  = pickedCode ? SARS_CODE_BY_CODE[pickedCode] : null;
  const sums    = useMemo(() => sumCodeRows(rows), [rows]);
  const sumEntries = Object.entries(sums) as [string, number][];
  const infoRows = rows.filter((r) => !SARS_CODE_BY_CODE[r.code]?.mapsTo);

  const addRow = () => {
    if (!pickedCode || amount <= 0) return;
    setRows([...rows, { code: pickedCode, amount }]);
    setPickedCode(null);
    setQuery('');
    setAmount(0);
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SectionHeader title="Fill From Your IRP5 / IT3 Codes" icon={FileText} />
        <Link to="/sars-codes" className="text-xs underline flex items-center gap-1" style={{ color: C.cyan }}>
          <BookOpen size={12} /> What do the codes mean?
        </Link>
      </div>
      <p className="text-xs -mt-2" style={{ color: 'var(--color-text-muted)' }}>
        Enter amounts exactly as they appear next to each source code on your tax certificates,
        then apply them to the form below.
      </p>

      {/* Code picker */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_auto] gap-3 items-end">
        <div className="relative">
          <label htmlFor="irp5-search" className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            Source code
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-subtle)' }} />
            <input
              id="irp5-search"
              type="text"
              value={picked ? `${picked.code} — ${picked.label}` : query}
              onChange={(e) => { setPickedCode(null); setQuery(e.target.value); }}
              placeholder="Type a code (3601) or name (bonus, PAYE)…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              autoComplete="off"
            />
          </div>
          {!picked && matches.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl overflow-hidden shadow-xl"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              {matches.map((m) => (
                <button key={m.code} onClick={() => { setPickedCode(m.code); setQuery(''); }}
                  className="w-full text-left px-3 py-2 text-sm transition-all hover:bg-[rgba(99,102,241,0.10)] flex items-center gap-2">
                  <span className="font-mono text-xs font-bold" style={{ color: C.indigo }}>{m.code}</span>
                  <span className="flex-1 truncate" style={{ color: 'var(--color-text)' }}>{m.label}</span>
                  {!m.mapsTo && <span className="text-[9px] uppercase" style={{ color: C.amber }}>info</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <InputField label="Amount" id="irp5-amount" value={amount}
          onChange={(v) => setAmount(parseFloat(v) || 0)} prefix="R" />
        <button onClick={addRow} disabled={!pickedCode || amount <= 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid ${C.indigo}44` }}>
          <Plus size={14} /> Add
        </button>
      </div>
      {picked && (
        <p className="text-[11px] -mt-1" style={{ color: picked.mapsTo ? 'var(--color-text-subtle)' : C.amber }}>
          {picked.description}
        </p>
      )}

      {/* Entered rows */}
      {rows.length > 0 && (
        <div className="space-y-1.5">
          {rows.map((r, i) => {
            const meta = SARS_CODE_BY_CODE[r.code];
            return (
              <div key={`${r.code}-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <span className="font-mono text-xs font-bold" style={{ color: C.indigo }}>{r.code}</span>
                <span className="flex-1 truncate" style={{ color: 'var(--color-text)' }}>{meta?.label ?? 'Unknown code'}</span>
                {meta && !meta.mapsTo && (
                  <span className="text-[9px] uppercase font-bold" style={{ color: C.amber }}>not counted</span>
                )}
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{formatRand(r.amount, 0)}</span>
                <button aria-label={`Remove ${r.code}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="p-1 rounded-lg" style={{ color: C.red }}>
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Informational codes note */}
      {infoRows.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} />
          <span style={{ color: 'var(--color-text-muted)' }}>
            {infoRows.map((r) => r.code).join(', ')}: informational codes (non-taxable, totals, or items like
            lump sums this estimator does not model) — they are kept for your record but not added to the estimate.
          </span>
        </div>
      )}

      {/* Apply */}
      {sumEntries.length > 0 && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(16,185,129,0.06)', border: `1px solid ${C.emerald}33` }}>
          <p className="text-xs font-semibold" style={{ color: C.emerald }}>Will be applied to the form:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {sumEntries.map(([field, value]) => (
              <div key={field} className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span>{FIELD_LABELS[field] ?? field}</span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{formatRand(value, 0)}</span>
              </div>
            ))}
          </div>
          <button onClick={onApply}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(16,185,129,0.15)', color: C.emerald, border: `1px solid ${C.emerald}44` }}>
            <ArrowDown size={14} /> Apply codes to form
          </button>
        </div>
      )}
    </div>
  );
}

export function TaxAssessment() {
  const [inputs, setInputs]   = useState<TaxAssessmentInputs>(DEFAULT_INPUTS);
  const [taxYear, setTaxYear] = useState<TaxYearId>(DEFAULT_TAX_YEAR);
  const [codeRows, setCodeRows] = useState<CodeRow[]>([]);

  const result = useMemo(() => calcTaxAssessment(inputs, taxYear), [inputs, taxYear]);

  const applyCodes = () => {
    const sums = sumCodeRows(codeRows);
    if (Object.keys(sums).length === 0) return;
    setInputs((p) => ({ ...p, ...sums }));
  };

  const n = (fn: (v: number) => Partial<TaxAssessmentInputs>) => (val: string) =>
    setInputs((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const yearLabel = TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label ?? taxYear;
  const refund = result.refundOrOwing >= 0;

  const pieData = [
    { name: 'Salary',       value: result.employmentIncome },
    { name: 'Other income', value: Math.max(0, inputs.otherIncome) },
    { name: 'Rental',       value: Math.max(0, inputs.netRentalIncome) },
    { name: 'Interest',     value: Math.max(0, inputs.interestIncome) },
    { name: 'Dividends',    value: Math.max(0, inputs.localDividends) },
    { name: 'Capital gain', value: Math.max(0, inputs.capitalGain) },
  ].filter((d) => d.value > 0);

  const saveTitle   = `Assessment ${yearLabel} — ${formatRand(result.taxableIncome, 0)} taxable`;
  const saveSummary = refund
    ? `Refund due ${formatRand(result.refundOrOwing, 0)}`
    : `Owing to SARS ${formatRand(-result.refundOrOwing, 0)}`;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              SARS Assessment Estimator
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Estimate your annual income tax return: refund or amount owing · {yearLabel} tax year
            </p>
          </div>
          <TaxYearSelect id="ta-taxyear" value={taxYear} onChange={setTaxYear} className="min-w-[150px]" />
        </div>
      </motion.div>

      <SaveLoadBar<SavedState>
        type="assessment"
        title={saveTitle}
        summary={saveSummary}
        inputs={{ inputs, taxYear, codeRows }}
        onLoad={(s) => {
          setInputs({ ...DEFAULT_INPUTS, ...s.inputs });
          if (s.taxYear) setTaxYear(s.taxYear);
          setCodeRows(s.codeRows ?? []);
        }}
      />

      <Irp5CodePanel rows={codeRows} setRows={setCodeRows} onApply={applyCodes} />

      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-5">
        {/* ── Inputs ── */}
        <div className="space-y-5">
          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Income" icon={Wallet} />
            <SelectField label="Age Group" id="ta-age" value={inputs.ageGroup}
              onChange={(v) => setInputs((p) => ({ ...p, ageGroup: v as AgeGroup }))} options={AGE_OPTIONS} />
            <InputField label="Employment Income (annual)" id="ta-salary" value={inputs.annualSalary}
              onChange={n((v) => ({ annualSalary: v }))} prefix="R" help="Gross salary per your IRP5, excluding travel allowance" />
            <InputField label="Travel Allowance (annual)" id="ta-travel" value={inputs.travelAllowance}
              onChange={n((v) => ({ travelAllowance: v }))} prefix="R" />
            {inputs.travelAllowance > 0 && (
              <SelectField label="Travel Allowance Taxable Portion" id="ta-travelrate" value={inputs.travelInclusionRate}
                onChange={(v) => setInputs((p) => ({ ...p, travelInclusionRate: parseFloat(v) }))} options={TRAVEL_OPTIONS}
                help="Keep a logbook to claim against the allowance on assessment" />
            )}
            <InputField label="Freelance / Other Income" id="ta-other" value={inputs.otherIncome}
              onChange={n((v) => ({ otherIncome: v }))} prefix="R" />
            <InputField label="Net Rental Profit / Loss" id="ta-rental" value={inputs.netRentalIncome}
              onChange={(val) => setInputs((p) => ({ ...p, netRentalIncome: parseFloat(val) || 0 }))} prefix="R"
              help="Rent received less deductible expenses. Negative = loss (SARS may ring-fence under s20A)" />
            <InputField label="Local Interest Earned" id="ta-interest" value={inputs.interestIncome}
              onChange={n((v) => ({ interestIncome: v }))} prefix="R"
              help={`First ${formatRand(inputs.ageGroup === 'under65' ? 23_800 : 34_500, 0)} exempt for your age group`} />
            <InputField label="Local Dividends" id="ta-div" value={inputs.localDividends}
              onChange={n((v) => ({ localDividends: v }))} prefix="R"
              help="Taxed at 20% dividends withholding tax at source, not in this assessment" />
            <InputField label="Capital Gain This Year" id="ta-cg" value={inputs.capitalGain}
              onChange={n((v) => ({ capitalGain: v }))} prefix="R"
              help="Total gain on disposals, after the primary residence exclusion if applicable" />
          </div>

          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Deductions" icon={Receipt} />
            <InputField label="Retirement Contributions (annual)" id="ta-ra" value={inputs.raContributions}
              onChange={n((v) => ({ raContributions: v }))} prefix="R"
              help={`RA, pension and provident fund. Deductible up to 27.5% of income, max ${taxYear === '2027' ? 'R430,000' : 'R350,000'}`} />
            <InputField label="S18A Donations" id="ta-don" value={inputs.donations}
              onChange={n((v) => ({ donations: v }))} prefix="R" help="Donations with S18A certificates, capped at 10% of taxable income" />
          </div>

          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Medical" icon={HeartPulse} />
            <SelectField label="Medical Aid Membership" id="ta-meddeps" value={inputs.medAidDependants}
              onChange={(v) => setInputs((p) => ({ ...p, medAidDependants: parseInt(v, 10) }))} options={MED_DEP_OPTIONS} />
            {inputs.medAidDependants >= 0 && (
              <>
                <InputField label="Medical Aid Contributions (annual)" id="ta-medcontrib" value={inputs.medAidContributions}
                  onChange={n((v) => ({ medAidContributions: v }))} prefix="R" />
                <InputField label="Out-of-Pocket Medical Expenses" id="ta-medoop" value={inputs.medicalOutOfPocket}
                  onChange={n((v) => ({ medicalOutOfPocket: v }))} prefix="R" help="Qualifying expenses not covered by your scheme" />
              </>
            )}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <input type="checkbox" id="ta-disability" checked={inputs.hasDisability}
                onChange={(e) => setInputs((p) => ({ ...p, hasDisability: e.target.checked }))}
                className="w-4 h-4 accent-[#6366F1]" />
              <label htmlFor="ta-disability" className="text-sm cursor-pointer" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                Taxpayer or dependant has a SARS-recognised disability
              </label>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Tax Already Paid" icon={FileText} />
            <InputField label="PAYE Withheld (per IRP5)" id="ta-paye" value={inputs.payeWithheld}
              onChange={n((v) => ({ payeWithheld: v }))} prefix="R" />
            <InputField label="Provisional Tax Paid" id="ta-prov" value={inputs.provisionalPaid}
              onChange={n((v) => ({ provisionalPaid: v }))} prefix="R" />
          </div>
        </div>

        {/* ── Results ── */}
        <div className="space-y-5">
          {/* Hero: refund or owing */}
          <div className="p-5 rounded-2xl flex items-center gap-4" style={{
            background: refund ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
            border: `1px solid ${refund ? C.emerald : C.red}55`,
          }}>
            {refund
              ? <CheckCircle2 size={34} style={{ color: C.emerald }} />
              : <AlertCircle size={34} style={{ color: C.red }} />}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {refund ? 'Estimated refund due to you' : 'Estimated amount owing to SARS'}
              </p>
              <p className="text-3xl font-bold" style={{ color: refund ? C.emerald : C.red, fontFamily: 'var(--font-heading)' }}>
                {formatRand(Math.abs(result.refundOrOwing), 0)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                Tax for the year {formatRand(result.netTaxPayable, 0)} vs {formatRand(result.totalTaxPaid, 0)} already paid
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Taxable Income"  value={formatRand(result.taxableIncome, 0)}  color="indigo"  icon={Wallet} />
            <StatCard label="Tax for the Year" value={formatRand(result.netTaxPayable, 0)} color="amber"   icon={Receipt} />
            <StatCard label="Effective Rate"  value={`${result.effectiveRate.toFixed(1)}%`} color="emerald" icon={TrendingUp} />
            <StatCard label="Marginal Rate"   value={`${result.marginalRate.toFixed(0)}%`}  color="red"     icon={TrendingUp} />
          </div>

          {/* Build-up */}
          <div className="glass-card p-5">
            <SectionHeader title="How Your Assessment Is Built Up" icon={FileText} />
            <div className="mt-3">
              <BreakdownRow label="Employment income (incl. taxable travel)" value={result.employmentIncome} />
              {inputs.otherIncome > 0 && <BreakdownRow label="Freelance / other income" value={inputs.otherIncome} />}
              {inputs.netRentalIncome !== 0 && (
                <BreakdownRow label={inputs.netRentalIncome > 0 ? 'Net rental profit' : 'Net rental loss'}
                  value={inputs.netRentalIncome} color={inputs.netRentalIncome < 0 ? C.emerald : undefined}
                  negative={inputs.netRentalIncome < 0} />
              )}
              {inputs.interestIncome > 0 && (
                <>
                  <BreakdownRow label="Interest earned" value={inputs.interestIncome} />
                  <BreakdownRow label={`Less interest exemption`} value={result.interestExemptionApplied} color={C.emerald} negative />
                </>
              )}
              {inputs.capitalGain > 0 && (
                <BreakdownRow label={`Taxable capital gain (40% after ${formatRand(result.cgAnnualExclusionApplied, 0)} exclusion)`}
                  value={result.taxableCapitalGain} />
              )}
              {result.raDeductionAllowed > 0 && (
                <BreakdownRow label={`Less retirement deduction${result.raDeductionCapped ? ' (capped)' : ''}`}
                  value={result.raDeductionAllowed} color={C.emerald} negative />
              )}
              {result.donationsAllowed > 0 && (
                <BreakdownRow label={`Less S18A donations${result.donationsCapped ? ' (capped at 10%)' : ''}`}
                  value={result.donationsAllowed} color={C.emerald} negative />
              )}
              <BreakdownRow label="Taxable income" value={result.taxableIncome} bold />
              <div className="my-2" />
              <BreakdownRow label="Tax per SARS tables" value={result.grossTax} />
              <BreakdownRow label="Less age rebate" value={result.rebate} color={C.emerald} negative />
              {result.medCredit6A > 0 && (
                <BreakdownRow label="Less medical scheme credit (s6A)" value={result.medCredit6A} color={C.emerald} negative />
              )}
              {result.medCredit6B > 0 && (
                <BreakdownRow label="Less additional medical credit (s6B)" value={result.medCredit6B} color={C.emerald} negative />
              )}
              <BreakdownRow label="Tax for the year" value={result.netTaxPayable} bold />
              <div className="my-2" />
              <BreakdownRow label="Less PAYE and provisional tax paid" value={result.totalTaxPaid} color={C.emerald} negative />
              <BreakdownRow label={refund ? 'Refund due' : 'Owing to SARS'} value={Math.abs(result.refundOrOwing)}
                bold color={refund ? C.emerald : C.red} />
            </div>
          </div>

          {/* Income composition */}
          {pieData.length > 1 && (
            <div className="glass-card p-5">
              <SectionHeader title="Income Composition" icon={TrendingUp} />
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<RandTooltip />} />
                    <Legend formatter={(v) => <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Dividends note */}
          {inputs.localDividends > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(99,102,241,0.08)', border: `1px solid ${C.indigo}33` }}>
              <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.indigo }} />
              <span style={{ color: 'var(--color-text-muted)' }}>
                Your {formatRand(inputs.localDividends, 0)} in local dividends was taxed at source via
                20% dividends withholding tax ({formatRand(result.dividendsTax, 0)}). It does not form part
                of taxable income and is shown for information only.
              </span>
            </div>
          )}

          <div className="flex items-start gap-3 p-4 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              Estimate based on the {yearLabel} SARS tables. Not a SARS filing and not tax advice.
              Excludes foreign income, s20A rental loss ring-fencing, retirement lump sums and
              assessed-loss carryovers. Verify with eFiling or a registered tax practitioner.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
