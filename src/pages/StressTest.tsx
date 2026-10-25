import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import {
  Building2, BookOpen,
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';
import { calcPortfolioStress, STRESS_SCENARIOS } from '../utils/stress';
import { useAuth } from '../context/useAuth';
import { useSavedProperties } from '../hooks/useFirestore';
import { usePrimeRate } from '../hooks/usePrimeRate';
import type { PropertyInputs } from '../types';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';

const C = {
  blue: 'var(--note-blue)', orange: 'var(--note-orange)', green: 'var(--gain)',
  red: 'var(--loss)', teal: 'var(--note-teal)', brown: 'var(--note-brown)',
};

function RandTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ minWidth: 160 }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: textTone(p.fill ?? C.blue) }}>{p.name}: {formatRand(p.value, 0)}</p>
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
  const worstCashFlow = result.scenarioTotals.worst?.totalMonthlyCashFlow ?? 0;
  const monthlyPosition = (v: number) => v >= 0 ? `${formatRand(v, 0)} a month ahead` : `${formatRand(-v, 0)} a month short`;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Portfolio Stress Test
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              How your saved properties survive rate hikes, vacancies, and value drops
            </p>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: 'color-mix(in srgb, var(--note-orange) 12%, transparent)', color: textTone(C.orange), border: `1px solid ${alpha(C.orange, 27)}` }}
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
          color={C.blue}
        />
      ) : (
        <>
          <ResultPanel
            label="Monthly cash flow in the worst case"
            value={formatRand(worstCashFlow, 0)}
            tone={worstCashFlow >= 0 ? 'gain' : 'loss'}
            summary={<>
              Today your {result.count === 1 ? 'property is' : `${result.count} properties are`} {monthlyPosition(result.totalBaseMonthlyCashFlow)} after
              all costs. If rates rise 2% and 15% of the rent is lost to empty months, {result.count === 1 ? 'it' : 'they'} would be {monthlyPosition(worstCashFlow)}.
              {result.mostFragile && (result.mostFragile.rateHeadroom === null
                ? ` ${result.mostFragile.name} already costs more than it brings in.`
                : ` ${result.mostFragile.name} is the most fragile: it turns negative at ${formatPercent(result.mostFragile.breakingPointRate ?? 0, 2)}, ${formatPercent(result.mostFragile.rateHeadroom, 2)} above its rate today.`)}
            </>}
            figures={[
              { label: 'Properties tested', value: String(result.count) },
              { label: 'Cash flow today', value: formatRand(result.totalBaseMonthlyCashFlow, 0) },
              { label: 'Negative if rates rise 2%', value: `${result.scenarioTotals.rate2?.negativeCount ?? 0} of ${result.count}` },
              { label: 'Rates rise 3%', value: formatRand(result.scenarioTotals.rate3?.totalMonthlyCashFlow ?? 0, 0) },
            ]}
          />

          {/* Scenario chart */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Total Monthly Cash Flow by Scenario
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scenarioChart} margin={{ left: 8, right: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                <ReferenceLine y={0} stroke="var(--ink-subtle)" strokeWidth={1} />
                <Bar dataKey="cashflow" name="Monthly Cash Flow" radius={[3, 3, 0, 0]}>
                  {scenarioChart.map((d, i) => (
                    <Cell key={i} fill={d.cashflow >= 0 ? C.green : C.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-property scenario matrix */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Monthly Cash Flow Matrix
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--rule)' }}>
                    <th className="py-2 pr-3 text-left font-semibold uppercase tracking-wider sticky left-0" style={{ color: 'var(--ink-muted)', background: 'var(--paper-raised)' }}>Property</th>
                    {STRESS_SCENARIOS.map((s) => (
                      <th key={s.key} className="py-2 px-2 text-right font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>{s.label}</th>
                    ))}
                    <th className="py-2 pl-3 text-right font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>Breaking Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {result.properties.map((prop) => (
                    <tr key={prop.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td className="py-2 pr-3 font-medium whitespace-nowrap sticky left-0" style={{ color: 'var(--ink)', background: 'var(--paper-raised)' }}>{prop.name}</td>
                      {STRESS_SCENARIOS.map((s) => {
                        const sc = prop.scenarios[s.key];
                        return (
                          <td key={s.key} className="py-2 px-2 text-right font-mono whitespace-nowrap" style={{ color: textTone(sc.monthlyCashFlow >= 0 ? C.green : C.red), fontWeight: sc.negative ? 600 : 400 }}>
                            {formatRand(sc.monthlyCashFlow, 0)}
                          </td>
                        );
                      })}
                      <td className="py-2 pl-3 text-right font-semibold whitespace-nowrap" style={{ color: textTone(prop.rateHeadroom === null ? C.red : prop.rateHeadroom < 2 ? C.orange : C.green) }}>
                        {prop.breakingPointRate === null ? 'negative now' : `${formatPercent(prop.breakingPointRate, 2)}`}
                        {prop.rateHeadroom !== null && (
                          <span className="block text-[10px] font-normal" style={{ color: 'var(--ink-subtle)' }}>+{formatPercent(prop.rateHeadroom, 2)} headroom</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--rule)' }}>
                    <td className="py-2 pr-3 font-semibold sticky left-0" style={{ color: 'var(--ink)', background: 'var(--paper-raised)' }}>Portfolio Total</td>
                    {STRESS_SCENARIOS.map((s) => {
                      const total = result.scenarioTotals[s.key]?.totalMonthlyCashFlow ?? 0;
                      return (
                        <td key={s.key} className="py-2 px-2 text-right font-mono font-semibold whitespace-nowrap" style={{ color: textTone(total >= 0 ? C.green : C.red) }}>
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
              <BookOpen size={16} color={C.orange} />
              <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                How to Read This Stress Test
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                { title: 'What is a stress test?', color: C.blue, body: 'It re-runs each saved property under adverse conditions to reveal hidden fragility. The numbers are monthly cash flow (rent received minus bond, levies, rates, insurance, management and other costs) using your Scenario 1 rent.' },
                { title: 'Breaking-point rate', color: C.orange, body: 'The interest rate at which a property\'s monthly cash flow hits zero. "Headroom" is the gap between that rate and your current rate — small headroom (<2%) means a couple of MPC hikes could push the property into the red.' },
                { title: 'Why rate shocks matter', color: C.red, body: 'SA prime has swung by 4–5 percentage points within a few years. A bond is your largest monthly cost, so a +2% or +3% shock is realistic and tests whether you can carry the property without selling at a loss.' },
                { title: 'Vacancy scenario', color: C.teal, body: 'The 15% vacancy case models roughly 1.8 months empty per year plus tenant turnover. Even strong properties can turn negative if they sit empty — this checks your buffer.' },
                { title: 'Value −10% scenario', color: C.brown, body: 'A value drop does not change monthly cash flow but erodes equity. Combined with negative cash flow it can leave you "underwater" — owing more than the property is worth — which limits refinancing and selling options.' },
                { title: 'What to do about it', color: C.green, body: 'For fragile properties, build a cash reserve (3–6 months of shortfall), fix interest rates where possible, reduce the loan with lump sums, or raise rent to market. The worst-case row is your true risk exposure.' },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-xl space-y-2" style={{ background: alpha(item.color, 3), border: `1px solid ${alpha(item.color, 13)}` }}>
                  <p className="text-xs font-bold" style={{ color: textTone(item.color) }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <AssumptionsDrawer
            items={[
              <>Cash flow is the rent received less the bond, levies, rates, insurance, management and other costs, using each property’s first rent scenario from Property ROI.</>,
              <>Rate rises are added to each property’s own saved rate. The worst case adds 2% and loses 15% of the rent to empty months.</>,
              <>A 10% drop in value changes your equity, not your monthly cash flow. Equity uses the loan at purchase, not what you owe today.</>,
              <>The prime rate at the top is for reference. Each property keeps the rate you saved with it.</>,
            ]}
          />
        </>
      )}
    </div>
  );
}
