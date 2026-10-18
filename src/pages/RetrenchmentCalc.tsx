import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatMonths } from '../utils/format';
import { readShareParam } from '../utils/share';
import { ResultPanel } from '../components/results/ResultPanel';
import { BreakdownList } from '../components/results/BreakdownList';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, positiveError, rangeError } from '../utils/validation';

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

  const totalRunway = result.monthsRunway + result.uifMonths;
  const grossPayout = result.severancePay + result.noticePay + result.leavePayout;

  const errors = {
    yearsService: rangeError(yearsService, 0, 60, 'years of service'),
    monthlySalary: weeklySalary > 0 ? nonNegativeError(monthlySalary) : positiveError(monthlySalary, 'Enter your monthly pay before tax.'),
    weeklySalary: nonNegativeError(weeklySalary),
    leaveDays: rangeError(leaveDays, 0, 60, 'leave', ' days'),
    monthlyExpenses: nonNegativeError(monthlyExpenses),
    priorLumpsums: nonNegativeError(priorLumpsums),
  };
  const blocked = errors.yearsService ?? errors.monthlySalary ?? errors.weeklySalary ?? errors.leaveDays;

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
            <Briefcase size={22} style={{ color: 'var(--note-brown-ink)' }} />
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
          <InputField id="ret-years"   label="Years of service"                             value={yearsService} error={errors.yearsService}    onChange={(v) => setYearsService(Number(v))}    suffix="yrs" min={0} max={60} />
          <InputField id="ret-monthly" label="Monthly salary (gross)"                       value={monthlySalary} error={errors.monthlySalary}   onChange={(v) => setMonthlySalary(Number(v))}   prefix="R" min={0} />
          <InputField id="ret-weekly"  label="Weekly salary (if known — overrides monthly)" value={weeklySalary} error={errors.weeklySalary}    onChange={(v) => setWeeklySalary(Number(v))}    prefix="R" min={0} />
          <InputField id="ret-leave"   label="Accrued leave days"                           value={leaveDays} error={errors.leaveDays}       onChange={(v) => setLeaveDays(Number(v))}       suffix="days" min={0} max={60} />
          <InputField id="ret-exp"     label="Monthly living expenses"                      value={monthlyExpenses} error={errors.monthlyExpenses} onChange={(v) => setMonthlyExpenses(Number(v))} prefix="R" min={0} />
          <InputField id="ret-prior"   label="Prior retirement lump sums received"          value={priorLumpsums} error={errors.priorLumpsums}   onChange={(v) => setPriorLumpsums(Number(v))}   prefix="R" min={0} />
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">

          <ResultPanel
            label="Total payout after tax"
            value={formatRand(result.totalNet, 0)}
            blocked={blocked}
            summary={<>
              Severance, notice pay and leave come to {formatRand(grossPayout, 0)} before tax.
              {monthlyExpenses > 0 && ` After tax, that covers ${formatMonths(Math.floor(result.monthsRunway))} of your ${formatRand(monthlyExpenses, 0)} monthly costs, or ${formatMonths(Math.floor(totalRunway))} with UIF.`}
              {monthlyExpenses > 0 && result.monthsRunway < 3 && ' That is under 3 months from the payout alone, so it is worth reviewing your costs now.'}
            </>}
            figures={[
              { label: 'Severance after tax', value: formatRand(result.netSeverance, 0) },
              { label: 'UIF each month', value: formatRand(result.uif.monthlyBenefit, 0) },
              { label: 'UIF for up to', value: `${result.uif.weeksEntitled} weeks` },
              { label: 'Runway with UIF', value: monthlyExpenses > 0 ? formatMonths(Math.floor(totalRunway)) : 'Add your costs' },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <BreakdownList
              title="Payout before and after tax"
              lines={[
                { label: 'Severance pay', value: result.severancePay, note: `${Math.floor(yearsService)} weeks at ${formatRand(result.dailyRate * 5, 0)} a week` },
                { label: 'Tax on severance', value: result.tax, kind: 'less', note: 'Retirement lump sum table' },
                { label: noticeLabel(yearsService), value: result.noticePay },
                { label: 'Tax on notice pay', value: result.noticePay - result.netNoticePay, kind: 'less', note: 'Estimated at 25%' },
                { label: `Leave payout (${leaveDays} days)`, value: result.leavePayout },
                { label: 'Tax on leave payout', value: result.leavePayout - result.netLeavePayout, kind: 'less', note: 'Estimated at 25%' },
              ]}
              total={{ label: 'Total after tax', value: result.totalNet }}
            />
            <BreakdownList
              title="UIF benefit estimate"
              lines={[
                { label: 'Paid each month', value: result.uif.monthlyBenefit },
                { label: 'Weeks you can claim', display: `${result.uif.weeksEntitled} weeks` },
              ]}
              total={{ label: 'Total UIF', value: result.uif.monthlyBenefit * result.uifMonths }}
            />
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

          <AssumptionsDrawer
            items={[
              <>Severance is 1 week’s pay for each completed year of service, the minimum in the Basic Conditions of Employment Act. Your contract or a retrenchment agreement may give more.</>,
              <>Severance is taxed with the retirement lump sum table, together with any lump sums you received before. Notice pay and leave are taxed as normal pay; here that is an estimate of 25%.</>,
              <>UIF pays a share of your pay, on pay up to R17,712 a month, for up to 34 weeks depending on how long you contributed. Claim within 6 months of leaving work.</>,
              <>Runway divides the payout after tax by your monthly costs, then adds the months UIF pays. Interest and inflation are not included.</>,
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
}
