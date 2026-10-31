/**
 * SaveLoadBar — reusable save + load panel for all calculators.
 * Shows a "Save snapshot" button when signed in, and a collapsible
 * list of previous saves for that calculator type.
 * Supports editing: click "Edit" on an entry to load it and enter update mode.
 */

import { useState, useRef } from 'react';
import { Save, FolderOpen, Trash2, LogIn, ChevronDown, ChevronUp, Clock, Pencil, Check, X, FilePlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHistory, type CalcType } from '../../hooks/useFirestore';

interface Props<T> {
  type: CalcType;
  title: string;    // auto-generated from current inputs
  summary: string;  // key result line
  inputs: T;
  onLoad: (inputs: T) => void;
  /** Pre-select an entry as "currently editing" (e.g. when navigated from History) */
  initialEditingId?: string;
}

export function SaveLoadBar<T>({ type, title, summary, inputs: _inputs, onLoad, initialEditingId }: Props<T>) {
  const { user, signIn } = useAuth();
  const { entries, loading, push, update, remove, rename } = useHistory(user?.uid ?? null);
  const [open, setOpen]             = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);
  // Which entry we're currently editing (null = creating new)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(initialEditingId ?? null);
  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  const relevant = entries.filter((e) => e.type === type);
  const activeEntry = activeEntryId ? relevant.find((e) => e.id === activeEntryId) : null;

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
    setTimeout(() => renameRef.current?.select(), 0);
  };

  const commitRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) await rename(id, trimmed);
    setRenamingId(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      if (activeEntryId) {
        // Update the existing entry with current inputs
        await update(activeEntryId, { type, title, summary, inputs: _inputs as Record<string, unknown> });
      } else {
        await push({ type, title, summary, inputs: _inputs as Record<string, unknown> });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')
        ? 'Save failed: Firestore rules not configured.'
        : `Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
        style={{ background: 'color-mix(in srgb, var(--ink-subtle) 8%, transparent)', border: '1px solid var(--rule)' }}
      >
        <LogIn size={13} style={{ color: 'var(--ink-subtle)' }} />
        <span style={{ color: 'var(--ink-muted)' }}>
          <button onClick={signIn} className="underline font-medium" style={{ color: 'var(--note-blue-ink)' }}>
            Sign in
          </button>
          {' '}to save & load snapshots
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--rule)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: 'var(--paper-raised)' }}
      >
        {/* Active-edit indicator */}
        {activeEntry && (
          <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg truncate max-w-[140px]"
            style={{ background: 'color-mix(in srgb, var(--note-orange) 8%, transparent)', color: 'var(--note-orange-ink)', border: '1px solid color-mix(in srgb, var(--note-orange) 20%, transparent)' }}>
            <Pencil size={10} />
            <span className="truncate">{activeEntry.title}</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
          style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', color: saved ? 'var(--gain-ink)' : 'var(--note-blue-ink)', border: '1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)' }}
        >
          <Save size={12} />
          {saved ? 'Saved!' : saving ? 'Saving…' : activeEntryId ? 'Update snapshot' : 'Save snapshot'}
        </button>

        {/* "Save as new" escape hatch when in update mode */}
        {activeEntryId && (
          <button
            onClick={() => setActiveEntryId(null)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={{ color: 'var(--ink-subtle)', border: '1px solid var(--rule)' }}
            title="Discard edit — save as new snapshot instead"
          >
            <FilePlus size={11} /> New
          </button>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-auto"
          style={{ background: relevant.length ? 'color-mix(in srgb, var(--note-orange) 8%, transparent)' : 'transparent', color: 'var(--ink-muted)', border: `1px solid ${relevant.length ? 'color-mix(in srgb, var(--note-orange) 20%, transparent)' : 'var(--rule)'}` }}
        >
          <FolderOpen size={12} />
          {relevant.length} saved
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="px-3 py-2 text-xs flex items-center gap-2"
          style={{ background: 'color-mix(in srgb, var(--loss) 8%, transparent)', borderTop: '1px solid color-mix(in srgb, var(--loss) 20%, transparent)', color: 'var(--loss-ink)' }}
        >
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="font-bold opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Saved entries */}
      {open && (
        <div style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper)' }}>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 rounded-full border-2 border-note-blue border-t-transparent animate-spin" />
            </div>
          ) : relevant.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--ink-subtle)' }}>
              No saved snapshots yet — click "Save snapshot" above.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--rule)' }}>
              {relevant.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={activeEntryId === entry.id ? { background: 'color-mix(in srgb, var(--note-orange) 5%, transparent)' } : undefined}
                >
                  <Clock size={13} style={{ color: activeEntryId === entry.id ? 'var(--note-orange-ink)' : 'var(--ink-subtle)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    {renamingId === entry.id ? (
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRename(entry.id); if (e.key === 'Escape') setRenamingId(null); }}
                        className="w-full text-xs font-medium rounded px-1.5 py-0.5 outline-none"
                        style={{ background: 'color-mix(in srgb, var(--note-blue) 10%, transparent)', color: 'var(--ink)', border: '1px solid color-mix(in srgb, var(--note-blue) 35%, transparent)' }}
                      />
                    ) : (
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>
                        {entry.title}
                      </p>
                    )}
                    <p className="text-[10px] truncate" style={{ color: 'var(--ink-muted)' }}>
                      {entry.summary}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--ink-subtle)' }}>
                      {entry.savedAt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {renamingId === entry.id ? (
                      <>
                        <button
                          onClick={() => commitRename(entry.id)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'color-mix(in srgb, var(--gain) 10%, transparent)', color: 'var(--gain-ink)', border: '1px solid color-mix(in srgb, var(--gain) 25%, transparent)' }}
                          title="Save name"
                        >
                          <Check size={11} />
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'color-mix(in srgb, var(--ink-subtle) 10%, transparent)', color: 'var(--ink-muted)', border: '1px solid var(--rule)' }}
                          title="Cancel"
                        >
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startRename(entry.id, entry.title)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'color-mix(in srgb, var(--ink-subtle) 8%, transparent)', color: 'var(--ink-subtle)', border: '1px solid var(--rule)' }}
                          title="Rename"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => {
                            onLoad(entry.inputs as T);
                            setActiveEntryId(entry.id);
                            setOpen(false);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                          style={{
                            background: activeEntryId === entry.id ? 'color-mix(in srgb, var(--note-orange) 15%, transparent)' : 'color-mix(in srgb, var(--note-blue) 12%, transparent)',
                            color: activeEntryId === entry.id ? 'var(--note-orange-ink)' : 'var(--note-blue-ink)',
                            border: `1px solid ${activeEntryId === entry.id ? 'color-mix(in srgb, var(--note-orange) 30%, transparent)' : 'color-mix(in srgb, var(--note-blue) 20%, transparent)'}`,
                          }}
                        >
                          {activeEntryId === entry.id ? 'Editing' : 'Edit'}
                        </button>
                        <button
                          onClick={() => {
                            remove(entry.id);
                            if (activeEntryId === entry.id) setActiveEntryId(null);
                          }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'color-mix(in srgb, var(--loss) 8%, transparent)', color: 'var(--loss-ink)', border: '1px solid color-mix(in srgb, var(--loss) 15%, transparent)' }}
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
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
