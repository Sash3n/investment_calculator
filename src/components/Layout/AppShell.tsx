import { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePrimeRate } from '../../hooks/usePrimeRate';
import {
  Menu, X, ChevronRight, ChevronDown, BarChart3, Sun, Moon,
  AlertTriangle, LogIn, LogOut, Star, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { NAV_CATEGORIES, NAV_ITEMS, NAV_BY_PATH, PAGE_TITLES, type NavItem } from '../../config/nav';
import { CommandPalette } from '../CommandPalette';
import { useNavPrefs } from '../../hooks/useNavPrefs';

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

/** Single sidebar nav row, with a pin/favourite toggle on hover. */
function SidebarLink({ item, favourite, onToggleFav }: { item: NavItem; favourite: boolean; onToggleFav: (path: string) => void }) {
  const Icon = item.icon;
  return (
    <NavLink
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
            style={{ background: isActive ? `${item.color}22` : 'rgba(255,255,255,0.04)' }}
          >
            <Icon size={15} style={{ color: isActive ? item.color : 'var(--color-text-subtle)' }} />
          </span>
          <span className="flex-1 truncate">{item.label}</span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(item.path); }}
            className={clsx('flex-shrink-0 p-0.5 rounded transition-opacity', favourite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
            aria-label={favourite ? 'Unpin from favourites' : 'Pin to favourites'}
            title={favourite ? 'Unpin' : 'Pin to favourites'}
          >
            <Star size={13} style={{ color: favourite ? '#F59E0B' : 'var(--color-text-subtle)' }} fill={favourite ? '#F59E0B' : 'none'} />
          </button>
          {isActive && !favourite && <ChevronRight size={14} className="text-[#6366F1] opacity-60 group-hover:hidden" />}
        </>
      )}
    </NavLink>
  );
}

const COLLAPSE_KEY = 'fincalc-nav-collapsed';

export function AppShell() {
  const liveRate = usePrimeRate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('fincalc-theme') as 'dark' | 'light') ?? 'dark';
  });
  const { user, signIn, signOut } = useAuth();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'FinCalc ZA';

  const { favourites, recents, toggleFavourite, isFavourite, recordVisit } = useNavPrefs();
  const favItems = favourites.map((p) => NAV_BY_PATH[p]).filter(Boolean);
  const recentItems = recents
    .filter((p) => !favourites.includes(p))
    .map((p) => NAV_BY_PATH[p])
    .filter(Boolean)
    .slice(0, 5);

  // Record each visited calculator for the "Recent" list
  useEffect(() => {
    recordVisit(location.pathname);
  }, [location.pathname, recordVisit]);

  // Collapsible sidebar categories (persisted)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const toggleCategory = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      return next;
    });

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
            <p className="text-base font-bold leading-none" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
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

        {/* Nav — grouped + collapsible, with favourites & recents */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {/* Dashboard (overview) */}
          {NAV_CATEGORIES.filter((c) => c.id === 'overview').map((cat) => (
            <div key={cat.id} className="space-y-1">
              {cat.items.map((item) => (
                <SidebarLink key={item.path} item={item} favourite={isFavourite(item.path)} onToggleFav={toggleFavourite} />
              ))}
            </div>
          ))}

          {/* Favourites */}
          {favItems.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-3 mb-1">
                <Star size={11} style={{ color: '#F59E0B' }} fill="#F59E0B" />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>Favourites</span>
              </div>
              {favItems.map((item) => (
                <SidebarLink key={item.path} item={item} favourite onToggleFav={toggleFavourite} />
              ))}
            </div>
          )}

          {/* Recent */}
          {recentItems.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-3 mb-1">
                <Clock size={11} style={{ color: 'var(--color-text-subtle)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>Recent</span>
              </div>
              {recentItems.map((item) => (
                <SidebarLink key={item.path} item={item} favourite={isFavourite(item.path)} onToggleFav={toggleFavourite} />
              ))}
            </div>
          )}

          {/* Categories */}
          {NAV_CATEGORIES.filter((c) => c.id !== 'overview').map((cat) => {
            const isCollapsed = collapsed.has(cat.id);
            return (
              <div key={cat.id} className="space-y-1">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-3 mb-1 group"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>
                    {cat.label}
                  </span>
                  <ChevronDown
                    size={13}
                    className="transition-transform duration-200"
                    style={{ color: 'var(--color-text-subtle)', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                  />
                </button>
                {!isCollapsed && cat.items.map((item) => (
                  <SidebarLink key={item.path} item={item} favourite={isFavourite(item.path)} onToggleFav={toggleFavourite} />
                ))}
              </div>
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

          <h1 className="text-base font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            {pageTitle}
          </h1>

          <div className="ml-auto flex items-center gap-3">
            <CommandPalette />
            <span className="text-xs hidden lg:block" style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}>
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
              <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName ?? 'User'} className="w-6 h-6 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'rgba(99,102,241,0.3)', color: '#818CF8' }}>
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
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-30"
        style={{
          background: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        {/* Scroll-hint fade on right edge */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
          style={{ background: 'linear-gradient(to left, var(--color-bg) 10%, transparent 100%)' }}
        />
        <nav
          className="flex overflow-x-auto backdrop-blur-xl scrollbar-hidden"
          style={{ backdropFilter: 'blur(20px)', scrollbarWidth: 'none' }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className="flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-medium transition-all duration-200 flex-shrink-0"
                style={({ isActive }) => ({
                  fontFamily: 'var(--font-body)',
                  color: isActive ? '#6366F1' : 'var(--color-text-subtle)',
                  minWidth: '64px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                })}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="w-8 h-6 flex items-center justify-center rounded-lg transition-all duration-200"
                      style={{ background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent' }}
                    >
                      <Icon size={16} style={{ color: isActive ? '#6366F1' : 'var(--color-text-subtle)' }} />
                    </span>
                    <span className="truncate w-full text-center">{item.shortLabel}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
