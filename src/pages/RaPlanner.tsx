import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Shield, Wallet, TrendingUp, Info, AlertTriangle, PieChart } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';
import { calcIncomeTax, getMarginalRate } from '../utils/tax';
import type { AgeGroup } from '../types';

// ── SARS 2026/27 Constants (effective 1 March 2026) ───────────────────────────
const RA_PCT_CAP           = 0.275;           // 27.5% of greater of income or remuneration
const RA_CAP_2026_27       = 430_000;         // R430,000 — increased from R350,000 in Budget 2026
const TWO_POT_SAVINGS_FRAC = 1 / 3;
const TWO_POT_RETIRE_FRAC  = 2 / 3;
// Savings Pot seed: once-off 10% of vested, capped R30,000 — applied on 1 Sep 2024
// Min Savings Pot withdrawal: R2,000 per tax year
const DE_MINIMIS_THRESHOLD  = 360_000;        // full commutation if total RA < this (2026/27)
const LA_MIN_DRAWDOWN       = 0.025;          // 2.5% p.a.
const LA_MAX_DRAWDOWN       = 0.175;          // 17.5% p.a.
const MIN_RETIRE_AGE        = 55;

// ── Retirement lump sum tax brackets (cumulative lifetime, 2025/26 & 2026/27) ─
// First R550,000 at 0%, next R220,000 at 18%, etc.
function calcRetirementLumpSumTax(lumpSum: number): number {
  if (lumpSum <= 0) return 0;
  if (lumpSum <= 550_000) return 0;
  if (lumpSum <= 770_000) return (lumpSum - 550_000) * 0.18;
  if (lumpSum <= 1_155_000) return 39_600 + (lumpSum - 770_000) * 0.27;
  return 143_550 + (lumpSum - 1_155_000) * 0.36;
}


const C = {
  indigo:  '#6366F1',
  amber:   '#F59E0B',
  emerald: '#10B981',
  red:     '#EF4444',
  cyan:    '#06B6D4',
  violet:  '#8B5CF6',
};

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

const AGE_GROUP_OPTIONS = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74',  label: '65 – 74 years' },
  { value: '75plus',  label: '75 years and older' },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Inputs {
  currentAge:            number;
  retirementAge:         number;
  annualGrossIncome:     number;
  monthlyRAContribution: number;
  expectedReturnPercent: number;
  vestedBalance:         number;          // pre-Sep 2024 savings
  savingsPotBalance:     number;          // current savings pot balance
  retirementPotBalance:  number;          // current retirement pot balance
  drawdownRatePercent:   number;          // living annuity drawdown %
  ageGroup:              AgeGroup;
}

interface YearRow {
  year:               number;
  age:                number;
  annualContrib:      number;
  savingsPotContrib:  number;
  retirePotContrib:   number;
  savingsPot:         number;
  retirePot:          number;
  vestedPot:          number;
  totalWealth:        number;
  annualTaxSaving:    number;
  cumulativeTaxSaved: number;
  effectiveCost:      number;  // actual cash out of pocket per year (contrib - tax saving)
}

// ── Simulation ────────────────────────────────────────────────────────────────
function simulate(inp: Inputs): YearRow[] {
  const rows: YearRow[] = [];
  const r = inp.expectedReturnPercent / 100;

  // RA deduction: min(27.5% of gross income, R430,000, taxable income)
  const annualContrib   = inp.monthlyRAContribution * 12;
  const deductionLimit  = Math.min(RA_PCT_CAP * inp.annualGrossIncome, RA_CAP_2026_27);
  const allowableDeduction = Math.min(annualContrib, deductionLimit, inp.annualGrossIncome);

  const ageGroup = inp.ageGroup;
  const taxWithRA    = calcIncomeTax(Math.max(0, inp.annualGrossIncome - allowableDeduction), ageGroup);
  const taxWithoutRA = calcIncomeTax(inp.annualGrossIncome, ageGroup);
  const annualTaxSaving = Math.max(0, taxWithoutRA - taxWithRA);

  // 2-Pot split
  const savingsPotContrib = annualContrib * TWO_POT_SAVINGS_FRAC;
  const retirePotContrib  = annualContrib * TWO_POT_RETIRE_FRAC;

  let savingsPot  = inp.savingsPotBalance;
  let retirePot   = inp.retirementPotBalance;
  let vestedPot   = inp.vestedBalance;
  let cumulativeTaxSaved = 0;

  const yearsToRetire = Math.max(0, inp.retirementAge - inp.currentAge);

  for (let year = 1; year <= yearsToRetire; year++) {
    const age = inp.currentAge + year;

    // Grow existing balances
    savingsPot = savingsPot * (1 + r) + savingsPotContrib;
    retirePot  = retirePot  * (1 + r) + retirePotContrib;
    vestedPot  = vestedPot  * (1 + r);

    cumulativeTaxSaved += annualTaxSaving;

    rows.push({
      year,
      age,
      annualContrib,
      savingsPotContrib,
      retirePotContrib,
      savingsPot,
      retirePot,
      vestedPot,
      totalWealth: savingsPot + retirePot + vestedPot,
      annualTaxSaving,
      cumulativeTaxSaved,
      effectiveCost: annualContrib - annualTaxSaving,
    });
  }

  return rows;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RaPlanner() {
  const [inp, setInp] = useState<Inputs>({
    currentAge:            35,
    retirementAge:         65,
    annualGrossIncome:     600_000,
    monthlyRAContribution: 5_000,
    expectedReturnPercent: 10,
    vestedBalance:         150_000,
    savingsPotBalance:     0,
    retirementPotBalance:  0,
    drawdownRatePercent:   5,
    ageGroup:              'under65',
  });

  const n = (fn: (v: number) => Partial<Inputs>) => (val: string) =>
    setInp((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const rows = useMemo(() => simulate(inp), [inp]);
  const last = rows[rows.length - 1];

  // ── Key derived values ─────────────────────────────────────────────────────
  const annualContrib      = inp.monthlyRAContribution * 12;
  const deductionLimit     = Math.min(RA_PCT_CAP * inp.annualGrossIncome, RA_CAP_2026_27);
  const allowableDeduction = Math.min(annualContrib, deductionLimit, inp.annualGrossIncome);
  const excessContrib      = Math.max(0, annualContrib - deductionLimit);
  const ageGroup           = inp.ageGroup;

  const taxWithRA    = calcIncomeTax(Math.max(0, inp.annualGrossIncome - allowableDeduction), ageGroup);
  const taxWithoutRA = calcIncomeTax(inp.annualGrossIncome, ageGroup);
  const annualTaxSaving  = Math.max(0, taxWithoutRA - taxWithRA);
  const monthlyTaxSaving = annualTaxSaving / 12;
  const effectiveMonthlyCost = Math.max(0, inp.monthlyRAContribution - monthlyTaxSaving);
  const marginalRate     = getMarginalRate(inp.annualGrossIncome) * 100;
  const sarsSubsidyPct   = inp.monthlyRAContribution > 0
    ? (monthlyTaxSaving / inp.monthlyRAContribution) * 100 : 0;

  // Utilisation
  const raUtilisationPct = deductionLimit > 0
    ? Math.min(100, (annualContrib / deductionLimit) * 100) : 0;

  // At retirement
  const totalAtRetirement   = last?.totalWealth    ?? 0;
  const savingsPotAtRetire  = last?.savingsPot     ?? 0;
  const retirePotAtRetire   = last?.retirePot      ?? 0;
  const vestedAtRetire      = last?.vestedPot      ?? 0;
  const totalCumulativeTax  = last?.cumulativeTaxSaved ?? 0;

  // One-third lump sum from vested (old rules, pre-2-pot)
  // Retirement Pot must be annuitised; Savings Pot accessible; Vested = old rules (max 1/3 lump sum)
  const vestedLumpSum      = Math.min(vestedAtRetire / 3, vestedAtRetire);
  const vestedAnnuityPot   = vestedAtRetire - vestedLumpSum;

  // Full retirement lump sum available
  const totalLumpSum       = savingsPotAtRetire + vestedLumpSum;
  const lumpSumTax         = calcRetirementLumpSumTax(vestedLumpSum); // only vested lump sum uses this table
  const netLumpSum         = totalLumpSum - lumpSumTax;

  // Total annuity pot (retirement pot + vested annuity portion)
  const totalAnnuityPot    = retirePotAtRetire + vestedAnnuityPot;
  const canFullyCommute    = totalAtRetirement < DE_MINIMIS_THRESHOLD;

  // Monthly living annuity income at chosen drawdown rate
  const annualDrawdown     = totalAnnuityPot * (inp.drawdownRatePercent / 100);
  const monthlyIncome      = annualDrawdown / 12;

  // RA vs ETF comparison
  // RA: contributes full amount, tax deferred. ETF: contributes after-tax equivalent, pays 20% div WHT + CGT at exit
  const yearsToRetire = Math.max(0, inp.retirementAge - inp.currentAge);
  const r = inp.expectedReturnPercent / 100;
  const etfMonthlyContrib = inp.monthlyRAContribution - monthlyTaxSaving; // same out-of-pocket
  const etfAnnualContrib  = etfMonthlyContrib * 12;
  const divYield          = 0.03; // assume 3% dividend yield
  const growthR           = r - divYield;
  const divWHT            = 0.20;

  let raBalance  = inp.vestedBalance + inp.savingsPotBalance + inp.retirementPotBalance;
  let etfBalance = inp.vestedBalance + inp.savingsPotBalance + inp.retirementPotBalance;

  const comparisonChart = rows.map((row) => {
    raBalance  = row.totalWealth;
    etfBalance = etfBalance * (1 + growthR) + etfAnnualContrib * (1 + growthR / 2)
                 + (etfBalance * divYield) * (1 - divWHT);
    return {
      label: `${row.age}`,
      ra:    Math.round(raBalance),
      etf:   Math.round(etfBalance),
    };
  });

  // CGT on ETF at retirement
  const etfFinalBalance = comparisonChart[comparisonChart.length - 1]?.etf ?? 0;
  const etfCostBase     = etfAnnualContrib * yearsToRetire
    + inp.vestedBalance + inp.savingsPotBalance + inp.retirementPotBalance;
  const etfGain         = Math.max(0, etfFinalBalance - etfCostBase);
  const etfNetGain      = Math.max(0, etfGain - 50_000);     // R50k annual exclusion
  const etfInclusion    = etfNetGain * 0.40;
  const etfCGT          = calcIncomeTax(inp.annualGrossIncome + etfInclusion, ageGroup)
                        - calcIncomeTax(inp.annualGrossIncome, ageGroup);
  const etfAfterCGT     = Math.max(0, etfFinalBalance - etfCGT);

  // Pot growth chart
  const potChart = rows
    .filter((_, i) => i % Math.max(1, Math.floor(rows.length / 20)) === 0 || rows.length <= 20)
    .map((r) => ({
      label:   `${r.age}`,
      savings: Math.round(r.savingsPot),
      retire:  Math.round(r.retirePot),
      vested:  Math.round(r.vestedPot),
    }));

  // Vesting scenarios at 55, 60, 65
  const vestingScenarios = [55, 60, 65].map((age) => {
    const row = rows.find((r) => r.age === age);
    if (!row) return null;
    const sp = row.savingsPot;
    const rp = row.retirePot;
    const vp = row.vestedPot;
    const vLump = vp / 3;
    const lumpSumTaxScen = calcRetirementLumpSumTax(vLump);
    const annuityPot = rp + (vp - vLump);
    const monthlyIncomeScen = (annuityPot * (inp.drawdownRatePercent / 100)) / 12;
    return { age, sp, rp, vp, totalWealth: sp + rp + vp, lumpSumTaxScen, annuityPot, monthlyIncomeScen };
  }).filter(Boolean);

  const retirementAgeValid = inp.retirementAge >= MIN_RETIRE_AGE;
  const overContrib        = annualContrib > deductionLimit;
  const utilizationColor   = raUtilisationPct >= 90 ? C.emerald : raUtilisationPct >= 50 ? C.amber : C.red;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Shield size={20} className="text-[#6366F1]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Retirement Annuity Planner
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              27.5% deduction · 2-Pot system · SARS 2026/27 · Living annuity modelling
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold hidden sm:inline-block"
            style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid ${C.indigo}44` }}>
            RA cap R430,000
          </span>
        </div>
      </motion.div>

      {/* Retirement age warning */}
      {!retirementAgeValid && (
        <div className="flex items-start gap-3 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={14} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
          <span style={{ color: '#FCA5A5' }}>
            The minimum RA retirement age in South Africa is <strong>55</strong>. You cannot access your RA before this age (except for disability or formal tax emigration).
          </span>
        </div>
      )}

      {/* Over-contribution warning */}
      {overContrib && (
        <div className="flex items-start gap-3 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertTriangle size={14} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
          <span style={{ color: '#FCD34D' }}>
            Your RA contribution of {formatRand(annualContrib, 0)}/year exceeds your deductible limit of {formatRand(deductionLimit, 0)}/year.
            The excess of <strong>{formatRand(excessContrib, 0)}</strong> is not deductible now — but it carries forward and is deductible in future tax years, and is tax-free when withdrawn at retirement.
          </span>
        </div>
      )}

      {/* SARS subsidy callout */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card-static p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <TrendingUp size={15} className="text-[#10B981]" />
          </div>
          <p className="text-sm font-semibold"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            SARS Subsidy — How Much the Government Pays
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: 'var(--color-text-subtle)' }}>Your contribution</p>
            <p className="text-lg font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              {formatRand(inp.monthlyRAContribution, 0)}<span className="text-xs font-normal">/mo</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: 'var(--color-text-subtle)' }}>SARS pays</p>
            <p className="text-lg font-bold" style={{ color: C.emerald, fontFamily: 'var(--font-heading)' }}>
              {formatRand(monthlyTaxSaving, 0)}<span className="text-xs font-normal">/mo</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: 'var(--color-text-subtle)' }}>Your actual cost</p>
            <p className="text-lg font-bold" style={{ color: C.indigo, fontFamily: 'var(--font-heading)' }}>
              {formatRand(effectiveMonthlyCost, 0)}<span className="text-xs font-normal">/mo</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: 'var(--color-text-subtle)' }}>SARS subsidy</p>
            <p className="text-lg font-bold" style={{ color: C.amber, fontFamily: 'var(--font-heading)' }}>
              {formatPercent(sarsSubsidyPct, 0)}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
              {marginalRate.toFixed(0)}% marginal bracket
            </p>
          </div>
        </div>

        {/* RA deduction utilisation bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: 'var(--color-text-muted)' }}>RA deduction utilisation</span>
            <span className="font-semibold" style={{ color: utilizationColor }}>
              {formatRand(annualContrib, 0)} / {formatRand(deductionLimit, 0)} ({raUtilisationPct.toFixed(0)}%)
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${C.indigo}, ${utilizationColor})` }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, raUtilisationPct)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-subtle)' }}>
            Annual deduction cap: R430,000 (27.5% of income, whichever is lower) — SARS 2026/27 Budget
          </p>
        </div>
      </motion.div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Wallet size={15} className="text-[#6366F1]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Your Details
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="currentAge" label="Current Age" value={inp.currentAge}
              onChange={n((v) => ({ currentAge: v }))} suffix="yrs" />
            <InputField id="retirementAge" label="Retirement Age" value={inp.retirementAge}
              onChange={n((v) => ({ retirementAge: v }))} suffix="yrs" help="Min age 55" />
            <InputField id="annualIncome" label="Annual Gross Income" value={inp.annualGrossIncome}
              onChange={n((v) => ({ annualGrossIncome: v }))} prefix="R" />
            <InputField id="monthlyRA" label="Monthly RA Contribution" value={inp.monthlyRAContribution}
              onChange={n((v) => ({ monthlyRAContribution: v }))} prefix="R" />
            <InputField id="expectedReturn" label="Expected Annual Return" value={inp.expectedReturnPercent}
              onChange={n((v) => ({ expectedReturnPercent: v }))} suffix="% p.a." step={0.5} />
            <SelectField id="ageGroup" label="Age Group (Tax Rebates)" value={inp.ageGroup}
              onChange={(v) => setInp((p) => ({ ...p, ageGroup: v as AgeGroup }))}
              options={AGE_GROUP_OPTIONS} />
          </div>
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <PieChart size={15} className="text-[#F59E0B]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Current Balances &amp; Retirement
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="vestedBalance" label="Vested Pot (pre-Sep 2024)" value={inp.vestedBalance}
              onChange={n((v) => ({ vestedBalance: v }))} prefix="R"
              help="RA savings before 2-Pot split" />
            <InputField id="savingsPot" label="Savings Pot Balance" value={inp.savingsPotBalance}
              onChange={n((v) => ({ savingsPotBalance: v }))} prefix="R"
              help="Accessible from age 55" />
            <InputField id="retirePot" label="Retirement Pot Balance" value={inp.retirementPotBalance}
              onChange={n((v) => ({ retirementPotBalance: v }))} prefix="R"
              help="Must be annuitised at retirement" />
            <InputField id="drawdown" label="Living Annuity Drawdown" value={inp.drawdownRatePercent}
              onChange={n((v) => ({ drawdownRatePercent: Math.min(LA_MAX_DRAWDOWN * 100, Math.max(LA_MIN_DRAWDOWN * 100, v)) }))}
              suffix="% p.a." step={0.5}
              help="FSCA: min 2.5% / max 17.5%" />
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total at Retirement" value={formatRand(totalAtRetirement, 0)}
          sub={`Age ${inp.retirementAge}`} color="emerald" delay={0} />
        <StatCard label="Net Lump Sum" value={formatRand(netLumpSum, 0)}
          sub={`Savings Pot + Vested 1/3 (after tax)`} color="amber" delay={0.05} />
        <StatCard label="Monthly Income" value={formatRand(monthlyIncome, 0)}
          sub={`${inp.drawdownRatePercent}% drawdown · living annuity`} color="indigo" delay={0.1} />
        <StatCard label="Cumulative Tax Saved" value={formatRand(totalCumulativeTax, 0)}
          sub={`Over ${yearsToRetire} years`} color="emerald" delay={0.15} />
      </div>

      {/* 2-Pot explainer */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          2-Pot System at Retirement (Age {inp.retirementAge})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: 'Savings Pot',
              value: savingsPotAtRetire,
              color: C.emerald,
              badge: 'Fully accessible',
              detail: `Taxed at marginal rate on withdrawal. Min withdrawal: R2,000/year.`,
              seeding: `Seeded from vested pot (10%, capped R30,000) on 1 Sep 2024.`,
            },
            {
              label: 'Retirement Pot',
              value: retirePotAtRetire,
              color: C.indigo,
              badge: 'Must annuitise',
              detail: totalAtRetirement < DE_MINIMIS_THRESHOLD
                ? `Total RA < R360,000 — you may fully commute (take as lump sum).`
                : `Must be used to purchase a life or living annuity. No lump sum allowed.`,
            },
            {
              label: 'Vested Pot',
              value: vestedAtRetire,
              color: C.amber,
              badge: 'Old rules apply',
              detail: `Up to 1/3 as lump sum (lump sum tax table). Remaining 2/3 must be annuitised.`,
              lumpSum: vestedLumpSum,
              lumpSumTax,
            },
          ].map((pot) => (
            <div key={pot.label} className="rounded-xl p-4"
              style={{ background: `${pot.color}0D`, border: `1px solid ${pot.color}30` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold" style={{ color: pot.color }}>{pot.label}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${pot.color}20`, color: pot.color }}>
                  {pot.badge}
                </span>
              </div>
              <p className="text-xl font-bold mb-2"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
                {formatRand(pot.value, 0)}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {pot.detail}
              </p>
              {pot.lumpSum !== undefined && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>Lump sum (1/3)</span>
                    <span style={{ color: C.amber }}>{formatRand(pot.lumpSum, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>Lump sum tax</span>
                    <span style={{ color: C.red }}>{formatRand(pot.lumpSumTax ?? 0, 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span style={{ color: 'var(--color-text-muted)' }}>Net lump sum</span>
                    <span style={{ color: C.emerald }}>{formatRand((pot.lumpSum ?? 0) - (pot.lumpSumTax ?? 0), 0)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {canFullyCommute && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Info size={13} className="text-[#10B981] mt-0.5 flex-shrink-0" />
            <span style={{ color: 'var(--color-text-muted)' }}>
              Your projected total retirement interest ({formatRand(totalAtRetirement, 0)}) falls below the
              <strong style={{ color: 'var(--color-text)' }}> R360,000 de minimis threshold</strong> (SARS 2026/27).
              You may elect to take the full amount as a lump sum instead of purchasing an annuity.
            </span>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pot growth stacked area */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Pot Growth Over Time
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Savings Pot (accessible) · Retirement Pot (annuity) · Vested (old rules)
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={potChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.emerald} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={C.emerald} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradRP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={C.indigo} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradVP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.amber} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={C.amber} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }}
                label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }}
                formatter={(v, name) => [formatRand(Number(v), 0),
                  name === 'savings' ? 'Savings Pot' : name === 'retire' ? 'Retirement Pot' : 'Vested Pot']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Area type="monotone" dataKey="vested"  name="Vested" stackId="1"
                stroke={C.amber}   fill="url(#gradVP)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="retire"  name="Retirement Pot" stackId="1"
                stroke={C.indigo}  fill="url(#gradRP)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="savings" name="Savings Pot" stackId="1"
                stroke={C.emerald} fill="url(#gradSP)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* RA vs ETF comparison */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            RA vs ETF (Same Out-of-Pocket Cost)
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            RA: full contribution, tax-deferred. ETF: after-tax equivalent ({formatRand(etfMonthlyContrib, 0)}/mo), 20% div WHT + CGT at exit.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={comparisonChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.indigo} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradETF" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.cyan} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.cyan} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }}
                formatter={(v, name) => [formatRand(Number(v), 0), name === 'ra' ? 'RA (tax-deferred)' : 'ETF (after div WHT)']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Area type="monotone" dataKey="ra"  name="RA"  stroke={C.indigo} fill="url(#gradRA)"  strokeWidth={2} />
              <Area type="monotone" dataKey="etf" name="ETF" stroke={C.cyan}   fill="url(#gradETF)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-between text-xs p-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>ETF after CGT at retirement</span>
            <span className="font-semibold" style={{ color: C.cyan }}>{formatRand(etfAfterCGT, 0)}</span>
          </div>
        </div>
      </div>

      {/* Vesting scenarios */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Retirement Scenarios by Age
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Retire at', 'Total Wealth', 'Savings Pot', 'Annuity Pot', 'Net Lump Sum (tax)', `Monthly Income (${inp.drawdownRatePercent}%)`].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vestingScenarios.map((s) => {
                if (!s) return null;
                const netLump = s.vp / 3 - s.lumpSumTaxScen + s.sp;
                const isTarget = s.age === inp.retirementAge;
                return (
                  <tr key={s.age} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isTarget ? 'rgba(99,102,241,0.06)' : 'transparent',
                  }}>
                    <td className="py-2.5 px-3 font-bold"
                      style={{ color: isTarget ? C.indigo : '#818CF8' }}>
                      Age {s.age}{isTarget ? ' ★' : ''}
                    </td>
                    <td className="py-2.5 px-3 font-semibold" style={{ color: C.emerald }}>
                      {formatRand(s.totalWealth, 0)}
                    </td>
                    <td className="py-2.5 px-3" style={{ color: C.emerald }}>
                      {formatRand(s.sp, 0)}
                    </td>
                    <td className="py-2.5 px-3" style={{ color: C.indigo }}>
                      {formatRand(s.annuityPot, 0)}
                    </td>
                    <td className="py-2.5 px-3" style={{ color: C.amber }}>
                      {formatRand(netLump, 0)}
                      <span className="ml-1 text-[10px]" style={{ color: C.red }}>
                        (-{formatRand(s.lumpSumTaxScen, 0)} tax)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                      {formatRand(s.monthlyIncomeScen, 0)}/mo
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-subtle)' }}>
          ★ = your selected retirement age · Lump sum tax based on retirement lump sum table (R550k tax-free, then 18%/27%/36%) · Monthly income uses living annuity at selected drawdown rate
        </p>
      </div>

      {/* Year-by-year table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Year-by-Year Contribution Breakdown
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Age', 'Annual Contrib.', 'Tax Saving', 'Effective Cost', 'Savings Pot', 'Retire Pot', 'Total Wealth', 'Cum. Tax Saved'].map((h) => (
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
                  <td className="py-2 px-3 font-bold" style={{ color: '#818CF8' }}>{r.age}</td>
                  <td className="py-2 px-3" style={{ color: C.indigo }}>{formatRand(r.annualContrib, 0)}</td>
                  <td className="py-2 px-3" style={{ color: C.emerald }}>{formatRand(r.annualTaxSaving, 0)}</td>
                  <td className="py-2 px-3" style={{ color: C.amber }}>{formatRand(r.effectiveCost, 0)}</td>
                  <td className="py-2 px-3" style={{ color: C.emerald }}>{formatRand(r.savingsPot, 0)}</td>
                  <td className="py-2 px-3" style={{ color: C.indigo }}>{formatRand(r.retirePot, 0)}</td>
                  <td className="py-2 px-3 font-semibold" style={{ color: 'var(--color-text)' }}>{formatRand(r.totalWealth, 0)}</td>
                  <td className="py-2 px-3 font-semibold" style={{ color: C.emerald }}>{formatRand(r.cumulativeTaxSaved, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Pot key rules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            title: 'Savings Pot (1/3)',
            body: 'One-third of all new contributions since 1 Sep 2024. Accessible once per tax year, minimum R2,000. Taxed at your marginal income tax rate — not the lump sum table.',
            color: C.emerald,
          },
          {
            title: 'Retirement Pot (2/3)',
            body: 'Two-thirds of new contributions. Cannot be accessed before retirement (age 55 minimum). Must be used to purchase a life or living annuity. No lump sum allowed (unless total RA < R360,000).',
            color: C.indigo,
          },
          {
            title: 'Living Annuity',
            body: `Drawdown between 2.5% and 17.5% per year (FSCA rules). Reviewed annually on policy anniversary. If balance drops below R150,000 (2026/27), you may fully commute.`,
            color: C.amber,
          },
        ].map((card) => (
          <div key={card.title} className="rounded-xl p-4"
            style={{ background: `${card.color}10`, border: `1px solid ${card.color}30` }}>
            <p className="text-xs font-bold mb-1" style={{ color: card.color }}>{card.title}</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {card.body}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        SARS 2026/27 tax year · RA deduction cap R430,000 · Retirement lump sum tax-free threshold R550,000 · Living annuity 2.5%–17.5% FSCA · Not financial advice — consult a CFP.
      </p>
    </div>
  );
}
