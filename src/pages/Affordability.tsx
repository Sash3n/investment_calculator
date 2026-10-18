import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  Wallet, Home as HomeIcon, TrendingDown, CheckCircle2, XCircle, Info, BookOpen, Receipt, Coins,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';
import { calcAffordability, type AffordabilityInputs } from '../utils/affordability';
import { usePrimeRate } from '../hooks/usePrimeRate';
import { alpha, seriesColors, textTone } from '../utils/color';
import { useJourneyValues } from '../journeys/journeyContext';

const C = {
  blue: 'var(--note-blue)', orange: 'var(--note-orange)', green: 'var(--gain)',
  red: 'var(--loss)', teal: 'var(--note-teal)', brown: 'var(--note-brown)',
};
const PIE_COLORS = seriesColors(4);

function RandTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ minWidth: 160 }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: textTone(p.fill ?? C.blue) }}>{p.name}: {formatRand(p.value, 0)}</p>
      ))}
    </div>
  );
}

export function Affordability() {
  const liveRate = usePrimeRate();
  const [inputs, setInputs] = useState<AffordabilityInputs>({
    grossMonthlyIncome: 45000,
    existingMonthlyDebt: 6000,
    depositAvailable: 150000,
    interestRate: 11.0,
    termYears: 20,
    instalmentRatio: 30,
    dtiRatio: 36,
    stressDelta: 2,
    desiredPropertyPrice: 1800000,
  });

  // Seed interest rate from live prime once it loads (only if still at default).
  const [rateTouched, setRateTouched] = useState(false);
  useEffect(() => {
    if (!liveRate.loading && !rateTouched) {
      setInputs((p) => ({ ...p, interestRate: liveRate.primeRate }));
    }
  }, [liveRate.loading, liveRate.primeRate, rateTouched]);

  // Load preset/snapshot inputs navigated in via router state (e.g. Home scenario presets)
  const location = useLocation();
  const locationState = location.state as { loadedInputs?: AffordabilityInputs } | null;
  useEffect(() => {
    if (locationState?.loadedInputs) {
      setInputs(locationState.loadedInputs);
      setRateTouched(true);
    }
  }, [locationState]);

  const result = useMemo(() => calcAffordability(inputs), [inputs]);

  // Hand the price (the one you want, or the most you qualify for) to the next journey step
  useJourneyValues({
    price: inputs.desiredPropertyPrice > 0 ? inputs.desiredPropertyPrice : result.maxPropertyPrice,
    deposit: inputs.depositAvailable,
    rate: inputs.interestRate,
    term: inputs.termYears,
  });

  const set = (fn: (v: number) => Partial<AffordabilityInputs>) => (val: string) =>
    setInputs((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const affordChart = [
    { name: 'At Current Rate', loan: Math.round(result.maxLoan), price: Math.round(result.maxPropertyPrice) },
    { name: `At +${inputs.stressDelta}% Rate`, loan: Math.round(result.stressMaxLoan), price: Math.round(result.stressMaxPropertyPrice) },
  ];

  const incomeBreakdown = [
    { name: 'Max Bond Repayment', value: Math.round(result.maxInstalment) },
    { name: 'Existing Debt', value: Math.round(inputs.existingMonthlyDebt) },
    { name: 'Remaining Income', value: Math.max(0, Math.round(inputs.grossMonthlyIncome - result.maxInstalment - inputs.existingMonthlyDebt)) },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Bond Affordability Qualifier
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              How much home loan can you qualify for? Based on SA bank affordability rules
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: 'color-mix(in srgb, var(--note-blue) 12%, transparent)', color: textTone(C.blue), border: `1px solid ${alpha(C.blue, 27)}` }}>
            Prime: {liveRate.loading ? '…' : `${liveRate.primeRate}%`}
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        {/* Inputs */}
        <div className="glass-card p-5 space-y-4">
          <SectionHeader title="Your Finances" icon={Wallet} />
          <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'color-mix(in srgb, var(--note-blue) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--note-blue) 20%, transparent)' }}>
            <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: textTone(C.blue) }} />
            <span style={{ color: 'var(--ink-muted)' }}>Use gross (before-tax) income. Banks assess affordability on gross salary, then verify net via bank statements.</span>
          </div>

          <InputField label="Gross Monthly Income" id="a-income" value={inputs.grossMonthlyIncome} onChange={set((v) => ({ grossMonthlyIncome: v }))} prefix="R" help="Total before tax — include all regular income" />
          <InputField label="Existing Monthly Debt" id="a-debt" value={inputs.existingMonthlyDebt} onChange={set((v) => ({ existingMonthlyDebt: v }))} prefix="R" help="Car, credit cards, personal & student loans" />
          <InputField label="Deposit Available" id="a-deposit" value={inputs.depositAvailable} onChange={set((v) => ({ depositAvailable: v }))} prefix="R" help="Cash you can put down upfront" />
          <InputField label="Interest Rate" id="a-rate" value={inputs.interestRate} onChange={(val) => { setRateTouched(true); setInputs((p) => ({ ...p, interestRate: parseFloat(val) || 0 })); }} suffix="%" help="Defaults to live prime — banks may offer prime ± a margin" />
          <SelectField label="Bond Term" id="a-term" value={inputs.termYears} onChange={(v) => setInputs((p) => ({ ...p, termYears: parseInt(v) }))} options={[{ value: 20, label: '20 years' }, { value: 25, label: '25 years' }, { value: 30, label: '30 years' }]} />

          <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--rule)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>Affordability Rules</p>
            <InputField label="Instalment-to-Income Limit" id="a-inst" value={inputs.instalmentRatio} onChange={set((v) => ({ instalmentRatio: v }))} suffix="%" help="Bond repayment as % of gross income (banks use ~30%)" />
            <InputField label="Total Debt-to-Income Limit" id="a-dti" value={inputs.dtiRatio} onChange={set((v) => ({ dtiRatio: v }))} suffix="%" help="All debt repayments as % of gross (NCA ~36%)" />
            <InputField label="Stress Test Rate Increase" id="a-stress" value={inputs.stressDelta} onChange={set((v) => ({ stressDelta: v }))} suffix="%" help="Tests affordability if rates rise" />
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--rule)' }}>
            <InputField label="Target Property Price (optional)" id="a-target" value={inputs.desiredPropertyPrice} onChange={set((v) => ({ desiredPropertyPrice: v }))} prefix="R" help="Check if you qualify for a specific home" />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-5">
          {/* Headline cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Max Bond Repayment" value={formatRandShort(result.maxInstalment)} sub={`Limited by ${result.limitedBy === 'dti' ? 'total debt' : 'income'}`} icon={Wallet} color="blue" delay={0} />
            <StatCard label="Max Home Loan" value={formatRandShort(result.maxLoan)} sub={`Over ${inputs.termYears} years`} icon={HomeIcon} color="green" delay={0.05} />
            <StatCard label="Max Property Price" value={formatRandShort(result.maxPropertyPrice)} sub="Loan + your deposit" icon={Coins} color="orange" delay={0.1} />
            <StatCard label="Cash Needed" value={formatRandShort(result.totalCashRequired)} sub="Deposit + duty + bond costs" icon={Receipt} color="red" delay={0.15} />
          </div>

          {/* Target assessment */}
          {result.desired && (
            <div
              className="p-4 rounded-xl flex items-start gap-4"
              style={{
                background: result.desired.qualifies ? 'color-mix(in srgb, var(--gain) 8%, transparent)' : 'color-mix(in srgb, var(--loss) 8%, transparent)',
                border: `1px solid ${alpha(result.desired.qualifies ? C.green : C.red, 27)}`,
              }}
            >
              {result.desired.qualifies ? <CheckCircle2 size={24} color={C.green} className="flex-shrink-0 mt-0.5" /> : <XCircle size={24} color={C.red} className="flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="font-semibold" style={{ color: textTone(result.desired.qualifies ? C.green : C.red), fontFamily: 'var(--font-display)' }}>
                  {result.desired.qualifies
                    ? `You likely qualify for a ${formatRand(result.desired.price, 0)} home`
                    : `${formatRand(result.desired.price, 0)} is above your current qualifying range`}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>
                  Requires a {formatRand(result.desired.requiredInstalment, 0)}/mo bond repayment.
                  {result.desired.qualifies
                    ? ` That's within your ${formatRand(result.maxInstalment, 0)} ceiling.`
                    : ` That's ${formatRand(result.desired.monthlyShortfall, 0)}/mo above your ceiling — you'd need gross income of about ${formatRand(result.desired.requiredGrossIncome, 0)}/mo (or a bigger deposit / less existing debt).`}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-subtle)' }}>
                  Estimated cash needed: {formatRand(result.desired.totalCashRequired, 0)} (incl. {formatRand(result.desired.transferDuty, 0)} transfer duty).
                </p>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Affordability vs Rate Stress</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={affordChart} margin={{ left: 8, right: 16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => `R${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                  <Bar dataKey="loan" name="Max Loan" radius={[3, 3, 0, 0]}>
                    {affordChart.map((_, i) => <Cell key={i} fill={i === 0 ? C.green : C.orange} />)}
                  </Bar>
                  <Bar dataKey="price" name="Max Price" radius={[3, 3, 0, 0]}>
                    {affordChart.map((_, i) => <Cell key={i} fill={i === 0 ? C.blue : C.brown} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--ink-subtle)' }}>
                <TrendingDown size={11} style={{ color: textTone(C.red) }} />
                At {formatPercent(result.stressRate, 2)}, your max loan drops to {formatRandShort(result.stressMaxLoan)} — a {formatRandShort(result.maxLoan - result.stressMaxLoan)} reduction.
              </p>
            </div>

            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Income Allocation</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={incomeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                    {incomeBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Qualification Breakdown</p>
            <table className="w-full text-xs">
              <tbody>
                {[
                  { label: 'Gross Monthly Income', value: inputs.grossMonthlyIncome, bold: false },
                  { label: `Instalment Allowance (${formatPercent(inputs.instalmentRatio, 0)} of income)`, value: (inputs.instalmentRatio / 100) * inputs.grossMonthlyIncome, bold: false },
                  { label: `Debt Allowance (${formatPercent(inputs.dtiRatio, 0)} − existing debt)`, value: Math.max(0, (inputs.dtiRatio / 100) * inputs.grossMonthlyIncome - inputs.existingMonthlyDebt), bold: false },
                  { label: 'Max Bond Repayment (lower of the two)', value: result.maxInstalment, bold: true },
                  { label: 'Maximum Home Loan', value: result.maxLoan, bold: true },
                  { label: '+ Your Deposit', value: inputs.depositAvailable, bold: false },
                  { label: 'Maximum Property Price', value: result.maxPropertyPrice, bold: true },
                  { label: 'Transfer Duty (on max price)', value: result.transferDuty, bold: false },
                  { label: 'Bond Registration Costs', value: result.bondRegistration, bold: false },
                  { label: 'Total Cash Required', value: result.totalCashRequired, bold: true },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td className="py-2 pr-4" style={{ color: row.bold ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                    <td className="py-2 text-right font-mono" style={{ color: row.bold ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: row.bold ? 600 : 400 }}>{formatRand(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Education */}
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} color={C.orange} />
              <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Understanding Bond Affordability</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                { title: 'The 30% rule', color: C.blue, body: 'Most SA banks cap your bond repayment at around 30% of gross monthly income. On R45,000 income that\'s roughly R13,500 toward the bond — before other debts are considered.' },
                { title: 'Debt-to-income (NCA)', color: C.orange, body: 'The National Credit Act requires lenders to check that all your debt repayments combined stay affordable — commonly ~36% of gross income. Existing car and credit card debt directly reduce what\'s left for a bond.' },
                { title: 'Why the stress test', color: C.red, body: 'Rates change over a 20-year bond. Qualifying at today\'s rate but being unable to afford repayments after a 2% hike is a real risk — banks increasingly factor this in, and so should you.' },
                { title: 'Deposit matters', color: C.green, body: 'A bigger deposit lowers the loan, reduces your repayment, and can earn a better interest rate. It also covers transfer duty and bond costs, which are NOT included in your home loan and must be paid in cash.' },
                { title: 'Transfer duty', color: C.teal, body: 'SARS charges transfer duty on property above R1.21m (since 1 April 2025) on a sliding scale. On a R1.8m home that\'s about R21,800. Budget for it plus bond registration and conveyancing — typically 3–5% of the price in total upfront costs.' },
                { title: 'Improve your chances', color: C.brown, body: 'Pay down existing debt, save a larger deposit, fix errors on your credit report, and avoid new credit before applying. A clean record and lower DTI can unlock a bigger bond and a better rate.' },
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
