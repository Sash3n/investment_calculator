import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Scale, Plus, Trash2, Trophy } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';
import { calcPayment } from '../utils/mortgage';

const C = {
  indigo:  '#6366F1',
  amber:   '#F59E0B',
  emerald: '#10B981',
  red:     '#EF4444',
  cyan:    '#06B6D4',
  violet:  '#8B5CF6',
};
const LOAN_COLORS = [C.indigo, C.emerald, C.amber];

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

interface Loan {
  id:               number;
  label:            string;
  amount:           number;
  interestRate:     number;
  termYears:        number;
  initiationFee:    number;
  monthlyServiceFee:number;
}

interface LoanResult {
  id:               number;
  label:            string;
  color:            string;
  monthlyPayment:   number;
  totalMonthly:     number;  // payment + service fee
  totalRepaid:      number;  // all payments + fees + initiation
  totalInterest:    number;
  totalCost:        number;  // total repaid - principal
  effectiveRate:    number;  // APR including fees
}

function calcLoanResult(loan: Loan, color: string): LoanResult {
  const monthlyPayment    = calcPayment(loan.amount, loan.interestRate, loan.termYears, 12);
  const totalMonthly      = monthlyPayment + loan.monthlyServiceFee;
  const totalPayments     = totalMonthly * loan.termYears * 12;
  const totalRepaid       = totalPayments + loan.initiationFee;
  const totalInterest     = totalPayments - loan.amount;
  const totalCost         = totalRepaid - loan.amount;

  // Effective APR: solve for rate that gives same monthly payment on amount net of fees
  // Approximate: effective rate = (totalInterest + fees) / (amount * termYears / 2) * 100
  const effectiveRate = totalCost > 0
    ? (totalCost / (loan.amount * loan.termYears / 2)) * 100
    : loan.interestRate;

  return { id: loan.id, label: loan.label, color, monthlyPayment, totalMonthly, totalRepaid, totalInterest, totalCost, effectiveRate };
}

function buildBalanceChart(loans: Loan[]): Record<string, number | string>[] {
  const maxMonths = Math.max(...loans.map((l) => l.termYears * 12));
  const rows: Record<string, number | string>[] = [];

  for (let m = 0; m <= maxMonths; m += Math.max(1, Math.floor(maxMonths / 30))) {
    const row: Record<string, number | string> = { month: m === 0 ? 'Start' : `M${m}` };
    for (const loan of loans) {
      const r   = loan.interestRate / 100 / 12;
      const n   = loan.termYears * 12;
      const pmt = calcPayment(loan.amount, loan.interestRate, loan.termYears, 12);
      let bal   = loan.amount;
      for (let i = 0; i < Math.min(m, n); i++) {
        const interest  = bal * r;
        const principal = Math.min(pmt - interest, bal);
        bal -= principal;
        if (bal < 0) bal = 0;
      }
      row[loan.label] = Math.round(Math.max(0, bal));
    }
    rows.push(row);
  }
  return rows;
}

export function LoanComparison() {
  const [loans, setLoans] = useState<Loan[]>([
    { id: 1, label: 'Option A', amount: 1_200_000, interestRate: 11.5, termYears: 20, initiationFee: 6_037, monthlyServiceFee: 69 },
    { id: 2, label: 'Option B', amount: 1_200_000, interestRate: 11.0, termYears: 20, initiationFee: 6_037, monthlyServiceFee: 69 },
  ]);

  const nextId = Math.max(...loans.map((l) => l.id)) + 1;

  const addLoan = () => {
    if (loans.length >= 3) return;
    const last = loans[loans.length - 1];
    setLoans([...loans, {
      id: nextId, label: `Option ${String.fromCharCode(64 + loans.length + 1)}`,
      amount: last.amount, interestRate: last.interestRate + 0.5,
      termYears: last.termYears, initiationFee: last.initiationFee,
      monthlyServiceFee: last.monthlyServiceFee,
    }]);
  };

  const removeLoan = (id: number) => {
    if (loans.length <= 2) return;
    setLoans(loans.filter((l) => l.id !== id));
  };

  const updateLoan = (id: number, field: keyof Loan, val: string) => {
    setLoans(loans.map((l) =>
      l.id === id
        ? { ...l, [field]: field === 'label' ? val : parseFloat(val) || 0 }
        : l
    ));
  };

  const results = useMemo<LoanResult[]>(
    () => loans.map((l, i) => calcLoanResult(l, LOAN_COLORS[i % LOAN_COLORS.length])),
    [loans]
  );

  const bestMonthly  = results.reduce((a, b) => a.totalMonthly  < b.totalMonthly  ? a : b);
  const bestTotal    = results.reduce((a, b) => a.totalCost     < b.totalCost     ? a : b);

  const balanceChart = useMemo(() => buildBalanceChart(loans), [loans]);


  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Scale size={20} className="text-[#F59E0B]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Loan Comparison Tool
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Compare up to 3 loan offers — true total cost including fees and interest
            </p>
          </div>
          {loans.length < 3 && (
            <button onClick={addLoan}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid rgba(99,102,241,0.3)` }}>
              <Plus size={13} /> Add Loan
            </button>
          )}
        </div>
      </motion.div>

      {/* Loan input cards */}
      <div className={`grid grid-cols-1 gap-4 ${loans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {loans.map((loan, idx) => (
          <motion.div key={loan.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: LOAN_COLORS[idx % LOAN_COLORS.length] }} />
                <input
                  value={loan.label}
                  onChange={(e) => updateLoan(loan.id, 'label', e.target.value)}
                  className="text-sm font-bold bg-transparent border-0 outline-none"
                  style={{ color: LOAN_COLORS[idx % LOAN_COLORS.length], fontFamily: 'var(--font-heading)', width: 100 }}
                />
              </div>
              {loans.length > 2 && (
                <button onClick={() => removeLoan(loan.id)}
                  className="text-xs p-1 rounded-lg transition-all"
                  style={{ color: C.red, background: 'rgba(239,68,68,0.08)' }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField id={`amount-${loan.id}`} label="Loan Amount" value={loan.amount}
                onChange={(v) => updateLoan(loan.id, 'amount', v)} prefix="R" />
              <InputField id={`rate-${loan.id}`} label="Interest Rate" value={loan.interestRate}
                onChange={(v) => updateLoan(loan.id, 'interestRate', v)} suffix="%" step={0.25} />
              <InputField id={`term-${loan.id}`} label="Term" value={loan.termYears}
                onChange={(v) => updateLoan(loan.id, 'termYears', v)} suffix="yrs" />
              <InputField id={`init-${loan.id}`} label="Initiation Fee" value={loan.initiationFee}
                onChange={(v) => updateLoan(loan.id, 'initiationFee', v)} prefix="R" />
              <InputField id={`fee-${loan.id}`} label="Monthly Service Fee" value={loan.monthlyServiceFee}
                onChange={(v) => updateLoan(loan.id, 'monthlyServiceFee', v)} prefix="R" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Winners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Lowest Monthly Payment', winner: bestMonthly, value: formatRand(bestMonthly.totalMonthly, 0) + '/mo' },
          { label: 'Lowest Total Cost', winner: bestTotal, value: formatRand(bestTotal.totalCost, 0) + ' above principal' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: `${item.winner.color}0D`, border: `1px solid ${item.winner.color}30` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${item.winner.color}20` }}>
              <Trophy size={14} style={{ color: item.winner.color }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-subtle)' }}>{item.label}</p>
              <p className="text-sm font-bold" style={{ color: item.winner.color }}>
                {item.winner.label} — {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Side-by-Side Comparison
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="py-2 px-3 text-left font-semibold"
                  style={{ color: 'var(--color-text-muted)' }}>Metric</th>
                {results.map((r) => (
                  <th key={r.id} className="py-2 px-3 text-left font-semibold"
                    style={{ color: r.color }}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Loan Amount',             vals: loans.map((l) => formatRand(l.amount, 0)) },
                { label: 'Interest Rate',            vals: loans.map((l) => `${l.interestRate}%`) },
                { label: 'Term',                     vals: loans.map((l) => `${l.termYears} years`) },
                { label: 'Monthly Payment',          vals: results.map((r) => formatRand(r.monthlyPayment, 0)), bestIdx: results.indexOf(bestMonthly) },
                { label: 'Monthly (incl. service fee)', vals: results.map((r) => formatRand(r.totalMonthly, 0)), bestIdx: results.indexOf(bestMonthly) },
                { label: 'Initiation Fee',           vals: loans.map((l) => formatRand(l.initiationFee, 0)) },
                { label: 'Total Service Fees',       vals: loans.map((l) => formatRand(l.monthlyServiceFee * l.termYears * 12, 0)) },
                { label: 'Total Interest Paid',      vals: results.map((r) => formatRand(r.totalInterest, 0)), bestIdx: results.indexOf(results.reduce((a, b) => a.totalInterest < b.totalInterest ? a : b)) },
                { label: 'Total Cost (above principal)', vals: results.map((r) => formatRand(r.totalCost, 0)), bestIdx: results.indexOf(bestTotal) },
                { label: 'Total Repaid',             vals: results.map((r) => formatRand(r.totalRepaid, 0)), bestIdx: results.indexOf(bestTotal) },
                { label: 'Saving vs most expensive', vals: results.map((r) => {
                  const worst = Math.max(...results.map((x) => x.totalCost));
                  const saving = worst - r.totalCost;
                  return saving === 0 ? '—' : `${formatRand(saving, 0)} cheaper`;
                })},
              ].map((row, i) => (
                <tr key={row.label} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                }}>
                  <td className="py-2 px-3 font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}>{row.label}</td>
                  {row.vals.map((val, vi) => (
                    <td key={vi} className="py-2 px-3"
                      style={{ color: row.bestIdx === vi ? C.emerald : 'var(--color-text)', fontWeight: row.bestIdx === vi ? 700 : 400 }}>
                      {val}
                      {row.bestIdx === vi && <span className="ml-1 text-[9px]" style={{ color: C.emerald }}>★</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance over time chart */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Outstanding Balance Over Time
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          How quickly each loan is paid off
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={balanceChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }}
              interval={Math.floor(balanceChart.length / 6)} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
            <Tooltip
              formatter={(v, name) => [formatRand(Number(v), 0), name]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            {loans.map((loan, i) => (
              <Line key={loan.id} type="monotone" dataKey={loan.label}
                stroke={LOAN_COLORS[i % LOAN_COLORS.length]}
                strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Initiation fee cap: SARS/NCA limits initiation fees on home loans. Effective APR is approximate. Not financial advice.
      </p>
    </div>
  );
}
