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
import { alpha, textTone } from '../utils/color';

const C = {
  blue: 'var(--note-blue)', orange: 'var(--note-orange)', green: 'var(--gain)',
  red: 'var(--loss)', teal: 'var(--note-teal)', brown: 'var(--note-brown)',
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
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Year {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: textTone(p.fill ?? p.stroke ?? C.blue) }}>{p.name}: {formatRand(p.value, 0)}</p>
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
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Optimal Exit Planner
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              When should you sell? Combines CGT, Section 13sex recoupment, and your marginal rate
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: 'color-mix(in srgb, var(--note-brown) 12%, transparent)', color: textTone(C.brown), border: `1px solid ${alpha(C.brown, 27)}` }}>
              SARS 2026 · 40% inclusion
            </span>
            <ShareButton state={inputs} />
            <button
              onClick={() => setInputs(DEFAULT_INPUTS)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all flex-shrink-0"
              style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)', color: 'var(--ink-muted)' }}
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
          <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'color-mix(in srgb, var(--note-brown) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--note-brown) 20%, transparent)' }}>
            <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: textTone(C.brown) }} />
            <span style={{ color: 'var(--ink-muted)' }}>Models an investment property (no primary-residence exclusion). Recoupment claws back S13 allowances as income on sale.</span>
          </div>

          <InputField label="Original Purchase Price" id="e-price" value={inputs.purchasePrice} onChange={set((v) => ({ purchasePrice: v }))} prefix="R" help="Total acquisition cost" />
          <InputField label="Building Cost (excl. land)" id="e-building" value={inputs.buildingCostExclLand} onChange={set((v) => ({ buildingCostExclLand: v }))} prefix="R" help="Portion qualifying for Section 13sex allowances" />

          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <input type="checkbox" id="e-claim" checked={inputs.claimingS13} onChange={(e) => setInputs((p) => ({ ...p, claimingS13: e.target.checked }))} className="w-4 h-4 accent-note-brown" />
            <label htmlFor="e-claim" className="text-sm cursor-pointer" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>Claiming Section 13sex allowances</label>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)', opacity: inputs.claimingS13 ? 1 : 0.5 }}>
            <input type="checkbox" id="e-lowcost" checked={inputs.isLowCostHousing} disabled={!inputs.claimingS13} onChange={(e) => setInputs((p) => ({ ...p, isLowCostHousing: e.target.checked }))} className="w-4 h-4 accent-note-brown" />
            <label htmlFor="e-lowcost" className="text-sm cursor-pointer" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>Low-cost housing (10% / 10 years)</label>
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
              <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'color-mix(in srgb, var(--gain) 8%, transparent)', border: `1px solid ${alpha(C.green, 27)}` }}>
                <Trophy size={20} color={C.green} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: textTone(C.green), fontFamily: 'var(--font-display)' }}>Most cash: sell in year {result.bestYear.year}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>Net {formatRand(result.bestYear.netProceedsAfterTax, 0)} after tax & sale costs.</p>
                </div>
              </div>
            )}
            {result.bestLifetimeYear && inputs.claimingS13 && (
              <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'color-mix(in srgb, var(--note-blue) 8%, transparent)', border: `1px solid ${alpha(C.blue, 27)}` }}>
                <TrendingUp size={20} color={C.blue} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: textTone(C.blue), fontFamily: 'var(--font-display)' }}>Best tax position: year {result.bestLifetimeYear.year}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>S13 savings minus exit tax = {formatRand(result.bestLifetimeYear.netLifetimeTaxPosition, 0)}.</p>
                </div>
              </div>
            )}
          </div>

          {/* Recoupment warning */}
          {inputs.claimingS13 && result.annualDeduction > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'color-mix(in srgb, var(--note-orange) 7%, transparent)', border: `1px solid ${alpha(C.orange, 20)}` }}>
              <AlertTriangle size={18} color={C.orange} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold" style={{ color: textTone(C.orange), fontFamily: 'var(--font-display)' }}>The recoupment trap</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
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
                <StatCard label="Sale Value (yr 10)" value={formatRandShort(ref.saleValue)} sub={`${formatPercent(inputs.annualAppreciation, 0)} p.a. growth`} icon={TrendingUp} color="green" delay={0} />
                <StatCard label="Recoupment Tax (yr 10)" value={formatRandShort(ref.recoupmentTax)} sub="S13 clawback" icon={Receipt} color="orange" delay={0.05} />
                <StatCard label="CGT (yr 10)" value={formatRandShort(ref.cgtTax)} sub="On appreciation" icon={Receipt} color="red" delay={0.1} />
                <StatCard label="Net After Tax (yr 10)" value={formatRandShort(ref.netProceedsAfterTax)} sub={`Exit tax ${formatPercent(ref.effectiveExitTaxRate, 1)} of gain`} icon={DoorOpen} color="blue" delay={0.15} />
              </div>
            );
          })()}

          {/* Chart */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Net Proceeds & Exit Tax by Sale Year</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ left: 8, right: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} label={{ value: 'Year sold', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--ink-subtle)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => `R${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="netProceeds" name="Net Proceeds After Tax" radius={[3, 3, 0, 0]} fill={C.green}>
                  {chartData.map((_, i) => <Cell key={i} fill={C.green} />)}
                </Bar>
                <Bar dataKey="exitTax" name="Total Exit Tax" radius={[3, 3, 0, 0]} fill={C.red} />
                {inputs.claimingS13 && (
                  <Line type="monotone" dataKey="lifetime" name="Net Lifetime Tax Position" stroke={C.blue} strokeWidth={2} dot={{ r: 3 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Exit Scenarios</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--rule)' }}>
                    {['Year', 'Sale Value', 'Recoupment Tax', 'CGT', 'Total Exit Tax', 'Net After Tax', ...(inputs.claimingS13 ? ['Lifetime Tax Position'] : [])].map((h) => (
                      <th key={h} className="py-2 px-2 text-right first:text-left font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--ink-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.years.map((y) => (
                    <tr key={y.year} style={{ borderBottom: '1px solid var(--rule)', background: y.year === result.bestYear?.year ? 'color-mix(in srgb, var(--gain) 5%, transparent)' : undefined }}>
                      <td className="py-2 px-2" style={{ color: 'var(--ink)' }}>{y.year}</td>
                      <td className="py-2 px-2 text-right" style={{ color: 'var(--ink-muted)' }}>{formatRand(y.saleValue, 0)}</td>
                      <td className="py-2 px-2 text-right" style={{ color: textTone(C.orange) }}>{formatRand(y.recoupmentTax, 0)}</td>
                      <td className="py-2 px-2 text-right" style={{ color: textTone(C.red) }}>{formatRand(y.cgtTax, 0)}</td>
                      <td className="py-2 px-2 text-right font-medium" style={{ color: textTone(C.red) }}>{formatRand(y.totalExitTax, 0)}</td>
                      <td className="py-2 px-2 text-right font-semibold" style={{ color: textTone(C.green) }}>{formatRand(y.netProceedsAfterTax, 0)}</td>
                      {inputs.claimingS13 && (
                        <td className="py-2 px-2 text-right font-semibold" style={{ color: textTone(y.netLifetimeTaxPosition >= 0 ? C.blue : C.red) }}>{formatRand(y.netLifetimeTaxPosition, 0)}</td>
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
              <BookOpen size={16} color={C.orange} />
              <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Understanding Your Exit</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                { title: 'Recoupment (s8(4)(a))', color: C.orange, body: 'When you sell, the Section 13sex allowances you previously deducted are "recouped" — added back to your taxable income in the year of sale and taxed at your marginal rate. The deduction was a deferral, not a permanent escape.' },
                { title: 'Capital Gains Tax', color: C.red, body: 'CGT applies to the genuine appreciation above your original cost. For individuals: R50,000 annual exclusion, 40% inclusion rate, then taxed at your marginal rate — a maximum effective 18%. Investment property gets no primary-residence exclusion.' },
                { title: 'Net lifetime tax position', color: C.blue, body: 'This is the S13 income-tax you saved while holding, minus the tax you pay on exit. A positive number means the strategy still came out ahead after recoupment; selling too early can turn it negative.' },
                { title: 'Why timing matters', color: C.green, body: 'Appreciation compounds while recoupment is capped at what you actually claimed. Holding longer grows the asset and dilutes the proportional tax bite — but ties up capital. The "most cash" and "best tax" years can differ.' },
                { title: 'Bracket bunching', color: C.brown, body: 'Recoupment and CGT both land in a single tax year and can push you into a higher bracket. Spreading disposals across tax years, or selling in a low-income year (e.g. after retirement), can materially cut the bill.' },
                { title: 'Get advice', color: C.teal, body: 'This is a simplified educational model. Real recoupment caps, base-cost adjustments, and your full tax picture need a SARS-registered practitioner. Use this to spot the trade-offs, not to file a return.' },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-xl space-y-2" style={{ background: alpha(item.color, 3), border: `1px solid ${alpha(item.color, 13)}` }}>
                  <p className="text-xs font-bold" style={{ color: textTone(item.color) }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
