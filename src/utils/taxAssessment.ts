/**
 * FinCalc ZA — SARS Annual Assessment estimator (ITR12-style)
 *
 * Combines all income sources, applies deductions and credits in the SARS
 * assessment order, and reconciles against PAYE/provisional tax already paid
 * to estimate a refund or amount owing.
 *
 * Assessment order implemented:
 *  1. Gross income: employment (incl. taxable travel allowance), trade/other,
 *     net rental, local interest less the s10(1)(i) exemption.
 *  2. Taxable capital gain: (gain - annual exclusion) x inclusion rate.
 *  3. Less retirement contributions: 27.5% of taxable income, capped per year.
 *  4. Less S18A donations: capped at 10% of taxable income after retirement.
 *  5. Tax per brackets, less s6 rebates, less s6A medical scheme credits,
 *     less s6B additional medical expenses credit.
 *  6. Less PAYE and provisional payments = refund (+) or owing (-).
 *
 * Local dividends are excluded from taxable income (20% dividends withholding
 * tax applies at source) and reported separately for information.
 *
 * Simplifications vs a full SARS assessment: no s20A ring-fencing of rental
 * losses, no foreign income/s6quat credits, no retirement lump-sum tables,
 * no assessed-loss carryover. The UI notes these.
 */

import type { TaxAssessmentInputs, TaxAssessmentResult } from '../types';
import { TAX_YEARS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';

export function calcTaxAssessment(
  inputs: TaxAssessmentInputs,
  taxYear: TaxYearId = DEFAULT_TAX_YEAR,
): TaxAssessmentResult {
  const {
    ageGroup,
    annualSalary, travelAllowance, travelInclusionRate, otherIncome,
    netRentalIncome, interestIncome, localDividends, capitalGain,
    raContributions, donations,
    medAidDependants, medAidContributions, medicalOutOfPocket, hasDisability,
    payeWithheld, provisionalPaid,
  } = inputs;
  const year = TAX_YEARS[taxYear];

  // ── 1. Income build-up ──────────────────────────────────────────────────────
  const taxableTravelAllowance = Math.max(0, travelAllowance) * travelInclusionRate;
  const employmentIncome = Math.max(0, annualSalary) + taxableTravelAllowance;

  const exemption = ageGroup === 'under65'
    ? year.interestExemption.under65
    : year.interestExemption.age65plus;
  const interestExemptionApplied = Math.min(Math.max(0, interestIncome), exemption);
  const taxableInterest = Math.max(0, interestIncome - exemption);

  // ── 2. Capital gain ─────────────────────────────────────────────────────────
  const gain = Math.max(0, capitalGain);
  const cgAnnualExclusionApplied = Math.min(gain, year.cgt.annualExclusion);
  const taxableCapitalGain = (gain - cgAnnualExclusionApplied) * year.cgt.inclusionRate;

  // Net rental may be negative (assessed loss offsets other income; SARS may
  // ring-fence under s20A — surfaced as a note in the UI, not modelled here).
  const incomeBeforeDeductions = Math.max(
    0,
    employmentIncome + Math.max(0, otherIncome) + netRentalIncome + taxableInterest + taxableCapitalGain,
  );

  // ── 3. Retirement deduction ─────────────────────────────────────────────────
  const raCap = Math.min(incomeBeforeDeductions * year.retirement.rate, year.retirement.cap);
  const raDeductionAllowed = Math.min(Math.max(0, raContributions), raCap);
  const raDeductionCapped = Math.max(0, raContributions) > raCap;
  const incomeAfterRa = Math.max(0, incomeBeforeDeductions - raDeductionAllowed);

  // ── 4. S18A donations (10% of taxable income after retirement) ──────────────
  const donationsCap = incomeAfterRa * 0.10;
  const donationsAllowed = Math.min(Math.max(0, donations), donationsCap);
  const donationsCapped = Math.max(0, donations) > donationsCap;
  const taxableIncome = Math.max(0, incomeAfterRa - donationsAllowed);

  // ── 5. Tax build-up ─────────────────────────────────────────────────────────
  const bracket = year.brackets.find((b) => taxableIncome <= b.max)
    ?? year.brackets[year.brackets.length - 1];
  const grossTax = taxableIncome > 0
    ? bracket.base + bracket.rate * (taxableIncome - bracket.min + 1)
    : 0;
  const rebate = year.rebates[ageGroup];

  // s6A medical scheme fees credit
  const deps = medAidDependants;
  const medMonthly6A = deps < 0 ? 0
    : deps === 0 ? year.medCredits.main
    : deps === 1 ? year.medCredits.main + year.medCredits.firstDep
    : year.medCredits.main + year.medCredits.firstDep + (deps - 1) * year.medCredits.extraDep;
  const medCredit6A = medMonthly6A * 12;

  // s6B additional medical expenses credit
  const contributions = deps < 0 ? 0 : Math.max(0, medAidContributions);
  const outOfPocket = Math.max(0, medicalOutOfPocket);
  const seniorOrDisabled = ageGroup !== 'under65' || hasDisability;
  let medCredit6B = 0;
  if (seniorOrDisabled) {
    // 33.3% of (contributions above 3x the s6A credit, plus out-of-pocket)
    const excessContrib = Math.max(0, contributions - 3 * medCredit6A);
    medCredit6B = (excessContrib + outOfPocket) / 3;
  } else {
    // 25% of the amount by which (contributions above 4x the s6A credit, plus
    // out-of-pocket) exceeds 7.5% of taxable income
    const excessContrib = Math.max(0, contributions - 4 * medCredit6A);
    const qualifying = excessContrib + outOfPocket;
    medCredit6B = 0.25 * Math.max(0, qualifying - 0.075 * taxableIncome);
  }

  const netTaxPayable = Math.max(0, grossTax - rebate - medCredit6A - medCredit6B);

  // ── 6. Reconciliation ───────────────────────────────────────────────────────
  const totalTaxPaid = Math.max(0, payeWithheld) + Math.max(0, provisionalPaid);
  const refundOrOwing = totalTaxPaid - netTaxPayable; // + refund / - owing

  const totalIncome = employmentIncome + Math.max(0, otherIncome)
    + Math.max(0, netRentalIncome) + Math.max(0, interestIncome) + gain;

  return {
    employmentIncome,
    taxableTravelAllowance,
    taxableInterest,
    interestExemptionApplied,
    taxableCapitalGain,
    cgAnnualExclusionApplied,
    incomeBeforeDeductions,
    raDeductionAllowed,
    raDeductionCapped,
    donationsAllowed,
    donationsCapped,
    taxableIncome,
    grossTax,
    rebate,
    medCredit6A,
    medCredit6B,
    netTaxPayable,
    totalTaxPaid,
    refundOrOwing,
    effectiveRate: totalIncome > 0 ? (netTaxPayable / totalIncome) * 100 : 0,
    marginalRate: bracket.rate * 100,
    bracketLabel: `${(bracket.rate * 100).toFixed(0)}% marginal bracket`,
    dividendsTax: Math.max(0, localDividends) * 0.20,
  };
}
