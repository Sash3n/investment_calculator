import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Building2, AlertTriangle, Droplets } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { readShareParam } from '../utils/share';
import { alpha, RING_OF_FIVE, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { BreakdownList } from '../components/results/BreakdownList';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { municipalInputErrors } from '../utils/validation';

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
  teal:    'var(--note-teal)',
  brown:  'var(--note-brown)',
  rose:    'var(--note-red)',
  slate:   'var(--ink-subtle)',
};

const TOOLTIP_STYLE = {
  background:   'color-mix(in srgb, var(--paper-raised) 95%, transparent)',
  border:       '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
  borderRadius: 10,
  fontSize:     12,
  color:        'var(--ink)',
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
    id: 'coj', name: 'City of Johannesburg', shortName: 'Joburg', color: C.blue,
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
    id: 'coct', name: 'City of Cape Town', shortName: 'Cape Town', color: C.teal,
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
    id: 'cot', name: 'City of Tshwane', shortName: 'Tshwane', color: C.green,
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
    id: 'emm', name: 'Ekurhuleni Metro', shortName: 'Ekurhuleni', color: C.orange,
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
    id: 'ethekwini', name: 'eThekwini (Durban)', shortName: 'Durban', color: C.brown,
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
    id: 'nmb', name: 'Nelson Mandela Bay', shortName: 'NMB', color: C.rose,
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
    id: 'bcc', name: 'Buffalo City (East London)', shortName: 'Buffalo City', color: C.slate,
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

// Rates, water, sewerage, refuse, basic: a rotation of RING_OF_FIVE that keeps water teal.
// Each slice keeps its own colour when others drop out.
const [BASIC_C, RATES_C, WATER_C, SEWER_C, REFUSE_C] = RING_OF_FIVE;

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
    { name: 'Rates',          value: Math.round(bill.rates),    color: RATES_C },
    { name: 'Water',          value: Math.round(bill.water),    color: WATER_C },
    { name: 'Sewerage',       value: Math.round(bill.sewerage), color: SEWER_C },
    { name: 'Refuse',         value: Math.round(bill.refuse),   color: REFUSE_C },
    { name: 'Basic services', value: Math.round(bill.basic),    color: BASIC_C },
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

  const errors  = municipalInputErrors({ propValue, waterKl, electricityBasic, escalation, rateInRand: activeRate });
  const blocked = errors.propValue ?? errors.waterKl ?? errors.rateInRand;
  const cheapest = comparisonData.reduce((min, c) => c.total < min.total ? c : min, comparisonData[0]);
  const movingSaving = cheapest.name === city.shortName ? 0 : billTotal - cheapest.total;
  const services = bill.sewerage + bill.refuse + bill.basic;

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
          <div className="p-2.5 rounded-xl" style={{ background: alpha(C.green, 13) }}>
            <Building2 size={22} style={{ color: textTone(C.green) }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
              Municipal Rates Calculator
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Estimate monthly property rates and services across 7 SA municipalities.
            </p>
          </div>
        </div>
        <ShareButton state={{ propValue, cityId, rebateType, waterKl, escalation }} />
      </div>

      {/* Tariff year badge */}
      <div
        className="flex items-start gap-3 p-3 rounded-xl text-xs"
        style={{ background: alpha(C.orange, 7), border: `1px solid ${alpha(C.orange, 20)}` }}
      >
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: textTone(C.orange) }} />
        <span style={{ color: 'var(--ink-muted)' }}>
          Tariffs are approximate 2025/26 estimates for residential properties.
          {estimated && ` ${city.name} rates are estimated — verify with your municipality.`}
          {' '}Water tiers exclude VAT. These are illustrations only — consult your municipality for exact billing.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div
          className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            Property details
          </h2>

          <InputField id="mr-val" label="Municipal property value (R)" value={propValue} error={errors.propValue}
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

          <InputField id="mr-water" label="Monthly water usage (kL)" value={waterKl} error={errors.waterKl}
            onChange={(v) => setWaterKl(Number(v))} suffix="kL" min={0} max={100} />

          <hr style={{ borderColor: 'var(--rule)' }} />

          <div>
            <label htmlFor="mr-rate" className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-muted)' }}>
              Rate in the rand (override)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="mr-rate"
                type="number"
                aria-invalid={errors.rateInRand ? true : undefined}
                aria-describedby={errors.rateInRand ? "mr-rate-error" : undefined}
                step={0.000001}
                min={0}
                value={customRate !== null ? customRate : city.rateInRand}
                onChange={(e) => setCustomRate(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--rule)',
                  color: 'var(--ink)',
                }}
              />
              {customRate !== null && (
                <button
                  onClick={() => setCustomRate(null)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: alpha(C.orange, 13), color: textTone(C.orange) }}
                >
                  Reset
                </button>
              )}
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--ink-muted)' }}>
              Default: {city.rateInRand.toFixed(6)} — edit if your notice of assessment differs.
            </p>
            {errors.rateInRand && <p id="mr-rate-error" className="text-xs font-medium text-loss-ink mt-1" aria-live="polite">{errors.rateInRand}</p>}
          </div>

          <InputField id="mr-elec" label="Electricity basic charge (monthly)" value={electricityBasic} error={errors.electricityBasic}
            onChange={(v) => setElectricityBasic(Number(v))} prefix="R" min={0} />

          <div
            className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: alpha(C.teal, 7), border: `1px solid ${alpha(C.teal, 13)}` }}
          >
            <Droplets size={13} style={{ color: textTone(C.teal) }} />
            <span style={{ color: 'var(--ink-muted)' }}>
              Average SA household uses 15–20 kL/month.
              First {city.waterTiers[0].upTo} kL free in {city.shortName}.
            </span>
          </div>

          <hr style={{ borderColor: 'var(--rule)' }} />

          <InputField id="mr-esc" label="Annual tariff escalation (for projection)" value={escalation} error={errors.escalation}
            onChange={(v) => setEscalation(Number(v))} suffix="%" min={0} max={25} />

          {/* City rebate & rate reference */}
          <div
            className="p-3 rounded-xl text-xs space-y-1"
            style={{ background: alpha(city.color, 7), border: `1px solid ${alpha(city.color, 20)}` }}
          >
            <div className="font-semibold" style={{ color: textTone(city.color) }}>{city.name}</div>
            <div className="flex justify-between" style={{ color: 'var(--ink-muted)' }}>
              <span>Rate in the rand</span>
              <span style={{ color: 'var(--ink)' }}>{city.rateInRand.toFixed(6)}{city.rateEstimated ? '*' : ''}</span>
            </div>
            <div className="flex justify-between" style={{ color: 'var(--ink-muted)' }}>
              <span>Standard rebate</span>
              <span style={{ color: 'var(--ink)' }}>{formatRandShort(city.rebateStd)}</span>
            </div>
            <div className="flex justify-between" style={{ color: 'var(--ink-muted)' }}>
              <span>Rateable value</span>
              <span style={{ color: 'var(--ink)' }}>{formatRandShort(bill.rateableValue)}</span>
            </div>
            {city.rateEstimated && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--ink-muted)' }}>
                * Estimated tariff — verify at {city.shortName} municipal website.
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-5">
          <ResultPanel
            label={`Monthly bill in ${city.shortName}`}
            value={formatRand(billTotal, 0)}
            blocked={blocked}
            summary={rebateType === 'indigent'
              ? 'Registered indigent households pay no property rates and get a free basic allocation of water, electricity, sewerage and refuse removal. Who qualifies differs by municipality.'
              : <>
                  Property rates are {formatRand(bill.rates, 0)} of that, charged on {formatRand(bill.rateableValue, 0)} after the first {formatRand(city.rebateStd, 0)} of the value is excluded.
                  {movingSaving > 50 && ` The same property would cost about ${formatRand(movingSaving, 0)} a month less in ${cheapest.name}.`}
                </>}
            figures={[
              { label: 'Each year', value: formatRand(billTotal * 12, 0) },
              { label: 'Property rates', value: formatRand(bill.rates, 0) },
              { label: 'Water', value: formatRand(bill.water, 0) },
              { label: 'Sewerage, refuse, basic', value: formatRand(services, 0) },
            ]}
          />

          {/* Bill breakdown + Donut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BreakdownList
              title="Monthly breakdown"
              lines={[
                { label: 'Property rates', value: bill.rates },
                { label: 'Water', value: bill.water, note: `${waterKl} kL, excluding VAT` },
                { label: 'Sewerage', value: bill.sewerage },
                { label: 'Refuse removal', value: bill.refuse },
                { label: 'Basic services', value: bill.basic },
                ...(electricityBasic > 0 ? [{ label: 'Electricity basic charge', value: electricityBasic }] : []),
              ]}
              total={{ label: 'Total each month', value: billTotal }}
            />

            {/* Donut chart */}
            <div
              className="p-5 rounded-2xl flex flex-col"
              style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}
            >
              <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Bill composition</h2>
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
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val) => [formatRand(Number(val)), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span style={{ color: 'var(--ink-muted)' }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* City comparison bar chart */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}
          >
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              City comparison — same property value across all municipalities
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
              Monthly total bill at {formatRandShort(propValue)} municipal value, {rebateType} rebate, {waterKl} kL water.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={comparisonData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} tickFormatter={(v) => `R${(v / 1000).toFixed(1)}k`} width={52} />
                <ReTooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [formatRand(Number(val)), 'Monthly total']}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {comparisonData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={MUNICIPALITIES.find((m) => m.shortName === entry.name)?.color ?? C.blue}
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
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                5-year cost projection
              </h2>
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
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
                        style={{ color: 'var(--ink-muted)', borderBottom: '1px solid var(--rule)' }}
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
                          color: textTone(i === 0 ? C.blue : 'var(--ink)'),
                          fontWeight: i === 0 ? 600 : 400,
                          borderBottom: '1px solid var(--rule)',
                        }}>
                          {row.year}
                        </td>
                        <td className="py-2 pr-4" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--rule)' }}>
                          {formatRand(row.monthly)}
                        </td>
                        <td className="py-2 pr-4" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--rule)' }}>
                          {formatRandShort(row.annual)}
                        </td>
                        <td className="py-2" style={{
                          color: textTone(i === 0 ? 'var(--ink-muted)' : C.red),
                          borderBottom: '1px solid var(--rule)',
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
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
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
                    style={{ background: alpha(C.teal, 7), border: `1px solid ${alpha(C.teal, 13)}` }}
                  >
                    <span style={{ color: 'var(--ink-muted)' }}>{rangeLabel}</span>
                    <span style={{ color: textTone(tier.rate === 0 ? C.green : 'var(--ink)'), fontWeight: 500 }}>
                      {tier.rate === 0 ? 'Free' : `R${tier.rate.toFixed(2)}/kL`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--ink-muted)' }}>
              Rates are excl. VAT. Your usage of {waterKl} kL costs {formatRand(bill.water)}/month in {city.shortName}.
            </p>
          </div>

          <AssumptionsDrawer
            items={[
              <>Tariffs are the {city.tariffYear} residential figures{estimated ? `, and the ${city.shortName} rate in the rand is estimated` : ''}. Municipalities set new tariffs every July, so compare with your latest municipal account.</>,
              <>Rates are the municipal value less the first {formatRand(city.rebateStd, 0)} the city excludes, times the rate in the rand{rebateType === 'pensioner' ? `, less the ${city.rebatePct}% pensioner rebate` : ''}.</>,
              <>Water uses the city’s stepped tariff for {waterKl} kL a month, excluding VAT. Sewerage, refuse and basic services are flat monthly amounts.</>,
              <>The 5-year projection grows the whole bill by {escalation}% a year.</>,
              <>Not included: electricity you use, VAT on services, body corporate levies and special rating area levies.</>,
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
}
