import { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePrimeRate } from '../../hooks/usePrimeRate';
import {
  Home,
  Building2,
  MapPin,
  Car,
  TrendingUp,
  Menu,
  X,
  ChevronRight,
  BarChart3,
  Sun,
  Moon,
  Receipt,
  Wallet,
  AlertTriangle,
  LogIn,
  LogOut,
  History,
} from 'lucide-react';
import clsx from 'clsx';

function DisclaimerBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('fincalc-disclaimer');
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('fincalc-disclaimer', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl rounded-2xl p-4 shadow-2xl"
      style={{
        background: 'rgba(15,23,42,0.97)',
        border: '1px solid rgba(245,158,11,0.35)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex gap-3">
        <AlertTriangle size={18} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#F59E0B] mb-1">Educational Purposes Only</p>
          <p className="text-[11px] leading-relaxed" style={{ color: '#94A3B8' }}>
            FinCalc ZA provides general financial illustrations for educational purposes only.
            All calculations are estimates and <strong style={{ color: '#CBD5E1' }}>do not constitute financial, tax, investment, or legal advice</strong>.
            Consult a <strong style={{ color: '#CBD5E1' }}>certified financial planner (CFP)</strong> or SARS-registered tax practitioner
            before making any financial decisions. Figures are based on publicly available SARS information and may not reflect the latest rates.
          </p>
        </div>
        <button
          onClick={accept}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          I understand
        </button>
      </div>
    </div>
  );
}

interface NavItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: typeof Home;
  color: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', shortLabel: 'Home', icon: Home, color: '#6366F1' },
  { path: '/mortgage', label: 'Mortgage Calculator', shortLabel: 'Mortgage', icon: Building2, color: '#F59E0B' },
  { path: '/property-roi', label: 'Property ROI', shortLabel: 'Property', icon: MapPin, color: '#10B981' },
  { path: '/car-finance', label: 'Car Finance', shortLabel: 'Car', icon: Car, color: '#EC4899' },
  { path: '/extra-vs-investing', label: 'Extra vs Investing', shortLabel: 'Invest', icon: TrendingUp, color: '#06B6D4' },
  { path: '/tax-planner', label: 'Tax Planner', shortLabel: 'Tax', icon: Receipt, color: '#10B981' },
  { path: '/investment-strategy', label: 'Investment Strategy', shortLabel: 'Strategy', icon: Wallet, color: '#8B5CF6' },
  { path: '/history', label: 'Calculation History', shortLabel: 'History', icon: History, color: '#F59E0B' },
  { path: '/portfolio', label: 'Portfolio Summary', shortLabel: 'Portfolio', icon: Building2, color: '#10B981' },
  { path: '/tax-projections', label: 'Tax Projections', shortLabel: 'Tax Proj.', icon: TrendingUp, color: '#06B6D4' },
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/mortgage': 'Mortgage Calculator',
  '/property-roi': 'Property ROI Calculator',
  '/car-finance': 'Car Finance Calculator',
  '/extra-vs-investing': 'Extra Payments vs Investing',
  '/tax-planner': 'Property Tax Planner',
  '/investment-strategy': 'SA Investment Strategy',
  '/history': 'Calculation History',
  '/portfolio': 'Portfolio Summary',
  '/tax-projections': 'Tax Projections',
};

export function AppShell() {
  const liveRate = usePrimeRate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('fincalc-theme') as 'dark' | 'light') ?? 'dark';
  });
  const { user, signIn, signOut } = useAuth();
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] ?? 'FinCalc ZA';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fincalc-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <DisclaimerBanner />
      {/* ── Mobile overlay ─────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────── */}
      <aside
        className={clsx(
          'sidebar-glass fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[rgba(255,255,255,0.08)]">
          <div className="w-9 h-9 rounded-xl bg-[rgba(99,102,241,0.2)] flex items-center justify-center flex-shrink-0 border border-[rgba(99,102,241,0.3)]">
            <BarChart3 size={18} className="text-[#6366F1]" />
          </div>
          <div>
            <p
              className="text-base font-bold leading-none"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}
            >
              FinCalc ZA
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}>
              Smart Investment Tools
            </p>
          </div>
          <button
            className="ml-auto lg:hidden transition-colors p-1"
            style={{ color: 'var(--color-text-muted)' }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: 'var(--color-text-subtle)' }}>
            Calculators
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.25)]'
                      : 'hover:bg-[rgba(99,102,241,0.08)]'
                  )
                }
                style={({ isActive }) => ({
                  fontFamily: 'var(--font-body)',
                  color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                })}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                      style={{
                        background: isActive
                          ? `${item.color}22`
                          : 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Icon
                        size={15}
                        style={{ color: isActive ? item.color : 'var(--color-text-subtle)' }}
                      />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight size={14} className="text-[#6366F1] opacity-60" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] space-y-1">
          {user && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              {user.photoURL && <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold truncate" style={{ color: '#818CF8' }}>{user.displayName}</p>
                <p className="text-[9px] truncate" style={{ color: 'var(--color-text-subtle)' }}>Syncing to cloud</p>
              </div>
            </div>
          )}
          <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}>
            Prime Rate:{' '}
            <span className="text-[#F59E0B] font-semibold">
              {liveRate.loading ? '…' : `${liveRate.primeRate}%`}
            </span>
            {!liveRate.loading && !liveRate.fallback && liveRate.asOf && (
              <span className="text-[#475569]"> · {new Date(liveRate.asOf).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            )}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}>
            All values in South African Rand
          </p>
          <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-[10px] leading-relaxed font-medium" style={{ color: '#F59E0B', fontFamily: 'var(--font-body)' }}>
              ⚠ Educational use only
            </p>
            <p className="text-[9px] leading-relaxed mt-0.5" style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}>
              Not financial advice. Consult a CFP before investing.
            </p>
            <button
              className="text-[9px] mt-1 underline"
              style={{ color: 'var(--color-text-subtle)' }}
              onClick={() => { localStorage.removeItem('fincalc-disclaimer'); window.location.reload(); }}
            >
              View full disclaimer
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header
          className="sticky top-0 z-20 flex items-center gap-4 px-5 py-4 backdrop-blur-xl"
          style={{
            background: 'var(--color-bg)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <button
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={17} />
          </button>

          <h1
            className="text-base font-semibold"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}
          >
            {pageTitle}
          </h1>

          <div className="ml-auto flex items-center gap-3">
            <span
              className="text-xs hidden sm:block"
              style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}
            >
              ZAR • South Africa
            </span>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                background: 'var(--color-surface)',
              }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* Auth */}
            {user ? (
              <div
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? 'User'}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.3)', color: '#818CF8' }}>
                    {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium hidden sm:block max-w-[100px] truncate" style={{ color: '#818CF8' }}>
                  {user.displayName?.split(' ')[0] ?? user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ml-1"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}
                  title="Sign out"
                >
                  <LogOut size={11} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                <LogIn size={13} />
                <span className="hidden sm:inline">Sign in with Google</span>
              </button>
            )}
            <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" title="All systems operational" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom tab bar ──────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex backdrop-blur-xl"
        style={{
          background: 'var(--color-bg)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-medium transition-all duration-200"
              style={({ isActive }) => ({
                fontFamily: 'var(--font-body)',
                color: isActive ? '#6366F1' : 'var(--color-text-subtle)',
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="w-8 h-6 flex items-center justify-center rounded-lg transition-all duration-200"
                    style={{
                      background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                    }}
                  >
                    <Icon
                      size={16}
                      style={{ color: isActive ? '#6366F1' : 'var(--color-text-subtle)' }}
                    />
                  </span>
                  <span>{item.shortLabel}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
