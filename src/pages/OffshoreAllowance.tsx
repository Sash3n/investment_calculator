import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Globe, Info, TrendingUp, DollarSign } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { readShareParam } from '../utils/share';
import { alpha } from '../utils/color';

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

type Currency = 'USD' | 'EUR' | 'GBP';

const CURRENCY_DEFAULTS: Record<Currency, { rate: number; label: string; symbol: string; defaultReturn: number }> = {
  USD: { rate: 18.50, label: 'USD (US Dollar)',     symbol: '$', defaultReturn: 12 },
  EUR: { rate: 20.20, label: 'EUR (Euro)',           symbol: '€', defaultReturn: 9  },
  GBP: { rate: 23.60, label: 'GBP (British Pound)', symbol: '£', defaultReturn: 8  },
};

interface ShareState {
  zarAmount:       number;
  spotRate:        number;
  offshoreReturn:  number;
  localReturn:     number;
  zarDepreciation: number;
  years:           number;
  currency:        string;
}

export function OffshoreAllowance() {
  const shared = readShareParam<ShareState>();

  const [zarAmount,       setZarAmount]       = useState(shared?.zarAmount       ?? 1_000_000);
  const [currency,        setCurrency]        = useState<Currency>((shared?.currency as Currency) ?? 'USD');
  const [spotRate,        setSpotRate]        = useState(shared?.spotRate        ?? CURRENCY_DEFAULTS.USD.rate);
  const [offshoreReturn,  setOffshoreReturn]  = useState(shared?.offshoreReturn  ?? 12);
  const [localReturn,     setLocalReturn]     = useState(shared?.localReturn     ?? 10);
  const [zarDepreciation, setZarDepreciation] = useState(shared?.zarDepreciation ?? 4);
  const [years,           setYears]           = useState(shared?.years           ?? 10);

  const currencyInfo = CURRENCY_DEFAULTS[currency];

  const result = useMemo(() => {
    const usdInvested = zarAmount / spotRate; // works for any currency — variable name kept as-is
    const chartData: { year: number; local: number; offshore: number }[] = [];
    let localBal = zarAmount;
    let usdBal   = usdInvested;

    for (let y = 1; y <= years; y++) {
      localBal = localBal * (1 + localReturn    / 100);
      usdBal   = usdBal   * (1 + offshoreReturn / 100);
      const futureRate   = spotRate * Math.pow(1 + zarDepreciation / 100, y);
      const offshoreZar  = usdBal * futureRate;
      chartData.push({ year: y, local: Math.round(localBal), offshore: Math.round(offshoreZar) });
    }

    const finalLocal    = chartData[chartData.length - 1]?.local    ?? 0;
    const finalOffshore = chartData[chartData.length - 1]?.offshore ?? 0;
    const usdFinal      = usdInvested * Math.pow(1 + offshoreReturn / 100, years);

    return { chartData, finalLocal, finalOffshore, usdFinal, usdInvested };
  }, [zarAmount, spotRate, offshoreReturn, localReturn, zarDepreciation, years]);

  const advantage = result.finalOffshore - result.finalLocal;

  const shareState: ShareState = {
    zarAmount, spotRate, offshoreReturn, localReturn, zarDepreciation, years, currency,
  };

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${alpha(C.teal, 13)}` }}>
            <Globe size={22} style={{ color: C.teal }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>Offshore Allowance Planner</h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Model your R1M Single Discretionary Allowance: ZAR depreciation vs offshore returns.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
        style={{ background: `${alpha(C.teal, 7)}`, border: `1px solid ${alpha(C.teal, 20)}` }}>
        <Info size={16} style={{ color: C.teal }} />
        <div style={{ color: 'var(--ink-muted)' }}>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>SA allowances: </span>
          R1,000,000/year Single Discretionary Allowance (no SARB approval) +
          R10,000,000/year Foreign Investment Allowance (SARB approval + Tax Compliance Status pin required).
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            Scenario inputs
          </h2>
          <InputField id="oa-zar"   label="ZAR amount to invest"          value={zarAmount}       onChange={(v) => setZarAmount(Number(v))}       prefix="R"      min={1} />

          {/* Currency selector */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ink-muted)' }}>
              Foreign currency
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(CURRENCY_DEFAULTS) as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => { setCurrency(c); setSpotRate(CURRENCY_DEFAULTS[c].rate); setOffshoreReturn(CURRENCY_DEFAULTS[c].defaultReturn); }}
                  className="py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: currency === c ? C.teal : `${alpha(C.teal, 7)}`,
                    color:      currency === c ? 'var(--on-accent)' : C.teal,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <InputField id="oa-spot"  label={`ZAR/${currency} spot rate`}       value={spotRate}        onChange={(v) => setSpotRate(Number(v))}        suffix={`R/${currency}`} min={1} />
          <InputField id="oa-off"   label={`Offshore return (${currency} p.a.)`} value={offshoreReturn} onChange={(v) => setOffshoreReturn(Number(v))}  suffix="%"      min={0} max={40} />
          <InputField id="oa-local" label="Local JSE return (ZAR p.a.)"   value={localReturn}     onChange={(v) => setLocalReturn(Number(v))}     suffix="%"      min={0} max={40} />
          <InputField id="oa-dep"   label="ZAR depreciation p.a."         value={zarDepreciation} onChange={(v) => setZarDepreciation(Number(v))} suffix="%"      min={0} max={20} />
          <InputField id="oa-yrs"   label="Investment horizon"            value={years}           onChange={(v) => setYears(Number(v))}           suffix="yrs"    min={1} max={40} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Offshore final value (ZAR)" value={formatRandShort(result.finalOffshore)} color="blue"  icon={Globe} />
            <StatCard label="Local final value (ZAR)"    value={formatRandShort(result.finalLocal)}    color="green" icon={TrendingUp} />
            <StatCard
              label={advantage >= 0 ? 'Offshore advantage' : 'Local advantage'}
              value={formatRandShort(Math.abs(advantage))}
              color={advantage >= 0 ? 'green' : 'orange'}
              icon={DollarSign}
            />
            <StatCard label={`${currency} value in ${years}yr`} value={`${currencyInfo.symbol}${Math.round(result.usdFinal).toLocaleString()}`} color="blue" icon={DollarSign} />
          </div>

          <div className="p-4 rounded-xl text-sm"
            style={{
              background: advantage >= 0 ? `${alpha(C.green, 7)}` : 'color-mix(in srgb, var(--note-orange) 7%, transparent)',
              border:     `1px solid ${alpha(advantage >= 0 ? C.green : C.orange, 20)}`,
            }}>
            <span style={{ color: 'var(--ink-muted)' }}>
              {advantage >= 0
                ? `Offshore investing outperforms by ${formatRandShort(advantage)} over ${years} years, driven by ZAR depreciation boosting USD returns when converted back.`
                : `Local investing outperforms by ${formatRandShort(Math.abs(advantage))} — higher local returns more than offset ZAR depreciation at these rates.`}
            </span>
          </div>

          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>
              Local vs offshore (ZAR terms)
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={result.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickFormatter={(v) => `Yr ${v}`} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickFormatter={formatRandShort} width={64} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [formatRand(Number(val)), '']}
                  labelFormatter={(l) => `Year ${l}`}
                  cursor={{ stroke: `${alpha(C.blue, 33)}`, strokeWidth: 1 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="local"    name="Local (JSE)"               stroke={C.blue} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="offshore" name={`Offshore (${currency})`} stroke={C.teal}   strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
