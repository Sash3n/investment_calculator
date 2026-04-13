import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine,
} from 'recharts';
import { Snowflake, Plus, Trash2, Trophy, ArrowUpDown } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Debt {
  id:          number;
  name:        string;
  balance:     number;
  rate:        number;   // annual %
  minPayment:  number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  cyan:    '#06B6D4',
  violet:  '#8B5CF6',
};

const DEBT_COLORS = [C.indigo, C.amber, C.emerald, C.cyan, C.violet, C.red];

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

// ─── Payoff simulation ────────────────────────────────────────────────────────

interface PayoffResult {
  months:       number;
  totalInterest:number;
  order:        { id: number; name: string; paidOffMonth: number }[];
  monthlyData:  { month: number; totalBalance: number; interest: number }[];
}

function simulateDebts(debts: Debt[], extraPayment: number, strategy: 'snowball' | 'avalanche'): PayoffResult {
  const active = debts.filter((d) => d.balance > 0 && d.minPayment > 0);
  if (!active.length) return { months: 0, totalInterest: 0, order: [], monthlyData: [] };

  const sorted = [...active].sort((a, b) =>
    strategy === 'snowball' ? a.balance - b.balance : b.rate - a.rate
  );

  const balances: Record<number, number> = {};
  for (const d of sorted) balances[d.id] = d.balance;

  const paidOff = new Set<number>();
  const order: { id: number; name: string; paidOffMonth: number }[] = [];
  let totalInterest = 0;
  let month = 0;
  const monthlyData: { month: number; totalBalance: number; interest: number }[] = [];

  while (Object.values(balances).some((b) => b > 0.5) && month < 600) {
    month++;
    let monthInterest = 0;

    // Accrue interest
    for (const d of sorted) {
      if (balances[d.id] > 0) {
        const interest = balances[d.id] * (d.rate / 100 / 12);
        balances[d.id] += interest;
        monthInterest += interest;
      }
    }
    totalInterest += monthInterest;

    // Calculate freed minimums from already paid off debts
    const freedMinimums = sorted
      .filter((d) => paidOff.has(d.id))
      .reduce((s, d) => s + d.minPayment, 0);
    const totalExtra = extraPayment + freedMinimums;

    // Apply min payments
    for (const d of sorted) {
      if (!paidOff.has(d.id) && balances[d.id] > 0) {
        const pmt = Math.min(d.minPayment, balances[d.id]);
        balances[d.id] -= pmt;
      }
    }

    // Apply extra to first debt in priority order
    let remainExtra = totalExtra;
    for (const d of sorted) {
      if (!paidOff.has(d.id) && balances[d.id] > 0 && remainExtra > 0) {
        const pmt = Math.min(remainExtra, balances[d.id]);
        balances[d.id] -= pmt;
        remainExtra -= pmt;
      }
    }

    // Mark paid off
    for (const d of sorted) {
      if (!paidOff.has(d.id) && balances[d.id] <= 0.5) {
        balances[d.id] = 0;
        paidOff.add(d.id);
        order.push({ id: d.id, name: d.name, paidOffMonth: month });
      }
    }

    monthlyData.push({
      month,
      totalBalance: Math.round(Object.values(balances).reduce((s, b) => s + Math.max(0, b), 0)),
      interest: Math.round(monthInterest),
    });
  }

  return { months: month, totalInterest: Math.round(totalInterest), order, monthlyData };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DebtSnowball() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: 1, name: 'Credit Card',  balance: 25_000, rate: 22.0, minPayment: 600  },
    { id: 2, name: 'Personal Loan', balance: 50_000, rate: 18.5, minPayment: 1_200 },
    { id: 3, name: 'Car Loan',     balance: 120_000, rate: 12.0, minPayment: 2_800 },
  ]);
  const [extraPayment, setExtraPayment] = useState(1_000);
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');

  const nextId = Math.max(0, ...debts.map((d) => d.id)) + 1;

  const addDebt = () => {
    setDebts([...debts, { id: nextId, name: `Debt ${nextId}`, balance: 10_000, rate: 15, minPayment: 300 }]);
  };

  const removeDebt = (id: number) => setDebts(debts.filter((d) => d.id !== id));
  const updateDebt = (id: number, field: keyof Debt, val: string) =>
    setDebts(debts.map((d) =>
      d.id === id ? { ...d, [field]: field === 'name' ? val : parseFloat(val) || 0 } : d
    ));

  const snowballResult  = useMemo(() => simulateDebts(debts, extraPayment, 'snowball'),  [debts, extraPayment]);
  const avalancheResult = useMemo(() => simulateDebts(debts, extraPayment, 'avalanche'), [debts, extraPayment]);
  const activeResult    = strategy === 'snowball' ? snowballResult : avalancheResult;

  const interestSavedVsAvalanche = snowballResult.totalInterest - avalancheResult.totalInterest;
  const monthsSavedVsAvalanche   = snowballResult.months - avalancheResult.months;

  const totalBalance  = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPay   = debts.reduce((s, d) => s + d.minPayment, 0);

  // Bar chart: compare strategies
  const comparisonData = [
    {
      strategy: 'Snowball',
      months:   snowballResult.months,
      interest: Math.round(snowballResult.totalInterest),
    },
    {
      strategy: 'Avalanche',
      months:   avalancheResult.months,
      interest: Math.round(avalancheResult.totalInterest),
    },
  ];

  // Thin chart data to ~60 points
  const thinChart = (data: typeof activeResult.monthlyData) => {
    if (data.length <= 60) return data;
    const step = Math.ceil(data.length / 60);
    return data.filter((_, i) => i % step === 0);
  };

  const chartData = thinChart(activeResult.monthlyData);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)' }}>
            <Snowflake size={20} className="text-[#06B6D4]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Debt Snowball / Avalanche
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Find the fastest path to debt freedom — compare both strategies
            </p>
          </div>
        </div>
      </motion.div>

      {/* Strategy selector */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="flex flex-col sm:flex-row gap-3">
        {([
          { key: 'snowball'  as const, label: 'Snowball', sub: 'Pay smallest balance first — quick wins build momentum', color: C.cyan },
          { key: 'avalanche' as const, label: 'Avalanche', sub: 'Pay highest interest first — mathematically optimal', color: C.amber },
        ]).map((s) => (
          <button key={s.key} onClick={() => setStrategy(s.key)}
            className="flex-1 p-4 rounded-xl text-left transition-all"
            style={{
              background: strategy === s.key ? `${s.color}12` : 'rgba(255,255,255,0.03)',
              border: `2px solid ${strategy === s.key ? s.color + '40' : 'rgba(255,255,255,0.08)'}`,
            }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <p className="text-sm font-bold" style={{ color: strategy === s.key ? s.color : 'var(--color-text)' }}>
                {s.label}
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.sub}</p>
          </button>
        ))}
      </motion.div>

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Debt',       value: formatRand(totalBalance, 0),             color: C.red    },
          { label: 'Min Payments/mo',  value: formatRand(totalMinPay, 0),              color: C.amber  },
          { label: 'Debt-Free In',     value: `${activeResult.months} months`,         color: C.cyan,
            sub: `${(activeResult.months / 12).toFixed(1)} years` },
          { label: 'Total Interest',   value: formatRand(activeResult.totalInterest, 0), color: C.red  },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card-static p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-text-subtle)' }}>{kpi.label}</p>
            <p className="text-base font-bold leading-tight"
              style={{ color: kpi.color, fontFamily: 'var(--font-heading)' }}>{kpi.value}</p>
            {'sub' in kpi && kpi.sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{kpi.sub}</p>}
          </div>
        ))}
      </motion.div>

      {/* Avalanche advantage banner */}
      {Math.abs(interestSavedVsAvalanche) > 100 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <ArrowUpDown size={16} style={{ color: C.amber, flexShrink: 0 }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {interestSavedVsAvalanche > 0
              ? <>Avalanche saves <strong style={{ color: C.amber }}>{formatRand(interestSavedVsAvalanche, 0)}</strong> in interest and <strong style={{ color: C.amber }}>{Math.abs(monthsSavedVsAvalanche)} months</strong> vs Snowball</>
              : <>Snowball saves <strong style={{ color: C.cyan }}>{formatRand(Math.abs(interestSavedVsAvalanche), 0)}</strong> in interest vs Avalanche (your debts have similar rates)</>}
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Debt inputs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Your Debts</p>
            <button onClick={addDebt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid rgba(99,102,241,0.25)` }}>
              <Plus size={12} /> Add Debt
            </button>
          </div>

          {debts.map((debt, idx) => (
            <div key={debt.id} className="p-4 rounded-xl space-y-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: DEBT_COLORS[idx % DEBT_COLORS.length] }} />
                <input
                  value={debt.name}
                  onChange={(e) => updateDebt(debt.id, 'name', e.target.value)}
                  className="flex-1 text-sm font-semibold bg-transparent border-0 outline-none"
                  style={{ color: DEBT_COLORS[idx % DEBT_COLORS.length] }}
                />
                {debts.length > 1 && (
                  <button onClick={() => removeDebt(debt.id)}
                    className="p-1 rounded-lg" style={{ color: C.red, background: 'rgba(239,68,68,0.08)' }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <InputField id={`bal-${debt.id}`} label="Balance" value={debt.balance}
                  onChange={(v) => updateDebt(debt.id, 'balance', v)} prefix="R" />
                <InputField id={`rate-${debt.id}`} label="Rate" value={debt.rate}
                  onChange={(v) => updateDebt(debt.id, 'rate', v)} suffix="%" step={0.5} />
                <InputField id={`min-${debt.id}`} label="Min Pay" value={debt.minPayment}
                  onChange={(v) => updateDebt(debt.id, 'minPayment', v)} prefix="R" />
              </div>
            </div>
          ))}

          <InputField id="extra" label="Extra Monthly Payment" value={extraPayment}
            onChange={(v) => setExtraPayment(parseFloat(v) || 0)} prefix="R"
            help="Amount above minimum payments applied to target debt" />
        </motion.div>

        {/* Payoff order + comparison */}
        <div className="space-y-4">

          {/* Payoff order */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Payoff Order ({strategy === 'snowball' ? 'Snowball' : 'Avalanche'})
            </p>
            <div className="space-y-2">
              {activeResult.order.map((o, i) => {
                const debt = debts.find((d) => d.id === o.id);
                const color = DEBT_COLORS[debts.indexOf(debt!) % DEBT_COLORS.length];
                return (
                  <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: `${color}0D`, border: `1px solid ${color}20` }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${color}25`, color }}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color }}>{o.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Month {o.paidOffMonth} ({(o.paidOffMonth / 12).toFixed(1)} yrs)
                      </p>
                    </div>
                    {i === 0 && <Trophy size={14} style={{ color: C.amber }} />}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Strategy comparison chart */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Strategy Comparison
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={comparisonData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
                <YAxis type="category" dataKey="strategy" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="interest" name="Total Interest" fill={C.red} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>

      {/* Balance over time chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Total Debt Balance Over Time
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          ({strategy === 'snowball' ? 'Snowball' : 'Avalanche'} strategy with {formatRand(extraPayment, 0)}/mo extra)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `Mo ${v}`} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
            <Tooltip
              formatter={(v, name) => [formatRand(Number(v), 0), name]}
              labelFormatter={(l) => `Month ${l}`}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="totalBalance" name="Remaining Debt" stroke={C.red} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Simulation assumes constant interest rates and minimum payments. Not financial advice.
      </p>
    </div>
  );
}
