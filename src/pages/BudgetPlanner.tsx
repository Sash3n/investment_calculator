import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  Plus, Trash2, Tag, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet, X, Check,
  Pencil, LogIn, BarChart3,
} from 'lucide-react';
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  addDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { formatRand, formatRandShort } from '../utils/format';
import { alpha, SERIES, tokenColor, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BudgetTag {
  id:       string;
  name:     string;
  color:    string;
  type:     'income' | 'expense' | 'both';
}

export interface Transaction {
  id:          string;
  description: string;
  amount:      number;
  type:        'income' | 'expense';
  tagId:       string;
  tagName:     string;
  tagColor:    string;
  yearMonth:   string;   // "2026-04"
  date:        string;   // "2026-04-15"
  createdAt:   Date;
}

// ─── Colour palette ────────────────────────────────────────────────────────────

// Tag colours on offer: the chart series plus neutrals
const PALETTE = [...SERIES, 'var(--warn)', 'var(--ink-subtle)', 'var(--ink-muted)'];

// ─── SA-relevant default tags ─────────────────────────────────────────────────

const DEFAULT_TAGS: Omit<BudgetTag, 'id'>[] = [
  // Income
  { name: 'Salary',           color: 'var(--gain)', type: 'income'  },
  { name: 'Freelance',        color: 'var(--note-teal)', type: 'income'  },
  { name: 'Rental Income',    color: 'var(--note-brown)', type: 'income'  },
  { name: 'Medical Aid (CTC)',color: 'var(--note-red)', type: 'income'  },
  { name: 'Other Income',     color: 'var(--ink-subtle)', type: 'income'  },
  // Expense
  { name: 'Bond / Rent',      color: 'var(--note-blue)', type: 'expense' },
  { name: 'Rates & Levies',   color: 'var(--note-orange)', type: 'expense' },
  { name: 'Groceries',        color: 'var(--gain)', type: 'expense' },
  { name: 'Fuel',             color: 'var(--note-orange)', type: 'expense' },
  { name: 'Medical Aid',      color: 'var(--note-red)', type: 'expense' },
  { name: 'Discovery',        color: 'var(--note-red)', type: 'expense' },
  { name: 'Payflex',          color: 'var(--loss)', type: 'expense' },
  { name: 'Education',        color: 'var(--note-brown)', type: 'expense' },
  { name: 'Subscriptions',    color: 'var(--note-teal)', type: 'expense' },
  { name: 'Entertainment',    color: 'var(--note-orange)', type: 'expense' },
  { name: 'Insurance',        color: 'var(--ink-subtle)', type: 'expense' },
  { name: 'Investment',       color: 'var(--gain)', type: 'expense' },
  { name: 'Transport',        color: 'var(--note-blue)', type: 'expense' },
  { name: 'Other',            color: 'var(--ink-muted)', type: 'both'    },
];

const TOOLTIP_STYLE = {
  background: 'color-mix(in srgb, var(--paper-raised) 95%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
  borderRadius: 10, fontSize: 12, color: 'var(--ink)',
};

// ─── Month helpers ─────────────────────────────────────────────────────────────

function toYearMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function parseYM(ym: string): Date {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1);
}
function fmtYM(ym: string) {
  return parseYM(ym).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}
function prevMonth(ym: string) {
  const d = parseYM(ym); d.setMonth(d.getMonth() - 1); return toYearMonth(d);
}
function nextMonth(ym: string) {
  const d = parseYM(ym); d.setMonth(d.getMonth() + 1); return toYearMonth(d);
}
function quarterOf(ym: string) {
  const m = parseInt(ym.split('-')[1]);
  return Math.ceil(m / 3);
}
function monthsInQuarter(ym: string) {
  const [y] = ym.split('-');
  const q   = quarterOf(ym);
  const start = (q - 1) * 3 + 1;
  return [1, 2, 3].map((i) => `${y}-${String(start + i - 1).padStart(2, '0')}`);
}

// ─── Firestore hooks ───────────────────────────────────────────────────────────

function useBudgetTags(uid: string | null) {
  const [tags, setTags] = useState<BudgetTag[]>([]);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const snap = await getDocs(query(collection(db, 'users', uid, 'budget_tags'), orderBy('name')));
      if (snap.empty) {
        // Seed defaults on first use
        const seeded: BudgetTag[] = [];
        for (const t of DEFAULT_TAGS) {
          const ref = await addDoc(collection(db, 'users', uid, 'budget_tags'), { ...t, createdAt: serverTimestamp() });
          seeded.push({ ...t, id: ref.id });
        }
        setTags(seeded);
      } else {
        setTags(snap.docs.map((d) => { const t = { id: d.id, ...d.data() } as BudgetTag; return { ...t, color: tokenColor(t.color) }; }));
      }
    } catch { /* offline — keep empty */ }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const addTag = async (name: string, color: string, type: BudgetTag['type']) => {
    if (!uid) return;
    const ref = await addDoc(collection(db, 'users', uid, 'budget_tags'), { name, color, type, createdAt: serverTimestamp() });
    setTags((p) => [...p, { id: ref.id, name, color, type }].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const removeTag = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'budget_tags', id));
    setTags((p) => p.filter((t) => t.id !== id));
  };

  const renameTag = async (id: string, name: string) => {
    if (!uid) return;
    await setDoc(doc(db, 'users', uid, 'budget_tags', id), { name }, { merge: true });
    setTags((p) => p.map((t) => t.id === id ? { ...t, name } : t));
  };

  return { tags, addTag, removeTag, renameTag, reload: load };
}

function useTransactions(uid: string | null) {
  const [all, setAll] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'budget_transactions'), orderBy('date', 'desc'))
      );
      setAll(snap.docs.map((d) => ({
        id:          d.id,
        description: d.data().description,
        amount:      d.data().amount,
        type:        d.data().type,
        tagId:       d.data().tagId,
        tagName:     d.data().tagName,
        tagColor:    tokenColor(d.data().tagColor ?? ""),
        yearMonth:   d.data().yearMonth,
        date:        d.data().date,
        createdAt:   d.data().createdAt?.toDate() ?? new Date(),
      })));
    } catch { /* offline */ }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const addTx = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!uid) return;
    const ref = await addDoc(collection(db, 'users', uid, 'budget_transactions'), {
      ...tx, createdAt: serverTimestamp(),
    });
    setAll((p) => [{ ...tx, id: ref.id, createdAt: new Date() }, ...p]);
  };

  const removeTx = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'budget_transactions', id));
    setAll((p) => p.filter((t) => t.id !== id));
  };

  return { all, addTx, removeTx };
}

// ─── Small components ──────────────────────────────────────────────────────────

function TagBadge({ tag, onRemove }: { tag: BudgetTag; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: alpha(tag.color, 9), color: textTone(tag.color), border: `1px solid ${alpha(tag.color, 19)}` }}>
      {tag.name}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-70">
          <X size={9} />
        </button>
      )}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function BudgetPlanner() {
  const { user, signIn } = useAuth();
  const { tags, addTag, removeTag, renameTag } = useBudgetTags(user?.uid ?? null);
  const { all, addTx, removeTx } = useTransactions(user?.uid ?? null);

  // ── View state ──
  const [currentYM,   setCurrentYM]   = useState(() => toYearMonth(new Date()));
  const [viewMode,    setViewMode]    = useState<'monthly' | 'quarterly'>('monthly');
  const [showTagMgr,  setShowTagMgr]  = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // ── Add transaction form ──
  const [form, setForm] = useState({
    description: '',
    amount:      '',
    type:        'expense' as 'income' | 'expense',
    tagId:       '',
    date:        new Date().toISOString().slice(0, 10),
  });

  // ── Tag manager state ──
  const [newTagName,   setNewTagName]   = useState('');
  const [newTagColor,  setNewTagColor]  = useState(PALETTE[0]);
  const [newTagType,   setNewTagType]   = useState<BudgetTag['type']>('expense');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName,  setEditingName]  = useState('');

  // ── Derived data ───────────────────────────────────────────────────────────

  const monthTxs = useMemo(
    () => all.filter((t) => t.yearMonth === currentYM),
    [all, currentYM]
  );

  const income   = useMemo(() => monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTxs]);
  const expenses = useMemo(() => monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTxs]);
  const net      = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  // Breakdown by tag — expense
  const expByTag = useMemo(() => {
    const map: Record<string, { name: string; color: string; value: number }> = {};
    for (const t of monthTxs.filter((t) => t.type === 'expense')) {
      if (!map[t.tagId]) map[t.tagId] = { name: t.tagName, color: t.tagColor, value: 0 };
      map[t.tagId].value += t.amount;
    }
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [monthTxs]);

  // Breakdown by tag — income
  const incByTag = useMemo(() => {
    const map: Record<string, { name: string; color: string; value: number }> = {};
    for (const t of monthTxs.filter((t) => t.type === 'income')) {
      if (!map[t.tagId]) map[t.tagId] = { name: t.tagName, color: t.tagColor, value: 0 };
      map[t.tagId].value += t.amount;
    }
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [monthTxs]);

  // Quarterly data
  const quarterMonths = useMemo(() => monthsInQuarter(currentYM), [currentYM]);
  const quarterData   = useMemo(() => quarterMonths.map((ym) => {
    const txs  = all.filter((t) => t.yearMonth === ym);
    const inc  = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp  = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { ym, label: parseYM(ym).toLocaleDateString('en-ZA', { month: 'short' }), income: inc, expenses: exp, net: inc - exp };
  }), [all, quarterMonths]);

  // Available tags for form (filtered by transaction type)
  const filteredTags = useMemo(
    () => tags.filter((t) => t.type === form.type || t.type === 'both'),
    [tags, form.type]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddTx = async () => {
    const amt  = parseFloat(form.amount);
    const tag  = tags.find((t) => t.id === form.tagId);
    if (!form.description || !(amt > 0) || !tag || !user) return;
    const ym   = form.date.slice(0, 7);
    await addTx({
      description: form.description,
      amount:      amt,
      type:        form.type,
      tagId:       tag.id,
      tagName:     tag.name,
      tagColor:    tag.color,
      yearMonth:   ym,
      date:        form.date,
    });
    setForm((f) => ({ ...f, description: '', amount: '' }));
    setShowAddForm(false);
    // Switch view to the month of the added transaction
    setCurrentYM(ym);
  };

  const handleAddTag = async () => {
    if (!newTagName.trim() || !user) return;
    await addTag(newTagName.trim(), newTagColor, newTagType);
    setNewTagName('');
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    await renameTag(id, editingName.trim());
    setEditingTagId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const amountError = form.amount !== '' && !(parseFloat(form.amount) > 0) ? 'Enter an amount above zero.' : undefined;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--gain) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 25%, transparent)' }}>
            <Wallet size={20} className="text-gain-ink" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Budget Tracker
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Log real transactions · custom tags · monthly & quarterly view
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Monthly / Quarterly toggle */}
            {(['monthly', 'quarterly'] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: viewMode === m ? 'color-mix(in srgb, var(--gain) 15%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                  color: viewMode === m ? 'var(--gain-ink)' : 'var(--ink-muted)',
                  border: `1px solid ${viewMode === m ? 'color-mix(in srgb, var(--gain) 30%, transparent)' : 'color-mix(in srgb, var(--ink) 10%, transparent)'}`,
                }}>
                {m === 'monthly' ? 'Monthly' : 'Quarterly'}
              </button>
            ))}
            <button onClick={() => setShowTagMgr((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', color: 'var(--note-blue-ink)', border: '1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)' }}>
              <Tag size={12} /> Tags
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Month navigator ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.04 }}
        className="flex items-center gap-3">
        <button onClick={() => setCurrentYM(prevMonth(currentYM))}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'color-mix(in srgb, var(--ink) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 10%, transparent)', color: 'var(--ink-muted)' }}>
          <ChevronLeft size={15} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-base font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            {viewMode === 'monthly' ? fmtYM(currentYM) : `Q${quarterOf(currentYM)} ${currentYM.split('-')[0]}`}
          </p>
        </div>
        <button onClick={() => setCurrentYM(nextMonth(currentYM))}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'color-mix(in srgb, var(--ink) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 10%, transparent)', color: 'var(--ink-muted)' }}>
          <ChevronRight size={15} />
        </button>
      </motion.div>

      {/* ── Auth gate ── */}
      {!user && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: 'color-mix(in srgb, var(--note-blue) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 20%, transparent)' }}>
          <LogIn size={16} style={{ color: 'var(--note-blue-ink)' }} />
          <p className="text-sm flex-1" style={{ color: 'var(--ink-muted)' }}>
            Sign in to save transactions and tags to your account.
          </p>
          <button onClick={signIn}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'color-mix(in srgb, var(--note-blue) 15%, transparent)', color: 'var(--note-blue-ink)', border: '1px solid color-mix(in srgb, var(--note-blue) 30%, transparent)' }}>
            Sign in with Google
          </button>
        </motion.div>
      )}

      {/* ═══ MONTHLY VIEW ═══════════════════════════════════════════════════ */}
      {viewMode === 'monthly' && (
        <>
          <ResultPanel
            label={`Left over in ${fmtYM(currentYM)}`}
            value={formatRand(net, 0)}
            tone={monthTxs.length === 0 ? 'default' : net >= 0 ? 'gain' : 'loss'}
            summary={monthTxs.length === 0
              ? 'Add this month’s income and spending to see what is left over.'
              : <>
                  You brought in {formatRand(income, 0)} and spent {formatRand(expenses, 0)}
                  {income > 0 ? `, so you kept ${savingsRate.toFixed(0)}% of your income` : ''}.
                  {expByTag.length > 0 && ` Your biggest spend was ${expByTag[0].name} at ${formatRand(expByTag[0].value, 0)}.`}
                </>}
            figures={[
              { label: 'Income', value: formatRand(income, 0) },
              { label: 'Spending', value: formatRand(expenses, 0) },
              { label: 'Kept', value: income > 0 ? `${savingsRate.toFixed(1)}%` : 'No income yet' },
              { label: 'Entries', value: String(monthTxs.length) },
            ]}
          />

          {/* Add transaction */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <button onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all w-full justify-center"
              style={{
                background: showAddForm ? 'color-mix(in srgb, var(--gain) 12%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                color: showAddForm ? 'var(--gain-ink)' : 'var(--ink-muted)',
                border: `1px solid ${showAddForm ? 'color-mix(in srgb, var(--gain) 25%, transparent)' : 'color-mix(in srgb, var(--ink) 10%, transparent)'}`,
              }}>
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
              {showAddForm ? 'Cancel' : '+ Add Transaction'}
            </button>

            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                  <div className="glass-card p-5 space-y-3">
                    {/* Type toggle */}
                    <div className="flex gap-2">
                      {(['income', 'expense'] as const).map((t) => (
                        <button key={t} onClick={() => setForm((f) => ({ ...f, type: t, tagId: '' }))}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: form.type === t
                              ? t === 'income' ? 'color-mix(in srgb, var(--gain) 15%, transparent)' : 'color-mix(in srgb, var(--loss) 15%, transparent)'
                              : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                            color: form.type === t
                              ? t === 'income' ? 'var(--gain-ink)' : 'var(--loss-ink)'
                              : 'var(--ink-muted)',
                            border: `1px solid ${form.type === t
                              ? t === 'income' ? 'color-mix(in srgb, var(--gain) 30%, transparent)' : 'color-mix(in srgb, var(--loss) 30%, transparent)'
                              : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                          }}>
                          {t === 'income' ? '↑ Income' : '↓ Expense'}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Description */}
                      <div className="col-span-2 flex flex-col gap-1">
                        <label htmlFor="tx-description" className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--ink-muted)' }}>Description</label>
                        <input
                          id="tx-description"
                          className="input-dark px-3 py-2 rounded-xl text-sm"
                          placeholder="e.g. Payflex - Takealot"
                          value={form.description}
                          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTx()}
                        />
                      </div>

                      {/* Amount */}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="tx-amount" className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--ink-muted)' }}>Amount (R)</label>
                        <input
                          id="tx-amount"
                          className={`input-dark px-3 py-2 rounded-xl text-sm ${amountError ? 'input-error' : ''}`}
                          type="number" placeholder="0.00"
                          value={form.amount}
                          aria-invalid={amountError ? true : undefined}
                          aria-describedby={amountError ? 'tx-amount-error' : undefined}
                          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTx()}
                        />
                        {amountError && <p id="tx-amount-error" className="text-xs font-medium text-loss-ink" aria-live="polite">{amountError}</p>}
                      </div>

                      {/* Date */}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="tx-date" className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--ink-muted)' }}>Date</label>
                        <input
                          id="tx-date"
                          className="input-dark px-3 py-2 rounded-xl text-sm"
                          type="date"
                          value={form.date}
                          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Tag picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--ink-muted)' }}>Tag</label>
                      <div className="flex flex-wrap gap-1.5">
                        {filteredTags.map((t) => (
                          <button key={t.id} onClick={() => setForm((f) => ({ ...f, tagId: t.id }))}
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                            style={{
                              background: form.tagId === t.id ? alpha(t.color, 15) : alpha(t.color, 5),
                              color: textTone(t.color),
                              border: `1px solid ${form.tagId === t.id ? alpha(t.color, 31) : alpha(t.color, 13)}`,
                              outline: form.tagId === t.id ? `2px solid ${alpha(t.color, 25)}` : 'none',
                            }}>
                            {t.name}
                          </button>
                        ))}
                        {filteredTags.length === 0 && (
                          <p className="text-xs" style={{ color: 'var(--ink-subtle)' }}>
                            No tags for this type. Add one in Tags panel.
                          </p>
                        )}
                      </div>
                    </div>

                    <button onClick={handleAddTx}
                      disabled={!form.description || !form.amount || !!amountError || !form.tagId || !user}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                      style={{ background: 'color-mix(in srgb, var(--gain) 15%, transparent)', color: 'var(--gain-ink)', border: '1px solid color-mix(in srgb, var(--gain) 30%, transparent)' }}>
                      {user ? 'Add Transaction' : 'Sign in to add'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Transaction list */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Transactions — {fmtYM(currentYM)}
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--ink-muted)' }}>
                ({monthTxs.length} entries)
              </span>
            </p>
            {monthTxs.length === 0 ? (
              <div className="text-center py-10">
                <BarChart3 size={32} className="mx-auto mb-3" style={{ color: 'var(--ink-subtle)' }} />
                <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                  No transactions yet for this month.
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-subtle)' }}>
                  Click "+ Add Transaction" above to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Income */}
                {monthTxs.filter((t) => t.type === 'income').length > 0 && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider pt-1 pb-0.5"
                    style={{ color: 'var(--gain-ink)' }}>Income</p>
                )}
                {monthTxs.filter((t) => t.type === 'income').map((tx) => (
                  <TxRow key={tx.id} tx={tx} onRemove={() => removeTx(tx.id)} />
                ))}
                {/* Expenses */}
                {monthTxs.filter((t) => t.type === 'expense').length > 0 && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider pt-2 pb-0.5"
                    style={{ color: 'var(--loss-ink)' }}>Expenses</p>
                )}
                {monthTxs.filter((t) => t.type === 'expense').map((tx) => (
                  <TxRow key={tx.id} tx={tx} onRemove={() => removeTx(tx.id)} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Charts */}
          {monthTxs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Expense breakdown pie */}
              {expByTag.length > 0 && (
                <div className="glass-card-static p-5">
                  <p className="text-sm font-semibold mb-3"
                    style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                    Expense Breakdown
                  </p>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={expByTag} cx="50%" cy="50%" innerRadius={40} outerRadius={72}
                          paddingAngle={2} dataKey="value">
                          {expByTag.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {expByTag.map((e) => (
                        <div key={e.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: e.color }} />
                          <span className="flex-1 truncate" style={{ color: 'var(--ink-muted)' }}>{e.name}</span>
                          <span className="font-semibold flex-shrink-0" style={{ color: textTone(e.color) }}>{formatRand(e.value, 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Income breakdown pie */}
              {incByTag.length > 0 && (
                <div className="glass-card-static p-5">
                  <p className="text-sm font-semibold mb-3"
                    style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                    Income Breakdown
                  </p>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={incByTag} cx="50%" cy="50%" innerRadius={40} outerRadius={72}
                          paddingAngle={2} dataKey="value">
                          {incByTag.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {incByTag.map((e) => (
                        <div key={e.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: e.color }} />
                          <span className="flex-1 truncate" style={{ color: 'var(--ink-muted)' }}>{e.name}</span>
                          <span className="font-semibold flex-shrink-0" style={{ color: textTone(e.color) }}>{formatRand(e.value, 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <AssumptionsDrawer
            items={[
              <>The figures are the transactions you entered for {fmtYM(currentYM)}. Nothing is estimated.</>,
              <>“Kept” is income less spending, as a share of income. Saving 10% to 20% of income is a common goal.</>,
            ]}
          />
        </>
      )}

      {/* ═══ QUARTERLY VIEW ══════════════════════════════════════════════════ */}
      {viewMode === 'quarterly' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Month summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quarterData.map((m) => (
              <button key={m.ym}
                onClick={() => { setCurrentYM(m.ym); setViewMode('monthly'); }}
                className="glass-card p-5 text-left transition-all hover:scale-[1.01]"
                style={{ border: m.ym === currentYM ? '1px solid color-mix(in srgb, var(--note-blue) 40%, transparent)' : undefined }}>
                <p className="text-sm font-bold mb-3"
                  style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                  {parseYM(m.ym).toLocaleDateString('en-ZA', { month: 'long' })}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--ink-muted)' }}>Income</span>
                    <span style={{ color: 'var(--gain-ink)', fontWeight: 600 }}>{formatRand(m.income, 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--ink-muted)' }}>Expenses</span>
                    <span style={{ color: 'var(--loss-ink)', fontWeight: 600 }}>{formatRand(m.expenses, 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1"
                    style={{ borderTop: '1px solid color-mix(in srgb, var(--ink) 6%, transparent)' }}>
                    <span style={{ color: 'var(--ink-muted)' }}>Net</span>
                    <span style={{ color: m.net >= 0 ? 'var(--gain-ink)' : 'var(--loss-ink)', fontWeight: 700 }}>
                      {m.net >= 0 ? '+' : ''}{formatRand(m.net, 0)}
                    </span>
                  </div>
                </div>
                {m.income === 0 && m.expenses === 0 && (
                  <p className="text-[10px] mt-2" style={{ color: 'var(--ink-subtle)' }}>No data — click to add</p>
                )}
              </button>
            ))}
          </div>

          {/* Quarterly bar chart */}
          {quarterData.some((m) => m.income > 0 || m.expenses > 0) && (
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-4"
                style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                Q{quarterOf(currentYM)} {currentYM.split('-')[0]} — Income vs Expenses
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={quarterData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
                  <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
                  <Bar dataKey="income"   name="Income"   fill="var(--gain)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="var(--loss)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quarter totals */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Q Income',   value: quarterData.reduce((s, m) => s + m.income, 0),   color: 'var(--gain)' },
              { label: 'Q Expenses', value: quarterData.reduce((s, m) => s + m.expenses, 0), color: 'var(--loss)' },
              { label: 'Q Net',      value: quarterData.reduce((s, m) => s + m.net, 0),      color: quarterData.reduce((s, m) => s + m.net, 0) >= 0 ? 'var(--gain)' : 'var(--loss)' },
            ].map((k) => (
              <div key={k.label} className="glass-card-static p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--ink-subtle)' }}>{k.label}</p>
                <p className="text-base font-bold" style={{ color: textTone(k.color), fontFamily: 'var(--font-display)' }}>
                  {formatRand(k.value, 0)}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ TAG MANAGER ═════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showTagMgr && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Tag size={14} style={{ color: 'var(--note-blue-ink)' }} />
                <p className="text-sm font-bold"
                  style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                  Manage Tags
                </p>
                <p className="text-xs ml-1" style={{ color: 'var(--ink-muted)' }}>
                  Add, rename or remove tags. Changes apply to future transactions.
                </p>
              </div>

              {/* Add new tag */}
              {user && (
                <div className="flex flex-wrap gap-2 items-end p-3 rounded-xl"
                  style={{ background: 'color-mix(in srgb, var(--ink) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 7%, transparent)' }}>
                  <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                    <label className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--ink-muted)' }}>Tag Name</label>
                    <input
                      className="input-dark px-3 py-2 rounded-xl text-sm"
                      placeholder="e.g. Payflex"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--ink-muted)' }}>Type</label>
                    <div className="flex gap-1">
                      {(['income', 'expense', 'both'] as const).map((t) => (
                        <button key={t} onClick={() => setNewTagType(t)}
                          className="px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                          style={{
                            background: newTagType === t ? 'color-mix(in srgb, var(--note-blue) 15%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                            color: newTagType === t ? 'var(--note-blue-ink)' : 'var(--ink-muted)',
                            border: `1px solid ${newTagType === t ? 'color-mix(in srgb, var(--note-blue) 30%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                          }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--ink-muted)' }}>Colour</label>
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                      {PALETTE.map((c) => (
                        <button key={c} onClick={() => setNewTagColor(c)}
                          className="w-5 h-5 rounded-full transition-all"
                          style={{
                            background: c,
                            outline: newTagColor === c ? `2px solid white` : 'none',
                            outlineOffset: 1,
                          }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={handleAddTag} disabled={!newTagName.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
                    style={{ background: 'color-mix(in srgb, var(--note-blue) 15%, transparent)', color: 'var(--note-blue-ink)', border: '1px solid color-mix(in srgb, var(--note-blue) 30%, transparent)' }}>
                    <Plus size={12} /> Add Tag
                  </button>
                </div>
              )}

              {/* Existing tags */}
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <div key={t.id} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
                    style={{ background: alpha(t.color, 5), border: `1px solid ${alpha(t.color, 15)}` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    {editingTagId === t.id ? (
                      <input
                        className="text-xs bg-transparent border-0 outline-none w-24"
                        style={{ color: textTone(t.color) }}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                        autoFocus
                      />
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: textTone(t.color) }}>{t.name}</span>
                    )}
                    <span className="text-[9px] px-1 rounded" style={{ color: 'var(--ink-subtle)', background: 'color-mix(in srgb, var(--ink) 5%, transparent)' }}>
                      {t.type}
                    </span>
                    {user && (
                      <>
                        {editingTagId === t.id ? (
                          <button onClick={() => handleRename(t.id)}
                            className="p-0.5 rounded" style={{ color: 'var(--gain-ink)' }}>
                            <Check size={10} />
                          </button>
                        ) : (
                          <button onClick={() => { setEditingTagId(t.id); setEditingName(t.name); }}
                            className="p-0.5 rounded opacity-50 hover:opacity-100"
                            style={{ color: 'var(--ink-muted)' }}>
                            <Pencil size={10} />
                          </button>
                        )}
                        <button onClick={() => removeTag(t.id)}
                          className="p-0.5 rounded opacity-50 hover:opacity-100"
                          style={{ color: 'var(--loss-ink)' }}>
                          <Trash2 size={10} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--ink-subtle)' }}>
        Your transactions are saved to your account.
      </p>
    </div>
  );
}

// ─── Transaction row ───────────────────────────────────────────────────────────

function TxRow({ tx, onRemove }: { tx: Transaction; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
      style={{ background: 'color-mix(in srgb, var(--ink) 2.5%, transparent)', border: '1px solid color-mix(in srgb, var(--ink) 5%, transparent)' }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: tx.type === 'income' ? 'color-mix(in srgb, var(--gain) 15%, transparent)' : 'color-mix(in srgb, var(--loss) 12%, transparent)' }}>
        {tx.type === 'income'
          ? <TrendingUp size={10} style={{ color: 'var(--gain-ink)' }} />
          : <TrendingDown size={10} style={{ color: 'var(--loss-ink)' }} />}
      </div>
      <p className="flex-1 text-sm truncate" style={{ color: 'var(--ink)' }}>
        {tx.description}
      </p>
      <TagBadge tag={{ id: tx.tagId, name: tx.tagName, color: tx.tagColor, type: tx.type }} />
      <p className="text-xs flex-shrink-0" style={{ color: 'var(--ink-subtle)' }}>
        {new Date(tx.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
      </p>
      <p className="text-sm font-bold flex-shrink-0 w-28 text-right"
        style={{ color: tx.type === 'income' ? 'var(--gain-ink)' : 'var(--loss-ink)' }}>
        {tx.type === 'expense' ? '-' : '+'}{formatRand(tx.amount, 0)}
      </p>
      <button onClick={onRemove} aria-label={`Delete ${tx.description}`}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded-lg transition-all flex-shrink-0"
        style={{ color: 'var(--loss-ink)', background: 'color-mix(in srgb, var(--loss) 8%, transparent)' }}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}
