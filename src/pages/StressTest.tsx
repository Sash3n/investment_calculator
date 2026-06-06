import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import {
  AlertTriangle, Shield, TrendingDown, Activity, Building2, Info, BookOpen,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';
import { calcPortfolioStress, STRESS_SCENARIOS } from '../utils/stress';
import { useAuth } from '../context/AuthContext';
import { useSavedProperties } from '../hooks/useFirestore';
import { usePrimeRate } from '../hooks/usePrimeRate';
import type { PropertyInputs } from '../types';

const C = {
  indigo: '#6366F1', amber: '#F59E0B', emerald: '#10B981',
  red: '#EF4444', cyan: '#06B6D4', violet: '#8B5CF6',
};

function RandTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ minWidth: 160 }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill ?? C.indigo }}>{p.name}: {formatRand(p.value, 0)}</p>
      ))}
    </div>
  );
}

export function StressTest() {
  const { user } = useAuth();
  const { properties: cloudProperties } = useSavedProperties(user?.uid ?? null);
  const liveRate = usePrimeRate();
  const [localPortfolio] = useState<(PropertyInputs & { id: string })[]>(() => {
    try {
      const stored = localStorage.getItem('fincalc_portfolio');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const portfolio = user
    ? cloudProperties.map((p) => ({ ...p.inputs, id: p.id }))
    : localPortfolio;

  const result = useMemo(() => calcPortfolioStress(portfolio), [portfolio]);

  // Chart: total monthly cash flow per scenario
  const scenarioChart = STRESS_SCENARIOS.map((s) => ({
    name: s.label,
    cashflow: Math.round(result.scenarioTotals[s.key]?.totalMonthlyCashFlow ?? 0),
    negatives: result.scenarioTotals[s.key]?.negativeCount ?? 0,
  }));

  const empty = portfolio.length === 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Portfolio Stress Test
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              How your saved properties survive rate hikes, vacancies, and value drops
            </p>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: 'rgba(245,158,11,0.12)', color: C.amber, border: `1px solid ${C.amber}44` }}
          >
            Prime: {liveRate.loading ? '…' : `${liveRate.primeRate}%`}
          </span>
        </div>
      </motion.div>

      {empty ? (
        <EmptyState
          icon={Building2}
          title="No saved properties yet"
          message="The stress test reads your saved buy-to-let portfolio. Add and save a property in the Property ROI calculator, then come back here — no extra data entry needed."
          actionLabel="Go to Property ROI"
          actionTo="/property-roi"
          color={C.indigo}
        />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Properties Tested" value={String(result.count)} sub="In your portfolio" icon={Building2} color="indigo" delay={0} />
            <StatCard
              label="Current Monthly Cash Flow"
              value={formatRandShort(result.totalBaseMonthlyCashFlow)}
              sub="All properties combined"
              icon={Activity}
              color={result.totalBaseMonthlyCashFlow >= 0 ? 'emerald' : 'red'}
              delay={0.05}
            />
            <StatCard
              label="Worst-Case Cash Flow"
              value={formatRandShort(result.scenarioTotals.worst?.totalMonthlyCashFlow ?? 0)}
              sub="+2% rate, 15% vacancy"
              icon={TrendingDown}
              color="red"
              delay={0.1}
            />
            <StatCard
              label="Go Negative at +2%"
              value={`${result.scenarioTotals.rate2?.negativeCount ?? 0} / ${result.count}`}
              sub="Properties cash-flow negative"
              icon={AlertTriangle}
              color="amber"
              delay={0.15}
            />
          </div>

          {/* Most fragile banner */}
          {result.mostFragile && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.07)', border: `1px solid ${C.red}33` }}
            >
              <AlertTriangle size={18} color={C.red} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold" style={{ color: C.red, fontFamily: 'var(--font-heading)' }}>
                  Most fragile: {result.mostFragile.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {result.mostFragile.rateHeadroom === null
                    ? 'Already cash-flow negative at the current interest rate.'
                    : `Turns cash-flow negative at ${formatPercent(result.mostFragile.breakingPointRate ?? 0, 2)} — only ${formatPercent(result.mostFragile.rateHeadroom, 2)} of headroom above its current ${formatPercent(result.mostFragile.baseInterestRate, 2)} rate.`}
                </p>
              </div>
            </div>
          )}

          {/* Scenario chart */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Total Monthly Cash Flow by Scenario
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scenarioChart} margin={{ left: 8, right: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<RandTooltip />} />
                <ReferenceLine y={0} stroke="var(--color-text-subtle)" strokeWidth={1} />
                <Bar dataKey="cashflow" name="Monthly Cash Flow" radius={[3, 3, 0, 0]}>
                  {scenarioChart.map((d, i) => (
                    <Cell key={i} fill={d.cashflow >= 0 ? C.emerald : C.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-property scenario matrix */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Monthly Cash Flow Matrix
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th className="py-2 pr-3 text-left font-semibold uppercase tracking-wider sticky left-0" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}>Property</th>
                    {STRESS_SCENARIOS.map((s) => (
                      <th key={s.key} className="py-2 px-2 text-right font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{s.label}</th>
                    ))}
                    <th className="py-2 pl-3 text-right font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>Breaking Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {result.properties.map((prop) => (
                    <tr key={prop.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="py-2 pr-3 font-medium whitespace-nowrap sticky left-0" style={{ color: 'var(--color-text)', background: 'var(--color-surface)' }}>{prop.name}</td>
                      {STRESS_SCENARIOS.map((s) => {
                        const sc = prop.scenarios[s.key];
                        return (
                          <td key={s.key} className="py-2 px-2 text-right font-mono whitespace-nowrap" style={{ color: sc.monthlyCashFlow >= 0 ? C.emerald : C.red, fontWeight: sc.negative ? 600 : 400 }}>
                            {formatRand(sc.monthlyCashFlow, 0)}
                          </td>
                        );
                      })}
                      <td className="py-2 pl-3 text-right font-semibold whitespace-nowrap" style={{ color: prop.rateHeadroom === null ? C.red : prop.rateHeadroom < 2 ? C.amber : C.emerald }}>
                        {prop.breakingPointRate === null ? 'negative now' : `${formatPercent(prop.breakingPointRate, 2)}`}
                        {prop.rateHeadroom !== null && (
                          <span className="block text-[10px] font-normal" style={{ color: 'var(--color-text-subtle)' }}>+{formatPercent(prop.rateHeadroom, 2)} headroom</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                    <td className="py-2 pr-3 font-semibold sticky left-0" style={{ color: 'var(--color-text)', background: 'var(--color-surface)' }}>Portfolio Total</td>
                    {STRESS_SCENARIOS.map((s) => {
                      const total = result.scenarioTotals[s.key]?.totalMonthlyCashFlow ?? 0;
                      return (
                        <td key={s.key} className="py-2 px-2 text-right font-mono font-semibold whitespace-nowrap" style={{ color: total >= 0 ? C.emerald : C.red }}>
                          {formatRand(total, 0)}
                        </td>
                      );
                    })}
                    <td className="py-2 pl-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Education */}
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} color={C.amber} />
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
                How to Read This Stress Test
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                { title: 'What is a stress test?', color: C.indigo, body: 'It re-runs each saved property under adverse conditions to reveal hidden fragility. The numbers are monthly cash flow (rent received minus bond, levies, rates, insurance, management and other costs) using your Scenario 1 rent.' },
                { title: 'Breaking-point rate', color: C.amber, body: 'The interest rate at which a property\'s monthly cash flow hits zero. "Headroom" is the gap between that rate and your current rate — small headroom (<2%) means a couple of MPC hikes could push the property into the red.' },
                { title: 'Why rate shocks matter', color: C.red, body: 'SA prime has swung by 4–5 percentage points within a few years. A bond is your largest monthly cost, so a +2% or +3% shock is realistic and tests whether you can carry the property without selling at a loss.' },
                { title: 'Vacancy scenario', color: C.cyan, body: 'The 15% vacancy case models roughly 1.8 months empty per year plus tenant turnover. Even strong properties can turn negative if they sit empty — this checks your buffer.' },
                { title: 'Value −10% scenario', color: C.violet, body: 'A value drop does not change monthly cash flow but erodes equity. Combined with negative cash flow it can leave you "underwater" — owing more than the property is worth — which limits refinancing and selling options.' },
                { title: 'What to do about it', color: C.emerald, body: 'For fragile properties, build a cash reserve (3–6 months of shortfall), fix interest rates where possible, reduce the loan with lump sums, or raise rent to market. The worst-case row is your true risk exposure.' },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-xl space-y-2" style={{ background: `${item.color}08`, border: `1px solid ${item.color}22` }}>
                  <p className="text-xs font-bold" style={{ color: item.color }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              <Shield size={11} className="inline mr-1" style={{ color: C.indigo }} />
              Educational estimates only. Cash flow uses your saved inputs and Scenario 1 rent; equity figures approximate the loan balance at purchase. Consult a financial adviser before acting.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
