import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Wallet, TrendingUp, Shield, Zap, AlertTriangle, CheckCircle2,
  Info, Star, Download, PiggyBank, Lock, Unlock, ArrowRight,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SaveLoadBar } from '../components/ui/SaveLoadBar';
import { formatRand, formatPercent, formatRandShort } from '../utils/format';
import { alpha } from '../utils/color';
import {
  calcInvestmentStrategy,
  exportStrategyToExcel,
  ageToGroup,
  type InvestmentStrategyInputs,
  type StrategyMetrics,
  type TaxYear,
} from '../utils/investmentStrategy';

// ── Constants / palette ────────────────────────────────────────────────────────
const C = { blue: 'var(--note-blue)', orange: 'var(--note-orange)', green: 'var(--gain)', red: 'var(--loss)', teal: 'var(--note-teal)', brown: 'var(--note-brown)' };

const TAX_YEAR_OPTIONS = [
  { value: '2025/26', label: '2025/26 (1 Mar 2025 – 28 Feb 2026)' },
  { value: '2024/25', label: '2024/25 (1 Mar 2024 – 28 Feb 2025)' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function InfoBadge({ text, color = C.blue }: { text: string; color?: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: `${alpha(color, 7)}`, border: `1px solid ${alpha(color, 20)}` }}>
      <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color }} />
      <span style={{ color: 'var(--ink-muted)' }}>{text}</span>
    </div>
  );
}

function WarnBadge({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: `${alpha(C.orange, 7)}`, border: `1px solid ${alpha(C.orange, 27)}` }}>
      <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" style={{ color: C.orange }} />
      <span style={{ color: 'var(--ink-muted)' }}>{text}</span>
    </div>
  );
}

// ── Projection chart tooltip ──────────────────────────────────────────────────
function ProjectionTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs space-y-1" style={{ minWidth: 200 }}>
      <p className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>Year {label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold" style={{ color: p.color }}>{formatRand(p.value, 0)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Strategy Card ─────────────────────────────────────────────────────────────
function StrategyCard({ s, isRecommended }: {
  s: StrategyMetrics;
  isRecommended: boolean;
}) {
  const borderColor = s.tag === 'conservative' ? C.brown : s.tag === 'balanced' ? C.green : C.orange;
  const subsidyPct = s.raMonthly > 0 ? ((s.monthlyTaxSaving / s.raMonthly) * 100).toFixed(0) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: s.tag === 'conservative' ? 0 : s.tag === 'balanced' ? 0.1 : 0.2 }}
      className="glass-card-static p-5 flex flex-col gap-4 relative overflow-hidden"
      style={{ borderTop: `3px solid ${borderColor}`, border: isRecommended ? `2px solid ${C.green}` : undefined }}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: `${alpha(C.green, 13)}`, color: C.green, border: `1px solid ${alpha(C.green, 27)}` }}
        >
          <Star size={10} fill={C.green} />
          Recommended
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: borderColor }}>{s.label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            {formatRand(s.totalInvested)}
          </p>
          <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>invested/month</p>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'RA',          value: formatRand(s.raMonthly, 0),       color: C.blue },
          { label: 'TFSA',        value: formatRand(s.tfsaMonthly, 0),     color: C.teal   },
          { label: 'Separate',    value: formatRand(s.separateMonthly, 0), color: C.brown },
          { label: 'PAYE',        value: formatRand(s.monthlyPAYE, 0),     color: C.red    },
          { label: 'Tax Saving',  value: formatRand(s.monthlyTaxSaving, 0),color: C.green},
          { label: 'Take-Home',   value: formatRand(s.takeHome, 0),        color: 'var(--ink)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-2" style={{ background: 'var(--paper-raised)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-subtle)' }}>{label}</p>
            <p className="text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* SARS subsidy note */}
      {subsidyPct && (
        <div className="text-xs p-2 rounded-lg" style={{ background: `${alpha(C.green, 7)}`, color: C.green }}>
          SARS funds {subsidyPct}% of your RA ({formatRand(s.monthlyTaxSaving)}/month)
        </div>
      )}

      {/* Spendable */}
      <div
        className="flex items-center justify-between p-2.5 rounded-lg"
        style={{
          background: s.budgetTight ? `${alpha(C.red, 7)}` : `${alpha(C.green, 7)}`,
          border: `1px solid ${alpha(s.budgetTight ? C.red : C.green, 20)}`,
        }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--ink-muted)' }}>Spendable cash</span>
        <span className="text-sm font-bold" style={{ color: s.budgetTight ? C.red : C.green }}>
          {formatRand(s.spendable)}/mo
        </span>
      </div>

      {/* Invest % */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>
          <span>% of income invested</span>
          <span className="font-semibold" style={{ color: borderColor }}>{s.investPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--paper-raised)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(s.investPct, 100)}%`, background: borderColor }} />
        </div>
      </div>

      {/* Projected FV */}
      <div className="pt-2 border-t" style={{ borderColor: 'var(--rule)' }}>
        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--ink-subtle)' }}>Projected Value</p>
        <p className="text-lg font-bold" style={{ color: borderColor, fontFamily: 'var(--font-display)' }}>
          {formatRand(s.projectedFV, 0)}
        </p>
      </div>

      {/* Pros/Cons */}
      <div className="space-y-1.5 text-xs">
        {s.pros.map((p, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: C.green }} />
            <span style={{ color: 'var(--ink-muted)' }}>{p}</span>
          </div>
        ))}
        {s.cons.map((c, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: C.orange }} />
            <span style={{ color: 'var(--ink-muted)' }}>{c}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Comparison table row ──────────────────────────────────────────────────────
function CompRow({ label, values, bestIdx, format = 'rand' }: {
  label: string;
  values: number[];
  bestIdx: number;
  format?: 'rand' | 'pct';
}) {
  return (
    <tr style={{ borderBottom: '1px solid var(--rule)' }}>
      <td className="py-2 pr-4 text-xs" style={{ color: 'var(--ink-muted)' }}>{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className="py-2 text-right text-xs font-medium"
          style={{
            color: i === bestIdx ? C.green : 'var(--ink)',
            background: i === bestIdx ? `${alpha(C.green, 5)}` : 'transparent',
            borderRadius: i === bestIdx ? 4 : 0,
          }}
        >
          {format === 'rand' ? formatRand(v, 0) : `${v.toFixed(1)}%`}
        </td>
      ))}
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function InvestmentStrategy() {
  const [inputs, setInputs] = useState<InvestmentStrategyInputs>({
    monthlyPrimaryGross: 35_000,
    monthlySecondaryGross: 0,
    age: 35,
    taxYear: '2025/26',
    monthlyRA: 2_000,
    monthlyTFSA: 3_833,
    monthlySeparate: 0,
    annualGrowthRate: 10,
    horizonYears: 20,
    tfsaLifetimeContributed: 0,
  });

  const location = useLocation();
  const locationState = location.state as { loadedInputs?: InvestmentStrategyInputs; entryId?: string } | null;
  useEffect(() => {
    if (locationState?.loadedInputs) setInputs(locationState.loadedInputs);
  }, [locationState]);

  const result = useMemo(() => calcInvestmentStrategy(inputs), [inputs]);

  const upd = (key: keyof InvestmentStrategyInputs) => (val: string) =>
    setInputs((p) => ({ ...p, [key]: parseFloat(val) || 0 }));

  // RA slider bounds
  const raMax = Math.max(result.raMonthlyLimit, inputs.monthlyRA + 1);

  const strategies = [result.conservative, result.balanced, result.maxTax];
  const strategyColors = [C.brown, C.green, C.orange];

  // Find best index per metric (higher is better by default, invert for PAYE/effective cost)
  const findBest = (values: number[], higher = true) => {
    return higher
      ? values.indexOf(Math.max(...values))
      : values.indexOf(Math.min(...values));
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              SA Investment Strategy
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              Dynamic tax planning · RA · TFSA · 2-Pot · Strategy Comparison
            </p>
          </div>
          <button
            onClick={() => exportStrategyToExcel(inputs, result)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: `${alpha(C.green, 13)}`, color: C.green, border: `1px solid ${alpha(C.green, 27)}` }}
          >
            <Download size={15} /> Export to Excel
          </button>
        </div>
      </motion.div>

      {/* ── Inputs + Live Dashboard ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">

        {/* ── Input Panel ─────────────────────────────────────────────────── */}
        <div className="glass-card p-5 space-y-5 h-fit">

          {/* Income */}
          <div>
            <SectionHeader title="Income" icon={Wallet} />
            <div className="space-y-3 mt-3">
              <SelectField
                label="Tax Year"
                id="is-taxyear"
                value={inputs.taxYear}
                onChange={(v) => setInputs((p) => ({ ...p, taxYear: v as TaxYear }))}
                options={TAX_YEAR_OPTIONS}
              />
              <InputField label="Primary Monthly Gross Salary" id="is-primary" value={inputs.monthlyPrimaryGross} onChange={upd('monthlyPrimaryGross')} prefix="R" />
              <InputField label="Secondary / Part-time Monthly Income" id="is-secondary" value={inputs.monthlySecondaryGross} onChange={upd('monthlySecondaryGross')} prefix="R" help="Optional — defaults to R0" />
              {result.hasSecondaryIncome && (
                <WarnBadge text="Multiple income sources: each employer withholds PAYE independently, but SARS combines your total income at assessment. You may have a tax shortfall or refund at year-end." />
              )}
              <InputField label="Your Age" id="is-age" value={inputs.age} onChange={upd('age')} suffix="years" min={18} max={85} help={`Tax group: ${ageToGroup(inputs.age) === 'under65' ? 'Under 65' : ageToGroup(inputs.age) === '65to74' ? '65–74' : '75+'}`} />
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--rule)' }} />

          {/* RA Contribution */}
          <div>
            <SectionHeader title="Retirement Annuity (RA)" icon={Shield} />
            <div className="space-y-3 mt-3">
              <InputField
                label="Monthly RA Contribution"
                id="is-ra"
                value={inputs.monthlyRA}
                onChange={upd('monthlyRA')}
                prefix="R"
                help={`27.5% limit: ${formatRand(result.raMonthlyLimit, 0)}/month · Annual cap: R350,000`}
              />
              {/* Slider */}
              <div>
                <input
                  type="range"
                  min={0}
                  max={Math.round(raMax)}
                  step={100}
                  value={inputs.monthlyRA}
                  onChange={(e) => setInputs((p) => ({ ...p, monthlyRA: parseFloat(e.target.value) }))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: C.blue }}
                />
                {/* Progress bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--ink-subtle)' }}>
                    <span>
                      {result.raUtilizationPct.toFixed(0)}% of 27.5% limit used
                      {result.raCapSource === 'r350k' && ' · Annual R350K cap hit'}
                    </span>
                    <span style={{ color: result.raUtilizationPct > 100 ? C.red : result.raUtilizationPct > 85 ? C.orange : C.green }}>
                      {formatRand(inputs.monthlyRA)}/mo
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--paper-raised)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(result.raUtilizationPct, 100)}%`,
                        background: result.raUtilizationPct > 100 ? C.red : result.raUtilizationPct > 85 ? C.orange : C.green,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--rule)' }} />

          {/* TFSA */}
          <div>
            <SectionHeader title="Tax-Free Savings Account (TFSA)" icon={PiggyBank} />
            <div className="space-y-3 mt-3">
              <InputField
                label="Monthly TFSA Contribution"
                id="is-tfsa"
                value={inputs.monthlyTFSA}
                onChange={upd('monthlyTFSA')}
                prefix="R"
                help={`2026 limit: R3,833/month (R46,000/year). Lifetime cap: R500,000. Excess taxed at 40%.`}
              />
              {result.tfsaIsOver && (
                <WarnBadge text={`⚠️ Over TFSA limit by ${formatRand(result.tfsaOverBy, 0)}/year — SARS applies a 40% penalty tax on excess contributions.`} />
              )}
              {result.showTFSANudge && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: `${alpha(C.teal, 7)}`, border: `1px solid ${alpha(C.teal, 20)}` }}>
                  <Zap size={13} className="mt-0.5 flex-shrink-0" style={{ color: C.teal }} />
                  <span style={{ color: 'var(--ink-muted)' }}>
                    <strong style={{ color: C.teal }}>New for 2026:</strong> You can contribute {formatRand(result.tfsaMonthlyLimit - inputs.monthlyTFSA, 0)}/month more tax-free — increasing from {formatRand(inputs.monthlyTFSA)} to {formatRand(result.tfsaMonthlyLimit)}/month.
                  </span>
                </div>
              )}
              <InputField
                label="TFSA Lifetime Contributed So Far"
                id="is-tfsa-life"
                value={inputs.tfsaLifetimeContributed}
                onChange={upd('tfsaLifetimeContributed')}
                prefix="R"
                help={`Remaining lifetime allowance: ${formatRand(result.tfsaLifetimeRemaining, 0)}`}
              />
              {/* Lifetime bar */}
              <div>
                <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--ink-subtle)' }}>
                  <span>Lifetime cap used</span>
                  <span>{formatPercent(Math.min((inputs.tfsaLifetimeContributed / 500_000) * 100, 100), 1)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--paper-raised)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((inputs.tfsaLifetimeContributed / 500_000) * 100, 100)}%`,
                      background: C.teal,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t" style={{ borderColor: 'var(--rule)' }} />

          {/* Separate + Projection */}
          <div>
            <SectionHeader title="Other Investments & Projection" icon={TrendingUp} />
            <div className="space-y-3 mt-3">
              <InputField label="Monthly Separate / Flexible Investment" id="is-sep" value={inputs.monthlySeparate} onChange={upd('monthlySeparate')} prefix="R" help="Unit trusts, ETFs, stocks — not tax-sheltered" />
              <InputField label="Annual Growth Rate Assumption" id="is-growth" value={inputs.annualGrowthRate} onChange={upd('annualGrowthRate')} suffix="% p.a." min={5} max={20} help="JSE All Share avg ~10%, S&P 500 ETF ~15–18%" />
              <InputField label="Investment Horizon" id="is-horizon" value={inputs.horizonYears} onChange={upd('horizonYears')} suffix="years" min={5} max={40} />
            </div>
          </div>

          <SaveLoadBar<InvestmentStrategyInputs>
            type="strategy"
            title={`Strategy — ${formatRand(result.totalMonthlyGross, 0)}/month gross`}
            summary={`Tax saving: ${formatRand(result.monthlyTaxSaving)}/month | Recommended: ${result.recommendedTag}`}
            inputs={inputs}
            onLoad={(saved) => setInputs(saved)}
            initialEditingId={locationState?.entryId}
          />
        </div>

        {/* ── Live Dashboard ────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Stat cards row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Monthly Gross" value={formatRand(result.totalMonthlyGross, 0)} sub={formatRand(result.totalAnnualGross, 0) + '/yr'} icon={Wallet} color="blue" delay={0} />
            <StatCard label="Taxable Income" value={formatRand(result.taxableIncome, 0)} sub="After RA deduction (annual)" icon={Shield} color="orange" delay={0.05} />
            <StatCard label="Monthly PAYE" value={formatRand(result.monthlyPAYE, 0)} sub={`Without RA: ${formatRand(result.monthlyPAYEWithoutRA, 0)}`} icon={TrendingUp} color="red" delay={0.1} />
            <StatCard label="Monthly Tax Saving" value={formatRand(result.monthlyTaxSaving, 0)} sub={`SARS pays ${result.sarsSubsidyPct.toFixed(0)}% of RA`} icon={CheckCircle2} color="green" delay={0.15} />
          </div>

          {/* Tax saving highlight */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card-static p-4 grid grid-cols-2 sm:grid-cols-4 gap-4"
            style={{ borderLeft: `3px solid ${C.green}`, background: `${alpha(C.green, 3)}` }}
          >
            {[
              { label: 'Effective RA Cost', value: formatRand(result.effectiveRAMonthlyCost), sub: 'RA minus tax saving', color: C.green },
              { label: 'Net Take-Home', value: formatRand(result.takeHome), sub: 'After RA + PAYE', color: 'var(--ink)' },
              { label: 'Total Invested', value: formatRand(result.totalInvested), sub: `${result.investPct.toFixed(1)}% of income`, color: C.blue },
              { label: 'Spendable Cash', value: formatRand(result.spendable), sub: 'After all investments', color: result.spendable < 5_000 ? C.red : C.green },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs mb-1" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>{item.label}</p>
                <p className="text-base font-bold" style={{ color: item.color, fontFamily: 'var(--font-display)' }}>{item.value}</p>
                <p className="text-[10px]" style={{ color: 'var(--ink-subtle)' }}>{item.sub}</p>
              </div>
            ))}
          </motion.div>

          {/* Tax breakdown detail */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Your Tax Breakdown — {inputs.taxYear}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
              {[
                { label: 'Total Annual Gross',         value: result.totalAnnualGross },
                { label: '27.5% RA Deduction Limit',   value: result.raMonthlyLimit * 12 },
                { label: 'Allowable RA Deduction',     value: -result.allowableRA },
                { label: 'Taxable Income (Annual)',     value: result.taxableIncome, bold: true },
                { label: 'Tax (with RA)',               value: -result.monthlyPAYE * 12 },
                { label: 'Tax (without RA)',            value: -result.monthlyPAYEWithoutRA * 12 },
                { label: 'Annual Tax Saving',           value: result.monthlyTaxSaving * 12, bold: true, green: true },
                { label: 'SARS Subsidy on RA',         value: result.sarsSubsidyPct, pct: true },
              ].map((row, i) => (
                <div key={i} className="flex justify-between py-1.5 text-xs" style={{ borderBottom: '1px solid var(--rule)' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>{row.label}</span>
                  <span
                    className="font-mono"
                    style={{
                      color: row.green ? C.green : row.value < 0 ? C.red : row.bold ? 'var(--ink)' : 'var(--ink-muted)',
                      fontWeight: row.bold ? 600 : 400,
                    }}
                  >
                    {row.pct ? `${result.sarsSubsidyPct.toFixed(1)}%` : formatRand(row.value, 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              {result.warnings.map((w, i) => <WarnBadge key={i} text={w} />)}
            </div>
          )}

          {/* Marginal rate badge */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl text-xs"
            style={{ background: `${alpha(C.blue, 7)}`, border: `1px solid ${alpha(C.blue, 20)}` }}
          >
            <Info size={14} style={{ color: C.blue, flexShrink: 0 }} />
            <span style={{ color: 'var(--ink-muted)' }}>
              Marginal tax rate: <strong style={{ color: C.blue }}>{result.marginalRate.toFixed(0)}%</strong>
              &nbsp;· Every rand added to your RA saves <strong style={{ color: C.green }}>{result.marginalRate.toFixed(0)}c in tax</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Strategy Cards ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Three Strategies — Calculated From Your Income
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <StrategyCard s={result.conservative} isRecommended={result.recommendedTag === 'conservative'} />
          <StrategyCard s={result.balanced}     isRecommended={result.recommendedTag === 'balanced'}     />
          <StrategyCard s={result.maxTax}       isRecommended={result.recommendedTag === 'maxTax'}       />
        </div>
      </div>

      {/* ── Comparison Table ────────────────────────────────────────────────── */}
      <div className="glass-card-static p-5 overflow-x-auto">
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Full Strategy Comparison — Best value highlighted
        </p>
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--rule)' }}>
              <th className="py-2 text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>Metric</th>
              {strategies.map((s) => (
                <th key={s.tag} className="py-2 text-right font-semibold uppercase tracking-wider" style={{ color: strategyColors[strategies.indexOf(s)] }}>
                  {s.tag === 'balanced' ? '⭐ ' : ''}{s.label.split('(')[0].trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompRow label="RA Monthly"              values={strategies.map(s=>s.raMonthly)}              bestIdx={findBest(strategies.map(s=>s.raMonthly))} />
            <CompRow label="TFSA Monthly"            values={strategies.map(s=>s.tfsaMonthly)}            bestIdx={findBest(strategies.map(s=>s.tfsaMonthly))} />
            <CompRow label="Separate Investment"     values={strategies.map(s=>s.separateMonthly)}        bestIdx={findBest(strategies.map(s=>s.separateMonthly))} />
            <CompRow label="Monthly PAYE"            values={strategies.map(s=>s.monthlyPAYE)}            bestIdx={findBest(strategies.map(s=>s.monthlyPAYE), false)} />
            <CompRow label="Monthly Tax Saving"      values={strategies.map(s=>s.monthlyTaxSaving)}       bestIdx={findBest(strategies.map(s=>s.monthlyTaxSaving))} />
            <CompRow label="Effective RA Cost"       values={strategies.map(s=>s.effectiveRAMonthlyCost)} bestIdx={findBest(strategies.map(s=>s.effectiveRAMonthlyCost), false)} />
            <CompRow label="Net Take-Home"           values={strategies.map(s=>s.takeHome)}               bestIdx={findBest(strategies.map(s=>s.takeHome))} />
            <CompRow label="Total Invested / Month"  values={strategies.map(s=>s.totalInvested)}          bestIdx={findBest(strategies.map(s=>s.totalInvested))} />
            <CompRow label="Spendable Cash"          values={strategies.map(s=>s.spendable)}              bestIdx={findBest(strategies.map(s=>s.spendable))} />
            <CompRow label="% of Income Invested"    values={strategies.map(s=>s.investPct)}              bestIdx={findBest(strategies.map(s=>s.investPct))} format="pct" />
            <CompRow label={`Projected Value (${inputs.horizonYears}yr)`} values={strategies.map(s=>s.projectedFV)} bestIdx={findBest(strategies.map(s=>s.projectedFV))} />
          </tbody>
        </table>
      </div>

      {/* ── Wealth Projection Chart ─────────────────────────────────────────── */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Wealth Accumulation — {inputs.horizonYears} Years at {inputs.annualGrowthRate}% p.a.
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
          Future value of monthly investments compounded monthly. RA withdrawals will be partially taxed.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={result.projectionYears.map((y, i) => ({
              year: y,
              'Your Plan':    result.projectionCurrent[i],
              'Conservative': result.projectionConservative[i],
              'Balanced':     result.projectionBalanced[i],
              'Max Tax':      result.projectionMaxTax[i],
            }))}
            margin={{ left: 16, right: 16, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} label={{ value: 'Years', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--ink-subtle)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => formatRandShort(v)} width={70} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<ProjectionTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Your Plan"    stroke={C.teal}   strokeWidth={2} dot={false} strokeDasharray="5 3" />
            <Line type="monotone" dataKey="Conservative" stroke={C.brown} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Balanced"     stroke={C.green}strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="Max Tax"      stroke={C.orange}  strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>

        {/* Final value summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Your Plan',    value: result.projectionCurrent[result.projectionCurrent.length - 1],    color: C.teal },
            { label: 'Conservative', value: result.projectionConservative[result.projectionConservative.length - 1], color: C.brown },
            { label: 'Balanced',     value: result.projectionBalanced[result.projectionBalanced.length - 1],  color: C.green },
            { label: 'Max Tax',      value: result.projectionMaxTax[result.projectionMaxTax.length - 1],      color: C.orange },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: `${alpha(item.color, 7)}`, border: `1px solid ${alpha(item.color, 20)}` }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: item.color }}>{item.label}</p>
              <p className="text-base font-bold" style={{ color: item.color, fontFamily: 'var(--font-display)' }}>{formatRand(item.value, 0)}</p>
              <p className="text-[10px]" style={{ color: 'var(--ink-subtle)' }}>after {inputs.horizonYears} years</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2-Pot Retirement System ─────────────────────────────────────────── */}
      <div className="glass-card-static p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${alpha(C.blue, 9)}` }}>
            <PiggyBank size={18} style={{ color: C.blue }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>2-Pot Retirement System</p>
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Effective 1 September 2024 · All new RA contributions split</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Savings pot */}
          <div className="rounded-xl p-4" style={{ background: `${alpha(C.green, 5)}`, border: `1px solid ${alpha(C.green, 20)}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Unlock size={16} style={{ color: C.green }} />
              <p className="text-sm font-semibold" style={{ color: C.green }}>Savings Pot (1/3)</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: C.green, fontFamily: 'var(--font-display)' }}>
              {formatRand(result.savingsPotMonthly)}<span className="text-sm font-normal">/month</span>
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--ink-muted)' }}>
              Accessible once per tax year · Minimum withdrawal: R2,000 · Taxed as income on withdrawal
            </p>
          </div>
          {/* Retirement pot */}
          <div className="rounded-xl p-4" style={{ background: `${alpha(C.blue, 5)}`, border: `1px solid ${alpha(C.blue, 20)}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} style={{ color: C.blue }} />
              <p className="text-sm font-semibold" style={{ color: C.blue }}>Retirement Pot (2/3)</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: C.blue, fontFamily: 'var(--font-display)' }}>
              {formatRand(result.retirementPotMonthly)}<span className="text-sm font-normal">/month</span>
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--ink-muted)' }}>
              Locked until age 55 · Tax-deferred growth · Partially tax-free on retirement
            </p>
          </div>
        </div>

        <InfoBadge text={`At your current RA of ${formatRand(inputs.monthlyRA)}/month: ${formatRand(result.savingsPotMonthly)} goes to savings pot (accessible), ${formatRand(result.retirementPotMonthly)} locked in retirement pot. Annual savings pot available: ~${formatRand(result.savingsPotMonthly * 12, 0)} (subject to tax on withdrawal).`} />
      </div>

      {/* ── Smart Recommendation ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass-card-static p-6"
        style={{ border: `2px solid ${alpha(C.green, 33)}`, background: `${alpha(C.green, 3)}` }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${alpha(C.green, 13)}` }}>
            <Zap size={20} style={{ color: C.green }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-base font-bold" style={{ color: C.green, fontFamily: 'var(--font-display)' }}>
                Smart Recommendation
              </p>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: `${alpha(C.green, 13)}`, color: C.green }}
              >
                {result.recommendedTag === 'conservative' ? 'Conservative' : result.recommendedTag === 'balanced' ? 'Balanced' : 'Max Tax'}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              {result.recommendationText}
            </p>

            {/* Key metrics from recommended strategy */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {(() => {
                const rec = { conservative: result.conservative, balanced: result.balanced, maxTax: result.maxTax }[result.recommendedTag];
                return [
                  { label: 'Monthly Invested', value: formatRand(rec.totalInvested), color: C.blue },
                  { label: 'Tax Saving', value: formatRand(rec.monthlyTaxSaving), color: C.green },
                  { label: 'Take-Home', value: formatRand(rec.takeHome), color: 'var(--ink)' },
                  { label: `Value at ${inputs.horizonYears}yr`, value: formatRand(rec.projectedFV, 0), color: C.green },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--paper-raised)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--ink-subtle)' }}>{item.label}</p>
                    <p className="text-sm font-bold" style={{ color: item.color, fontFamily: 'var(--font-display)' }}>{item.value}</p>
                  </div>
                ));
              })()}
            </div>

            {/* SARS subsidy callout */}
            {result.sarsSubsidyRand > 0 && (
              <div className="flex items-center gap-2 mt-4 p-3 rounded-xl text-sm" style={{ background: `${alpha(C.green, 7)}`, border: `1px solid ${alpha(C.green, 20)}` }}>
                <ArrowRight size={15} style={{ color: C.green, flexShrink: 0 }} />
                <span style={{ color: 'var(--ink-muted)' }}>
                  The government is subsidising <strong style={{ color: C.green }}>{formatRand(result.sarsSubsidyRand)}/month</strong> ({result.sarsSubsidyPct.toFixed(0)}%) of your RA through tax relief — that's <strong style={{ color: C.green }}>{formatRand(result.sarsSubsidyRand * 12)}/year</strong> you'd otherwise pay SARS.
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Export ───────────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={() => exportStrategyToExcel(inputs, result)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: `${alpha(C.green, 13)}`, color: C.green, border: `1px solid ${alpha(C.green, 27)}` }}
        >
          <Download size={16} />
          Export Full Analysis to Excel
          <span className="text-[10px] opacity-70">SA_Investment_Strategy_R{Math.round(result.totalMonthlyGross / 1000)}K.xlsx</span>
        </button>
      </div>

    </div>
  );
}
