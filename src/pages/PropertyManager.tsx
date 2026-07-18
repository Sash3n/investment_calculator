import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  ArrowLeft, Building2, Wallet, Wrench, FileText, LayoutDashboard,
  Plus, Trash2, Pencil, Download, Receipt, TrendingUp, CalendarClock, CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { formatRand, formatRandShort } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import {
  useSavedProperties, useExpenses, useMaintenance, useIncome, usePropertyRecords,
} from '../hooks/useFirestore';
import type {
  ExpenseCategory, MaintenanceStatus, IncomeType, PropertyRecordType,
} from '../types';

const C = {
  indigo: '#6366F1', amber: '#F59E0B', emerald: '#10B981',
  red: '#EF4444', cyan: '#06B6D4', violet: '#8B5CF6',
};

type Tab = 'overview' | 'expenses' | 'maintenance' | 'rent' | 'records';

const TABS: { id: Tab; label: string; icon: typeof Wallet }[] = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { id: 'expenses',    label: 'Expenses',    icon: Wallet },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'rent',        label: 'Rent',        icon: Receipt },
  { id: 'records',     label: 'Records',     icon: FileText },
];

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'rates',       label: 'Rates & Taxes' },
  { value: 'levies',      label: 'Levies' },
  { value: 'insurance',   label: 'Insurance' },
  { value: 'repairs',     label: 'Repairs' },
  { value: 'garden',      label: 'Garden' },
  { value: 'security',    label: 'Security' },
  { value: 'management',  label: 'Management Fees' },
  { value: 'utilities',   label: 'Utilities' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'legal',       label: 'Legal & Accounting' },
  { value: 'other',       label: 'Other' },
];

const MAINT_STATUSES: { value: MaintenanceStatus; label: string }[] = [
  { value: 'planned',     label: 'Planned' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done',        label: 'Done' },
];

const INCOME_TYPES: { value: IncomeType; label: string }[] = [
  { value: 'rent',    label: 'Rent' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'other',   label: 'Other' },
];

const RECORD_TYPES: { value: PropertyRecordType; label: string }[] = [
  { value: 'lease',      label: 'Lease' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'rates',      label: 'Rates Account' },
  { value: 'insurance',  label: 'Insurance Policy' },
  { value: 'warranty',   label: 'Warranty' },
  { value: 'compliance', label: 'Compliance Certificate' },
  { value: 'other',      label: 'Other' },
];

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function RandTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ minWidth: 150 }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill ?? 'var(--color-text-muted)' }}>{p.name}: {formatRand(p.value, 0)}</p>
      ))}
    </div>
  );
}

const STATUS_COLORS: Record<MaintenanceStatus, string> = {
  planned: C.amber, 'in-progress': C.cyan, done: C.emerald,
};

export function PropertyManager() {
  const { propertyId = '' } = useParams();
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const { properties } = useSavedProperties(uid);
  const expensesHook   = useExpenses(uid);
  const maintHook      = useMaintenance(uid);
  const incomeHook     = useIncome(uid);
  const recordsHook    = usePropertyRecords(uid);

  const property = properties.find((p) => p.id === propertyId);
  const expenses = useMemo(() => expensesHook.docs.filter((d) => d.propertyId === propertyId), [expensesHook.docs, propertyId]);
  const maintenance = useMemo(() => maintHook.docs.filter((d) => d.propertyId === propertyId), [maintHook.docs, propertyId]);
  const income = useMemo(() => incomeHook.docs.filter((d) => d.propertyId === propertyId), [incomeHook.docs, propertyId]);
  const records = useMemo(() => recordsHook.docs.filter((d) => d.propertyId === propertyId), [recordsHook.docs, propertyId]);

  const [tab, setTab] = useState<Tab>('overview');

  // ── Form state per tab (single active form; editingId = update mode) ────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);

  const [expForm, setExpForm] = useState({ category: 'rates' as ExpenseCategory, amount: 0, date: today(), note: '', taxDeductible: true });
  const [maintForm, setMaintForm] = useState({ title: '', status: 'planned' as MaintenanceStatus, cost: 0, contractor: '', dateLogged: today(), dateCompleted: '', note: '' });
  const [incForm, setIncForm] = useState({ type: 'rent' as IncomeType, amount: 0, date: today(), tenant: '', note: '' });
  const [recForm, setRecForm] = useState({ type: 'lease' as PropertyRecordType, title: '', value: 0, renewalDate: '', note: '' });

  const resetForms = () => {
    setEditingId(null);
    setShowForm(false);
    setExpForm({ category: 'rates', amount: 0, date: today(), note: '', taxDeductible: true });
    setMaintForm({ title: '', status: 'planned', cost: 0, contractor: '', dateLogged: today(), dateCompleted: '', note: '' });
    setIncForm({ type: 'rent', amount: 0, date: today(), tenant: '', note: '' });
    setRecForm({ type: 'lease', title: '', value: 0, renewalDate: '', note: '' });
  };

  const switchTab = (t: Tab) => { setTab(t); resetForms(); };

  // ── Overview stats ──────────────────────────────────────────────────────────
  const year = new Date().getFullYear().toString();
  const ytdIncome = income.filter((d) => d.date?.startsWith(year)).reduce((s, d) => s + d.amount, 0);
  const ytdExpenses = expenses.filter((d) => d.date?.startsWith(year)).reduce((s, d) => s + d.amount, 0)
    + maintenance.filter((d) => d.status === 'done' && d.dateCompleted?.startsWith(year)).reduce((s, d) => s + d.cost, 0);
  const ytdDeductible = expenses
    .filter((d) => d.taxDeductible && d.date?.startsWith(year))
    .reduce((s, d) => s + d.amount, 0)
    + maintenance.filter((d) => d.status === 'done' && d.dateCompleted?.startsWith(year)).reduce((s, d) => s + d.cost, 0);
  const openJobs = maintenance.filter((d) => d.status !== 'done').length;

  const monthlyNet = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; income: number; expenses: number; net: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleDateString('en-ZA', { month: 'short' }), income: 0, expenses: 0, net: 0 });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const d of income) { const m = byKey.get(d.date?.slice(0, 7)); if (m) m.income += d.amount; }
    for (const d of expenses) { const m = byKey.get(d.date?.slice(0, 7)); if (m) m.expenses += d.amount; }
    for (const d of maintenance) {
      if (d.status !== 'done') continue;
      const m = byKey.get(d.dateCompleted?.slice(0, 7));
      if (m) m.expenses += d.cost;
    }
    for (const m of months) m.net = m.income - m.expenses;
    return months;
  }, [income, expenses, maintenance]);

  // ── Excel export of the full logbook ────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Category', 'Amount', 'Tax Deductible', 'Note'],
      ...expenses.map((d) => [d.date, d.category, d.amount, d.taxDeductible ? 'Yes' : 'No', d.note]),
    ]), 'Expenses');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Logged', 'Title', 'Status', 'Cost', 'Contractor', 'Completed', 'Note'],
      ...maintenance.map((d) => [d.dateLogged, d.title, d.status, d.cost, d.contractor, d.dateCompleted, d.note]),
    ]), 'Maintenance');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Type', 'Amount', 'Tenant', 'Note'],
      ...income.map((d) => [d.date, d.type, d.amount, d.tenant, d.note]),
    ]), 'Income');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Type', 'Title', 'Value', 'Renewal', 'Note'],
      ...records.map((d) => [d.type, d.title, d.value, d.renewalDate, d.note]),
    ]), 'Records');
    XLSX.writeFile(wb, `FinCalcZA_${(property?.name ?? 'property').replace(/[^\w]+/g, '_')}_logbook.xlsx`);
  };

  if (!property && properties.length > 0) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <EmptyState icon={Building2} title="Property not found"
          message="This property is not in your saved portfolio."
          actionLabel="Back to My Portfolio" actionTo="/portfolio-hub" />
      </div>
    );
  }

  const name = property?.name ?? 'Loading…';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/portfolio-hub" className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              aria-label="Back to portfolio">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
                {name}
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                {property ? `${formatRandShort(property.inputs.purchasePrice)} · logbook and running costs` : ''}
              </p>
            </div>
          </div>
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(16,185,129,0.12)', color: C.emerald, border: `1px solid ${C.emerald}44` }}>
            <Download size={14} /> Export Excel
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => switchTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: `1px solid ${active ? 'rgba(99,102,241,0.35)' : 'var(--color-border)'}`,
                color: active ? C.indigo : 'var(--color-text-muted)',
              }}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="YTD Income"        value={formatRand(ytdIncome, 0)}    color="emerald" icon={Wallet} />
            <StatCard label="YTD Expenses"      value={formatRand(ytdExpenses, 0)}  color="amber"   icon={Wrench} />
            <StatCard label="YTD Net"           value={formatRand(ytdIncome - ytdExpenses, 0)}
              color={ytdIncome - ytdExpenses >= 0 ? 'indigo' : 'red'} icon={TrendingUp} />
            <StatCard label="Open Jobs"         value={`${openJobs}`} color={openJobs > 0 ? 'amber' : 'emerald'} icon={Wrench} />
          </div>

          <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(16,185,129,0.08)', border: `1px solid ${C.emerald}33` }}>
            <Receipt size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.emerald }} />
            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span className="font-semibold" style={{ color: C.emerald }}>
                {formatRand(ytdDeductible, 0)} in tax-deductible expenses this year.
              </span>{' '}
              Use this figure in the <Link to="/property-tax" className="underline" style={{ color: C.indigo }}>Property
              Portfolio Tax</Link> calculator to see the tax effect across your portfolio.
            </div>
          </div>

          {monthlyNet.some((m) => m.income > 0 || m.expenses > 0) ? (
            <div className="glass-card p-5">
              <SectionHeader title="Cash Flow (12 months)" icon={TrendingUp} />
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyNet} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => formatRandShort(Number(v))} />
                    <Tooltip content={<RandTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                    <Legend formatter={(v) => <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{v}</span>} />
                    <Bar dataKey="income"   name="Income"   fill={C.emerald} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill={C.red}     radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState icon={TrendingUp} title="No activity yet"
              message="Log rent received and expenses to build this property's cash-flow picture." />
          )}
        </div>
      )}

      {/* ── Expenses ── */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { resetForms(); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid ${C.indigo}44` }}>
              <Plus size={13} /> Log expense
            </button>
          </div>

          {showForm && (
            <div className="glass-card p-5 space-y-3">
              <SectionHeader title={editingId ? 'Edit Expense' : 'New Expense'} icon={Wallet} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SelectField label="Category" id="exp-cat" value={expForm.category}
                  onChange={(v) => setExpForm((f) => ({ ...f, category: v as ExpenseCategory }))} options={EXPENSE_CATEGORIES} />
                <InputField label="Amount" id="exp-amt" value={expForm.amount}
                  onChange={(v) => setExpForm((f) => ({ ...f, amount: parseFloat(v) || 0 }))} prefix="R" />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="exp-date" className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Date</label>
                  <input id="exp-date" type="date" value={expForm.date}
                    onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
                    className="select-dark" />
                </div>
              </div>
              <InputField label="Note" id="exp-note" type="text" value={expForm.note}
                onChange={(v) => setExpForm((f) => ({ ...f, note: v }))} placeholder="Replaced geyser element" />
              <div className="flex items-center gap-3">
                <input type="checkbox" id="exp-ded" checked={expForm.taxDeductible}
                  onChange={(e) => setExpForm((f) => ({ ...f, taxDeductible: e.target.checked }))}
                  className="w-4 h-4 accent-[#10B981]" />
                <label htmlFor="exp-ded" className="text-sm cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                  Tax deductible (rental expense claimable against SARS)
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (expForm.amount <= 0) return;
                    if (editingId) await expensesHook.update(editingId, expForm);
                    else await expensesHook.add({ ...expForm, propertyId });
                    resetForms();
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: C.emerald, border: `1px solid ${C.emerald}44` }}>
                  {editingId ? 'Update' : 'Save'}
                </button>
                <button onClick={resetForms} className="px-4 py-2 rounded-xl text-sm"
                  style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Cancel</button>
              </div>
            </div>
          )}

          {expenses.length === 0 && !showForm ? (
            <EmptyState icon={Wallet} title="No expenses logged"
              message="Track rates, levies, insurance and repairs to know this property's true running cost." />
          ) : expenses.length > 0 && (
            <div className="glass-card p-5 overflow-x-auto">
              <table className="w-full text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-center py-2">Deductible</th>
                    <th className="text-left py-2">Note</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px dashed var(--color-border)' }}>
                      <td className="py-2 whitespace-nowrap">{fmtDate(d.date)}</td>
                      <td className="py-2 capitalize">{EXPENSE_CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}</td>
                      <td className="py-2 text-right font-semibold" style={{ color: 'var(--color-text)' }}>{formatRand(d.amount, 0)}</td>
                      <td className="py-2 text-center">{d.taxDeductible ? <CheckCircle2 size={14} className="inline" style={{ color: C.emerald }} /> : '—'}</td>
                      <td className="py-2 max-w-[220px] truncate">{d.note}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button aria-label="Edit" className="p-1.5 rounded-lg" style={{ color: C.indigo }}
                          onClick={() => { setEditingId(d.id); setShowForm(true); setExpForm({ category: d.category, amount: d.amount, date: d.date, note: d.note, taxDeductible: d.taxDeductible }); }}>
                          <Pencil size={13} />
                        </button>
                        <button aria-label="Delete" className="p-1.5 rounded-lg" style={{ color: C.red }}
                          onClick={() => expensesHook.remove(d.id)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Maintenance ── */}
      {tab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { resetForms(); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid ${C.indigo}44` }}>
              <Plus size={13} /> Log job
            </button>
          </div>

          {showForm && (
            <div className="glass-card p-5 space-y-3">
              <SectionHeader title={editingId ? 'Edit Job' : 'New Maintenance Job'} icon={Wrench} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Title" id="mnt-title" type="text" value={maintForm.title}
                  onChange={(v) => setMaintForm((f) => ({ ...f, title: v }))} placeholder="Fix roof leak" />
                <SelectField label="Status" id="mnt-status" value={maintForm.status}
                  onChange={(v) => setMaintForm((f) => ({ ...f, status: v as MaintenanceStatus, dateCompleted: v === 'done' ? (f.dateCompleted || today()) : '' }))}
                  options={MAINT_STATUSES} />
                <InputField label="Cost" id="mnt-cost" value={maintForm.cost}
                  onChange={(v) => setMaintForm((f) => ({ ...f, cost: parseFloat(v) || 0 }))} prefix="R"
                  help="Counted as an expense once the job is done" />
                <InputField label="Contractor" id="mnt-contractor" type="text" value={maintForm.contractor}
                  onChange={(v) => setMaintForm((f) => ({ ...f, contractor: v }))} placeholder="Joe's Plumbing" />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="mnt-logged" className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Logged</label>
                  <input id="mnt-logged" type="date" value={maintForm.dateLogged}
                    onChange={(e) => setMaintForm((f) => ({ ...f, dateLogged: e.target.value }))} className="select-dark" />
                </div>
                {maintForm.status === 'done' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="mnt-done" className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Completed</label>
                    <input id="mnt-done" type="date" value={maintForm.dateCompleted}
                      onChange={(e) => setMaintForm((f) => ({ ...f, dateCompleted: e.target.value }))} className="select-dark" />
                  </div>
                )}
              </div>
              <InputField label="Note" id="mnt-note" type="text" value={maintForm.note}
                onChange={(v) => setMaintForm((f) => ({ ...f, note: v }))} />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!maintForm.title.trim()) return;
                    if (editingId) await maintHook.update(editingId, maintForm);
                    else await maintHook.add({ ...maintForm, propertyId });
                    resetForms();
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: C.emerald, border: `1px solid ${C.emerald}44` }}>
                  {editingId ? 'Update' : 'Save'}
                </button>
                <button onClick={resetForms} className="px-4 py-2 rounded-xl text-sm"
                  style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Cancel</button>
              </div>
            </div>
          )}

          {maintenance.length === 0 && !showForm ? (
            <EmptyState icon={Wrench} title="No maintenance logged"
              message="Track jobs, contractors and costs so nothing slips through the cracks." />
          ) : maintenance.length > 0 && (
            <div className="space-y-2">
              {[...maintenance].sort((a, b) => b.dateLogged.localeCompare(a.dateLogged)).map((d) => (
                <div key={d.id} className="glass-card p-4 flex items-center gap-4 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: `${STATUS_COLORS[d.status]}18`, color: STATUS_COLORS[d.status], border: `1px solid ${STATUS_COLORS[d.status]}44` }}>
                    {MAINT_STATUSES.find((s) => s.value === d.status)?.label}
                  </span>
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{d.title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                      Logged {fmtDate(d.dateLogged)}{d.contractor ? ` · ${d.contractor}` : ''}{d.status === 'done' ? ` · completed ${fmtDate(d.dateCompleted)}` : ''}
                    </p>
                    {d.note && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{d.note}</p>}
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{d.cost > 0 ? formatRand(d.cost, 0) : '—'}</span>
                  <div className="flex gap-1">
                    {d.status !== 'done' && (
                      <button aria-label="Mark done" title="Mark done" className="p-1.5 rounded-lg" style={{ color: C.emerald }}
                        onClick={() => maintHook.update(d.id, { status: 'done', dateCompleted: today() })}>
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    <button aria-label="Edit" className="p-1.5 rounded-lg" style={{ color: C.indigo }}
                      onClick={() => { setEditingId(d.id); setShowForm(true); setMaintForm({ title: d.title, status: d.status, cost: d.cost, contractor: d.contractor, dateLogged: d.dateLogged, dateCompleted: d.dateCompleted, note: d.note }); }}>
                      <Pencil size={13} />
                    </button>
                    <button aria-label="Delete" className="p-1.5 rounded-lg" style={{ color: C.red }}
                      onClick={() => maintHook.remove(d.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Rent ── */}
      {tab === 'rent' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { resetForms(); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid ${C.indigo}44` }}>
              <Plus size={13} /> Log payment
            </button>
          </div>

          {showForm && (
            <div className="glass-card p-5 space-y-3">
              <SectionHeader title={editingId ? 'Edit Payment' : 'Payment Received'} icon={Receipt} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SelectField label="Type" id="inc-type" value={incForm.type}
                  onChange={(v) => setIncForm((f) => ({ ...f, type: v as IncomeType }))} options={INCOME_TYPES} />
                <InputField label="Amount" id="inc-amt" value={incForm.amount}
                  onChange={(v) => setIncForm((f) => ({ ...f, amount: parseFloat(v) || 0 }))} prefix="R" />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="inc-date" className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Date</label>
                  <input id="inc-date" type="date" value={incForm.date}
                    onChange={(e) => setIncForm((f) => ({ ...f, date: e.target.value }))} className="select-dark" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Tenant" id="inc-tenant" type="text" value={incForm.tenant}
                  onChange={(v) => setIncForm((f) => ({ ...f, tenant: v }))} />
                <InputField label="Note" id="inc-note" type="text" value={incForm.note}
                  onChange={(v) => setIncForm((f) => ({ ...f, note: v }))} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (incForm.amount <= 0) return;
                    if (editingId) await incomeHook.update(editingId, incForm);
                    else await incomeHook.add({ ...incForm, propertyId });
                    resetForms();
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: C.emerald, border: `1px solid ${C.emerald}44` }}>
                  {editingId ? 'Update' : 'Save'}
                </button>
                <button onClick={resetForms} className="px-4 py-2 rounded-xl text-sm"
                  style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Cancel</button>
              </div>
            </div>
          )}

          {income.length === 0 && !showForm ? (
            <EmptyState icon={Receipt} title="No payments logged"
              message="Record rent as it lands to keep a clean income history for SARS season." />
          ) : income.length > 0 && (
            <div className="glass-card p-5 overflow-x-auto">
              <table className="w-full text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-left py-2">Tenant</th>
                    <th className="text-left py-2">Note</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {[...income].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px dashed var(--color-border)' }}>
                      <td className="py-2 whitespace-nowrap">{fmtDate(d.date)}</td>
                      <td className="py-2 capitalize">{d.type}</td>
                      <td className="py-2 text-right font-semibold" style={{ color: C.emerald }}>{formatRand(d.amount, 0)}</td>
                      <td className="py-2">{d.tenant}</td>
                      <td className="py-2 max-w-[220px] truncate">{d.note}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button aria-label="Edit" className="p-1.5 rounded-lg" style={{ color: C.indigo }}
                          onClick={() => { setEditingId(d.id); setShowForm(true); setIncForm({ type: d.type, amount: d.amount, date: d.date, tenant: d.tenant, note: d.note }); }}>
                          <Pencil size={13} />
                        </button>
                        <button aria-label="Delete" className="p-1.5 rounded-lg" style={{ color: C.red }}
                          onClick={() => incomeHook.remove(d.id)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Records ── */}
      {tab === 'records' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { resetForms(); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(99,102,241,0.12)', color: C.indigo, border: `1px solid ${C.indigo}44` }}>
              <Plus size={13} /> Add record
            </button>
          </div>

          {showForm && (
            <div className="glass-card p-5 space-y-3">
              <SectionHeader title={editingId ? 'Edit Record' : 'New Record'} icon={FileText} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField label="Type" id="rec-type" value={recForm.type}
                  onChange={(v) => setRecForm((f) => ({ ...f, type: v as PropertyRecordType }))} options={RECORD_TYPES} />
                <InputField label="Title" id="rec-title" type="text" value={recForm.title}
                  onChange={(v) => setRecForm((f) => ({ ...f, title: v }))} placeholder="Lease: J Smith 2026" />
                <InputField label="Value (optional)" id="rec-value" value={recForm.value}
                  onChange={(v) => setRecForm((f) => ({ ...f, value: parseFloat(v) || 0 }))} prefix="R"
                  help="e.g. monthly rent on the lease, insured value on a policy" />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="rec-renew" className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Renewal / expiry (optional)</label>
                  <input id="rec-renew" type="date" value={recForm.renewalDate}
                    onChange={(e) => setRecForm((f) => ({ ...f, renewalDate: e.target.value }))} className="select-dark" />
                </div>
              </div>
              <InputField label="Note" id="rec-note" type="text" value={recForm.note}
                onChange={(v) => setRecForm((f) => ({ ...f, note: v }))} />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!recForm.title.trim()) return;
                    if (editingId) await recordsHook.update(editingId, recForm);
                    else await recordsHook.add({ ...recForm, propertyId });
                    resetForms();
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: C.emerald, border: `1px solid ${C.emerald}44` }}>
                  {editingId ? 'Update' : 'Save'}
                </button>
                <button onClick={resetForms} className="px-4 py-2 rounded-xl text-sm"
                  style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>Cancel</button>
              </div>
            </div>
          )}

          {records.length === 0 && !showForm ? (
            <EmptyState icon={FileText} title="No records yet"
              message="Keep leases, inspections, policies and compliance certificates in one place with renewal reminders." />
          ) : records.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {records.map((d) => (
                <div key={d.id} className="glass-card p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <FileText size={14} style={{ color: C.violet }} />
                    <p className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{d.title}</p>
                    <button aria-label="Edit" className="p-1 rounded-lg" style={{ color: C.indigo }}
                      onClick={() => { setEditingId(d.id); setShowForm(true); setRecForm({ type: d.type, title: d.title, value: d.value, renewalDate: d.renewalDate, note: d.note }); }}>
                      <Pencil size={13} />
                    </button>
                    <button aria-label="Delete" className="p-1 rounded-lg" style={{ color: C.red }}
                      onClick={() => recordsHook.remove(d.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] capitalize" style={{ color: 'var(--color-text-subtle)' }}>
                    {RECORD_TYPES.find((t) => t.value === d.type)?.label ?? d.type}
                    {d.value > 0 ? ` · ${formatRand(d.value, 0)}` : ''}
                  </p>
                  {d.renewalDate && (
                    <p className="text-xs flex items-center gap-1.5" style={{ color: C.amber }}>
                      <CalendarClock size={12} /> Renews {fmtDate(d.renewalDate)}
                    </p>
                  )}
                  {d.note && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{d.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
