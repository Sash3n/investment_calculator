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
const CGT_PRIMARY_RESIDENCE_EXCLUSION = 3_000_000; // increased from R2M in 2026 budget
const CGT_ANNUAL_EXCLUSION = 50_000;               // increased from R40K in 2026 budget
const CGT_INCLUSION_RATE = 0.40;

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
  const { numberOfUnits, purchasePricePerUnit, isLowCostHousing, annualTaxableIncome, ageGroup } = inputs;

  if (numberOfUnits < 5) {
    return {
      qualifies: false,
      reason: `You need at least 5 units to qualify. You have ${numberOfUnits}.`,
      totalCostExclLand: 0,
      annualDeduction: 0,
      annualTaxSaving: 0,
      totalTaxSavingOverPeriod: 0,
      deductionPeriodYears: 0,
      deductionRate: 0,
      schedule: [],
    };
  }

  const deductionRate = isLowCostHousing ? 0.10 : 0.05;
  const deductionPeriodYears = isLowCostHousing ? 10 : 20;
  const totalCostExclLand = purchasePricePerUnit * numberOfUnits;
  const annualDeduction = deductionRate * totalCostExclLand;

  const schedule: Section13sexResult['schedule'] = [];
  let cumulativeSaving = 0;

  for (let year = 1; year <= deductionPeriodYears; year++) {
    const reducedIncome = Math.max(0, annualTaxableIncome - annualDeduction);
    const taxWithDeduction = calcIncomeTax(reducedIncome, ageGroup);
    const taxWithoutDeduction = calcIncomeTax(annualTaxableIncome, ageGroup);
    const taxSaving = Math.max(0, taxWithoutDeduction - taxWithDeduction);
    cumulativeSaving += taxSaving;
    schedule.push({ year, deduction: annualDeduction, taxSaving, cumulativeSaving });
  }

  const annualTaxSaving = schedule[0]?.taxSaving ?? 0;
  const totalTaxSavingOverPeriod = cumulativeSaving;

  return {
    qualifies: true,
    totalCostExclLand,
    annualDeduction,
    annualTaxSaving,
    totalTaxSavingOverPeriod,
    deductionPeriodYears,
    deductionRate,
    schedule,
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
