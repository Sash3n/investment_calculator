/**
 * FinCalc ZA — Bond Affordability Qualifier
 *
 * Estimates the maximum home loan and property price a buyer qualifies for,
 * using the rules SA banks broadly apply:
 *  - Instalment-to-income: bond repayment ≤ ~30% of gross monthly income
 *  - Debt-to-income (NCA): total debt repayments ≤ ~36% of gross income
 * Also stress-tests affordability at a higher interest rate and back-calculates
 * the cash needed (deposit + transfer duty + bond registration).
 */

import type { PropertyInputs } from '../types';
import { calcPayment } from './mortgage';
import { calcTransferDuty, calcBondRegistrationCost } from './tax';

export interface AffordabilityInputs {
  grossMonthlyIncome: number;
  existingMonthlyDebt: number;   // car, credit cards, personal loans, etc.
  depositAvailable: number;
  interestRate: number;          // annual %, default prime
  termYears: number;
  instalmentRatio: number;       // % of gross income allowed for the bond (default 30)
  dtiRatio: number;              // % of gross income for ALL debt (default 36)
  stressDelta: number;           // pp added to rate for stress test (default 2)
  desiredPropertyPrice: number;  // 0 = none
}

export interface AffordabilityResult {
  maxInstalment: number;          // monthly bond repayment ceiling
  limitedBy: 'instalment' | 'dti';
  maxLoan: number;
  maxPropertyPrice: number;       // maxLoan + deposit
  transferDuty: number;           // on max price
  bondRegistration: number;       // on max loan
  totalCashRequired: number;      // deposit + transfer duty + bond reg
  // Stress test
  stressRate: number;
  stressMaxLoan: number;
  stressMaxPropertyPrice: number;
  stressInstalmentAtMaxLoan: number; // current-rate max loan re-priced at stress rate
  // Desired property assessment
  desired: null | {
    price: number;
    requiredLoan: number;          // price − deposit
    requiredInstalment: number;
    requiredGrossIncome: number;   // gross needed to qualify for that instalment
    qualifies: boolean;
    monthlyShortfall: number;      // requiredInstalment − maxInstalment (>0 = short)
    transferDuty: number;
    totalCashRequired: number;
  };
}

/** Present value of an annuity: loan affordable for a given monthly payment. */
function loanFromPayment(payment: number, annualRate: number, termYears: number): number {
  if (payment <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + r, -n))) / r;
}

export function calcAffordability(inputs: AffordabilityInputs): AffordabilityResult {
  const {
    grossMonthlyIncome, existingMonthlyDebt, depositAvailable,
    interestRate, termYears, instalmentRatio, dtiRatio, stressDelta, desiredPropertyPrice,
  } = inputs;

  const byInstalment = (instalmentRatio / 100) * grossMonthlyIncome;
  const byDti = Math.max(0, (dtiRatio / 100) * grossMonthlyIncome - existingMonthlyDebt);
  const maxInstalment = Math.max(0, Math.min(byInstalment, byDti));
  const limitedBy: 'instalment' | 'dti' = byDti < byInstalment ? 'dti' : 'instalment';

  const maxLoan = loanFromPayment(maxInstalment, interestRate, termYears);
  const maxPropertyPrice = maxLoan + depositAvailable;
  const transferDuty = calcTransferDuty(maxPropertyPrice);
  const bondRegistration = calcBondRegistrationCost(maxLoan);
  const totalCashRequired = depositAvailable + transferDuty + bondRegistration;

  // Stress test
  const stressRate = interestRate + stressDelta;
  const stressMaxLoan = loanFromPayment(maxInstalment, stressRate, termYears);
  const stressMaxPropertyPrice = stressMaxLoan + depositAvailable;
  const stressInstalmentAtMaxLoan = calcPayment(maxLoan, stressRate, termYears, 12);

  // Desired property
  let desired: AffordabilityResult['desired'] = null;
  if (desiredPropertyPrice > 0) {
    const requiredLoan = Math.max(0, desiredPropertyPrice - depositAvailable);
    const requiredInstalment = calcPayment(requiredLoan, interestRate, termYears, 12);
    // Gross income needed: the binding ratio is the lower allowance; invert it.
    // Need instalment ≤ instalmentRatio% of gross AND (instalment + existing) ≤ dtiRatio% of gross
    const grossForInstalment = requiredInstalment / (instalmentRatio / 100);
    const grossForDti = (requiredInstalment + existingMonthlyDebt) / (dtiRatio / 100);
    const requiredGrossIncome = Math.max(grossForInstalment, grossForDti);
    const td = calcTransferDuty(desiredPropertyPrice);
    desired = {
      price: desiredPropertyPrice,
      requiredLoan,
      requiredInstalment,
      requiredGrossIncome,
      qualifies: requiredInstalment <= maxInstalment + 0.5,
      monthlyShortfall: requiredInstalment - maxInstalment,
      transferDuty: td,
      totalCashRequired: depositAvailable + td + calcBondRegistrationCost(requiredLoan),
    };
  }

  return {
    maxInstalment, limitedBy, maxLoan, maxPropertyPrice,
    transferDuty, bondRegistration, totalCashRequired,
    stressRate, stressMaxLoan, stressMaxPropertyPrice, stressInstalmentAtMaxLoan,
    desired,
  };
}

/** Build PropertyInputs defaults for handing a qualified buyer to the ROI calculator. */
export function affordabilityToPropertyInputs(
  res: AffordabilityResult,
  deposit: number,
  interestRate: number,
  termYears: number,
): Partial<PropertyInputs> {
  return {
    purchasePrice: Math.round(res.maxPropertyPrice),
    deposit,
    interestRate,
    bondTerm: termYears,
  };
}
