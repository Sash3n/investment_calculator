import { useState } from 'react';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Trash2, LogIn, Building2, Car, TrendingUp, Receipt, Wallet, Home, ExternalLink, GitCompare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHistory, type CalcType } from '../hooks/useFirestore';

const CALC_ROUTES: Record<CalcType, string> = {
  mortgage:  '/mortgage',
  property:  '/property-roi',
  car:       '/car-finance',
  investing: '/extra-vs-investing',
  strategy:  '/investment-strategy',
  tax:       '/tax-planner',
};

const TYPE_META: Record<CalcType, { label: string; icon: typeof Home; color: string }> = {
  mortgage:   { label: 'Mortgage',            icon: Building2,  color: '#F59E0B' },
  property:   { label: 'Property ROI',        icon: Home,       color: '#10B981' },
  car:        { label: 'Car Finance',         icon: Car,        color: '#EC4899' },
  investing:  { label: 'Extra vs Investing',  icon: TrendingUp, color: '#06B6D4' },
  strategy:   { label: 'Investment Strategy', icon: Wallet,     color: '#8B5CF6' },
  tax:        { label: 'Tax Planner',         icon: Receipt,    color: '#10B981' },
};

export function History() {
  const { user, signIn } = useAuth();
  const { entries, loading, clear, remove } = useHistory(user?.uid ?? null);
  const navigate = useNavigate();

  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  function toggleSelect(id: string, type: CalcType) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length === 2) return prev; // max 2
      // Only allow same type
      const firstType = entries.find((e) => e.id === prev[0])?.type;
      if (prev.length === 1 && firstType && firstType !== type) return prev;
      return [...prev, id];
    });
  }

  function startCompare() {
    const [idA, idB] = selected;
    const entryA = entries.find((e) => e.id === idA);
    const entryB = entries.find((e) => e.id === idB);
    if (!entryA || !entryB) return;
    navigate('/compare', { state: { entryA, entryB } });
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelected([]);
  }

  const selectedType = selected.length > 0 ? entries.find((e) => e.id === selected[0])?.type : null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <HistoryIcon size={28} className="text-[#6366F1]" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Sign in to view history</h2>
          <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
            Your calculation history is saved to your account. Sign in with Google to access it across all your devices.
          </p>
        </div>
        <button
          onClick={signIn}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}
        >
          <LogIn size={16} /> Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <HistoryIcon size={20} className="text-[#F59E0B]" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Calculation History
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Last 50 calculations · synced to your account
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Compare mode toggle */}
          {entries.length >= 2 && !compareMode && (
            <button
              onClick={() => setCompareMode(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              <GitCompare size={13} /> Compare
            </button>
          )}
          {compareMode && (
            <button
              onClick={exitCompareMode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <X size={13} /> Cancel
            </button>
          )}
          {entries.length > 0 && !compareMode && (
            <button
              onClick={() => { if (confirm('Clear all history?')) clear(); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <Trash2 size={13} /> Clear all
            </button>
          )}
        </div>
      </motion.div>

      {/* Compare mode hint */}
      {compareMode && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-3 flex items-center justify-between gap-3"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div>
            <p className="text-xs font-semibold" style={{ color: '#818CF8' }}>
              {selected.length === 0 && 'Select two snapshots of the same type to compare'}
              {selected.length === 1 && `1 selected — pick one more ${selectedType ? `(${TYPE_META[selectedType].label})` : ''}`}
              {selected.length === 2 && 'Ready to compare!'}
            </p>
            {selected.length === 1 && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                Only snapshots of the same calculator type can be compared.
              </p>
            )}
          </div>
          {selected.length === 2 && (
            <button
              onClick={startCompare}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 flex-shrink-0"
            >
              <GitCompare size={13} /> Compare now
            </button>
          )}
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card p-10 text-center space-y-3">
          <HistoryIcon size={32} className="mx-auto opacity-30" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No history yet</p>
          <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
            Save calculations from any calculator to see them here.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const meta = TYPE_META[entry.type];
            const Icon = meta.icon;
            const isSelected = selected.includes(entry.id);
            const isDisabled = compareMode && selected.length === 1
              && !isSelected
              && entries.find((e) => e.id === selected[0])?.type !== entry.type;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card p-4 flex items-center gap-4 transition-all"
                style={{
                  opacity: isDisabled ? 0.35 : 1,
                  borderColor: isSelected ? '#6366F1' : undefined,
                  cursor: compareMode && !isDisabled ? 'pointer' : undefined,
                }}
                onClick={() => compareMode && !isDisabled && toggleSelect(entry.id, entry.type)}
              >
                {/* Compare checkbox */}
                {compareMode && (
                  <div
                    className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
                    style={{
                      background: isSelected ? '#6366F1' : 'rgba(99,102,241,0.1)',
                      border: `2px solid ${isSelected ? '#6366F1' : 'rgba(99,102,241,0.3)'}`,
                    }}
                  >
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {isSelected && (
                      <span className="sr-only">
                        {selected.indexOf(entry.id) === 0 ? 'A' : 'B'}
                      </span>
                    )}
                  </div>
                )}

                {/* A/B badge when selected */}
                {compareMode && isSelected && (
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 -ml-2"
                    style={{
                      background: selected.indexOf(entry.id) === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)',
                      color: selected.indexOf(entry.id) === 0 ? '#818CF8' : '#F59E0B',
                    }}
                  >
                    {selected.indexOf(entry.id) === 0 ? 'A' : 'B'}
                  </div>
                )}

                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}
                >
                  <Icon size={16} style={{ color: meta.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {entry.title}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {entry.summary}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <p className="text-[10px] font-medium" style={{ color: meta.color }}>
                    {meta.label}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                    {entry.savedAt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {!compareMode && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(CALC_ROUTES[entry.type], { state: { loadedInputs: entry.inputs, entryId: entry.id } })}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                        style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
                      >
                        <ExternalLink size={10} /> Open
                      </button>
                      <button
                        onClick={() => remove(entry.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}
                        title="Delete"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        History is for reference only. All figures are estimates and do not constitute financial advice.
      </p>
    </div>
  );
}
