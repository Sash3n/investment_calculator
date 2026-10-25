import { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePrimeRate } from '../../hooks/usePrimeRate';
import {
  Menu, X, ChevronRight, ChevronDown, BarChart3, Sun, Moon,
  Info, LogIn, LogOut, Star, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { NAV_CATEGORIES, NAV_ITEMS, NAV_BY_PATH, PAGE_TITLES, type NavItem } from '../../config/nav';
import { CommandPalette } from '../CommandPalette';
import { DisclaimerFooter, DisclaimerLink } from '../Disclaimer';
import { JourneyProvider } from '../../journeys/JourneyProvider';
import { JourneyBar } from '../../journeys/JourneyBar';
import { useNavPrefs } from '../../hooks/useNavPrefs';
import { alpha, textTone } from '../../utils/color';

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
            ? 'bg-note-blue/15 border border-note-blue/25'
            : 'hover:bg-note-blue/8'
        )
      }
      style={({ isActive }) => ({
        fontFamily: 'var(--font-text)',
        color: isActive ? 'var(--ink)' : 'var(--ink-muted)',
      })}
    >
      {({ isActive }) => (
        <>
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{ background: isActive ? alpha(item.color, 13) : 'color-mix(in srgb, var(--ink) 4%, transparent)' }}
          >
            <Icon size={15} style={{ color: textTone(isActive ? item.color : 'var(--ink-subtle)') }} />
          </span>
          <span className="flex-1 truncate">{item.label}</span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(item.path); }}
            className={clsx('flex-shrink-0 p-0.5 rounded transition-opacity', favourite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
            aria-label={favourite ? 'Unpin from favourites' : 'Pin to favourites'}
            title={favourite ? 'Unpin' : 'Pin to favourites'}
          >
            <Star size={13} style={{ color: favourite ? 'var(--note-orange-ink)' : 'var(--ink-subtle)' }} fill={favourite ? 'var(--note-orange)' : 'none'} />
          </button>
          {isActive && !favourite && <ChevronRight size={14} className="text-note-blue-ink opacity-60 group-hover:hidden" />}
        </>
      )}
    </NavLink>
  );
}

const COLLAPSE_KEY = 'fincalc-nav-collapsed';
const THEME_KEY = 'fincalc-color-theme';
/** Routes that show no estimates, so they get no "Estimate only" marker. */
const NOT_CALCULATORS = new Set(['/', '/history', '/learn', '/portfolio-hub', '/sars-codes']);

export function AppShell() {
  const liveRate = usePrimeRate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Light paper is the default. The old 'fincalc-theme' key was written on every
  // visit, so it cannot tell a real choice from the old dark default; a new key is
  // only written when the visitor actually toggles. public/theme-init.js reads it too.
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch { return 'light'; }
  });
  const { user, signIn, signOut } = useAuth();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'FinCalc ZA';
  const isCalculator = !!NAV_BY_PATH[location.pathname] && !NOT_CALCULATORS.has(location.pathname);

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
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      return next;
    });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch { /* storage blocked */ }
      return next;
    });

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
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--paper)' }}>
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
        <div className="flex items-center gap-3 px-5 py-5 border-b border-ink/8">
          <div className="w-9 h-9 rounded-xl bg-note-blue/20 flex items-center justify-center flex-shrink-0 border border-note-blue/30">
            <BarChart3 size={18} className="text-note-blue-ink" />
          </div>
          <div>
            <p className="text-base font-bold leading-none" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              FinCalc ZA
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-subtle)', fontFamily: 'var(--font-text)' }}>
              Smart Investment Tools
            </p>
          </div>
          <button
            className="ml-auto lg:hidden transition-colors p-1"
            style={{ color: 'var(--ink-muted)' }}
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
                <Star size={11} style={{ color: 'var(--note-orange-ink)' }} fill="var(--note-orange)" />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-subtle)' }}>Favourites</span>
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
                <Clock size={11} style={{ color: 'var(--ink-subtle)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-subtle)' }}>Recent</span>
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
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-subtle)' }}>
                    {cat.label}
                  </span>
                  <ChevronDown
                    size={13}
                    className="transition-transform duration-200"
                    style={{ color: 'var(--ink-subtle)', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
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
        <div className="px-5 py-4 border-t border-ink/6 space-y-1">
          {user && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded-xl" style={{ background: 'color-mix(in srgb, var(--note-blue) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 15%, transparent)' }}>
              {user.photoURL && <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--note-blue-ink)' }}>{user.displayName}</p>
                <p className="text-[9px] truncate" style={{ color: 'var(--ink-subtle)' }}>Syncing to cloud</p>
              </div>
            </div>
          )}
          <p className="text-[10px]" style={{ color: 'var(--ink-subtle)', fontFamily: 'var(--font-text)' }}>
            Prime Rate:{' '}
            <span className="text-note-orange-ink font-semibold">
              {liveRate.loading ? '…' : `${liveRate.primeRate}%`}
            </span>
            {!liveRate.loading && liveRate.asOf && (
              <span className="text-ink-subtle"> · {new Date(liveRate.asOf).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            )}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--ink-subtle)', fontFamily: 'var(--font-text)' }}>
            All values in South African Rand
          </p>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header
          className="sticky top-0 z-20 flex items-center gap-4 px-5 py-4 backdrop-blur-xl"
          style={{
            background: 'var(--paper)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <button
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: 'var(--paper-raised)',
              border: '1px solid var(--rule)',
              color: 'var(--ink-muted)',
            }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={17} />
          </button>

          <h1 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            {pageTitle}
          </h1>
          {isCalculator && (
            <DisclaimerLink className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-rule text-ink-subtle hover:text-ink hover:border-rule-strong transition-colors">
              <Info size={11} aria-hidden />
              Estimate only
            </DisclaimerLink>
          )}

          <div className="ml-auto flex items-center gap-3">
            <CommandPalette />
            <span className="text-xs hidden lg:block" style={{ color: 'var(--ink-subtle)', fontFamily: 'var(--font-text)' }}>
              ZAR • South Africa
            </span>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                border: '1px solid var(--rule)',
                color: 'var(--ink-muted)',
                background: 'var(--paper-raised)',
              }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl" style={{ background: 'color-mix(in srgb, var(--note-blue) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 20%, transparent)' }}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName ?? 'User'} className="w-6 h-6 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--note-blue) 30%, transparent)', color: 'var(--note-blue-ink)' }}>
                    {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium hidden sm:block max-w-[100px] truncate" style={{ color: 'var(--note-blue-ink)' }}>
                  {user.displayName?.split(' ')[0] ?? user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ml-1"
                  style={{ background: 'color-mix(in srgb, var(--loss) 8%, transparent)', color: 'var(--loss-ink)', border: '1px solid color-mix(in srgb, var(--loss) 15%, transparent)' }}
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
                style={{ background: 'color-mix(in srgb, var(--note-blue) 15%, transparent)', color: 'var(--note-blue-ink)', border: '1px solid color-mix(in srgb, var(--note-blue) 30%, transparent)' }}
              >
                <LogIn size={13} />
                <span className="hidden sm:inline">Sign in with Google</span>
              </button>
            )}
            <span className="w-2 h-2 rounded-full bg-gain inline-block" title="All systems operational" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-6">
          <JourneyProvider>
            <JourneyBar />
            <Outlet />
          </JourneyProvider>
          <DisclaimerFooter />
        </main>
      </div>

      {/* ── Mobile bottom tab bar ──────────────────────── */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-30"
        style={{
          background: 'var(--paper)',
          borderTop: '1px solid var(--rule)',
        }}
      >
        {/* Scroll-hint fade on right edge */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
          style={{ background: 'linear-gradient(to left, var(--paper) 10%, transparent 100%)' }}
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
                  fontFamily: 'var(--font-text)',
                  color: isActive ? 'var(--note-blue-ink)' : 'var(--ink-subtle)',
                  minWidth: '64px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                })}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="w-8 h-6 flex items-center justify-center rounded-lg transition-all duration-200"
                      style={{ background: isActive ? 'color-mix(in srgb, var(--note-blue) 15%, transparent)' : 'transparent' }}
                    >
                      <Icon size={16} style={{ color: isActive ? 'var(--note-blue-ink)' : 'var(--ink-subtle)' }} />
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
