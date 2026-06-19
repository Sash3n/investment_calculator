import { type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

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
export function EmptyState({ icon: Icon, title, message, actionLabel, actionTo, color = '#6366F1' }: EmptyStateProps) {
  return (
    <div className="glass-card p-10 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `${color}18` }}>
        <Icon size={26} style={{ color }} />
      </div>
      <p className="text-base font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
        {title}
      </p>
      <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--color-text-muted)' }}>
        {message}
      </p>
      {actionLabel && actionTo && (
        <Link to={actionTo}>
          <button
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ background: `${color}1f`, color, border: `1px solid ${color}40` }}
          >
            {actionLabel}
          </button>
        </Link>
      )}
    </div>
  );
}
