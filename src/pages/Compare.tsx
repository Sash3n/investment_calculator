import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, GitCompare, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { calcMortgageSummary } from '../utils/mortgage';
import { calcPropertyROI } from '../utils/roi';
import { calcCarFinance } from '../utils/car';
import { calcTransferDuty, calcBondRegistrationCost } from '../utils/tax';
import { formatRand, formatPercent, formatYears } from '../utils/format';
import type { MortgageInputs, PropertyInputs, CarInputs } from '../types';
import type { CalcType } from '../hooks/useFirestore';

// ── Helpers ────────────────────────────────────────────────────────────────

const CA = '#6366F1'; // indigo — Scenario A
const CB = '#F59E0B'; // amber  — Scenario B
const GOOD = '#10B981';
const BAD  = '#EF4444';
const NEUTRAL = '#94A3B8';

type Direction = 'lower-better' | 'higher-better' | 'neutral';

interface CompareRow {
  label: string;
  a: string;
  b: string;
  aRaw: number;
  bRaw: number;
  direction: Direction;
  unit?: string;
}

function delta(a: number, b: number, direction: Direction) {
  if (direction === 'neutral' || a === b) return null;
  const diff = Math.abs(a - b);
  const winner: 'A' | 'B' | null =
    direction === 'lower-better'
      ? a < b ? 'A' : 'B'
      : a > b ? 'A' : 'B';
  return { diff, winner };
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ScenarioHeader({ label, title, color }: { label: string; title: string; color: string }) {
  return (
    <div className="p-4 rounded-xl mb-1" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-1"
        style={{ color, fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className="text-sm font-bold leading-snug"
        style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>{title}</p>
    </div>
  );
}

function CompareTable({ rows }: { rows: CompareRow[] }) {
  return (
    <div className="glass-card-static overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] px-4 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Metric</p>
        <p className="text-[10px] uppercase tracking-wider w-32 text-right" style={{ color: CA }}>Scenario A</p>
        <p className="text-[10px] uppercase tracking-wider w-32 text-right px-3" style={{ color: CB }}>Scenario B</p>
        <p className="text-[10px] uppercase tracking-wider w-24 text-center" style={{ color: 'var(--color-text-subtle)' }}>Diff</p>
      </div>

      {rows.map((row, i) => {
        const d = delta(row.aRaw, row.bRaw, row.direction);
        const aWins = d?.winner === 'A';
        const bWins = d?.winner === 'B';

        return (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_auto_auto] px-4 py-3 items-center"
            style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              {row.label}
            </p>

            {/* A value */}
            <p className="text-xs font-semibold w-32 text-right"
              style={{ color: aWins ? GOOD : row.aRaw === row.bRaw ? NEUTRAL : d ? BAD : 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              {row.a}
            </p>

            {/* B value */}
            <p className="text-xs font-semibold w-32 text-right px-3"
              style={{ color: bWins ? GOOD : row.aRaw === row.bRaw ? NEUTRAL : d ? BAD : 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              {row.b}
            </p>

            {/* Diff badge */}
            <div className="w-24 flex justify-center">
              {!d ? (
                <Minus size={12} style={{ color: NEUTRAL }} />
              ) : (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                  style={{
                    background: `${GOOD}14`,
                    color: GOOD,
                  }}
                >
                  {d.winner === 'A'
                    ? <TrendingDown size={10} />
                    : <TrendingUp size={10} />}
                  {row.unit === '%'
                    ? `${Math.abs(row.aRaw - row.bRaw).toFixed(2)}%`
                    : row.unit === 'yrs'
                    ? formatYears(d.diff)
                    : formatRand(d.diff, 0)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="mt-6 mb-2 flex items-center gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: CA, fontFamily: 'var(--font-body)' }}>{children}</p>
      <div className="flex-1 h-px" style={{ background: 'rgba(99,102,241,0.2)' }} />
    </div>
  );
}

// ── Mortgage comparison ─────────────────────────────────────────────────────

function MortgageCompare({ a, b }: { a: MortgageInputs; b: MortgageInputs }) {
  const rA = useMemo(() => calcMortgageSummary(a), [a]);
  const rB = useMemo(() => calcMortgageSummary(b), [b]);

  const upfrontA = {
    transferDuty: a.transferDutyExempt ? 0 : calcTransferDuty(a.purchasePrice),
    bondReg: a.bondRegistrationIncluded ? 0 : calcBondRegistrationCost(rA.loanAmount),
  };
  const upfrontB = {
    transferDuty: b.transferDutyExempt ? 0 : calcTransferDuty(b.purchasePrice),
    bondReg: b.bondRegistrationIncluded ? 0 : calcBondRegistrationCost(rB.loanAmount),
  };

  const loanRows: CompareRow[] = [
    { label: 'Purchase Price',   a: formatRand(a.purchasePrice, 0),  b: formatRand(b.purchasePrice, 0),  aRaw: a.purchasePrice,  bRaw: b.purchasePrice,  direction: 'neutral' },
    { label: 'Deposit',          a: formatRand(a.deposit, 0),         b: formatRand(b.deposit, 0),         aRaw: a.deposit,         bRaw: b.deposit,         direction: 'higher-better' },
    { label: 'Loan Amount',      a: formatRand(rA.loanAmount, 0),     b: formatRand(rB.loanAmount, 0),     aRaw: rA.loanAmount,     bRaw: rB.loanAmount,     direction: 'lower-better' },
    { label: 'Interest Rate',    a: formatPercent(a.interestRate),    b: formatPercent(b.interestRate),    aRaw: a.interestRate,    bRaw: b.interestRate,    direction: 'lower-better', unit: '%' },
    { label: 'Term',             a: `${a.termYears} years`,           b: `${b.termYears} years`,           aRaw: a.termYears,       bRaw: b.termYears,       direction: 'lower-better', unit: 'yrs' },
  ];

  const repayRows: CompareRow[] = [
    { label: 'Monthly Payment',       a: formatRand(rA.standardPayment),       b: formatRand(rB.standardPayment),       aRaw: rA.standardPayment,       bRaw: rB.standardPayment,       direction: 'lower-better' },
    { label: 'Total Interest',        a: formatRand(rA.totalInterestStandard), b: formatRand(rB.totalInterestStandard), aRaw: rA.totalInterestStandard, bRaw: rB.totalInterestStandard, direction: 'lower-better' },
    { label: 'Total Cost',            a: formatRand(rA.totalPaidStandard, 0),  b: formatRand(rB.totalPaidStandard, 0),  aRaw: rA.totalPaidStandard,     bRaw: rB.totalPaidStandard,     direction: 'lower-better' },
    { label: 'Interest Saved (extras)',a: formatRand(rA.interestSaved, 0),     b: formatRand(rB.interestSaved, 0),      aRaw: rA.interestSaved,         bRaw: rB.interestSaved,         direction: 'higher-better' },
    { label: 'Time Saved (extras)',   a: formatYears(rA.monthsSaved),          b: formatYears(rB.monthsSaved),          aRaw: rA.monthsSaved,           bRaw: rB.monthsSaved,           direction: 'higher-better', unit: 'yrs' },
  ];

  const upfrontRows: CompareRow[] = [
    { label: 'Deposit',           a: formatRand(a.deposit, 0),                              b: formatRand(b.deposit, 0),                              aRaw: a.deposit,                                              bRaw: b.deposit,                                              direction: 'neutral' },
    { label: 'Transfer Duty',     a: a.transferDutyExempt ? 'Exempt' : formatRand(upfrontA.transferDuty, 0), b: b.transferDutyExempt ? 'Exempt' : formatRand(upfrontB.transferDuty, 0), aRaw: upfrontA.transferDuty,  bRaw: upfrontB.transferDuty, direction: 'lower-better' },
    { label: 'Bond Registration', a: a.bondRegistrationIncluded ? 'Capitalised' : formatRand(upfrontA.bondReg, 0), b: b.bondRegistrationIncluded ? 'Capitalised' : formatRand(upfrontB.bondReg, 0), aRaw: upfrontA.bondReg, bRaw: upfrontB.bondReg, direction: 'lower-better' },
    { label: 'Total Cash Required', a: formatRand(a.deposit + upfrontA.transferDuty + upfrontA.bondReg, 0), b: formatRand(b.deposit + upfrontB.transferDuty + upfrontB.bondReg, 0), aRaw: a.deposit + upfrontA.transferDuty + upfrontA.bondReg, bRaw: b.deposit + upfrontB.transferDuty + upfrontB.bondReg, direction: 'lower-better' },
  ];

  return (
    <>
      <SectionTitle>Loan Details</SectionTitle>
      <CompareTable rows={loanRows} />
      <SectionTitle>Repayment</SectionTitle>
      <CompareTable rows={repayRows} />
      <SectionTitle>Upfront Cash Required</SectionTitle>
      <CompareTable rows={upfrontRows} />
    </>
  );
}

// ── Property comparison ─────────────────────────────────────────────────────

function PropertyCompare({ a, b }: { a: PropertyInputs; b: PropertyInputs }) {
  const rA = useMemo(() => calcPropertyROI(a), [a]);
  const rB = useMemo(() => calcPropertyROI(b), [b]);

  const loanRows: CompareRow[] = [
    { label: 'Purchase Price',     a: formatRand(rA.effectivePurchasePrice, 0), b: formatRand(rB.effectivePurchasePrice, 0), aRaw: rA.effectivePurchasePrice, bRaw: rB.effectivePurchasePrice, direction: 'neutral' },
    { label: 'Loan Amount',        a: formatRand(rA.loanAmount, 0),             b: formatRand(rB.loanAmount, 0),             aRaw: rA.loanAmount,             bRaw: rB.loanAmount,             direction: 'lower-better' },
    { label: 'Bond Repayment',     a: formatRand(rA.monthlyBondRepayment),      b: formatRand(rB.monthlyBondRepayment),      aRaw: rA.monthlyBondRepayment,   bRaw: rB.monthlyBondRepayment,   direction: 'lower-better' },
    { label: 'Interest Rate',      a: formatPercent(a.interestRate),            b: formatPercent(b.interestRate),            aRaw: a.interestRate,            bRaw: b.interestRate,            direction: 'lower-better', unit: '%' },
  ];

  const cashFlowRows: CompareRow[] = [
    { label: 'Cash Flow (S1)',     a: formatRand(rA.cashFlowS1),    b: formatRand(rB.cashFlowS1),    aRaw: rA.cashFlowS1,    bRaw: rB.cashFlowS1,    direction: 'higher-better' },
    { label: 'Cash Flow (S2)',     a: formatRand(rA.cashFlowS2),    b: formatRand(rB.cashFlowS2),    aRaw: rA.cashFlowS2,    bRaw: rB.cashFlowS2,    direction: 'higher-better' },
    { label: 'Gross Yield (S1)',   a: formatPercent(rA.grossYieldS1), b: formatPercent(rB.grossYieldS1), aRaw: rA.grossYieldS1, bRaw: rB.grossYieldS1, direction: 'higher-better', unit: '%' },
    { label: 'Net Yield (S1)',     a: formatPercent(rA.netYieldS1),  b: formatPercent(rB.netYieldS1),  aRaw: rA.netYieldS1,   bRaw: rB.netYieldS1,   direction: 'higher-better', unit: '%' },
  ];

  const roiRows: CompareRow[] = [
    { label: '5-Year ROI (S1)',    a: formatPercent(rA.roi5YearS1, 1),  b: formatPercent(rB.roi5YearS1, 1),  aRaw: rA.roi5YearS1,  bRaw: rB.roi5YearS1,  direction: 'higher-better', unit: '%' },
    { label: '10-Year ROI (S1)',   a: formatPercent(rA.roi10YearS1, 1), b: formatPercent(rB.roi10YearS1, 1), aRaw: rA.roi10YearS1, bRaw: rB.roi10YearS1, direction: 'higher-better', unit: '%' },
    { label: '5-Year ROI (S2)',    a: formatPercent(rA.roi5YearS2, 1),  b: formatPercent(rB.roi5YearS2, 1),  aRaw: rA.roi5YearS2,  bRaw: rB.roi5YearS2,  direction: 'higher-better', unit: '%' },
    { label: '10-Year ROI (S2)',   a: formatPercent(rA.roi10YearS2, 1), b: formatPercent(rB.roi10YearS2, 1), aRaw: rA.roi10YearS2, bRaw: rB.roi10YearS2, direction: 'higher-better', unit: '%' },
    { label: 'Total Cash Required',a: formatRand(rA.totalCashRequired, 0), b: formatRand(rB.totalCashRequired, 0), aRaw: rA.totalCashRequired, bRaw: rB.totalCashRequired, direction: 'lower-better' },
  ];

  return (
    <>
      <SectionTitle>Loan Details</SectionTitle>
      <CompareTable rows={loanRows} />
      <SectionTitle>Monthly Cash Flow</SectionTitle>
      <CompareTable rows={cashFlowRows} />
      <SectionTitle>Returns & ROI</SectionTitle>
      <CompareTable rows={roiRows} />
    </>
  );
}

// ── Car comparison ──────────────────────────────────────────────────────────

function CarCompare({ a, b }: { a: CarInputs; b: CarInputs }) {
  const rA = useMemo(() => calcCarFinance(a), [a]);
  const rB = useMemo(() => calcCarFinance(b), [b]);

  const loanRows: CompareRow[] = [
    { label: 'Vehicle Price',     a: formatRand(a.vehiclePrice, 0),      b: formatRand(b.vehiclePrice, 0),      aRaw: a.vehiclePrice,         bRaw: b.vehiclePrice,         direction: 'neutral' },
    { label: 'Deposit',           a: formatRand(a.deposit, 0),           b: formatRand(b.deposit, 0),           aRaw: a.deposit,              bRaw: b.deposit,              direction: 'higher-better' },
    { label: 'Financed Amount',   a: formatRand(rA.financedAmount, 0),   b: formatRand(rB.financedAmount, 0),   aRaw: rA.financedAmount,      bRaw: rB.financedAmount,      direction: 'lower-better' },
    { label: 'Balloon Payment',   a: formatRand(rA.balloonAmount, 0),    b: formatRand(rB.balloonAmount, 0),    aRaw: rA.balloonAmount,       bRaw: rB.balloonAmount,       direction: 'lower-better' },
    { label: 'Interest Rate',     a: formatPercent(a.interestRate),      b: formatPercent(b.interestRate),      aRaw: a.interestRate,         bRaw: b.interestRate,         direction: 'lower-better', unit: '%' },
    { label: 'Term',              a: `${a.termMonths} months`,           b: `${b.termMonths} months`,           aRaw: a.termMonths,           bRaw: b.termMonths,           direction: 'neutral' },
  ];

  const costRows: CompareRow[] = [
    { label: 'Monthly Instalment',   a: formatRand(rA.monthlyInstalment),    b: formatRand(rB.monthlyInstalment),    aRaw: rA.monthlyInstalment,    bRaw: rB.monthlyInstalment,    direction: 'lower-better' },
    { label: 'Total Interest',       a: formatRand(rA.totalInterest, 0),     b: formatRand(rB.totalInterest, 0),     aRaw: rA.totalInterest,        bRaw: rB.totalInterest,        direction: 'lower-better' },
    { label: 'Total Repayments',     a: formatRand(rA.totalRepayments, 0),   b: formatRand(rB.totalRepayments, 0),   aRaw: rA.totalRepayments,      bRaw: rB.totalRepayments,      direction: 'lower-better' },
    { label: 'Total Cost of Own.',   a: formatRand(rA.totalCostOfOwnership, 0), b: formatRand(rB.totalCostOfOwnership, 0), aRaw: rA.totalCostOfOwnership, bRaw: rB.totalCostOfOwnership, direction: 'lower-better' },
    { label: 'Interest Saved',       a: formatRand(rA.interestSaved, 0),     b: formatRand(rB.interestSaved, 0),     aRaw: rA.interestSaved,        bRaw: rB.interestSaved,        direction: 'higher-better' },
  ];

  return (
    <>
      <SectionTitle>Finance Details</SectionTitle>
      <CompareTable rows={loanRows} />
      <SectionTitle>Cost Breakdown</SectionTitle>
      <CompareTable rows={costRows} />
    </>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

interface LocationState {
  entryA: { id: string; title: string; type: CalcType; inputs: Record<string, unknown> };
  entryB: { id: string; title: string; type: CalcType; inputs: Record<string, unknown> };
}

const TYPE_LABEL: Record<CalcType, string> = {
  mortgage:   'Mortgage',
  property:   'Property ROI',
  car:        'Car Finance',
  investing:  'Extra vs Investing',
  strategy:   'Investment Strategy',
  tax:        'Tax Planner',
  assessment: 'SARS Assessment',
};

export function Compare() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  if (!state?.entryA || !state?.entryB) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <GitCompare size={36} className="opacity-30" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No scenarios selected. Go to History and select two snapshots to compare.
        </p>
        <button className="btn-primary text-sm" onClick={() => navigate('/history')}>
          Go to History
        </button>
      </div>
    );
  }

  const { entryA, entryB } = state;
  const type = entryA.type;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto px-4 pt-6 pb-16"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/history')}
          className="btn-ghost p-2 rounded-xl"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <GitCompare size={18} className="text-[#6366F1]" />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Scenario Comparison
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {TYPE_LABEL[type]} · green = better value
          </p>
        </div>
      </div>

      {/* Scenario headers */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <ScenarioHeader label="Scenario A" title={entryA.title} color={CA} />
        <ScenarioHeader label="Scenario B" title={entryB.title} color={CB} />
      </div>

      {/* Comparison tables */}
      {type === 'mortgage' && (
        <MortgageCompare
          a={entryA.inputs as unknown as MortgageInputs}
          b={entryB.inputs as unknown as MortgageInputs}
        />
      )}
      {type === 'property' && (
        <PropertyCompare
          a={entryA.inputs as unknown as PropertyInputs}
          b={entryB.inputs as unknown as PropertyInputs}
        />
      )}
      {type === 'car' && (
        <CarCompare
          a={entryA.inputs as unknown as CarInputs}
          b={entryB.inputs as unknown as CarInputs}
        />
      )}
      {type !== 'mortgage' && type !== 'property' && type !== 'car' && (
        <div className="glass-card-static p-8 text-center mt-4">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Detailed comparison is available for Mortgage, Property ROI, and Car Finance snapshots.
          </p>
        </div>
      )}

      <p className="text-[10px] text-center mt-8" style={{ color: 'var(--color-text-subtle)' }}>
        All figures are estimates. Green highlights indicate the better value for each metric.
      </p>
    </motion.div>
  );
}
