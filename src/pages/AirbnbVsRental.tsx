import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  House, BedDouble, BookOpen, RotateCcw,
} from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ShareButton } from '../components/ui/ShareButton';
import { usePersistentState } from '../hooks/usePersistentState';
import { readShareParam } from '../utils/share';
import { formatRand, formatPercent } from '../utils/format';
import { calcSTRvsLTR, type STRvsLTRInputs } from '../utils/shortTermRental';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { airbnbInputErrors } from '../utils/validation';

const C = {
  blue: 'var(--note-blue)', orange: 'var(--note-orange)', green: 'var(--gain)',
  red: 'var(--loss)', teal: 'var(--note-teal)', brown: 'var(--note-brown)',
};

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
    { name: 'Short-term (Airbnb)', noi: Math.round(result.str.netOperatingIncome), fill: C.blue },
    { name: 'Long-term Lease', noi: Math.round(result.ltr.netOperatingIncome), fill: C.green },
  ];

  const strBreakdown = [
    { name: 'Gross Revenue', value: Math.round(result.str.grossRevenue) },
    { name: 'Platform Fees', value: -Math.round(result.str.platformFees) },
    { name: 'Cleaning', value: -Math.round(result.str.cleaningCosts) },
    { name: 'Management', value: -Math.round(result.str.managementFees) },
    { name: 'Utilities/Extras', value: -Math.round(result.str.extraCosts) },
    { name: 'Ownership Costs', value: -Math.round(result.str.ownershipCosts) },
    { name: 'Net Income', value: Math.round(result.str.netOperatingIncome) },
  ];

  const errors = airbnbInputErrors(inputs);
  const blocked = errors.propertyValue ?? errors.nightlyRate ?? errors.occupancyPercent ?? errors.avgNightsPerStay ?? errors.monthlyRent;
  const occupancyText = result.breakEvenOccupancy !== null
    ? `Airbnb earns more above ${formatPercent(result.breakEvenOccupancy, 1)} occupancy; you entered ${formatPercent(inputs.occupancyPercent, 0)}.`
    : result.winner === 'str'
      ? 'Airbnb earns more at any occupancy with these costs.'
      : 'With these costs, even a fully booked Airbnb would not match the lease.';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Airbnb vs Long-term Rental
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
            Which rental strategy earns more on the same property — short-term let or a traditional lease?
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ShareButton state={inputs} />
          <button
            onClick={() => setInputs(DEFAULT_INPUTS)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)', color: 'var(--ink-muted)' }}
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
            <InputField label="Property Value" id="p-value" value={inputs.propertyValue} error={errors.propertyValue} onChange={set((v) => ({ propertyValue: v }))} prefix="R" help="Used for net yield comparison" />
            <InputField label="Monthly Bond Repayment" id="p-bond" value={inputs.monthlyBondCost} error={errors.monthlyBondCost} onChange={set((v) => ({ monthlyBondCost: v }))} prefix="R" help="Applied to both strategies (0 if owned outright)" />
            <InputField label="Monthly Ownership Costs" id="l-exp" value={inputs.monthlyLtrExpenses} error={errors.monthlyLtrExpenses} onChange={set((v) => ({ monthlyLtrExpenses: v }))} prefix="R" help="Levies, rates, insurance, maintenance: paid under both strategies" />
          </div>

          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Short-term (Airbnb)" icon={BedDouble} />
            <InputField label="Average Nightly Rate" id="s-rate" value={inputs.nightlyRate} error={errors.nightlyRate} onChange={set((v) => ({ nightlyRate: v }))} prefix="R" />
            <InputField label="Occupancy" id="s-occ" value={inputs.occupancyPercent} error={errors.occupancyPercent} onChange={set((v) => ({ occupancyPercent: v }))} suffix="%" help="SA urban Airbnbs average 50–70%" />
            <InputField label="Avg Nights per Stay" id="s-nights" value={inputs.avgNightsPerStay} error={errors.avgNightsPerStay} onChange={set((v) => ({ avgNightsPerStay: v }))} help="Drives cleaning frequency" />
            <InputField label="Platform Fee" id="s-plat" value={inputs.platformFeePercent} error={errors.platformFeePercent} onChange={set((v) => ({ platformFeePercent: v }))} suffix="%" help="Airbnb host fee ≈ 14–16%" />
            <InputField label="Cleaning Cost per Stay" id="s-clean" value={inputs.cleaningCostPerStay} error={errors.cleaningCostPerStay} onChange={set((v) => ({ cleaningCostPerStay: v }))} prefix="R" />
            <InputField label="Co-host / Management" id="s-mgmt" value={inputs.strManagementPercent} error={errors.strManagementPercent} onChange={set((v) => ({ strManagementPercent: v }))} suffix="%" help="STR managers charge 15–25% (0 if self-managed)" />
            <InputField label="Monthly Utilities & Extras" id="s-extra" value={inputs.monthlyStrExtraCosts} error={errors.monthlyStrExtraCosts} onChange={set((v) => ({ monthlyStrExtraCosts: v }))} prefix="R" help="Wi-Fi, electricity, consumables, furniture wear" />
          </div>

          <div className="glass-card p-5 space-y-4">
            <SectionHeader title="Long-term Lease" icon={House} />
            <InputField label="Monthly Rent" id="l-rent" value={inputs.monthlyRent} error={errors.monthlyRent} onChange={set((v) => ({ monthlyRent: v }))} prefix="R" />
            <InputField label="Vacancy" id="l-vac" value={inputs.ltrVacancyPercent} error={errors.ltrVacancyPercent} onChange={set((v) => ({ ltrVacancyPercent: v }))} suffix="%" />
            <InputField label="Letting Agent Fee" id="l-mgmt" value={inputs.ltrManagementPercent} error={errors.ltrManagementPercent} onChange={set((v) => ({ ltrManagementPercent: v }))} suffix="%" help="Typically 7–10% of rent" />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-5">
          <ResultPanel
            label={blocked ? 'Airbnb or a long-term lease' : result.winner === 'tie' ? 'Both earn about the same each year' : `${result.winner === 'str' ? 'Airbnb' : 'A long-term lease'} earns more each year by`}
            value={formatRand(Math.abs(result.annualDifference), 0)}
            blocked={blocked}
            summary={<>
              Before the bond, a short-term let earns {formatRand(result.str.netOperatingIncome, 0)} a year after its costs and a
              long-term lease {formatRand(result.ltr.netOperatingIncome, 0)}. {occupancyText}
            </>}
            figures={[
              { label: 'Airbnb net yield', value: formatPercent(result.str.netYield, 1) },
              { label: 'Lease net yield', value: formatPercent(result.ltr.netYield, 1) },
              { label: 'Airbnb after bond', value: `${formatRand(result.str.monthlyCashFlow, 0)}/mo` },
              { label: 'Lease after bond', value: `${formatRand(result.ltr.monthlyCashFlow, 0)}/mo` },
            ]}
          />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Annual Net Operating Income</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={noiChart} margin={{ left: 8, right: 16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
                  <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                  <Bar dataKey="noi" name="Net Income" radius={[4, 4, 0, 0]}>
                    {noiChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card-static p-5">
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Airbnb Income Breakdown</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={strBreakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} width={100} />
                  <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} content={<RandTooltip />} />
                  <Bar dataKey="value" name="Amount" radius={[0, 4, 4, 0]}>
                    {strBreakdown.map((d, i) => <Cell key={i} fill={d.value < 0 ? C.red : i === strBreakdown.length - 1 ? C.green : C.blue} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison table */}
          <div className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Side-by-Side Comparison</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--rule)' }}>
                    <th className="py-2 text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>Metric</th>
                    <th className="py-2 text-right font-semibold uppercase tracking-wider" style={{ color: textTone(C.blue) }}>Short-term</th>
                    <th className="py-2 text-right font-semibold uppercase tracking-wider" style={{ color: textTone(C.green) }}>Long-term</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Gross Annual Revenue', s: result.str.grossRevenue, l: result.ltr.grossRent },
                    { label: 'Platform / Letting Fees', s: -result.str.platformFees - result.str.managementFees, l: -result.ltr.managementFees },
                    { label: 'Operating Costs', s: -result.str.cleaningCosts - result.str.extraCosts - result.str.ownershipCosts, l: -result.ltr.expenses },
                    { label: 'Net Operating Income', s: result.str.netOperatingIncome, l: result.ltr.netOperatingIncome, bold: true },
                    { label: 'Net Yield', s: result.str.netYield, l: result.ltr.netYield, pct: true },
                    { label: 'Monthly Cash Flow (after bond)', s: result.str.monthlyCashFlow, l: result.ltr.monthlyCashFlow, bold: true },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td className="py-2 pr-4" style={{ color: row.bold ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                      <td className="py-2 text-right font-mono" style={{ color: textTone(row.bold ? C.blue : 'var(--ink-muted)'), fontWeight: row.bold ? 600 : 400 }}>
                        {row.pct ? formatPercent(row.s, 1) : formatRand(row.s, 0)}
                      </td>
                      <td className="py-2 text-right font-mono" style={{ color: textTone(row.bold ? C.green : 'var(--ink-muted)'), fontWeight: row.bold ? 600 : 400 }}>
                        {row.pct ? formatPercent(row.l, 1) : formatRand(row.l, 0)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-4 text-[11px]" style={{ color: 'var(--ink-subtle)' }}>Occupied nights / year</td>
                    <td className="py-2 text-right text-[11px]" style={{ color: 'var(--ink-subtle)' }}>{result.str.occupiedNights} ({result.str.numberOfStays} stays)</td>
                    <td className="py-2 text-right text-[11px]" style={{ color: 'var(--ink-subtle)' }}>365 (1 tenant)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Education */}
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} color={C.orange} />
              <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Short-term vs Long-term — What to Weigh</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                { title: 'Effort & time', color: C.blue, body: 'Airbnb is a hospitality business: guest messaging, check-ins, cleaning turnovers and reviews. A long-term lease is largely passive after placing a tenant. The income gap must compensate for the extra hours (or the 15–25% you pay a co-host).' },
                { title: 'Income volatility', color: C.red, body: 'Short-term income swings with seasonality, tourism and events. Long-term gives a fixed monthly rent and predictable cash flow. Model occupancy conservatively — vacant winter months can erase a strong summer.' },
                { title: 'Costs that differ', color: C.orange, body: 'As an Airbnb host you pay utilities, Wi-Fi, consumables, furnishing and frequent cleaning. A long-term tenant usually pays their own utilities. These extras are easy to underestimate and can flip the result.' },
                { title: 'Regulation & body corporate', color: C.teal, body: 'Many SA sectional-title schemes and municipalities restrict or licence short-term letting. Check your body corporate rules and local by-laws before assuming Airbnb is even allowed.' },
                { title: 'Tax treatment', color: C.brown, body: 'Both are taxable rental income, but short-term letting may trigger VAT registration above the R2.3m turnover threshold and has different deductible expenses. Speak to a tax practitioner about your specific setup.' },
                { title: 'Break-even occupancy', color: C.green, body: 'The single most important Airbnb number. If your realistic occupancy sits below the break-even shown above, a long-term lease earns more with far less effort. Use platform data for your suburb, not best-case assumptions.' },
              ].map((item) => (
                <div key={item.title} className="p-4 rounded-xl space-y-2" style={{ background: alpha(item.color, 3), border: `1px solid ${alpha(item.color, 13)}` }}>
                  <p className="text-xs font-bold" style={{ color: textTone(item.color) }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <AssumptionsDrawer
            items={[
              <>Net income is shown before the bond so the two are comparable. Cash flow then takes the same bond repayment of {formatRand(inputs.monthlyBondCost, 0)} a month off both.</>,
              <>The Airbnb is booked for {formatPercent(inputs.occupancyPercent, 0)} of the year at {formatRand(inputs.nightlyRate, 0)} a night, with a cleaning bill every {inputs.avgNightsPerStay} nights. Platform and co-host fees are a share of the booking income.</>,
              <>The lease runs all year, less {formatPercent(inputs.ltrVacancyPercent, 0)} vacancy, and the letting agent takes {formatPercent(inputs.ltrManagementPercent, 0)} of the rent collected.</>,
              <>Levies, rates, insurance and maintenance ({formatRand(inputs.monthlyLtrExpenses, 0)} a month) are paid under both strategies, so they come off both. Airbnb utilities and extras are on top of that.</>,
              <>Rates and costs stay the same all year. Seasonality, income tax and VAT are not included.</>,
            ]}
          />
        </div>
      </div>
    </div>
  );
}
