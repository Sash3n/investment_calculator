import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Info, AlertTriangle, TrendingDown, Shield } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand } from '../utils/format';
import { readShareParam } from '../utils/share';
import { alpha } from '../utils/color';

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
  brown:  'var(--note-brown)',
};

// Retirement lump sum tax table 2025/26
function calcLumpSumTax(lumpSum: number): number {
  if (lumpSum <= 550_000)   return 0;
  if (lumpSum <= 770_000)   return (lumpSum - 550_000) * 0.18;
  if (lumpSum <= 1_155_000) return 39_600 + (lumpSum - 770_000) * 0.27;
  return 143_550 + (lumpSum - 1_155_000) * 0.36;
}

// SA UIF benefit: sliding scale based on daily remuneration
// Max benefit = 58% of daily income, capped at R17,712/month (2024 ceiling)
function calcUIF(monthlySalary: number, yearsService: number): { monthlyBenefit: number; weeksEntitled: number } {
  const UIF_INCOME_CAP = 17_712;
  const cappedMonthly  = Math.min(monthlySalary, UIF_INCOME_CAP);
  const dailyIncome    = cappedMonthly / 21.67;

  // IRR (income replacement rate) slides from 38% to 58%
  const irrPct = dailyIncome <= 0 ? 0.58 : Math.max(0.38, 0.58 - (dailyIncome / 1000) * 0.02);
  const dailyBenefit   = dailyIncome * irrPct;
  const monthlyBenefit = dailyBenefit * 21.67;

  // 1 credit day per 4 calendar days worked, max 238 credit days (34 weeks)
  const daysWorked    = yearsService * 365;
  const creditDays    = Math.floor(daysWorked / 4);
  const weeksEntitled = Math.min(34, Math.floor(creditDays / 7));

  return { monthlyBenefit: Math.round(monthlyBenefit), weeksEntitled };
}

// Notice pay: BCEA Section 37
function calcNoticePay(yearsService: number, weeklySalary: number): number {
  if (yearsService < 1)  return weeklySalary;       // 1 week
  if (yearsService < 5)  return weeklySalary * 2;   // 2 weeks
  return weeklySalary * 4;                           // 4 weeks (5+ years)
}

function noticeLabel(yearsService: number): string {
  if (yearsService < 1) return '1 week notice pay';
  if (yearsService < 5) return '2 weeks notice pay';
  return '4 weeks notice pay';
}

interface ShareState {
  yearsService:    number;
  weeklySalary:    number;
  monthlySalary:   number;
  monthlyExpenses: number;
  priorLumpsums:   number;
  leaveDays:       number;
}

export function RetrenchmentCalc() {
  const shared = readShareParam<ShareState>();

  const [yearsService,    setYearsService]    = useState(shared?.yearsService    ?? 5);
  const [weeklySalary,    setWeeklySalary]    = useState(shared?.weeklySalary    ?? 0);
  const [monthlySalary,   setMonthlySalary]   = useState(shared?.monthlySalary   ?? 45_000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(shared?.monthlyExpenses ?? 30_000);
  const [priorLumpsums,   setPriorLumpsums]   = useState(shared?.priorLumpsums   ?? 0);
  const [leaveDays,       setLeaveDays]       = useState(shared?.leaveDays       ?? 15);

  const result = useMemo(() => {
    const weekly        = weeklySalary > 0 ? weeklySalary : monthlySalary * 12 / 52;
    const dailyRate     = weekly / 5;

    // Severance pay (taxed via lump sum table)
    const severancePay  = Math.floor(yearsService) * weekly;
    const combinedLump  = severancePay + priorLumpsums;
    const tax           = Math.max(0, calcLumpSumTax(combinedLump) - calcLumpSumTax(priorLumpsums));
    const netSeverance  = severancePay - tax;

    // Notice pay (not taxed via lump sum table — normal PAYE, estimate at ~25% effective)
    const noticePay     = calcNoticePay(yearsService, weekly);
    const netNoticePay  = noticePay * 0.75;

    // Leave payout (normal PAYE, same estimate)
    const leavePayout   = leaveDays * dailyRate;
    const netLeavePayout = leavePayout * 0.75;

    // UIF
    const uif = calcUIF(monthlySalary, yearsService);

    // Total net payout
    const totalNet = netSeverance + netNoticePay + netLeavePayout;

    // Runway from lump sums only (not counting UIF)
    const monthsRunway = monthlyExpenses > 0 ? totalNet / monthlyExpenses : 0;

    // UIF runway adds on top
    const uifMonths = uif.weeksEntitled / 4.33;

    return {
      severancePay, tax, netSeverance,
      noticePay, netNoticePay,
      leavePayout, netLeavePayout,
      totalNet, monthsRunway,
      uif, uifMonths, dailyRate,
    };
  }, [yearsService, weeklySalary, monthlySalary, monthlyExpenses, priorLumpsums, leaveDays]);

  const runwayMonths  = Math.floor(result.monthsRunway);
  const runwayYears   = Math.floor(runwayMonths / 12);
  const runwayRem     = runwayMonths % 12;
  const totalRunway   = result.monthsRunway + result.uifMonths;
  const totalRunwayMo = Math.floor(totalRunway);
  const totalRunwayYr = Math.floor(totalRunwayMo / 12);
  const totalRunwayRm = totalRunwayMo % 12;

  const shareState: ShareState = {
    yearsService, weeklySalary, monthlySalary, monthlyExpenses, priorLumpsums, leaveDays,
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
          <div className="p-2.5 rounded-xl" style={{ background: 'color-mix(in srgb, var(--note-brown) 13%, transparent)' }}>
            <Briefcase size={22} style={{ color: 'var(--note-brown)' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>Retrenchment Calculator</h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Severance, notice pay, leave payout, UIF — your full financial picture.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            Your details
          </h2>
          <InputField id="ret-years"   label="Years of service"                             value={yearsService}    onChange={(v) => setYearsService(Number(v))}    suffix="yrs" min={0} max={60} />
          <InputField id="ret-monthly" label="Monthly salary (gross)"                       value={monthlySalary}   onChange={(v) => setMonthlySalary(Number(v))}   prefix="R" min={0} />
          <InputField id="ret-weekly"  label="Weekly salary (if known — overrides monthly)" value={weeklySalary}    onChange={(v) => setWeeklySalary(Number(v))}    prefix="R" min={0} />
          <InputField id="ret-leave"   label="Accrued leave days"                           value={leaveDays}       onChange={(v) => setLeaveDays(Number(v))}       suffix="days" min={0} max={60} />
          <InputField id="ret-exp"     label="Monthly living expenses"                      value={monthlyExpenses} onChange={(v) => setMonthlyExpenses(Number(v))} prefix="R" min={0} />
          <InputField id="ret-prior"   label="Prior retirement lump sums received"          value={priorLumpsums}   onChange={(v) => setPriorLumpsums(Number(v))}   prefix="R" min={0} />

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${alpha(C.blue, 7)}`, border: `1px solid ${alpha(C.blue, 13)}` }}>
            <Info size={13} style={{ color: C.blue }} />
            <span style={{ color: 'var(--ink-muted)' }}>
              BCEA: 1 week pay per completed year of service (severance) + notice pay + accrued leave.
              UIF capped at R17,712/month income.
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">

          {/* Primary stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total net payout"   value={formatRand(result.totalNet)}        color="green" icon={Briefcase} />
            <StatCard label="Total runway"        value={totalRunwayYr > 0 ? `${totalRunwayYr}yr ${totalRunwayRm}mo` : `${totalRunwayMo}mo`} color="blue" icon={TrendingDown} />
            <StatCard label="UIF monthly benefit" value={formatRand(result.uif.monthlyBenefit)} color="orange" icon={Shield} />
            <StatCard label="UIF entitlement"     value={`${result.uif.weeksEntitled} weeks`} color="orange" icon={Shield} />
          </div>

          {/* Runway callout */}
          {result.totalNet > 0 && monthlyExpenses > 0 && (
          <div className="p-4 rounded-xl text-sm"
            style={{
              background: result.monthsRunway < 3 ? `${alpha(C.red, 7)}` : `${alpha(C.green, 7)}`,
              border: `1px solid ${alpha(result.monthsRunway < 3 ? C.red : C.green, 20)}`,
            }}>
            {result.monthsRunway < 3 ? (
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} style={{ color: C.red }} />
                <span style={{ color: 'var(--ink-muted)' }}>
                  Your lump sum runway is under 3 months. Combined with UIF you have{' '}
                  <span style={{ color: C.orange, fontWeight: 600 }}>{totalRunwayMo} months</span> total.
                  Review expenses immediately.
                </span>
              </div>
            ) : (
              <span style={{ color: 'var(--ink-muted)' }}>
                Your lump sums cover{' '}
                <span style={{ color: C.green, fontWeight: 600 }}>
                  {runwayYears > 0 ? `${runwayYears}yr ` : ''}{runwayRem}mo
                </span>
                {' '}of expenses. Adding UIF extends this to{' '}
                <span style={{ color: C.green, fontWeight: 600 }}>
                  {totalRunwayYr > 0 ? `${totalRunwayYr}yr ` : ''}{totalRunwayRm}mo
                </span>.
              </span>
            )}
          </div>
          )}

          {/* Full breakdown table */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Full payout breakdown</h2>
            <div className="space-y-0 text-sm">
              {[
                { label: 'Severance pay (gross)',          val: formatRand(result.severancePay),   note: `${Math.floor(yearsService)} wks @ ${formatRand(weeklySalary > 0 ? weeklySalary : result.dailyRate * 5)}/wk` },
                { label: 'Tax on severance (lump sum table)', val: `- ${formatRand(result.tax)}`,  note: '' },
                { label: 'Net severance',                  val: formatRand(result.netSeverance),   note: '' },
                { label: `${noticeLabel(yearsService)} (gross)`, val: formatRand(result.noticePay), note: 'Est. 25% PAYE' },
                { label: 'Net notice pay',                 val: formatRand(result.netNoticePay),   note: '' },
                { label: `Leave payout — ${leaveDays} days (gross)`, val: formatRand(result.leavePayout), note: 'Est. 25% PAYE' },
                { label: 'Net leave payout',               val: formatRand(result.netLeavePayout), note: '' },
                { label: 'Total net lump sum',             val: formatRand(result.totalNet),       note: '', bold: true },
              ].map(({ label, val, note, bold }) => (
                <div key={label} className="flex justify-between items-center py-2"
                  style={{ borderBottom: '1px solid var(--rule)' }}>
                  <div>
                    <span style={{ color: bold ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: bold ? 600 : 400 }}>
                      {label}
                    </span>
                    {note && <span className="ml-2 text-xs" style={{ color: 'var(--ink-muted)', opacity: 0.7 }}>{note}</span>}
                  </div>
                  <span style={{ color: bold ? C.green : 'var(--ink)', fontWeight: bold ? 600 : 500 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* UIF section */}
          <div className="p-5 rounded-2xl"
            style={{ background: `${alpha(C.orange, 3)}`, border: `1px solid ${alpha(C.orange, 20)}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={15} style={{ color: C.orange }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>UIF benefit estimate</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                ['Monthly benefit',    formatRand(result.uif.monthlyBenefit)],
                ['Weeks entitled',     `${result.uif.weeksEntitled} weeks`],
                ['Total UIF value',    formatRand(result.uif.monthlyBenefit * result.uifMonths)],
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>{lbl}</p>
                  <p className="font-semibold" style={{ color: 'var(--ink)' }}>{val}</p>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--ink-muted)' }}>
              UIF income replacement rate varies 38%–58% on a sliding scale. Capped at R17,712/month
              income ceiling. Register at uFiling.co.za within 6 months of retrenchment.
            </p>
          </div>

          {/* Lump sum tax table */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
              Retirement lump sum tax table (2025/26)
            </h2>
            <div className="space-y-0 text-xs">
              {[
                ['R0 - R550,000',         '0%'],
                ['R550,001 - R770,000',   '18%'],
                ['R770,001 - R1,155,000', '27%'],
                ['R1,155,001+',           '36%'],
              ].map(([range, rate]) => (
                <div key={range} className="flex justify-between py-1.5"
                  style={{ borderBottom: '1px solid var(--rule)', color: 'var(--ink-muted)' }}>
                  <span>{range}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{rate}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--ink-muted)' }}>
              Cumulative — prior lump sums received affect which bracket applies.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
