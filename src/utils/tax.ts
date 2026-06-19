/**
 * FinCalc ZA — Tax Calculation Utilities
 * Based on SARS 2026 tax year (1 March 2025 – 28 February 2026)
 *
 * Sources:
 *  - SARS Budget 2026 Tax Guide (treasury.gov.za)
 *  - Section 13sex, 13quat of the Income Tax Act
 *  - SARS CGT rates and exclusions
 */

import type {
  AgeGroup,
  UDZBuildingType,
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

// ── SARS 2026 Tax Brackets (1 Mar 2025 – 28 Feb 2026) ────────────────────────
const BRACKETS = [
  { min: 0,          max: 237_100,    base: 0,         rate: 0.18 },
  { min: 237_101,    max: 370_500,    base: 42_678,    rate: 0.26 },
  { min: 370_501,    max: 512_800,    base: 77_362,    rate: 0.31 },
  { min: 512_801,    max: 673_000,    base: 121_475,   rate: 0.36 },
  { min: 673_001,    max: 857_900,    base: 179_147,   rate: 0.39 },
  { min: 857_901,    max: 1_817_000,  base: 251_258,   rate: 0.41 },
  { min: 1_817_001,  max: Infinity,   base: 644_489,   rate: 0.45 },
];

const REBATES: Record<AgeGroup, number> = {
  under65: 17_235,
  '65to74': 17_235 + 9_444,    // primary + secondary
  '75plus': 17_235 + 9_444 + 3_145, // primary + secondary + tertiary
};

// CGT 2026 constants
export const CGT_PRIMARY_RESIDENCE_EXCLUSION = 3_000_000; // increased from R2M in 2026 budget
export const CGT_ANNUAL_EXCLUSION = 50_000;               // increased from R40K in 2026 budget
export const CGT_INCLUSION_RATE = 0.40;

// ── Core: compute SARS income tax ─────────────────────────────────────────────
export function calcIncomeTax(taxableIncome: number, ageGroup: AgeGroup): number {
  if (taxableIncome <= 0) return 0;
  const bracket = BRACKETS.find((b) => taxableIncome <= b.max) ?? BRACKETS[BRACKETS.length - 1];
  const grossTax = bracket.base + bracket.rate * (taxableIncome - bracket.min + 1);
  const netTax = Math.max(0, grossTax - REBATES[ageGroup]);
  return netTax;
}

export function getMarginalRate(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  const bracket = BRACKETS.find((b) => taxableIncome <= b.max) ?? BRACKETS[BRACKETS.length - 1];
  return bracket.rate;
}

export function getBracketLabel(taxableIncome: number): string {
  const rate = getMarginalRate(taxableIncome);
  return `${(rate * 100).toFixed(0)}% marginal bracket`;
}

// ── Transfer Duty (SARS 2026: 1 Mar 2025 – 28 Feb 2026) ──────────────────────
// Source: SARS Budget 2026 — no change from 2025 table
const TRANSFER_DUTY_BRACKETS = [
  { min: 0,          max: 1_100_000,  base: 0,         rate: 0.00 },
  { min: 1_100_001,  max: 1_512_500,  base: 0,         rate: 0.03 },
  { min: 1_512_501,  max: 2_117_500,  base: 12_375,    rate: 0.06 },
  { min: 2_117_501,  max: 2_722_500,  base: 48_675,    rate: 0.08 },
  { min: 2_722_501,  max: 12_100_000, base: 97_075,    rate: 0.11 },
  { min: 12_100_001, max: Infinity,   base: 1_128_600, rate: 0.13 },
];

export function calcTransferDuty(purchasePrice: number): number {
  if (purchasePrice <= 0) return 0;
  const bracket = TRANSFER_DUTY_BRACKETS.find((b) => purchasePrice <= b.max)
    ?? TRANSFER_DUTY_BRACKETS[TRANSFER_DUTY_BRACKETS.length - 1];
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
export function calcRentalIncomeTax(inputs: RentalTaxInputs): RentalTaxResult {
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

  const taxOnTotalIncome = calcIncomeTax(totalTaxableIncome, ageGroup);
  const taxOnOtherIncomeOnly = calcIncomeTax(otherAnnualIncome, ageGroup);
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
    marginalRate: getMarginalRate(totalTaxableIncome) * 100,
    afterTaxMonthlyRentalCashFlow,
    deductionsBreakdown,
    bracketLabel: getBracketLabel(totalTaxableIncome),
  };
}

// ── Section 13sex ─────────────────────────────────────────────────────────────
export function calc13sex(inputs: Section13sexInputs): Section13sexResult {
  const { units, annualTaxableIncome, raMonthlyContrib, ageGroup } = inputs;
  const n = units.length;
  const marginalRate = getMarginalRate(annualTaxableIncome) * 100;

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
  const raAnnual = raMonthlyContrib * 12;
  const raCap = Math.min(annualTaxableIncome * 0.275, 350_000);
  const raAnnualDeduction = Math.min(raAnnual, raCap);

  const taxBase = calcIncomeTax(annualTaxableIncome, ageGroup);
  const raTaxSaving = Math.max(0, taxBase - calcIncomeTax(Math.max(0, annualTaxableIncome - raAnnualDeduction), ageGroup));

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

    const taxWithS13 = calcIncomeTax(incomeAfterS13, ageGroup);
    const taxWithBoth = calcIncomeTax(incomeAfterBoth, ageGroup);

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
const UDZ_SCHEDULES: Record<UDZBuildingType, { rate: number; years: number }[]> = {
  new: [
    { rate: 0.20, years: 1 },
    { rate: 0.08, years: 10 },
  ],
  improvements: [
    { rate: 0.20, years: 5 },
  ],
  lowcost: [
    { rate: 0.25, years: 4 },
  ],
};

export function calc13quat(inputs: Section13quatInputs): Section13quatResult {
  const { buildingCost, buildingType, annualTaxableIncome, ageGroup } = inputs;

  const rawSchedule = UDZ_SCHEDULES[buildingType];
  const schedule: Section13quatResult['schedule'] = [];
  let cumulativeSaving = 0;
  let yearCounter = 1;

  for (const { rate, years } of rawSchedule) {
    for (let i = 0; i < years; i++) {
      const deduction = rate * buildingCost;
      const reducedIncome = Math.max(0, annualTaxableIncome - deduction);
      const taxWith = calcIncomeTax(reducedIncome, ageGroup);
      const taxWithout = calcIncomeTax(annualTaxableIncome, ageGroup);
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
// Medical aid tax credits (2026 tax year)
const MED_CREDIT_MAIN      = 364;  // per month, main member
const MED_CREDIT_FIRST_DEP = 364;  // per month, first dependant
const MED_CREDIT_EXTRA_DEP = 246;  // per month, each additional dependant

// UIF: 1% of remuneration, capped at R17,712/month → max R177.12/mo
const UIF_RATE        = 0.01;
const UIF_CAP_MONTHLY = 177.12;

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

export function calcPAYE(inputs: PAYEInputs): PAYEResult {
  const { grossMonthly, ageGroup, raMonthlyContrib, medAidDependants } = inputs;

  const grossAnnual = grossMonthly * 12;

  // RA deduction: 27.5% of greater of remuneration or taxable income, max R350,000 p.a.
  const raAnnual    = raMonthlyContrib * 12;
  const raCap       = Math.min(grossAnnual * 0.275, 350_000);
  const raDeduction = Math.min(raAnnual, raCap);

  const taxableIncome = Math.max(0, grossAnnual - raDeduction);

  // Gross tax from brackets
  const bracket    = BRACKETS.find((b) => taxableIncome <= b.max) ?? BRACKETS[BRACKETS.length - 1];
  const grossTax   = taxableIncome > 0 ? bracket.base + bracket.rate * (taxableIncome - bracket.min + 1) : 0;

  // Rebate
  const reb = REBATES[ageGroup];

  // Medical aid tax credit — pass medAidDependants = -1 to indicate no medical aid
  const deps = medAidDependants;
  const medMonthly = deps < 0 ? 0
    : deps === 0 ? MED_CREDIT_MAIN
    : deps === 1 ? MED_CREDIT_MAIN + MED_CREDIT_FIRST_DEP
    : MED_CREDIT_MAIN + MED_CREDIT_FIRST_DEP + (deps - 1) * MED_CREDIT_EXTRA_DEP;
  const medAnnual = medMonthly * 12;

  const annualPAYE  = Math.max(0, grossTax - reb - medAnnual);
  const monthlyPAYE = annualPAYE / 12;
  const monthlyUIF  = Math.min(grossMonthly * UIF_RATE, UIF_CAP_MONTHLY);
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
export function calcCGT(inputs: CGTInputs): CGTResult {
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

  const saleCosts = (saleCostsPercent / 100) * salePrice;
  const baseCost = purchasePrice + acquisitionCosts;
  const grossCapitalGain = Math.max(0, salePrice - saleCosts - baseCost);

  // Primary residence exclusion
  let primaryResidenceExclusion = 0;
  if (propertyType === 'primary') {
    const fullExclusion = CGT_PRIMARY_RESIDENCE_EXCLUSION;
    primaryResidenceExclusion = jointOwnership
      ? Math.min(grossCapitalGain, fullExclusion / 2) // each spouse gets R1.5M
      : Math.min(grossCapitalGain, fullExclusion);
  }

  const gainAfterPrimary = Math.max(0, grossCapitalGain - primaryResidenceExclusion);

  // Annual exclusion (R50,000 for individuals, 2026)
  const annualExclusion = Math.min(gainAfterPrimary, CGT_ANNUAL_EXCLUSION);
  const netGainAfterExclusions = Math.max(0, gainAfterPrimary - annualExclusion);

  // Inclusion amount: 40% of net gain added to taxable income
  const inclusionAmount = netGainAfterExclusions * CGT_INCLUSION_RATE;

  const taxWithCGT = calcIncomeTax(otherAnnualTaxableIncome + inclusionAmount, ageGroup);
  const taxWithoutCGT = calcIncomeTax(otherAnnualTaxableIncome, ageGroup);
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
    marginalRate: getMarginalRate(otherAnnualTaxableIncome + inclusionAmount) * 100,
    bracketLabel: getBracketLabel(otherAnnualTaxableIncome + inclusionAmount),
  };
}
