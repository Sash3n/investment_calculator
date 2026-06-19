import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, ReferenceLine,
} from 'recharts';
import { GraduationCap, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  cyan:    '#06B6D4',
  violet:  '#8B5CF6',
};

const TOOLTIP_STYLE = {
  background:   'rgba(15,20,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize:     12,
  color:        '#F1F5F9',
};

// Approximate 2024 costs (annual) — SA education
const PRESETS = [
  { label: 'University (public)',  costToday: 65_000,  inflation: 9.5  },
  { label: 'University (private)', costToday: 120_000, inflation: 8.5  },
  { label: 'Private School',       costToday: 85_000,  inflation: 10.0 },
  { label: 'Semi-private School',  costToday: 45_000,  inflation: 9.0  },
];

const VEHICLES = [
  { label: 'TFSA (tax-free, ~10-12% in ETFs)', rate: 11, limit: 36_000, cap: 500_000, taxFree: true },
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
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
            <GraduationCap size={20} className="text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Education Savings Planner
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Plan for SA education costs — inflation-adjusted, TFSA vs unit trust comparison
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '1st Year Cost (future)',  value: formatRand(firstYearCost, 0),   color: C.red,
            sub: `At ${inflRate}% education inflation` },
          { label: `Total (${duration} yrs)`, value: formatRand(totalFutureCost, 0), color: C.amber },
          { label: 'Projected Fund',          value: formatRand(futureValue, 0),     color: isFunded ? C.emerald : C.indigo },
          { label: isFunded ? 'Surplus' : 'Funding Gap', value: isFunded ? formatRand(futureValue - totalFutureCost, 0) : formatRand(gap, 0),
            color: isFunded ? C.emerald : C.red },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card-static p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-text-subtle)' }}>{kpi.label}</p>
            <p className="text-base font-bold leading-tight"
              style={{ color: kpi.color, fontFamily: 'var(--font-heading)' }}>{kpi.value}</p>
            {'sub' in kpi && kpi.sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{kpi.sub}</p>}
          </div>
        ))}
      </motion.div>

      {/* Status banner */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
        className="p-4 rounded-xl flex items-start gap-3"
        style={{
          background: isFunded ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)',
          border: `1px solid ${isFunded ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
        }}>
        {isFunded
          ? <CheckCircle2 size={16} style={{ color: C.emerald, flexShrink: 0, marginTop: 1 }} />
          : <AlertCircle  size={16} style={{ color: C.indigo, flexShrink: 0, marginTop: 1 }} />}
        <div>
          <p className="text-sm font-semibold"
            style={{ color: isFunded ? C.emerald : C.indigo }}>
            {isFunded
              ? `On track! Projected fund exceeds cost by ${formatRand(futureValue - totalFutureCost, 0)}`
              : `Increase monthly savings to ${formatRand(Math.max(0, requiredMonthly), 0)}/mo to fully fund education`}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {yearsToStudy > 0
              ? `${yearsToStudy} years to save · ${fundedPercent.toFixed(0)}% funded`
              : 'Study starts now — consider a lump sum or loan'}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Plan Details</p>

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
              style={{ color: 'var(--color-text-muted)' }}>Education Type</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, i) => (
                <button key={i} onClick={() => applyPreset(i)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: presetIdx === i ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                    color: presetIdx === i ? C.violet : 'var(--color-text-muted)',
                    border: `1px solid ${presetIdx === i ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputField id="cost" label="Annual Cost Today" value={costToday}
              onChange={(v) => setCostToday(parseFloat(v) || 0)} prefix="R" />
            <InputField id="einfl" label="Education Inflation" value={inflRate}
              onChange={(v) => setInflRate(parseFloat(v) || 0)} suffix="%" step={0.5} />
            <InputField id="cur"  label="Currently Saved" value={currentSaved}
              onChange={(v) => setCurrentSaved(parseFloat(v) || 0)} prefix="R" />
            <InputField id="mo"   label="Monthly Contribution" value={monthlySave}
              onChange={(v) => setMonthlySave(parseFloat(v) || 0)} prefix="R" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}>Savings Vehicle</label>
            {VEHICLES.map((v, i) => (
              <button key={i} onClick={() => setVehicleIdx(i)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: vehicleIdx === i ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${vehicleIdx === i ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
                }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: vehicleIdx === i ? C.indigo : '#475569' }} />
                <span className="text-xs flex-1" style={{ color: vehicleIdx === i ? C.indigo : 'var(--color-text-muted)' }}>
                  {v.label}
                </span>
              </button>
            ))}
          </div>

          {vehicleIdx === 0 && (
            <Link to="/tfsa" className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: C.emerald }}>
              Maximise your TFSA <ArrowRight size={11} />
            </Link>
          )}
        </motion.div>

        {/* Vehicle comparison */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Vehicle Comparison (in {yearsToStudy} yrs)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={compData} layout="vertical" margin={{ top: 0, right: 10, left: 100, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
                <YAxis type="category" dataKey="vehicle" tick={{ fontSize: 10, fill: '#94A3B8' }} width={100} />
                <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
                <ReferenceLine x={totalFutureCost} stroke={C.red} strokeDasharray="5 4"
                  label={{ value: 'Target', position: 'top', fontSize: 9, fill: C.red }} />
                <Bar dataKey="fv" name="Projected Fund" fill={C.indigo} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--color-text-subtle)' }}>
              Dashed line = total education cost. All use same {formatRand(monthlySave, 0)}/mo contribution.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="glass-card-static p-4 space-y-2">
            <p className="text-sm font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>Required Monthly</p>
            <p className="text-3xl font-extrabold"
              style={{ color: C.violet, fontFamily: 'var(--font-heading)' }}>
              {formatRand(Math.max(0, requiredMonthly), 0)}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              per month at {vehicle.rate}% p.a. to fully fund {duration} years of {PRESETS[presetIdx].label.toLowerCase()}
            </p>
            {!isFunded && monthlySave > 0 && (
              <p className="text-xs" style={{ color: C.amber }}>
                You're saving {formatRand(monthlySave, 0)}/mo — increase by {formatRand(Math.max(0, requiredMonthly - monthlySave), 0)}/mo
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Build-up chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          Savings Build-Up to Study Year
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)", stroke: "rgba(148,163,184,0.25)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            <Line type="monotone" dataKey="fund"   name="Your Fund"         stroke={C.indigo} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="target" name="Education Cost"    stroke={C.red}    strokeWidth={1.5} dot={false} strokeDasharray="5 4" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Education costs and inflation rates are estimates based on publicly available SA data. Not financial advice.
      </p>
    </div>
  );
}
