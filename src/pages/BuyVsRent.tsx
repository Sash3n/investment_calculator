import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { Home, Key, TrendingUp, Info, Scale } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { formatRand, formatRandShort } from '../utils/format';
import { calcPayment } from '../utils/mortgage';
import { calcTransferDuty, calcBondRegistrationCost, calcIncomeTax } from '../utils/tax';

// ── SARS 2026/27 ──────────────────────────────────────────────────────────────
const CGT_INCLUSION    = 0.40;
const CGT_EXCLUSION    = 50_000;
const PRIMARY_EXCL     = 3_000_000; // primary residence CGT exclusion

const C = {
  indigo:  '#6366F1',
  amber:   '#F59E0B',
  emerald: '#10B981',
  red:     '#EF4444',
  cyan:    '#06B6D4',
};

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Inputs {
  // Buying
  purchasePrice:           number;
  depositPercent:          number;
  interestRatePercent:     number;
  loanTermYears:           number;
  initiationFee:           number;
  initiationFeeCapitalised: boolean;
  monthlyRates:            number;
  monthlyLevies:           number;
  monthlyInsurance:        number;
  maintenancePercent:      number; // % of property value per year
  propertyGrowthPercent:   number;
  isPrimaryResidence:      boolean;
  otherAnnualIncome:       number;
  // Renting
  monthlyRent:             number;
  annualRentEscalation:    number;
  // Investment (for renter)
  investmentReturnPercent: number;
  // Shared
  yearsToCompare:          number;
}

interface YearRow {
  year:              number;
  // Buying
  propertyValue:     number;
  loanBalance:       number;
  equity:            number;
  buyAnnualCost:     number;   // bond + rates + levies + insurance + maintenance
  buyCumCost:        number;
  netWealthBuy:      number;   // equity - cumulative sunk costs (non-equity)
  // Renting
  monthlyRentYear:   number;
  rentAnnualCost:    number;
  rentCumCost:       number;
  investPortfolio:   number;   // deposit + monthly saving invested
  netWealthRent:     number;   // investPortfolio - cumulative rent paid
  // Diff
  advantage:         number;   // positive = buying ahead, negative = renting ahead
}

// ── Core simulation ───────────────────────────────────────────────────────────
function simulate(inp: Inputs): YearRow[] {
  const deposit      = inp.purchasePrice * (inp.depositPercent / 100);
  const loan         = inp.purchasePrice - deposit + (inp.initiationFeeCapitalised ? inp.initiationFee : 0);
  const monthlyPmt   = calcPayment(loan, inp.interestRatePercent, inp.loanTermYears, 12);
  const r            = inp.investmentReturnPercent / 100 / 12;

  // Upfront buying costs (transfer duty + bond reg + deposit + initiation fee if paid as cash)
  const transferDuty    = calcTransferDuty(inp.purchasePrice);
  const bondReg         = calcBondRegistrationCost(loan);
  const initiationFeeCash = inp.initiationFeeCapitalised ? 0 : inp.initiationFee;
  const totalUpfront    = deposit + transferDuty + bondReg + initiationFeeCash;

  // Renter invests the deposit + transfer duty + bond reg from day 1
  let investPortfolio = totalUpfront;
  let loanBalance     = loan;

  const rows: YearRow[] = [];
  let buyCumCost    = totalUpfront;   // sunk costs (not equity)
  let rentCumCost   = 0;

  for (let year = 1; year <= inp.yearsToCompare; year++) {
    const propertyValue = inp.purchasePrice * Math.pow(1 + inp.propertyGrowthPercent / 100, year);
    const monthlyRentYear = inp.monthlyRent * Math.pow(1 + inp.annualRentEscalation / 100, year - 1);

    // ── Buying annual costs ───────────────────────────────────────────────
    const annualBondPmt    = monthlyPmt * 12;
    const annualRates      = inp.monthlyRates * 12;
    const annualLevies     = inp.monthlyLevies * 12;
    const annualInsurance  = inp.monthlyInsurance * 12;
    const annualMaint      = (inp.maintenancePercent / 100) * inp.purchasePrice;
    const buyAnnualCost    = annualBondPmt + annualRates + annualLevies + annualInsurance + annualMaint;

    // Track loan balance for this year
    let localBalance = loanBalance;
    let annualInterest = 0;
    let annualPrincipal = 0;
    const rMonthly = inp.interestRatePercent / 100 / 12;
    for (let m = 0; m < 12; m++) {
      if (localBalance <= 0) break;
      const interest  = localBalance * rMonthly;
      const principal = Math.min(monthlyPmt - interest, localBalance);
      annualInterest  += interest;
      annualPrincipal += principal;
      localBalance    -= principal;
    }
    loanBalance = Math.max(0, localBalance);

    // Sunk cost for buyer = interest + rates + levies + insurance + maintenance (principal builds equity)
    const annualSunkCost = annualInterest + annualRates + annualLevies + annualInsurance + annualMaint;
    buyCumCost += annualSunkCost;

    const equity = Math.max(0, propertyValue - loanBalance);

    // ── Renting annual costs ──────────────────────────────────────────────
    const rentAnnualCost = monthlyRentYear * 12;
    rentCumCost         += rentAnnualCost;

    // Renter invests monthly saving (bond pmt - rent) if positive, else it's a cost
    const monthlySaving  = monthlyPmt - monthlyRentYear;

    // Grow portfolio monthly
    for (let m = 0; m < 12; m++) {
      investPortfolio = investPortfolio * (1 + r);
      // If bond > rent, renter can invest the difference
      if (monthlySaving > 0) investPortfolio += monthlySaving;
      // If rent > bond, renter draws from portfolio to cover gap (opportunity cost)
      // We don't subtract — they just have less to invest
    }

    // CGT on investment portfolio at this exit year
    const portfolioGain    = Math.max(0, investPortfolio - totalUpfront - Math.max(0, monthlySaving) * 12 * year);
    const netGain          = Math.max(0, portfolioGain - CGT_EXCLUSION);
    const inclusion        = netGain * CGT_INCLUSION;
    const cgtRenter        = calcIncomeTax(inp.otherAnnualIncome + inclusion, 'under65')
                           - calcIncomeTax(inp.otherAnnualIncome, 'under65');
    const portfolioAfterCGT = investPortfolio - Math.max(0, cgtRenter);
    const netWealthRent    = portfolioAfterCGT - rentCumCost + totalUpfront; // upfront recovered

    // CGT on property at this exit year
    const capitalGain     = Math.max(0, propertyValue - inp.purchasePrice);
    const primaryExcl     = inp.isPrimaryResidence ? Math.min(capitalGain, PRIMARY_EXCL) : 0;
    const gainAfterExcl   = Math.max(0, capitalGain - primaryExcl);
    const netGainProp     = Math.max(0, gainAfterExcl - CGT_EXCLUSION);
    const inclProp        = netGainProp * CGT_INCLUSION;
    const cgtBuyer        = calcIncomeTax(inp.otherAnnualIncome + inclProp, 'under65')
                          - calcIncomeTax(inp.otherAnnualIncome, 'under65');
    const saleCosts       = propertyValue * 0.025; // ~2.5% agent commission
    const netEquity       = equity - cgtBuyer - saleCosts;
    const netWealthBuyAfterSale = netEquity - buyCumCost + deposit;

    rows.push({
      year,
      propertyValue,
      loanBalance,
      equity,
      buyAnnualCost,
      buyCumCost,
      netWealthBuy: netWealthBuyAfterSale,
      monthlyRentYear,
      rentAnnualCost,
      rentCumCost,
      investPortfolio: portfolioAfterCGT,
      netWealthRent,
      advantage: netWealthBuyAfterSale - netWealthRent,
    });
  }

  return rows;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BuyVsRent() {
  const [inp, setInp] = useState<Inputs>({
    purchasePrice:           1_500_000,
    depositPercent:          10,
    interestRatePercent:     11.5,
    loanTermYears:           20,
    initiationFee:           6_037,
    initiationFeeCapitalised: false,
    monthlyRates:            1_500,
    monthlyLevies:           1_200,
    monthlyInsurance:        500,
    maintenancePercent:      1,
    propertyGrowthPercent:   5,
    isPrimaryResidence:      true,
    otherAnnualIncome:       480_000,
    monthlyRent:             8_500,
    annualRentEscalation:    8,
    investmentReturnPercent: 11,
    yearsToCompare:          15,
  });

  const n = (fn: (v: number) => Partial<Inputs>) => (val: string) =>
    setInp((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const rows = useMemo(() => simulate(inp), [inp]);
  const last = rows[rows.length - 1];

  // Derived
  const deposit       = inp.purchasePrice * (inp.depositPercent / 100);
  const loan          = inp.purchasePrice - deposit + (inp.initiationFeeCapitalised ? inp.initiationFee : 0);
  const monthlyPmt    = calcPayment(loan, inp.interestRatePercent, inp.loanTermYears, 12);
  const transferDuty  = calcTransferDuty(inp.purchasePrice);
  const bondReg       = calcBondRegistrationCost(loan);
  const initiationFeeCash = inp.initiationFeeCapitalised ? 0 : inp.initiationFee;
  const totalUpfront  = deposit + transferDuty + bondReg + initiationFeeCash;
  const monthlySaving = monthlyPmt - inp.monthlyRent; // positive = bond > rent, renter invests diff

  // Break-even year
  const breakEvenRow  = rows.find((r) => r.advantage >= 0);
  const breakEvenYear = breakEvenRow?.year ?? null;

  // Winner at end
  const buyWins  = (last?.advantage ?? 0) >= 0;
  const winner   = buyWins ? 'Buying' : 'Renting + Investing';
  const margin   = Math.abs(last?.advantage ?? 0);

  // Chart data
  const chartData = rows.map((r) => ({
    label:    `Y${r.year}`,
    buying:   Math.round(r.netWealthBuy),
    renting:  Math.round(r.netWealthRent),
    equity:   Math.round(r.equity),
  }));

  const costChart = rows
    .filter((_, i) => i % Math.max(1, Math.floor(rows.length / 12)) === 0)
    .map((r) => ({
      label:  `Y${r.year}`,
      buy:    Math.round(r.buyAnnualCost),
      rent:   Math.round(r.rentAnnualCost),
    }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Scale size={20} className="text-[#10B981]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Buy vs Rent Calculator
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              True cost comparison · Net wealth at exit · Break-even year · SARS 2026/27 CGT
            </p>
          </div>
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold hidden sm:inline-block"
            style={{
              background: buyWins ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
              color:      buyWins ? C.emerald : C.indigo,
              border:     `1px solid ${buyWins ? C.emerald : C.indigo}44`,
            }}
          >
            {winner} wins by {formatRandShort(margin)}
          </span>
        </div>
      </motion.div>

      {/* Winner callout */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
        style={{
          background: buyWins ? 'rgba(16,185,129,0.07)' : 'rgba(99,102,241,0.07)',
          border: `1px solid ${buyWins ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: buyWins ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)' }}>
            {buyWins ? <Home size={16} style={{ color: C.emerald }} /> : <Key size={16} style={{ color: C.indigo }} />}
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: buyWins ? C.emerald : C.indigo }}>
              {winner} is better over {inp.yearsToCompare} years by {formatRand(margin, 0)}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {breakEvenYear
                ? `Buying breaks even vs renting in Year ${breakEvenYear} (age-based on your inputs)`
                : buyWins
                  ? 'Buying is ahead from the start'
                  : `Renting + investing stays ahead throughout the ${inp.yearsToCompare}-year period`}
              {' · '}Net wealth = equity/portfolio after CGT minus all sunk costs
            </p>
          </div>
        </div>
        <div className="flex gap-4 flex-shrink-0 text-right">
          <div>
            <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Buy net wealth</p>
            <p className="text-sm font-bold" style={{ color: C.emerald }}>{formatRand(last?.netWealthBuy ?? 0, 0)}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Rent net wealth</p>
            <p className="text-sm font-bold" style={{ color: C.indigo }}>{formatRand(last?.netWealthRent ?? 0, 0)}</p>
          </div>
        </div>
      </motion.div>

      {/* Upfront cost summary */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-3"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Buying — Upfront Cash Required
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {[
            { label: 'Deposit',          value: deposit,           color: C.indigo },
            { label: 'Transfer Duty',    value: transferDuty,       color: C.amber  },
            { label: 'Bond Registration',value: bondReg,            color: C.amber  },
            { label: 'Initiation Fee',   value: initiationFeeCash,  color: C.amber  },
            { label: 'Total Upfront',    value: totalUpfront,       color: C.red, bold: true },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-3"
              style={{ background: `${item.color}0D`, border: `1px solid ${item.color}25` }}>
              <p style={{ color: 'var(--color-text-subtle)' }}>{item.label}</p>
              <p className={`mt-1 font-${item.bold ? 'bold text-base' : 'semibold text-sm'}`}
                style={{ color: item.color, fontFamily: 'var(--font-heading)' }}>
                {formatRand(item.value, 0)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs p-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Info size={12} className="text-[#64748B] flex-shrink-0" />
          <span style={{ color: 'var(--color-text-subtle)' }}>
            Monthly bond repayment: <strong style={{ color: 'var(--color-text)' }}>{formatRand(monthlyPmt, 0)}</strong>
            {' · '}Monthly rent: <strong style={{ color: 'var(--color-text)' }}>{formatRand(inp.monthlyRent, 0)}</strong>
            {' · '}
            {monthlySaving > 0
              ? <span>Bond costs <strong style={{ color: C.amber }}>{formatRand(monthlySaving, 0)}/mo more</strong> — renter invests this difference</span>
              : <span>Rent costs <strong style={{ color: C.emerald }}>{formatRand(Math.abs(monthlySaving), 0)}/mo more</strong> — buyer has more monthly cash flow</span>}
          </span>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Buying */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Home size={14} className="text-[#10B981]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Buying
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="purchasePrice" label="Purchase Price" value={inp.purchasePrice}
              onChange={n((v) => ({ purchasePrice: v }))} prefix="R" />
            <InputField id="deposit" label="Deposit" value={inp.depositPercent}
              onChange={n((v) => ({ depositPercent: v }))} suffix="%" step={1} />
            <InputField id="rate" label="Interest Rate" value={inp.interestRatePercent}
              onChange={n((v) => ({ interestRatePercent: v }))} suffix="%" step={0.25} />
            <InputField id="term" label="Loan Term" value={inp.loanTermYears}
              onChange={n((v) => ({ loanTermYears: v }))} suffix="yrs" />
            <InputField id="rates" label="Monthly Rates" value={inp.monthlyRates}
              onChange={n((v) => ({ monthlyRates: v }))} prefix="R" />
            <InputField id="levies" label="Monthly Levies" value={inp.monthlyLevies}
              onChange={n((v) => ({ monthlyLevies: v }))} prefix="R" />
            <InputField id="insurance" label="Monthly Insurance" value={inp.monthlyInsurance}
              onChange={n((v) => ({ monthlyInsurance: v }))} prefix="R" />
            <InputField id="maintenance" label="Maintenance" value={inp.maintenancePercent}
              onChange={n((v) => ({ maintenancePercent: v }))} suffix="% p.a."
              help="% of property value" step={0.25} />
            <InputField id="propGrowth" label="Property Growth" value={inp.propertyGrowthPercent}
              onChange={n((v) => ({ propertyGrowthPercent: v }))} suffix="% p.a." step={0.5} />
            <InputField id="otherIncome" label="Other Annual Income" value={inp.otherAnnualIncome}
              onChange={n((v) => ({ otherAnnualIncome: v }))} prefix="R"
              help="Sets CGT marginal rate" />
            <InputField id="initiationFee" label="Initiation Fee" value={inp.initiationFee}
              onChange={n((v) => ({ initiationFee: v }))} prefix="R"
              help="Bank-charged bond initiation fee" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs mt-1"
            style={{ color: 'var(--color-text-muted)' }}>
            <input type="checkbox" checked={inp.isPrimaryResidence}
              onChange={(e) => setInp((p) => ({ ...p, isPrimaryResidence: e.target.checked }))}
              className="w-3.5 h-3.5 rounded accent-indigo-500" />
            Primary residence (R3M CGT exclusion)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs"
            style={{ color: 'var(--color-text-muted)' }}>
            <input type="checkbox" checked={inp.initiationFeeCapitalised}
              onChange={(e) => setInp((p) => ({ ...p, initiationFeeCapitalised: e.target.checked }))}
              className="w-3.5 h-3.5 rounded accent-indigo-500" />
            Initiation fee capitalised (add to loan instead of cash)
          </label>
        </div>

        {/* Renting */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Key size={14} className="text-[#6366F1]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Renting
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <InputField id="monthlyRent" label="Monthly Rent" value={inp.monthlyRent}
              onChange={n((v) => ({ monthlyRent: v }))} prefix="R" />
            <InputField id="rentEsc" label="Annual Rent Escalation" value={inp.annualRentEscalation}
              onChange={n((v) => ({ annualRentEscalation: v }))} suffix="%" step={0.5} />
          </div>
          <div className="mt-2 p-3 rounded-xl text-xs"
            style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <p className="font-semibold mb-1" style={{ color: C.indigo }}>Renter invests:</p>
            <ul className="space-y-1" style={{ color: 'var(--color-text-muted)' }}>
              <li>• Deposit + transfer duty + bond reg + initiation fee upfront ({formatRand(totalUpfront, 0)})</li>
              <li>• Monthly saving if bond &gt; rent ({formatRand(Math.max(0, monthlySaving), 0)}/mo)</li>
            </ul>
          </div>
        </div>

        {/* Shared */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <TrendingUp size={14} className="text-[#F59E0B]" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Investment &amp; Period
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <InputField id="investReturn" label="Investment Return (Renter)" value={inp.investmentReturnPercent}
              onChange={n((v) => ({ investmentReturnPercent: v }))} suffix="% p.a." step={0.5}
              help="ETF / unit trust return assumption" />
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                Comparison Period
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15, 20, 25, 30].map((y) => (
                  <button key={y}
                    onClick={() => setInp((p) => ({ ...p, yearsToCompare: y }))}
                    className="py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: inp.yearsToCompare === y ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${inp.yearsToCompare === y ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: inp.yearsToCompare === y ? C.amber : 'var(--color-text-muted)',
                    }}
                  >
                    {y}yr
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Buy Net Wealth" value={formatRand(last?.netWealthBuy ?? 0, 0)}
          sub={`After CGT + sale costs · Y${inp.yearsToCompare}`} color="emerald" delay={0} />
        <StatCard label="Rent Net Wealth" value={formatRand(last?.netWealthRent ?? 0, 0)}
          sub="Portfolio after CGT · same period" color="indigo" delay={0.05} />
        <StatCard
          label={buyWins ? 'Buy Advantage' : 'Rent Advantage'}
          value={formatRand(margin, 0)}
          sub={`${winner} wins at year ${inp.yearsToCompare}`}
          color={buyWins ? 'emerald' : 'indigo'}
          delay={0.1}
        />
        <StatCard
          label="Break-even Year"
          value={breakEvenYear ? `Year ${breakEvenYear}` : buyWins ? 'From start' : 'Never'}
          sub="When buying overtakes renting"
          color="amber"
          delay={0.15}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Net wealth trajectories */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Net Wealth: Buy vs Rent + Invest
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Buying: property equity after CGT &amp; sale costs minus sunk costs. Renting: investment portfolio after CGT minus total rent paid.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBuy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.emerald} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.emerald} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradRent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.indigo} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }}
                formatter={(v, name) => [formatRand(Number(v), 0), name === 'buying' ? 'Buy (net)' : name === 'renting' ? 'Rent + Invest (net)' : 'Property Equity']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              {breakEvenYear && (
                <ReferenceLine x={`Y${breakEvenYear}`} stroke={C.amber} strokeDasharray="4 2"
                  label={{ value: `Break-even Y${breakEvenYear}`, fontSize: 10, fill: C.amber, position: 'top' }} />
              )}
              <Area type="monotone" dataKey="buying"  name="Buying"
                stroke={C.emerald} fill="url(#gradBuy)"  strokeWidth={2} />
              <Area type="monotone" dataKey="renting" name="Renting + Investing"
                stroke={C.indigo}  fill="url(#gradRent)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Annual cost comparison */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Annual Running Cost
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Buying: bond repayment + rates + levies + insurance + maintenance. Renting: rent (escalating).
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }}
                formatter={(v, name) => [formatRand(Number(v), 0), name === 'buy' ? 'Buying (total cost)' : 'Rent paid']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Bar dataKey="buy"  name="Buying" fill={C.emerald} radius={[3, 3, 0, 0]} />
              <Bar dataKey="rent" name="Renting" fill={C.indigo}  radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-year table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Year-by-Year Comparison
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[780px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Year', 'Property Value', 'Equity', 'Buy Net Wealth', 'Monthly Rent', 'Portfolio', 'Rent Net Wealth', 'Advantage'].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const buyAhead     = r.advantage >= 0;
                const isBreakEven  = r.year === breakEvenYear;
                return (
                  <tr key={r.year} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isBreakEven
                      ? 'rgba(245,158,11,0.06)'
                      : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    <td className="py-2 px-3 font-bold" style={{ color: isBreakEven ? C.amber : '#818CF8' }}>
                      Y{r.year}{isBreakEven ? ' ⚡' : ''}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--color-text)' }}>
                      {formatRand(r.propertyValue, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: C.emerald }}>
                      {formatRand(r.equity, 0)}
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: buyAhead ? C.emerald : 'var(--color-text-muted)' }}>
                      {formatRand(r.netWealthBuy, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                      {formatRand(r.monthlyRentYear, 0)}/mo
                    </td>
                    <td className="py-2 px-3" style={{ color: C.cyan }}>
                      {formatRand(r.investPortfolio, 0)}
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: !buyAhead ? C.indigo : 'var(--color-text-muted)' }}>
                      {formatRand(r.netWealthRent, 0)}
                    </td>
                    <td className="py-2 px-3 font-bold"
                      style={{ color: buyAhead ? C.emerald : C.indigo }}>
                      {buyAhead ? '+' : ''}{formatRand(r.advantage, 0)}
                      <span className="ml-1 text-[10px] font-normal">
                        {buyAhead ? '(buy)' : '(rent)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-subtle)' }}>
          ⚡ = break-even year · Net wealth = equity or portfolio after CGT &amp; costs, minus all sunk costs · Advantage is buying minus renting net wealth
        </p>
      </div>

      {/* Methodology note */}
      <div className="flex items-start gap-3 p-3 rounded-xl text-xs"
        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
        <Info size={14} className="text-[#6366F1] mt-0.5 flex-shrink-0" />
        <span style={{ color: 'var(--color-text-muted)' }}>
          <strong style={{ color: 'var(--color-text)' }}>Methodology:</strong> Buyer's sunk costs = mortgage interest + rates + levies + insurance + maintenance (principal repayment builds equity, not counted as a cost). Renter invests the full upfront amount (deposit + transfer duty + bond reg) plus any monthly saving (bond &gt; rent). CGT applied at exit: primary residence gets R3M exclusion; investments get R50k annual exclusion and 40% inclusion rate. Agent commission of 2.5% applied to property sale.
        </span>
      </div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Projections are illustrative only. CGT based on SARS 2026/27. Returns are not guaranteed. Not financial advice — consult a CFP.
      </p>
    </div>
  );
}
