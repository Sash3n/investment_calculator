import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import {
  PieChart, Building2, Car, Wallet, TrendingUp,
  Save, LogIn, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Assets {
  primaryHome:   number;
  rentalProperty:number;
  tfsa:          number;
  ra:            number;
  etf:           number;
  cash:          number;
  car:           number;
  other:         number;
}

interface Liabilities {
  homeLoan:      number;
  carLoan:       number;
  personalLoan:  number;
  creditCard:    number;
  other:         number;
}

interface Snapshot {
  id:         string;
  savedAt:    Date;
  assets:     Assets;
  liabilities:Liabilities;
  netWorth:   number;
  label:      string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_ASSETS: Assets = {
  primaryHome:    1_500_000,
  rentalProperty: 0,
  tfsa:           80_000,
  ra:             120_000,
  etf:            50_000,
  cash:           30_000,
  car:            200_000,
  other:          0,
};

const DEFAULT_LIAB: Liabilities = {
  homeLoan:     900_000,
  carLoan:      80_000,
  personalLoan: 0,
  creditCard:   0,
  other:        0,
};

// ─── Constants ────────────────────────────────────────────────────────────────

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

const ASSET_FIELDS: { key: keyof Assets; label: string; icon: typeof Building2; color: string }[] = [
  { key: 'primaryHome',    label: 'Primary Home',      icon: Building2,  color: C.indigo  },
  { key: 'rentalProperty', label: 'Rental Property',   icon: Building2,  color: C.violet  },
  { key: 'tfsa',           label: 'TFSA',              icon: Wallet,     color: C.emerald },
  { key: 'ra',             label: 'Retirement Annuity', icon: PieChart,   color: C.amber   },
  { key: 'etf',            label: 'ETF / Unit Trusts',  icon: TrendingUp, color: C.cyan    },
  { key: 'cash',           label: 'Cash & Savings',    icon: Wallet,     color: C.emerald },
  { key: 'car',            label: 'Vehicle(s)',         icon: Car,        color: C.pink    },
  { key: 'other',          label: 'Other Assets',      icon: Wallet,     color: '#94A3B8' },
];

const LIAB_FIELDS: { key: keyof Liabilities; label: string; color: string }[] = [
  { key: 'homeLoan',     label: 'Home Loan',      color: C.red    },
  { key: 'carLoan',      label: 'Car Loan',        color: C.amber  },
  { key: 'personalLoan', label: 'Personal Loan',   color: C.violet },
  { key: 'creditCard',   label: 'Credit Card',     color: C.pink   },
  { key: 'other',        label: 'Other Liabilities', color: '#94A3B8' },
];

// ─── Firestore helpers ────────────────────────────────────────────────────────

function useNetWorthHistory(uid: string | null) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading]     = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'networth'), orderBy('savedAt', 'asc'))
      );
      setSnapshots(
        snap.docs.map((d) => ({
          id:          d.id,
          savedAt:     d.data().savedAt?.toDate() ?? new Date(),
          assets:      d.data().assets as Assets,
          liabilities: d.data().liabilities as Liabilities,
          netWorth:    d.data().netWorth,
          label:       d.data().label ?? '',
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const save = async (assets: Assets, liabilities: Liabilities, label: string) => {
    if (!uid) return;
    const netWorth = Object.values(assets).reduce((s, v) => s + v, 0)
                   - Object.values(liabilities).reduce((s, v) => s + v, 0);
    await setDoc(doc(collection(db, 'users', uid, 'networth')), {
      assets, liabilities, netWorth, label, savedAt: serverTimestamp(),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'networth', id));
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  return { snapshots, loading, save, remove };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NetWorthDashboard() {
  const { user, signIn } = useAuth();
  const { snapshots, save, remove } = useNetWorthHistory(user?.uid ?? null);

  const [assets, setAssets]       = useState<Assets>(DEFAULT_ASSETS);
  const [liabilities, setLiab]    = useState<Liabilities>(DEFAULT_LIAB);
  const [saveLabel, setSaveLabel] = useState('');
  const [saving, setSaving]       = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const totalAssets = useMemo(
    () => Object.values(assets).reduce((s, v) => s + (v || 0), 0), [assets]
  );
  const totalLiab = useMemo(
    () => Object.values(liabilities).reduce((s, v) => s + (v || 0), 0), [liabilities]
  );
  const netWorth = totalAssets - totalLiab;
  const debtRatio = totalAssets > 0 ? (totalLiab / totalAssets) * 100 : 0;

  // Bar chart data: assets vs liabilities breakdown
  const barData = [
    ...ASSET_FIELDS.filter((f) => (assets[f.key] || 0) > 0).map((f) => ({
      name: f.label, value: assets[f.key], type: 'Asset', color: f.color,
    })),
    ...LIAB_FIELDS.filter((f) => (liabilities[f.key] || 0) > 0).map((f) => ({
      name: f.label, value: liabilities[f.key], type: 'Liability', color: f.color,
    })),
  ];

  // Trend chart data from saved snapshots
  const trendData = useMemo(
    () => snapshots.map((s) => ({
      date:        s.savedAt.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' }),
      label:       s.label || s.savedAt.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' }),
      assets:      Object.values(s.assets).reduce((a, v) => a + v, 0),
      liabilities: Object.values(s.liabilities).reduce((a, v) => a + v, 0),
      netWorth:    s.netWorth,
    })),
    [snapshots]
  );

  const handleSave = async () => {
    if (!user) { await signIn(); return; }
    setSaving(true);
    try {
      await save(assets, liabilities, saveLabel || new Date().toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }));
      setSaveLabel('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <PieChart size={20} className="text-[#6366F1]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Net Worth Dashboard
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Track assets vs liabilities over time — saved to your account
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: 'Total Assets',     value: formatRand(totalAssets, 0),  color: C.emerald, sub: '' },
          { label: 'Total Liabilities', value: formatRand(totalLiab, 0),   color: C.red,     sub: '' },
          { label: 'Net Worth',         value: formatRand(netWorth, 0),    color: netWorth >= 0 ? C.indigo : C.red, sub: '' },
          { label: 'Debt-to-Asset',     value: `${debtRatio.toFixed(1)}%`, color: debtRatio < 40 ? C.emerald : debtRatio < 70 ? C.amber : C.red,
            sub: debtRatio < 40 ? 'Healthy' : debtRatio < 70 ? 'Moderate' : 'High' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card-static p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-text-subtle)' }}>{kpi.label}</p>
            <p className="text-lg font-bold leading-tight"
              style={{ color: kpi.color, fontFamily: 'var(--font-heading)' }}>
              {kpi.value}
            </p>
            {kpi.sub && (
              <p className="text-[10px] mt-0.5" style={{ color: kpi.color }}>{kpi.sub}</p>
            )}
          </div>
        ))}
      </motion.div>

      {/* Inputs: Assets + Liabilities */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {/* Assets */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-sm font-bold" style={{ color: C.emerald, fontFamily: 'var(--font-heading)' }}>
              Assets
            </p>
            <span className="ml-auto text-xs font-semibold" style={{ color: C.emerald }}>
              {formatRand(totalAssets, 0)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ASSET_FIELDS.map((f) => (
              <InputField
                key={f.key}
                id={`asset-${f.key}`}
                label={f.label}
                value={assets[f.key]}
                onChange={(v) => setAssets((a) => ({ ...a, [f.key]: parseFloat(v) || 0 }))}
                prefix="R"
              />
            ))}
          </div>
        </div>

        {/* Liabilities */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <p className="text-sm font-bold" style={{ color: C.red, fontFamily: 'var(--font-heading)' }}>
              Liabilities
            </p>
            <span className="ml-auto text-xs font-semibold" style={{ color: C.red }}>
              {formatRand(totalLiab, 0)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {LIAB_FIELDS.map((f) => (
              <InputField
                key={f.key}
                id={`liab-${f.key}`}
                label={f.label}
                value={liabilities[f.key]}
                onChange={(v) => setLiab((l) => ({ ...l, [f.key]: parseFloat(v) || 0 }))}
                prefix="R"
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Breakdown bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card-static p-5"
      >
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Breakdown
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 5, right: 10, left: 5, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
            <Tooltip formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Save snapshot */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card p-5"
      >
        <p className="text-sm font-semibold mb-3"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Save Snapshot
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Save today's figures to track your net worth over time. Requires a Google account.
        </p>
        <div className="flex gap-3 flex-wrap">
          <input
            className="flex-1 min-w-[160px] px-3 py-2 rounded-xl text-sm bg-transparent border outline-none"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'var(--color-text)' }}
            placeholder={`e.g. ${new Date().toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}`}
            value={saveLabel}
            onChange={(e) => setSaveLabel(e.target.value)}
          />
          {user ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(99,102,241,0.15)', color: C.indigo, border: `1px solid rgba(99,102,241,0.3)` }}>
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Snapshot'}
            </button>
          ) : (
            <button
              onClick={signIn}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(99,102,241,0.15)', color: C.indigo, border: `1px solid rgba(99,102,241,0.3)` }}>
              <LogIn size={14} />
              Sign in to Save
            </button>
          )}
        </div>
      </motion.div>

      {/* Trend chart (only if saved data exists) */}
      {trendData.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card-static p-5"
        >
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Net Worth Trend
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Your net worth over time from saved snapshots
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradNW" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.indigo} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.emerald} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.emerald} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.red} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.red} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Area type="monotone" dataKey="assets" name="Assets" stroke={C.emerald}
                strokeWidth={2} fill="url(#gradA)" />
              <Area type="monotone" dataKey="liabilities" name="Liabilities" stroke={C.red}
                strokeWidth={2} fill="url(#gradL)" />
              <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke={C.indigo}
                strokeWidth={2.5} fill="url(#gradNW)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Snapshot history */}
      {user && snapshots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card-static p-5"
        >
          <button
            className="flex items-center gap-2 w-full text-left"
            onClick={() => setShowHistory((v) => !v)}
          >
            <p className="text-sm font-semibold flex-1"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Saved Snapshots ({snapshots.length})
            </p>
            {showHistory ? <ChevronUp size={15} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={15} style={{ color: 'var(--color-text-muted)' }} />}
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  {[...snapshots].reverse().map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate"
                          style={{ color: 'var(--color-text)' }}>
                          {s.label || s.savedAt.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {s.savedAt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold"
                          style={{ color: s.netWorth >= 0 ? C.indigo : C.red }}>
                          {formatRand(s.netWorth, 0)}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                          net worth
                        </p>
                      </div>
                      <button
                        onClick={() => remove(s.id)}
                        className="p-1.5 rounded-lg transition-all"
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
        Snapshots stored securely in your account. Not financial advice.
      </p>
    </div>
  );
}
