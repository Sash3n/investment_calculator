import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, AlertTriangle, CheckCircle2, Info, TrendingDown } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { TaxYearSelect } from '../components/ui/TaxYearSelect';
import { formatRand } from '../utils/format';
import { readShareParam } from '../utils/share';
import { calcIncomeTax } from '../utils/tax';
import { TAX_YEARS, TAX_YEAR_OPTIONS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';
import type { AgeGroup } from '../types';

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
};

function toAgeGroup(age: number): AgeGroup {
  return age >= 75 ? '75plus' : age >= 65 ? '65to74' : 'under65';
}

/**
 * Annual tax on taxable income, less age rebates (inside calcIncomeTax) and
 * SARS-tiered medical scheme fees credits (main / first dependant / additional).
 */
function annualTaxDue(taxable: number, age: number, medAidMembers: number, taxYear: TaxYearId): number {
  const { medCredits } = TAX_YEARS[taxYear];
  const medMonthly = medAidMembers <= 0 ? 0
    : medAidMembers === 1 ? medCredits.main
    : medCredits.main + medCredits.firstDep + (medAidMembers - 2) * medCredits.extraDep;
  return Math.max(0, calcIncomeTax(taxable, toAgeGroup(age), taxYear) - medMonthly * 12);
}

interface ShareState {
  employmentIncome: number;
  freelanceIncome:  number;
  otherIncome:      number;
  deductions:       number;
  raContribution:   number;
  age:              number;
  medAidMembers:    number;
  period:           string;
  taxYear?:         TaxYearId;
}

export function ProvisionalTax() {
  const shared = readShareParam<ShareState>();

  const [employmentIncome, setEmploymentIncome] = useState(shared?.employmentIncome ?? 0);
  const [freelanceIncome,  setFreelanceIncome]  = useState(shared?.freelanceIncome  ?? 200_000);
  const [otherIncome,      setOtherIncome]      = useState(shared?.otherIncome      ?? 0);
  const [deductions,       setDeductions]       = useState(shared?.deductions       ?? 0);
  const [raContribution,   setRaContribution]   = useState(shared?.raContribution   ?? 0);
  const [age,              setAge]              = useState(shared?.age              ?? 30);
  const [medAidMembers,    setMedAidMembers]    = useState(shared?.medAidMembers    ?? 1);
  const [period,           setPeriod]           = useState(shared?.period           ?? 'first');
  const [taxYear,          setTaxYear]          = useState<TaxYearId>(shared?.taxYear ?? DEFAULT_TAX_YEAR);

  // RA slider bounded to the actual allowable deduction for the selected year
  const { retirement } = TAX_YEARS[taxYear];
  const totalIncomePre = employmentIncome + freelanceIncome + otherIncome;
  const raDeductCap    = Math.min(retirement.cap, totalIncomePre * retirement.rate);

  const result = useMemo(() => {
    const { retirement: ra } = TAX_YEARS[taxYear];
    const totalIncome     = employmentIncome + freelanceIncome + otherIncome;
    const raAllowed       = Math.min(ra.cap, totalIncome * ra.rate);
    const raDeducted      = Math.min(raContribution, raAllowed);
    const taxableIncome   = Math.max(0, totalIncome - deductions - raDeducted);
    const annualTax       = annualTaxDue(taxableIncome, age, medAidMembers, taxYear);
    // Split RA deduction pro-rata across income sources so payeOnEmploy isn't understated
    const employRatio  = totalIncome > 0 ? employmentIncome / totalIncome : 0;
    const raOnEmploy   = raDeducted * employRatio;
    const payeOnEmploy = annualTaxDue(Math.max(0, employmentIncome - deductions * employRatio - raOnEmploy), age, medAidMembers, taxYear);
    const taxOnFreelance  = Math.max(0, annualTax - payeOnEmploy);
    const firstPayment    = taxOnFreelance / 2;
    const secondPayment   = taxOnFreelance - firstPayment;
    const monthlySetAside = taxOnFreelance / 12;
    const effectiveRate    = taxableIncome > 0 ? (annualTax / taxableIncome) * 100 : 0;
    const penaltyThreshold = taxOnFreelance * 0.9;
    // RA saving: tax without RA vs with RA
    const taxWithoutRA     = annualTaxDue(Math.max(0, totalIncome - deductions), age, medAidMembers, taxYear);
    const raTaxSaving      = Math.max(0, taxWithoutRA - annualTax);
    return {
      totalIncome, taxableIncome, annualTax, taxOnFreelance,
      payeOnEmploy, firstPayment, secondPayment,
      monthlySetAside, effectiveRate, penaltyThreshold,
      raDeducted, raAllowed, raTaxSaving,
    };
  }, [employmentIncome, freelanceIncome, otherIncome, deductions, raContribution, age, medAidMembers, taxYear]);

  const displayPayment = period === 'first' ? result.firstPayment : result.secondPayment;
  const paymentLabel   = period === 'first' ? '1st payment (Aug)' : '2nd payment (Feb)';
  const paymentDue     = period === 'first' ? '31 August' : '28 February';

  const shareState: ShareState = {
    employmentIncome, freelanceIncome, otherIncome, deductions, raContribution, age, medAidMembers, period, taxYear,
  };
  const taxYearLabel = TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label ?? taxYear;

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${C.amber}22` }}>
            <Receipt size={22} style={{ color: C.amber }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Provisional Tax</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Freelancers and side-hustlers: know exactly what to set aside and when. ({taxYearLabel})
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Income details
          </h2>
          <TaxYearSelect id="pt-taxyear" value={taxYear} onChange={setTaxYear} />
          <InputField id="pt-employ"  label="Employment income (annual)"          value={employmentIncome} onChange={(v) => setEmploymentIncome(Number(v))} prefix="R" min={0} />
          <InputField id="pt-free"    label="Freelance / side income (annual)"    value={freelanceIncome}  onChange={(v) => setFreelanceIncome(Number(v))}  prefix="R" min={0} />
          <InputField id="pt-other"   label="Other income (interest, rental)"     value={otherIncome}      onChange={(v) => setOtherIncome(Number(v))}      prefix="R" min={0} />
          <InputField id="pt-deduct"  label="Other deductions"                    value={deductions}       onChange={(v) => setDeductions(Number(v))}       prefix="R" min={0} />

          <hr style={{ borderColor: 'var(--color-border)' }} />
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            RA contribution
          </h2>
          <InputField id="pt-ra"      label="Annual RA contribution"              value={raContribution}   onChange={(v) => setRaContribution(Number(v))}   prefix="R" min={0} />
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Max deductible: {formatRand(raDeductCap)} (27.5% of income, capped {formatRand(retirement.cap)})
          </div>
          {/* Slider for RA — hidden when income is zero (max would be 0, slider breaks) */}
          {raDeductCap > 0 && (
            <input
              type="range"
              min={0}
              max={raDeductCap}
              step={1000}
              value={Math.min(raContribution, raDeductCap)}
              onChange={(e) => setRaContribution(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: '#6366F1' }}
            />
          )}
          <InputField id="pt-age"     label="Your age"                            value={age}              onChange={(v) => setAge(Number(v))}              suffix="yrs" min={18} max={100} />
          <InputField id="pt-med"     label="Medical aid members (incl. yourself)" value={medAidMembers}   onChange={(v) => setMedAidMembers(Number(v))}    min={0} max={10} />
          <SelectField
            id="pt-period"
            label="Which provisional payment?"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'first',  label: '1st payment (due 31 Aug)' },
              { value: 'second', label: '2nd payment (due 28 Feb)' },
            ]}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={paymentLabel}                   value={formatRand(displayPayment)}          color="amber"   icon={Receipt} />
            <StatCard label="Monthly set aside"              value={formatRand(result.monthlySetAside)}  color="indigo"  icon={CheckCircle2} />
            <StatCard label="Tax on freelance income"        value={formatRand(result.taxOnFreelance)}   color="red"     icon={Receipt} />
            <StatCard label="Effective tax rate"             value={`${result.effectiveRate.toFixed(1)}%`} color="amber" icon={Info} />
            {raContribution > 0 && (
              <div className="col-span-2">
                <StatCard label="RA tax saving this year"  value={formatRand(result.raTaxSaving)}      color="emerald" icon={TrendingDown} />
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
            style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}44` }}>
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} />
            <div style={{ color: 'var(--color-text-muted)' }}>
              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{paymentLabel} due {paymentDue}.</span>
              {' '}Pay at least 90% of your final liability ({formatRand(result.penaltyThreshold)}) to avoid a 20% penalty on the shortfall.
            </div>
          </div>

          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Tax breakdown</h2>
            <div className="space-y-0 text-sm">
              {[
                ['Total income',                   formatRand(result.totalIncome)],
                ['Less deductions',                `- ${formatRand(deductions)}`],
                ['Less RA contribution',           `- ${formatRand(result.raDeducted)}`],
                ['Taxable income',                 formatRand(result.taxableIncome)],
                ['Annual tax (SARS table)',         formatRand(result.annualTax)],
                ['PAYE already deducted',          `- ${formatRand(result.payeOnEmploy)}`],
                ['Tax on non-employment income',   formatRand(result.taxOnFreelance)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-2"
                  style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${C.indigo}11`, border: `1px solid ${C.indigo}22` }}>
            <Info size={13} style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              Based on {taxYearLabel} SARS tax tables. Medical aid credit:
              R{TAX_YEARS[taxYear].medCredits.main}/month (main member and first dependant),
              R{TAX_YEARS[taxYear].medCredits.extraDep}/month per additional dependant.
              Consult a tax practitioner for complex situations.
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
