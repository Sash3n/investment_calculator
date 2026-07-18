import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  LayoutDashboard, Building2, Plus, Wrench, Wallet, TrendingUp,
  CalendarClock, ChevronRight, X,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SectionHeader } from '../components/ui/SectionHeader';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { formatRand, formatRandShort } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import {
  useSavedProperties, useExpenses, useMaintenance, useIncome, usePropertyRecords,
} from '../hooks/useFirestore';
import type { PropertyInputs } from '../types';

const C = {
  indigo: '#6366F1', amber: '#F59E0B', emerald: '#10B981',
  red: '#EF4444', cyan: '#06B6D4', violet: '#8B5CF6', pink: '#EC4899',
};
const PIE_COLORS = [C.indigo, C.emerald, C.amber, C.cyan, C.violet, C.pink, C.red, '#94A3B8'];

/** Minimal PropertyInputs for owners who add a property without a full ROI run. */
function minimalProperty(name: string, purchasePrice: number, monthlyRent: number): PropertyInputs {
  return {
    propertyName: name,
    purchasePrice,
    discount: 0,
    deposit: 0,
    interestRate: 11,
    bondTerm: 20,
    monthlyLevies: 0,
    monthlyRates: 0,
    insurance: 0,
    effluentFees: 0,
    miscFees: 0,
    monthlyServiceFee: 0,
    managementFeePercent: 0,
    vacancyRate: 0,
    rentScenario1: monthlyRent,
    rentScenario2: monthlyRent,
    annualAppreciation: 5,
    transferDutyExempt: false,
    bondRegistrationIncluded: false,
    initiationFee: 0,
    initiationFeeCapitalised: false,
  };
}

function monthKey(iso: string): string {
  return iso?.slice(0, 7) ?? '';
}

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

export function PortfolioHub() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { properties, save, loading: propsLoading } = useSavedProperties(uid);
  const { docs: expenses }    = useExpenses(uid);
  const { docs: maintenance } = useMaintenance(uid);
  const { docs: income }      = useIncome(uid);
  const { docs: records }     = usePropertyRecords(uid);

  const [showAdd, setShowAdd]   = useState(false);
  const [newName, setNewName]   = useState('');
  const [newPrice, setNewPrice] = useState(1_000_000);
  const [newRent, setNewRent]   = useState(10_000);
  const [adding, setAdding]     = useState(false);

  const year = new Date().getFullYear().toString();

  const perProperty = useMemo(() => properties.map((p) => {
    const inc = income.filter((d) => d.propertyId === p.id);
    const exp = expenses.filter((d) => d.propertyId === p.id);
    const maint = maintenance.filter((d) => d.propertyId === p.id);
    const ytdIncome = inc.filter((d) => d.date?.startsWith(year)).reduce((s, d) => s + d.amount, 0);
    const ytdExpenses = exp.filter((d) => d.date?.startsWith(year)).reduce((s, d) => s + d.amount, 0)
      + maint.filter((d) => d.status === 'done' && d.dateCompleted?.startsWith(year)).reduce((s, d) => s + d.cost, 0);
    return {
      id: p.id,
      name: p.name || p.inputs.propertyName,
      purchasePrice: p.inputs.purchasePrice,
      ytdIncome,
      ytdExpenses,
      net: ytdIncome - ytdExpenses,
      openJobs: maint.filter((d) => d.status !== 'done').length,
    };
  }), [properties, income, expenses, maintenance, year]);

  const totals = useMemo(() => ({
    income: perProperty.reduce((s, p) => s + p.ytdIncome, 0),
    expenses: perProperty.reduce((s, p) => s + p.ytdExpenses, 0),
    net: perProperty.reduce((s, p) => s + p.net, 0),
    openJobs: perProperty.reduce((s, p) => s + p.openJobs, 0),
  }), [perProperty]);

  // Last 12 months income vs expenses (portfolio-wide)
  const monthly = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; income: number; expenses: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleDateString('en-ZA', { month: 'short' }), income: 0, expenses: 0 });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const d of income) {
      const m = byKey.get(monthKey(d.date));
      if (m) m.income += d.amount;
    }
    for (const d of expenses) {
      const m = byKey.get(monthKey(d.date));
      if (m) m.expenses += d.amount;
    }
    for (const d of maintenance) {
      if (d.status !== 'done') continue;
      const m = byKey.get(monthKey(d.dateCompleted));
      if (m) m.expenses += d.cost;
    }
    return months;
  }, [income, expenses, maintenance]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of expenses) {
      if (!d.date?.startsWith(year)) continue;
      map.set(d.category, (map.get(d.category) ?? 0) + d.amount);
    }
    const maintTotal = maintenance
      .filter((d) => d.status === 'done' && d.dateCompleted?.startsWith(year))
      .reduce((s, d) => s + d.cost, 0);
    if (maintTotal > 0) map.set('maintenance', maintTotal);
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, maintenance, year]);

  // Renewals inside the next 90 days
  const upcomingRenewals = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 90);
    return records
      .filter((r) => r.renewalDate)
      .map((r) => ({ ...r, due: new Date(r.renewalDate) }))
      .filter((r) => !Number.isNaN(r.due.getTime()) && r.due >= now && r.due <= cutoff)
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [records]);

  const propertyName = (id: string) =>
    properties.find((p) => p.id === id)?.name ?? 'Unknown property';

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await save(name, minimalProperty(name, newPrice, newRent));
      setShowAdd(false);
      setNewName('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              My Portfolio
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Income, expenses, maintenance and records across your properties · {year} year to date
            </p>
          </div>
          <button onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
            {showAdd ? <X size={15} /> : <Plus size={15} />}
            {showAdd ? 'Cancel' : 'Add property'}
          </button>
        </div>
      </motion.div>

      {/* Add property */}
      {showAdd && (
        <div className="glass-card p-5 space-y-4">
          <SectionHeader title="Add a Property" icon={Building2} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputField label="Name / Address" id="add-name" type="text" value={newName}
              onChange={setNewName} placeholder="12 Oak Street" />
            <InputField label="Purchase Price" id="add-price" value={newPrice}
              onChange={(v) => setNewPrice(parseFloat(v) || 0)} prefix="R" />
            <InputField label="Monthly Rent" id="add-rent" value={newRent}
              onChange={(v) => setNewRent(parseFloat(v) || 0)} prefix="R" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleAdd} disabled={adding || !newName.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: 'rgba(16,185,129,0.15)', color: C.emerald, border: `1px solid ${C.emerald}44` }}>
              {adding ? 'Saving…' : 'Save property'}
            </button>
            <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
              For a full deal analysis, use the Property ROI calculator — properties saved there appear here too.
            </p>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="YTD Income"   value={formatRand(totals.income, 0)}   color="emerald" icon={Wallet} />
        <StatCard label="YTD Expenses" value={formatRand(totals.expenses, 0)} color="amber"   icon={Wrench} />
        <StatCard label="YTD Net"      value={formatRand(totals.net, 0)}      color={totals.net >= 0 ? 'indigo' : 'red'} icon={TrendingUp} />
        <StatCard label="Open Jobs"    value={`${totals.openJobs}`}           color={totals.openJobs > 0 ? 'amber' : 'emerald'} icon={Wrench} />
      </div>

      {/* Properties */}
      <div className="glass-card p-5 space-y-3">
        <SectionHeader title={`Properties (${properties.length})`} icon={LayoutDashboard} />
        {propsLoading && properties.length === 0 && (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--color-text-subtle)' }}>Loading your portfolio…</p>
        )}
        {!propsLoading && properties.length === 0 && (
          <EmptyState icon={Building2} title="No properties yet"
            message="Add a property above, or save one from the Property ROI calculator." />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {perProperty.map((p) => (
            <Link key={p.id} to={`/portfolio-hub/${p.id}`}
              className="p-4 rounded-xl transition-all hover:bg-[rgba(99,102,241,0.06)] group"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <Building2 size={16} style={{ color: C.indigo }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{p.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                    {formatRandShort(p.purchasePrice)}{p.openJobs > 0 ? ` · ${p.openJobs} open job${p.openJobs === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <ChevronRight size={15} className="opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: C.indigo }} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Income</p>
                  <p className="text-xs font-bold" style={{ color: C.emerald }}>{formatRandShort(p.ytdIncome)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Expenses</p>
                  <p className="text-xs font-bold" style={{ color: C.amber }}>{formatRandShort(p.ytdExpenses)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>Net</p>
                  <p className="text-xs font-bold" style={{ color: p.net >= 0 ? C.emerald : C.red }}>{formatRandShort(p.net)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts */}
      {(income.length > 0 || expenses.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="glass-card p-5">
            <SectionHeader title="Income vs Expenses (12 months)" icon={TrendingUp} />
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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

          {expensesByCategory.length > 0 && (
            <div className="glass-card p-5">
              <SectionHeader title="YTD Expenses by Category" icon={Wallet} />
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensesByCategory} dataKey="value" nameKey="name"
                      innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {expensesByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<RandTooltip />} />
                    <Legend formatter={(v) => <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming renewals */}
      {upcomingRenewals.length > 0 && (
        <div className="glass-card p-5 space-y-2">
          <SectionHeader title="Upcoming Renewals (90 days)" icon={CalendarClock} />
          {upcomingRenewals.map((r) => (
            <Link key={r.id} to={`/portfolio-hub/${r.propertyId}`}
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[rgba(245,158,11,0.06)]"
              style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
              <CalendarClock size={15} style={{ color: C.amber }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{r.title}</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                  {propertyName(r.propertyId)} · {r.type}
                </p>
              </div>
              <span className="text-xs font-semibold" style={{ color: C.amber }}>
                {r.due.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
