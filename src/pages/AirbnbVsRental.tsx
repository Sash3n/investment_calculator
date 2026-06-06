import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  House, BedDouble, Info, BookOpen, Trophy, CalendarDays, Percent, RotateCcw,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ShareButton } from '../components/ui/ShareButton';
import { usePersistentState } from '../hooks/usePersistentState';
import { readShareParam } from '../utils/share';
import { formatRand, formatRandShort, formatPercent } from '../utils/format';
import { calcSTRvsLTR, type STRvsLTRInputs } from '../utils/shortTermRental';

const C = {
  indigo: '#6366F1', amber: '#F59E0B', emerald: '#10B981',
  red: '#EF4444', cyan: '#06B6D4', violet: '#8B5CF6', pink: '#EC4899',
};

function RandTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ minWidth: 160 }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill ?? C.indigo }}>{p.name}: {formatRand(p.value, 0)}</p>
      ))}
    </div>
  );
}

const DEFAULT_INPUTS: STRvsLTRInputs = {
  propertyValue: 1800000,
  monthlyBondCost: 14000,
  nightlyRate: 1200,
  occupancyPercent: 65,
  avgNightsPerStay: 3,
  platformFeePercent: 15,
  cleaningCostPerStay: 350,
  strManagementPercent: 18,
  monthlyStrExtraCosts: 3500,
  monthlyRent: 13000,
  ltrVacancyPercent: 5,
  ltrManagementPercent: 8,
  monthlyLtrExpenses: 3200,
};

export function AirbnbVsRental() {
  const [inputs, setInputs] = usePersistentState<STRvsLTRInputs>('fincalc-airbnb', DEFAULT_INPUTS);

  useEffect(() => {
    const shared = readShareParam<STRvsLTRInputs>();
    if (shared) setInputs((prev) => ({ ...prev, ...shared }));
  }, [setInputs]);

  const result = useMemo(() => calcSTRvsLTR(inputs), [inputs]);
  const set = (fn: (v: number) => Partial<STRvsLTRInputs>) => (val: string) =>
    setInputs((p) => ({ ...p, ...fn(parseFloat(val) || 0) }));

  const noiChart = [
    { name: 'Short-term (Airbnb)', noi: Math.round(result.str.netOperatingIncome), fill: C.pink },
    { name: 'Long-term Lease', noi: Math.round(result.ltr.netOperatingIncome), fill: C.emerald },
  ];

  const strBreakdown = [
    { name: 'Gross Revenue', value: Math.round(result.str.grossRevenue) },
    { name: 'Platform Fees', value: -Math.round(result.str.platformFees) },
    { name: 'Cleaning', value: -Math.round(result.str.cleaningCosts) },
    { name: 'Management', value: -Math.round(result.str.managementFees) },
    { name: 'Utilities/Extras', value: -Math.round(result.str.extraCosts) },
    { name: 'Net Income', value: Math.round(result.str.netOperatingIncome) },
  ];

  const winnerLabel = result.winner === 'str' ? 'Short-term (Airbnb)' : result.winner === 'ltr' ? 'Long-term Lease' : 'Tie';
  const winnerColor = result.winner === 'str' ? C.pink : result.winner === 'ltr' ? C.emerald : C.amber;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Airbnb vs Long-term Rental
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
            Which rental strategy earns more on the same property — short-term let or a traditional lease?
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ShareButton state={inputs} />
          <button
            onClick={() => setInputs(DEFAULT_INPUTS)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
            title="Reset to defaults"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Property" icon={House} />
            <InputField label="Property Value" id="p-value" value={inputs.propertyValue} onChange={set((v) => ({ propertyValue: v }))} prefix="R" help="Used for net yield comparison" />
            <InputField label="Monthly Bond Repayment" id="p-bond" value={inputs.monthlyBondCost} onChange={set((v) => ({ monthlyBondCost: v }))} prefix="R" help="Applied to both strategies (0 if owned outright)" />
          </div>

          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Short-term (Airbnb)" icon={BedDouble} />
            <InputField label="Average Nightly Rate" id="s-rate" value={inputs.nightlyRate} onChange={set((v) => ({ nightlyRate: v }))} prefix="R" />
            <InputField label="Occupancy" id="s-occ" value={inputs.occupancyPercent} onChange={set((v) => ({ occupancyPercent: v }))} suffix="%" help="SA urban Airbnbs average 50–70%" />
            <InputField label="Avg Nights per Stay" id="s-nights" value={inputs.avgNightsPerStay} onChange={set((v) => ({ avgNightsPerStay: v }))} help="Drives cleaning frequency" />
            <InputField label="Platform Fee" id="s-plat" value={inputs.platformFeePercent} onChange={set((v) => ({ platformFeePercent: v }))} suffix="%" help="Airbnb host fee ≈ 14–16%" />
            <InputField label="Cleaning Cost per Stay" id="s-clean" value={inputs.cleaningCostPerStay} onChange={set((v) => ({ cleaningCostPerStay: v }))} prefix="R" />
            <InputField label="Co-host / Management" id="s-mgmt" value={inputs.strManagementPercent} onChange={set((v) => ({ strManagementPercent: v }))} suffix="%" help="STR managers charge 15–25% (0 if self-managed)" />
            <InputField label="Monthly Utilities & Extras" id="s-extra" value={inputs.monthlyStrExtraCosts} onChange={set((v) => ({ monthlyStrExtraCosts: v }))} prefix="R" help="Wi-Fi, electricity, consumables, furniture wear" />
          </div>

          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Long-term Lease" icon={House} />
            <InputField label="Monthly Rent" id="l-rent" value={inputs.monthlyRent} onChange={set((v) => ({ monthlyRent: v }))} prefix="R" />
            <InputField label="Vacancy" id="l-vac" value={inputs.ltrVacancyPercent} onChange={set((v) => ({ ltrVacancyPercent: v }))} suffix="%" />
            <InputField label="Letting Agent Fee" id="l-mgmt" value={inputs.ltrManagementPercent} onChange={set((v) => ({ ltrManagementPercent: v }))} suffix="%" help="Typically 7–10% of rent" />
            <InputField label="Monthly Expenses" id="l-exp" value={inputs.monthlyLtrExpenses} onChange={set((v) => ({ monthlyLtrExpenses: v }))} prefix="R" help="Levies, rates, insurance, maintenance" />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-5">
          {/* Winner banner */}
          <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: `${winnerColor}12`, border: `1px solid ${winnerColor}44` }}>
            <Trophy size={24} color={winnerColor} className="flex-shrink-0" />
            <div>
              <p className="font-semibold" style={{ color: winnerColor, fontFamily: 'var(--font-heading)' }}>
                {result.winner === 'tie' ? 'Both strategies earn about the same' : `${winnerLabel} wins`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {result.winner === 'tie'
                  ? 'Net operating income is nearly identical — let effort and risk decide.'
                  : `Earns ${formatRand(Math.abs(result.annualDifference), 0)} more net income per year (before bond finance).`}
              </p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Airbnb Net Income" value={formatRandShort(result.str.netOperatingIncome)} sub={`${formatPercent(result.str.netYield, 1)} net yield`} icon={BedDouble} color="amber" delay={0} />
            <StatCard label="Long-term Net Income" value={formatRandShort(result.ltr.netOperatingIncome)} sub={`${formatPercent(result.ltr.netYield, 1)} net yield`} icon={House} color="emerald" delay={0.05} />
            <StatCard label="Airbnb Monthly Cash Flow" value={formatRandShort(result.str.monthlyCashFlow)} sub="After bond" icon={CalendarDays} color={result.str.monthlyCashFlow >= 0 ? 'emerald' : 'red'} delay={0.1} />
            <StatCard label="Long-term Monthly Cash Flow" value={formatRandShort(result.ltr.monthlyCashFlow)} sub="After bond" icon={CalendarDays} color={result.ltr.monthlyCashFlow >= 0 ? 'emerald' : 'red'} delay={0.15} />
          </div>

          {/* Break-even occupancy */}
          {result.breakEvenOccupancy !== null && (
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(6,182,212,0.07)', border: `1px solid ${C.cyan}33` }}>
              <Percent size={18} color={C.cyan} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold" style={{ color: C.cyan, fontFamily: 'var(--font-heading)' }}>
                  Break-even occupancy: {formatPercent(result.breakEvenOccupancy, 1)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Above this occupancy, the Airbnb strategy out-earns the long-term lease. You're currently modelling {formatPercent(inputs.occupancyPercent, 0)}.
                </p>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Annual Net Operating Income</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={noiChart} margin={{ left: 8, right: 16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<RandTooltip />} />
                  <Bar dataKey="noi" name="Net Income" radius={[4, 4, 0, 0]}>
                    {noiChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Airbnb Income Breakdown</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={strBreakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-subtle)' }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={100} />
                  <Tooltip content={<RandTooltip />} />
                  <Bar dataKey="value" name="Amount" radius={[0, 4, 4, 0]}>
                    {strBreakdown.map((d, i) => <Cell key={i} fill={d.value < 0 ? C.red : i === strBreakdown.length - 1 ? C.emerald : C.indigo} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison table */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Side-by-Side Comparison</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th className="py-2 text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Metric</th>
                    <th className="py-2 text-right font-semibold uppercase tracking-wider" style={{ color: C.pink }}>Short-term</th>
                    <th className="py-2 text-right font-semibold uppercase tracking-wider" style={{ color: C.emerald }}>Long-term</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Gross Annual Revenue', s: result.str.grossRevenue, l: result.ltr.grossRent },
                    { label: 'Platform / Letting Fees', s: -result.str.platformFees - result.str.managementFees, l: -result.ltr.managementFees },
                    { label: 'Operating Costs', s: -result.str.cleaningCosts - result.str.extraCosts, l: -result.ltr.expenses },
                    { label: 'Net Operating Income', s: result.str.netOperatingIncome, l: result.ltr.netOperatingIncome, bold: true },
                    { label: 'Net Yield', s: result.str.netYield, l: result.ltr.netYield, pct: true },
                    { label: 'Monthly Cash Flow (after bond)', s: result.str.monthlyCashFlow, l: result.ltr.monthlyCashFlow, bold: true },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="py-2 pr-4" style={{ color: row.bold ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                      <td className="py-2 text-right font-mono" style={{ color: row.bold ? C.pink : 'var(--color-text-muted)', fontWeight: row.bold ? 600 : 400 }}>
                        {row.pct ? formatPercent(row.s, 1) : formatRand(row.s, 0)}
                      </td>
                      <td className="py-2 text-right font-mono" style={{ color: row.bold ? C.emerald : 'var(--color-text-muted)', fontWeight: row.bold ? 600 : 400 }}>
                        {row.pct ? formatPercent(row.l, 1) : formatRand(row.l, 0)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-4 text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>Occupied nights / year</td>
                    <td className="py-2 text-right text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>{result.str.occupiedNights} ({result.str.numberOfStays} stays)</td>
                    <td className="py-2 text-right text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>365 (1 tenant)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Education */}
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} color={C.amber} />
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Short-term vs Long-term — What to Weigh</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                { title: 'Effort & time', color: C.pink, body: 'Airbnb is a hospitality business: guest messaging, check-ins, cleaning turnovers and reviews. A long-term lease is largely passive after placing a tenant. The income gap must compensate for the extra hours (or the 15–25% you pay a co-host).' },
                { title: 'Income volatility', color: C.red, body: 'Short-term income swings with seasonality, tourism and events. Long-term gives a fixed monthly rent and predictable cash flow. Model occupancy conservatively — vacant winter months can erase a strong summer.' },
                { title: 'Costs that differ', color: C.amber, body: 'As an Airbnb host you pay utilities, Wi-Fi, consumables, furnishing and frequent cleaning. A long-term tenant usually pays their own utilities. These extras are easy to underestimate and can flip the result.' },
                { title: 'Regulation & body corporate', color: C.cyan, body: 'Many SA sectional-title schemes and municipalities restrict or licence short-term letting. Check your body corporate rules and local by-laws before assuming Airbnb is even allowed.' },
                { title: 'Tax treatment', color: C.violet, body: 'Both are taxable rental income, but short-term letting may trigger VAT registration above the R1m turnover threshold and has different deductible expenses. Speak to a tax practitioner about your specific setup.' },
                { title: 'Break-even occupancy', color: C.emerald, body: 'The single most important Airbnb number. If your realistic occupancy sits below the break-even shown above, a long-term lease earns more with far less effort. Use platform data for your suburb, not best-case assumptions.' },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-xl space-y-2" style={{ background: `${item.color}08`, border: `1px solid ${item.color}22` }}>
                  <p className="text-xs font-bold" style={{ color: item.color }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Net operating income is shown before bond finance so the strategies are comparable; monthly cash flow then applies the same bond cost to both. Educational estimates only.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
