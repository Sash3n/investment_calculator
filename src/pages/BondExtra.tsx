import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Building2, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { buildShareUrl, readShareParam } from '../utils/share';

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  violet:  '#8B5CF6',
};

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

interface AmortRow {
  month: number;
  balance: number;
  interest: number;
  principal: number;
  extraPrincipal: number;
}

function amortize(
  principal: number,
  annualRate: number,
  termMonths: number,
  extraMonthly: number,
): { rows: AmortRow[]; totalInterest: number; monthsPaid: number } {
  const r = annualRate / 100 / 12;
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -termMonths));
  let balance = principal;
  let totalInterest = 0;
  const rows: AmortRow[] = [];

  for (let m = 1; m <= termMonths; m++) {
    if (balance <= 0) break;
    const interest   = balance * r;
    const principal_ = Math.min(pmt - interest + extraMonthly, balance);
    balance -= principal_;
    totalInterest += interest;
    rows.push({
      month:          m,
      balance:        Math.max(0, balance),
      interest,
      principal:      pmt - interest,
      extraPrincipal: extraMonthly,
    });
    if (balance <= 0.01) break;
  }
  return { rows, totalInterest, monthsPaid: rows.length };
}

interface ShareState {
  loan: number;
  rate: number;
  term: number;
  extra: number;
}

export function BondExtra() {
  const shared = readShareParam<ShareState>();

  const [loan,  setLoan]  = useState(shared?.loan ?? 2_000_000);
  const [rate,  setRate]  = useState(shared?.rate ?? 11.75);
  const [term,  setTerm]  = useState(shared?.term ?? 20);
  const [extra, setExtra] = useState(shared?.extra ?? 1_500);

  const { base, withExtra } = useMemo(() => {
    const base      = amortize(loan, rate, term * 12, 0);
    const withExtra = amortize(loan, rate, term * 12, extra);
    return { base, withExtra };
  }, [loan, rate, term, extra]);

  const interestSaved   = base.totalInterest - withExtra.totalInterest;
  const monthsSaved     = base.monthsPaid - withExtra.monthsPaid;
  const yearsSaved      = Math.floor(monthsSaved / 12);
  const remMonthsSaved  = monthsSaved % 12;

  const chartData = useMemo(() => {
    const maxYears = Math.ceil(base.monthsPaid / 12);
    return Array.from({ length: maxYears }, (_, i) => {
      const yr = i + 1;
      const baseRow    = base.rows[yr * 12 - 1];
      const extraRow   = withExtra.rows[yr * 12 - 1];
      return {
        year:      yr,
        standard:  baseRow  ? Math.round(baseRow.balance)  : 0,
        withExtra: extraRow ? Math.round(extraRow.balance) : 0,
      };
    });
  }, [base, withExtra]);

  const shareUrl = buildShareUrl({ loan, rate, term, extra } satisfies ShareState);

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${C.emerald}22` }}>
            <Building2 size={22} style={{ color: C.emerald }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Bond Extra Payment</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              See how extra monthly payments slash interest and cut years off your bond.
            </p>
          </div>
        </div>
        <ShareButton url={shareUrl} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div
          className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Bond details
          </h2>
          <InputField label="Outstanding loan (R)" value={loan} onChange={setLoan} prefix="R" min={1} />
          <InputField label="Interest rate" value={rate} onChange={setRate} suffix="%" min={0} max={30} />
          <InputField label="Remaining term" value={term} onChange={setTerm} suffix="yrs" min={1} max={30} />
          <InputField label="Extra payment per month" value={extra} onChange={setExtra} prefix="R" min={0} />

          {extra === 0 && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}33` }}
            >
              <AlertCircle size={13} style={{ color: C.amber }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Enter an extra amount to see the impact.</span>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Interest saved"
              value={formatRandShort(interestSaved)}
              color={C.emerald}
              icon={<TrendingDown size={16} />}
            />
            <StatCard
              label="Time saved"
              value={`${yearsSaved}yr ${remMonthsSaved}mo`}
              color={C.indigo}
              icon={<CheckCircle2 size={16} />}
            />
            <StatCard
              label="Total interest (standard)"
              value={formatRandShort(base.totalInterest)}
              color={C.red}
              icon={<TrendingDown size={16} />}
            />
            <StatCard
              label="Total interest (with extra)"
              value={formatRandShort(withExtra.totalInterest)}
              color={C.violet}
              icon={<TrendingDown size={16} />}
            />
          </div>

          {/* Summary callout */}
          {extra > 0 && interestSaved > 0 && (
            <div
              className="p-4 rounded-xl text-sm"
              style={{ background: `${C.emerald}11`, border: `1px solid ${C.emerald}33` }}
            >
              <span style={{ color: 'var(--color-text)' }}>
                Paying an extra{' '}
                <span style={{ color: C.emerald, fontWeight: 600 }}>{formatRand(extra)}/month</span>
                {' '}saves you{' '}
                <span style={{ color: C.emerald, fontWeight: 600 }}>{formatRandShort(interestSaved)}</span>
                {' '}in interest and pays off your bond{' '}
                <span style={{ color: C.emerald, fontWeight: 600 }}>
                  {yearsSaved > 0 ? `${yearsSaved} year${yearsSaved !== 1 ? 's' : ''}` : ''}
                  {yearsSaved > 0 && remMonthsSaved > 0 ? ' and ' : ''}
                  {remMonthsSaved > 0 ? `${remMonthsSaved} month${remMonthsSaved !== 1 ? 's' : ''}` : ''}
                </span>
                {' '}earlier.
              </span>
            </div>
          )}

          {/* Chart */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
              Outstanding balance over time
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="be-std" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.red}    stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.red}    stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="be-extra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.emerald} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C.emerald} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  tickFormatter={(v) => `Yr ${v}`}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  tickFormatter={formatRandShort}
                  width={64}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val: number, name: string) => [formatRand(val), name]}
                  labelFormatter={(l) => `Year ${l}`}
                  cursor={{ stroke: `${C.indigo}55`, strokeWidth: 1 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="standard"  name="Standard"        stroke={C.red}     fill="url(#be-std)"   strokeWidth={2} />
                <Area type="monotone" dataKey="withExtra" name="With extra pmt"   stroke={C.emerald} fill="url(#be-extra)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
