import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from 'recharts';
import { Car, Trophy, Info } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { formatRand, formatRandShort } from '../utils/format';
import { calcCarScenario, buildCarComparison } from '../utils/carExtraVsInvesting';
import { textTone } from '../utils/color';

// ─── Constants ──────────────────────────────────────────────────────────────

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
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
    () => buildCarComparison(scenario, extraPayment, interestRate, expectedReturn, cgtRate, isTFSA, termMonths),
    [scenario, extraPayment, interestRate, expectedReturn, cgtRate, isTFSA, termMonths]
  );

  // Final comparison at end of term
  const finalRow = yearData[yearData.length - 1];
  const winner = finalRow ? finalRow.winner : 'extra';
  const winnerAmount = finalRow ? Math.abs(finalRow.difference) : 0;

  // Investment portfolio value at term end
  const finalInvestValue   = finalRow?.investValue ?? 0;
  const finalBondRouteValue = finalRow?.bondRouteValue ?? 0;

  const barData = [
    { label: 'Pay extra, then invest', value: finalBondRouteValue, color: C.blue },
    { label: 'Invest instead', value: finalInvestValue, color: C.green },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--note-red) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-red) 25%, transparent)' }}>
            <Car size={20} className="text-note-red-ink" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Car: Extra Payment vs Investing
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
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
            background: winner === 'invest' ? 'color-mix(in srgb, var(--gain) 8%, transparent)' : 'color-mix(in srgb, var(--note-blue) 8%, transparent)',
            border: `1px solid ${winner === 'invest' ? 'color-mix(in srgb, var(--gain) 30%, transparent)' : 'color-mix(in srgb, var(--note-blue) 30%, transparent)'}`,
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: winner === 'invest' ? 'color-mix(in srgb, var(--gain) 15%, transparent)' : 'color-mix(in srgb, var(--note-blue) 15%, transparent)' }}>
            <Trophy size={18} style={{ color: textTone(winner === 'invest' ? C.green : C.blue) }} />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold"
              style={{ color: textTone(winner === 'invest' ? C.green : C.blue), fontFamily: 'var(--font-display)' }}>
              {winner === 'invest'
                ? `Investing wins by ${formatRand(winnerAmount, 0)} over ${Math.round(termMonths / 12)} years`
                : `Paying extra wins by ${formatRand(winnerAmount, 0)} over ${Math.round(termMonths / 12)} years`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              {winner === 'invest'
                ? `Investing ${formatRand(extraPayment, 0)}/mo at ${expectedReturn}% a year grows to ${formatRand(finalInvestValue, 0)}, more than the ${formatRand(finalBondRouteValue, 0)} you would build by paying the car off early and then investing the instalment.`
                : `Paying ${formatRand(extraPayment, 0)}/mo extra saves ${formatRand(scenario.interestSaved, 0)} in interest. Investing the instalment once the car is paid off builds ${formatRand(finalBondRouteValue, 0)}, more than the ${formatRand(finalInvestValue, 0)} from investing the extra now.`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Car loan */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
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
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'color-mix(in srgb, var(--note-blue) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 15%, transparent)' }}>
            {[
              { label: 'Loan Amount',       value: formatRand(scenario.loanAmount, 0) },
              { label: 'Financed Amount',   value: formatRand(scenario.financedAmount, 0), note: balloonPercent > 0 ? `balloon: ${formatRand(scenario.balloonAmount, 0)}` : undefined },
              { label: 'Standard Payment',  value: `${formatRand(scenario.standardPayment, 0)}/mo` },
              { label: 'Total Interest',    value: formatRand(scenario.interestStandard, 0), color: C.red },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                  {r.label}{r.note && <span className="ml-1 text-[10px]" style={{ color: 'var(--ink-subtle)' }}>({r.note})</span>}
                </span>
                <span className="text-xs font-semibold" style={{ color: textTone(r.color ?? 'var(--ink)') }}>{r.value}</span>
              </div>
            ))}
          </div>

          <InputField id="extra" label="Extra Monthly Payment" value={extraPayment}
            onChange={(v) => setExtraPayment(parseFloat(v) || 0)} prefix="R" step={500}
            help="Amount you could either pay extra on the car or invest each month" />

          {extraPayment > 0 && (
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'color-mix(in srgb, var(--note-blue) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 10%, transparent)' }}>
              {[
                { label: 'Interest Saved',  value: formatRand(scenario.interestSaved, 0),  color: C.green },
                { label: 'Months Saved',    value: `${scenario.monthsSaved} months`,        color: C.blue },
                { label: 'Paid off in',     value: `${scenario.monthsWithExtra} months`,    color: 'var(--ink)' },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{r.label}</span>
                  <span className="text-xs font-bold" style={{ color: textTone(r.color) }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Investment */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
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
              style={{ background: 'color-mix(in srgb, var(--gain) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 20%, transparent)', color: 'var(--ink-muted)' }}>
              <Info size={13} style={{ color: textTone(C.green), flexShrink: 0, marginTop: 1 }} />
              TFSA contributions are after-tax and grow tax-free — no CGT or dividend tax. Subject to R46,000/yr and R500,000 lifetime limits.
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { label: 'Rate on Car Loan',    value: `${interestRate}%`,              color: C.red,     sub: 'guaranteed "return" from paying extra' },
              { label: 'Expected Investment', value: `${expectedReturn}%`,             color: C.green, sub: isTFSA ? 'tax-free' : `after ~${cgtRate}% CGT` },
              { label: 'Interest Saved',      value: formatRand(scenario.interestSaved, 0), color: C.blue, sub: 'if paying extra' },
              { label: 'Portfolio at Term',   value: formatRand(finalInvestValue, 0), color: C.orange,   sub: 'if investing instead' },
              { label: 'Pay Extra, Then Invest', value: formatRand(finalBondRouteValue, 0), color: C.blue, sub: 'invested after payoff' },
              { label: 'Difference', value: formatRand(winnerAmount, 0), color: winner === 'invest' ? C.green : C.blue, sub: winner === 'invest' ? 'in favour of investing' : 'in favour of paying extra' },
            ].map((kpi) => (
              <div key={kpi.label} className="glass-card-static p-3 rounded-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--ink-subtle)' }}>{kpi.label}</p>
                <p className="text-sm font-bold" style={{ color: textTone(kpi.color), fontFamily: 'var(--font-display)' }}>{kpi.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-subtle)' }}>{kpi.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bar comparison */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Final Outcome at End of Term
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
          Both routes spend the same each month for {Math.round(termMonths / 12)} years; paying extra invests the instalment once the car is paid off
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Year-by-year chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Year-by-Year Comparison
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
          Investments in each route, after CGT. Paying extra only starts investing once the car is paid off.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={yearData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }}
              formatter={(v, name) => [formatRand(Number(v), 0), name]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
            <ReferenceLine y={0} stroke="color-mix(in srgb, var(--ink) 10%, transparent)" />
            <Line type="monotone" dataKey="bondRouteValue" name="Pay extra, then invest"
              stroke={C.blue} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="investValue" name="Invest instead"
              stroke={C.green} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Year-by-year table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-3"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Detailed Year-by-Year Breakdown
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink) 8%, transparent)' }}>
                {['Year', 'Interest Saved', 'Pay Extra, Then Invest', 'Invest Instead', 'Difference', 'Leading'].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-semibold"
                    style={{ color: 'var(--ink-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yearData.map((row, i) => {
                const diff = row.difference;
                return (
                  <tr key={row.year} style={{
                    borderBottom: '1px solid color-mix(in srgb, var(--ink) 4%, transparent)',
                    background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--ink) 1.5%, transparent)',
                  }}>
                    <td className="py-2 px-3 font-semibold" style={{ color: 'var(--ink-muted)' }}>{row.year}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--ink-muted)' }}>{formatRand(row.interestSaved, 0)}</td>
                    <td className="py-2 px-3" style={{ color: textTone(C.blue) }}>{formatRand(row.bondRouteValue, 0)}</td>
                    <td className="py-2 px-3" style={{ color: textTone(C.green) }}>{formatRand(row.investValue, 0)}</td>
                    <td className="py-2 px-3" style={{ color: textTone(diff > 0 ? C.green : C.blue) }}>
                      {diff > 0 ? '+' : ''}{formatRand(diff, 0)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: row.winner === 'invest' ? 'color-mix(in srgb, var(--gain) 12%, transparent)' : 'color-mix(in srgb, var(--note-blue) 12%, transparent)',
                          color: textTone(row.winner === 'invest' ? C.green : C.blue),
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

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--ink-subtle)' }}>
        Investment returns are not guaranteed. Car interest savings are deterministic. Past performance does not predict future returns. Not financial advice.
      </p>
    </div>
  );
}
