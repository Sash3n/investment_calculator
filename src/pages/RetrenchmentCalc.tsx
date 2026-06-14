import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Info, AlertTriangle, TrendingDown } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand, formatRandShort } from '../utils/format';
import { buildShareUrl, readShareParam } from '../utils/share';

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  violet:  '#8B5CF6',
};

// Retirement lump sum tax table 2025/26
function calcLumpSumTax(lumpSum: number): number {
  if (lumpSum <= 550_000) return 0;
  if (lumpSum <= 770_000) return (lumpSum - 550_000) * 0.18;
  if (lumpSum <= 1_155_000) return 39_600 + (lumpSum - 770_000) * 0.27;
  return 143_550 + (lumpSum - 1_155_000) * 0.36;
}

interface ShareState {
  yearsService: number;
  weeklySalary: number;
  monthlySalary: number;
  monthlyExpenses: number;
  priorLumpsums: number;
}

export function RetrenchmentCalc() {
  const shared = readShareParam<ShareState>();

  const [yearsService,    setYearsService]    = useState(shared?.yearsService    ?? 5);
  const [weeklySalary,    setWeeklySalary]    = useState(shared?.weeklySalary    ?? 0);
  const [monthlySalary,   setMonthlySalary]   = useState(shared?.monthlySalary   ?? 45_000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(shared?.monthlyExpenses ?? 30_000);
  const [priorLumpsums,   setPriorLumpsums]   = useState(shared?.priorLumpsums   ?? 0);

  const result = useMemo(() => {
    const weekly = weeklySalary > 0 ? weeklySalary : monthlySalary * 12 / 52;
    // SA BCEA: 1 week per completed year of service
    const severancePay   = Math.floor(yearsService) * weekly;

    const grossLumpSum   = severancePay;
    const combinedLumpSum = grossLumpSum + priorLumpsums;
    const tax            = Math.max(0, calcLumpSumTax(combinedLumpSum) - calcLumpSumTax(priorLumpsums));
    const netSeverance   = grossLumpSum - tax;

    const monthsRunway   = monthlyExpenses > 0 ? netSeverance / monthlyExpenses : 0;

    return { severancePay, tax, netSeverance, monthsRunway, weekly };
  }, [yearsService, weeklySalary, monthlySalary, monthlyExpenses, priorLumpsums]);

  const runwayMonths = Math.floor(result.monthsRunway);
  const runwayYears  = Math.floor(runwayMonths / 12);
  const runwayRem    = runwayMonths % 12;

  const shareUrl = buildShareUrl({
    yearsService, weeklySalary, monthlySalary, monthlyExpenses, priorLumpsums,
  } satisfies ShareState);

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${C.violet}22` }}>
            <Briefcase size={22} style={{ color: C.violet }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Retrenchment Calculator</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Severance pay, tax on lump sum, and how long your money will last.
            </p>
          </div>
        </div>
        <ShareButton url={shareUrl} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div
          className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Your details
          </h2>
          <InputField
            label="Years of service"
            value={yearsService}
            onChange={setYearsService}
            suffix="yrs"
            min={0}
            max={60}
          />
          <InputField
            label="Monthly salary (gross)"
            value={monthlySalary}
            onChange={setMonthlySalary}
            prefix="R"
            min={0}
          />
          <InputField
            label="Weekly salary (if known — overrides monthly)"
            value={weeklySalary}
            onChange={setWeeklySalary}
            prefix="R"
            min={0}
          />
          <InputField
            label="Monthly living expenses"
            value={monthlyExpenses}
            onChange={setMonthlyExpenses}
            prefix="R"
            min={0}
          />
          <InputField
            label="Prior retirement lump sums received"
            value={priorLumpsums}
            onChange={setPriorLumpsums}
            prefix="R"
            min={0}
          />

          <div
            className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${C.indigo}11`, border: `1px solid ${C.indigo}22` }}
          >
            <Info size={13} style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              SA BCEA entitles you to 1 week of pay per completed year of service.
              Tax uses the retirement lump sum table (2025/26).
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Gross severance pay"
              value={formatRand(result.severancePay)}
              color={C.violet}
              icon={<Briefcase size={16} />}
            />
            <StatCard
              label="Tax on lump sum"
              value={formatRand(result.tax)}
              color={C.red}
              icon={<TrendingDown size={16} />}
            />
            <StatCard
              label="Net in your pocket"
              value={formatRand(result.netSeverance)}
              color={C.emerald}
              icon={<Briefcase size={16} />}
            />
            <StatCard
              label="Runway"
              value={runwayYears > 0
                ? `${runwayYears}yr ${runwayRem}mo`
                : `${runwayMonths} months`}
              color={C.indigo}
              icon={<TrendingDown size={16} />}
            />
          </div>

          {/* Runway callout */}
          <div
            className="p-4 rounded-xl text-sm"
            style={{
              background: result.monthsRunway < 3 ? `${C.red}11` : `${C.emerald}11`,
              border:     `1px solid ${result.monthsRunway < 3 ? C.red : C.emerald}33`,
            }}
          >
            {result.monthsRunway < 3 ? (
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} style={{ color: C.red }} />
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Your runway is under 3 months. Immediately review expenses and pursue new income sources.
                </span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>
                Your net severance of{' '}
                <span style={{ color: C.emerald, fontWeight: 600 }}>{formatRand(result.netSeverance)}</span>
                {' '}covers{' '}
                <span style={{ color: C.emerald, fontWeight: 600 }}>
                  {runwayYears > 0 ? `${runwayYears} year${runwayYears !== 1 ? 's' : ''} and ` : ''}
                  {runwayRem} month{runwayRem !== 1 ? 's' : ''}
                </span>
                {' '}of living expenses at your current rate.
              </span>
            )}
          </div>

          {/* Lump sum tax table reference */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
              Retirement lump sum tax table (2025/26)
            </h2>
            <div className="space-y-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {[
                ['R0 - R550,000',         '0%'],
                ['R550,001 - R770,000',   '18%'],
                ['R770,001 - R1,155,000', '27%'],
                ['R1,155,001+',           '36%'],
              ].map(([range, rate]) => (
                <div key={range} className="flex justify-between py-1.5"
                  style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span>{range}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{rate}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
              Includes prior retirement lump sums received (cumulative tax table applies).
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
