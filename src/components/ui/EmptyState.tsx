import { type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { alpha } from '../../utils/color';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  /** Optional call-to-action button linking to another route. */
  actionLabel?: string;
  actionTo?: string;
  /** Accent colour for the icon badge / CTA. */
  color?: string;
}

/**
 * Consistent empty-state panel used when a calculator has no data to show
 * (e.g. no saved portfolio, no history). Keeps look & feel uniform app-wide.
 */
export function EmptyState({ icon: Icon, title, message, actionLabel, actionTo, color = 'var(--note-blue)' }: EmptyStateProps) {
  return (
    <div className="glass-card p-10 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `${alpha(color, 9)}` }}>
        <Icon size={26} style={{ color }} />
      </div>
      <p className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
        {title}
      </p>
      <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--ink-muted)' }}>
        {message}
      </p>
      {actionLabel && actionTo && (
        <Link to={actionTo}>
          <button
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ background: `${alpha(color, 12)}`, color, border: `1px solid ${alpha(color, 25)}` }}
          >
            {actionLabel}
          </button>
        </Link>
      )}
    </div>
  );
}
