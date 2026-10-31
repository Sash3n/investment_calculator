import { motion } from 'framer-motion';
import { isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { alpha, textTone } from '../utils/color';

export function ErrorPage({ error }: { error: unknown }) {
  let status = 500;
  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try refreshing the page.';

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 403) {
      title = 'Access denied';
      message = "You don't have permission to view this page.";
    } else if (status === 404) {
      title = 'Page not found';
      message = "The page you're looking for doesn't exist or has been moved.";
    } else if (status >= 500) {
      title = 'Server error';
      message = 'Something went wrong on our end. Please try again later.';
    }
  }

  const statusColor =
    status >= 500 ? 'var(--loss)' : status === 403 ? 'var(--note-orange)' : 'var(--note-blue)';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
      style={{ background: 'var(--color-bg, var(--paper))' }}>

      {/* Glow */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${alpha(statusColor, 9)} 0%, transparent 70%)`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-md w-full"
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: alpha(statusColor, 9), border: `1px solid ${alpha(statusColor, 19)}` }}
        >
          <AlertTriangle size={28} style={{ color: textTone(statusColor) }} />
        </div>

        {/* Status code */}
        <p
          className="text-7xl font-black leading-none mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            background: `linear-gradient(135deg, ${statusColor} 0%, ${alpha(statusColor, 60)} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {status}
        </p>

        {/* Message */}
        <h1
          className="text-xl font-bold mb-2"
          style={{ color: 'var(--color-text, var(--ink))', fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: 'var(--color-text-muted, var(--ink-muted))', fontFamily: 'var(--font-text)' }}
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost flex items-center gap-2 text-sm py-2.5 px-5"
          >
            <RefreshCw size={14} /> Retry
          </button>
          <Link to="/" className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5">
            <Home size={14} /> Go Home
          </Link>
        </div>

        {/* Error detail (dev only) */}
        {import.meta.env.DEV && error instanceof Error && (
          <div
            className="mt-8 p-4 rounded-xl text-left text-xs font-mono overflow-auto max-h-32"
            style={{ background: 'color-mix(in srgb, var(--loss) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--loss) 20%, transparent)', color: 'var(--loss-ink)' }}
          >
            {error.stack ?? error.message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
