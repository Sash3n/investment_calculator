/**
 * SaveLoadBar — reusable save + load panel for all calculators.
 * Shows a "Save snapshot" button when signed in, and a collapsible
 * list of previous saves for that calculator type.
 */

import { useState } from 'react';
import { Save, FolderOpen, Trash2, LogIn, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHistory, type CalcType } from '../../hooks/useFirestore';

interface Props<T> {
  type: CalcType;
  title: string;    // auto-generated from current inputs
  summary: string;  // key result line
  inputs: T;
  onLoad: (inputs: T) => void;
}

export function SaveLoadBar<T>({ type, title, summary, inputs: _inputs, onLoad }: Props<T>) {
  const { user, signIn } = useAuth();
  const { entries, loading, push, remove } = useHistory(user?.uid ?? null);
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const relevant = entries.filter((e) => e.type === type);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await push({ type, title, summary, inputs: _inputs as Record<string, unknown> });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
        style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid var(--color-border)' }}
      >
        <LogIn size={13} style={{ color: 'var(--color-text-subtle)' }} />
        <span style={{ color: 'var(--color-text-muted)' }}>
          <button onClick={signIn} className="underline font-medium" style={{ color: '#818CF8' }}>
            Sign in
          </button>
          {' '}to save & load snapshots
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: 'var(--color-surface)' }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
          style={{ background: 'rgba(99,102,241,0.12)', color: saved ? '#10B981' : '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <Save size={12} />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save snapshot'}
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-auto"
          style={{ background: relevant.length ? 'rgba(245,158,11,0.08)' : 'transparent', color: 'var(--color-text-muted)', border: `1px solid ${relevant.length ? 'rgba(245,158,11,0.2)' : 'var(--color-border)'}` }}
        >
          <FolderOpen size={12} />
          {relevant.length} saved
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Saved entries */}
      {open && (
        <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
            </div>
          ) : relevant.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-subtle)' }}>
              No saved snapshots yet — click "Save snapshot" above.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {relevant.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Clock size={13} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {entry.title}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {entry.summary}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                      {entry.savedAt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => { onLoad(entry.inputs as T); setOpen(false); }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                      style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => remove(entry.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
