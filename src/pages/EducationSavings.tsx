import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, ReferenceLine,
} from 'recharts';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';
import { textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, positiveError, rangeError } from '../utils/validation';

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
  teal:    'var(--note-teal)',
  brown:  'var(--note-brown)',
};

const TOOLTIP_STYLE = {
  background:   'color-mix(in srgb, var(--paper-raised) 95%, transparent)',
  border:       '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
  borderRadius: 10,
  fontSize:     12,
  color:        'var(--ink)',
};

// Approximate 2024 costs (annual) — SA education
const PRESETS = [
  { label: 'University (public)',  costToday: 65_000,  inflation: 9.5  },
  { label: 'University (private)', costToday: 120_000, inflation: 8.5  },
  { label: 'Private School',       costToday: 85_000,  inflation: 10.0 },
  { label: 'Semi-private School',  costToday: 45_000,  inflation: 9.0  },
];

const VEHICLES = [
  { label: 'TFSA (tax-free, ~10-12% in ETFs)', rate: 11, limit: 46_000, cap: 500_000, taxFree: true },
  { label: 'Unit Trust / ETF (~12% p.a.)',      rate: 12, limit: Infinity, cap: Infinity, taxFree: false },
  { label: 'Endowment Policy (~8-9%)',          rate: 8.5, limit: Infinity, cap: Infinity, taxFree: false },
  { label: 'Money Market (~7%)',                rate: 7,  limit: Infinity, cap: Infinity, taxFree: false },
];

export function EducationSavings() {
  const [childAge,     setChildAge]     = useState(2);
  const [studyAge,     setStudyAge]     = useState(18);
  const [duration,     setDuration]     = useState(4);  // years of study
  const [presetIdx,    setPresetIdx]    = useState(0);
  const [vehicleIdx,   setVehicleIdx]   = useState(0);
  const [costToday,    setCostToday]    = useState(PRESETS[0].costToday);
  const [inflRate,     setInflRate]     = useState(PRESETS[0].inflation);
  const [currentSaved, setCurrentSaved] = useState(0);
  const [monthlySave,  setMonthlySave]  = useState(2_000);

  const vehicle       = VEHICLES[vehicleIdx];
  const yearsToStudy  = Math.max(0, studyAge - childAge);
  const monthsToStudy = yearsToStudy * 12;

  // Future cost of first year (education inflation)
  const firstYearCost = costToday * Math.pow(1 + inflRate / 100, yearsToStudy);

  // Total cost over duration (each year inflated from study start)
  const totalFutureCost = Array.from({ length: duration }, (_, i) =>
    costToday * Math.pow(1 + inflRate / 100, yearsToStudy + i)
  ).reduce((s, v) => s + v, 0);

  // Accumulation: current savings + monthly contributions
  const r = vehicle.rate / 100 / 12;
  const futureValue = currentSaved * Math.pow(1 + r, monthsToStudy)
    + (monthsToStudy > 0 && r > 0
      ? monthlySave * (Math.pow(1 + r, monthsToStudy) - 1) / r
      : monthlySave * monthsToStudy);

  const gap           = Math.max(0, totalFutureCost - futureValue);
  const isFunded      = futureValue >= totalFutureCost;
  const fundedPercent = totalFutureCost > 0 ? Math.min((futureValue / totalFutureCost) * 100, 100) : 0;

  // Required monthly to fully fund (solve for PMT)
  const requiredMonthly = monthsToStudy > 0 && r > 0
    ? ((totalFutureCost - currentSaved * Math.pow(1 + r, monthsToStudy)) * r)
      / (Math.pow(1 + r, monthsToStudy) - 1)
    : totalFutureCost / Math.max(1, monthsToStudy);

  // Chart: accumulated fund vs cost target
  const chartData = useMemo(() => {
    return Array.from({ length: yearsToStudy + 1 }, (_, yr) => {
      const months = yr * 12;
      const fv = currentSaved * Math.pow(1 + r, months)
        + (months > 0 && r > 0 ? monthlySave * (Math.pow(1 + r, months) - 1) / r : monthlySave * months);
      const target = totalFutureCost;
      return {
        year:   `Yr ${yr}`,
        fund:   Math.round(fv),
        target: Math.round(target),
      };
    });
  }, [currentSaved, monthlySave, r, yearsToStudy, totalFutureCost]);

  // TFSA vs Unit Trust comparison
  const compData = useMemo(() => {
    return VEHICLES.map((v) => {
      const rv  = v.rate / 100 / 12;
      const fv  = currentSaved * Math.pow(1 + rv, monthsToStudy)
        + (monthsToStudy > 0 && rv > 0
          ? monthlySave * (Math.pow(1 + rv, monthsToStudy) - 1) / rv
          : monthlySave * monthsToStudy);
      return { vehicle: v.label.split('(')[0].trim(), fv: Math.round(fv), rate: v.rate };
    });
  }, [currentSaved, monthlySave, monthsToStudy]);

  const errors = {
    costToday: positiveError(costToday, 'Enter the yearly cost today.'),
    inflRate: rangeError(inflRate, 0, 30, 'a yearly increase', '%'),
    currentSaved: nonNegativeError(currentSaved),
    monthlySave: nonNegativeError(monthlySave),
  };
  const blocked = errors.costToday ?? errors.inflRate ?? errors.currentSaved ?? errors.monthlySave;

  const applyPreset = (i: number) => {
    setPresetIdx(i);
    setCostToday(PRESETS[i].costToday);
    setInflRate(PRESETS[i].inflation);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--note-brown) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--note-brown) 25%, transparent)' }}>
            <GraduationCap size={20} className="text-note-brown-ink" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Education Savings Planner
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              Plan for SA education costs — inflation-adjusted, TFSA vs unit trust comparison
            </p>
          </div>
        </div>
      </motion.div>

      <ResultPanel
        label="Save each month to cover it all"
        value={formatRand(Math.max(0, requiredMonthly), 0)}
        blocked={blocked}
        summary={<>
          {duration} years of {PRESETS[presetIdx].label.toLowerCase()} starting in {yearsToStudy} years will cost about {formatRand(totalFutureCost, 0)}, with the first year at {formatRand(firstYearCost, 0)}.{' '}
          {yearsToStudy === 0
            ? 'Study starts now, so there is no time left to save; a lump sum or a study loan would be needed.'
            : isFunded
              ? `Saving ${formatRand(monthlySave, 0)} a month at ${vehicle.rate}% builds ${formatRand(futureValue, 0)}, which is ${formatRand(futureValue - totalFutureCost, 0)} more than you need.`
              : `Saving ${formatRand(monthlySave, 0)} a month at ${vehicle.rate}% builds ${formatRand(futureValue, 0)}, about ${fundedPercent.toFixed(0)}% of the cost.`}
        </>}
        figures={[
          { label: 'Total cost', value: formatRand(totalFutureCost, 0) },
          { label: 'Your fund when study starts', value: formatRand(futureValue, 0) },
          { label: isFunded ? 'More than needed' : 'Still short', value: formatRand(isFunded ? futureValue - totalFutureCost : gap, 0) },
          { label: 'You save now', value: `${formatRand(monthlySave, 0)}/mo` },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Plan Details</p>

          <div className="grid grid-cols-2 gap-3">
            <InputField id="cage" label="Child's Current Age" value={childAge}
              onChange={(v) => setChildAge(Math.max(0, parseInt(v) || 0))} suffix="yrs" />
            <InputField id="sage" label="Study Start Age" value={studyAge}
              onChange={(v) => setStudyAge(Math.max(childAge + 1, parseInt(v) || 18))} suffix="yrs" />
            <InputField id="dur"  label="Duration" value={duration}
              onChange={(v) => setDuration(Math.max(1, parseInt(v) || 3))} suffix="yrs" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ink-muted)' }}>Education Type</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, i) => (
                <button key={i} onClick={() => applyPreset(i)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: presetIdx === i ? 'color-mix(in srgb, var(--note-brown) 15%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                    color: textTone(presetIdx === i ? C.brown : 'var(--ink-muted)'),
                    border: `1px solid ${presetIdx === i ? 'color-mix(in srgb, var(--note-brown) 30%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputField id="cost" label="Annual Cost Today" value={costToday} error={errors.costToday}
              onChange={(v) => setCostToday(parseFloat(v) || 0)} prefix="R" />
            <InputField id="einfl" label="Education Inflation" value={inflRate} error={errors.inflRate}
              onChange={(v) => setInflRate(parseFloat(v) || 0)} suffix="%" step={0.5} />
            <InputField id="cur"  label="Currently Saved" value={currentSaved} error={errors.currentSaved}
              onChange={(v) => setCurrentSaved(parseFloat(v) || 0)} prefix="R" />
            <InputField id="mo"   label="Monthly Contribution" value={monthlySave} error={errors.monthlySave}
              onChange={(v) => setMonthlySave(parseFloat(v) || 0)} prefix="R" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ink-muted)' }}>Savings Vehicle</label>
            {VEHICLES.map((v, i) => (
              <button key={i} onClick={() => setVehicleIdx(i)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: vehicleIdx === i ? 'color-mix(in srgb, var(--note-blue) 10%, transparent)' : 'color-mix(in srgb, var(--ink) 3%, transparent)',
                  border: `1px solid ${vehicleIdx === i ? 'color-mix(in srgb, var(--note-blue) 30%, transparent)' : 'color-mix(in srgb, var(--ink) 7%, transparent)'}`,
                }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: vehicleIdx === i ? C.blue : 'var(--ink-subtle)' }} />
                <span className="text-xs flex-1" style={{ color: textTone(vehicleIdx === i ? C.blue : 'var(--ink-muted)') }}>
                  {v.label}
                </span>
              </button>
            ))}
          </div>

          {vehicleIdx === 0 && (
            <Link to="/tfsa" className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: textTone(C.green) }}>
              Maximise your TFSA <ArrowRight size={11} />
            </Link>
          )}
        </motion.div>

        {/* Vehicle comparison */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Vehicle Comparison (in {yearsToStudy} yrs)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={compData} layout="vertical" margin={{ top: 0, right: 10, left: 100, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
                <YAxis type="category" dataKey="vehicle" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} width={100} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
                <ReferenceLine x={totalFutureCost} stroke={C.red} strokeDasharray="5 4"
                  label={{ value: 'Target', position: 'top', fontSize: 9, fill: C.red }} />
                <Bar dataKey="fv" name="Projected Fund" fill={C.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--ink-subtle)' }}>
              Dashed line = total education cost. All use same {formatRand(monthlySave, 0)}/mo contribution.
            </p>
          </motion.div>

        </div>
      </div>

      {/* Build-up chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Savings Build-Up to Study Year
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
            <Line type="monotone" dataKey="fund"   name="Your Fund"         stroke={C.blue} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="target" name="Education Cost"    stroke={C.red}    strokeWidth={1.5} dot={false} strokeDasharray="5 4" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <AssumptionsDrawer
        items={[
          <>Costs rise by {inflRate}% a year until study starts and through each year of study. The presets are rough estimates, so use real fees where you have them.</>,
          <>Savings grow at {vehicle.rate}% a year, added monthly. The full cost is compared with the fund on the first day of study, which is cautious because money not yet spent would keep growing.</>,
          vehicle.taxFree
            ? <>A tax-free savings account has limits of {formatRand(vehicle.limit, 0)} a year and {formatRand(vehicle.cap, 0)} in a lifetime.</>
            : <>Tax on the growth is not included.</>,
          <>Fees are not included.</>,
        ]}
      />
    </div>
  );
}
