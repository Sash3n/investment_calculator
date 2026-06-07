import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, BarChart, Bar,
} from 'recharts';
import { Car, Trophy, Info } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { formatRand, formatRandShort } from '../utils/format';
import { calcPayment } from '../utils/mortgage';

// ─── Constants ──────────────────────────────────────────────────────────────

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
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

const VEHICLE_OPTIONS = [
  { value: '12', label: '12 months (1 year)' },
  { value: '24', label: '24 months (2 years)' },
  { value: '36', label: '36 months (3 years)' },
  { value: '48', label: '48 months (4 years)' },
  { value: '60', label: '60 months (5 years)' },
  { value: '72', label: '72 months (6 years)' },
];

const INVESTMENT_OPTIONS = [
  { value: 'ETF',      label: 'Broad Market ETF (~10% p.a.)' },
  { value: 'TFSA',     label: 'Tax-Free ETF (~10% p.a., no CGT)' },
  { value: 'MoneyMkt', label: 'Money Market (~8% p.a.)' },
  { value: 'Custom',   label: 'Custom rate' },
];

const DEFAULT_RETURNS: Record<string, number> = {
  ETF: 10,
  TFSA: 10,
  MoneyMkt: 8,
  Custom: 10,
};

// ─── Math helpers ────────────────────────────────────────────────────────────

interface CarScenario {
  loanAmount: number;
  balloonAmount: number;
  financedAmount: number;
  standardPayment: number;
  totalWithExtra: number;
  totalStandard: number;
  interestStandard: number;
  interestWithExtra: number;
  interestSaved: number;
  monthsSaved: number;
  monthsWithExtra: number;
}

function calcCarScenario(
  vehiclePrice: number,
  deposit: number,
  balloonPercent: number,
  interestRate: number,
  termMonths: number,
  extraPayment: number,
): CarScenario {
  const loanAmount    = Math.max(0, vehiclePrice - deposit);
  const balloonAmount = vehiclePrice * (balloonPercent / 100);
  const financedAmount = Math.max(0, loanAmount - balloonAmount);
  const termYears = termMonths / 12;

  const standardPayment = calcPayment(financedAmount, interestRate, termYears, 12);
  const r = interestRate / 100 / 12;

  // Simulate standard amortisation
  let bal = financedAmount;
  let intStd = 0;
  for (let m = 0; m < termMonths && bal > 0.01; m++) {
    const interest = bal * r;
    intStd += interest;
    const principal = Math.min(standardPayment - interest, bal);
    bal -= principal;
  }
  const totalStandard = standardPayment * termMonths + balloonAmount;
  const interestStandard = intStd;

  // Simulate with extra payment
  bal = financedAmount;
  let intExtra = 0;
  let monthsWithExtra = 0;
  for (let m = 0; m < termMonths && bal > 0.01; m++) {
    const interest = bal * r;
    intExtra += interest;
    const principal = Math.min(standardPayment + extraPayment - interest, bal);
    bal -= principal;
    monthsWithExtra++;
    if (bal <= 0.01) break;
  }
  const totalWithExtra = (standardPayment + extraPayment) * monthsWithExtra + balloonAmount;
  const interestWithExtra = intExtra;
  const interestSaved = Math.max(0, interestStandard - interestWithExtra);
  const monthsSaved = Math.max(0, termMonths - monthsWithExtra);

  return {
    loanAmount, balloonAmount, financedAmount,
    standardPayment, totalWithExtra, totalStandard,
    interestStandard, interestWithExtra, interestSaved,
    monthsSaved, monthsWithExtra,
  };
}

interface YearRow {
  year: string;
  interestSaved: number;
  investValue: number;
  winner: 'extra' | 'invest';
}

function buildYearByYear(
  scenario: CarScenario,
  extraPayment: number,
  expectedReturnPct: number,
  cgtRate: number,
  isTFSA: boolean,
  termMonths: number,
): YearRow[] {
  const r = expectedReturnPct / 100 / 12;
  const rows: YearRow[] = [];
  const maxMonths = termMonths;

  let intStd  = 0;
  let intExtra = 0;
  let balStd  = scenario.financedAmount;
  let balExtra = scenario.financedAmount;
  let portfolio = 0;
  const rLoan = scenario.financedAmount > 0 ? scenario.financedAmount * 0 : 0; // we track via scenario
  const loanR = (scenario.standardPayment > 0 && scenario.financedAmount > 0)
    ? (() => {
        // Back-calculate monthly rate from payment
        // We just use the passed interestRate / 100 / 12 via closure — approximation
        return 0;
      })()
    : 0;
  void loanR; void rLoan;

  // Re-derive monthly loan rate from scenario
  // We'll redo it here simply
  const interestRateGuess = scenario.interestStandard / (scenario.financedAmount * termMonths / 12 / 2);

  for (let m = 1; m <= maxMonths; m++) {
    // Standard loan interest this month
    const intThisMonthStd = balStd * interestRateGuess / 12;
    intStd += intThisMonthStd;
    const principalStd = Math.min(scenario.standardPayment - intThisMonthStd, balStd);
    balStd = Math.max(0, balStd - principalStd);

    // Extra payment loan interest this month
    const intThisMonthExtra = balExtra * interestRateGuess / 12;
    intExtra += intThisMonthExtra;
    const principalExtra = Math.min(scenario.standardPayment + extraPayment - intThisMonthExtra, balExtra);
    balExtra = Math.max(0, balExtra - principalExtra);

    // Investment portfolio grows
    portfolio = (portfolio + extraPayment) * (1 + r);

    if (m % 12 === 0 || m === maxMonths) {
      const interestSavedSoFar = Math.max(0, intStd - intExtra);
      const contributions = extraPayment * m;
      const gain = Math.max(0, portfolio - contributions);
      const tax = isTFSA ? 0 : gain * (cgtRate / 100);
      const investAfterTax = portfolio - tax;

      rows.push({
        year: `Yr ${Math.ceil(m / 12)}`,
        interestSaved: Math.round(interestSavedSoFar),
        investValue:   Math.round(Math.max(0, investAfterTax)),
        winner:        investAfterTax > interestSavedSoFar ? 'invest' : 'extra',
      });
    }
  }
  return rows;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CarExtraVsInvesting() {
  const [vehiclePrice,   setVehiclePrice]   = useState(450_000);
  const [deposit,        setDeposit]        = useState(45_000);
  const [balloonPercent, setBalloonPercent] = useState(0);
  const [interestRate,   setInterestRate]   = useState(11.5);
  const [termMonths,     setTermMonths]     = useState(60);
  const [extraPayment,   setExtraPayment]   = useState(1_500);
  const [vehicle,        setVehicle]        = useState('ETF');
  const [customReturn,   setCustomReturn]   = useState(10);
  const [cgtRate,        setCgtRate]        = useState(18); // ~45% marginal × 40% inclusion

  const expectedReturn = vehicle === 'Custom' ? customReturn : DEFAULT_RETURNS[vehicle];
  const isTFSA = vehicle === 'TFSA';

  const scenario = useMemo(
    () => calcCarScenario(vehiclePrice, deposit, balloonPercent, interestRate, termMonths, extraPayment),
    [vehiclePrice, deposit, balloonPercent, interestRate, termMonths, extraPayment]
  );

  const yearData = useMemo(
    () => buildYearByYear(scenario, extraPayment, expectedReturn, cgtRate, isTFSA, termMonths),
    [scenario, extraPayment, expectedReturn, cgtRate, isTFSA, termMonths]
  );

  // Final comparison at end of term
  const finalRow = yearData[yearData.length - 1];
  const winner = finalRow ? finalRow.winner : 'extra';
  const winnerAmount = finalRow ? Math.abs(finalRow.investValue - finalRow.interestSaved) : 0;

  // Investment portfolio value at term end
  const finalInvestValue   = finalRow?.investValue ?? 0;
  const finalInterestSaved = finalRow?.interestSaved ?? 0;

  const barData = [
    { label: 'Interest Saved\n(extra payment)', value: finalInterestSaved, color: C.indigo },
    { label: 'Portfolio Value\n(invest instead)', value: finalInvestValue, color: C.emerald },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)' }}>
            <Car size={20} className="text-[#EC4899]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Car: Extra Payment vs Investing
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Should you pay extra on your car loan, or invest that money instead?
            </p>
          </div>
        </div>
      </motion.div>

      {/* Winner banner */}
      {finalRow && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className="flex items-center gap-4 p-5 rounded-2xl"
          style={{
            background: winner === 'invest' ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)',
            border: `1px solid ${winner === 'invest' ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: winner === 'invest' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)' }}>
            <Trophy size={18} style={{ color: winner === 'invest' ? C.emerald : C.indigo }} />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold"
              style={{ color: winner === 'invest' ? C.emerald : C.indigo, fontFamily: 'var(--font-heading)' }}>
              {winner === 'invest'
                ? `Investing wins by ${formatRand(winnerAmount, 0)} over ${Math.round(termMonths / 12)} years`
                : `Paying extra wins by ${formatRand(winnerAmount, 0)} over ${Math.round(termMonths / 12)} years`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {winner === 'invest'
                ? `Your ${formatRand(extraPayment, 0)}/mo invested at ${expectedReturn}% p.a. grows to ${formatRand(finalInvestValue, 0)}, beating the ${formatRand(finalInterestSaved, 0)} interest saved on the car loan.`
                : `Paying ${formatRand(extraPayment, 0)}/mo extra saves ${formatRand(finalInterestSaved, 0)} in car interest — better than the ${formatRand(finalInvestValue, 0)} investment portfolio at ${expectedReturn}% p.a.`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Car loan */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Car Loan Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <InputField id="price" label="Vehicle Price" value={vehiclePrice}
              onChange={(v) => setVehiclePrice(parseFloat(v) || 0)} prefix="R" />
            <InputField id="dep" label="Deposit" value={deposit}
              onChange={(v) => setDeposit(parseFloat(v) || 0)} prefix="R" />
            <InputField id="rate" label="Interest Rate" value={interestRate}
              onChange={(v) => setInterestRate(parseFloat(v) || 0)} suffix="%" step={0.25} />
            <InputField id="balloon" label="Balloon" value={balloonPercent}
              onChange={(v) => setBalloonPercent(parseFloat(v) || 0)} suffix="%" step={5} min={0} max={50} />
          </div>
          <SelectField id="term" label="Loan Term" value={String(termMonths)}
            onChange={(v) => setTermMonths(parseInt(v))} options={VEHICLE_OPTIONS} />

          {/* Loan summary */}
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
            {[
              { label: 'Loan Amount',       value: formatRand(scenario.loanAmount, 0) },
              { label: 'Financed Amount',   value: formatRand(scenario.financedAmount, 0), note: balloonPercent > 0 ? `balloon: ${formatRand(scenario.balloonAmount, 0)}` : undefined },
              { label: 'Standard Payment',  value: `${formatRand(scenario.standardPayment, 0)}/mo` },
              { label: 'Total Interest',    value: formatRand(scenario.interestStandard, 0), color: C.red },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {r.label}{r.note && <span className="ml-1 text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>({r.note})</span>}
                </span>
                <span className="text-xs font-semibold" style={{ color: r.color ?? 'var(--color-text)' }}>{r.value}</span>
              </div>
            ))}
          </div>

          <InputField id="extra" label="Extra Monthly Payment" value={extraPayment}
            onChange={(v) => setExtraPayment(parseFloat(v) || 0)} prefix="R" step={500}
            help="Amount you could either pay extra on the car or invest each month" />

          {extraPayment > 0 && (
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
              {[
                { label: 'Interest Saved',  value: formatRand(scenario.interestSaved, 0),  color: C.emerald },
                { label: 'Months Saved',    value: `${scenario.monthsSaved} months`,        color: C.indigo },
                { label: 'Paid off in',     value: `${scenario.monthsWithExtra} months`,    color: 'var(--color-text)' },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.label}</span>
                  <span className="text-xs font-bold" style={{ color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Investment */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Investment Scenario
          </p>
          <SelectField id="vehicle" label="Investment Vehicle" value={vehicle}
            onChange={setVehicle} options={INVESTMENT_OPTIONS} />
          {vehicle === 'Custom' && (
            <InputField id="return" label="Expected Annual Return" value={customReturn}
              onChange={(v) => setCustomReturn(parseFloat(v) || 0)} suffix="% p.a." step={0.5} />
          )}
          {!isTFSA && (
            <InputField id="cgt" label="Effective CGT Rate" value={cgtRate}
              onChange={(v) => setCgtRate(parseFloat(v) || 0)} suffix="%" step={1}
              help="SA: 40% inclusion × your marginal rate. ~18% for 45% bracket." />
          )}
          {isTFSA && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--color-text-muted)' }}>
              <Info size={13} style={{ color: C.emerald, flexShrink: 0, marginTop: 1 }} />
              TFSA contributions are after-tax and grow tax-free — no CGT or dividend tax. Subject to R36,000/yr and R500,000 lifetime limits.
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { label: 'Rate on Car Loan',    value: `${interestRate}%`,              color: C.red,     sub: 'guaranteed "return" from paying extra' },
              { label: 'Expected Investment', value: `${expectedReturn}%`,             color: C.emerald, sub: isTFSA ? 'tax-free' : `after ~${cgtRate}% CGT` },
              { label: 'Interest Saved',      value: formatRand(scenario.interestSaved, 0), color: C.indigo, sub: 'if paying extra' },
              { label: 'Portfolio at Term',   value: formatRand(finalInvestValue, 0), color: C.amber,   sub: 'if investing instead' },
            ].map((kpi) => (
              <div key={kpi.label} className="glass-card-static p-3 rounded-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--color-text-subtle)' }}>{kpi.label}</p>
                <p className="text-sm font-bold" style={{ color: kpi.color, fontFamily: 'var(--font-heading)' }}>{kpi.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{kpi.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bar comparison */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Final Outcome at End of Term
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Both options use the same {formatRand(extraPayment, 0)}/month over {Math.round(termMonths / 12)} years
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
              {barData.map((entry, i) => (
                <rect key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Year-by-year chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Year-by-Year Comparison
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Interest saved (extra payment) vs portfolio value (investing) — where they cross, the winner switches
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={yearData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }}
              formatter={(v, name) => [formatRand(Number(v), 0), name]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Line type="monotone" dataKey="interestSaved" name="Interest Saved (pay extra)"
              stroke={C.indigo} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="investValue" name="Portfolio Value (invest)"
              stroke={C.emerald} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Year-by-year table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-3"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Detailed Year-by-Year Breakdown
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Year', 'Interest Saved', 'Portfolio Value', 'Difference', 'Leading'].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yearData.map((row, i) => {
                const diff = row.investValue - row.interestSaved;
                return (
                  <tr key={row.year} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    <td className="py-2 px-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>{row.year}</td>
                    <td className="py-2 px-3" style={{ color: C.indigo }}>{formatRand(row.interestSaved, 0)}</td>
                    <td className="py-2 px-3" style={{ color: C.emerald }}>{formatRand(row.investValue, 0)}</td>
                    <td className="py-2 px-3" style={{ color: diff > 0 ? C.emerald : C.indigo }}>
                      {diff > 0 ? '+' : ''}{formatRand(diff, 0)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: row.winner === 'invest' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
                          color: row.winner === 'invest' ? C.emerald : C.indigo,
                        }}>
                        {row.winner === 'invest' ? 'Investing' : 'Pay Extra'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Investment returns are not guaranteed. Car interest savings are deterministic. Past performance does not predict future returns. Not financial advice.
      </p>
    </div>
  );
}
