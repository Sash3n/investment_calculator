import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, Info, DollarSign, Globe, Repeat, RotateCcw } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { usePersistentState } from '../hooks/usePersistentState';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';

// ── Constants ─────────────────────────────────────────────────────────────────
const C = {
  indigo:  '#6366F1',
  amber:   '#F59E0B',
  emerald: '#10B981',
  red:     '#EF4444',
  cyan:    '#06B6D4',
  violet:  '#8B5CF6',
};

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

const SA_DIVIDENDS_TAX = 0.20;

// ── Types ─────────────────────────────────────────────────────────────────────
type Market = 'SA' | 'International';

interface Inputs {
  investmentAmount:     number;
  dividendYield:        number;
  dividendGrowthRate:   number;
  annualReturnRate:     number;
  market:               Market;
  foreignWithholdingTax: number;
  exchangeRate:         number;
  drip:                 boolean;
  years:                number;
}

interface ProjectionRow {
  year:              number;
  portfolioValue:    number;
  grossDividend:     number;
  afterTaxDividend:  number;
  yieldOnCost:       number;
  cumulativeIncome:  number;
  zarIncome:         number;
}

// ── Core math ─────────────────────────────────────────────────────────────────
function effectiveTaxRate(market: Market, foreignWithholdingTax: number): number {
  if (market === 'SA') return SA_DIVIDENDS_TAX;
  // Foreign withholding applied first; SA dividends tax (20%) applied to remainder
  // Double-taxation agreements typically allow credit for foreign tax paid up to SA rate
  // Effective rate = max(SA_DIVIDENDS_TAX, foreignWithholdingTax) — conservative estimate
  const foreign = foreignWithholdingTax / 100;
  return Math.max(SA_DIVIDENDS_TAX, foreign);
}

function project(inp: Inputs): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  const taxRate    = effectiveTaxRate(inp.market, inp.foreignWithholdingTax);
  const yieldRate  = inp.dividendYield / 100;
  const growthRate = inp.dividendGrowthRate / 100;
  const capGain    = inp.annualReturnRate / 100;

  let portfolioValue   = inp.investmentAmount;
  let currentYield     = yieldRate;
  let cumulativeIncome = 0;

  for (let year = 1; year <= inp.years; year++) {
    const grossDividend    = portfolioValue * currentYield;
    const afterTaxDividend = grossDividend * (1 - taxRate);
    // Investment/portfolio are entered in Rands, so afterTaxDividend is already a
    // ZAR figure regardless of market. (For international holdings the FX rate
    // converts in on purchase and out on payout at ~the same rate, so it cancels.)
    const zarIncome        = afterTaxDividend;

    cumulativeIncome += afterTaxDividend;

    const yieldOnCost = (portfolioValue * currentYield) / inp.investmentAmount * 100;

    rows.push({
      year,
      portfolioValue: Math.round(portfolioValue),
      grossDividend:  Math.round(grossDividend),
      afterTaxDividend: Math.round(afterTaxDividend),
      yieldOnCost,
      cumulativeIncome: Math.round(cumulativeIncome),
      zarIncome: Math.round(zarIncome),
    });

    // Grow portfolio: capital appreciation + DRIP (reinvested dividends)
    const capAppreciation = portfolioValue * capGain;
    const reinvested      = inp.drip ? afterTaxDividend : 0;
    portfolioValue       += capAppreciation + reinvested;

    // Dividend yield grows at dividend growth rate
    currentYield *= (1 + growthRate);
  }

  return rows;
}

// ── Component ─────────────────────────────────────────────────────────────────
const DEFAULT_INPUTS: Inputs = {
  investmentAmount:      200_000,
  dividendYield:         4.5,
  dividendGrowthRate:    7,
  annualReturnRate:      10,
  market:                'SA',
  foreignWithholdingTax: 15,
  exchangeRate:          18.5,
  drip:                  true,
  years:                 20,
};

export function DividendCalculator() {
  const [inp, setInp] = usePersistentState<Inputs>('fincalc-dividend', DEFAULT_INPUTS);

  const n = (fn: (v: number) => Partial<Inputs>) => (val: string) =>
    setInp((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const rows = useMemo(() => project(inp), [inp]);

  const taxRate     = effectiveTaxRate(inp.market, inp.foreignWithholdingTax);
  const lastRow     = rows[rows.length - 1];
  const firstRow    = rows[0];
  const totalIncome = lastRow?.cumulativeIncome ?? 0;
  const finalValue  = lastRow?.portfolioValue ?? 0;

  // Chart data: annual income (DRIP vs no-DRIP comparison)
  const noDripRows = useMemo(() => project({ ...inp, drip: false }), [inp]);

  const incomeChart = rows.map((r, i) => ({
    year:      `Yr ${r.year}`,
    drip:      r.afterTaxDividend,
    noDrip:    noDripRows[i]?.afterTaxDividend ?? 0,
  }));

  const growthChart = rows.map((r) => ({
    year:      `Yr ${r.year}`,
    portfolio: r.portfolioValue,
    income:    r.cumulativeIncome,
  }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <TrendingUp size={20} className="text-[#10B981]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Dividend Income Calculator
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              SA &amp; International · DRIP projections · Dividends Tax applied
            </p>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold hidden sm:inline-block"
            style={{ background: 'rgba(16,185,129,0.1)', color: C.emerald, border: `1px solid ${C.emerald}44` }}
          >
            {formatRand(firstRow?.afterTaxDividend ?? 0, 0)}/yr net yr 1
          </span>
          <button
            onClick={() => setInp(DEFAULT_INPUTS)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all flex-shrink-0"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
            title="Reset to defaults"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: 'Year 1 Net Income', value: formatRand(firstRow?.afterTaxDividend ?? 0, 0), color: C.emerald },
          { label: `Year ${inp.years} Net Income`, value: formatRand(lastRow?.afterTaxDividend ?? 0, 0), color: C.cyan },
          { label: 'Total Net Income', value: formatRandShort(totalIncome), color: C.indigo },
          { label: `Final Portfolio`, value: formatRandShort(finalValue), color: C.amber },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card-static rounded-xl p-4" style={{ borderLeft: `3px solid ${color}` }}>
            <p className="text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
            <p className="text-lg font-bold" style={{ color, fontFamily: 'var(--font-heading)' }}>{value}</p>
          </div>
        ))}
      </motion.div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left — investment */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <DollarSign size={15} className="text-[#6366F1]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Investment Details
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="investment" label="Investment Amount" value={inp.investmentAmount}
              onChange={n((v) => ({ investmentAmount: v }))} prefix="R"
              help="Starting capital deployed" />
            <InputField id="yield" label="Dividend Yield" value={inp.dividendYield}
              onChange={n((v) => ({ dividendYield: v }))} suffix="% p.a." step={0.5}
              help="e.g. Satrix Divi Plus ~4–5%, MSCI World ~1.5–2%" />
            <InputField id="divGrowth" label="Dividend Growth Rate" value={inp.dividendGrowthRate}
              onChange={n((v) => ({ dividendGrowthRate: v }))} suffix="% p.a." step={0.5}
              help="How much the dividend per share grows annually" />
            <InputField id="capReturn" label="Capital Appreciation" value={inp.annualReturnRate}
              onChange={n((v) => ({ annualReturnRate: v }))} suffix="% p.a." step={0.5}
              help="Expected share price growth per year" />
            <InputField id="years" label="Investment Horizon" value={inp.years}
              onChange={n((v) => ({ years: Math.max(1, Math.min(50, Math.round(v))) }))} suffix="yrs" />

            {/* DRIP toggle */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                Reinvest Dividends (DRIP)
              </p>
              <div className="flex gap-2 mt-1">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setInp((p) => ({ ...p, drip: v }))}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: inp.drip === v ? (v ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.04)',
                      color: inp.drip === v ? (v ? C.emerald : C.red) : 'var(--color-text-muted)',
                      border: `1px solid ${inp.drip === v ? (v ? C.emerald + '55' : C.red + '55') : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — market & tax */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)' }}>
              <Globe size={15} className="text-[#06B6D4]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Market &amp; Tax
            </p>
          </div>

          {/* Market toggle */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Market
            </p>
            <div className="flex gap-2">
              {(['SA', 'International'] as Market[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setInp((p) => ({ ...p, market: m }))}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: inp.market === m ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    color: inp.market === m ? C.indigo : 'var(--color-text-muted)',
                    border: `1px solid ${inp.market === m ? C.indigo + '55' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {m === 'SA' ? '🇿🇦 South Africa' : '🌍 International'}
                </button>
              ))}
            </div>
          </div>

          {/* SA tax info */}
          {inp.market === 'SA' && (
            <div className="rounded-xl p-3 space-y-1"
              style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
              <p className="text-xs font-bold" style={{ color: C.emerald }}>SA Dividends Tax</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                20% withheld at source by the company before you receive payment.
                Your effective net yield is <strong style={{ color: 'var(--color-text)' }}>
                  {formatPercent(inp.dividendYield * 0.8, 2)}
                </strong> after tax.
              </p>
            </div>
          )}

          {/* International inputs */}
          {inp.market === 'International' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InputField id="withholdingTax" label="Foreign Withholding Tax" value={inp.foreignWithholdingTax}
                  onChange={n((v) => ({ foreignWithholdingTax: v }))} suffix="%" step={1}
                  help="US: 15%, Germany: 25%, UK: 0%" />
                <InputField id="fx" label="ZAR / Foreign Currency" value={inp.exchangeRate}
                  onChange={n((v) => ({ exchangeRate: v }))} prefix="R"
                  help="e.g. R18.50 per USD" />
              </div>
              <div className="rounded-xl p-3"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: C.amber }}>International Tax Treatment</p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Foreign withholding tax is deducted first. SA then applies a 20% Dividends Tax — but under
                  most double-taxation agreements (e.g. SA–US DTA), credit is given for foreign tax paid.
                  Effective rate used: <strong style={{ color: 'var(--color-text)' }}>
                    {formatPercent(taxRate * 100, 0)}
                  </strong> (the higher of the two rates).
                </p>
              </div>
            </div>
          )}

          {/* Effective net yield summary */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Gross Yield</p>
              <p className="text-base font-bold" style={{ color: C.amber }}>{formatPercent(inp.dividendYield, 2)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Net Yield (after tax)</p>
              <p className="text-base font-bold" style={{ color: C.emerald }}>
                {formatPercent(inp.dividendYield * (1 - taxRate), 2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Portfolio value + cumulative income */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Portfolio Growth &amp; Cumulative Income
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Portfolio value (with {inp.drip ? 'DRIP' : 'no DRIP'}) vs total net dividends received
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={growthChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPort" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.indigo} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.emerald} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.emerald} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} interval={Math.floor(inp.years / 5)} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip
                formatter={(v, name) => [
                  formatRand(Number(v), 0),
                  name === 'portfolio' ? 'Portfolio Value' : 'Cumulative Net Income',
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Area type="monotone" dataKey="portfolio" name="Portfolio Value"
                stroke={C.indigo} fill="url(#gradPort)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="income" name="Cumulative Net Income"
                stroke={C.emerald} fill="url(#gradIncome)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* DRIP vs no-DRIP annual income */}
        <div className="glass-card-static p-5">
          <div className="flex items-center gap-2 mb-1">
            <Repeat size={14} style={{ color: C.cyan }} />
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              DRIP vs No-DRIP Annual Income
            </p>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Annual net dividend income — reinvesting grows both the portfolio and the dividend base
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={incomeChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} interval={Math.floor(inp.years / 5)} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip
                formatter={(v, name) => [
                  formatRand(Number(v), 0),
                  name === 'drip' ? 'With DRIP' : 'Without DRIP',
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Bar dataKey="drip"   name="With DRIP"    fill={C.emerald} radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="noDrip" name="Without DRIP" fill={C.indigo}  radius={[3, 3, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-year table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Year-by-Year Projection
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  'Year',
                  'Portfolio Value',
                  'Gross Dividend',
                  'Net Dividend (after tax)',
                  inp.market === 'International' ? 'ZAR Equivalent' : null,
                  'Yield on Cost',
                  'Cumulative Net Income',
                ].filter(Boolean).map((h) => (
                  <th key={h!} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.year}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}
                >
                  <td className="py-2 px-3 font-bold" style={{ color: C.indigo }}>{r.year}</td>
                  <td className="py-2 px-3 font-semibold" style={{ color: 'var(--color-text)' }}>
                    {formatRand(r.portfolioValue, 0)}
                  </td>
                  <td className="py-2 px-3" style={{ color: C.amber }}>
                    {formatRand(r.grossDividend, 0)}
                  </td>
                  <td className="py-2 px-3 font-semibold" style={{ color: C.emerald }}>
                    {formatRand(r.afterTaxDividend, 0)}
                  </td>
                  {inp.market === 'International' && (
                    <td className="py-2 px-3" style={{ color: C.cyan }}>
                      {formatRand(r.zarIncome, 0)}
                    </td>
                  )}
                  <td className="py-2 px-3" style={{ color: C.violet }}>
                    {formatPercent(r.yieldOnCost, 2)}
                  </td>
                  <td className="py-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                    {formatRand(r.cumulativeIncome, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* How it works */}
      <div className="glass-card-static p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Info size={16} style={{ color: C.cyan }} />
          <p className="text-sm font-semibold"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            How This Calculator Works
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* DRIP */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-xs font-bold" style={{ color: C.emerald }}>Dividend Reinvestment (DRIP)</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              When DRIP is on, your after-tax dividends are added back into the portfolio each year.
              This grows your portfolio faster — and because the dividend yield applies to a larger base,
              your income compounds over time. The difference between DRIP and no-DRIP becomes dramatic
              over 15–20+ years.
            </p>
          </div>

          {/* Yield on cost */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <p className="text-xs font-bold" style={{ color: C.violet }}>Yield on Cost</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Yield on cost measures your dividend income as a percentage of your <em>original</em> investment —
              not the current portfolio value. As dividends grow year after year, your yield on cost rises
              even if the current yield stays flat. A stock paying 4% today with 7% annual dividend growth
              will have a yield on cost of ~15% in 20 years.
            </p>
          </div>

          {/* SA Dividends Tax */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-xs font-bold" style={{ color: C.amber }}>SA Dividends Tax (20%)</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              SARS levies a 20% Dividends Tax on dividends paid by SA-resident companies.
              It is withheld at source — meaning the company deducts it before paying you.
              Certain investors (companies, qualifying pension funds, public benefit organisations)
              are exempt, but individual investors pay the full 20%.
            </p>
          </div>

          {/* International */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <p className="text-xs font-bold" style={{ color: C.cyan }}>International Dividends &amp; Withholding Tax</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Foreign companies deduct a withholding tax before paying dividends to SA investors.
              US ETFs (e.g. via NYSE) typically withhold 15% under the SA–US DTA. SA then applies
              its own 20% Dividends Tax, but credits foreign tax already paid. This calculator uses
              the <em>higher</em> of the two rates as a conservative estimate of your effective tax rate.
              Actual treatment depends on your broker, the DTA, and how the dividend is classified.
            </p>
          </div>
        </div>

        <div
          className="flex items-start gap-3 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <Info size={13} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
          <span style={{ color: 'var(--color-text-muted)' }}>
            Projections are illustrative only. Returns, dividend growth, and exchange rates are not guaranteed.
            Tax treatment depends on your personal circumstances. This is not financial or tax advice — consult a CFP or tax practitioner.
          </span>
        </div>
      </div>

    </div>
  );
}
