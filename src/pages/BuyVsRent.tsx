import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { Home, Key, TrendingUp, Scale } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { ResultPanel } from '../components/results/ResultPanel';
import { BreakdownList } from '../components/results/BreakdownList';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { buyVsRentInputErrors } from '../utils/validation';
import { formatRand, formatRandShort } from '../utils/format';
import { calcPayment } from '../utils/mortgage';
import { calcTransferDuty, calcBondRegistrationCost, calcIncomeTax } from '../utils/tax';
import { textTone } from '../utils/color';

// ── SARS 2026/27 ──────────────────────────────────────────────────────────────
const CGT_INCLUSION    = 0.40;
const CGT_EXCLUSION    = 50_000;
const PRIMARY_EXCL     = 3_000_000; // primary residence CGT exclusion

const C = {
  blue:  'var(--note-blue)',
  orange:   'var(--note-orange)',
  green: 'var(--gain)',
  red:     'var(--loss)',
  teal:    'var(--note-teal)',
};

const TOOLTIP_STYLE = {
  background:   'color-mix(in srgb, var(--paper-raised) 95%, transparent)',
  border:       '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
  borderRadius: 10,
  fontSize:     12,
  color:        'var(--ink)',
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
  const margin   = Math.abs(last?.advantage ?? 0);

  const errors  = buyVsRentInputErrors(inp);
  const blocked = errors.purchasePrice ?? errors.depositPercent ?? errors.interestRatePercent ?? errors.loanTermYears ?? errors.monthlyRent;
  const breakEvenText = buyWins
    ? (breakEvenYear ?? 1) <= 1 ? 'Buying is ahead from the first year.' : `Buying pulls ahead in year ${breakEvenYear}.`
    : breakEvenYear
      ? `Buying is ahead for a time from year ${breakEvenYear}, but renting is ahead again by year ${inp.yearsToCompare}.`
      : `Renting stays ahead for all ${inp.yearsToCompare} years.`;

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
            style={{ background: 'color-mix(in srgb, var(--gain) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 25%, transparent)' }}>
            <Scale size={20} className="text-gain-ink" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Buy vs Rent Calculator
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              True cost comparison · Net wealth at exit · Break-even year · SARS 2026/27 CGT
            </p>
          </div>
        </div>
      </motion.div>

      <ResultPanel
        label={blocked ? 'Buying or renting' : `After ${inp.yearsToCompare} years, ${buyWins ? 'buying' : 'renting'} comes out ahead by`}
        value={formatRand(margin, 0)}
        blocked={blocked}
        summary={<>
          If you {buyWins ? 'buy' : 'rent and invest the difference'}, you would have about {formatRandShort(margin)} more
          after {inp.yearsToCompare} years than if you {buyWins ? 'rent and invest the difference' : 'buy'}. {breakEvenText}
        </>}
        figures={[
          { label: 'Net wealth if you buy', value: formatRand(last?.netWealthBuy ?? 0, 0) },
          { label: 'Net wealth if you rent', value: formatRand(last?.netWealthRent ?? 0, 0) },
          { label: 'Bond repayment', value: `${formatRand(monthlyPmt, 0)}/mo` },
          { label: 'Rent in year one', value: `${formatRand(inp.monthlyRent, 0)}/mo` },
        ]}
      />

      {!blocked && (
        <div className="grid gap-5 lg:grid-cols-2">
          <BreakdownList
            title="Cash on transfer day if you buy"
            lines={[
              { label: `Deposit (${inp.depositPercent}%)`, value: deposit },
              { label: 'Transfer duty', value: transferDuty },
              { label: 'Bond registration', value: bondReg },
              { label: 'Initiation fee', value: initiationFeeCash, note: inp.initiationFeeCapitalised ? 'Added to the bond instead' : undefined },
            ]}
            total={{ label: 'Total cash needed', value: totalUpfront, note: 'If you rent, this is invested instead' }}
          />
          <BreakdownList
            title="Each month in year one"
            lines={[
              { label: 'Bond repayment', value: monthlyPmt },
              { label: 'Rent', value: inp.monthlyRent, kind: 'less' },
            ]}
            total={monthlySaving > 0
              ? { label: 'Bond costs more by', value: monthlySaving, note: 'If you rent, this is invested each month' }
              : { label: 'Rent costs more by', value: Math.abs(monthlySaving), note: 'Nothing extra is invested while rent costs more' }}
          />
        </div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Buying */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--gain) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 25%, transparent)' }}>
              <Home size={14} className="text-gain-ink" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Buying
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="purchasePrice" label="Purchase Price" value={inp.purchasePrice} error={errors.purchasePrice}
              onChange={n((v) => ({ purchasePrice: v }))} prefix="R" />
            <InputField id="deposit" label="Deposit" value={inp.depositPercent} error={errors.depositPercent}
              onChange={n((v) => ({ depositPercent: v }))} suffix="%" step={1} />
            <InputField id="rate" label="Interest Rate" value={inp.interestRatePercent} error={errors.interestRatePercent}
              onChange={n((v) => ({ interestRatePercent: v }))} suffix="%" step={0.25} />
            <InputField id="term" label="Loan Term" value={inp.loanTermYears} error={errors.loanTermYears}
              onChange={n((v) => ({ loanTermYears: v }))} suffix="yrs" />
            <InputField id="rates" label="Monthly Rates" value={inp.monthlyRates} error={errors.monthlyRates}
              onChange={n((v) => ({ monthlyRates: v }))} prefix="R" />
            <InputField id="levies" label="Monthly Levies" value={inp.monthlyLevies} error={errors.monthlyLevies}
              onChange={n((v) => ({ monthlyLevies: v }))} prefix="R" />
            <InputField id="insurance" label="Monthly Insurance" value={inp.monthlyInsurance} error={errors.monthlyInsurance}
              onChange={n((v) => ({ monthlyInsurance: v }))} prefix="R" />
            <InputField id="maintenance" label="Maintenance" value={inp.maintenancePercent} error={errors.maintenancePercent}
              onChange={n((v) => ({ maintenancePercent: v }))} suffix="% p.a."
              help="% of property value" step={0.25} />
            <InputField id="propGrowth" label="Property Growth" value={inp.propertyGrowthPercent} error={errors.propertyGrowthPercent}
              onChange={n((v) => ({ propertyGrowthPercent: v }))} suffix="% p.a." step={0.5} />
            <InputField id="otherIncome" label="Other Annual Income" value={inp.otherAnnualIncome} error={errors.otherAnnualIncome}
              onChange={n((v) => ({ otherAnnualIncome: v }))} prefix="R"
              help="Sets CGT marginal rate" />
            <InputField id="initiationFee" label="Initiation Fee" value={inp.initiationFee} error={errors.initiationFee}
              onChange={n((v) => ({ initiationFee: v }))} prefix="R"
              help="Bank-charged bond initiation fee" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs mt-1"
            style={{ color: 'var(--ink-muted)' }}>
            <input type="checkbox" checked={inp.isPrimaryResidence}
              onChange={(e) => setInp((p) => ({ ...p, isPrimaryResidence: e.target.checked }))}
              className="w-3.5 h-3.5 rounded accent-note-blue" />
            Primary residence (R3M CGT exclusion)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs"
            style={{ color: 'var(--ink-muted)' }}>
            <input type="checkbox" checked={inp.initiationFeeCapitalised}
              onChange={(e) => setInp((p) => ({ ...p, initiationFeeCapitalised: e.target.checked }))}
              className="w-3.5 h-3.5 rounded accent-note-blue" />
            Initiation fee capitalised (add to loan instead of cash)
          </label>
        </div>

        {/* Renting */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 25%, transparent)' }}>
              <Key size={14} className="text-note-blue-ink" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Renting
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <InputField id="monthlyRent" label="Monthly Rent" value={inp.monthlyRent} error={errors.monthlyRent}
              onChange={n((v) => ({ monthlyRent: v }))} prefix="R" />
            <InputField id="rentEsc" label="Annual Rent Escalation" value={inp.annualRentEscalation} error={errors.annualRentEscalation}
              onChange={n((v) => ({ annualRentEscalation: v }))} suffix="%" step={0.5} />
          </div>
          <div className="mt-2 p-3 rounded-xl text-xs"
            style={{ background: 'color-mix(in srgb, var(--note-blue) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 18%, transparent)' }}>
            <p className="font-semibold mb-1" style={{ color: textTone(C.blue) }}>Renter invests:</p>
            <ul className="space-y-1" style={{ color: 'var(--ink-muted)' }}>
              <li>• Deposit + transfer duty + bond reg + initiation fee upfront ({formatRand(totalUpfront, 0)})</li>
              <li>• Monthly saving if bond &gt; rent ({formatRand(Math.max(0, monthlySaving), 0)}/mo)</li>
            </ul>
          </div>
        </div>

        {/* Shared */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--note-orange) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-orange) 25%, transparent)' }}>
              <TrendingUp size={14} className="text-note-orange-ink" />
            </div>
            <p className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Investment &amp; Period
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <InputField id="investReturn" label="Investment Return (Renter)" value={inp.investmentReturnPercent} error={errors.investmentReturnPercent}
              onChange={n((v) => ({ investmentReturnPercent: v }))} suffix="% p.a." step={0.5}
              help="ETF / unit trust return assumption" />
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
                Comparison Period
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15, 20, 25, 30].map((y) => (
                  <button key={y}
                    onClick={() => setInp((p) => ({ ...p, yearsToCompare: y }))}
                    className="py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: inp.yearsToCompare === y ? 'color-mix(in srgb, var(--note-orange) 20%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                      border: `1px solid ${inp.yearsToCompare === y ? 'color-mix(in srgb, var(--note-orange) 40%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                      color: textTone(inp.yearsToCompare === y ? C.orange : 'var(--ink-muted)'),
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Net wealth trajectories */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Net Wealth: Buy vs Rent + Invest
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            Buying: property equity after CGT &amp; sale costs minus sunk costs. Renting: investment portfolio after CGT minus total rent paid.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBuy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradRent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                formatter={(v, name) => [formatRand(Number(v), 0), name === 'buying' ? 'Buy (net)' : name === 'renting' ? 'Rent + Invest (net)' : 'Property Equity']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
              {breakEvenYear && (
                <ReferenceLine x={`Y${breakEvenYear}`} stroke={C.orange} strokeDasharray="4 2"
                  label={{ value: `Break-even Y${breakEvenYear}`, fontSize: 10, fill: C.orange, position: 'top' }} />
              )}
              <Area type="monotone" dataKey="buying"  name="Buying"
                stroke={C.green} fill="url(#gradBuy)"  strokeWidth={2} />
              <Area type="monotone" dataKey="renting" name="Renting + Investing"
                stroke={C.blue}  fill="url(#gradRent)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Annual cost comparison */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-1"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Annual Running Cost
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            Buying: bond repayment + rates + levies + insurance + maintenance. Renting: rent (escalating).
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costChart} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
                formatter={(v, name) => [formatRand(Number(v), 0), name === 'buy' ? 'Buying (total cost)' : 'Rent paid']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
              <Bar dataKey="buy"  name="Buying" fill={C.green} radius={[3, 3, 0, 0]} />
              <Bar dataKey="rent" name="Renting" fill={C.blue}  radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-year table */}
      <div className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-4"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Year-by-Year Comparison
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[780px]">
            <thead>
              <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink) 8%, transparent)' }}>
                {['Year', 'Property Value', 'Equity', 'Buy Net Wealth', 'Monthly Rent', 'Portfolio', 'Rent Net Wealth', 'Advantage'].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--ink-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const buyAhead     = r.advantage >= 0;
                const isBreakEven  = r.year === breakEvenYear;
                return (
                  <tr key={r.year} style={{
                    borderBottom: '1px solid color-mix(in srgb, var(--ink) 4%, transparent)',
                    background: isBreakEven
                      ? 'color-mix(in srgb, var(--note-orange) 6%, transparent)'
                      : i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--ink) 1.5%, transparent)',
                  }}>
                    <td className="py-2 px-3 font-bold" style={{ color: textTone(isBreakEven ? C.orange : 'var(--note-blue)') }}>
                      Y{r.year}{isBreakEven ? ' ⚡' : ''}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--ink)' }}>
                      {formatRand(r.propertyValue, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: textTone(C.green) }}>
                      {formatRand(r.equity, 0)}
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: textTone(buyAhead ? C.green : 'var(--ink-muted)') }}>
                      {formatRand(r.netWealthBuy, 0)}
                    </td>
                    <td className="py-2 px-3" style={{ color: 'var(--ink-muted)' }}>
                      {formatRand(r.monthlyRentYear, 0)}/mo
                    </td>
                    <td className="py-2 px-3" style={{ color: textTone(C.teal) }}>
                      {formatRand(r.investPortfolio, 0)}
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: textTone(!buyAhead ? C.blue : 'var(--ink-muted)') }}>
                      {formatRand(r.netWealthRent, 0)}
                    </td>
                    <td className="py-2 px-3 font-bold"
                      style={{ color: textTone(buyAhead ? C.green : C.blue) }}>
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
        <p className="text-[10px] mt-2" style={{ color: 'var(--ink-subtle)' }}>
          ⚡ = break-even year · Net wealth = equity or portfolio after CGT &amp; costs, minus all sunk costs · Advantage is buying minus renting net wealth
        </p>
      </div>

      <AssumptionsDrawer
        items={[
          <>The interest rate stays at {inp.interestRatePercent}% for the whole {inp.loanTermYears}-year bond, the home grows in value by {inp.propertyGrowthPercent}% a year and rent goes up by {inp.annualRentEscalation}% a year.</>,
          <>The renter invests the cash a buyer would spend on transfer day, plus the difference in any month the bond costs more than the rent, and earns {inp.investmentReturnPercent}% a year. Returns are not guaranteed.</>,
          <>The buyer’s costs are interest, rates, levies, insurance and maintenance ({inp.maintenancePercent}% of the home’s value a year). Repaying the bond builds equity, so it is not counted as a cost.</>,
          <>Net wealth is what each side has after selling up in year {inp.yearsToCompare}, less the money spent along the way that does not come back. The sale of the home pays 2.5% agent’s commission.</>,
          <>Capital gains tax uses the SARS 2026/27 rules: a R50,000 yearly exclusion and 40% inclusion{inp.isPrimaryResidence ? ', and the first R3 million of gain on a primary residence is tax-free' : ''}. Your other income of {formatRand(inp.otherAnnualIncome, 0)} a year sets the tax rate.</>,
          <>Not included: tax on dividends and interest along the way, moving costs and inflation. All figures are in future rands.</>,
        ]}
      />
    </div>
  );
}
