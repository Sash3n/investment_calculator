import type { PropertyInputs, PropertyResult } from '../types';
import { calcPayment } from './mortgage';
import { calcTransferDuty, calcBondRegistrationCost } from './tax';

/**
 * Calculate property ROI for a buy-to-let investment.
 */
export function calcPropertyROI(inputs: PropertyInputs): PropertyResult {
  const {
    purchasePrice,
    discount,
    deposit,
    interestRate,
    bondTerm,
    monthlyLevies,
    monthlyRates,
    insurance,
    effluentFees,
    miscFees,
    monthlyServiceFee,
    managementFeePercent,
    vacancyRate,
    rentScenario1,
    rentScenario2,
    annualAppreciation,
    transferDutyExempt,
    bondRegistrationIncluded,
    initiationFee,
    initiationFeeCapitalised,
  } = inputs;

  // ── Effective price after discount ───────────────────────
  const effectivePurchasePrice = purchasePrice * (1 - discount / 100);
  const baseLoan = Math.max(0, effectivePurchasePrice - deposit) + (initiationFeeCapitalised ? initiationFee : 0);

  // ── Acquisition costs ─────────────────────────────────────
  const transferDuty = transferDutyExempt ? 0 : calcTransferDuty(effectivePurchasePrice);
  const bondRegistrationCostFull = calcBondRegistrationCost(baseLoan);
  const bondRegistrationCost = bondRegistrationIncluded ? 0 : bondRegistrationCostFull;
  const loanAmount = baseLoan + (bondRegistrationIncluded ? bondRegistrationCostFull : 0);
  const utilityConnectionFee = inputs.utilityConnectionFee ?? 0;
  const initiationFeeCash = initiationFeeCapitalised ? 0 : initiationFee;
  const totalAcquisitionCost = deposit + transferDuty + bondRegistrationCost + utilityConnectionFee + initiationFeeCash;
  const totalCashRequired = totalAcquisitionCost;

  // ── Monthly bond repayment ────────────────────────────────
  const monthlyBondRepayment = calcPayment(loanAmount, interestRate, bondTerm, 12);

  // ── Effective rent (after vacancy) ───────────────────────
  const vacancyFactor = 1 - vacancyRate / 100;
  const monthlyEffectiveRentS1 = rentScenario1 * vacancyFactor;
  const monthlyEffectiveRentS2 = rentScenario2 * vacancyFactor;

  // ── Management fee ────────────────────────────────────────
  const managementFeeS1 = monthlyEffectiveRentS1 * (managementFeePercent / 100);
  const managementFeeS2 = monthlyEffectiveRentS2 * (managementFeePercent / 100);

  // ── Total monthly costs ───────────────────────────────────
  const fixedMonthlyCosts = monthlyBondRepayment + (monthlyServiceFee ?? 0) + monthlyLevies + monthlyRates + insurance + effluentFees + miscFees;
  const totalMonthlyCostsS1 = fixedMonthlyCosts + managementFeeS1;
  const totalMonthlyCostsS2 = fixedMonthlyCosts + managementFeeS2;

  // ── Cash flow ─────────────────────────────────────────────
  const cashFlowS1 = monthlyEffectiveRentS1 - totalMonthlyCostsS1;
  const cashFlowS2 = monthlyEffectiveRentS2 - totalMonthlyCostsS2;

  // ── Gross rental yield ────────────────────────────────────
  const grossYieldS1 = effectivePurchasePrice > 0
    ? ((rentScenario1 * 12) / effectivePurchasePrice) * 100
    : 0;
  const grossYieldS2 = effectivePurchasePrice > 0
    ? ((rentScenario2 * 12) / effectivePurchasePrice) * 100
    : 0;

  // ── Net yield ─────────────────────────────────────────────
  const annualNetIncomeS1 = cashFlowS1 * 12;
  const annualNetIncomeS2 = cashFlowS2 * 12;
  const netYieldS1 = effectivePurchasePrice > 0 ? (annualNetIncomeS1 / effectivePurchasePrice) * 100 : 0;
  const netYieldS2 = effectivePurchasePrice > 0 ? (annualNetIncomeS2 / effectivePurchasePrice) * 100 : 0;

  // ── ROI calculation over N years ──────────────────────────
  // ROI = (Capital Gain + Net Rental Income) / Total Cash Invested × 100
  // Total cash invested = deposit + transfer duty + bond registration costs
  const calcROI = (years: number, cashFlow: number) => {
    const futureValue = effectivePurchasePrice * Math.pow(1 + annualAppreciation / 100, years);
    const capitalGain = futureValue - effectivePurchasePrice;
    const totalNetRental = cashFlow * 12 * years;
    const totalInvestment = totalAcquisitionCost > 0 ? totalAcquisitionCost : effectivePurchasePrice;
    if (totalInvestment <= 0) return 0;
    return ((capitalGain + totalNetRental) / totalInvestment) * 100;
  };

  const roi5YearS1 = calcROI(5, cashFlowS1);
  const roi5YearS2 = calcROI(5, cashFlowS2);
  const roi10YearS1 = calcROI(10, cashFlowS1);
  const roi10YearS2 = calcROI(10, cashFlowS2);

  // ── Property value + equity over 10 years ────────────────
  // Approximate loan balance using remaining balance formula
  const annualRate = interestRate / 100;
  const monthlyRate = annualRate / 12;
  const totalPayments = bondTerm * 12;

  const loanBalanceAtYear = (year: number): number => {
    if (loanAmount <= 0) return 0;
    const n = year * 12;
    if (monthlyRate === 0) return Math.max(0, loanAmount - monthlyBondRepayment * n);
    const numerator = loanAmount * Math.pow(1 + monthlyRate, totalPayments) - loanAmount * Math.pow(1 + monthlyRate, n);
    const denominator = Math.pow(1 + monthlyRate, totalPayments) - 1;
    return Math.max(0, (numerator / denominator));
  };

  const propertyValueYears = Array.from({ length: 11 }, (_, i) => {
    const value = effectivePurchasePrice * Math.pow(1 + annualAppreciation / 100, i);
    const loanBal = loanBalanceAtYear(i);
    return {
      year: i,
      value: Math.round(value),
      equity: Math.round(Math.max(0, value - loanBal)),
      loanBalance: Math.round(loanBal),
    };
  });

  return {
    effectivePurchasePrice,
    loanAmount,
    monthlyBondRepayment,
    managementFeeS1,
    managementFeeS2,
    totalMonthlyCostsS1,
    totalMonthlyCostsS2,
    monthlyEffectiveRentS1,
    monthlyEffectiveRentS2,
    cashFlowS1,
    cashFlowS2,
    grossYieldS1,
    grossYieldS2,
    netYieldS1,
    netYieldS2,
    roi5YearS1,
    roi5YearS2,
    roi10YearS1,
    roi10YearS2,
    propertyValueYears,
    transferDuty,
    bondRegistrationCost,
    totalAcquisitionCost,
    totalCashRequired,
  };
}
