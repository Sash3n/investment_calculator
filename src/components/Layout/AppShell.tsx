import { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
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
} from 'lucide-react';
import clsx from 'clsx';

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
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/mortgage': 'Mortgage Calculator',
  '/property-roi': 'Property ROI Calculator',
  '/car-finance': 'Car Finance Calculator',
  '/extra-vs-investing': 'Extra Payments vs Investing',
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] ?? 'FinCalc ZA';

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
    <div className="flex min-h-screen bg-[#0A0F1E]">
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
              className="text-base font-bold text-[#F1F5F9] leading-none"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              FinCalc ZA
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              Smart Investment Tools
            </p>
          </div>
          <button
            className="ml-auto lg:hidden text-[#94A3B8] hover:text-[#F1F5F9] transition-colors p-1"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] px-3 mb-3">
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
                      ? 'bg-[rgba(99,102,241,0.15)] text-[#F1F5F9] border border-[rgba(99,102,241,0.25)]'
                      : 'text-[#94A3B8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F1F5F9]'
                  )
                }
                style={{ fontFamily: 'var(--font-body)' }}
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
                        style={{ color: isActive ? item.color : '#64748B' }}
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
        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-[10px] text-[#475569]" style={{ fontFamily: 'var(--font-body)' }}>
            Prime Rate: <span className="text-[#F59E0B] font-semibold">11.25%</span>
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            All values in South African Rand
          </p>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex items-center gap-4 px-5 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,15,30,0.85)] backdrop-blur-xl">
          <button
            className="lg:hidden w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.08)] transition-all"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={17} />
          </button>

          <h1
            className="text-base font-semibold text-[#F1F5F9]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {pageTitle}
          </h1>

          <div className="ml-auto flex items-center gap-3">
            <span
              className="text-xs text-[#64748B] hidden sm:block"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              ZAR • South Africa
            </span>
            <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" title="All systems operational" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom tab bar ──────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex border-t border-[rgba(255,255,255,0.08)] bg-[rgba(10,15,30,0.95)] backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-medium transition-all duration-200',
                  isActive ? 'text-[#6366F1]' : 'text-[#64748B]'
                )
              }
              style={{ fontFamily: 'var(--font-body)' }}
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
                      style={{ color: isActive ? '#6366F1' : '#64748B' }}
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
