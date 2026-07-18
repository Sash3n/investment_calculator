/**
 * FinCalc ZA — Property Portfolio Tax
 *
 * Aggregates every rental property into one combined SARS rental-income-tax
 * picture, and detects when the portfolio crosses the Section 13sex threshold:
 * owning at least 5 new-and-unused residential units unlocks a 5% p.a. (20-year)
 * depreciation allowance on building cost (10% over 10 years for low-cost
 * housing), claimed against taxable income.
 *
 * Standard treatment (any number of properties): net rental profit/loss is
 * added to other taxable income and taxed at marginal rates; a combined loss
 * offsets other income (s20A ring-fencing not modelled, noted in UI).
 */

import type {
  PortfolioTaxInputs,
  PortfolioTaxResult,
  PortfolioPropertyResult,
  S13Unit,
} from '../types';
import { calcIncomeTax, getMarginalRate, getBracketLabel, calc13sex } from './tax';
import { DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';

export const S13SEX_MIN_UNITS = 5;

export function calcPortfolioTax(
  inputs: PortfolioTaxInputs,
  taxYear: TaxYearId = DEFAULT_TAX_YEAR,
): PortfolioTaxResult {
  const { properties, otherAnnualIncome, ageGroup, raMonthlyContrib } = inputs;

  // ── Per-property net profit ─────────────────────────────────────────────────
  const perProperty: PortfolioPropertyResult[] = properties.map((p) => {
    const effectiveAnnualRent = Math.max(0, p.monthlyRent) * (1 - Math.min(100, Math.max(0, p.vacancyRate)) / 100) * 12;
    const managementFee = (Math.max(0, p.managementFeePercent) / 100) * effectiveAnnualRent;
    const totalDeductions =
      Math.max(0, p.annualBondInterest) +
      Math.max(0, p.annualRates) +
      Math.max(0, p.annualLevies) +
      Math.max(0, p.annualInsurance) +
      Math.max(0, p.annualRepairs) +
      Math.max(0, p.otherAnnualDeductions) +
      managementFee;
    return {
      id: p.id,
      name: p.name,
      annualRent: effectiveAnnualRent,
      totalDeductions,
      netProfit: effectiveAnnualRent - totalDeductions,
    };
  });

  const totalAnnualRent = perProperty.reduce((s, p) => s + p.annualRent, 0);
  const totalDeductions = perProperty.reduce((s, p) => s + p.totalDeductions, 0);
  const netRentalIncome = totalAnnualRent - totalDeductions;

  // ── Standard combined treatment ─────────────────────────────────────────────
  const totalTaxableIncome = Math.max(0, otherAnnualIncome + netRentalIncome);
  const taxOnTotal = calcIncomeTax(totalTaxableIncome, ageGroup, taxYear);
  const taxOnOtherIncomeOnly = calcIncomeTax(Math.max(0, otherAnnualIncome), ageGroup, taxYear);
  const taxAttributableToRental = Math.max(0, taxOnTotal - taxOnOtherIncomeOnly);

  const effectiveTaxRateOnRental = netRentalIncome > 0
    ? (taxAttributableToRental / netRentalIncome) * 100
    : 0;
  const afterTaxMonthlyCashFlow = (netRentalIncome - taxAttributableToRental) / 12;

  // ── Section 13sex detection ─────────────────────────────────────────────────
  const qualifying = properties.filter((p) => p.isNewUnused);
  const s13Qualifies = qualifying.length >= S13SEX_MIN_UNITS;

  let s13: PortfolioTaxResult['s13'];
  let s13AnnualTaxSaving = 0;
  if (s13Qualifies) {
    const units: S13Unit[] = qualifying.map((p) => ({
      id: p.id,
      name: p.name,
      purchasePrice: Math.max(0, p.purchasePrice),
      monthlyRent: Math.max(0, p.monthlyRent),
      isLowCostHousing: p.isLowCostHousing,
      // calc13sex expects monthly running costs; derive from the annual figures
      monthlyBondRepayment: Math.max(0, p.annualBondInterest) / 12,
      monthlyLevies: Math.max(0, p.annualLevies) / 12,
      monthlyRates: Math.max(0, p.annualRates) / 12,
      monthlyInsurance: Math.max(0, p.annualInsurance) / 12,
      managementFeePercent: Math.max(0, p.managementFeePercent),
      vacancyRate: Math.min(100, Math.max(0, p.vacancyRate)),
    }));
    s13 = calc13sex({
      units,
      annualTaxableIncome: totalTaxableIncome,
      raMonthlyContrib: Math.max(0, raMonthlyContrib),
      ageGroup,
    }, taxYear);
    s13AnnualTaxSaving = s13.annualTaxSaving;
  }

  return {
    perProperty,
    totalAnnualRent,
    totalDeductions,
    netRentalIncome,
    totalTaxableIncome,
    taxOnOtherIncomeOnly,
    taxAttributableToRental,
    effectiveTaxRateOnRental,
    marginalRate: getMarginalRate(totalTaxableIncome, taxYear) * 100,
    afterTaxMonthlyCashFlow,
    bracketLabel: getBracketLabel(totalTaxableIncome, taxYear),
    s13QualifyingUnits: qualifying.length,
    s13Qualifies,
    s13,
    s13AnnualTaxSaving,
  };
}
