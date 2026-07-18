import type { ReactNode } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Route guard for signed-in-only sections. Shows a spinner while auth state
 * resolves, a sign-in prompt when signed out, and children when signed in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" role="status" aria-label="Checking sign-in">
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid var(--color-border)', borderTopColor: '#6366F1' }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <div className="glass-card p-8 mt-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <ShieldCheck size={26} className="text-[#6366F1]" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Sign in to manage your portfolio
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
            Your property records, expenses, maintenance logs and rent history are stored privately
            in your own cloud account, visible only to you and removable at any time.
          </p>
          <button
            onClick={signIn}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            <LogIn size={15} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
