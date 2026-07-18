/**
 * FinCalc ZA — Tax Calculation Utilities
 *
 * All year-specific SARS constants live in src/config/taxYears.ts, keyed by
 * tax year. Every function takes an optional trailing `taxYear` parameter and
 * defaults to DEFAULT_TAX_YEAR, so existing call sites remain valid.
 *
 * Sources:
 *  - SARS Rates of Tax for Individuals (sars.gov.za)
 *  - Section 13sex, 13quat of the Income Tax Act
 *  - SARS CGT rates and exclusions
 */

import type {
  AgeGroup,
  RentalTaxInputs,
  RentalTaxResult,
  Section13sexInputs,
  Section13sexResult,
  S13UnitResult,
  Section13quatInputs,
  Section13quatResult,
  CGTInputs,
  CGTResult,
} from '../types';
import { TAX_YEARS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';

export type { TaxYearId } from '../config/taxYears';

// Re-export CGT constants for the DEFAULT tax year (backward compatibility).
// Year-specific values live in config/taxYears.ts — prefer TAX_YEARS[year].cgt.
export const CGT_PRIMARY_RESIDENCE_EXCLUSION = TAX_YEARS[DEFAULT_TAX_YEAR].cgt.primaryResidenceExclusion;
export const CGT_ANNUAL_EXCLUSION = TAX_YEARS[DEFAULT_TAX_YEAR].cgt.annualExclusion;
export const CGT_INCLUSION_RATE = TAX_YEARS[DEFAULT_TAX_YEAR].cgt.inclusionRate;

// ── Core: compute SARS income tax ─────────────────────────────────────────────
export function calcIncomeTax(taxableIncome: number, ageGroup: AgeGroup, taxYear: TaxYearId = DEFAULT_TAX_YEAR): number {
  if (taxableIncome <= 0) return 0;
  const { brackets, rebates } = TAX_YEARS[taxYear];
  const bracket = brackets.find((b) => taxableIncome <= b.max) ?? brackets[brackets.length - 1];
  const grossTax = bracket.base + bracket.rate * (taxableIncome - bracket.min + 1);
  const netTax = Math.max(0, grossTax - rebates[ageGroup]);
  return netTax;
}

export function getMarginalRate(taxableIncome: number, taxYear: TaxYearId = DEFAULT_TAX_YEAR): number {
  if (taxableIncome <= 0) return 0;
  const { brackets } = TAX_YEARS[taxYear];
  const bracket = brackets.find((b) => taxableIncome <= b.max) ?? brackets[brackets.length - 1];
  return bracket.rate;
}

export function getBracketLabel(taxableIncome: number, taxYear: TaxYearId = DEFAULT_TAX_YEAR): string {
  const rate = getMarginalRate(taxableIncome, taxYear);
  return `${(rate * 100).toFixed(0)}% marginal bracket`;
}

// ── Transfer Duty ─────────────────────────────────────────────────────────────
export function calcTransferDuty(purchasePrice: number, taxYear: TaxYearId = DEFAULT_TAX_YEAR): number {
  if (purchasePrice <= 0) return 0;
  const brackets = TAX_YEARS[taxYear].transferDutyBrackets;
  const bracket = brackets.find((b) => purchasePrice <= b.max) ?? brackets[brackets.length - 1];
  return Math.round(bracket.base + bracket.rate * (purchasePrice - bracket.min));
}

/**
 * Estimate bond registration costs (Deeds Office + conveyancing attorney fees).
 * Based on standard SA sliding scale tariffs — approximate, not a legal quote.
 */
export function calcBondRegistrationCost(bondAmount: number): number {
  if (bondAmount <= 0) return 0;
  // Deeds Office registration fee (stepped tariff)
  let deedsOffice = 0;
  if      (bondAmount <= 85_000)    deedsOffice = 500;
  else if (bondAmount <= 200_000)   deedsOffice = 600;
  else if (bondAmount <= 400_000)   deedsOffice = 900;
  else if (bondAmount <= 800_000)   deedsOffice = 1_200;
  else if (bondAmount <= 1_000_000) deedsOffice = 1_500;
  else if (bondAmount <= 2_000_000) deedsOffice = 2_000;
  else if (bondAmount <= 4_000_000) deedsOffice = 2_500;
  else                              deedsOffice = 3_000;

  // Attorney conveyancing fee (approximate sliding scale)
  let attorney = 0;
  if      (bondAmount <= 100_000)   attorney = 4_500;
  else if (bondAmount <= 200_000)   attorney = 6_000;
  else if (bondAmount <= 300_000)   attorney = 7_500;
  else if (bondAmount <= 500_000)   attorney = 9_500;
  else if (bondAmount <= 750_000)   attorney = 11_000;
  else if (bondAmount <= 1_000_000) attorney = 13_000;
  else if (bondAmount <= 1_500_000) attorney = 16_000;
  else if (bondAmount <= 2_000_000) attorney = 19_000;
  else if (bondAmount <= 3_000_000) attorney = 22_000;
  else if (bondAmount <= 5_000_000) attorney = 26_000;
  else                              attorney = 31_000;

  // VAT on attorney fees (15%)
  const vat = Math.round(attorney * 0.15);
  return deedsOffice + attorney + vat;
}

// ── Rental Income Tax Calculator ──────────────────────────────────────────────
export function calcRentalIncomeTax(inputs: RentalTaxInputs, taxYear: TaxYearId = DEFAULT_TAX_YEAR): RentalTaxResult {
  const {
    monthlyGrossRent,
    annualBondInterest,
    annualRates,
    annualLevies,
    annualInsurance,
    annualRepairs,
    managementFeePercent,
    annualAdvertising,
    otherDeductions,
    otherAnnualIncome,
    ageGroup,
  } = inputs;

  const annualGrossRent = monthlyGrossRent * 12;
  const managementFee = (managementFeePercent / 100) * annualGrossRent;

  const deductionsBreakdown = [
    { name: 'Bond Interest',        value: annualBondInterest },
    { name: 'Rates & Taxes',        value: annualRates },
    { name: 'Levies',               value: annualLevies },
    { name: 'Insurance',            value: annualInsurance },
    { name: 'Repairs & Maintenance',value: annualRepairs },
    { name: 'Management Fee',       value: managementFee },
    { name: 'Advertising',          value: annualAdvertising },
    { name: 'Other Deductions',     value: otherDeductions },
  ].filter((d) => d.value > 0);

  const totalDeductions = deductionsBreakdown.reduce((s, d) => s + d.value, 0);
  const taxableRentalIncome = Math.max(0, annualGrossRent - totalDeductions);
  const totalTaxableIncome = otherAnnualIncome + taxableRentalIncome;

  const taxOnTotalIncome = calcIncomeTax(totalTaxableIncome, ageGroup, taxYear);
  const taxOnOtherIncomeOnly = calcIncomeTax(otherAnnualIncome, ageGroup, taxYear);
  const taxAttributableToRental = Math.max(0, taxOnTotalIncome - taxOnOtherIncomeOnly);

  const effectiveTaxRateOnRental =
    taxableRentalIncome > 0 ? (taxAttributableToRental / taxableRentalIncome) * 100 : 0;

  const afterTaxAnnualRental = taxableRentalIncome - taxAttributableToRental;
  const afterTaxMonthlyRentalCashFlow = afterTaxAnnualRental / 12;

  return {
    annualGrossRent,
    managementFee,
    totalDeductions,
    taxableRentalIncome,
    totalTaxableIncome,
    taxOnTotalIncome,
    taxOnOtherIncomeOnly,
    taxAttributableToRental,
    effectiveTaxRateOnRental,
    marginalRate: getMarginalRate(totalTaxableIncome, taxYear) * 100,
    afterTaxMonthlyRentalCashFlow,
    deductionsBreakdown,
    bracketLabel: getBracketLabel(totalTaxableIncome, taxYear),
  };
}

// ── Section 13sex ─────────────────────────────────────────────────────────────
export function calc13sex(inputs: Section13sexInputs, taxYear: TaxYearId = DEFAULT_TAX_YEAR): Section13sexResult {
  const { units, annualTaxableIncome, raMonthlyContrib, ageGroup } = inputs;
  const n = units.length;
  const marginalRate = getMarginalRate(annualTaxableIncome, taxYear) * 100;

  const EMPTY: Section13sexResult = {
    qualifies: false,
    reason: `You need at least 5 units to qualify. You currently have ${n}.`,
    numberOfUnits: n,
    totalCostExclLand: 0,
    annualDeduction: 0,
    annualTaxSaving: 0,
    totalTaxSavingOverPeriod: 0,
    deductionPeriodYears: 0,
    deductionRate: 0,
    schedule: [],
    unitResults: [],
    totalAnnualRent: 0,
    totalAnnualExpenses: 0,
    totalAnnualCashFlow: 0,
    totalGrossYield: 0,
    totalNetYield: 0,
    raAnnualDeduction: 0,
    raTaxSaving: 0,
    combinedAnnualTaxSaving: 0,
    marginalRate,
  };

  if (n < 5) return EMPTY;

  // Per-unit calculations
  const unitResults: S13UnitResult[] = units.map(u => {
    const rate = u.isLowCostHousing ? 0.10 : 0.05;
    const period = u.isLowCostHousing ? 10 : 20;
    const annualDeductionPerUnit = u.purchasePrice * rate;

    const effectiveMonthlyRent = u.monthlyRent * (1 - u.vacancyRate / 100);
    const annualRent = effectiveMonthlyRent * 12;
    const mgmtFee = (u.managementFeePercent / 100) * annualRent;
    const monthlyExpenses =
      u.monthlyBondRepayment +
      u.monthlyLevies +
      u.monthlyRates +
      u.monthlyInsurance +
      mgmtFee / 12;
    const annualExpenses = monthlyExpenses * 12;
    const annualCashFlow = annualRent - annualExpenses;
    const monthlyCashFlow = annualCashFlow / 12;
    const grossYield = u.purchasePrice > 0 ? (u.monthlyRent * 12 / u.purchasePrice) * 100 : 0;
    const netYield = u.purchasePrice > 0 ? (annualCashFlow / u.purchasePrice) * 100 : 0;

    return {
      id: u.id,
      name: u.name,
      purchasePrice: u.purchasePrice,
      annualDeductionPerUnit,
      deductionPeriodYears: period,
      annualRent,
      monthlyExpenses,
      annualExpenses,
      monthlyCashFlow,
      annualCashFlow,
      grossYield,
      netYield,
    };
  });

  const totalCostExclLand = units.reduce((s, u) => s + u.purchasePrice, 0);
  const maxPeriod = Math.max(...units.map(u => u.isLowCostHousing ? 10 : 20));

  // RA deduction: 27.5% of taxable income, max R350k p.a.
  const { retirement } = TAX_YEARS[taxYear];
  const raAnnual = raMonthlyContrib * 12;
  const raCap = Math.min(annualTaxableIncome * retirement.rate, retirement.cap);
  const raAnnualDeduction = Math.min(raAnnual, raCap);

  const taxBase = calcIncomeTax(annualTaxableIncome, ageGroup, taxYear);
  const raTaxSaving = Math.max(0, taxBase - calcIncomeTax(Math.max(0, annualTaxableIncome - raAnnualDeduction), ageGroup, taxYear));

  // Year-by-year schedule
  const schedule: Section13sexResult['schedule'] = [];
  let cumulativeSaving = 0;
  let combinedCumulative = 0;

  for (let year = 1; year <= maxPeriod; year++) {
    const deductionThisYear = units.reduce((s, u) => {
      const period = u.isLowCostHousing ? 10 : 20;
      const rate = u.isLowCostHousing ? 0.10 : 0.05;
      return year <= period ? s + u.purchasePrice * rate : s;
    }, 0);

    const incomeAfterS13 = Math.max(0, annualTaxableIncome - deductionThisYear);
    const incomeAfterBoth = Math.max(0, incomeAfterS13 - raAnnualDeduction);

    const taxWithS13 = calcIncomeTax(incomeAfterS13, ageGroup, taxYear);
    const taxWithBoth = calcIncomeTax(incomeAfterBoth, ageGroup, taxYear);

    const taxSaving = Math.max(0, taxBase - taxWithS13);
    const raTaxSavingYear = Math.max(0, taxWithS13 - taxWithBoth);
    const combinedSaving = Math.max(0, taxBase - taxWithBoth);

    cumulativeSaving += taxSaving;
    combinedCumulative += combinedSaving;

    schedule.push({ year, deduction: deductionThisYear, taxSaving, cumulativeSaving, raTaxSaving: raTaxSavingYear, combinedSaving, combinedCumulative });
  }

  const annualDeduction = schedule[0]?.deduction ?? 0;
  const annualTaxSaving = schedule[0]?.taxSaving ?? 0;
  const combinedAnnualTaxSaving = schedule[0]?.combinedSaving ?? 0;
  const deductionRate = totalCostExclLand > 0 ? annualDeduction / totalCostExclLand : 0.05;

  const totalAnnualRent = unitResults.reduce((s, u) => s + u.annualRent, 0);
  const totalAnnualExpenses = unitResults.reduce((s, u) => s + u.annualExpenses, 0);
  const totalAnnualCashFlow = unitResults.reduce((s, u) => s + u.annualCashFlow, 0);
  const totalGrossYield = totalCostExclLand > 0
    ? (units.reduce((s, u) => s + u.monthlyRent * 12, 0) / totalCostExclLand) * 100
    : 0;
  const totalNetYield = totalCostExclLand > 0 ? (totalAnnualCashFlow / totalCostExclLand) * 100 : 0;

  return {
    qualifies: true,
    numberOfUnits: n,
    totalCostExclLand,
    annualDeduction,
    annualTaxSaving,
    totalTaxSavingOverPeriod: cumulativeSaving,
    deductionPeriodYears: maxPeriod,
    deductionRate,
    schedule,
    unitResults,
    totalAnnualRent,
    totalAnnualExpenses,
    totalAnnualCashFlow,
    totalGrossYield,
    totalNetYield,
    raAnnualDeduction,
    raTaxSaving,
    combinedAnnualTaxSaving,
    marginalRate,
  };
}

// ── Section 13quat (UDZ) ──────────────────────────────────────────────────────
export function calc13quat(inputs: Section13quatInputs, taxYear: TaxYearId = DEFAULT_TAX_YEAR): Section13quatResult {
  const { buildingCost, buildingType, annualTaxableIncome, ageGroup } = inputs;

  const rawSchedule = TAX_YEARS[taxYear].udzSchedules[buildingType];
  const schedule: Section13quatResult['schedule'] = [];
  let cumulativeSaving = 0;
  let yearCounter = 1;

  for (const { rate, years } of rawSchedule) {
    for (let i = 0; i < years; i++) {
      const deduction = rate * buildingCost;
      const reducedIncome = Math.max(0, annualTaxableIncome - deduction);
      const taxWith = calcIncomeTax(reducedIncome, ageGroup, taxYear);
      const taxWithout = calcIncomeTax(annualTaxableIncome, ageGroup, taxYear);
      const taxSaving = Math.max(0, taxWithout - taxWith);
      cumulativeSaving += taxSaving;
      schedule.push({ year: yearCounter++, rate, deduction, taxSaving, cumulativeSaving });
    }
  }

  const year1 = schedule[0];

  return {
    totalAllowance: buildingCost,
    schedule,
    totalTaxSaving: cumulativeSaving,
    year1Deduction: year1?.deduction ?? 0,
    year1TaxSaving: year1?.taxSaving ?? 0,
  };
}

// ── PAYE / Salary Calculator ──────────────────────────────────────────────────
// Medical aid credits and UIF constants live in config/taxYears.ts, per year.

export interface PAYEInputs {
  grossMonthly:       number;
  ageGroup:           AgeGroup;
  raMonthlyContrib:   number;  // voluntary RA contribution per month
  medAidDependants:   number;  // 0 = main member only, 1 = main + 1, 2 = main + 2, etc.
}

export interface PAYEResult {
  grossAnnual:        number;
  taxableIncome:      number;   // after RA deduction
  grossTaxBefore:     number;   // before rebates & medical credits
  rebateAmount:       number;
  medCreditMonthly:   number;
  medCreditAnnual:    number;
  raDeduction:        number;   // actual annual RA deduction applied
  annualPAYE:         number;
  monthlyPAYE:        number;
  monthlyUIF:         number;
  monthlyRA:          number;
  monthlyNet:         number;
  effectiveRate:      number;   // annualPAYE / grossAnnual (%)
  marginalRate:       number;   // marginal bracket rate (%)
}

export function calcPAYE(inputs: PAYEInputs, taxYear: TaxYearId = DEFAULT_TAX_YEAR): PAYEResult {
  const { grossMonthly, ageGroup, raMonthlyContrib, medAidDependants } = inputs;
  const { brackets, rebates, medCredits, uif, retirement } = TAX_YEARS[taxYear];

  const grossAnnual = grossMonthly * 12;

  // RA deduction: 27.5% of greater of remuneration or taxable income, max R350,000 p.a.
  const raAnnual    = raMonthlyContrib * 12;
  const raCap       = Math.min(grossAnnual * retirement.rate, retirement.cap);
  const raDeduction = Math.min(raAnnual, raCap);

  const taxableIncome = Math.max(0, grossAnnual - raDeduction);

  // Gross tax from brackets
  const bracket    = brackets.find((b) => taxableIncome <= b.max) ?? brackets[brackets.length - 1];
  const grossTax   = taxableIncome > 0 ? bracket.base + bracket.rate * (taxableIncome - bracket.min + 1) : 0;

  // Rebate
  const reb = rebates[ageGroup];

  // Medical aid tax credit — pass medAidDependants = -1 to indicate no medical aid
  const deps = medAidDependants;
  const medMonthly = deps < 0 ? 0
    : deps === 0 ? medCredits.main
    : deps === 1 ? medCredits.main + medCredits.firstDep
    : medCredits.main + medCredits.firstDep + (deps - 1) * medCredits.extraDep;
  const medAnnual = medMonthly * 12;

  const annualPAYE  = Math.max(0, grossTax - reb - medAnnual);
  const monthlyPAYE = annualPAYE / 12;
  const monthlyUIF  = Math.min(grossMonthly * uif.rate, uif.capMonthly);
  const monthlyNet  = grossMonthly - monthlyPAYE - monthlyUIF - raMonthlyContrib;

  return {
    grossAnnual,
    taxableIncome,
    grossTaxBefore:  grossTax,
    rebateAmount:    reb,
    medCreditMonthly: medMonthly,
    medCreditAnnual: medAnnual,
    raDeduction,
    annualPAYE,
    monthlyPAYE,
    monthlyUIF,
    monthlyRA:       raMonthlyContrib,
    monthlyNet,
    effectiveRate:   grossAnnual > 0 ? (annualPAYE / grossAnnual) * 100 : 0,
    marginalRate:    bracket.rate * 100,
  };
}

// ── Capital Gains Tax ─────────────────────────────────────────────────────────
export function calcCGT(inputs: CGTInputs, taxYear: TaxYearId = DEFAULT_TAX_YEAR): CGTResult {
  const {
    purchasePrice,
    acquisitionCosts,
    salePrice,
    saleCostsPercent,
    propertyType,
    jointOwnership,
    otherAnnualTaxableIncome,
    ageGroup,
  } = inputs;
  const { cgt } = TAX_YEARS[taxYear];

  const saleCosts = (saleCostsPercent / 100) * salePrice;
  const baseCost = purchasePrice + acquisitionCosts;
  const grossCapitalGain = Math.max(0, salePrice - saleCosts - baseCost);

  // Primary residence exclusion
  let primaryResidenceExclusion = 0;
  if (propertyType === 'primary') {
    const fullExclusion = cgt.primaryResidenceExclusion;
    primaryResidenceExclusion = jointOwnership
      ? Math.min(grossCapitalGain, fullExclusion / 2) // each spouse gets half
      : Math.min(grossCapitalGain, fullExclusion);
  }

  const gainAfterPrimary = Math.max(0, grossCapitalGain - primaryResidenceExclusion);

  // Annual exclusion for individuals
  const annualExclusion = Math.min(gainAfterPrimary, cgt.annualExclusion);
  const netGainAfterExclusions = Math.max(0, gainAfterPrimary - annualExclusion);

  // Inclusion amount: 40% of net gain added to taxable income
  const inclusionAmount = netGainAfterExclusions * cgt.inclusionRate;

  const taxWithCGT = calcIncomeTax(otherAnnualTaxableIncome + inclusionAmount, ageGroup, taxYear);
  const taxWithoutCGT = calcIncomeTax(otherAnnualTaxableIncome, ageGroup, taxYear);
  const cgtPayable = Math.max(0, taxWithCGT - taxWithoutCGT);

  const effectiveCGTRate = grossCapitalGain > 0 ? (cgtPayable / grossCapitalGain) * 100 : 0;
  const netProceedsAfterCGT = salePrice - saleCosts - cgtPayable;

  return {
    grossCapitalGain,
    saleCosts,
    baseCost,
    primaryResidenceExclusion,
    annualExclusion,
    netGainAfterExclusions,
    inclusionAmount,
    taxOnIncomeWithCGT: taxWithCGT,
    taxOnIncomeWithoutCGT: taxWithoutCGT,
    cgtPayable,
    effectiveCGTRate,
    netProceedsAfterCGT,
    marginalRate: getMarginalRate(otherAnnualTaxableIncome + inclusionAmount, taxYear) * 100,
    bracketLabel: getBracketLabel(otherAnnualTaxableIncome + inclusionAmount, taxYear),
  };
}
