import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Globe } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort, formatNumber } from '../utils/format';
import { readShareParam } from '../utils/share';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { positiveError, rangeError } from '../utils/validation';

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
  const futureRate = spotRate * Math.pow(1 + zarDepreciation / 100, years);

  const errors = {
    zarAmount: positiveError(zarAmount, 'Enter the amount to invest.'),
    spotRate: positiveError(spotRate, 'Enter the exchange rate.'),
    offshoreReturn: rangeError(offshoreReturn, -20, 40, 'a return', '%'),
    localReturn: rangeError(localReturn, -20, 40, 'a return', '%'),
    zarDepreciation: rangeError(zarDepreciation, -20, 20, 'a yearly change', '%'),
    years: rangeError(years, 1, 40, 'a number of years', ''),
  };
  const blocked = errors.zarAmount ?? errors.spotRate ?? errors.offshoreReturn ?? errors.localReturn ?? errors.zarDepreciation ?? errors.years;

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
          <div className="p-2.5 rounded-xl" style={{ background: alpha(C.teal, 13) }}>
            <Globe size={22} style={{ color: textTone(C.teal) }} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            Scenario inputs
          </h2>
          <InputField id="oa-zar"   label="ZAR amount to invest"          value={zarAmount} error={errors.zarAmount}       onChange={(v) => setZarAmount(Number(v))}       prefix="R"      min={1} />

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
                    background: currency === c ? C.teal : alpha(C.teal, 7),
                    color:      textTone(currency === c ? 'var(--on-accent)' : C.teal),
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <InputField id="oa-spot"  label={`ZAR/${currency} spot rate`}       value={spotRate} error={errors.spotRate}        onChange={(v) => setSpotRate(Number(v))}        suffix={`R/${currency}`} min={1} />
          <InputField id="oa-off"   label={`Offshore return (${currency} p.a.)`} value={offshoreReturn} error={errors.offshoreReturn} onChange={(v) => setOffshoreReturn(Number(v))}  suffix="%"      min={0} max={40} />
          <InputField id="oa-local" label="Local JSE return (ZAR p.a.)"   value={localReturn} error={errors.localReturn}     onChange={(v) => setLocalReturn(Number(v))}     suffix="%"      min={0} max={40} />
          <InputField id="oa-dep"   label="ZAR depreciation p.a."         value={zarDepreciation} error={errors.zarDepreciation} onChange={(v) => setZarDepreciation(Number(v))} suffix="%"      min={0} max={20} />
          <InputField id="oa-yrs"   label="Investment horizon"            value={years} error={errors.years}           onChange={(v) => setYears(Number(v))}           suffix="yrs"    min={1} max={40} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <ResultPanel
            label={`${advantage >= 0 ? 'Offshore' : 'Local'} comes out ahead by`}
            value={formatRand(Math.abs(advantage), 0)}
            blocked={blocked}
            summary={<>
              After {years} years, {formatRand(zarAmount, 0)} invested in {currency} grows to about {formatRand(result.finalOffshore, 0)} in rand,
              against {formatRand(result.finalLocal, 0)} on the JSE.{' '}
              {advantage >= 0
                ? 'A weaker rand adds to the offshore return when the money is converted back.'
                : 'The higher local return more than makes up for the weaker rand at these rates.'}
            </>}
            figures={[
              { label: 'Offshore, in rand', value: formatRand(result.finalOffshore, 0) },
              { label: 'JSE, in rand', value: formatRand(result.finalLocal, 0) },
              { label: `Offshore, in ${currency}`, value: `${currencyInfo.symbol}${formatNumber(Math.round(result.usdFinal))}` },
              { label: `Rand per ${currency} in year ${years}`, value: formatRand(futureRate, 2) },
            ]}
          />

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
                  cursor={{ stroke: alpha(C.blue, 33), strokeWidth: 1 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="local"    name="Local (JSE)"               stroke={C.blue} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="offshore" name={`Offshore (${currency})`} stroke={C.teal}   strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <AssumptionsDrawer
            items={[
              <>You can take up to R1 million a year offshore under the single discretionary allowance without SARB approval, and up to R10 million more under the foreign investment allowance with a tax compliance status PIN.</>,
              <>Both investments grow at a steady yearly rate: {offshoreReturn}% in {currency} offshore and {localReturn}% on the JSE. Neither is guaranteed.</>,
              <>The rand weakens by {zarDepreciation}% a year against the {currency}, from {formatRand(spotRate, 2)} today to {formatRand(futureRate, 2)} in year {years}.</>,
              <>Not included: tax, fees and the cost of converting currency.</>,
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
}
