import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { formatRand, formatRandShort } from '../utils/format';
import { alpha, textTone } from '../utils/color';

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

const VEHICLES = [
  { label: 'Money Market (6% p.a.)',       rate: 6   },
  { label: 'High-Interest Savings (7%)',   rate: 7   },
  { label: 'Notice Deposit (8.5%)',        rate: 8.5 },
  { label: 'Unit Trust / MMTF (8%)',       rate: 8   },
];

export function EmergencyFund() {
  const [monthlyExpenses, setMonthlyExpenses] = useState(18_000);
  const [targetMonths,    setTargetMonths]    = useState(6);
  const [currentSaved,    setCurrentSaved]    = useState(10_000);
  const [monthlySave,     setMonthlySave]     = useState(1_500);
  const [vehicleIdx,      setVehicleIdx]      = useState(0);
  const [jobSecurity,     setJobSecurity]     = useState<'stable' | 'moderate' | 'risky'>('moderate');

  const vehicle      = VEHICLES[vehicleIdx];
  const target       = monthlyExpenses * targetMonths;
  const gap          = Math.max(0, target - currentSaved);
  const pctFunded    = target > 0 ? Math.min((currentSaved / target) * 100, 100) : 0;
  const monthlyRate  = vehicle.rate / 100 / 12;

  // Months to reach target
  const monthsToTarget = useMemo(() => {
    if (gap <= 0) return 0;
    if (monthlySave <= 0) return Infinity;
    // FV with interest: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
    // Solve for n numerically
    let bal = currentSaved;
    let m   = 0;
    while (bal < target && m < 600) {
      bal = bal * (1 + monthlyRate) + monthlySave;
      m++;
    }
    return m;
  }, [currentSaved, target, monthlySave, monthlyRate, gap]);

  // Build-up chart
  const chartData = useMemo(() => {
    const months = Math.min(Math.max(monthsToTarget + 6, 24), 120);
    let bal = currentSaved;
    return Array.from({ length: months + 1 }, (_, i) => {
      const v = { month: i, balance: Math.round(bal), target: Math.round(target) };
      if (i < months) bal = bal * (1 + monthlyRate) + monthlySave;
      return v;
    });
  }, [currentSaved, monthlySave, monthlyRate, target, monthsToTarget]);

  const recommendedMonths = jobSecurity === 'stable' ? 3 : jobSecurity === 'moderate' ? 6 : 9;
  const adequacy = targetMonths >= recommendedMonths;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'color-mix(in srgb, var(--gain) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--gain) 25%, transparent)' }}>
            <Shield size={20} className="text-gain-ink" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Emergency Fund Planner
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}>
              How much you need, how long to build it, and where to keep it
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Target Fund',        value: formatRand(target, 0),             color: C.blue },
          { label: 'Currently Saved',    value: formatRand(currentSaved, 0),       color: pctFunded >= 100 ? C.green : pctFunded >= 50 ? C.orange : C.red },
          { label: 'Gap to Fill',        value: gap > 0 ? formatRand(gap, 0) : 'Funded!', color: gap > 0 ? C.red : C.green },
          { label: 'Months to Goal',     value: gap <= 0 ? 'Done!' : monthsToTarget === Infinity ? '∞' : `${monthsToTarget} mo`,
            color: gap <= 0 ? C.green : monthsToTarget < 24 ? C.orange : C.red,
            sub: monthsToTarget < Infinity && monthsToTarget > 0 ? `${(monthsToTarget / 12).toFixed(1)} yrs` : '' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card-static p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--ink-subtle)' }}>{kpi.label}</p>
            <p className="text-base font-bold leading-tight"
              style={{ color: textTone(kpi.color), fontFamily: 'var(--font-display)' }}>{kpi.value}</p>
            {'sub' in kpi && kpi.sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-subtle)' }}>{kpi.sub}</p>}
          </div>
        ))}
      </motion.div>

      {/* Progress bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
        <div className="flex items-center justify-between text-xs mb-2">
          <span style={{ color: 'var(--ink-muted)' }}>Fund Progress</span>
          <span style={{ color: textTone(pctFunded >= 100 ? C.green : C.orange), fontWeight: 700 }}>
            {pctFunded.toFixed(1)}% funded
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctFunded}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: pctFunded >= 100 ? C.green : pctFunded >= 50 ? C.orange : C.red }}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
          className="glass-card p-5 space-y-4">
          <p className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Your Situation
          </p>

          <InputField id="exp" label="Monthly Essential Expenses" value={monthlyExpenses}
            onChange={(v) => setMonthlyExpenses(parseFloat(v) || 0)} prefix="R"
            help="Housing, food, transport, utilities, insurance — bare minimum to survive" />

          <InputField id="saved" label="Already Saved" value={currentSaved}
            onChange={(v) => setCurrentSaved(parseFloat(v) || 0)} prefix="R" />

          <InputField id="save" label="Monthly Contribution" value={monthlySave}
            onChange={(v) => setMonthlySave(parseFloat(v) || 0)} prefix="R" />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ink-muted)' }}>Job / Income Security</label>
            <div className="flex gap-2">
              {([
                { key: 'stable' as const,   label: 'Stable',   rec: '3 mo', color: C.green },
                { key: 'moderate' as const, label: 'Moderate', rec: '6 mo', color: C.orange   },
                { key: 'risky' as const,    label: 'Variable', rec: '9 mo', color: C.red     },
              ]).map((opt) => (
                <button key={opt.key} onClick={() => setJobSecurity(opt.key)}
                  className="flex-1 py-2 rounded-xl text-center transition-all"
                  style={{
                    background: jobSecurity === opt.key ? alpha(opt.color, 8) : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                    border: `1px solid ${jobSecurity === opt.key ? alpha(opt.color, 21) : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                  }}>
                  <p className="text-xs font-semibold" style={{ color: textTone(jobSecurity === opt.key ? opt.color : 'var(--ink-muted)') }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-subtle)' }}>rec. {opt.rec}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ink-muted)' }}>Target (months of expenses)</label>
            <div className="flex gap-2">
              {[3, 6, 9, 12].map((m) => (
                <button key={m} onClick={() => setTargetMonths(m)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: targetMonths === m ? 'color-mix(in srgb, var(--note-blue) 15%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                    color: textTone(targetMonths === m ? C.blue : 'var(--ink-muted)'),
                    border: `1px solid ${targetMonths === m ? 'color-mix(in srgb, var(--note-blue) 30%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`,
                  }}>
                  {m} mo
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Vehicle + recommendation */}
        <div className="space-y-4">

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-static p-5">
            <p className="text-sm font-semibold mb-3"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Where to Keep It
            </p>
            <div className="space-y-2">
              {VEHICLES.map((v, i) => (
                <button key={i} onClick={() => setVehicleIdx(i)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    background: vehicleIdx === i ? 'color-mix(in srgb, var(--note-blue) 10%, transparent)' : 'color-mix(in srgb, var(--ink) 3%, transparent)',
                    border: `1px solid ${vehicleIdx === i ? 'color-mix(in srgb, var(--note-blue) 30%, transparent)' : 'color-mix(in srgb, var(--ink) 7%, transparent)'}`,
                  }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: vehicleIdx === i ? C.blue : 'var(--ink-subtle)' }} />
                  <p className="text-xs font-semibold flex-1"
                    style={{ color: textTone(vehicleIdx === i ? C.blue : 'var(--ink-muted)') }}>
                    {v.label}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-3" style={{ color: 'var(--ink-subtle)' }}>
              Emergency funds must be instantly accessible — avoid unit trusts or fixed deposits where withdrawal takes days.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="p-4 rounded-xl flex items-start gap-3"
            style={{
              background: adequacy ? 'color-mix(in srgb, var(--gain) 8%, transparent)' : 'color-mix(in srgb, var(--note-orange) 8%, transparent)',
              border: `1px solid ${adequacy ? 'color-mix(in srgb, var(--gain) 20%, transparent)' : 'color-mix(in srgb, var(--note-orange) 20%, transparent)'}`,
            }}>
            {adequacy
              ? <CheckCircle2 size={16} style={{ color: textTone(C.green), flexShrink: 0, marginTop: 1 }} />
              : <AlertCircle  size={16} style={{ color: textTone(C.orange), flexShrink: 0, marginTop: 1 }} />}
            <div>
              <p className="text-sm font-semibold"
                style={{ color: textTone(adequacy ? C.green : C.orange) }}>
                {adequacy ? 'Target looks adequate' : `Consider increasing target to ${recommendedMonths} months`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                Based on {jobSecurity} income security, {recommendedMonths} months is recommended.
                Your target: {formatRand(target, 0)}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Build-up chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="glass-card-static p-5">
        <p className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          Fund Build-Up Over Time
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
          {formatRand(monthlySave, 0)}/mo at {vehicle.rate}% p.a. — dashed line is your target
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="gradEF" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.green} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.green} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--ink) 5%, transparent)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={(v) => `Mo ${v}`} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-subtle)' }} tickFormatter={formatRandShort} />
            <Tooltip cursor={{ fill: "color-mix(in srgb, var(--note-blue) 8%, transparent)", stroke: "color-mix(in srgb, var(--ink-muted) 25%, transparent)" }} formatter={(v) => formatRand(Number(v), 0)} contentStyle={TOOLTIP_STYLE} />
            <ReferenceLine y={target} stroke={C.blue} strokeDasharray="5 4"
              label={{ value: 'Target', position: 'right', fontSize: 10, fill: C.blue }} />
            <Area type="monotone" dataKey="balance" name="Fund Balance" stroke={C.green} strokeWidth={2} fill="url(#gradEF)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--ink-subtle)' }}>
        Interest rates are indicative. Keep emergency funds in easily accessible, low-risk accounts. Not financial advice.
      </p>
    </div>
  );
}
