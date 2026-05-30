/**
 * FinCalc ZA — Optimal Exit Planner ("When should I sell?")
 *
 * Models the after-tax outcome of selling an investment property in different
 * years, combining three effects most investors overlook:
 *   1. Section 13sex recoupment — allowances previously deducted are clawed
 *      back as ordinary income (taxed at your marginal rate) on disposal.
 *   2. Capital Gains Tax on the genuine appreciation above original cost.
 *   3. The cumulative income-tax saving enjoyed while holding the property.
 *
 * The "net lifetime tax position" = S13 savings received − tax paid on exit,
 * which reveals the recoupment trap of selling soon after claiming allowances.
 *
 * Educational model — simplified. Recoupment assumes proceeds exceed tax value
 * (true while the property appreciates), so the full allowances claimed are
 * recouped. CGT applies to appreciation above original purchase cost.
 */

import type { AgeGroup } from '../types';
import { calcIncomeTax, getMarginalRate, CGT_ANNUAL_EXCLUSION, CGT_INCLUSION_RATE } from './tax';

export interface ExitPlannerInputs {
  purchasePrice: number;          // total acquisition cost
  buildingCostExclLand: number;   // portion qualifying for S13sex
  isLowCostHousing: boolean;      // 10%/10yr vs 5%/20yr
  claimingS13: boolean;           // whether S13sex allowances are being claimed
  annualAppreciation: number;     // % p.a.
  saleCostsPercent: number;       // agent commission %
  otherAnnualTaxableIncome: number;
  ageGroup: AgeGroup;
  saleYears: number[];            // years-held scenarios to evaluate
}

export interface ExitYearResult {
  year: number;
  saleValue: number;
  saleCosts: number;
  deductionsClaimed: number;      // cumulative S13 allowances to date
  cumulativeS13Saving: number;    // income tax saved while holding
  recoupment: number;             // allowances clawed back
  recoupmentTax: number;
  capitalGain: number;
  cgtInclusion: number;
  cgtTax: number;
  totalExitTax: number;           // recoupment tax + CGT
  netProceedsAfterTax: number;    // saleValue − saleCosts − totalExitTax
  netLifetimeTaxPosition: number; // cumulativeS13Saving − totalExitTax
  effectiveExitTaxRate: number;   // totalExitTax / capitalGain
}

export interface ExitPlannerResult {
  rate: number;                   // S13 deduction rate
  period: number;                 // S13 deduction period (years)
  annualDeduction: number;
  years: ExitYearResult[];
  bestYear: ExitYearResult | null;        // highest net proceeds after tax
  bestLifetimeYear: ExitYearResult | null; // best net lifetime tax position
}

export function calcExitPlanner(inputs: ExitPlannerInputs): ExitPlannerResult {
  const {
    purchasePrice, buildingCostExclLand, isLowCostHousing, claimingS13,
    annualAppreciation, saleCostsPercent, otherAnnualTaxableIncome, ageGroup, saleYears,
  } = inputs;

  const rate = isLowCostHousing ? 0.10 : 0.05;
  const period = isLowCostHousing ? 10 : 20;
  const annualDeduction = claimingS13 ? buildingCostExclLand * rate : 0;
  const marginal = getMarginalRate(otherAnnualTaxableIncome);
  const baseTax = calcIncomeTax(otherAnnualTaxableIncome, ageGroup);

  const years: ExitYearResult[] = saleYears.map((year) => {
    const saleValue = purchasePrice * Math.pow(1 + annualAppreciation / 100, year);
    const saleCosts = saleValue * (saleCostsPercent / 100);

    // Cumulative S13 allowances claimed to date and the income tax they saved.
    const yearsClaimed = Math.min(year, period);
    const deductionsClaimed = annualDeduction * yearsClaimed;
    // Tax saved each year ≈ marginal rate × annual deduction (held constant for simplicity).
    const cumulativeS13Saving = deductionsClaimed * marginal;

    // Recoupment: full allowances clawed back as ordinary income (proceeds > tax value).
    const recoupment = deductionsClaimed;
    const recoupmentTax = Math.max(0, calcIncomeTax(otherAnnualTaxableIncome + recoupment, ageGroup) - baseTax);

    // Capital gain = appreciation above original purchase cost (recoupment handles the rest).
    const capitalGain = Math.max(0, saleValue - saleCosts - purchasePrice);
    const cgtInclusion = Math.max(0, capitalGain - CGT_ANNUAL_EXCLUSION) * CGT_INCLUSION_RATE;
    // CGT stacks on top of income that already includes the recoupment.
    const incomeWithRecoup = otherAnnualTaxableIncome + recoupment;
    const cgtTax = Math.max(0, calcIncomeTax(incomeWithRecoup + cgtInclusion, ageGroup) - calcIncomeTax(incomeWithRecoup, ageGroup));

    const totalExitTax = recoupmentTax + cgtTax;
    const netProceedsAfterTax = saleValue - saleCosts - totalExitTax;
    const netLifetimeTaxPosition = cumulativeS13Saving - totalExitTax;
    const effectiveExitTaxRate = capitalGain > 0 ? (totalExitTax / capitalGain) * 100 : 0;

    return {
      year, saleValue, saleCosts, deductionsClaimed, cumulativeS13Saving,
      recoupment, recoupmentTax, capitalGain, cgtInclusion, cgtTax,
      totalExitTax, netProceedsAfterTax, netLifetimeTaxPosition, effectiveExitTaxRate,
    };
  });

  const bestYear = years.reduce<ExitYearResult | null>(
    (best, y) => (!best || y.netProceedsAfterTax > best.netProceedsAfterTax ? y : best), null);
  const bestLifetimeYear = years.reduce<ExitYearResult | null>(
    (best, y) => (!best || y.netLifetimeTaxPosition > best.netLifetimeTaxPosition ? y : best), null);

  return { rate, period, annualDeduction, years, bestYear, bestLifetimeYear };
}
