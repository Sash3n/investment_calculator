import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, Info, DollarSign, Globe, Repeat, RotateCcw, Target } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { ShareButton } from '../components/ui/ShareButton';
import { usePersistentState } from '../hooks/usePersistentState';
import { readShareParam } from '../utils/share';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';
import { alpha, textTone } from '../utils/color';
import { effectiveTaxRate, project, type DividendInputs, type Market } from '../utils/dividend';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { StatementRow } from '../components/statement/StatementRow';
import { nonNegativeError, positiveError, rangeError } from '../utils/validation';

// ── Constants ─────────────────────────────────────────────────────────────────
const C = {
  blue:  'var(--note-blue)',
  orange:   'var(--note-orange)',
  green: 'var(--gain)',
  red:     'var(--loss)',
  teal:    'var(--note-teal)',
  brown:  'var(--note-brown)',
};

const TOOLTIP_STYLE = {
  background:   'color-mix(in srgb, var(--paper-raised) 95%, transparent)',
  border:       '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
  borderRadius: 10,
  fontSize:     12,
  color:        'var(--ink)',
};

type Inputs = DividendInputs;

// ── Component ─────────────────────────────────────────────────────────────────
const DEFAULT_INPUTS: Inputs = {
  investmentAmount:      200_000,
  monthlyContribution:   2_500,
  dividendYield:         4.5,
  dividendGrowthRate:    7,
  annualReturnRate:      10,
  market:                'SA',
  foreignWithholdingTax: 15,
  exchangeRate:          18.5,
  drip:                  true,
  tfsa:                  false,
  years:                 20,
  targetMonthlyIncome:   10_000,
};

export function DividendCalculator() {
  const [inp, setInp] = usePersistentState<Inputs>('fincalc-dividend', DEFAULT_INPUTS);

  // Hydrate from a shared ?s= link on first load
  useEffect(() => {
    const shared = readShareParam<Inputs>(DEFAULT_INPUTS);
    if (shared) setInp((prev) => ({ ...prev, ...shared }));
  }, [setInp]);

  const n = (fn: (v: number) => Partial<Inputs>) => (val: string) =>
    setInp((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const rows = useMemo(() => project(inp), [inp]);

  const taxRate     = effectiveTaxRate(inp.market, inp.foreignWithholdingTax, inp.tfsa);
  const lastRow     = rows[rows.length - 1];
  const firstRow    = rows[0];
  const totalIncome = lastRow?.cumulativeIncome ?? 0;
  const finalValue  = lastRow?.portfolioValue ?? 0;
  const totalContributed = inp.investmentAmount + inp.monthlyContribution * 12 * inp.years;

  // How much the TFSA wrapper saves vs the same holding in a taxable account
  const taxableRows = useMemo(() => project({ ...inp, tfsa: false }), [inp]);
  const tfsaSaving = inp.tfsa
    ? (totalIncome - (taxableRows[taxableRows.length - 1]?.cumulativeIncome ?? 0))
    : 0;

  // ── Income goal (reverse calc) ──────────────────────────────────────────────
  const netYieldFrac    = (inp.dividendYield / 100) * (1 - taxRate);
  const targetAnnual    = inp.targetMonthlyIncome * 12;
  const capitalForGoal  = netYieldFrac > 0 ? targetAnnual / netYieldFrac : 0;
  const goalRow         = rows.find((r) => r.afterTaxDividend >= targetAnnual);
  const goalYear        = goalRow?.year ?? null;

  const errors = {
    investmentAmount: nonNegativeError(inp.investmentAmount),
    monthlyContribution: nonNegativeError(inp.monthlyContribution),
    dividendYield: rangeError(inp.dividendYield, 0, 20, 'a yield', '%'),
    dividendGrowthRate: rangeError(inp.dividendGrowthRate, -20, 30, 'dividend growth', '%'),
    annualReturnRate: rangeError(inp.annualReturnRate, -20, 30, 'price growth', '%'),
    years: rangeError(inp.years, 1, 60, 'a number of years', ''),
    foreignWithholdingTax: rangeError(inp.foreignWithholdingTax, 0, 50, 'a tax rate', '%'),
    exchangeRate: positiveError(inp.exchangeRate, 'Enter the exchange rate.'),
    targetMonthlyIncome: nonNegativeError(inp.targetMonthlyIncome),
  };
  const blocked = errors.investmentAmount ?? errors.monthlyContribution ?? errors.dividendYield ?? errors.years
    ?? (inp.investmentAmount <= 0 && inp.monthlyContribution <= 0 ? 'Enter an amount to invest or a monthly contribution.' : undefined);

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
            style={{ background: 'color-mix(in srgb, var(--gain) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 30%, transparent)' }}
          >
            <TrendingUp size={20} className="text-gain-ink" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Dividend Income Calculator
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              SA &amp; International · DRIP projections · Dividends Tax applied
            </p>
          </div>
          <ShareButton state={inp} />
          <button
            onClick={() => setInp(DEFAULT_INPUTS)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all flex-shrink-0"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)', color: 'var(--ink-muted)' }}
            title="Reset to defaults"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </motion.div>

      <ResultPanel
        label={`Dividend income in year ${inp.years}, after tax`}
        value={`${formatRand(lastRow?.afterTaxDividend ?? 0, 0)} a year`}
        blocked={blocked}
        summary={<>
          That is about {formatRand((lastRow?.afterTaxDividend ?? 0) / 12, 0)} a month. Over {inp.years} years you would put
          in {formatRand(totalContributed, 0)}, collect {formatRand(totalIncome, 0)} in dividends after tax and end with a portfolio
          of {formatRand(finalValue, 0)}.
          {inp.tfsa && tfsaSaving > 0 && ` Holding it in a tax-free savings account saves ${formatRand(tfsaSaving, 0)} in dividends tax.`}
        </>}
        figures={[
          { label: 'Year one, after tax', value: formatRand(firstRow?.afterTaxDividend ?? 0, 0) },
          { label: 'Total put in', value: formatRand(totalContributed, 0) },
          { label: 'All dividends, after tax', value: formatRand(totalIncome, 0) },
          { label: 'Final portfolio', value: formatRand(finalValue, 0) },
        ]}
      />

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left — investment */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)' }}>
              <DollarSign size={15} className="text-note-blue-ink" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Investment Details
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="investment" label="Investment Amount" value={inp.investmentAmount} error={errors.investmentAmount}
              onChange={n((v) => ({ investmentAmount: v }))} prefix="R"
              help="Starting capital deployed" />
            <InputField id="monthlyContribution" label="Monthly Contribution" value={inp.monthlyContribution} error={errors.monthlyContribution}
              onChange={n((v) => ({ monthlyContribution: v }))} prefix="R"
              help="Recurring amount added every month (added yearly)" />
            <InputField id="yield" label="Dividend Yield" value={inp.dividendYield} error={errors.dividendYield}
              onChange={n((v) => ({ dividendYield: v }))} suffix="% p.a." step={0.5}
              help="e.g. Satrix Divi Plus ~4–5%, MSCI World ~1.5–2%" />
            <InputField id="divGrowth" label="Dividend Growth Rate" value={inp.dividendGrowthRate} error={errors.dividendGrowthRate}
              onChange={n((v) => ({ dividendGrowthRate: v }))} suffix="% p.a." step={0.5}
              help="How much the dividend per share grows annually" />
            <InputField id="capReturn" label="Capital Appreciation" value={inp.annualReturnRate} error={errors.annualReturnRate}
              onChange={n((v) => ({ annualReturnRate: v }))} suffix="% p.a." step={0.5}
              help="Expected share price growth per year" />
            <InputField id="years" label="Investment Horizon" value={inp.years} error={errors.years}
              onChange={n((v) => ({ years: Math.max(1, Math.min(50, Math.round(v))) }))} suffix="yrs" />

            {/* DRIP toggle */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
                Reinvest Dividends (DRIP)
              </p>
              <div className="flex gap-2 mt-1">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setInp((p) => ({ ...p, drip: v }))}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: inp.drip === v ? (v ? 'color-mix(in srgb, var(--gain) 20%, transparent)' : 'color-mix(in srgb, var(--loss) 15%, transparent)') : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                      color: textTone(inp.drip === v ? (v ? C.green : C.red) : 'var(--ink-muted)'),
                      border: `1px solid ${inp.drip === v ? (v ? alpha(C.green, 33) : alpha(C.red, 33)) : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
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
              style={{ background: 'color-mix(in srgb, var(--note-teal) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-teal) 25%, transparent)' }}>
              <Globe size={15} className="text-note-teal-ink" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Market &amp; Tax
            </p>
          </div>

          {/* Market toggle */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              Market
            </p>
            <div className="flex gap-2">
              {(['SA', 'International'] as Market[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setInp((p) => ({ ...p, market: m }))}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: inp.market === m ? 'color-mix(in srgb, var(--note-blue) 20%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                    color: textTone(inp.market === m ? C.blue : 'var(--ink-muted)'),
                    border: `1px solid ${inp.market === m ? alpha(C.blue, 33) : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                  }}
                >
                  {m === 'SA' ? '🇿🇦 South Africa' : '🌍 International'}
                </button>
              ))}
            </div>
          </div>

          {/* TFSA wrapper toggle */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              Account Type
            </p>
            <div className="flex gap-2">
              {([false, true] as const).map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setInp((p) => ({ ...p, tfsa: v }))}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: inp.tfsa === v ? (v ? 'color-mix(in srgb, var(--gain) 20%, transparent)' : 'color-mix(in srgb, var(--note-blue) 20%, transparent)') : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                    color: textTone(inp.tfsa === v ? (v ? C.green : C.blue) : 'var(--ink-muted)'),
                    border: `1px solid ${inp.tfsa === v ? (v ? alpha(C.green, 33) : alpha(C.blue, 33)) : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                  }}
                >
                  {v ? '✓ Tax-Free (TFSA)' : 'Taxable Account'}
                </button>
              ))}
            </div>
          </div>

          {/* TFSA benefit callout */}
          {inp.tfsa && (
            <div className="rounded-xl p-3 space-y-1"
              style={{ background: 'color-mix(in srgb, var(--gain) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 18%, transparent)' }}>
              <p className="text-xs font-bold" style={{ color: textTone(C.green) }}>Tax-Free Savings Account</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                {inp.market === 'SA'
                  ? 'No 20% Dividends Tax inside a TFSA — you keep the full dividend.'
                  : 'No SA Dividends Tax inside a TFSA. Foreign withholding tax is still deducted at source and cannot be reclaimed.'}
                {' '}This plan keeps an extra <strong style={{ color: 'var(--ink)' }}>{formatRand(tfsaSaving, 0)}</strong> over {inp.years} years vs a taxable account.
              </p>
              <p className="text-[10px]" style={{ color: 'var(--ink-subtle)' }}>
                Remember TFSA limits: R46,000/year (from March 2026) and R500,000 lifetime in contributions.
              </p>
            </div>
          )}

          {/* SA tax info */}
          {!inp.tfsa && inp.market === 'SA' && (
            <div className="rounded-xl p-3 space-y-1"
              style={{ background: 'color-mix(in srgb, var(--gain) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 18%, transparent)' }}>
              <p className="text-xs font-bold" style={{ color: textTone(C.green) }}>SA Dividends Tax</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                20% withheld at source by the company before you receive payment.
                Your effective net yield is <strong style={{ color: 'var(--ink)' }}>
                  {formatPercent(inp.dividendYield * 0.8, 2)}
                </strong> after tax.
              </p>
            </div>
          )}

          {/* International inputs */}
          {inp.market === 'International' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InputField id="withholdingTax" label="Foreign Withholding Tax" value={inp.foreignWithholdingTax} error={errors.foreignWithholdingTax}
                  onChange={n((v) => ({ foreignWithholdingTax: v }))} suffix="%" step={1}
                  help="US: 15%, Germany: 25%, UK: 0%" />
                <InputField id="fx" label="ZAR / Foreign Currency" value={inp.exchangeRate} error={errors.exchangeRate}
                  onChange={n((v) => ({ exchangeRate: v }))} prefix="R"
                  help="e.g. R18.50 per USD" />
              </div>
              {!inp.tfsa && (
                <div className="rounded-xl p-3"
                  style={{ background: 'color-mix(in srgb, var(--note-orange) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--note-orange) 18%, transparent)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: textTone(C.orange) }}>International Tax Treatment</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                    Foreign withholding tax is deducted first. SA then applies a 20% Dividends Tax — but under
                    most double-taxation agreements (e.g. SA–US DTA), credit is given for foreign tax paid.
                    Effective rate used: <strong style={{ color: 'var(--ink)' }}>
                      {formatPercent(taxRate * 100, 0)}
                    </strong> (the higher of the two rates).
                  </p>
                </div>
              )}
            </div>
          )}

          <dl className="text-sm pt-1">
            <StatementRow line={{ label: 'Dividend yield', display: formatPercent(inp.dividendYield, 2) }} />
            <StatementRow line={{ label: 'Tax on dividends', display: formatPercent(taxRate * 100, 0) }} />
            <StatementRow line={{ label: 'Yield after tax', display: formatPercent(inp.dividendYield * (1 - taxRate), 2) }} strong />
          </dl>
        </div>
      </div>

      {/* Income Goal (reverse calculator) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card p-5"
        style={{ borderColor: 'color-mix(in srgb, var(--note-brown) 25%, transparent)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--note-brown) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-brown) 25%, transparent)' }}>
            <Target size={15} style={{ color: textTone(C.brown) }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Income Goal
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <InputField id="targetIncome" label="Target Monthly Income" value={inp.targetMonthlyIncome} error={errors.targetMonthlyIncome}
            onChange={n((v) => ({ targetMonthlyIncome: v }))} prefix="R"
            help="Net (after-tax) passive income you want" />

          <dl className="text-sm sm:col-span-2">
            <StatementRow line={{
              label: 'Capital needed today',
              display: netYieldFrac > 0 ? formatRand(capitalForGoal, 0) : '—',
              note: `At a ${formatPercent(netYieldFrac * 100, 2)} yield after tax`,
            }} />
            <StatementRow line={{
              label: 'Your plan reaches it',
              display: goalYear ? `Year ${goalYear}` : `Not within ${inp.years} years`,
              note: goalYear ? undefined : 'Raise the contributions, the yield or the number of years',
            }} />
          </dl>
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Portfolio value + cumulative income */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Portfolio Growth &amp; Cumulative Income
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            Portfolio value (with {inp.drip ? 'DRIP' : 'no DRIP'}) vs total net dividends received
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={growthChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPort" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.green} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} interval={Math.floor(inp.years / 5)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                formatter={(v, name) => [formatRand(Number(v), 0), name]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
              <Area type="monotone" dataKey="portfolio" name="Portfolio Value"
                stroke={C.blue} fill="url(#gradPort)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="income" name="Cumulative Net Income"
                stroke={C.green} fill="url(#gradIncome)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* DRIP vs no-DRIP annual income */}
        <div className="glass-card-static p-5">
          <div className="flex items-center gap-2 mb-1">
            <Repeat size={14} style={{ color: textTone(C.teal) }} />
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              DRIP vs No-DRIP Annual Income
            </p>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            Annual net dividend income — reinvesting grows both the portfolio and the dividend base
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={incomeChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} interval={Math.floor(inp.years / 5)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                formatter={(v, name) => [formatRand(Number(v), 0), name]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
              <Bar dataKey="drip"   name="With DRIP"    fill={C.green} radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="noDrip" name="Without DRIP" fill={C.blue}  radius={[3, 3, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-year table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Year-by-Year Projection
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink) 8%, transparent)' }}>
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
                    style={{ color: 'var(--ink-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.year}
                  style={{
                    borderBottom: '1px solid color-mix(in srgb, var(--ink) 4%, transparent)',
                    background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--ink) 1.5%, transparent)',
                  }}
                >
                  <td className="py-2 px-3 font-bold" style={{ color: textTone(C.blue) }}>{r.year}</td>
                  <td className="py-2 px-3 font-semibold" style={{ color: 'var(--ink)' }}>
                    {formatRand(r.portfolioValue, 0)}
                  </td>
                  <td className="py-2 px-3" style={{ color: textTone(C.orange) }}>
                    {formatRand(r.grossDividend, 0)}
                  </td>
                  <td className="py-2 px-3 font-semibold" style={{ color: textTone(C.green) }}>
                    {formatRand(r.afterTaxDividend, 0)}
                  </td>
                  {inp.market === 'International' && (
                    <td className="py-2 px-3" style={{ color: textTone(C.teal) }}>
                      {formatRand(r.zarIncome, 0)}
                    </td>
                  )}
                  <td className="py-2 px-3" style={{ color: textTone(C.brown) }}>
                    {formatPercent(r.yieldOnCost, 2)}
                  </td>
                  <td className="py-2 px-3" style={{ color: 'var(--ink-muted)' }}>
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
          <Info size={16} style={{ color: textTone(C.teal) }} />
          <p className="text-sm font-semibold"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            How This Calculator Works
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* DRIP */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'color-mix(in srgb, var(--gain) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 15%, transparent)' }}>
            <p className="text-xs font-bold" style={{ color: textTone(C.green) }}>Dividend Reinvestment (DRIP)</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              When DRIP is on, your after-tax dividends are added back into the portfolio each year.
              This grows your portfolio faster — and because the dividend yield applies to a larger base,
              your income compounds over time. The difference between DRIP and no-DRIP becomes dramatic
              over 15–20+ years.
            </p>
          </div>

          {/* Yield on cost */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'color-mix(in srgb, var(--note-brown) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--note-brown) 15%, transparent)' }}>
            <p className="text-xs font-bold" style={{ color: textTone(C.brown) }}>Yield on Cost</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              Yield on cost measures your dividend income as a percentage of your <em>original</em> investment —
              not the current portfolio value. As dividends grow year after year, your yield on cost rises
              even if the current yield stays flat. A stock paying 4% today with 7% annual dividend growth
              will have a yield on cost of ~15% in 20 years.
            </p>
          </div>

          {/* SA Dividends Tax */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'color-mix(in srgb, var(--note-orange) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--note-orange) 15%, transparent)' }}>
            <p className="text-xs font-bold" style={{ color: textTone(C.orange) }}>SA Dividends Tax (20%)</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              SARS levies a 20% Dividends Tax on dividends paid by SA-resident companies.
              It is withheld at source — meaning the company deducts it before paying you.
              Certain investors (companies, qualifying pension funds, public benefit organisations)
              are exempt, but individual investors pay the full 20%.
            </p>
          </div>

          {/* International */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'color-mix(in srgb, var(--note-teal) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--note-teal) 15%, transparent)' }}>
            <p className="text-xs font-bold" style={{ color: textTone(C.teal) }}>International Dividends &amp; Withholding Tax</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
              Foreign companies deduct a withholding tax before paying dividends to SA investors.
              US ETFs (e.g. via NYSE) typically withhold 15% under the SA–US DTA. SA then applies
              its own 20% Dividends Tax, but credits foreign tax already paid. This calculator uses
              the <em>higher</em> of the two rates as a conservative estimate of your effective tax rate.
              Actual treatment depends on your broker, the DTA, and how the dividend is classified.
            </p>
          </div>
        </div>

        <AssumptionsDrawer
          items={[
            <>Dividends grow by {formatPercent(inp.dividendGrowthRate, 1)} a year and the share price by {formatPercent(inp.annualReturnRate, 1)} a year. Neither is guaranteed.</>,
            inp.tfsa
              ? <>Inside a tax-free savings account there is no SA dividends tax{inp.market === 'International' ? `, but the ${formatPercent(inp.foreignWithholdingTax, 0)} foreign withholding tax still applies` : ''}.</>
              : inp.market === 'SA'
                ? <>SA dividends tax of 20% is taken before you are paid.</>
                : <>Foreign withholding tax is {formatPercent(inp.foreignWithholdingTax, 0)}. The higher of that and SA’s 20% dividends tax is used, as a cautious estimate.</>,
            inp.drip
              ? <>Dividends are reinvested once a year, with no costs.</>
              : <>Dividends are paid out, not reinvested.</>,
            <>Contributions of {formatRand(inp.monthlyContribution * 12, 0)} a year are added at the end of each year.</>,
            <>Not included: fees, capital gains tax when you sell, and inflation.</>,
          ]}
        />
      </div>

    </div>
  );
}
