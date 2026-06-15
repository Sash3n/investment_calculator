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

interface ShareState {
  zarAmount:       number;
  spotRate:        number;
  offshoreReturn:  number;
  localReturn:     number;
  zarDepreciation: number;
  years:           number;
}

export function OffshoreAllowance() {
  const shared = readShareParam<ShareState>();

  const [zarAmount,       setZarAmount]       = useState(shared?.zarAmount       ?? 1_000_000);
  const [spotRate,        setSpotRate]        = useState(shared?.spotRate        ?? 18.50);
  const [offshoreReturn,  setOffshoreReturn]  = useState(shared?.offshoreReturn  ?? 12);
  const [localReturn,     setLocalReturn]     = useState(shared?.localReturn     ?? 10);
  const [zarDepreciation, setZarDepreciation] = useState(shared?.zarDepreciation ?? 4);
  const [years,           setYears]           = useState(shared?.years           ?? 10);

  const result = useMemo(() => {
    const usdInvested = zarAmount / spotRate;
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
    zarAmount, spotRate, offshoreReturn, localReturn, zarDepreciation, years,
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
          <div className="p-2.5 rounded-xl" style={{ background: `${C.cyan}22` }}>
            <Globe size={22} style={{ color: C.cyan }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Offshore Allowance Planner</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Model your R1M Single Discretionary Allowance: ZAR depreciation vs offshore returns.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
        style={{ background: `${C.cyan}11`, border: `1px solid ${C.cyan}33` }}>
        <Info size={16} style={{ color: C.cyan }} />
        <div style={{ color: 'var(--color-text-muted)' }}>
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>SA allowances: </span>
          R1,000,000/year Single Discretionary Allowance (no SARB approval) +
          R10,000,000/year Foreign Investment Allowance (SARB approval + Tax Compliance Status pin required).
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Scenario inputs
          </h2>
          <InputField id="oa-zar"   label="ZAR amount to invest"          value={zarAmount}       onChange={(v) => setZarAmount(Number(v))}       prefix="R"      min={1} />
          <InputField id="oa-spot"  label="Current ZAR/USD spot rate"     value={spotRate}        onChange={(v) => setSpotRate(Number(v))}        suffix="R/USD"  min={1} />
          <InputField id="oa-off"   label="Offshore return (USD p.a.)"    value={offshoreReturn}  onChange={(v) => setOffshoreReturn(Number(v))}  suffix="%"      min={0} max={40} />
          <InputField id="oa-local" label="Local JSE return (ZAR p.a.)"   value={localReturn}     onChange={(v) => setLocalReturn(Number(v))}     suffix="%"      min={0} max={40} />
          <InputField id="oa-dep"   label="ZAR depreciation p.a."         value={zarDepreciation} onChange={(v) => setZarDepreciation(Number(v))} suffix="%"      min={0} max={20} />
          <InputField id="oa-yrs"   label="Investment horizon"            value={years}           onChange={(v) => setYears(Number(v))}           suffix="yrs"    min={1} max={40} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Offshore final value (ZAR)" value={formatRandShort(result.finalOffshore)} color="indigo"  icon={Globe} />
            <StatCard label="Local final value (ZAR)"    value={formatRandShort(result.finalLocal)}    color="emerald" icon={TrendingUp} />
            <StatCard
              label={advantage >= 0 ? 'Offshore advantage' : 'Local advantage'}
              value={formatRandShort(Math.abs(advantage))}
              color={advantage >= 0 ? 'emerald' : 'amber'}
              icon={DollarSign}
            />
            <StatCard label={`USD value in ${years}yr`} value={`$${Math.round(result.usdFinal).toLocaleString()}`} color="indigo" icon={DollarSign} />
          </div>

          <div className="p-4 rounded-xl text-sm"
            style={{
              background: advantage >= 0 ? `${C.emerald}11` : '#F59E0B11',
              border:     `1px solid ${advantage >= 0 ? C.emerald : C.amber}33`,
            }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {advantage >= 0
                ? `Offshore investing outperforms by ${formatRandShort(advantage)} over ${years} years, driven by ZAR depreciation boosting USD returns when converted back.`
                : `Local investing outperforms by ${formatRandShort(Math.abs(advantage))} — higher local returns more than offset ZAR depreciation at these rates.`}
            </span>
          </div>

          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
              Local vs offshore (ZAR terms)
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={result.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `Yr ${v}`} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={formatRandShort} width={64} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [formatRand(Number(val)), '']}
                  labelFormatter={(l) => `Year ${l}`}
                  cursor={{ stroke: `${C.indigo}55`, strokeWidth: 1 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="local"    name="Local (JSE)"   stroke={C.indigo} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="offshore" name="Offshore (USD)" stroke={C.cyan}   strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
