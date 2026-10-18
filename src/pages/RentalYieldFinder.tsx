import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import { Home, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';
import { Statement } from '../components/statement/Statement';
import type { StatementData, StatementLine } from '../components/statement/statementText';
import { calcTransferDuty, calcBondRegistrationCost } from '../utils/tax';
import { alpha, textTone } from '../utils/color';
import { useJourneyValues } from '../journeys/JourneyContext';

// ─── Constants ─────────────────────────────────────────────────────────────────

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
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

// ─── Math helpers ──────────────────────────────────────────────────────────────

function calcMonthlyBondPayment(principal: number, ratePercent: number, termYears: number): number {
  if (principal <= 0 || ratePercent <= 0 || termYears <= 0) return 0;
  const r = ratePercent / 100 / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

interface MonthlyCosts {
  bond:        number;
  levy:        number;
  rates:       number;
  insurance:   number;
  maintenance: number;
  agentFee:    number;
  effluent:    number;
  misc:        number;
  total:       number;
}

function calcMonthlyCosts(
  loanAmount: number,
  bondRate: number,
  bondTerm: number,
  levy: number,
  rates: number,
  insurance: number,
  maintenancePct: number,
  agentFeePct: number,
  monthlyRent: number,
  purchasePrice: number,
  effluent: number,
  misc: number,
): MonthlyCosts {
  const bond        = calcMonthlyBondPayment(loanAmount, bondRate, bondTerm);
  const maintenance = (purchasePrice * maintenancePct) / 100 / 12;
  const agentFee    = (monthlyRent * agentFeePct) / 100;
  const total       = bond + levy + rates + insurance + maintenance + agentFee + effluent + misc;
  return { bond, levy, rates, insurance, maintenance, agentFee, effluent, misc, total };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RentalYieldFinder() {
  const [purchasePrice,   setPurchasePrice]   = useState(1_200_000);
  const [deposit,         setDeposit]         = useState(120_000);
  const [initiationFee,   setInitiationFee]   = useState(6_037);
  const [capitaliseInitiationFee, setCapitaliseInitiationFee] = useState(false);
  const [monthlyRent,     setMonthlyRent]     = useState(8_500);
  const [bondRate,        setBondRate]        = useState(11.5);
  const [bondTerm,        setBondTerm]        = useState(20);
  const [levy,            setLevy]            = useState(1_800);
  const [rates,           setRates]           = useState(900);
  const [insurance,       setInsurance]       = useState(500);
  const [effluent,        setEffluent]        = useState(350);
  const [misc,            setMisc]            = useState(0);
  const [maintenancePct,  setMaintenancePct]  = useState(1.0);
  const [agentFeePct,     setAgentFeePct]     = useState(8.5);
  const [vacancyMonths,   setVacancyMonths]   = useState(1);

  const loanAmount = Math.max(0, purchasePrice - deposit) + (capitaliseInitiationFee ? initiationFee : 0);

  // Upfront costs
  const transferDuty     = useMemo(() => calcTransferDuty(purchasePrice), [purchasePrice]);
  const bondRegCost      = useMemo(() => calcBondRegistrationCost(loanAmount), [loanAmount]);
  const totalUpfront     = deposit + (capitaliseInitiationFee ? 0 : initiationFee) + transferDuty + bondRegCost;

  const costs = useMemo(
    () => calcMonthlyCosts(loanAmount, bondRate, bondTerm, levy, rates, insurance, maintenancePct, agentFeePct, monthlyRent, purchasePrice, effluent, misc),
    [loanAmount, bondRate, bondTerm, levy, rates, insurance, maintenancePct, agentFeePct, monthlyRent, purchasePrice, effluent, misc]
  );

  // Effective annual rent after vacancy
  const effectiveAnnualRent = monthlyRent * (12 - vacancyMonths);

  // Gross yield
  const grossYield = purchasePrice > 0 ? (monthlyRent * 12 / purchasePrice) * 100 : 0;

  // Net yield (after all costs, before bond repayment capital component)
  const annualCashFlow   = effectiveAnnualRent - costs.total * 12;
  const monthlyCashFlow  = annualCashFlow / 12;
  const netYield         = purchasePrice > 0 ? (annualCashFlow / purchasePrice) * 100 : 0;
  const isCashFlowPositive = monthlyCashFlow >= 0;

  useJourneyValues({
    price: purchasePrice, deposit, rate: bondRate, term: bondTerm, rent: monthlyRent,
    levy, rates, insurance, effluent, misc,
  });

  // True breakeven: rent = (bond + levy + rates + insurance + maintenance + effluent + misc) / (1 - agentFee%)
  const fixedCosts  = costs.bond + costs.levy + costs.rates + costs.insurance + costs.maintenance + costs.effluent + costs.misc;
  const breakEvenRentActual = agentFeePct < 100
    ? fixedCosts / (1 - agentFeePct / 100)
    : fixedCosts;

  // Breakeven yield
  const breakEvenYield = purchasePrice > 0
    ? (breakEvenRentActual * 12 / purchasePrice) * 100
    : 0;

  // Chart: cash flow across a range of rents
  const chartData = useMemo(() => {
    const minRent = Math.max(1000, breakEvenRentActual * 0.5);
    const maxRent = breakEvenRentActual * 2;
    const steps   = 30;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const r      = minRent + (maxRent - minRent) * (i / steps);
      const agFee  = (r * agentFeePct) / 100;
      const total  = costs.bond + costs.levy + costs.rates + costs.insurance + costs.maintenance + costs.effluent + costs.misc + agFee;
      const cf     = r - total;
      const yield_ = purchasePrice > 0 ? (r * 12 / purchasePrice) * 100 : 0;
      return {
        rent:       Math.round(r),
        cashFlow:   Math.round(cf),
        grossYield: parseFloat(yield_.toFixed(2)),
      };
    });
  }, [costs, agentFeePct, purchasePrice, breakEvenRentActual]);

  // ROI horizons (capital appreciation)
  const appreciationRate = 7; // % p.a.
  const roiData = useMemo(() => {
    return Array.from({ length: 11 }, (_, yr) => {
      const propertyValue = purchasePrice * Math.pow(1 + appreciationRate / 100, yr);
      const totalRentReceived = effectiveAnnualRent * yr;
      const totalCostsPaid    = costs.total * 12 * yr;
      const netCashFlow       = totalRentReceived - totalCostsPaid;
      const equity            = propertyValue - loanAmount;
      return {
        year:     `Yr ${yr}`,
        equity:   Math.round(equity),
        netCF:    Math.round(netCashFlow),
        total:    Math.round(equity + netCashFlow),
      };
    });
  }, [purchasePrice, effectiveAnnualRent, costs, loanAmount]);

  // Payslip-style statement of the same figures (monthly averages over a year)
  const statement: StatementData = {
    title: 'Monthly rental statement',
    subtitle: `${formatRand(purchasePrice, 0)} property let at ${formatRand(monthlyRent, 0)} a month`,
    sections: [
      {
        heading: 'Income',
        lines: [
          { label: 'Rent', value: monthlyRent },
          { label: `Vacancy (${vacancyMonths} month${vacancyMonths === 1 ? '' : 's'} a year)`, value: (monthlyRent * vacancyMonths) / 12, kind: 'less' },
        ],
        subtotal: { label: 'Rent received', value: effectiveAnnualRent / 12 },
      },
      {
        heading: 'Costs',
        lines: ([
          { label: 'Bond repayment', value: costs.bond, kind: 'less', note: `${formatRand(loanAmount, 0)} at ${bondRate}% over ${bondTerm} years` },
          { label: 'Levy', value: costs.levy, kind: 'less' },
          { label: 'Rates and taxes', value: costs.rates, kind: 'less' },
          { label: 'Insurance', value: costs.insurance, kind: 'less' },
          { label: `Maintenance (${maintenancePct}% of the price a year)`, value: costs.maintenance, kind: 'less' },
          { label: `Letting agent (${agentFeePct}% of rent)`, value: costs.agentFee, kind: 'less' },
          costs.effluent > 0 ? { label: 'Effluent', value: costs.effluent, kind: 'less' } : null,
          costs.misc > 0 ? { label: 'Other costs', value: costs.misc, kind: 'less' } : null,
        ] as (StatementLine | null)[]).filter((l): l is StatementLine => l !== null),
        subtotal: { label: 'Total costs', value: costs.total, kind: 'less' },
      },
    ],
    total: { label: 'Monthly cash flow', value: monthlyCashFlow },
    after: [
      {
        heading: 'Returns',
        lines: [
          { label: 'Gross yield', display: formatPercent(grossYield, 2) },
          { label: 'Net yield (after costs and bond)', display: formatPercent(netYield, 2) },
          { label: 'Break-even rent', display: `${formatRand(breakEvenRentActual, 0)} a month` },
        ],
      },
    ],
    footnote: 'Monthly averages over a year. Estimate only, not financial advice.',
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--gain) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 25%, transparent)' }}>
            <Home size={20} className="text-gain-ink" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Rental Yield Finder
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              Find your breakeven rent and true cash flow for any SA rental property
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPI strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: 'Gross Yield',         value: `${grossYield.toFixed(2)}%`,     color: C.orange,   sub: 'annual rent / price' },
          { label: 'Net Yield',           value: `${netYield.toFixed(2)}%`,       color: netYield >= 0 ? C.green : C.red, sub: 'after all costs' },
          { label: 'Monthly Cash Flow',   value: formatRand(monthlyCashFlow, 0),  color: isCashFlowPositive ? C.green : C.red,
            sub: isCashFlowPositive ? 'positive' : 'negative' },
          { label: 'Breakeven Rent',      value: formatRand(breakEvenRentActual, 0), color: C.blue, sub: `${breakEvenYield.toFixed(2)}% yield` },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card-static p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--ink-subtle)' }}>{kpi.label}</p>
            <p className="text-base font-bold leading-tight"
              style={{ color: textTone(kpi.color), fontFamily: 'var(--font-display)' }}>
              {kpi.value}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-subtle)' }}>{kpi.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Cash flow status banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{
          background: isCashFlowPositive ? 'color-mix(in srgb, var(--gain) 8%, transparent)' : 'color-mix(in srgb, var(--loss) 8%, transparent)',
          border: `1px solid ${isCashFlowPositive ? 'color-mix(in srgb, var(--gain) 25%, transparent)' : 'color-mix(in srgb, var(--loss) 25%, transparent)'}`,
        }}
      >
        {isCashFlowPositive
          ? <CheckCircle2 size={18} style={{ color: textTone(C.green), flexShrink: 0 }} />
          : <AlertCircle  size={18} style={{ color: textTone(C.red), flexShrink: 0 }} />}
        <div>
          <p className="text-sm font-semibold"
            style={{ color: textTone(isCashFlowPositive ? C.green : C.red) }}>
            {isCashFlowPositive
              ? `Cash-flow positive: ${formatRand(monthlyCashFlow, 0)}/month surplus`
              : `Cash-flow negative: ${formatRand(Math.abs(monthlyCashFlow), 0)}/month shortfall`}
          </p>
          <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
            You need at least <strong style={{ color: 'var(--ink)' }}>{formatRand(breakEvenRentActual, 0)}/month</strong> to break even.
            {monthlyRent < breakEvenRentActual
              ? ` Increase rent by ${formatRand(breakEvenRentActual - monthlyRent, 0)} to break even.`
              : ` You are ${formatRand(monthlyRent - breakEvenRentActual, 0)} above breakeven.`}
          </p>
        </div>
      </motion.div>

      {/* Inputs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {/* Property details */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-sm font-bold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Property Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="pp" label="Purchase Price" value={purchasePrice}
              onChange={(v) => setPurchasePrice(parseFloat(v) || 0)} prefix="R" />
            <InputField id="dep" label="Deposit" value={deposit}
              onChange={(v) => setDeposit(parseFloat(v) || 0)} prefix="R" />
            <InputField id="rent" label="Expected Monthly Rent" value={monthlyRent}
              onChange={(v) => setMonthlyRent(parseFloat(v) || 0)} prefix="R" />
            <InputField id="br" label="Bond Interest Rate" value={bondRate}
              onChange={(v) => setBondRate(parseFloat(v) || 0)} suffix="%" step={0.25} />
            <InputField id="bt" label="Bond Term" value={bondTerm}
              onChange={(v) => setBondTerm(parseFloat(v) || 0)} suffix="yrs" />
            <InputField id="vac" label="Vacancy (months/yr)" value={vacancyMonths}
              onChange={(v) => setVacancyMonths(parseFloat(v) || 0)} suffix="mo" step={0.5} />
          </div>

          {/* Upfront costs breakdown */}
          <div className="rounded-xl p-3.5 space-y-2 mt-1" style={{ background: 'color-mix(in srgb, var(--note-blue) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 15%, transparent)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: textTone(C.blue) }}>
              Upfront Costs
            </p>
            <InputField id="init" label="Initiation Fee" value={initiationFee}
              onChange={(v) => setInitiationFee(parseFloat(v) || 0)} prefix="R" step={100}
              help="NCA cap R6,037 for bonds > R500K" />
            <label className="flex items-start gap-3 cursor-pointer group pt-1">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={capitaliseInitiationFee}
                  onChange={(e) => setCapitaliseInitiationFee(e.target.checked)}
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${capitaliseInitiationFee ? 'bg-note-blue' : 'bg-rule-strong'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${capitaliseInitiationFee ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>Add Initiation Fee to Loan</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-subtle)' }}>
                  Finance it instead of paying upfront — increases the bond and monthly repayment.
                </p>
              </div>
            </label>
            <div className="space-y-1.5 pt-1">
              {[
                { label: 'Transfer Duty',     value: transferDuty },
                { label: 'Bond Registration', value: bondRegCost },
                { label: 'Total Cash Needed', value: totalUpfront, bold: true },
              ].map((r) => (
                <div key={r.label} className={`flex justify-between ${r.bold ? 'pt-1.5 border-t border-note-blue/20' : ''}`}>
                  <span className="text-xs" style={{ color: textTone(r.bold ? C.blue : 'var(--ink-muted)') }}>{r.label}</span>
                  <span className={`text-xs font-semibold tabular-nums ${r.bold ? 'text-sm' : ''}`} style={{ color: textTone(r.bold ? C.blue : 'var(--ink)') }}>
                    {formatRand(r.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly costs */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-sm font-bold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Monthly Costs
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="levy"    label="Levy"              value={levy}           onChange={(v) => setLevy(parseFloat(v) || 0)}           prefix="R" />
            <InputField id="rates"   label="Rates & Taxes"     value={rates}          onChange={(v) => setRates(parseFloat(v) || 0)}          prefix="R" />
            <InputField id="ins"     label="Insurance"         value={insurance}      onChange={(v) => setInsurance(parseFloat(v) || 0)}      prefix="R" />
            <InputField id="eff"     label="Effluent"          value={effluent}       onChange={(v) => setEffluent(parseFloat(v) || 0)}       prefix="R"  />
            <InputField id="misc"    label="Misc"              value={misc}           onChange={(v) => setMisc(parseFloat(v) || 0)}           prefix="R" />
            <InputField id="maint"   label="Maintenance"       value={maintenancePct} onChange={(v) => setMaintenancePct(parseFloat(v) || 0)} suffix="% p.a." step={0.1} />
            <InputField id="agent"   label="Agent Fee"         value={agentFeePct}    onChange={(v) => setAgentFeePct(parseFloat(v) || 0)}    suffix="%" step={0.5} />
          </div>
        </div>
      </motion.div>

      {/* Statement */}
      <Statement data={statement} />

      {/* Cost breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="glass-card-static p-5"
      >
        <p className="text-sm font-semibold mb-3"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Monthly Cost Breakdown
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {[
            { label: 'Bond Payment', value: costs.bond,        color: C.blue  },
            { label: 'Levy',         value: costs.levy,        color: C.brown  },
            { label: 'Rates',        value: costs.rates,       color: C.orange   },
            { label: 'Insurance',    value: costs.insurance,   color: C.teal    },
            { label: 'Effluent',     value: costs.effluent,    color: 'var(--note-teal)' },
            { label: 'Misc',         value: costs.misc,        color: 'var(--note-brown)' },
            { label: 'Maintenance',  value: costs.maintenance, color: C.green },
            { label: 'Agent Fee',    value: costs.agentFee,    color: C.red     },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-3 text-center"
              style={{ background: alpha(item.color, 5), border: `1px solid ${alpha(item.color, 13)}` }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--ink-muted)' }}>{item.label}</p>
              <p className="text-sm font-bold mt-1" style={{ color: textTone(item.color) }}>
                {formatRand(item.value, 0)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 flex items-center justify-between"
          style={{ borderTop: '1px solid color-mix(in srgb, var(--ink) 6%, transparent)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink-muted)' }}>Total Monthly Costs</p>
          <p className="text-sm font-bold" style={{ color: textTone(C.red) }}>{formatRand(costs.total, 0)}</p>
        </div>
      </motion.div>

      {/* Cash flow vs rent chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card-static p-5"
      >
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Cash Flow vs Rent
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
          Monthly cash flow across different rent levels. Dashed line = breakeven at {formatRand(breakEvenRentActual, 0)}/mo
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
            <XAxis dataKey="rent" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => formatRandShort(v)} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => `${v}%`} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
              formatter={(v, name) => name === 'Gross Yield' ? [`${v}%`, name] : [formatRand(Number(v), 0), name]}
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(l) => `Rent: ${formatRand(Number(l), 0)}/mo`}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
            <ReferenceLine yAxisId="left" y={0} stroke="color-mix(in srgb, var(--ink) 20%, transparent)" strokeDasharray="4 4" />
            <Line yAxisId="left"  type="monotone" dataKey="cashFlow"   name="Monthly Cash Flow" stroke={C.green} strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="grossYield" name="Gross Yield" stroke={C.orange} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* 10-year projection */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="glass-card-static p-5"
      >
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          10-Year Investment Projection
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
          Equity growth (7% p.a. appreciation) + cumulative net cash flow
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={roiData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
            <ReferenceLine y={0} stroke="color-mix(in srgb, var(--ink) 15%, transparent)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="equity" name="Equity"          stroke={C.blue}  strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="netCF"  name="Cumul. Cash Flow" stroke={isCashFlowPositive ? C.green : C.red} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="total"  name="Total Return"    stroke={C.orange}   strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[10px] mt-2" style={{ color: 'var(--ink-subtle)' }}>
          * Assumes 7% annual appreciation, current rent held constant. Does not account for bond balance reduction.
        </p>
      </motion.div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--ink-subtle)' }}>
        Estimates only. Consult a qualified financial adviser before investing. Not financial advice.
      </p>
    </div>
  );
}
