import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  Wallet, Save, LogIn, Trash2, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, TrendingUp, Lightbulb, ArrowRight,
} from 'lucide-react';
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/ui/InputField';
import { formatRand } from '../utils/format';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Income {
  salary:    number;  // net take-home
  freelance: number;
  rental:    number;
  other:     number;
}

interface Expenses {
  // Needs
  housing:     number;
  transport:   number;
  groceries:   number;
  utilities:   number;
  insurance:   number;
  medical:     number;
  debtRepay:   number;
  // Wants
  dining:      number;
  entertainment: number;
  subscriptions: number;
  clothing:    number;
  personal:    number;
  // Savings
  savings:     number;
  tfsa:        number;
  ra:          number;
  emergency:   number;
}

interface BudgetSnapshot {
  id:        string;
  label:     string;
  savedAt:   Date;
  income:    Income;
  expenses:  Expenses;
  netFlow:   number;
  savingsRate: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  cyan:    '#06B6D4',
  violet:  '#8B5CF6',
  pink:    '#EC4899',
};

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

const DEFAULT_INCOME: Income = {
  salary: 35_000, freelance: 0, rental: 0, other: 0,
};

const DEFAULT_EXP: Expenses = {
  housing: 12_000, transport: 3_000, groceries: 3_500, utilities: 1_500,
  insurance: 2_000, medical: 1_500, debtRepay: 2_000,
  dining: 2_500, entertainment: 1_000, subscriptions: 500, clothing: 800, personal: 700,
  savings: 2_000, tfsa: 500, ra: 1_500, emergency: 500,
};

// ─── Firestore ────────────────────────────────────────────────────────────────

function useBudgetHistory(uid: string | null) {
  const [snapshots, setSnapshots] = useState<BudgetSnapshot[]>([]);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'budgets'), orderBy('savedAt', 'asc'))
      );
      setSnapshots(snap.docs.map((d) => ({
        id:          d.id,
        label:       d.data().label ?? '',
        savedAt:     d.data().savedAt?.toDate() ?? new Date(),
        income:      d.data().income as Income,
        expenses:    d.data().expenses as Expenses,
        netFlow:     d.data().netFlow,
        savingsRate: d.data().savingsRate,
      })));
    } catch { /* ignore */ }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const save = async (label: string, income: Income, expenses: Expenses, netFlow: number, savingsRate: number) => {
    if (!uid) return;
    await setDoc(doc(collection(db, 'users', uid, 'budgets')), {
      label, income, expenses, netFlow, savingsRate, savedAt: serverTimestamp(),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'budgets', id));
    setSnapshots((p) => p.filter((s) => s.id !== id));
  };

  return { snapshots, save, remove };
}

// ─── Insight engine ───────────────────────────────────────────────────────────

interface Insight {
  type: 'warning' | 'good' | 'tip';
  title: string;
  body: string;
  link?: { to: string; label: string };
}

function generateInsights(_income: Income, expenses: Expenses, totals: {
  totalIncome: number; needs: number; wants: number; savingsTotal: number;
  savingsRate: number; housingPct: number; transportPct: number; debtPct: number; netFlow: number;
}): Insight[] {
  const ins: Insight[] = [];
  const ti = totals.totalIncome;
  if (ti === 0) return ins;

  if (totals.housingPct > 30) {
    ins.push({
      type: 'warning',
      title: `Housing is ${totals.housingPct.toFixed(0)}% of income (rule: max 30%)`,
      body: `You're spending ${formatRand(expenses.housing, 0)}/mo on housing. Consider if refinancing or a cheaper property could save you R${Math.round((expenses.housing - ti * 0.30)).toLocaleString('en-ZA')}/mo.`,
    });
  }

  if (totals.debtPct > 15) {
    ins.push({
      type: 'warning',
      title: `Debt repayments are ${totals.debtPct.toFixed(0)}% of income (rule: max 15%)`,
      body: 'High debt burden limits your savings potential. A debt snowball strategy could free up cash faster.',
      link: { to: '/debt-snowball', label: 'Try Debt Snowball' },
    });
  }

  if (totals.savingsRate < 5) {
    ins.push({
      type: 'warning',
      title: `Savings rate: ${totals.savingsRate.toFixed(1)}% — very low`,
      body: 'Aim for at least 15% of income saved. Even R500/mo extra into a TFSA compounds significantly over 20 years.',
      link: { to: '/tfsa', label: 'TFSA Optimizer' },
    });
  } else if (totals.savingsRate >= 20) {
    ins.push({
      type: 'good',
      title: `Strong savings rate: ${totals.savingsRate.toFixed(1)}%`,
      body: 'You\'re saving more than the recommended 15–20%. Check how close you are to financial independence.',
      link: { to: '/fire', label: 'FIRE Calculator' },
    });
  } else if (totals.savingsRate >= 10) {
    ins.push({
      type: 'good',
      title: `Savings rate: ${totals.savingsRate.toFixed(1)}%`,
      body: `Good progress. Pushing to 20% would save you ${formatRand((ti * 0.20 - totals.savingsTotal), 0)} more per month.`,
    });
  }

  if (expenses.dining + expenses.entertainment + expenses.subscriptions > ti * 0.15) {
    const wantSpend = expenses.dining + expenses.entertainment + expenses.subscriptions;
    ins.push({
      type: 'tip',
      title: 'Dining, entertainment & subscriptions are eating into savings',
      body: `R${wantSpend.toLocaleString('en-ZA')}/mo on these categories. Cutting by 25% (R${Math.round(wantSpend * 0.25).toLocaleString('en-ZA')}/mo) invested at 12% p.a. = R${Math.round(wantSpend * 0.25 * 12 * 20 * 1.12 ** 10 / 10).toLocaleString('en-ZA')} in 10 years.`,
    });
  }

  if (totals.netFlow < 0) {
    ins.push({
      type: 'warning',
      title: `Spending ${formatRand(Math.abs(totals.netFlow), 0)}/mo more than you earn`,
      body: 'Your budget is in deficit. Review wants and discretionary spending to find immediate savings.',
    });
  } else if (totals.netFlow > 0 && totals.savingsRate < 15) {
    ins.push({
      type: 'tip',
      title: `You have ${formatRand(totals.netFlow, 0)}/mo unallocated`,
      body: `Move this surplus into your TFSA or emergency fund before it gets spent.`,
      link: { to: '/tfsa', label: 'Open TFSA Optimizer' },
    });
  }

  if (expenses.ra < ti * 0.05) {
    ins.push({
      type: 'tip',
      title: 'RA contribution could be higher',
      body: `Contributing 27.5% to an RA is fully tax-deductible. At your income level, topping up your RA saves PAYE and grows tax-free.`,
      link: { to: '/ra-planner', label: 'RA Planner' },
    });
  }

  return ins;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BudgetPlanner() {
  const { user, signIn } = useAuth();
  const { snapshots, save, remove } = useBudgetHistory(user?.uid ?? null);

  const [income,   setIncome]   = useState<Income>(DEFAULT_INCOME);
  const [expenses, setExpenses] = useState<Expenses>(DEFAULT_EXP);
  const [saveLabel, setSaveLabel] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSection, setActiveSection] = useState<'needs' | 'wants' | 'savings'>('needs');

  const totalIncome = useMemo(() => Object.values(income).reduce((s, v) => s + (v || 0), 0), [income]);

  const needs = useMemo(() =>
    expenses.housing + expenses.transport + expenses.groceries + expenses.utilities +
    expenses.insurance + expenses.medical + expenses.debtRepay, [expenses]);

  const wants = useMemo(() =>
    expenses.dining + expenses.entertainment + expenses.subscriptions +
    expenses.clothing + expenses.personal, [expenses]);

  const savingsTotal = useMemo(() =>
    expenses.savings + expenses.tfsa + expenses.ra + expenses.emergency, [expenses]);

  const totalSpend  = needs + wants + savingsTotal;
  const netFlow     = totalIncome - totalSpend;
  const savingsRate = totalIncome > 0 ? (savingsTotal / totalIncome) * 100 : 0;
  const housingPct  = totalIncome > 0 ? (expenses.housing  / totalIncome) * 100 : 0;
  const transportPct = totalIncome > 0 ? (expenses.transport / totalIncome) * 100 : 0;
  const debtPct     = totalIncome > 0 ? (expenses.debtRepay / totalIncome) * 100 : 0;
  const needsPct    = totalIncome > 0 ? (needs / totalIncome) * 100 : 0;
  const wantsPct    = totalIncome > 0 ? (wants / totalIncome) * 100 : 0;
  const savingsPct  = totalIncome > 0 ? (savingsTotal / totalIncome) * 100 : 0;

  const insights = useMemo(() => generateInsights(income, expenses, {
    totalIncome, needs, wants, savingsTotal, savingsRate, housingPct, transportPct, debtPct, netFlow,
  }), [income, expenses, totalIncome, needs, wants, savingsTotal, savingsRate, housingPct, transportPct, debtPct, netFlow]);

  // 50/30/20 pie
  const pieData = [
    { name: 'Needs',   value: needs,        color: C.indigo,  target: totalIncome * 0.50 },
    { name: 'Wants',   value: wants,        color: C.amber,   target: totalIncome * 0.30 },
    { name: 'Savings', value: savingsTotal, color: C.emerald, target: totalIncome * 0.20 },
    ...(netFlow > 0 ? [{ name: 'Unallocated', value: netFlow, color: '#334155', target: 0 }] : []),
  ];

  // Trend chart from history
  const trendData = useMemo(() => snapshots.map((s) => ({
    label:       s.label,
    savingsRate: parseFloat(s.savingsRate.toFixed(1)),
    netFlow:     s.netFlow,
    income:      Object.values(s.income).reduce((a, v) => a + v, 0),
  })), [snapshots]);

  const updateInc = (field: keyof Income, v: string) =>
    setIncome((p) => ({ ...p, [field]: parseFloat(v) || 0 }));
  const updateExp = (field: keyof Expenses, v: string) =>
    setExpenses((p) => ({ ...p, [field]: parseFloat(v) || 0 }));

  const handleSave = async () => {
    if (!user) { await signIn(); return; }
    setSaving(true);
    try {
      await save(
        saveLabel || new Date().toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }),
        income, expenses, netFlow, savingsRate
      );
      setSaveLabel('');
    } finally { setSaving(false); }
  };

  const EXPENSE_SECTIONS = {
    needs: [
      { key: 'housing'   as keyof Expenses, label: 'Housing / Rent / Bond' },
      { key: 'transport' as keyof Expenses, label: 'Transport / Fuel' },
      { key: 'groceries' as keyof Expenses, label: 'Groceries' },
      { key: 'utilities' as keyof Expenses, label: 'Utilities (water, electricity)' },
      { key: 'insurance' as keyof Expenses, label: 'Insurance (car, home, life)' },
      { key: 'medical'   as keyof Expenses, label: 'Medical Aid Premium' },
      { key: 'debtRepay' as keyof Expenses, label: 'Debt Repayments' },
    ],
    wants: [
      { key: 'dining'         as keyof Expenses, label: 'Dining Out / Takeaways' },
      { key: 'entertainment'  as keyof Expenses, label: 'Entertainment' },
      { key: 'subscriptions'  as keyof Expenses, label: 'Subscriptions (Netflix, etc.)' },
      { key: 'clothing'       as keyof Expenses, label: 'Clothing & Shopping' },
      { key: 'personal'       as keyof Expenses, label: 'Personal Care / Other' },
    ],
    savings: [
      { key: 'savings'   as keyof Expenses, label: 'General Savings' },
      { key: 'tfsa'      as keyof Expenses, label: 'TFSA Contribution' },
      { key: 'ra'        as keyof Expenses, label: 'Retirement Annuity' },
      { key: 'emergency' as keyof Expenses, label: 'Emergency Fund' },
    ],
  };

  const sectionColor = { needs: C.indigo, wants: C.amber, savings: C.emerald };
  const sectionLabel = { needs: 'Needs', wants: 'Wants', savings: 'Savings / Investing' };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Wallet size={20} className="text-[#10B981]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Budget Planner
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              50/30/20 budget analysis with personalised insights — saved to your account
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPI strip */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Monthly Income',  value: formatRand(totalIncome, 0),  color: C.emerald },
          { label: 'Total Spend',     value: formatRand(totalSpend, 0),   color: C.red     },
          { label: 'Savings Rate',    value: `${savingsRate.toFixed(1)}%`,
            color: savingsRate >= 20 ? C.emerald : savingsRate >= 10 ? C.amber : C.red,
            sub: savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Good' : 'Needs work' },
          { label: 'Net Flow',        value: formatRand(netFlow, 0),
            color: netFlow >= 0 ? C.emerald : C.red,
            sub: netFlow >= 0 ? 'surplus' : 'deficit' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card-static p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-text-subtle)' }}>{kpi.label}</p>
            <p className="text-lg font-bold leading-tight"
              style={{ color: kpi.color, fontFamily: 'var(--font-heading)' }}>{kpi.value}</p>
            {'sub' in kpi && kpi.sub && (
              <p className="text-[10px] mt-0.5" style={{ color: kpi.color }}>{kpi.sub}</p>
            )}
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left: Income + Expenses */}
        <div className="space-y-4">

          {/* Income */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
            className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold" style={{ color: C.emerald, fontFamily: 'var(--font-heading)' }}>Income (net / after tax)</p>
              <span className="text-xs font-semibold" style={{ color: C.emerald }}>{formatRand(totalIncome, 0)}/mo</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField id="salary"    label="Take-Home Salary" value={income.salary}    onChange={(v) => updateInc('salary', v)}    prefix="R"
                help="Use Salary Calculator for exact net pay" />
              <InputField id="freelance" label="Freelance"        value={income.freelance} onChange={(v) => updateInc('freelance', v)} prefix="R" />
              <InputField id="rental"    label="Rental Income"    value={income.rental}    onChange={(v) => updateInc('rental', v)}    prefix="R" />
              <InputField id="other"     label="Other Income"     value={income.other}     onChange={(v) => updateInc('other', v)}     prefix="R" />
            </div>
            <Link to="/salary" className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: C.indigo }}>
              <TrendingUp size={12} /> Calculate exact take-home <ArrowRight size={11} />
            </Link>
          </motion.div>

          {/* Expense section tabs */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-5">
            <div className="flex gap-2 mb-4">
              {(['needs', 'wants', 'savings'] as const).map((s) => (
                <button key={s}
                  onClick={() => setActiveSection(s)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: activeSection === s ? `${sectionColor[s]}18` : 'rgba(255,255,255,0.04)',
                    color: activeSection === s ? sectionColor[s] : 'var(--color-text-muted)',
                    border: `1px solid ${activeSection === s ? sectionColor[s] + '35' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  {sectionLabel[s]}
                  <span className="block text-[10px] mt-0.5"
                    style={{ color: activeSection === s ? sectionColor[s] : 'var(--color-text-subtle)' }}>
                    {activeSection === s
                      ? `${formatRand(activeSection === 'needs' ? needs : activeSection === 'wants' ? wants : savingsTotal, 0)}/mo`
                      : `${(activeSection === 'needs' ? needsPct : activeSection === 'wants' ? wantsPct : savingsPct).toFixed(0)}%`}
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {EXPENSE_SECTIONS[activeSection].map((f) => (
                <InputField key={f.key} id={f.key} label={f.label} value={expenses[f.key]}
                  onChange={(v) => updateExp(f.key, v)} prefix="R" />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: 50/30/20 + Insights */}
        <div className="space-y-4">

          {/* Pie + 50/30/20 bars */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              50/30/20 Budget Split
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                    paddingAngle={2} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 w-full">
                {[
                  { name: 'Needs', actual: needsPct, target: 50, value: needs, color: C.indigo },
                  { name: 'Wants', actual: wantsPct, target: 30, value: wants, color: C.amber },
                  { name: 'Savings', actual: savingsPct, target: 20, value: savingsTotal, color: C.emerald },
                ].map((row) => (
                  <div key={row.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: row.color, fontWeight: 600 }}>{row.name}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {formatRand(row.value, 0)} &middot; {row.actual.toFixed(1)}% <span style={{ color: 'var(--color-text-subtle)' }}>(target {row.target}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(row.actual / row.target * 100, 150)}%`, background: row.color,
                          opacity: row.actual > row.target * 1.1 ? 0.7 : 1 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Insights */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              <Lightbulb size={14} style={{ color: C.amber }} /> Insights & Suggestions
            </p>
            {insights.length === 0 && (
              <div className="glass-card-static p-4 flex items-center gap-2">
                <CheckCircle2 size={16} style={{ color: C.emerald }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Your budget looks solid! Keep tracking monthly.</p>
              </div>
            )}
            {insights.map((ins, i) => (
              <div key={i} className="glass-card-static p-4 space-y-1.5"
                style={{
                  borderLeft: `3px solid ${ins.type === 'warning' ? C.red : ins.type === 'good' ? C.emerald : C.amber}`,
                }}>
                <div className="flex items-start gap-2">
                  {ins.type === 'warning'
                    ? <AlertCircle size={14} style={{ color: C.red, flexShrink: 0, marginTop: 1 }} />
                    : ins.type === 'good'
                    ? <CheckCircle2 size={14} style={{ color: C.emerald, flexShrink: 0, marginTop: 1 }} />
                    : <Lightbulb size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />}
                  <p className="text-xs font-semibold leading-tight"
                    style={{ color: ins.type === 'warning' ? C.red : ins.type === 'good' ? C.emerald : C.amber }}>
                    {ins.title}
                  </p>
                </div>
                <p className="text-xs leading-relaxed pl-5" style={{ color: 'var(--color-text-muted)' }}>{ins.body}</p>
                {ins.link && (
                  <Link to={ins.link.to} className="ml-5 flex items-center gap-1 text-xs font-semibold"
                    style={{ color: C.indigo }}>
                    {ins.link.label} <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Save */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card p-5">
        <p className="text-sm font-semibold mb-2"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Save Monthly Snapshot
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Save your budget to track how your spending and savings rate change over time.
        </p>
        <div className="flex gap-3 flex-wrap">
          <input
            className="flex-1 min-w-[160px] px-3 py-2 rounded-xl text-sm bg-transparent border outline-none"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'var(--color-text)' }}
            placeholder={`e.g. ${new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`}
            value={saveLabel}
            onChange={(e) => setSaveLabel(e.target.value)}
          />
          {user ? (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(16,185,129,0.15)', color: C.emerald, border: `1px solid rgba(16,185,129,0.3)` }}>
              <Save size={14} />{saving ? 'Saving…' : 'Save Snapshot'}
            </button>
          ) : (
            <button onClick={signIn}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(16,185,129,0.15)', color: C.emerald, border: `1px solid rgba(16,185,129,0.3)` }}>
              <LogIn size={14} />Sign in to Save
            </button>
          )}
        </div>
      </motion.div>

      {/* Trend chart */}
      {trendData.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Savings Rate Trend
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.emerald} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.emerald} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v, name) => name === 'Savings Rate' ? [`${v}%`, name] : [formatRand(Number(v), 0), name]} contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Area type="monotone" dataKey="savingsRate" name="Savings Rate" stroke={C.emerald} strokeWidth={2} fill="url(#gradSR)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* History */}
      {user && snapshots.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card-static p-5">
          <button className="flex items-center gap-2 w-full text-left"
            onClick={() => setShowHistory((v) => !v)}>
            <p className="text-sm font-semibold flex-1"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Budget History ({snapshots.length})
            </p>
            {showHistory
              ? <ChevronUp size={15} style={{ color: 'var(--color-text-muted)' }} />
              : <ChevronDown size={15} style={{ color: 'var(--color-text-muted)' }} />}
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 space-y-2">
                  {[...snapshots].reverse().map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{s.label}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {s.savedAt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold"
                          style={{ color: s.savingsRate >= 15 ? C.emerald : s.savingsRate >= 5 ? C.amber : C.red }}>
                          {s.savingsRate.toFixed(1)}% saved
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                          {s.netFlow >= 0 ? '+' : ''}{formatRand(s.netFlow, 0)} flow
                        </p>
                      </div>
                      <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg"
                        style={{ color: C.red, background: 'rgba(239,68,68,0.08)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Saved securely to your account. Not financial advice.
      </p>
    </div>
  );
}
