import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Building2, Info, AlertTriangle, TrendingUp, Droplets } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { readShareParam } from '../utils/share';

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  cyan:    '#06B6D4',
  violet:  '#8B5CF6',
  pink:    '#EC4899',
  teal:    '#14B8A6',
};

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

// ── Water tier types ───────────────────────────────────────────────────────────
interface WaterTier {
  upTo:    number;   // kL (Infinity for last tier)
  rate:    number;   // R per kL
}

// ── Municipality config ────────────────────────────────────────────────────────
interface Municipality {
  id:            string;
  name:          string;
  shortName:     string;
  color:         string;
  rateInRand:    number;
  rebateStd:     number;
  rebatePct:     number;   // extra % off rates for pensioners (after std rebate)
  refuse:        number;   // R/month
  sewerage:      number;   // R/month
  basicService:  number;   // R/month (admin / basic service levy)
  waterTiers:    WaterTier[];
  tariffYear:    string;
  rateEstimated: boolean;
}

const MUNICIPALITIES: Municipality[] = [
  {
    id: 'coj', name: 'City of Johannesburg', shortName: 'Joburg', color: C.indigo,
    rateInRand: 0.009545, rebateStd: 300_000, rebatePct: 30,
    refuse: 285, sewerage: 255, basicService: 120,
    tariffYear: '2025/26', rateEstimated: false,
    waterTiers: [
      { upTo: 6,        rate: 0     },
      { upTo: 10,       rate: 12.84 },
      { upTo: 15,       rate: 19.26 },
      { upTo: 20,       rate: 22.79 },
      { upTo: 30,       rate: 28.96 },
      { upTo: Infinity, rate: 36.40 },
    ],
  },
  {
    id: 'coct', name: 'City of Cape Town', shortName: 'Cape Town', color: C.cyan,
    rateInRand: 0.007055, rebateStd: 450_000, rebatePct: 50,
    refuse: 265, sewerage: 325, basicService: 100,
    tariffYear: '2025/26', rateEstimated: false,
    waterTiers: [
      { upTo: 6,        rate: 0     },
      { upTo: 10.5,     rate: 14.92 },
      { upTo: 35,       rate: 22.68 },
      { upTo: 50,       rate: 31.66 },
      { upTo: Infinity, rate: 47.64 },
    ],
  },
  {
    id: 'cot', name: 'City of Tshwane', shortName: 'Tshwane', color: C.emerald,
    rateInRand: 0.009100, rebateStd: 200_000, rebatePct: 25,
    refuse: 225, sewerage: 205, basicService: 95,
    tariffYear: '2025/26', rateEstimated: true,
    waterTiers: [
      { upTo: 6,        rate: 0     },
      { upTo: 10,       rate: 11.50 },
      { upTo: 15,       rate: 17.20 },
      { upTo: 20,       rate: 21.00 },
      { upTo: 30,       rate: 27.50 },
      { upTo: Infinity, rate: 34.80 },
    ],
  },
  {
    id: 'emm', name: 'Ekurhuleni Metro', shortName: 'Ekurhuleni', color: C.amber,
    rateInRand: 0.009800, rebateStd: 250_000, rebatePct: 25,
    refuse: 245, sewerage: 225, basicService: 90,
    tariffYear: '2025/26', rateEstimated: true,
    waterTiers: [
      { upTo: 6,        rate: 0     },
      { upTo: 10,       rate: 12.10 },
      { upTo: 15,       rate: 18.00 },
      { upTo: 20,       rate: 22.50 },
      { upTo: 30,       rate: 28.80 },
      { upTo: Infinity, rate: 36.00 },
    ],
  },
  {
    id: 'ethekwini', name: 'eThekwini (Durban)', shortName: 'Durban', color: C.violet,
    rateInRand: 0.010850, rebateStd: 200_000, rebatePct: 20,
    refuse: 205, sewerage: 235, basicService: 85,
    tariffYear: '2025/26', rateEstimated: true,
    waterTiers: [
      { upTo: 9,        rate: 0     },
      { upTo: 15,       rate: 11.20 },
      { upTo: 30,       rate: 17.80 },
      { upTo: 45,       rate: 24.50 },
      { upTo: Infinity, rate: 32.90 },
    ],
  },
  {
    id: 'nmb', name: 'Nelson Mandela Bay', shortName: 'NMB', color: C.pink,
    rateInRand: 0.012500, rebateStd: 150_000, rebatePct: 20,
    refuse: 185, sewerage: 195, basicService: 80,
    tariffYear: '2025/26', rateEstimated: true,
    waterTiers: [
      { upTo: 6,        rate: 0     },
      { upTo: 10,       rate: 10.80 },
      { upTo: 20,       rate: 16.40 },
      { upTo: 30,       rate: 22.00 },
      { upTo: Infinity, rate: 30.50 },
    ],
  },
  {
    id: 'bcc', name: 'Buffalo City (East London)', shortName: 'Buffalo City', color: C.teal,
    rateInRand: 0.011000, rebateStd: 150_000, rebatePct: 20,
    refuse: 175, sewerage: 185, basicService: 75,
    tariffYear: '2025/26', rateEstimated: true,
    waterTiers: [
      { upTo: 6,        rate: 0     },
      { upTo: 10,       rate: 10.20 },
      { upTo: 20,       rate: 15.80 },
      { upTo: 30,       rate: 21.00 },
      { upTo: Infinity, rate: 29.00 },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcWater(kl: number, tiers: WaterTier[]): number {
  let cost = 0;
  let prev = 0;
  for (const tier of tiers) {
    if (kl <= prev) break;
    const used = Math.min(kl, tier.upTo) - prev;
    cost += used * tier.rate;
    prev = tier.upTo;
    if (!isFinite(tier.upTo)) break;
  }
  return cost;
}

function calcBill(
  m:         Municipality,
  propValue: number,
  rebateType: 'standard' | 'pensioner' | 'indigent',
  waterKl:   number,
) {
  if (rebateType === 'indigent') {
    return { rates: 0, refuse: 0, sewerage: 0, water: 0, basic: 0, total: 0, rateableValue: 0 };
  }

  const rateableValue = Math.max(0, propValue - m.rebateStd);
  let annualRates = rateableValue * m.rateInRand;
  if (rebateType === 'pensioner') annualRates *= (1 - m.rebatePct / 100);
  const monthlyRates = annualRates / 12;

  const water = calcWater(waterKl, m.waterTiers);

  const total = monthlyRates + m.refuse + m.sewerage + water + m.basicService;
  return {
    rates:        monthlyRates,
    refuse:       m.refuse,
    sewerage:     m.sewerage,
    water,
    basic:        m.basicService,
    total,
    rateableValue,
  };
}

const DONUT_COLORS = [C.indigo, C.cyan, C.emerald, C.amber, C.violet];

// ── Share state ────────────────────────────────────────────────────────────────
interface ShareState {
  propValue:   number;
  cityId:      string;
  rebateType:  string;
  waterKl:     number;
  escalation:  number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MunicipalRates() {
  const shared = readShareParam<ShareState>();

  const [propValue,       setPropValue]       = useState(shared?.propValue  ?? 1_500_000);
  const [cityId,          setCityId]          = useState(shared?.cityId     ?? 'coj');
  const [rebateType,      setRebateType]      = useState<'standard' | 'pensioner' | 'indigent'>(
    (shared?.rebateType as 'standard' | 'pensioner' | 'indigent') ?? 'standard',
  );
  const [waterKl,         setWaterKl]         = useState(shared?.waterKl    ?? 15);
  const [escalation,      setEscalation]      = useState(shared?.escalation ?? 8);
  const [electricityBasic, setElectricityBasic] = useState(0);
  const [customRate,       setCustomRate]       = useState<number | null>(null);

  // Memoize city lookup so its reference is stable — otherwise useMemos that depend on it
  // recompute on every render even when cityId hasn't changed
  const city      = useMemo(() => MUNICIPALITIES.find((m) => m.id === cityId) ?? MUNICIPALITIES[0], [cityId]);
  const activeRate = customRate !== null ? customRate : city.rateInRand;

  const cityWithCustomRate = useMemo(
    () => ({ ...city, rateInRand: activeRate }),
    [city, activeRate],
  );

  const bill = useMemo(
    () => calcBill(cityWithCustomRate, propValue, rebateType, waterKl),
    [cityWithCustomRate, propValue, rebateType, waterKl],
  );

  const billTotal = bill.total + electricityBasic;

  // Donut chart data
  const donutData = useMemo(() => [
    { name: 'Rates',          value: Math.round(bill.rates),    color: C.indigo  },
    { name: 'Water',          value: Math.round(bill.water),    color: C.cyan    },
    { name: 'Sewerage',       value: Math.round(bill.sewerage), color: C.emerald },
    { name: 'Refuse',         value: Math.round(bill.refuse),   color: C.amber   },
    { name: 'Basic services', value: Math.round(bill.basic),    color: C.violet  },
  ].filter((d) => d.value > 0), [bill]);

  // City comparison bar data — include electricityBasic so the saving callout is apples-to-apples
  const comparisonData = useMemo(() =>
    MUNICIPALITIES.map((m) => {
      const mEff = m.id === cityId ? cityWithCustomRate : m;
      const b = calcBill(mEff, propValue, rebateType, waterKl);
      return { name: m.shortName, total: Math.round(b.total + electricityBasic), rates: Math.round(b.rates), color: m.color };
    }),
  [cityId, cityWithCustomRate, propValue, rebateType, waterKl, electricityBasic]);

  // 5-year projection
  const projectionRows = useMemo(() => {
    const rows = [];
    let monthly = billTotal;
    for (let y = 0; y <= 5; y++) {
      rows.push({
        year:    y === 0 ? 'Current' : `Year ${y}`,
        monthly: Math.round(monthly),
        annual:  Math.round(monthly * 12),
      });
      monthly *= (1 + escalation / 100);
    }
    return rows;
  }, [billTotal, escalation]);


  const estimated = city.rateEstimated;

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${C.emerald}22` }}>
            <Building2 size={22} style={{ color: C.emerald }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
              Municipal Rates Calculator
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Estimate monthly property rates and services across 7 SA municipalities.
            </p>
          </div>
        </div>
        <ShareButton state={{ propValue, cityId, rebateType, waterKl, escalation }} />
      </div>

      {/* Tariff year badge */}
      <div
        className="flex items-start gap-3 p-3 rounded-xl text-xs"
        style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}33` }}
      >
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: C.amber }} />
        <span style={{ color: 'var(--color-text-muted)' }}>
          Tariffs are approximate 2025/26 estimates for residential properties.
          {estimated && ` ${city.name} rates are estimated — verify with your municipality.`}
          {' '}Water tiers exclude VAT. These are illustrations only — consult your municipality for exact billing.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div
          className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Property details
          </h2>

          <InputField id="mr-val" label="Municipal property value (R)" value={propValue}
            onChange={(v) => setPropValue(Number(v))} prefix="R" min={0} />

          <SelectField id="mr-city" label="Municipality" value={cityId} onChange={(v) => { setCityId(v); setCustomRate(null); }}
            options={MUNICIPALITIES.map((m) => ({ value: m.id, label: m.name }))} />

          <SelectField
            id="mr-rebate"
            label="Rebate type"
            value={rebateType}
            onChange={(v) => setRebateType(v as 'standard' | 'pensioner' | 'indigent')}
            options={[
              { value: 'standard',  label: 'Standard residential' },
              { value: 'pensioner', label: `Pensioner (extra ${city.rebatePct}% off rates)` },
              { value: 'indigent',  label: 'Indigent (full exemption)' },
            ]}
          />

          <InputField id="mr-water" label="Monthly water usage (kL)" value={waterKl}
            onChange={(v) => setWaterKl(Number(v))} suffix="kL" min={0} max={100} />

          <hr style={{ borderColor: 'var(--color-border)' }} />

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Rate in the rand (override)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={0.000001}
                min={0}
                value={customRate !== null ? customRate : city.rateInRand}
                onChange={(e) => setCustomRate(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
              {customRate !== null && (
                <button
                  onClick={() => setCustomRate(null)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: `${C.amber}22`, color: C.amber }}
                >
                  Reset
                </button>
              )}
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Default: {city.rateInRand.toFixed(6)} — edit if your notice of assessment differs.
            </p>
          </div>

          <InputField id="mr-elec" label="Electricity basic charge (monthly)" value={electricityBasic}
            onChange={(v) => setElectricityBasic(Number(v))} prefix="R" min={0} />

          <div
            className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${C.cyan}11`, border: `1px solid ${C.cyan}22` }}
          >
            <Droplets size={13} style={{ color: C.cyan }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              Average SA household uses 15–20 kL/month.
              First {city.waterTiers[0].upTo} kL free in {city.shortName}.
            </span>
          </div>

          <hr style={{ borderColor: 'var(--color-border)' }} />

          <InputField id="mr-esc" label="Annual tariff escalation (for projection)" value={escalation}
            onChange={(v) => setEscalation(Number(v))} suffix="%" min={0} max={25} />

          {/* City rebate & rate reference */}
          <div
            className="p-3 rounded-xl text-xs space-y-1"
            style={{ background: `${city.color}11`, border: `1px solid ${city.color}33` }}
          >
            <div className="font-semibold" style={{ color: city.color }}>{city.name}</div>
            <div className="flex justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <span>Rate in the rand</span>
              <span style={{ color: 'var(--color-text)' }}>{city.rateInRand.toFixed(6)}{city.rateEstimated ? '*' : ''}</span>
            </div>
            <div className="flex justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <span>Standard rebate</span>
              <span style={{ color: 'var(--color-text)' }}>{formatRandShort(city.rebateStd)}</span>
            </div>
            <div className="flex justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <span>Rateable value</span>
              <span style={{ color: 'var(--color-text)' }}>{formatRandShort(bill.rateableValue)}</span>
            </div>
            {city.rateEstimated && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                * Estimated tariff — verify at {city.shortName} municipal website.
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-5">
          {/* Indigent notice */}
          {rebateType === 'indigent' && (
            <div
              className="p-4 rounded-xl text-sm"
              style={{ background: `${C.emerald}11`, border: `1px solid ${C.emerald}33` }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>
                Indigent households registered with the municipality receive a full exemption from property rates and
                a free basic allocation of water, electricity, sewerage and refuse removal.
                Eligibility criteria vary per municipality.
              </span>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Monthly total"  value={formatRand(billTotal)}           color="indigo"  icon={Building2} />
            <StatCard label="Annual total"   value={formatRandShort(billTotal * 12)} color="emerald" icon={TrendingUp} />
            <StatCard label="Monthly rates"  value={formatRand(bill.rates)}          color="indigo"  icon={Building2} />
            <StatCard label="Monthly water"  value={formatRand(bill.water)}          color="emerald" icon={Droplets} />
          </div>

          {/* Move-city callout */}
          {(() => {
            const cheapest = comparisonData.reduce((min, c) => c.total < min.total ? c : min, comparisonData[0]);
            const saving   = billTotal - cheapest.total;
            if (saving <= 50 || cheapest.name === city.shortName) return null;
            return (
              <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
                style={{ background: `${C.emerald}11`, border: `1px solid ${C.emerald}33` }}>
                <TrendingUp size={15} style={{ color: C.emerald }} />
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Moving to{' '}
                  <span style={{ color: C.emerald, fontWeight: 600 }}>{cheapest.name}</span>
                  {' '}could save you{' '}
                  <span style={{ color: C.emerald, fontWeight: 600 }}>{formatRand(saving)}/month</span>
                  {' '}({formatRandShort(saving * 12)}/year) on the same property value.
                </span>
              </div>
            );
          })()}

          {/* Bill breakdown + Donut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Breakdown table */}
            <div
              className="p-5 rounded-2xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Monthly breakdown</h2>
              <div className="space-y-0 text-sm">
                {[
                  { label: 'Property rates',        value: bill.rates,        color: C.indigo  },
                  { label: 'Water',                 value: bill.water,        color: C.cyan    },
                  { label: 'Sewerage',              value: bill.sewerage,     color: C.emerald },
                  { label: 'Refuse removal',        value: bill.refuse,       color: C.amber   },
                  { label: 'Basic services',        value: bill.basic,        color: C.violet  },
                  ...(electricityBasic > 0 ? [{ label: 'Electricity basic', value: electricityBasic, color: C.teal }] : []),
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center py-2"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                    </div>
                    <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{formatRand(value)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Total</span>
                  <span className="font-semibold" style={{ color: C.indigo }}>{formatRand(billTotal)}</span>
                </div>
              </div>
            </div>

            {/* Donut chart */}
            <div
              className="p-5 rounded-2xl flex flex-col"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Bill composition</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={entry.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val) => [formatRand(Number(val)), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* City comparison bar chart */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              City comparison — same property value across all municipalities
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Monthly total bill at {formatRandShort(propValue)} municipal value, {rebateType} rebate, {waterKl} kL water.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={comparisonData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `R${(v / 1000).toFixed(1)}k`} width={52} />
                <ReTooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [formatRand(Number(val)), 'Monthly total']}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {comparisonData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={MUNICIPALITIES.find((m) => m.shortName === entry.name)?.color ?? C.indigo}
                      opacity={entry.name === city.shortName ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 5-year projection */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                5-year cost projection
              </h2>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {escalation}% annual tariff escalation
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Period', 'Monthly bill', 'Annual bill', 'vs Today'].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectionRows.map((row, i) => {
                    const increase = row.monthly - projectionRows[0].monthly;
                    return (
                      <tr key={row.year}>
                        <td className="py-2 pr-4" style={{
                          color: i === 0 ? C.indigo : 'var(--color-text)',
                          fontWeight: i === 0 ? 600 : 400,
                          borderBottom: '1px solid var(--color-border)',
                        }}>
                          {row.year}
                        </td>
                        <td className="py-2 pr-4" style={{ color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>
                          {formatRand(row.monthly)}
                        </td>
                        <td className="py-2 pr-4" style={{ color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>
                          {formatRandShort(row.annual)}
                        </td>
                        <td className="py-2" style={{
                          color: i === 0 ? 'var(--color-text-muted)' : C.red,
                          borderBottom: '1px solid var(--color-border)',
                        }}>
                          {i === 0 ? '--' : `+${formatRand(increase)}/mo`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Water tier reference */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
              {city.shortName} water tariff tiers (2025/26)
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {city.waterTiers.map((tier, i) => {
                const prevLimit = i === 0 ? 0 : city.waterTiers[i - 1].upTo;
                const rangeLabel = isFinite(tier.upTo)
                  ? `${prevLimit} – ${tier.upTo} kL`
                  : `${prevLimit}+ kL`;
                return (
                  <div
                    key={i}
                    className="flex justify-between items-center p-2 rounded-lg"
                    style={{ background: `${C.cyan}11`, border: `1px solid ${C.cyan}22` }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>{rangeLabel}</span>
                    <span style={{ color: tier.rate === 0 ? C.emerald : 'var(--color-text)', fontWeight: 500 }}>
                      {tier.rate === 0 ? 'Free' : `R${tier.rate.toFixed(2)}/kL`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Rates are excl. VAT. Your usage of {waterKl} kL costs {formatRand(bill.water)}/month in {city.shortName}.
            </p>
          </div>

          <div
            className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${C.indigo}11`, border: `1px solid ${C.indigo}22` }}
          >
            <Info size={13} style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              This tool estimates residential property rates only. It excludes electricity usage charges, body corporate levies,
              and special rating area (SRA) levies. Electricity basic connection charges and VAT on services are not included.
              Always verify your bill against your official municipal statement.
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
