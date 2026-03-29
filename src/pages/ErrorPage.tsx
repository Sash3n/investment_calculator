import { motion } from 'framer-motion';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export function ErrorPage() {
  const error = useRouteError();

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
  } else if (error instanceof Error) {
    message = error.message;
  }

  const statusColor =
    status >= 500 ? '#EF4444' : status === 403 ? '#F59E0B' : '#6366F1';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--color-bg, #0A0F1E)' }}>

      {/* Glow */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${statusColor}18 0%, transparent 70%)`,
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
          style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}30` }}
        >
          <AlertTriangle size={28} style={{ color: statusColor }} />
        </div>

        {/* Status code */}
        <p
          className="text-7xl font-black leading-none mb-4"
          style={{
            fontFamily: 'var(--font-heading)',
            background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}99 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {status}
        </p>

        {/* Message */}
        <h1
          className="text-xl font-bold mb-2"
          style={{ color: 'var(--color-text, #F1F5F9)', fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: 'var(--color-text-muted, #94A3B8)', fontFamily: 'var(--font-body)' }}
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
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
          >
            {error.stack ?? error.message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
