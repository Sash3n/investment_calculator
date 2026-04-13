import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import { Home, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';

// ─── Constants ─────────────────────────────────────────────────────────────────

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
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
  total:       number;
}

function calcMonthlyCosts(
  purchasePrice: number,
  bondRate: number,
  bondTerm: number,
  levy: number,
  rates: number,
  insurance: number,
  maintenancePct: number,
  agentFeePct: number,
  monthlyRent: number
): MonthlyCosts {
  const bond        = calcMonthlyBondPayment(purchasePrice * 0.9, bondRate, bondTerm); // assume 10% deposit
  const maintenance = (purchasePrice * maintenancePct) / 100 / 12;
  const agentFee    = (monthlyRent * agentFeePct) / 100;
  const total       = bond + levy + rates + insurance + maintenance + agentFee;
  return { bond, levy, rates, insurance, maintenance, agentFee, total };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RentalYieldFinder() {
  const [purchasePrice,   setPurchasePrice]   = useState(1_200_000);
  const [monthlyRent,     setMonthlyRent]     = useState(8_500);
  const [bondRate,        setBondRate]        = useState(11.5);
  const [bondTerm,        setBondTerm]        = useState(20);
  const [levy,            setLevy]            = useState(1_800);
  const [rates,           setRates]           = useState(900);
  const [insurance,       setInsurance]       = useState(500);
  const [maintenancePct,  setMaintenancePct]  = useState(1.0);
  const [agentFeePct,     setAgentFeePct]     = useState(8.5);
  const [vacancyMonths,   setVacancyMonths]   = useState(1);

  const costs = useMemo(
    () => calcMonthlyCosts(purchasePrice, bondRate, bondTerm, levy, rates, insurance, maintenancePct, agentFeePct, monthlyRent),
    [purchasePrice, bondRate, bondTerm, levy, rates, insurance, maintenancePct, agentFeePct, monthlyRent]
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

  // True breakeven: rent = (bond + levy + rates + insurance + maintenance) / (1 - agentFee%)
  const fixedCosts  = costs.bond + costs.levy + costs.rates + costs.insurance + costs.maintenance;
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
      const total  = costs.bond + costs.levy + costs.rates + costs.insurance + costs.maintenance + agFee;
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
      const equity            = propertyValue - (purchasePrice * 0.9); // simplified
      return {
        year:     `Yr ${yr}`,
        equity:   Math.round(equity),
        netCF:    Math.round(netCashFlow),
        total:    Math.round(equity + netCashFlow),
      };
    });
  }, [purchasePrice, effectiveAnnualRent, costs]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Home size={20} className="text-[#10B981]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Rental Yield Finder
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
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
          { label: 'Gross Yield',         value: `${grossYield.toFixed(2)}%`,     color: C.amber,   sub: 'annual rent / price' },
          { label: 'Net Yield',           value: `${netYield.toFixed(2)}%`,       color: netYield >= 0 ? C.emerald : C.red, sub: 'after all costs' },
          { label: 'Monthly Cash Flow',   value: formatRand(monthlyCashFlow, 0),  color: isCashFlowPositive ? C.emerald : C.red,
            sub: isCashFlowPositive ? 'positive' : 'negative' },
          { label: 'Breakeven Rent',      value: formatRand(breakEvenRentActual, 0), color: C.indigo, sub: `${breakEvenYield.toFixed(2)}% yield` },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card-static p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-text-subtle)' }}>{kpi.label}</p>
            <p className="text-base font-bold leading-tight"
              style={{ color: kpi.color, fontFamily: 'var(--font-heading)' }}>
              {kpi.value}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{kpi.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Cash flow status banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{
          background: isCashFlowPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${isCashFlowPositive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
        }}
      >
        {isCashFlowPositive
          ? <CheckCircle2 size={18} style={{ color: C.emerald, flexShrink: 0 }} />
          : <AlertCircle  size={18} style={{ color: C.red, flexShrink: 0 }} />}
        <div>
          <p className="text-sm font-semibold"
            style={{ color: isCashFlowPositive ? C.emerald : C.red }}>
            {isCashFlowPositive
              ? `Cash-flow positive: ${formatRand(monthlyCashFlow, 0)}/month surplus`
              : `Cash-flow negative: ${formatRand(Math.abs(monthlyCashFlow), 0)}/month shortfall`}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            You need at least <strong style={{ color: 'var(--color-text)' }}>{formatRand(breakEvenRentActual, 0)}/month</strong> to break even.
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
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Property Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="pp" label="Purchase Price" value={purchasePrice}
              onChange={(v) => setPurchasePrice(parseFloat(v) || 0)} prefix="R" />
            <InputField id="rent" label="Expected Monthly Rent" value={monthlyRent}
              onChange={(v) => setMonthlyRent(parseFloat(v) || 0)} prefix="R" />
            <InputField id="br" label="Bond Interest Rate" value={bondRate}
              onChange={(v) => setBondRate(parseFloat(v) || 0)} suffix="%" step={0.25} />
            <InputField id="bt" label="Bond Term" value={bondTerm}
              onChange={(v) => setBondTerm(parseFloat(v) || 0)} suffix="yrs" />
            <InputField id="vac" label="Vacancy (months/yr)" value={vacancyMonths}
              onChange={(v) => setVacancyMonths(parseFloat(v) || 0)} suffix="mo" step={0.5} />
          </div>
        </div>

        {/* Monthly costs */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-sm font-bold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Monthly Costs
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="levy"    label="Levy"              value={levy}           onChange={(v) => setLevy(parseFloat(v) || 0)}           prefix="R" />
            <InputField id="rates"   label="Rates & Taxes"     value={rates}          onChange={(v) => setRates(parseFloat(v) || 0)}          prefix="R" />
            <InputField id="ins"     label="Insurance"         value={insurance}      onChange={(v) => setInsurance(parseFloat(v) || 0)}      prefix="R" />
            <InputField id="maint"   label="Maintenance"       value={maintenancePct} onChange={(v) => setMaintenancePct(parseFloat(v) || 0)} suffix="% p.a." step={0.1} />
            <InputField id="agent"   label="Agent Fee"         value={agentFeePct}    onChange={(v) => setAgentFeePct(parseFloat(v) || 0)}    suffix="%" step={0.5} />
          </div>
        </div>
      </motion.div>

      {/* Cost breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="glass-card-static p-5"
      >
        <p className="text-sm font-semibold mb-3"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Monthly Cost Breakdown
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Bond Payment', value: costs.bond,        color: C.indigo  },
            { label: 'Levy',         value: costs.levy,        color: C.violet  },
            { label: 'Rates',        value: costs.rates,       color: C.amber   },
            { label: 'Insurance',    value: costs.insurance,   color: C.cyan    },
            { label: 'Maintenance',  value: costs.maintenance, color: C.emerald },
            { label: 'Agent Fee',    value: costs.agentFee,    color: C.red     },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-3 text-center"
              style={{ background: `${item.color}0D`, border: `1px solid ${item.color}20` }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
              <p className="text-sm font-bold mt-1" style={{ color: item.color }}>
                {formatRand(item.value, 0)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>Total Monthly Costs</p>
          <p className="text-sm font-bold" style={{ color: C.red }}>{formatRand(costs.total, 0)}</p>
        </div>
      </motion.div>

      {/* Cash flow vs rent chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card-static p-5"
      >
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Cash Flow vs Rent
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Monthly cash flow across different rent levels. Dashed line = breakeven at {formatRand(breakEvenRentActual, 0)}/mo
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="rent" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => formatRandShort(v)} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(v, name) => name === 'Gross Yield' ? [`${v}%`, name] : [formatRand(Number(v), 0), name]}
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(l) => `Rent: ${formatRand(Number(l), 0)}/mo`}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
            <Line yAxisId="left"  type="monotone" dataKey="cashFlow"   name="Monthly Cash Flow" stroke={C.emerald} strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="grossYield" name="Gross Yield" stroke={C.amber} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* 10-year projection */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="glass-card-static p-5"
      >
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          10-Year Investment Projection
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Equity growth (7% p.a. appreciation) + cumulative net cash flow
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={roiData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
            <Tooltip formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="equity" name="Equity"          stroke={C.indigo}  strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="netCF"  name="Cumul. Cash Flow" stroke={isCashFlowPositive ? C.emerald : C.red} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="total"  name="Total Return"    stroke={C.amber}   strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-subtle)' }}>
          * Assumes 10% deposit, 7% annual appreciation, current rent held constant. Does not account for bond balance reduction.
        </p>
      </motion.div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Estimates only. Consult a qualified financial adviser before investing. Not financial advice.
      </p>
    </div>
  );
}
