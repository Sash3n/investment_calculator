import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell,
} from 'recharts';
import {
  DoorOpen, TrendingUp, Info, BookOpen, Trophy, AlertTriangle, Receipt, RotateCcw,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ShareButton } from '../components/ui/ShareButton';
import { usePersistentState } from '../hooks/usePersistentState';
import { readShareParam } from '../utils/share';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';
import { calcExitPlanner, type ExitPlannerInputs } from '../utils/exitPlanner';
import type { AgeGroup } from '../types';

const C = {
  indigo: '#6366F1', amber: '#F59E0B', emerald: '#10B981',
  red: '#EF4444', cyan: '#06B6D4', violet: '#8B5CF6',
};

const AGE_OPTIONS = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74', label: '65 – 74 years' },
  { value: '75plus', label: '75 years and older' },
];

const SALE_YEARS = [1, 3, 5, 10, 15, 20, 25];

function RandTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill?: string; stroke?: string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ minWidth: 180 }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Year {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill ?? p.stroke ?? C.indigo }}>{p.name}: {formatRand(p.value, 0)}</p>
      ))}
    </div>
  );
}

const DEFAULT_INPUTS: ExitPlannerInputs = {
  purchasePrice: 1500000,
  buildingCostExclLand: 1100000,
  isLowCostHousing: false,
  claimingS13: true,
  annualAppreciation: 7,
  saleCostsPercent: 5,
  otherAnnualTaxableIncome: 800000,
  ageGroup: 'under65',
  saleYears: SALE_YEARS,
};

export function ExitPlanner() {
  const [inputs, setInputs] = usePersistentState<ExitPlannerInputs>('fincalc-exit', DEFAULT_INPUTS);

  useEffect(() => {
    const shared = readShareParam<ExitPlannerInputs>();
    if (shared) setInputs((prev) => ({ ...prev, ...shared }));
  }, [setInputs]);

  const result = useMemo(() => calcExitPlanner(inputs), [inputs]);
  const set = (fn: (v: number) => Partial<ExitPlannerInputs>) => (val: string) =>
    setInputs((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const chartData = result.years.map((y) => ({
    year: y.year,
    netProceeds: Math.round(y.netProceedsAfterTax),
    exitTax: Math.round(y.totalExitTax),
    lifetime: Math.round(y.netLifetimeTaxPosition),
  }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Optimal Exit Planner
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              When should you sell? Combines CGT, Section 13sex recoupment, and your marginal rate
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: 'rgba(139,92,246,0.12)', color: C.violet, border: `1px solid ${C.violet}44` }}>
              SARS 2026 · 40% inclusion
            </span>
            <ShareButton state={inputs} />
            <button
              onClick={() => setInputs(DEFAULT_INPUTS)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all flex-shrink-0"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              title="Reset to defaults"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        {/* Inputs */}
        <div className="glass-card p-5 space-y-4">
          <SectionHeader title="Property & Holding" icon={DoorOpen} />
          <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: C.violet }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Models an investment property (no primary-residence exclusion). Recoupment claws back S13 allowances as income on sale.</span>
          </div>

          <InputField label="Original Purchase Price" id="e-price" value={inputs.purchasePrice} onChange={set((v) => ({ purchasePrice: v }))} prefix="R" help="Total acquisition cost" />
          <InputField label="Building Cost (excl. land)" id="e-building" value={inputs.buildingCostExclLand} onChange={set((v) => ({ buildingCostExclLand: v }))} prefix="R" help="Portion qualifying for Section 13sex allowances" />

          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <input type="checkbox" id="e-claim" checked={inputs.claimingS13} onChange={(e) => setInputs((p) => ({ ...p, claimingS13: e.target.checked }))} className="w-4 h-4 accent-[#8B5CF6]" />
            <label htmlFor="e-claim" className="text-sm cursor-pointer" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>Claiming Section 13sex allowances</label>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', opacity: inputs.claimingS13 ? 1 : 0.5 }}>
            <input type="checkbox" id="e-lowcost" checked={inputs.isLowCostHousing} disabled={!inputs.claimingS13} onChange={(e) => setInputs((p) => ({ ...p, isLowCostHousing: e.target.checked }))} className="w-4 h-4 accent-[#8B5CF6]" />
            <label htmlFor="e-lowcost" className="text-sm cursor-pointer" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>Low-cost housing (10% / 10 years)</label>
          </div>

          <InputField label="Annual Appreciation" id="e-appr" value={inputs.annualAppreciation} onChange={set((v) => ({ annualAppreciation: v }))} suffix="%" help="SA long-term average ≈ 6–8% p.a." />
          <InputField label="Sale Costs" id="e-salecost" value={inputs.saleCostsPercent} onChange={set((v) => ({ saleCostsPercent: v }))} suffix="%" help="Agent commission (typically 5–7.5% incl. VAT)" />
          <InputField label="Other Annual Taxable Income" id="e-income" value={inputs.otherAnnualTaxableIncome} onChange={set((v) => ({ otherAnnualTaxableIncome: v }))} prefix="R" help="Determines marginal rate for recoupment & CGT" />
          <SelectField label="Age Group" id="e-age" value={inputs.ageGroup} onChange={(v) => setInputs((p) => ({ ...p, ageGroup: v as AgeGroup }))} options={AGE_OPTIONS} />
        </div>

        {/* Results */}
        <div className="space-y-5">
          {/* Best-year banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.bestYear && (
              <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(16,185,129,0.08)', border: `1px solid ${C.emerald}44` }}>
                <Trophy size={20} color={C.emerald} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.emerald, fontFamily: 'var(--font-heading)' }}>Most cash: sell in year {result.bestYear.year}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Net {formatRand(result.bestYear.netProceedsAfterTax, 0)} after tax & sale costs.</p>
                </div>
              </div>
            )}
            {result.bestLifetimeYear && inputs.claimingS13 && (
              <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.08)', border: `1px solid ${C.indigo}44` }}>
                <TrendingUp size={20} color={C.indigo} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.indigo, fontFamily: 'var(--font-heading)' }}>Best tax position: year {result.bestLifetimeYear.year}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>S13 savings minus exit tax = {formatRand(result.bestLifetimeYear.netLifetimeTaxPosition, 0)}.</p>
                </div>
              </div>
            )}
          </div>

          {/* Recoupment warning */}
          {inputs.claimingS13 && result.annualDeduction > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: `1px solid ${C.amber}33` }}>
              <AlertTriangle size={18} color={C.amber} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold" style={{ color: C.amber, fontFamily: 'var(--font-heading)' }}>The recoupment trap</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  You deduct {formatRand(result.annualDeduction, 0)}/year ({formatPercent(result.rate * 100, 0)} of building cost) for up to {result.period} years. On sale, every rand claimed is added back to your income and taxed at your marginal rate — so selling soon after claiming allowances can hand much of the benefit back to SARS.
                </p>
              </div>
            </div>
          )}

          {/* Stat cards (10-year reference) */}
          {(() => {
            const ref = result.years.find((y) => y.year === 10) ?? result.years[0];
            if (!ref) return null;
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Sale Value (yr 10)" value={formatRandShort(ref.saleValue)} sub={`${formatPercent(inputs.annualAppreciation, 0)} p.a. growth`} icon={TrendingUp} color="emerald" delay={0} />
                <StatCard label="Recoupment Tax (yr 10)" value={formatRandShort(ref.recoupmentTax)} sub="S13 clawback" icon={Receipt} color="amber" delay={0.05} />
                <StatCard label="CGT (yr 10)" value={formatRandShort(ref.cgtTax)} sub="On appreciation" icon={Receipt} color="red" delay={0.1} />
                <StatCard label="Net After Tax (yr 10)" value={formatRandShort(ref.netProceedsAfterTax)} sub={`Exit tax ${formatPercent(ref.effectiveExitTaxRate, 1)} of gain`} icon={DoorOpen} color="indigo" delay={0.15} />
              </div>
            );
          })()}

          {/* Chart */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Net Proceeds & Exit Tax by Sale Year</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ left: 8, right: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} label={{ value: 'Year sold', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--color-text-subtle)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickFormatter={(v) => `R${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }} content={<RandTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="netProceeds" name="Net Proceeds After Tax" radius={[3, 3, 0, 0]} fill={C.emerald}>
                  {chartData.map((_, i) => <Cell key={i} fill={C.emerald} />)}
                </Bar>
                <Bar dataKey="exitTax" name="Total Exit Tax" radius={[3, 3, 0, 0]} fill={C.red} />
                {inputs.claimingS13 && (
                  <Line type="monotone" dataKey="lifetime" name="Net Lifetime Tax Position" stroke={C.indigo} strokeWidth={2} dot={{ r: 3 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Exit Scenarios</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Year', 'Sale Value', 'Recoupment Tax', 'CGT', 'Total Exit Tax', 'Net After Tax', ...(inputs.claimingS13 ? ['Lifetime Tax Position'] : [])].map((h) => (
                      <th key={h} className="py-2 px-2 text-right first:text-left font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.years.map((y) => (
                    <tr key={y.year} style={{ borderBottom: '1px solid var(--color-border)', background: y.year === result.bestYear?.year ? 'rgba(16,185,129,0.05)' : undefined }}>
                      <td className="py-2 px-2" style={{ color: 'var(--color-text)' }}>{y.year}</td>
                      <td className="py-2 px-2 text-right" style={{ color: 'var(--color-text-muted)' }}>{formatRand(y.saleValue, 0)}</td>
                      <td className="py-2 px-2 text-right" style={{ color: C.amber }}>{formatRand(y.recoupmentTax, 0)}</td>
                      <td className="py-2 px-2 text-right" style={{ color: C.red }}>{formatRand(y.cgtTax, 0)}</td>
                      <td className="py-2 px-2 text-right font-medium" style={{ color: C.red }}>{formatRand(y.totalExitTax, 0)}</td>
                      <td className="py-2 px-2 text-right font-semibold" style={{ color: C.emerald }}>{formatRand(y.netProceedsAfterTax, 0)}</td>
                      {inputs.claimingS13 && (
                        <td className="py-2 px-2 text-right font-semibold" style={{ color: y.netLifetimeTaxPosition >= 0 ? C.indigo : C.red }}>{formatRand(y.netLifetimeTaxPosition, 0)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Education */}
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} color={C.amber} />
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Understanding Your Exit</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                { title: 'Recoupment (s8(4)(a))', color: C.amber, body: 'When you sell, the Section 13sex allowances you previously deducted are "recouped" — added back to your taxable income in the year of sale and taxed at your marginal rate. The deduction was a deferral, not a permanent escape.' },
                { title: 'Capital Gains Tax', color: C.red, body: 'CGT applies to the genuine appreciation above your original cost. For individuals: R50,000 annual exclusion, 40% inclusion rate, then taxed at your marginal rate — a maximum effective 18%. Investment property gets no primary-residence exclusion.' },
                { title: 'Net lifetime tax position', color: C.indigo, body: 'This is the S13 income-tax you saved while holding, minus the tax you pay on exit. A positive number means the strategy still came out ahead after recoupment; selling too early can turn it negative.' },
                { title: 'Why timing matters', color: C.emerald, body: 'Appreciation compounds while recoupment is capped at what you actually claimed. Holding longer grows the asset and dilutes the proportional tax bite — but ties up capital. The "most cash" and "best tax" years can differ.' },
                { title: 'Bracket bunching', color: C.violet, body: 'Recoupment and CGT both land in a single tax year and can push you into a higher bracket. Spreading disposals across tax years, or selling in a low-income year (e.g. after retirement), can materially cut the bill.' },
                { title: 'Get advice', color: C.cyan, body: 'This is a simplified educational model. Real recoupment caps, base-cost adjustments, and your full tax picture need a SARS-registered practitioner. Use this to spot the trade-offs, not to file a return.' },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-xl space-y-2" style={{ background: `${item.color}08`, border: `1px solid ${item.color}22` }}>
                  <p className="text-xs font-bold" style={{ color: item.color }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
