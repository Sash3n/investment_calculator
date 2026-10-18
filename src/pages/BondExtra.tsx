import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort, formatMonths } from '../utils/format';
import { readShareParam } from '../utils/share';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { bondExtraInputErrors } from '../utils/validation';

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
};

const TOOLTIP_STYLE = {
  background:   'color-mix(in srgb, var(--paper-raised) 95%, transparent)',
  border:       '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
  borderRadius: 10,
  fontSize:     12,
  color:        'var(--ink)',
};

interface AmortRow {
  month:     number;
  year:      number;
  balance:   number;
  interest:  number;
  principal: number;
}

function amortize(
  principal: number,
  annualRate: number,
  termMonths: number,
  extraMonthly: number,
  annualLumpSum: number,
): { rows: AmortRow[]; totalInterest: number; monthsPaid: number } {
  const r   = annualRate / 100 / 12;
  const pmt = r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -termMonths)) : principal / termMonths;
  let balance       = principal;
  let totalInterest = 0;
  const rows: AmortRow[] = [];

  // Clamp extra to non-negative so a user typing negative values can't inflate balance
  const safeExtra = Math.max(0, extraMonthly);

  for (let m = 1; m <= termMonths; m++) {
    if (balance <= 0) break;
    const interest     = balance * r;
    let   principalPmt = Math.min(pmt - interest + safeExtra, balance);
    balance -= principalPmt;
    totalInterest += interest;

    // Annual lump sum applied at end of each year — tracked as additional principal
    let lumpApplied = 0;
    if (m % 12 === 0 && annualLumpSum > 0 && balance > 0) {
      lumpApplied = Math.min(annualLumpSum, balance);
      balance    -= lumpApplied;
    }

    rows.push({
      month:     m,
      year:      Math.ceil(m / 12),
      balance:   Math.max(0, balance),
      interest,
      principal: principalPmt + lumpApplied,
    });
    if (balance <= 0.01) break;
  }
  return { rows, totalInterest, monthsPaid: rows.length };
}

interface ShareState {
  loan:           number;
  rate:           number;
  term:           number;
  extra:          number;
  annualLumpSum:  number;
  biweekly:       boolean;
}

export function BondExtra() {
  const shared = readShareParam<ShareState>();

  const [loan,          setLoan]          = useState(shared?.loan          ?? 2_000_000);
  const [rate,          setRate]          = useState(shared?.rate          ?? 11.75);
  const [term,          setTerm]          = useState(shared?.term          ?? 20);
  const [extra,         setExtra]         = useState(shared?.extra         ?? 1_500);
  const [annualLumpSum, setAnnualLumpSum] = useState(shared?.annualLumpSum ?? 0);
  const [biweekly,      setBiweekly]      = useState(shared?.biweekly      ?? false);
  const [showTable,     setShowTable]     = useState(false);

  // Bi-weekly: 26 half-payments/yr = 13 full payments/yr instead of 12
  // Equivalent extra monthly: monthly_pmt / 12
  const biweeklyExtra = useMemo(() => {
    if (!biweekly) return 0;
    const r   = rate / 100 / 12;
    const pmt = r > 0 ? (loan * r) / (1 - Math.pow(1 + r, -(term * 12))) : loan / (term * 12);
    return pmt / 12; // 1 extra full payment spread across 12 months
  }, [biweekly, loan, rate, term]);

  const totalExtra = extra + biweeklyExtra;

  const { base, withExtra } = useMemo(() => ({
    base:      amortize(loan, rate, term * 12, 0, 0),
    withExtra: amortize(loan, rate, term * 12, totalExtra, annualLumpSum),
  }), [loan, rate, term, totalExtra, annualLumpSum]);

  const interestSaved  = base.totalInterest - withExtra.totalInterest;
  const monthsSaved    = base.monthsPaid    - withExtra.monthsPaid;

  const chartData = useMemo(() => {
    const maxYears = Math.ceil(base.monthsPaid / 12);
    return Array.from({ length: maxYears }, (_, i) => {
      const yr      = i + 1;
      const baseRow = base.rows[yr * 12 - 1];
      const exRow   = withExtra.rows[yr * 12 - 1];
      return {
        year:      yr,
        standard:  baseRow ? Math.round(baseRow.balance)  : 0,
        withExtra: exRow   ? Math.round(exRow.balance)    : 0,
      };
    });
  }, [base, withExtra]);

  // Year-by-year summary table
  const yearlyTable = useMemo(() => {
    const maxYears = Math.ceil(withExtra.monthsPaid / 12);
    return Array.from({ length: maxYears }, (_, i) => {
      const yr     = i + 1;
      const rows   = withExtra.rows.filter((r) => r.year === yr);
      const interest  = rows.reduce((s, r) => s + r.interest,  0);
      const principal = rows.reduce((s, r) => s + r.principal, 0);
      const endBal    = rows[rows.length - 1]?.balance ?? 0;
      return { yr, interest, principal, endBal };
    });
  }, [withExtra]);

  const shareState: ShareState = { loan, rate, term, extra, annualLumpSum, biweekly };

  const hasAnyExtra = extra > 0 || annualLumpSum > 0 || biweekly;

  const errors  = bondExtraInputErrors({ loan, rate, term, extra, annualLumpSum });
  const blocked = errors.loan ?? errors.rate ?? errors.term;
  const extraText = [
    totalExtra > 0 ? `${formatRand(totalExtra, 0)} extra a month` : '',
    annualLumpSum > 0 ? `${formatRand(annualLumpSum, 0)} once a year` : '',
  ].filter(Boolean).join(' and ');

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: alpha(C.green, 13) }}>
            <Building2 size={22} style={{ color: textTone(C.green) }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>Bond Extra Payment</h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Extra monthly payments, annual lump sums, and bi-weekly schedules — see the real impact.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            Bond details
          </h2>
          <InputField id="be-loan"  label="Outstanding loan (R)"       value={loan} error={errors.loan}          onChange={(v) => setLoan(Number(v))}          prefix="R"   min={1} />
          <InputField id="be-rate"  label="Interest rate"              value={rate} error={errors.rate}          onChange={(v) => setRate(Number(v))}          suffix="%"   min={0} max={30} />
          <InputField id="be-term"  label="Remaining term"             value={term} error={errors.term}          onChange={(v) => setTerm(Number(v))}          suffix="yrs" min={1} max={30} />

          <hr style={{ borderColor: 'var(--rule)' }} />
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            Extra payments
          </h2>

          <InputField id="be-extra"  label="Extra payment per month"  value={extra} error={errors.extra}         onChange={(v) => setExtra(Number(v))}         prefix="R"   min={0} />
          <InputField id="be-lump"   label="Annual lump sum (e.g. bonus)" value={annualLumpSum} error={errors.annualLumpSum} onChange={(v) => setAnnualLumpSum(Number(v))} prefix="R" min={0} />

          {/* Bi-weekly toggle */}
          <button
            onClick={() => setBiweekly(!biweekly)}
            className="w-full flex items-center justify-between p-3 rounded-xl text-sm transition-colors"
            style={{
              background: biweekly ? alpha(C.green, 8) : 'transparent',
              border: `1px solid ${biweekly ? C.green : 'var(--rule)'}`,
              color: 'var(--ink)',
            }}
          >
            <span>Bi-weekly payment schedule</span>
            <span className="text-xs" style={{ color: textTone(biweekly ? C.green : 'var(--ink-muted)') }}>
              {biweekly ? 'ON' : 'OFF'}
            </span>
          </button>
          {biweekly && (
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              26 half-payments per year = 13 full payments — equivalent to +{formatRand(biweeklyExtra)}/mo extra.
            </p>
          )}

        </div>

        <div className="lg:col-span-2 space-y-4">
          <ResultPanel
            label="Interest saved"
            value={formatRand(interestSaved, 0)}
            tone={interestSaved > 0 ? 'gain' : 'default'}
            blocked={blocked}
            summary={hasAnyExtra
              ? `Paying in ${extraText} pays the bond off ${formatMonths(monthsSaved)} sooner, after ${formatMonths(withExtra.monthsPaid)} instead of ${formatMonths(base.monthsPaid)}.`
              : 'Add an extra monthly payment, a yearly lump sum or the bi-weekly schedule to see how much interest and time it saves.'}
            figures={[
              { label: 'Time saved', value: formatMonths(monthsSaved) },
              { label: 'Paid off after', value: formatMonths(withExtra.monthsPaid) },
              { label: 'Interest, normal repayment', value: formatRand(base.totalInterest, 0) },
              { label: 'Interest with extra', value: formatRand(withExtra.totalInterest, 0) },
            ]}
          />

          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
              Outstanding balance over time
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="be-std" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.red}     stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.red}     stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="be-extra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.green} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  tickFormatter={(v) => `Yr ${v}`} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  tickFormatter={formatRandShort} width={64} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [formatRand(Number(val)), '']}
                  labelFormatter={(l) => `Year ${l}`}
                  cursor={{ stroke: alpha(C.blue, 33), strokeWidth: 1 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="standard"  name="Standard"      stroke={C.red}     fill="url(#be-std)"   strokeWidth={2} />
                <Area type="monotone" dataKey="withExtra" name="With extra pmt" stroke={C.green} fill="url(#be-extra)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Year-by-year amortization table */}
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--rule)' }}>
            <button
              className="w-full flex items-center justify-between p-4 text-sm font-semibold"
              style={{ background: 'var(--paper-raised)', color: 'var(--ink)' }}
              onClick={() => setShowTable(!showTable)}
            >
              <span>Year-by-year amortization table</span>
              {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--paper-raised)', borderBottom: '1px solid var(--rule)' }}>
                      {['Year', 'Interest paid', 'Principal paid', 'Closing balance'].map((h) => (
                        <th key={h} className="text-left py-2 px-3 font-semibold"
                          style={{ color: 'var(--ink-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyTable.map(({ yr, interest, principal, endBal }) => (
                      <tr key={yr} style={{ borderBottom: '1px solid var(--rule)' }}>
                        <td className="py-2 px-3" style={{ color: 'var(--ink-muted)' }}>{yr}</td>
                        <td className="py-2 px-3" style={{ color: textTone(C.red) }}>{formatRand(interest)}</td>
                        <td className="py-2 px-3" style={{ color: textTone(C.green) }}>{formatRand(principal)}</td>
                        <td className="py-2 px-3 font-medium" style={{ color: 'var(--ink)' }}>{formatRand(endBal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <AssumptionsDrawer
            items={[
              <>The rate stays at {rate}% for the remaining {term} years, and your normal repayment stays the same.</>,
              <>Extra monthly payments start now and come straight off what you owe. The lump sum is paid at the end of each year.</>,
              <>The bi-weekly schedule is 26 half-payments a year, which adds up to one extra repayment a year. It is shown here as {formatRand(biweeklyExtra, 0)} a month.</>,
              <>Not included: the bank’s monthly service fee and any fee for paying in extra. Check that your bank puts extra payments against the capital.</>,
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
}
