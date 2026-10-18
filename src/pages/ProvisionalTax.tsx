import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { ShareButton } from '../components/ui/ShareButton';
import { TaxYearSelect } from '../components/ui/TaxYearSelect';
import { formatRand } from '../utils/format';
import { readShareParam } from '../utils/share';
import { calcIncomeTax } from '../utils/tax';
import { TAX_YEARS, TAX_YEAR_OPTIONS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';
import type { AgeGroup } from '../types';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { BreakdownList } from '../components/results/BreakdownList';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { nonNegativeError, rangeError } from '../utils/validation';

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
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
  const paymentDue     = period === 'first' ? '31 August' : '28 February';

  const shareState: ShareState = {
    employmentIncome, freelanceIncome, otherIncome, deductions, raContribution, age, medAidMembers, period, taxYear,
  };
  const taxYearLabel = TAX_YEAR_OPTIONS.find((o) => o.id === taxYear)?.label ?? taxYear;

  const errors = {
    employmentIncome: nonNegativeError(employmentIncome),
    freelanceIncome: nonNegativeError(freelanceIncome),
    otherIncome: nonNegativeError(otherIncome),
    deductions: nonNegativeError(deductions),
    raContribution: nonNegativeError(raContribution),
    age: rangeError(age, 18, 100, 'an age', ''),
    medAidMembers: rangeError(medAidMembers, 0, 10, 'a number of members', ''),
  };
  const blocked = errors.employmentIncome ?? errors.freelanceIncome ?? errors.otherIncome ?? errors.deductions ?? errors.age
    ?? (result.totalIncome <= 0 ? 'Enter your income for the year.' : undefined);

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: alpha(C.orange, 13) }}>
            <Receipt size={22} style={{ color: textTone(C.orange) }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>Provisional Tax</h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Freelancers and side-hustlers: know exactly what to set aside and when. ({taxYearLabel})
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            Income details
          </h2>
          <TaxYearSelect id="pt-taxyear" value={taxYear} onChange={setTaxYear} />
          <InputField id="pt-employ"  label="Employment income (annual)"          value={employmentIncome} error={errors.employmentIncome} onChange={(v) => setEmploymentIncome(Number(v))} prefix="R" min={0} />
          <InputField id="pt-free"    label="Freelance / side income (annual)"    value={freelanceIncome} error={errors.freelanceIncome}  onChange={(v) => setFreelanceIncome(Number(v))}  prefix="R" min={0} />
          <InputField id="pt-other"   label="Other income (interest, rental)"     value={otherIncome} error={errors.otherIncome}      onChange={(v) => setOtherIncome(Number(v))}      prefix="R" min={0} />
          <InputField id="pt-deduct"  label="Other deductions"                    value={deductions} error={errors.deductions}       onChange={(v) => setDeductions(Number(v))}       prefix="R" min={0} />

          <hr style={{ borderColor: 'var(--rule)' }} />
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
            RA contribution
          </h2>
          <InputField id="pt-ra"      label="Annual RA contribution"              value={raContribution} error={errors.raContribution}   onChange={(v) => setRaContribution(Number(v))}   prefix="R" min={0} />
          <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
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
              style={{ accentColor: 'var(--note-blue)' }}
            />
          )}
          <InputField id="pt-age"     label="Your age"                            value={age} error={errors.age}              onChange={(v) => setAge(Number(v))}              suffix="yrs" min={18} max={100} />
          <InputField id="pt-med"     label="Medical aid members (incl. yourself)" value={medAidMembers} error={errors.medAidMembers}   onChange={(v) => setMedAidMembers(Number(v))}    min={0} max={10} />
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
          <ResultPanel
            label={`${period === 'first' ? 'First' : 'Second'} payment, due ${paymentDue}`}
            value={formatRand(displayPayment, 0)}
            blocked={blocked}
            summary={<>
              Tax on your income outside a salary comes to about {formatRand(result.taxOnFreelance, 0)} for the year, paid in two halves.
              Setting aside {formatRand(result.monthlySetAside, 0)} a month covers it. Pay at least 90% of the final amount
              ({formatRand(result.penaltyThreshold, 0)}) to avoid a 20% penalty on the shortfall.
              {raContribution > 0 && result.raTaxSaving > 0 && ` Your retirement annuity saves ${formatRand(result.raTaxSaving, 0)} in tax this year.`}
            </>}
            figures={[
              { label: 'Set aside each month', value: formatRand(result.monthlySetAside, 0) },
              { label: 'Tax outside your salary', value: formatRand(result.taxOnFreelance, 0) },
              { label: 'Effective tax rate', value: `${result.effectiveRate.toFixed(1)}%` },
              { label: 'Saved by your annuity', value: raContribution > 0 ? formatRand(result.raTaxSaving, 0) : 'No annuity' },
            ]}
          />

          <BreakdownList
            title="How the tax is worked out"
            lines={[
              { label: 'Total income', value: result.totalIncome },
              { label: 'Other deductions', value: deductions, kind: 'less' },
              { label: 'Retirement annuity', value: result.raDeducted, kind: 'less', note: `Up to ${formatRand(result.raAllowed, 0)} can be deducted` },
              { label: 'Taxable income', display: formatRand(result.taxableIncome, 0) },
              { label: 'Tax for the year', display: formatRand(result.annualTax, 0), note: 'After rebates and medical aid credits' },
              { label: 'Tax already paid through PAYE', value: result.payeOnEmploy, kind: 'less' },
            ]}
            total={{ label: 'Tax outside your salary', value: result.taxOnFreelance }}
          />

          <AssumptionsDrawer
            items={[
              <>Tax uses the SARS tables for {taxYearLabel}, with the rebate for your age and medical aid credits of {formatRand(TAX_YEARS[taxYear].medCredits.main, 0)} a month for you and your first dependant and {formatRand(TAX_YEARS[taxYear].medCredits.extraDep, 0)} for each extra dependant.</>,
              <>PAYE on your salary is worked out separately, and only the extra tax is due as provisional tax.</>,
              <>The provisional tax is split into two equal payments, due 31 August and 28 February.</>,
              <>Retirement annuity contributions are deducted up to 27.5% of income, capped at {formatRand(retirement.cap, 0)} a year.</>,
              <>Not included: capital gains, interest exemptions, business expenses beyond the deductions you enter, and the third top-up payment.</>,
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
}
