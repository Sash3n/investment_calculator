import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Calculator } from 'lucide-react';

const suggestions = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Mortgage Calculator', to: '/mortgage', icon: Calculator },
  { label: 'Property ROI', to: '/property-roi', icon: Calculator },
];

export function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center"
    >
      {/* Glow orb */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Status code */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, type: 'spring' }}
        className="relative"
      >
        <p
          className="text-[120px] font-black leading-none select-none"
          style={{
            fontFamily: 'var(--font-heading)',
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 40%, #C7D2FE 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </p>
        <div
          className="absolute inset-0 blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
        />
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-2 mb-8 space-y-2"
      >
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}
        >
          Page not found
        </h1>
        <p
          className="text-sm max-w-sm mx-auto"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
        >
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="flex flex-wrap items-center justify-center gap-3 mb-10"
      >
        <button
          onClick={() => window.history.back()}
          className="btn-ghost flex items-center gap-2 text-sm py-2.5 px-5"
        >
          <ArrowLeft size={15} /> Go Back
        </button>
        <Link to="/" className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5">
          <Home size={15} /> Go Home
        </Link>
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <p
          className="text-[11px] uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}
        >
          Quick links
        </p>
        <div className="space-y-2">
          {suggestions.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.to}
                to={s.to}
                className="glass-card-static flex items-center gap-3 p-3 hover:border-[#6366F1] transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <Icon size={14} className="text-[#6366F1]" />
                </div>
                <span
                  className="text-sm font-medium group-hover:text-[#818CF8] transition-colors"
                  style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
                >
                  {s.label}
                </span>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
