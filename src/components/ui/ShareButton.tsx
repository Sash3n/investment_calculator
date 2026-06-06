import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { buildShareUrl } from '../../utils/share';

/**
 * Copies a shareable link (current inputs encoded in the URL) to the clipboard
 * and reflects it in the address bar so it can be bookmarked.
 */
export function ShareButton({ state }: { state: unknown }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = buildShareUrl(state);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard may be blocked — the address bar still updates below */
    }
    window.history.replaceState(null, '', url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all flex-shrink-0"
      style={{
        background: copied ? 'rgba(16,185,129,0.12)' : 'var(--color-surface)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'var(--color-border)'}`,
        color: copied ? '#10B981' : 'var(--color-text-muted)',
      }}
      title="Copy a shareable link to this scenario"
    >
      {copied ? <Check size={13} /> : <Share2 size={13} />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
